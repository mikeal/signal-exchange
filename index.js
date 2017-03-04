const io = require('socket.io-client')
const sodi = require('sodi')
const toHex = o => !(typeof o === 'string') ? o.toString('hex') : o
const fromHex = o => !(typeof o === 'string') ? o : new Buffer(o, 'hex')

function signalExchange (host, keypair, onOffer) {
  if (!onOffer) {
    // Host is optional
    onOffer = keypair
    keypair = host
    host = 'wss://signalexchange-2.now.sh'
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
    let _offer = fromHex(data.offer)
    let decrypted = _sodi.decrypt(_offer, data.nonce, data.from)
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
  let queue = []
  let send = (pubKey, offer) => {
    if (!socket._isReady) return queue.push([pubKey, offer])
    let data = encodeOffer(pubKey, offer)
    data.from = toHex(data.from)
    data.offer = toHex(data.offer)
    data.signature = toHex(data.signature)
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

  let data = Math.random().toString()
  let signed = toHex(_sodi.sign(data))
  socket.emit('subscribe', _sodi.public, data, signed)

  return send
}

module.exports = signalExchange
