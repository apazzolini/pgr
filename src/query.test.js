const sql = require('./sql.js')
const query = require('./query.js')
const { createPool, getPool } = require('./pool.js')
const { setupTestDb, teardownTestDb } = require('../test/helper.js')

describe('query', () => {
    describe('runner', () => {
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
            expect(res).toEqual([{ id: 'a', name: 'aaa' }, { id: 'b', name: 'bbb' }])
        })

        test('runs a one query', async () => {
            const res = await query.one(sql`SELECT name FROM one WHERE id = ${'a'}`)
            expect(res).toEqual({ name: 'aaa' })
        })

        test('throws an error if a one query returns more than one result', async () => {
            const resPromise = query.one(sql`SELECT * FROM one WHERE id IN (${'a'}, ${'b'})`)
            await expect(resPromise).rejects.toBeDefined()
        })

        test('maps rows with a provided function', async () => {
            const res = await query(sql`SELECT * FROM one`, {
                rowMapper: row => row.name,
            })
            expect(res).toEqual(['aaa', 'bbb'])
        })

        test('maps rows with a provided function for one queries', async () => {
            const res = await query.one(sql`SELECT * FROM one WHERE id = ${'a'}`, {
                rowMapper: row => row.name,
            })
            expect(res).toEqual('aaa')
        })

        test('runs a transaction query', async () => {
            expect.assertions(4)

            const res = await query.transaction(async tquery => {
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
    })
})

