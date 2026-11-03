const { getDb } = require("../lib/db");
const { exigirSenha } = require("../lib/auth");
const { lerConfig, PADRAO, MAX_ACOMPANHANTES } = require("../lib/config");

// GET  (público): o formulário pergunta quantos acompanhantes cada convite permite
// POST (admin, cabeçalho x-senha): os noivos mudam o limite  { maxAcompanhantes: 0..9 }
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const db = await getDb();

    if (req.method === "GET") return res.status(200).json(await lerConfig(db));

    if (req.method === "POST") {
      if (!(await exigirSenha(req, res))) return;
      let corpo;
      try { corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
      catch { return res.status(400).json({ erro: "Dados inválidos." }); }

      const n = Number(corpo.maxAcompanhantes);
      if (!Number.isInteger(n) || n < 0 || n > MAX_ACOMPANHANTES) {
        return res.status(400).json({ erro: `Escolha de 0 a ${MAX_ACOMPANHANTES} acompanhantes.` });
      }
      await db.collection("config").updateOne(
        { _id: "geral" },
        { $set: { maxAcompanhantes: n, atualizadoEm: new Date() } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true, maxAcompanhantes: n });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ erro: "Método não permitido" });
  } catch (e) {
    console.error(e);
    // Se o banco falhar no GET, o formulário segue com o padrão
    if (req.method === "GET") return res.status(200).json(PADRAO);
    return res.status(500).json({ erro: "Não foi possível salvar agora." });
  }
};
