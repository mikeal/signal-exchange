const crypto = require('crypto')
const ec_pem = require('./ec-pem')
const io = require('socket.io-client')
const rand = () => crypto.randomBytes(30).toString('hex')

function sign (pemPrivateKey, value) {
  if (typeof value !== 'string') value = JSON.stringify(value)
  let algo = 'ecdsa-with-SHA1'
  let _sign = crypto.createSign(algo)
  _sign.update(value)
  return _sign.sign(pemPrivateKey).toString('hex')
}
function verify (value, publicKey, signature) {
  if (!Buffer.isBuffer(publicKey)) publicKey = new Buffer(publicKey, 'hex')
  if (!Buffer.isBuffer(signature)) signature = new Buffer(signature, 'hex')
  if (typeof value !== 'string') value = JSON.stringify(value)
  var c = 'secp521r1'
  var pem = ec_pem({public_key: publicKey, curve: c}, c).encodePublicKey()
  var algo = 'ecdsa-with-SHA1'
  return crypto.createVerify(algo).update(value).verify(pem, signature)
}
function computeSecret (fromPrivateKey, toPublicKey) {
  let priv = crypto.createECDH('secp521r1')
  priv.generateKeys()
  priv.setPrivateKey(fromPrivateKey, 'hex')
  let secret = priv.computeSecret(toPublicKey, 'hex', 'hex')
  return secret
}
function encrypt (fromPrivateKey, toPublicKey, data) {
  if (typeof data !== 'string') data = JSON.stringify(data)
  // TODO: finish encryption
  let secret = computeSecret(fromPrivateKey, toPublicKey)
  let cipher = crypto.createCipher('aes192', secret)
  let encrypted = cipher.update(data, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}
function decrypt (toPrivateKey, fromPublicKey, data) {
  let secret = computeSecret(toPrivateKey, fromPublicKey)
  let decipher = crypto.createDecipher('aes192', secret)
  var decrypted = decipher.update(data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  var ret = JSON.parse(decrypted)
  return ret
}

function signalExchange (host, privateKey, publicKey, onOffer) {
  if (!onOffer) {
    // Host is optional
    onOffer = publicKey
    publicKey = privateKey
    privateKey = host
    host = 'https://signalexchange.now.sh'
  }

  var socket = io(host)
  var c = 'secp521r1'
  var pem = ec_pem({private_key: new Buffer(privateKey, 'hex'), curve: c}, c)
  var pemPrivateKey = pem.encodePrivateKey()

  var data = {verify: true, nonce: crypto.randomBytes(30).toString('hex') }
  socket.emit('subscribe', publicKey, data, sign(pemPrivateKey, data))

  function ping (to, onPong) {
    let value = { nonce: crypto.randomBytes(30).toString('hex') }
    let payload = {
      signature: sign(pemPrivateKey, value),
      from: publicKey,
      to: to,
      value
    }
    socket.emit('ping-req', payload)
    socket.on('pong-res', _from => {
      onPong(_from)
    })
  }

  socket.on('ping-res', _from => {
    let value = { nonce: crypto.randomBytes(30).toString('hex') }
    let payload = {
      signature: sign(pemPrivateKey, value),
      from: publicKey,
      to: _from,
      value
    }
    socket.emit('pong-req', payload)
  })

  function _decrypt (publicKey, obj) {
    return decrypt(privateKey, publicKey, obj)
  }

  socket.on('signal', data => {
    // TODO: wrap in try/catch
    data.offer = _decrypt(data.from, data.offer)
    onOffer(data)
  })
  socket.on('offer-error', (msg) => {
    console.error('offer-error:', msg)
  })
  function _sign (offer) {
    return sign(pemPrivateKey, offer)
  }
  function encodeOffer (pubKey, offer) {
    let data = { from: publicKey,
                 to: pubKey,
                 nonce: rand(),
                 created: Date.now(),
                 expires: Date.now() + (30 * 1000)
               }
    data.offer = encrypt(privateKey, pubKey, offer)
    data.signature = _sign(data.offer)
    return data
  }
  var queue = []
  function send (pubKey, offer) {
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
  send.sign = _sign
  send.decrypt = _decrypt
  send.ping = ping
  send.encrypt = (pubKey, data) => encrypt(privateKey, pubKey, data)
  return send
}

module.exports = signalExchange
module.exports.decrypt = decrypt
module.exports.encrypt = encrypt
module.exports.sign = sign
module.exports.verify = verify
module.exports.computeSecret = computeSecret
