const { getDb } = require("../lib/db");
const { exigirSenha } = require("../lib/auth");
const P = require("../lib/presentes");

// Admin dos presentes (cabeçalho x-senha, a mesma senha do admin do convite)
// GET  → tudo: itens com quem reservou, cotas com quem contribuiu, configuração do Pix
// POST { acao, ... } → salvarItem · excluirItem · liberarReserva · salvarCota · excluirCota
//                      marcarContribuicao · excluirContribuicao · salvarConfig
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!(await exigirSenha(req, res))) return;

  try {
    const db = await getDb();
    const C = n => db.collection(P.COL[n]);

    if (req.method === "GET") {
      await P.garantirSemente(db);
      const [itens, reservas, cotas, contribs, cfg] = await Promise.all([
        C("itens").find({}).sort({ criadoEm: 1 }).toArray(),
        C("reservas").find({}, { projection: { token_hash: 0 } }).sort({ criadoEm: -1 }).toArray(),
        C("cotas").find({}).sort({ criadoEm: 1 }).toArray(),
        C("contribuicoes").find({}).sort({ criadoEm: -1 }).toArray(),
        P.lerConfigPresentes(db),
      ]);
      const porItem = new Map(), porCota = new Map();
      for (const r of reservas) (porItem.get(r.item_id) || porItem.set(r.item_id, []).get(r.item_id)).push(r);
      for (const c of contribs) (porCota.get(c.cota_id) || porCota.set(c.cota_id, []).get(c.cota_id)).push(c);
      const somas = P.somarPorCota(contribs);
      const limparReg = r => ({ ...r, id: String(r._id), _id: undefined });

      return res.status(200).json({
        itens: itens.map(i => ({ ...P.itemPublico(i), reservas: (porItem.get(String(i._id)) || []).map(limparReg) })),
        cotas: cotas.map(c => ({
          ...P.cotaPublica(c, somas.get(String(c._id)), true),
          contribuicoes: (porCota.get(String(c._id)) || []).map(limparReg),
        })),
        // Reservas/contribuições cujo item ou cota foi apagado (não deve acontecer, mas não some nada)
        avulsas: {
          reservas: reservas.filter(r => !itens.some(i => String(i._id) === r.item_id)).map(limparReg),
          contribuicoes: contribs.filter(c => !cotas.some(x => String(x._id) === c.cota_id)).map(limparReg),
        },
        config: cfg,
      });
    }

    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ erro: "Método não permitido" });
    }
    const b = P.corpoDe(req);
    if (!b) return res.status(400).json({ erro: "Dados inválidos." });

    switch (b.acao) {
      case "salvarItem": {
        const { erro, dados } = P.validarItem(b);
        if (erro) return res.status(400).json({ erro });
        const id = b.id ? P.oid(b.id) : null;
        if (b.id && !id) return res.status(400).json({ erro: "Presente inválido." });
        const atual = id ? await C("itens").findOne({ _id: id }) : null;
        if (id && !atual) return res.status(404).json({ erro: "Esse presente não existe mais." });
        const img = await P.resolverImagem(db, b.imagem, atual?.imagem || "");
        if (img.erro) return res.status(400).json({ erro: img.erro });
        if (id) {
          await C("itens").updateOne({ _id: id }, { $set: { ...dados, imagem: img.url, atualizadoEm: new Date() } });
          return res.status(200).json({ ok: true, id: String(id) });
        }
        const r = await C("itens").insertOne({ ...dados, imagem: img.url, reservados: 0, criadoEm: new Date() });
        return res.status(200).json({ ok: true, id: String(r.insertedId) });
      }

      case "excluirItem": {
        const id = P.oid(b.id);
        const item = id && await C("itens").findOne({ _id: id });
        if (!item) return res.status(404).json({ erro: "Esse presente já tinha sido excluído." });
        await C("itens").deleteOne({ _id: id });
        await C("reservas").deleteMany({ item_id: String(id) });
        await P.apagarImagem(db, item.imagem);
        return res.status(200).json({ ok: true });
      }

      case "liberarReserva": {
        const id = P.oid(b.id);
        const r = id && await C("reservas").findOne({ _id: id });
        if (!r) return res.status(404).json({ erro: "Essa reserva já tinha sido liberada." });
        const d = await C("reservas").deleteOne({ _id: id });
        if (d.deletedCount) await C("itens").updateOne({ _id: P.oid(r.item_id), reservados: { $gt: 0 } }, { $inc: { reservados: -1 } });
        return res.status(200).json({ ok: true });
      }

      case "salvarCota": {
        const { erro, dados } = P.validarCota(b);
        if (erro) return res.status(400).json({ erro });
        const id = b.id ? P.oid(b.id) : null;
        if (b.id && !id) return res.status(400).json({ erro: "Cota inválida." });
        const atual = id ? await C("cotas").findOne({ _id: id }) : null;
        if (id && !atual) return res.status(404).json({ erro: "Essa cota não existe mais." });
        const img = await P.resolverImagem(db, b.imagem, atual?.imagem || "");
        if (img.erro) return res.status(400).json({ erro: img.erro });
        if (id) {
          await C("cotas").updateOne({ _id: id }, { $set: { ...dados, imagem: img.url, atualizadoEm: new Date() } });
          return res.status(200).json({ ok: true, id: String(id) });
        }
        const r = await C("cotas").insertOne({ ...dados, imagem: img.url, criadoEm: new Date() });
        return res.status(200).json({ ok: true, id: String(r.insertedId) });
      }

      case "excluirCota": {
        const id = P.oid(b.id);
        const cota = id && await C("cotas").findOne({ _id: id });
        if (!cota) return res.status(404).json({ erro: "Essa cota já tinha sido excluída." });
        await C("cotas").deleteOne({ _id: id });
        await C("contribuicoes").deleteMany({ cota_id: String(id) });
        await P.apagarImagem(db, cota.imagem);
        return res.status(200).json({ ok: true });
      }

      case "marcarContribuicao": {
        const id = P.oid(b.id);
        const status = b.status === "recebido" ? "recebido" : "informado";
        if (!id) return res.status(400).json({ erro: "Contribuição inválida." });
        const r = await C("contribuicoes").updateOne({ _id: id }, { $set: { status, conferidoEm: new Date() } });
        if (!r.matchedCount) return res.status(404).json({ erro: "Essa contribuição não existe mais." });
        return res.status(200).json({ ok: true });
      }

      case "excluirContribuicao": {
        const id = P.oid(b.id);
        if (!id) return res.status(400).json({ erro: "Contribuição inválida." });
        const r = await C("contribuicoes").deleteOne({ _id: id });
        if (!r.deletedCount) return res.status(404).json({ erro: "Essa contribuição já tinha sido excluída." });
        return res.status(200).json({ ok: true });
      }

      case "salvarConfig": {
        const { erro, dados } = P.validarConfig(b);
        if (erro) return res.status(400).json({ erro });
        await C("config").updateOne({ _id: "presentes" }, { $set: { ...dados, atualizadoEm: new Date() } }, { upsert: true });
        return res.status(200).json({ ok: true, config: dados });
      }
    }
    return res.status(400).json({ erro: "Ação desconhecida." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível concluir agora." });
  }
};
