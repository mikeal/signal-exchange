const test = require('tape')
const http = require('http')
const corsify = require('corsify')
const sodi = require('sodi')
const socketio = require('socket.io')
const signalServer = require('./server')
const signalExchange = require('./')
const serverDestroy = require('server-destroy')

const cors = corsify({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Authorization'
})

const handler = cors((req, res) => {
  if (req.url === '/') {
    // TODO: status message
  } else {
    res.statusCode = 404
    res.end()
  }
})
const app = http.createServer(handler)
const io = socketio(app)

test('setup server', t => {
  t.plan(1)
  signalServer(io)
  serverDestroy(app)
  app.listen(6688, () => t.ok(true))
})

test('basic signal exchange', t => {
  t.plan(2)
  let user1 = sodi.generate()
  let user2 = sodi.generate()
  let server = 'ws://localhost:6688'

  let send1 = signalExchange(server, user1, signal => {
    t.equal(signal.offer.type, 'answer')
    send1.socket.destroy()
    send2.socket.destroy()
  })

  let send2 = signalExchange(server, user2, signal => {
    t.equal(signal.offer.type, 'offer')
    send2(signal.from, {type: 'answer'})
  })

  send2.onReady = () => {
    send1(user2.publicKey, {type: 'offer'})
  }
})

test('teardown', t => {
  t.plan(1)
  app.close(() => t.ok(true))
  io.close()
})
