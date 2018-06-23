const crypto = require('crypto')

const sha1 = data => {
    const generator = crypto.createHash('sha1')
    generator.update(data)
    return generator.digest('hex')
}

module.exports = q => {
    return sha1(q.getBaseStatement()).substring(0, 6)
}
