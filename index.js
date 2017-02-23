const io = require('socket.io-client')
const sodi = require('sodi')

function signalExchange (host, keypair, onOffer) {
  if (!onOffer) {
    // Host is optional
    onOffer = keypair
    keypair = host
    host = 'https://signalexchange-1.now.sh'
  }

  let _sodi = sodi(keypair)
  const socket = io(host)

  let ping = (to, onPong) => {
    let value = Math.random().toString()
    let payload = {
      signature: _sodi.sign(value),
      from: _sodi.public,
      to: to,
      value
    }
    socket.emit('ping-req', payload)
    socket.on('pong-res', _from => {
      onPong(_from)
    })
  }

  socket.on('ping-res', _from => {
    let value = Math.random().toString()
    let payload = {
      signature: _sodi.sign(value),
      from: _sodi.public,
      to: _from,
      value
    }
    socket.emit('pong-req', payload)
  })

  socket.on('signal', data => {
    // TODO: wrap in try/catch
    let decrypted = _sodi.decrypt(data.offer, data.nonce, data.from)
    data.offer = JSON.parse(decrypted.toString())
    onOffer(data)
  })
  socket.on('offer-error', (msg) => {
    console.error('offer-error:', msg)
  })

  let encodeOffer = (pubKey, offer) => {
    let data = {
      from: _sodi.public,
      to: pubKey,
      created: Date.now(),
      expires: Date.now() + (30 * 1000)
    }
    let obj = _sodi.encrypt(JSON.stringify(offer), pubKey)
    data.offer = obj.box
    data.nonce = obj.nonce
    data.signature = _sodi.sign(data.offer)
    return data
  }
  var queue = []
  let send = (pubKey, offer) => {
    if (!socket._isReady) return queue.push([pubKey, offer])
    let data = encodeOffer(pubKey, offer)
    socket.emit('signal', data)
  }
  send.encodeOffer = encodeOffer
  send.socket = socket

  socket.once('ready', () => {
    socket._isReady = true
    if (send.onReady) send.onReady()
    queue.forEach(arr => send(...arr))
    queue = []
  })
  send.sodi = _sodi
  send.ping = ping

  var data = Math.random().toString()
  socket.emit('subscribe', _sodi.public, data, _sodi.sign(data))

  return send
}

module.exports = signalExchange
