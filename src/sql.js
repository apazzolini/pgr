const dedent = require('dedent')
const flatten = require('lodash/flatten')
const zip = require('lodash/zip')
const pgformat = require('pg-format')

class ConditionalExpr {
    constructor(...args) {
        if (args.length === 1 && typeof args === 'object') {
            this.test = args[0].test
            this.expr = args[0].expr
            this.arg = args[0].arg
            return this
        }

        this.test = this.arg = args[1]
        this.expr = args[0]
    }

    shouldInclude() {
        if (Array.isArray(this.test) && this.test.length === 0) return false
        return this.test || this.test === 0
    }
}

class RawExpr {
    constructor(str) {
        this.str = str
    }
}

const format = text =>
    dedent(text)
        .split('\n')
        .filter(l => !/^\s*$/.test(l)) // filter out lines that are only whitespace
        .join('\n')

const sql = (strings, ...args) => {
    if (args.length === 0) {
        return {
            getStatement: () => format(strings.join(' ')),
        }
    }

    let text = ''
    const values = []

    flatten(zip(strings, args)).forEach((part, idx) => {
        const isLiteral = idx % 2 === 0

        if (isLiteral) {
            text += part
        } else if (part && part instanceof ConditionalExpr) {
            if (part.shouldInclude()) {
                if (part.expr.includes('?')) {
                    text += `${part.expr.replace('?', '%L')}`
                    values.push(part.arg)
                } else {
                    text += part.expr
                }
            }
        } else if (part && part instanceof RawExpr) {
            if (typeof part.str.getStatement === 'function') {
                text += part.str.getStatement()
            } else {
                text += part.str
            }
        } else if (typeof part !== 'undefined') {
            text += '%L'
            values.push(part)
        }
    })

    return {
        getStatement: () => format(pgformat(text, ...values)),
    }
}

sql.if = (...args) => new ConditionalExpr(...args)
sql.raw = str => new RawExpr(str)

module.exports = sql
