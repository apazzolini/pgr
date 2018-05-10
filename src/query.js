const { getPool } = require('./pool.js')

const execQuery = async (transport, statement, opts) => {
    const { debug, debugOnly, rowMapper } = opts

    if (debug || debugOnly) {
        console.log(statement)
        if (debugOnly) return
    }

    try {
        const res = await transport(statement)
        const { rows } = res
        if (rowMapper) return rows.map(rowMapper)
        return rows
    } catch (e) {
        if (e.code === '42601') {
            console.error(`QUERY ERROR: Syntax error:\n${statement}`)
        }

        throw e
    }
}

execQuery.one = async (transport, q, opts) => {
    const rows = await execQuery(transport, q, opts)
    if (!rows || !rows.length) return null
    if (rows.length > 1) throw Error(`Query returned more than 1 row (${rows.length} rows returned)`)
    return rows[0]
}

const query = async (q, opts = {}) => {
    const pool = getPool(opts.poolName)
    return execQuery(pool.query.bind(pool), q, opts)
}

query.one = async (q, opts = {}) => {
    const pool = getPool(opts.poolName)
    return execQuery.one(pool.query.bind(pool), q, opts)
}

query.transaction = async (cb, opts = {}) => {
    const pool = getPool(opts.poolName)
    const client = await pool.connect()

    try {
        const tquery = async (q, o = {}) => execQuery(client.query.bind(client), q, o)
        tquery.one = async (q, o = {}) => execQuery.one(client.query.bind(client), q, o)

        await client.query('BEGIN')
        const res = await cb(tquery)
        await client.query('COMMIT')
        return res
    } catch (e) {
        console.error('QUERY ERROR: Rolling back transaction', e)
        await client.query('ROLLBACK')
        throw e
    } finally {
        client.release()
    }
}

module.exports = query
