const http = require('http')
const signalServer = require('./server')
const corsify = require('corsify')
const socketio = require('socket.io')

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

signalServer(io)

app.listen(6688, () => console.log('listening 6688'))
