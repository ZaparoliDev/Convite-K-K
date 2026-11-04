const { getDb } = require("../lib/db");
const P = require("../lib/presentes");

// GET ?id= → foto de um presente ou cota guardada no MongoDB.
// Cada foto nova ganha um id novo, então pode ficar em cache "para sempre".
module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).end();
  const id = P.oid(req.query?.id);
  if (!id) return res.status(400).end();
  try {
    const db = await getDb();
    const img = await db.collection(P.COL.imagens).findOne({ _id: id });
    if (!img) return res.status(404).end();
    const d = img.dados;
    const dados = typeof d?.read === "function" ? Buffer.from(d.read(0, d.length())) : Buffer.from(d || []);
    res.setHeader("Content-Type", img.tipo || "image/webp");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).end(dados);
  } catch (e) {
    console.error(e);
    return res.status(500).end();
  }
};
