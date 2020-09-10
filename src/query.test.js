import { sql, query, createPool, getPool } from './index.js'
import getQueryId from './query-id.js'
import { setupTestDb, teardownTestDb } from '../test/helper.js'

describe('query', () => {
  beforeAll(async () => {
    const db = await setupTestDb()
    createPool('default', {
      user: process.env.PGUSER,
      host: process.env.PGHOST,
      password: process.env.PGPASSWORD,
      database: db,
    })
  })

  afterAll(async () => {
    await getPool('default').end()
    await teardownTestDb()
  })

  test('runs a query', async () => {
    const res = await query(sql`SELECT * FROM one`)
    expect(res).toEqual([
      { id: 'a', name: 'aaa' },
      { id: 'b', name: 'bbb' },
    ])
  })

  test('does not run a debugOnly query', async () => {
    await query(sql`INSERT INTO one VALUES ('z', 'zzz')`, {
      debugOnly: true,
      logger: () => {},
    })
    expect(await query(sql`SELECT * FROM one`)).toHaveLength(2)
  })

  test('runs a one query', async () => {
    const res = await query.one(sql`SELECT name FROM one WHERE id = ${'a'}`)
    expect(res).toEqual({ name: 'aaa' })
  })

  test('tracks metrics using base statement', async () => {
    await query.one(sql`SELECT name FROM one WHERE id = ${'b'}`)
    const pool = getPool('default')

    expect(pool.metrics.queries).toMatchObject({
      [getQueryId(sql`SELECT name FROM one WHERE id = ${'b'}`)]: {
        baseStatement: 'SELECT name FROM one WHERE id = %L',
        count: 2,
        avgMs: expect.any(Number),
      },
    })
  })

  test('returns null for a one query that resturns zero rows', async () => {
    const res = await query.one(sql`SELECT name FROM one WHERE id = ${'q'}`)
    expect(res).toBe(null)
  })

  test('throws an error if a one query returns more than one result', async () => {
    const resPromise = query.one(sql`SELECT * FROM one WHERE id IN (${'a'}, ${'b'})`)
    await expect(resPromise).rejects.toBeDefined()
  })

  test('maps rows with a provided function', async () => {
    const res = await query(sql`SELECT * FROM one`, {
      rowMapper: (row) => row.name,
    })
    expect(res).toEqual(['aaa', 'bbb'])
  })

  test('maps rows with a provided function for one queries', async () => {
    const res = await query.one(sql`SELECT * FROM one WHERE id = ${'a'}`, {
      rowMapper: (row) => row.name,
    })
    expect(res).toEqual('aaa')
  })

  test('runs a transaction query', async () => {
    expect.assertions(4)

    const res = await query.transaction(async (tquery) => {
      await tquery(sql`INSERT INTO one VALUES ('c', 'ccc')`)

      // If a different query uses a different client, they shouldn't see this new row
      expect(await query(sql`SELECT * FROM one`)).toHaveLength(2)

      // This client (tquery) should see the row though
      expect(await tquery(sql`SELECT * FROM one`)).toHaveLength(3)

      return 'ok'
    })

    expect(res).toBe('ok')
    expect(await query(sql`SELECT * FROM one`)).toHaveLength(3)
  })

  test('transactions roll back in case of errors', async () => {
    expect.assertions(2)

    try {
      await query.transaction(async (tquery) => {
        await tquery(sql`INSERT INTO one VALUES ('d', 'ddd')`)

        // This client (tquery) should see the row though
        expect(await tquery(sql`SELECT * FROM one`)).toHaveLength(4)

        throw Error('oh no')
      })
    } catch (e) {
      // Do nothing
    }

    expect(await query(sql`SELECT * FROM one`)).toHaveLength(3)
  })
})
