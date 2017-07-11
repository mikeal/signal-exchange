# Signal Exchange

[![Greenkeeper badge](https://badges.greenkeeper.io/mikeal/signal-exchange.svg)](https://greenkeeper.io/)

WebRTC signal exchange by public key.

```
npm install signal-exchange
```

Signal exchange uses ECDH public keys as identifiers in the exchange. This
means that peers can "call" each other using public keys and encrypt the
offer messages through the exchange.

```javascript
const SimplePeer = require('simple-peer')
const signalExchange = require('signal-exchange')
const sodi = require('sodi')

// Generate keypairs w/ sodi.
let user1 = sodi.generate()
let user2 = sodi.generate()

let send1 = signalExchange(user1, signal => {
  peer1.signal(signal.offer)
})
let send2 = signalExchange(user2, signal => {
  var peer2 = new SimplePeer({trickle:false}))
  peer2.once('signal', offer => {
    send2(signal.from, signal.offer)
  })
})

let peer1 = new SimplePeer({initiator:true, trickle:false})
peer1.once('signal', offer => {
  send1(user2.publicKey, offer) // Send offer to peer2 through exchange
})
```

## `signalExchange([url], privateKey, publicKey, onOffer)`

Returns a `send` function.

* **url** *(optional)* The url of the peer exchange. Defaults to
  `wss://signalexchange.now.sh` a public exchange hosted on zeit.
* **privateKey** *(required)* hex encoded private key.
* **publicKey** *(required)* hex encoded public key.
* **onOffer** *(required)* function handler for signals sent to your public key

### `onOffer(signal)`

* **signal** *Object*
  * **to** hex encoded public key.
  * **from** hex encoded public key.
  * **offer** decrypted offer object, can be passed directly to SimplePeer.

## `send(publicKey, offer)`

* **publicKey** *(required)* hex encoded public key.
* **offer** *(required)* offer object from SimplePeer.