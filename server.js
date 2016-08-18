const verify = require('./').verify

module.exports = function (io) {
  io.on('connection', socket => {
    socket.on('subscribe', (publicKey, data, signature) => {
      if (!data || !data.verify || !verify(data, publicKey, signature)) {
        return console.error('signature failure, not subscribed.')
      } else {
        socket.join(publicKey)
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
  })
  return io
}
