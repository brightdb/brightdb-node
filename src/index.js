import Logger from 'logplease'
import WebSocket from 'ws'
import Registry from './SimpleRegistry'

const dataspace = process.argv[2]

const port = 5454

let registerInquiries = {}
let connectInquiries = {}

let registry = new Registry()
let peers = new Registry()

let logger = Logger.create('Bright-Node')
logger.debug('dataspace', dataspace)

let handleRegister = (inq, message) => {
  logger.debug('inquire state', inq.state)
  switch(inq.state) {
    case 'get':
      registry.message({type: 'set', key: message.key, value : true})
      inq.state = 'set'
      break
  }
}

registry.on('result', message => {
  if (!message.key) {
    logger.error("received invalid 'result'",message)
    return
  }
  let inq = registerInquiries[message.key]
  if (inq) {
    handleRegister(inq, message)
    return
  } 
  logger.error("found no inquiries for " + message.key)
})

registry.on('success', message => {
  logger.debug('receive success from registry', message)
  if(!message.key) {
    logger.error("received invalid 'success'",message)
    return
  } 
  let inq = registerInquiries[message.key]
  if (!inq) {
    logger.error("found no inquiry for " + message.key)
    return
  }
  if (!inq.ws) {
    logger.error("found no websocket for " + message.key)
    return
  }
  logger.debug('inquire state', inq.state)
  switch(inq.state) {
    case 'set':
      logger.debug('sending response to client', message.key)
      delete registerInquiries[message.key]
      inq.ws.send(JSON.stringify({type: "register", uri : message.key, result : true}), (error) => {
        if(error) {
          logger.error("websocket error: %s", error)
        }
      })
      break
  }
})

let handleConnect = (inq, message) => {
  switch(inq.state) {
    case 'incoming':
      if(!message.value || !message.value.entries) {
        logger.error("invalid peers value", message)
        break
      }
      logger.debug('peers', message.value.values())
      for(let peer of message.value.values()) {
        if( peer == message.context ) continue
        logger.debug(`sending peer uri ${peer} to ${message.context}`)
        connections[message.context].send(
          JSON.stringify(
            { type : "peer", uri : peer}
          ),
          (error) => {
            if(error) {
              logger.error(`sending peer uri ${peer} to ${message.context} failed`, error)
            }
          }
        )
        logger.debug(`sending peer uri ${message.context} to ${peer}`)
        connections[peer].send(
          JSON.stringify({type:"peer", uri: message.context}), 
          (error) => {
            if(error) {
              logger.error(`sending peer uri ${message.context} to ${peer} failed`, error)
            }
          })
      }

  }
}

peers.on('result', message => {
  if (!message.key || !message.context) {
    logger.error("received invalid 'result'",message)
    return
  }
  let inq = connectInquiries[message.context]
  if (inq) {
    handleConnect(inq, message)
    return
  } 
  logger.error("found no inquiries for " + message.key)
})

const wss = new WebSocket.Server({port : port})
let connections = {}

let close = uri => {
  logger.info(`closing connection to ${uri}`)
  delete connections[uri]
  peers.message({type:'remove', key: dataspace, value : uri})
  for( let peer in connections ) {
    connections[peer].send(JSON.stringify({type: "remove_peer", uri : uri}), error => {
      if(error) {
        logger.error(`sending remove_peer to ${peer} failed`, error)
      }
    })
  }
}

wss.on('connection', ws => {
  ws.on('message', message => {
    logger.info('received: %s', message)
    try{
      message = JSON.parse(message)
    } catch(e) {
      logger.error("invalid message %s", message)
      return
    }
    switch (message.type) {
      case 'register':
        if( !message.uri ) {
          logger.error("received invalid 'register', message was %s", message)
          break
        }
        registerInquiries[message.uri] = { ws : ws, state : 'get' }
        registry.message({type:'get', key: message.uri})
        break
      case 'connect':
        if(!message.uri) {
          logger.error("received invalid 'connect'", message)
          break
        }
        connections[message.uri] = ws
        ws.on('close', () => close(message.uri))
        connectInquiries[message.uri] = { state : 'incoming', dataspace : message.dataspace }
        peers.message({type:'add', key: dataspace, value : message.uri})
        peers.message({type:'get', key: dataspace, context : message.uri})
        break
      case 'signal':
        if(!message.from || !message.to || !message.signal) {
          logger.error("received invalid 'signal'", message)
          break
        }
        // TODO check that from is allowed to do this
        if(!connections[message.to]) {
          logger.error(`peer ${message.to} is offline`, message)
          break
        }
        connections[message.to].send( JSON.stringify(
          { type : 'signal'
          , peer : message.from
          , signal : message.signal
          }
        ))
        break
        
      default:
        logger.error("unknown message %s", message)
    }
  })

 
});
