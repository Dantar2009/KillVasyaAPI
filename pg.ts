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
    pass VARCHAR(50),
    rating INTEGER DEFAULT 1000
);`)
pool.connect()
    .then(() => console.log("✅ БД подключена"))
    .catch(err => console.log("❌ БД не подключена:", err.message))
export default pool