const { getDb } = require("../lib/db");
const P = require("../lib/presentes");

// GET (público): itens com quantos ainda estão livres, cotas com o total arrecadado e dados do Pix.
// Nunca devolve quem reservou ou contribuiu: isso só aparece no admin.
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ erro: "Método não permitido" });
  }
  try {
    const db = await getDb();
    await P.garantirSemente(db);

    const [itens, cotas, contribs, cfg] = await Promise.all([
      db.collection(P.COL.itens).find({}).sort({ criadoEm: 1 }).toArray(),
      db.collection(P.COL.cotas).find({}).sort({ criadoEm: 1 }).toArray(),
      db.collection(P.COL.contribuicoes).find({}, { projection: { cota_id: 1, valor: 1 } }).toArray(),
      P.lerConfigPresentes(db),
    ]);
    const somas = P.somarPorCota(contribs);

    return res.status(200).json({
      itens: itens.map(P.itemPublico),
      cotas: cotas.map(c => P.cotaPublica(c, somas.get(String(c._id)), cfg.mostrarArrecadado)),
      config: {
        pix: cfg.pixChave ? { tipo: cfg.pixTipo, chave: cfg.pixChave, nome: cfg.pixNome, cidade: cfg.pixCidade } : null,
        whatsapp: cfg.whatsapp || "",
        textoEntrega: cfg.textoEntrega,
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ erro: "Não foi possível carregar a lista agora." });
  }
};
