const { getDb } = require("../lib/db");
const { validarConfirmacao } = require("../lib/validar");
const { lerConfig } = require("../lib/config");

// Prazo: até o fim do dia 20/11/2026 (horário de Brasília)
const PRAZO = new Date("2026-11-20T23:59:59-03:00");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido" });
  }
  if (new Date() > PRAZO) {
    return res.status(403).json({ erro: "O prazo para confirmar presença terminou." });
  }

  let corpo;
  try { corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return res.status(400).json({ erro: "Dados inválidos." }); }

  // Campo invisível: robôs preenchem, pessoas não
  if (corpo.site) return res.status(200).json({ ok: true });

  try {
    const db = await getDb();
    // Quantas pessoas cada convite permite é decidido pelos noivos no admin
    const { maxAcompanhantes } = await lerConfig(db);
    const { erro, dados } = validarConfirmacao(corpo, maxAcompanhantes + 1);
    if (erro) return res.status(400).json({ erro });

    const col = db.collection("confirmacoes");
    await col.createIndex({ telefone: 1 }, { unique: true });

    // Mesmo WhatsApp confirmando de novo = atualiza a resposta anterior
    const agora = new Date();
    const r = await col.updateOne(
      { telefone: dados.telefone },
      { $set: { ...dados, atualizadoEm: agora }, $setOnInsert: { criadoEm: agora } },
      { upsert: true }
    );
    return res.status(200).json({ ok: true, atualizado: r.matchedCount > 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível salvar agora. Tente novamente em instantes." });
  }
};
