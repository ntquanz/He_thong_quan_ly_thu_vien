const sql = require('mssql');
const dotenv = require('dotenv');

dotenv.config();

const config = {
  server: process.env.DB_SERVER,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    },
  },
  options: {
    database: process.env.DB_DATABASE,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 30000,
    encrypt: false,
    instanceName: 'SQLEXPRESS',
  },
};

let pool = null;

async function connectDatabase() {
  try {
    pool = await sql.connect(config);
    console.log('✅ Kết nối Database thành công!');
    return pool;
  } catch (error) {
    console.error('❌ Lỗi kết nối Database:', error.message);
    process.exit(1);
  }
}

async function getPool() {
  if (!pool) {
    await connectDatabase();
  }
  return pool;
}

async function closeDatabase() {
  if (pool) {
    await pool.close();
    console.log('Database đã đóng kết nối');
  }
}

module.exports = {
  sql,
  connectDatabase,
  getPool,
  closeDatabase,
};
