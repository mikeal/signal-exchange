const verify = require('./').verify

module.exports = function (io) {
  io.on('connection', socket => {
    socket.on('subscribe', (publicKey, data, signature) => {
      if (!data || !data.verify || !verify(data, publicKey, signature)) {
        return console.error('signature failure, not subscribed.')
      } else {
        socket.join(publicKey)
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
      if (!verify(data.offer, data.from, data.signature)) {
        let msg = 'signature check failed.'
        socket.emit('offer-error', msg)
        return console.error(msg)
      }
      io.in(data.to).emit('signal', data)
    })
    socket.on('ping-req', (data) => {
      if (!data.to || !data.from || !data.value || !data.signature) {
        let msg = 'send did not contain necessary info.'
        socket.emit('ping-error', 'send did not contain necessary info.')
        return console.error(msg)
      }
      if (!verify(data.value, data.from, data.signature)) {
        let msg = 'signature check failed.'
        socket.emit('offer-error', msg)
        return console.error(msg)
      }
      if (Array.isArray(data.to)) {
        data.to.forEach(t => io.in(t).emit('ping-res', data.from))
      } else {
        io.in(data.to).emit('ping-res', data.from)
      }
    })
    socket.on('pong-req', (data) => {
      if (!data.to || !data.from || !data.value || !data.signature) {
        let msg = 'send did not contain necessary info.'
        socket.emit('pong-error', 'send did not contain necessary info.')
        return console.error(msg)
      }
      if (!verify(data.value, data.from, data.signature)) {
        let msg = 'signature check failed.'
        socket.emit('offer-error', msg)
        return console.error(msg)
      }
      if (Array.isArray(data.to)) {
        data.to.forEach(t => io.in(t).emit('pong-res', data.from))
      } else {
        io.in(data.to).emit('pong-res', data.from)
      }
    })
  })
  return io
}
