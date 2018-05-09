import sql from './sql.js'

describe('sql', () => {
    test('formats statements that have no parameters', () => {
        expect(sql`SELECT * FROM a`).toEqual({
            text: 'SELECT * FROM a',
            values: [],
        })
    })

    test('dedents statements that have no parameters', () => {
        expect(sql`
            SELECT *
            FROM a
        `).toEqual({
            text: [
                'SELECT *',
                'FROM a',
            ].join('\n'),
            values: [],
        })
    })

    test('formats statements with parameters', () => {
        const value = 'val1'
        const value2 = 'val2'

        expect(sql`SELECT * FROM a WHERE f = ${value} AND z = ${value2}`).toEqual({
            text: 'SELECT * FROM a WHERE f = $1 AND z = $2',
            values: ['val1', 'val2'],
        })
    })

    test('formats statements with conditional parameters', () => {
        const value1 = 'val1'
        const value2 = null
        const value3 = 'val3'

        expect(sql`
            SELECT * FROM a
            WHERE x = ${value1}
                ${sql.if('AND y = ?', value2)}
                ${sql.if('AND z = ?', value3)}
        `).toEqual({
            text: [
                'SELECT * FROM a',
                'WHERE x = $1',
                '    AND z = $2',
            ].join('\n'),
            values: ['val1', 'val3'],
        })
    })

    test('formats statements with parameters and text at the end', () => {
        const value = 'val1'
        const value2 = 'val2'

        expect(sql`SELECT * FROM a WHERE f = ${value} AND z = ${value2} AND 1 = 1`).toEqual({
            text: 'SELECT * FROM a WHERE f = $1 AND z = $2 AND 1 = 1',
            values: ['val1', 'val2'],
        })
    })

    test('empty arrays are not included', () => {
        expect(sql`SELECT * FROM a ${sql.if('WHERE f ANY (?)', [])}`).toEqual({
            text: 'SELECT * FROM a',
            values: [],
        })
    })

    test('arrays are expanded correctly', () => {
        expect(sql`SELECT * FROM a ${sql.if('WHERE f ANY (?)', [1, 2, 3])}`).toEqual({
            text: 'SELECT * FROM a WHERE f ANY ($1)',
            values: [[1, 2, 3]],
        })
    })
})
