// Conexão reaproveitada entre execuções da função (evita abrir uma conexão por requisição)
const { MongoClient } = require("mongodb");

let clientePromise = global._mongoClientePromise;

function getDb() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI não configurada");
  if (!clientePromise) {
    const cliente = new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5 });
    clientePromise = global._mongoClientePromise = cliente.connect();
  }
  return clientePromise.then(c => c.db(process.env.MONGODB_DB || "casamento"));
}

module.exports = { getDb };
