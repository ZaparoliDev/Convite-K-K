const crypto = require("crypto");

// Compara a senha sem vazar tempo de comparação
function senhaCorreta(recebida) {
  const certa = process.env.ADMIN_SENHA || "";
  const a = Buffer.from(String(recebida || ""));
  const b = Buffer.from(certa);
  return certa.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Responde 401 (com atraso contra tentativas em massa) e devolve false se a senha estiver errada
async function exigirSenha(req, res) {
  if (senhaCorreta(req.headers["x-senha"])) return true;
  await new Promise(r => setTimeout(r, 600));
  res.status(401).json({ erro: "Senha incorreta" });
  return false;
}

module.exports = { exigirSenha };
