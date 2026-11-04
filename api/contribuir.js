const { getDb } = require("../lib/db");
const P = require("../lib/presentes");

// POST { cota_id, valor, nome, recado, codigo } → registra que o convidado fez o Pix de uma cota.
// O código é o mesmo que vai no Pix copia e cola: ajuda os noivos a conferir no extrato.
// Enviar de novo com o mesmo código não duplica.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido" });
  }
  const corpo = P.corpoDe(req);
  if (!corpo) return res.status(400).json({ erro: "Dados inválidos." });
  if (corpo.site) return res.status(200).json({ ok: true });
  if (P.excedeu(req, "contribuir", 15, 10 * 60 * 1000)) {
    return res.status(429).json({ erro: "Muitos envios seguidos. Espere alguns minutos." });
  }

  const id = P.oid(corpo.cota_id);
  const valor = P.dinheiro(corpo.valor);
  const nome = P.limpar(corpo.nome, 80);
  const recado = P.limpar(corpo.recado, 300);
  const codigo = String(corpo.codigo || "").toUpperCase();

  if (!id) return res.status(400).json({ erro: "Cota inválida." });
  if (!(valor >= 1 && valor <= 50000)) return res.status(400).json({ erro: "Valor inválido." });
  if (nome.length < 3) return res.status(400).json({ erro: "Informe seu nome para os noivos saberem quem presenteou." });
  if (!/^KK[A-Z0-9]{6,10}$/.test(codigo)) return res.status(400).json({ erro: "Código do Pix inválido." });

  try {
    const db = await getDb();
    const cota = await db.collection(P.COL.cotas).findOne({ _id: id }, { projection: { nome: 1 } });
    if (!cota) return res.status(404).json({ erro: "Essa cota não está mais na lista." });

    const col = db.collection(P.COL.contribuicoes);
    await col.createIndex({ codigo: 1 }, { unique: true });
    await col.updateOne(
      { codigo },
      { $setOnInsert: { codigo, cota_id: String(id), cota_nome: cota.nome, valor, nome, recado, status: "informado", criadoEm: new Date() } },
      { upsert: true }
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e && e.code === 11000) return res.status(200).json({ ok: true });
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível registrar agora. Tente novamente." });
  }
};
