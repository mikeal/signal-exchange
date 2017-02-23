const sodi = require('sodi')

const toHex = o => Buffer.isBuffer(o) ? o.toString('hex') : o

module.exports = function (io) {
  io.on('connection', socket => {
    socket.on('subscribe', (publicKey, data, signature) => {
      if (!data || !sodi.verify(data, signature, publicKey)) {
        return console.error('signature failure, not subscribed.')
      } else {
        socket.join(toHex(publicKey))
        socket.emit('ready')
      }
    })
    socket.on('signal', data => {
      // the offer is encrypted and can only be opened by the receiver
      // however, the encrypted buffer is signed to prevent message flooding
      if (!data.to || !data.from || !data.offer || !data.signature) {
        let msg = 'send did not contain necessary info.'
        socket.emit('offer-error', 'send did not contain necessary info.')
        return console.error(msg)
      }
      if (!sodi.verify(data.offer, data.signature, data.from)) {
        let msg = 'signature check failed.'
        socket.emit('offer-error', msg)
        return console.error(msg)
      }

      io.in(toHex(data.to)).emit('signal', data)
    })
    socket.on('ping-req', (data) => {
      if (!data.to || !data.from || !data.value || !data.signature) {
        let msg = 'send did not contain necessary info.'
        socket.emit('ping-error', 'send did not contain necessary info.')
        return console.error(msg)
      }
      if (!sodi.verify(data.value, data.signature, data.from)) {
        let msg = 'signature check failed.'
        socket.emit('offer-error', msg)
        return console.error(msg)
      }
      if (Array.isArray(data.to)) {
        data.to.forEach(t => io.in(toHex(t)).emit('ping-res', data.from))
      } else {
        io.in(toHex(data.to)).emit('ping-res', data.from)
      }
    })
    socket.on('pong-req', (data) => {
      if (!data.to || !data.from || !data.value || !data.signature) {
        let msg = 'send did not contain necessary info.'
        socket.emit('pong-error', 'send did not contain necessary info.')
        return console.error(msg)
      }
      if (!sodi.verify(data.value, data.signature, data.from)) {
        let msg = 'signature check failed.'
        socket.emit('offer-error', msg)
        return console.error(msg)
      }
      if (Array.isArray(data.to)) {
        data.to.forEach(t => io.in(toHex(t)).emit('pong-res', data.from))
      } else {
        io.in(toHex(data.to)).emit('pong-res', data.from)
      }
    })
  })
  return io
}
