import { getPool } from './pool.js'
import getQueryId from './query-id.js'

function createMetrics(q) {
  return {
    baseStatement: q.getBaseStatement(),
    count: 0,
    avgMs: 0,
  }
}

async function execQuery(pool, q, opts) {
  const {
    debug,
    debugOnly,
    rowMapper,
    logger = console.log.bind(console),
    errorLogger = console.error.bind(console),
  } = opts

  q.id = getQueryId(q)

  if (!pool.metrics.queries[q.id]) pool.metrics.queries[q.id] = createMetrics(q)
  const metrics = pool.metrics.queries[q.id]

  if (debug || debugOnly) {
    logger(q.getStatement())
    if (debugOnly) return
  }

  const start = Date.now()
  try {
    const res = await pool.query(q.getStatement())
    const { rows } = res
    if (rowMapper) return rows.map(rowMapper)
    return rows
  } catch (e) {
    if (e.code === '42601') {
      errorLogger(`QUERY ERROR: Syntax error:\n${q.getStatement()}`)
    }

    throw e
  } finally {
    const took = Date.now() - start
    metrics.avgMs = (metrics.count * metrics.avgMs + took) / (metrics.count + 1)
    metrics.count++
  }
}

execQuery.one = async function one(pool, q, opts) {
  const rows = await execQuery(pool, q, opts)
  if (!rows || !rows.length) return null
  if (rows.length > 1) {
    throw Error(`Query returned more than 1 row (${rows.length} rows returned)`)
  }
  return rows[0]
}

async function query(q, opts = {}) {
  const pool = getPool(opts.poolName)
  return execQuery(pool, q, opts)
}

query.one = async function one(q, opts = {}) {
  const pool = getPool(opts.poolName)
  return execQuery.one(pool, q, opts)
}

query.transaction = async function transaction(cb, opts = {}) {
  const pool = getPool(opts.poolName)
  const client = await pool.connect()
  client.metrics = pool.metrics

  try {
    const tquery = async (q, o = {}) => execQuery(client, q, o)
    tquery.one = async (q, o = {}) => execQuery.one(client, q, o)

    await client.query('BEGIN')
    const res = await cb(tquery)
    await client.query('COMMIT')
    return res
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

export default query
