const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: 'localhost',
    database: 'FishFarmDB', // Force connect to the specific DB
    port: 1433,
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true
    }
};

console.log(`📡 Attempting login to ${dbConfig.database} as ${dbConfig.user}...`);

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ DATABASE CONNECTED SUCCESSFULLY!');
        console.log('-----------------------------------');
        return pool;
    })
    .catch(err => {
        console.error('❌ DATABASE CONNECTION FAILED!');
        console.error(`Error Details: ${err.message}`);
        console.log('-----------------------------------');
        // This ensures the backend doesn't stay in a broken state if the DB fails
        process.exit(1);
    });

module.exports = { sql, poolPromise };
