import dedent from 'dedent'
import { flatten, zip } from 'lodash'

class ConditionalExpr {
    constructor(...args) {
        if (args.length === 1 && typeof args === 'object') {
            this.test = args[0].test
            this.expr = args[0].expr
            this.arg = args[0].arg
            return this
        }

        this.test = args[1] // eslint-disable-line prefer-destructuring
        this.expr = args[0] // eslint-disable-line prefer-destructuring
        this.arg = args[1] // eslint-disable-line prefer-destructuring
    }

    include() {
        if (Array.isArray(this.test) && this.test.length === 0) return false
        return this.test || this.test === 0
    }
}

const format = text =>
    dedent(text)
        .split('\n')
        .filter(l => !/^\s*$/.test(l))
        .join('\n')

const sql = (strings, ...args) => {
    if (args.length === 0) {
        return {
            text: format(strings.join(' ')),
            values: [],
        }
    }

    let text = ''
    let curIdx = 1
    const values = []

    const parts = flatten(zip(strings, args))

    parts.forEach((part, idx) => {
        const isLiteral = idx % 2 === 0

        if (isLiteral) {
            text += part
        } else if (part && part instanceof ConditionalExpr) {
            if (part.include()) {
                text += `${part.expr.replace('?', `$${curIdx++}`)}`
                values.push(part.arg)
            }
        } else if (typeof part !== 'undefined') {
            text += `$${curIdx++}`
            values.push(part)
        }
    })

    return {
        text: format(text),
        values,
    }
}

sql.if = (expr, maybeVal) => new ConditionalExpr(expr, maybeVal)
export default sql
