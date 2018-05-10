const { createPool, getPool } = require('./index.js')

describe('pool', () => {
    test('creates a pool', () => {
        expect(createPool('pool1', { hostname: 'one' })).toBe(true)
        const pool = getPool('pool1')
        expect(pool).toBeDefined()
        expect(pool.options.hostname).toBe('one')
    })

    test('retrieves the default pool with no name', () => {
        expect(createPool('pool1', { hostname: 'one' })).toBe(true)
        expect(getPool()).toBe(getPool('pool1'))
    })

    test('creates a secondary pool', () => {
        expect(createPool('pool2', { hostname: 'two' })).toBe(true)
        expect(getPool('pool1').options.hostname).toBe('one')
        expect(getPool('pool2').options.hostname).toBe('two')
    })

    test('cannot retrieve a pool without a name if more than one exists', () => {
        expect(getPool).toThrow()
    })
})
