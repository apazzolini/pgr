const { sql } = require('./index.js')

describe('sql', () => {
    test('formats statements that have no parameters', () => {
        expect(sql`SELECT * FROM a`.getStatement())
            .toEqual('SELECT * FROM a')
    })

    test('dedents statements that have no parameters', () => {
        expect(sql`
            SELECT *
            FROM a
        `.getStatement()).toEqual('SELECT *\nFROM a')
    })

    test('formats statements with parameters', () => {
        expect(sql`SELECT * FROM a WHERE f = ${'val1'} AND z = ${'val2'}`.getStatement())
            .toEqual("SELECT * FROM a WHERE f = 'val1' AND z = 'val2'")
    })

    test('formats statements with conditional parameters', () => {
        expect(sql`
            SELECT * FROM a
            WHERE x = ${'val1'}
                ${sql.if('AND y = ?', null)}
                ${sql.if('AND z = ?', 'val3')}
        `.getStatement()).toEqual("SELECT * FROM a\nWHERE x = 'val1'\n    AND z = 'val3'")
    })

    test('formats statements with long form conditional', () => {
        expect(sql`SELECT * FROM a ${sql.if({ test: true, expr: 'WHERE f = ?', arg: 42 })}`.getStatement())
            .toEqual("SELECT * FROM a WHERE f = '42'")
    })

    test('formats statements with parameters and text at the end', () => {
        expect(sql`SELECT * FROM a WHERE f = ${'val1'} AND z = ${'val2'} AND 1 = 1`.getStatement())
            .toEqual("SELECT * FROM a WHERE f = 'val1' AND z = 'val2' AND 1 = 1")
    })

    test('empty arrays are not included', () => {
        expect(sql`SELECT * FROM a ${sql.if('WHERE f ANY (?)', [])}`.getStatement())
            .toEqual('SELECT * FROM a')
    })

    test('arrays are expanded correctly', () => {
        expect(sql`SELECT * FROM a ${sql.if('WHERE f ANY (?)', [1, 2, 3])}`.getStatement())
            .toEqual("SELECT * FROM a WHERE f ANY ('1','2','3')")
    })

    test('long form statements without ? get included without an arg', () => {
        expect(sql`SELECT * FROM a ${sql.if('WHERE 1 = 1', true)} AND 2 = 2`.getStatement())
            .toEqual('SELECT * FROM a WHERE 1 = 1 AND 2 = 2')
    })

    test('raw expressions can be embedded', () => {
        const childExpr = sql`AND id = ${2}`
        expect(sql`SELECT * FROM a WHERE 1 = 1 ${sql.raw(childExpr)}`.getStatement())
            .toEqual("SELECT * FROM a WHERE 1 = 1 AND id = '2'")
    })

    test("raw expressions don't help against SQL injection", () => {
        const name = "Robert'); DROP TABLE Students; --"

        expect(sql`SELECT * FROM oh_no WHERE name IN ('${sql.raw(name)}')`.getStatement())
            .toEqual("SELECT * FROM oh_no WHERE name IN ('Robert'); DROP TABLE Students; --')")
    })
})
