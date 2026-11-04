// Lista de presentes: regras e dados usados pelas rotas
// /api/presentes, /api/reservar, /api/contribuir, /api/gerenciar-presentes e /api/imagem
const crypto = require("crypto");
const { ObjectId } = require("mongodb");

// Coleções no mesmo banco do convite
const COL = {
  itens: "presentes",
  reservas: "reservas",
  cotas: "cotas",
  contribuicoes: "contribuicoes",
  imagens: "imagens",
  config: "config", // documento _id "presentes" (o _id "geral" é do convite)
};

const CATEGORIAS = ["cozinha", "mesa", "casa", "quarto", "eletro"];
const ICONES_COTA = ["aviao", "jantar", "hotel", "passeio", "sofa", "presente", "coracao", "camera"];
const PIX_TIPOS = ["cpf", "cnpj", "telefone", "email", "aleatoria"];

const limpar = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function oid(v) {
  const s = String(v ?? "");
  return /^[a-f0-9]{24}$/i.test(s) ? new ObjectId(s) : null;
}

// Aceita 150, "150", "150,00", "1.250,90" ou "R$ 1.250,90"
function dinheiro(v) {
  if (v === null || v === undefined || v === "") return null;
  let n = v;
  if (typeof v === "string") {
    let s = v.replace(/[R$\s]/g, "");
    if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    n = Number(s);
  }
  if (typeof n !== "number" || !Number.isFinite(n)) return NaN;
  return Math.round(n * 100) / 100;
}

function corpoDe(req) {
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body || "{}"); } catch { return null; }
  }
  return req.body || {};
}

/* ===== Validações ===== */
function validarItem(b) {
  const nome = limpar(b.nome, 80);
  const categoria = String(b.categoria || "");
  const descricao = limpar(b.descricao, 200);
  const preco = dinheiro(b.preco);
  const quantidade = Math.trunc(Number(b.quantidade ?? 1));
  const link = limpar(b.link, 600);

  if (nome.length < 2) return { erro: "Informe o nome do presente." };
  if (!CATEGORIAS.includes(categoria)) return { erro: "Escolha uma categoria." };
  if (Number.isNaN(preco) || (preco !== null && (preco <= 0 || preco > 100000))) return { erro: "Preço inválido." };
  if (!(quantidade >= 1 && quantidade <= 20)) return { erro: "A quantidade vai de 1 a 20." };
  if (link && !/^https?:\/\/\S+$/i.test(link)) return { erro: "O link precisa começar com http:// ou https://." };
  return { dados: { nome, categoria, descricao, preco, quantidade, link } };
}

function validarCota(b) {
  const nome = limpar(b.nome, 80);
  const descricao = limpar(b.descricao, 200);
  const valor = dinheiro(b.valor);
  const meta = dinheiro(b.meta);
  const icone = ICONES_COTA.includes(b.icone) ? b.icone : "presente";

  if (nome.length < 2) return { erro: "Informe o nome da cota." };
  if (!(valor >= 1 && valor <= 50000)) return { erro: "O valor da cota vai de R$ 1 a R$ 50.000." };
  if (Number.isNaN(meta) || (meta !== null && (meta < valor || meta > 1000000))) {
    return { erro: "A meta precisa ser maior ou igual ao valor de uma cota." };
  }
  return { dados: { nome, descricao, valor, meta, icone } };
}

// Normaliza a chave Pix no formato que o Banco Central espera no código copia e cola
function normalizarChave(tipo, chave) {
  const c = String(chave || "").trim();
  const d = c.replace(/\D/g, "");
  if (tipo === "cpf") return d.length === 11 ? d : null;
  if (tipo === "cnpj") return d.length === 14 ? d : null;
  if (tipo === "telefone") {
    if (d.length === 10 || d.length === 11) return "+55" + d;
    if ((d.length === 12 || d.length === 13) && d.startsWith("55")) return "+" + d;
    return null;
  }
  if (tipo === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) && c.length <= 77 ? c.toLowerCase() : null;
  if (tipo === "aleatoria") return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c) ? c.toLowerCase() : null;
  return null;
}

