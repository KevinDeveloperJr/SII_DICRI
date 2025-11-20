// Configuración de conexión a SQL Server y helper para SP
const sql = require('mssql');

const dbConfig = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: true,
  },
};

let poolPromise = null;

// Devuelve un pool global reutilizable hacia SQL Server
async function getPool() {
  if (!poolPromise) {
    poolPromise = sql
      .connect(dbConfig)
      .then((pool) => {
        console.log('Conectado a SQL Server:', process.env.DB_DATABASE);
        return pool;
      })
      .catch((err) => {
        poolPromise = null; // Permite reintentar conexión si falla
        console.error('Error conectando a SQL Server:', err.message);
        throw err;
      });
  }
  return poolPromise;
}

// Ejecuta un procedimiento almacenado (SP) con parámetros de entrada
async function executeProcedure(procName, inputParams = {}) {
  const pool = await getPool();
  const request = pool.request();

  for (const [name, param] of Object.entries(inputParams)) {
    if (param && typeof param === 'object' && 'type' in param) {
      // Parámetro con tipo explícito: { type: sql.Int, value: 1 }
      request.input(name, param.type, param.value);
    } else {
      // Parámetro simple: deja que mssql infiera tipo
      request.input(name, param);
    }
  }

  const result = await request.execute(procName);
  return result;
}

module.exports = {
  sql,
  getPool,
  executeProcedure,
};
