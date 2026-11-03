const { getDb } = require("../lib/db");
const { exigirSenha } = require("../lib/auth");
const { validarConfirmacao } = require("../lib/validar");

// Os noivos corrigem uma confirmação (vale também depois do prazo).
// Corpo: { telefoneOriginal, nome, telefone, vai, pessoas, acompanhantes, recado }
module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ erro: "Método não permitido" });
  }
  if (!(await exigirSenha(req, res))) return;

  let corpo;
  try { corpo = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}); }
  catch { return res.status(400).json({ erro: "Dados inválidos." }); }

  const original = String(corpo.telefoneOriginal || "").replace(/\D/g, "");
  if (!original) return res.status(400).json({ erro: "Confirmação não informada." });

  const { erro, dados } = validarConfirmacao(corpo);
  if (erro) return res.status(400).json({ erro });

  try {
    const col = (await getDb()).collection("confirmacoes");

    // Trocar o WhatsApp para um número que já tem outra confirmação juntaria duas famílias
    if (dados.telefone !== original && await col.findOne({ telefone: dados.telefone }, { projection: { _id: 1 } })) {
      return res.status(409).json({ erro: "Já existe outra confirmação com esse WhatsApp." });
    }

    // atualizadoEm continua sendo a data da resposta do convidado; editadoEm marca a correção
    const r = await col.updateOne({ telefone: original }, { $set: { ...dados, editadoEm: new Date() } });
    if (!r.matchedCount) return res.status(404).json({ erro: "Essa confirmação não existe mais. Atualize a lista." });
    return res.status(200).json({ ok: true });
  } catch (e) {
    if (e && e.code === 11000) return res.status(409).json({ erro: "Já existe outra confirmação com esse WhatsApp." });
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível salvar agora." });
  }
};
