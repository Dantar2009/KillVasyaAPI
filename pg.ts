import pkg from "pg"
import dotenv from "dotenv"

dotenv.config()

const { Pool } = pkg

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
})
pool.query(`CREATE TABLE IF NOT EXISTS killvasyausers(
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE,
    pass VARCHAR(255),
    rating INTEGER DEFAULT 1000
);`)
pool.query(`CREATE TABLE IF NOT EXISTS cemetery(
    id SERIAL PRIMARY KEY,
    date VARCHAR(50),
    epitaph TEXT
);`)
pool.connect()
    .then(() => console.log("✅ БД подключена"))
    .catch(err => console.log("❌ БД не подключена:", err.message))
export default pool