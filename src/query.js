import pgformat from 'pg-format'
import { getPool } from './pool.js'

export const format = ({ text, values }) => {
    const formattableText = text.replace(/\$\d+/g, '%L')
    return pgformat(formattableText, ...values)
}

const execQuery = async (transport, { text, values }, opts) => {
    const { debug, debugOnly, rowMapper } = opts

    if (debug || debugOnly) {
        console.log(format({ text, values }))
        if (debugOnly) return
    }

    const { rows } = await transport(text, values)
    if (rowMapper) return rows.map(rowMapper)
    return rows
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
        const tquery = (q, o) => execQuery(client.query.bind(client), q, o)
        tquery.one = (q, o) => execQuery.one(client.query.bind(client), q, o)

        return await cb(tquery)
    } catch (e) {
        console.error(e)
    } finally {
        client.release()
    }
}

export default query
