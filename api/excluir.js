const { getDb } = require("../lib/db");
const { exigirSenha } = require("../lib/auth");

// Exclui uma confirmação pelo WhatsApp (que é único por convidado)
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido" });
  }
  if (!(await exigirSenha(req, res))) return;

  const corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const telefone = String(corpo.telefone || "").replace(/\D/g, "");
  if (!telefone) return res.status(400).json({ erro: "Confirmação não informada." });

  try {
    const db = await getDb();
    const r = await db.collection("confirmacoes").deleteOne({ telefone });
    if (!r.deletedCount) return res.status(404).json({ erro: "Essa confirmação já tinha sido excluída." });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível excluir agora." });
  }
};
