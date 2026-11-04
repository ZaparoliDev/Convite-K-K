/* Itens comuns da lista de presentes (presentes.html e admin-presentes.html) */
(function (raiz) {
  // Categorias: o id precisa bater com lib/presentes.js (CATEGORIAS)
  const CATEGORIAS = [
    { id: "cozinha", rotulo: "Cozinha", cor: "#F3E2DA" },
    { id: "mesa", rotulo: "Mesa posta", cor: "#F2E7DD" },
    { id: "casa", rotulo: "Casa & decoração", cor: "#EFE1DF" },
    { id: "quarto", rotulo: "Quarto & banho", cor: "#F4E6E1" },
    { id: "eletro", rotulo: "Eletros", cor: "#EEE3D9" },
  ];

  // Ícones em traço (24 × 24), no estilo das ilustrações do convite
  const ICONES = {
    cozinha: '<path d="M4 11h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3Z"/><path d="M2 11h2M20 11h2M9.5 8c0-1.6 1.2-1.6 1.2-3.2M13.3 8c0-1.6 1.2-1.6 1.2-3.2"/>',
    mesa: '<path d="M7.5 3h9l-.6 5.2a3.9 3.9 0 0 1-7.8 0L7.5 3Z"/><path d="M12 12v8M8.5 20.5h7M8 6.5h8"/>',
    casa: '<path d="M3.5 11.5 12 4l8.5 7.5"/><path d="M6 10v10h12V10"/><path d="M10 20v-5.5h4V20"/>',
    quarto: '<path d="M3 18v-5.5A2.5 2.5 0 0 1 5.5 10h13a2.5 2.5 0 0 1 2.5 2.5V18M3 15h18M3 18v2.5M21 18v2.5"/><path d="M6 10V7.5A1.5 1.5 0 0 1 7.5 6h3A1.5 1.5 0 0 1 12 7.5V10"/>',
    eletro: '<path d="M13.5 2.5 6 13h5.5l-1 8.5L18 11h-5.5l1-8.5Z"/>',
    aviao: '<path d="M21 4 3 11.2l6.3 2.2L21 4Zm0 0-11.7 9.4.2 6.6 3.4-4.3L18 19l3-15Z"/>',
    jantar: '<path d="M7 3v6.5a2 2 0 0 0 2 2V21M11 3v6.5a2 2 0 0 1-2 2M9 3v5"/><path d="M17.5 21V3C15.5 4.5 14 7 14 10.5V14h3.5"/>',
    hotel: '<path d="M3 19.5V5M3 14h18v5.5M21 14v-1.5a3 3 0 0 0-3-3h-7V14"/><circle cx="7" cy="11" r="2"/>',
    passeio: '<path d="m2.5 19.5 6.5-10 4.2 6.3L15.5 12l6 7.5H2.5Z"/><circle cx="17" cy="5.5" r="2"/>',
    sofa: '<path d="M5.5 11V8a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3"/><path d="M3 12.5a2 2 0 0 1 4 0V14h10v-1.5a2 2 0 0 1 4 0V18H3v-5.5ZM5.5 18v2M18.5 18v2"/>',
    presente: '<path d="M4.5 11h15v9h-15zM3.5 7.5h17V11h-17zM12 7.5V20"/><path d="M12 7.5C10.5 4 7 4 7 6s3 1.5 5 1.5S17 8 17 6s-3.5-2-5 1.5Z"/>',
    coracao: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z"/>',
    camera: '<path d="M4 8h3l2-2.5h6L17 8h3v11H4V8Z"/><circle cx="12" cy="13.2" r="3.5"/>',
  };
  const ROTULOS_ICONES = {
    aviao: "Viagem", jantar: "Jantar", hotel: "Hospedagem", passeio: "Passeio",
    sofa: "Casa", presente: "Presente", coracao: "Carinho", camera: "Fotos",
  };

  const icone = (nome, classe) =>
    `<svg class="${classe || "ico"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] || ICONES.presente}</svg>`;

  const categoria = id => CATEGORIAS.find(c => c.id === id) || { id, rotulo: id, cor: "#F2E7DD" };

  // R$ 150 · R$ 150,50
  const reais = v => (Number(v) || 0).toLocaleString("pt-BR", {
    style: "currency", currency: "BRL", minimumFractionDigits: Number(v) % 1 ? 2 : 0, maximumFractionDigits: 2,
  });

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Lê "150", "150,50" ou "1.250,90" digitado pelo usuário
  function lerValor(txt) {
    let s = String(txt ?? "").replace(/[R$\s]/g, "");
    if (!s) return null;
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  raiz.KK = { CATEGORIAS, ICONES, ROTULOS_ICONES, icone, categoria, reais, esc, lerValor };
})(window);
