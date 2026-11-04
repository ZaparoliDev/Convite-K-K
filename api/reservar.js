const { getDb } = require("../lib/db");
const P = require("../lib/presentes");

// POST   { item_id, nome, recado }   → reserva 1 unidade e devolve um token para desistir depois
// DELETE { reserva_id, token }       → o próprio convidado desiste da reserva
// GET    ?ids=a,b                    → quais reservas (do aparelho do convidado) ainda existem
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const db = await getDb();
    const itens = db.collection(P.COL.itens), reservas = db.collection(P.COL.reservas);

    if (req.method === "GET") {
      const ids = String(req.query?.ids || "").split(",").map(P.oid).filter(Boolean).slice(0, 30);
      if (!ids.length) return res.status(200).json({ existem: [] });
      const achadas = await reservas.find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray();
      return res.status(200).json({ existem: achadas.map(r => String(r._id)) });
    }

    const corpo = P.corpoDe(req);
    if (!corpo) return res.status(400).json({ erro: "Dados inválidos." });

    if (req.method === "POST") {
      if (corpo.site) return res.status(200).json({ ok: true }); // robô (campo invisível)
      if (P.excedeu(req, "reservar", 15, 10 * 60 * 1000)) {
        return res.status(429).json({ erro: "Muitas reservas seguidas. Espere alguns minutos." });
      }
      const id = P.oid(corpo.item_id);
      const nome = P.limpar(corpo.nome, 80);
      const recado = P.limpar(corpo.recado, 300);
      if (!id) return res.status(400).json({ erro: "Presente inválido." });
      if (nome.length < 3) return res.status(400).json({ erro: "Informe seu nome para os noivos saberem quem presenteou." });

      // Reserva atômica: só incrementa se ainda houver unidade livre (duas pessoas ao mesmo tempo não pegam a última)
      const r = await itens.updateOne(
        { _id: id, $expr: { $lt: ["$reservados", "$quantidade"] } },
        { $inc: { reservados: 1 } }
      );
      if (!r.matchedCount) {
        const existe = await itens.findOne({ _id: id }, { projection: { _id: 1 } });
        return existe
          ? res.status(409).json({ erro: "Esse presente acabou de ser escolhido por outra pessoa." })
          : res.status(404).json({ erro: "Esse presente não está mais na lista." });
      }

      const item = await itens.findOne({ _id: id }, { projection: { nome: 1 } });
      const token = P.novoToken();
      try {
        const ins = await reservas.insertOne({
          item_id: String(id), item_nome: item?.nome || "", nome, recado,
          token_hash: P.hash(token), criadoEm: new Date(),
        });
        return res.status(200).json({ ok: true, reserva: { id: String(ins.insertedId), token } });
      } catch (e) {
        await itens.updateOne({ _id: id, reservados: { $gt: 0 } }, { $inc: { reservados: -1 } });
        throw e;
      }
    }

    if (req.method === "DELETE") {
      const rid = P.oid(corpo.reserva_id);
      if (!rid || !corpo.token) return res.status(400).json({ erro: "Reserva inválida." });
      const reserva = await reservas.findOne({ _id: rid });
      if (!reserva) return res.status(404).json({ erro: "Essa reserva já tinha sido desfeita." });
      if (!P.tokenConfere(corpo.token, reserva.token_hash)) return res.status(403).json({ erro: "Essa reserva não é deste aparelho." });

      const d = await reservas.deleteOne({ _id: rid });
      if (d.deletedCount) {
        await itens.updateOne({ _id: P.oid(reserva.item_id), reservados: { $gt: 0 } }, { $inc: { reservados: -1 } });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ erro: "Método não permitido" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível concluir agora. Tente novamente." });
  }
};
