# pgr

This module aims to provide a structured and easy way to execute queries against a Postgres DB. It's a good fit if you want more support than using the [pg](https://github.com/brianc/node-postgres) module by itself but don't want to use an ORM. Its main features include a tagged template string based query helper and a small wrapper around pg's actual query methods.

## Installation

`yarn add pgr`

## Basic Example Usage

Once, in your application's entry point (before you want to run a query):

```js
import { createPool } from 'pgr'

createPool('myPoolName', {
    // The options here are exactly what you can provide to pg, such as
    host: 'localhost',
    user: 'Andre',
    password: '',
    database: 'mydb',
})
```

> If you only create one pool, you don't need to specify its name when running queries. For multiple pool support, check out the advanced usage section below.

Later on:

```js
import { query, sql } from 'pgr'

const value = 42

const rows = await query(sql`
    SELECT *
    FROM my_table
    WHERE some_col = ${value}
`)
```

That's it! The `sql` tagged template string will run your statement through [pgformat](https://github.com/datalanche/node-pg-format) (always with %L) to properly escape any dangerous variables and invoke it with your previously created pool.

## sql.if

I find that I often want to dynamically construct my statements based on the truthiness of a given variable. This allows for compact, powerful query methods similar to what you might find in an ORM. Enter `sql.if`:

### Simple mode (your test variable and arg are the same)

> Note: For purposes of `sql.if`, the number 0 is treated as truthy, and an empty array is treated as falsy.

```js
import { query, sql } from 'pgr'

const findUsers = async ({ id, accountId, emails, roles }) =>
    query(sql`
        SELECT *
        FROM users
        WHERE status = 'active'
            ${sql.if('AND id = ?', id)}
            ${sql.if('AND email = ?', email)}
            ${sql.if('AND role IN (?)', roles)}
    `)
```

```js
await findUsers({ id: 73 })
```
```sql
SELECT *
FROM users
WHERE status = 'active'
    AND id = '73'
```

> Your variable will get subbed in for the question mark in your expression. If there is no question mark, the variable will be used to test if the expression should be added as-is.

```js
await findUsers({ accountId: 1, roles: ['admin', 'superadmin'] })
```
```sql
SELECT *
FROM users
WHERE status = 'active'
    AND account_id = '1'
    AND role IN ('admin', 'superadmin')
```

```js
await findUsers({ accountId: 1, roles: [] }) // An empty array is treated as falsy
```
```sql
SELECT *
FROM users
WHERE status = 'active'
    AND account_id = '1'
```

### Complex mode (different test and arg variables, arg is optional)

```js
import { query, sql } from 'pgr'

const STATUSES = [1, 2, 3]

const findRelationships = async ({ id, includeOngoing }) => {
    const checkStatus = ... // External function returning true/false

    return query(sql`
        SELECT *
        FROM relationships
        WHERE from_id = ${id}
            ${sql.if({ test: includeOngoing, expr: 'AND end_date IS NULL' })}
            ${sql.if({ test: checkStatus, expr: 'AND status IN (?)', arg: STATUSES })}
    `)
}
```

```js
await findRelationships({ id: 1, includeOngoing: true })
```
```sql
(assuming checkStatus was true):

SELECT *
FROM relationships
WHERE from_id =1
    AND end_date IS NULL
    AND status IN ('1','2','3')
```

## sql.raw

You may have standard query fragments that you build up and inject into many queries. You might also have situations where pgformat's substitution doesn't achieve what you need. The escape hatch that you can use **carefully** is `sql.raw`.

```js
const currentUser = { purchasedItems: [10, 20] }
const fragment = sql`AND allowed_items IN (${currentUser.purchasedItems})`

const statement = sql`
    SELECT *
    FROM items
    WHERE on_sale = true
        ${sql.raw(fragment)}
```
```sql
SELECT *
FROM items
WHERE on_sale = true
    AND allowed_items IN ('10','20')
```

Note that fragments must themselves be run through `sql` if you need escaping. Don't be like little Bobby Tables.

```js
const name = "Robert'); DROP TABLE Students; --"

const statement = sql`
    SELECT *
    FROM oh_no
    WHERE name IN ('${sql.raw(fragment)}')
```
```sql
SELECT *
FROM oh_no
WHERE name IN ('Robert'); DROP TABLE Students; --')
```

## query, query.one, query.transaction

We've seen the most simple form of query, but it can also take a second `options` argument:

```js
const rows = await query(sql`SELECT ...`, {
    debug: false, // Logs the statement to the console before running it
    debugOnly: false, // Logs the statement to the console and does NOT run it
    poolName: '', // Runs the query with a client of the specified pool name
    rowMapper: row => {}, // A (synchronous) function to run on every row in the result
})

const knownEmails = await query(sql`SELECT email FROM users`, {
    rowMapper: row => row.email,
})
```

### query.one

Invoked exactly like `query`, except that instead of returning an array of rows, it will return one object. If your query results in no rows, it will return a null. If your query returns more than one row, it will throw an Error. You can also use rowMapper here.

```js
const currentUserEmail = await query(sql`
    SELECT email FROM users WHERE id = ${currentUserId}
`, {
    rowMapper: row => row.email,
})

console.log(currentUserEmail) // 'apazzolini@test.test'
```

### query.transaction

You can also run multiple queries inside of a transaction:

```js
const result = await query.transaction(async tquery => {
    // Inside this function, you should take care to use tquery 
    // instead of query or you may run into deadlocks.

    // tquery behaves exactly like query (and also has tquery.one)
    return 'myResult'
})

console.log(result) // 'myResult'
```

## License

MIT
