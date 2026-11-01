const { getDb } = require("../lib/db");
const { exigirSenha } = require("../lib/auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ erro: "Método não permitido" });
  if (!(await exigirSenha(req, res))) return;

  try {
    const db = await getDb();
    const lista = await db.collection("confirmacoes")
      .find({}, { projection: { _id: 0 } })
      .sort({ atualizadoEm: -1 })
      .toArray();

    const vao = lista.filter(c => c.vai === "sim");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({
      totais: {
        respostas: lista.length,
        confirmados: vao.length,
        pessoas: vao.reduce((s, c) => s + (c.pessoas || 0), 0),
        naoVao: lista.length - vao.length,
      },
      lista,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Erro ao carregar a lista." });
  }
};
