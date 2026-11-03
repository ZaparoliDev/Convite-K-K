// Configurações que os noivos ajustam no admin (guardadas na coleção "config" do MongoDB)
const PADRAO = { maxAcompanhantes: 2 };   // 2 acompanhantes = até 3 pessoas por convite
const MAX_ACOMPANHANTES = 9;              // teto de segurança: até 10 pessoas por convite

async function lerConfig(db) {
  const doc = await db.collection("config").findOne({ _id: "geral" });
  const n = Math.trunc(Number(doc?.maxAcompanhantes));
  return { maxAcompanhantes: Number.isFinite(n) ? Math.max(0, Math.min(MAX_ACOMPANHANTES, n)) : PADRAO.maxAcompanhantes };
}

module.exports = { lerConfig, PADRAO, MAX_ACOMPANHANTES };
