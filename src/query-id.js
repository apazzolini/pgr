import crypto from 'crypto'

function sha1(data) {
  const generator = crypto.createHash('sha1')
  generator.update(data)
  return generator.digest('hex')
}

export default function queryId(q) {
  return sha1(q.getBaseStatement()).substring(0, 6)
}
