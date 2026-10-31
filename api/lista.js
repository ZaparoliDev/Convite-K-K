const crypto = require("crypto");
const { getDb } = require("../lib/db");

function senhaCorreta(recebida) {
  const certa = process.env.ADMIN_SENHA || "";
  const a = Buffer.from(String(recebida || ""));
  const b = Buffer.from(certa);
  return certa.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ erro: "Método não permitido" });

  if (!senhaCorreta(req.headers["x-senha"])) {
    await new Promise(r => setTimeout(r, 600)); // atrasa tentativas de adivinhar
    return res.status(401).json({ erro: "Senha incorreta" });
  }

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
