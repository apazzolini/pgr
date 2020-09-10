import 'dotenv/config'
import PG from 'pg'

const { Pool } = PG

const DATABASE = `pgr_test_${Math.round(Math.random() * 200000)}`
const genericPool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  password: process.env.PGPASSWORD,
})
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  password: process.env.PGPASSWORD,
  database: DATABASE,
})

export async function setupTestDb() {
  await genericPool.query(`CREATE DATABASE ${DATABASE}`)
  await pool.query('CREATE TABLE one (id varchar(20), name varchar(20))')
  await pool.query("INSERT INTO one (id, name) VALUES ('a', 'aaa'), ('b', 'bbb')")
  return DATABASE
}

export async function teardownTestDb() {
  await pool.end()
  await genericPool.query(`DROP DATABASE ${DATABASE}`)
  await genericPool.end()
}
