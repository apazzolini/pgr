import sql from './sql.js'
import query, { format } from './query.js'
import { createPool } from './pool.js'

describe('query', () => {
    describe('format', () => {
        test('works with no values', () => {
            expect(format({
                text: 'SELECT * FROM a',
                values: [],
            })).toEqual('SELECT * FROM a')
        })

        test('converts $ placeholders to %L and parses', () => {
            expect(format({
                text: 'SELECT * FROM a WHERE x = $1 OR y = $2',
                values: ['val1', 'val2'],
            })).toEqual("SELECT * FROM a WHERE x = 'val1' OR y = 'val2'")
        })

        test('escapes strings', () => {
            expect(format({
                text: 'SELECT * FROM a WHERE x = $1',
                values: ["'; drop tables --"],
            })).toEqual("SELECT * FROM a WHERE x = '''; drop tables --'")
        })
    })

    describe('runner', () => {
        beforeAll(() => {
            createPool('default', {
                user: 'Andre',
                host: 'localhost',
                database: 'pubgsh',
                password: '',
            })
        })

        test('runs a query', async () => {
            const res = await query(sql`SELECT * FROM players`)
            console.log(res[0].id)
        })

        test('runs a one query', async () => {
            const id = 'account.6ea3d4f285d2411581164ab56761a9fd'
            const res = await query.one(sql`
                SELECT * FROM players
                WHERE 2 = 2
                   ${sql.if('AND id = ANY(?)', [id])}
                  AND 1 = 1
            `, { debug: true })

            console.log('wow', res.name)
        })

        test('runs a transaction query', async () => {
            const res = await query.transaction(async tquery => {
                const a = await tquery(sql`
                    SELECT * FROM players
                `, {
                    rowMapper: row => row.id.toUpperCase(),
                })

                const b = await tquery.one(sql`
                    SELECT * FROM players
                `, {
                    rowMapper: row => row.id.toUpperCase(),
                })

                console.log(a[0], b)

                return 'x'
            })

            console.log(res)
        })
    })
})

