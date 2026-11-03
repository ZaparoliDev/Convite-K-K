// Regras de uma confirmação, usadas pelo formulário (api/confirmar) e pela edição do admin (api/editar)
const limpar = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Devolve { erro } ou { dados: { nome, telefone, vai, pessoas, acompanhantes, recado } }
function validarConfirmacao(corpo) {
  const nome = limpar(corpo.nome, 80);
  const telefone = limpar(corpo.telefone, 20).replace(/\D/g, "");
  const vai = corpo.vai === "sim" ? "sim" : corpo.vai === "nao" ? "nao" : null;
  const pessoas = vai === "sim" ? Math.trunc(Number(corpo.pessoas)) : 0;
  const recado = limpar(corpo.recado, 300);

  if (nome.length < 3) return { erro: "Informe o nome completo." };
  if (telefone.length < 10 || telefone.length > 13) return { erro: "Informe um WhatsApp válido com DDD." };
  if (!vai) return { erro: "Diga se vai ou não." };
  // De 1 a 3 pessoas, contando quem confirma
  if (vai === "sim" && !(pessoas >= 1 && pessoas <= 3)) return { erro: "Quantidade de pessoas inválida." };

  // Acompanhantes: um nome para cada pessoa além de quem confirma (só quando vai)
  const recebidos = Array.isArray(corpo.acompanhantes) ? corpo.acompanhantes : [];
  const acompanhantes = [];
  for (let i = 0; i < (vai === "sim" ? pessoas - 1 : 0); i++) {
    const n = typeof recebidos[i] === "string" ? limpar(recebidos[i], 80) : "";
    if (n.length < 3) return { erro: `Informe o nome do ${i + 1}º acompanhante.` };
    acompanhantes.push(n);
  }
  return { dados: { nome, telefone, vai, pessoas, acompanhantes, recado } };
}

module.exports = { validarConfirmacao };
