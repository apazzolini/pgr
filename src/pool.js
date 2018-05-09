import { Pool } from 'pg'

const registeredPools = {}

export const createPool = (name, config) => {
    const pool = new Pool(config)

    pool.on('error', (err, client) => {
        console.error(err, 'Unexpected error on idle client')
        process.exit(-1)
    })

    registeredPools[name] = pool
    return true
}

export const getPool = name => {
    if (typeof name === 'undefined' && Object.keys(registeredPools).length === 1) {
        [name] = Object.keys(registeredPools) // eslint-disable-line no-param-reassign
    }

    if (!registeredPools[name]) throw Error(`Unknown pool [${name}]`)
    return registeredPools[name]
}