function validarConfig(b) {
  const pixTipo = String(b.pixTipo || "");
  const pixNome = limpar(b.pixNome, 60);
  const pixCidade = limpar(b.pixCidade, 40);
  const textoEntrega = limpar(b.textoEntrega, 240);
  const mostrarArrecadado = b.mostrarArrecadado !== false;
  let pixChave = "";
  let whatsapp = String(b.whatsapp || "").replace(/\D/g, "");

  if (String(b.pixChave || "").trim()) {
    if (!PIX_TIPOS.includes(pixTipo)) return { erro: "Escolha o tipo da chave Pix." };
    pixChave = normalizarChave(pixTipo, b.pixChave);
    if (!pixChave) return { erro: "Chave Pix inválida para o tipo escolhido." };
    if (pixNome.length < 2) return { erro: "Informe o nome de quem recebe o Pix (como aparece no banco)." };
    if (pixCidade.length < 2) return { erro: "Informe a cidade de quem recebe o Pix." };
  }
  if (whatsapp) {
    if (whatsapp.length === 10 || whatsapp.length === 11) whatsapp = "55" + whatsapp;
    if (!/^55\d{10,11}$/.test(whatsapp)) return { erro: "WhatsApp inválido. Use DDD + número." };
  }
  return { dados: { pixTipo: pixChave ? pixTipo : "", pixChave, pixNome, pixCidade, whatsapp, textoEntrega, mostrarArrecadado } };
}

/* ===== Configuração ===== */
const CONFIG_PADRAO = {
  pixTipo: "", pixChave: "", pixNome: "", pixCidade: "", whatsapp: "",
  textoEntrega: "Você pode levar o presente no dia do casamento ou combinar a entrega com a gente.",
  mostrarArrecadado: true,
};

async function lerConfigPresentes(db) {
  const doc = await db.collection(COL.config).findOne({ _id: "presentes" });
  const c = { ...CONFIG_PADRAO };
  if (doc) for (const k of Object.keys(CONFIG_PADRAO)) if (doc[k] !== undefined) c[k] = doc[k];
  return c;
}

/* ===== Lista inicial (só no primeiro acesso; os noivos editam tudo no admin) ===== */
// [nome, categoria, preço aproximado (null = sem preço), quantidade]
const ITENS_INICIAIS = [
  ["Panelas", "cozinha", null, 1],
  ["Pratos e talheres", "mesa", null, 1],
  ["Air fryer", "eletro", null, 1],
  ["Mixer", "eletro", null, 1],
  ["Ferro de passar roupa", "eletro", null, 1],
  ["Mesa com 4 cadeiras", "casa", null, 1],
];
const COTAS_INICIAIS = [
  ["Passagens da lua de mel", "Uma ajudinha para a gente chegar ao destino dos sonhos.", 200, 4000, "aviao"],
  ["Diárias de hotel", "Para descansar depois da festa.", 250, 3000, "hotel"],
  ["Jantar romântico", "Um jantar especial na lua de mel, por sua conta ♡", 150, 600, "jantar"],
  ["Passeio especial", "Um passeio inesquecível durante a viagem.", 120, 720, "passeio"],
  ["Nosso primeiro sofá", "Para receber vocês na nossa casa nova.", 100, 2500, "sofa"],
];

async function garantirSemente(db) {
  const cfg = db.collection(COL.config);
  let marcou;
  try {
    // Só um acesso consegue marcar "semeado"; os outros caem no erro de chave duplicada
    marcou = await cfg.updateOne({ _id: "presentes", semeado: { $ne: true } }, { $set: { semeado: true } }, { upsert: true });
  } catch (e) {
    if (e && e.code === 11000) return;
    throw e;
  }
  if (!marcou.upsertedCount && !marcou.modifiedCount) return;

  const itens = db.collection(COL.itens), cotas = db.collection(COL.cotas);
  if (!(await itens.countDocuments({})) && !(await cotas.countDocuments({}))) {
    const agora = Date.now();
    await itens.insertMany(ITENS_INICIAIS.map(([nome, categoria, preco, quantidade], i) => ({
      nome, categoria, preco, quantidade, reservados: 0, descricao: "", link: "", imagem: "",
      criadoEm: new Date(agora + i),
    })));
    await cotas.insertMany(COTAS_INICIAIS.map(([nome, descricao, valor, meta, icone], i) => ({
      nome, descricao, valor, meta, icone, imagem: "", criadoEm: new Date(agora + i),
    })));
  }
}

