const { getDb } = require("../lib/db");

// Prazo: até o fim do dia 20/11/2026 (horário de Brasília)
const PRAZO = new Date("2026-11-20T23:59:59-03:00");

const limpar = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido" });
  }
  if (new Date() > PRAZO) {
    return res.status(403).json({ erro: "O prazo para confirmar presença terminou." });
  }

  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

  // Campo invisível: robôs preenchem, pessoas não
  if (corpo.site) return res.status(200).json({ ok: true });

  const nome = limpar(corpo.nome, 80);
  const telefone = limpar(corpo.telefone, 20).replace(/\D/g, "");
  const vai = corpo.vai === "sim" ? "sim" : corpo.vai === "nao" ? "nao" : null;
  const pessoas = vai === "sim" ? Math.trunc(Number(corpo.pessoas)) : 0;
  const recado = limpar(corpo.recado, 300);

  if (nome.length < 3) return res.status(400).json({ erro: "Informe seu nome completo." });
  if (telefone.length < 10 || telefone.length > 13) return res.status(400).json({ erro: "Informe um WhatsApp válido com DDD." });
  if (!vai) return res.status(400).json({ erro: "Diga se você vai ou não." });
  // De 1 a 3 pessoas, contando quem confirma (o formulário só oferece essas opções)
  if (vai === "sim" && !(pessoas >= 1 && pessoas <= 3)) return res.status(400).json({ erro: "Quantidade de pessoas inválida." });

  // Acompanhantes: um nome para cada pessoa além de quem confirma (só quando vai)
  const qtdAcomp = vai === "sim" ? pessoas - 1 : 0;
  const recebidos = Array.isArray(corpo.acompanhantes) ? corpo.acompanhantes : [];
  const acompanhantes = [];
  for (let i = 0; i < qtdAcomp; i++) {
    const n = typeof recebidos[i] === "string" ? limpar(recebidos[i], 80) : "";
    if (n.length < 3) return res.status(400).json({ erro: `Informe o nome do ${i + 1}º acompanhante.` });
    acompanhantes.push(n);
  }

  try {
    const db = await getDb();
    const col = db.collection("confirmacoes");
    await col.createIndex({ telefone: 1 }, { unique: true });

    // Mesmo WhatsApp confirmando de novo = atualiza a resposta anterior
    const agora = new Date();
    const r = await col.updateOne(
      { telefone },
      { $set: { nome, telefone, vai, pessoas, acompanhantes, recado, atualizadoEm: agora }, $setOnInsert: { criadoEm: agora } },
      { upsert: true }
    );
    return res.status(200).json({ ok: true, atualizado: r.matchedCount > 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível salvar agora. Tente novamente em instantes." });
  }
};