/* ===== Formatos públicos ===== */
function itemPublico(d) {
  return {
    id: String(d._id), nome: d.nome, categoria: d.categoria, descricao: d.descricao || "",
    preco: d.preco ?? null, quantidade: d.quantidade || 1,
    reservados: Math.min(d.reservados || 0, d.quantidade || 1),
    imagem: d.imagem || "", link: d.link || "",
  };
}
function cotaPublica(d, soma, mostrar) {
  return {
    id: String(d._id), nome: d.nome, descricao: d.descricao || "", valor: d.valor, meta: d.meta ?? null,
    icone: d.icone || "presente", imagem: d.imagem || "",
    arrecadado: mostrar ? Math.round((soma?.valor || 0) * 100) / 100 : null,
    contribuicoes: soma?.qtd || 0,
  };
}
function somarPorCota(contribs) {
  const m = new Map();
  for (const c of contribs) {
    const s = m.get(c.cota_id) || { valor: 0, qtd: 0 };
    s.valor += Number(c.valor) || 0; s.qtd += 1;
    m.set(c.cota_id, s);
  }
  return m;
}

/* ===== Segurança ===== */
const hash = t => crypto.createHash("sha256").update(String(t)).digest("hex");
function tokenConfere(token, guardado) {
  const a = Buffer.from(hash(token)), b = Buffer.from(String(guardado || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const novoToken = () => crypto.randomBytes(24).toString("base64url");

// Limite simples por IP (em memória; zera quando a função "esfria", mas segura abusos rápidos)
const tentativas = new Map();
function excedeu(req, rota, max, janelaMs) {
  const fwd = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(fwd) ? fwd[0] : (fwd || "")).split(",")[0].trim() || "?";
  const chave = rota + ":" + ip, agora = Date.now();
  const e = tentativas.get(chave);
  if (!e || agora - e.inicio > janelaMs) { tentativas.set(chave, { inicio: agora, n: 1 }); return false; }
  e.n += 1;
  return e.n > max;
}

/* ===== Fotos (guardadas no MongoDB e servidas por /api/imagem) ===== */
const PREFIXO_IMG = "/api/imagem?id=";
const idDaImagem = url => (typeof url === "string" && url.startsWith(PREFIXO_IMG) ? oid(url.slice(PREFIXO_IMG.length)) : null);

// valor: undefined = manter · "" = remover · data:image/... = foto nova · https://... = foto externa
async function resolverImagem(db, valor, atual) {
  if (valor === undefined) return { url: atual || "" };
  const v = String(valor).trim();
  let url = "";
  if (v.startsWith("data:")) {
    const m = /^data:(image\/(?:webp|jpeg|png));base64,([a-z0-9+/=\s]+)$/i.exec(v);
    if (!m) return { erro: "Use uma foto JPG, PNG ou WebP." };
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 1200000) return { erro: "A foto ficou grande demais (máx. 1,2 MB)." };
    const r = await db.collection(COL.imagens).insertOne({ tipo: m[1].toLowerCase(), dados: buf, criadoEm: new Date() });
    url = PREFIXO_IMG + String(r.insertedId);
  } else if (v) {
    if (!/^https?:\/\/\S+$/i.test(v) || v.length > 600) return { erro: "Link da foto inválido." };
    url = v;
  }
  if (url !== atual) await apagarImagem(db, atual);
  return { url };
}
async function apagarImagem(db, url) {
  const id = idDaImagem(url);
  if (id) await db.collection(COL.imagens).deleteOne({ _id: id });
}

module.exports = {
  COL, CATEGORIAS, ICONES_COTA, PIX_TIPOS, limpar, oid, dinheiro, corpoDe,
  validarItem, validarCota, validarConfig, normalizarChave,
  lerConfigPresentes, garantirSemente, itemPublico, cotaPublica, somarPorCota,
  hash, tokenConfere, novoToken, excedeu, resolverImagem, apagarImagem,
};
