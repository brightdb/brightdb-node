import Logger from 'logplease'
import WebSocket from 'ws'
import Registry from './SimpleRegistry'

const port = 5454

let registerInquiries = {}

let registry = new Registry()

let logger = Logger.create('Bright-Node')

registry.on('result', message => {
  if (!message.key) {
    logger.error("received invalid 'result'",message)
    return
  }
  let inq = registerInquiries[message.key]
  if (!inq) {
    logger.error("found no inquiry for " + message.key)
    return
  }
  logger.debug('inquire state', inq.state)
  switch(inq.state) {
    case 'get':
      registry.message({type: 'set', key: message.key, value : true})
      inq.state = 'set'
      break
  }
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

const wss = new WebSocket.Server({port : port})

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
      default:
        logger.error("unknown message %s", message)
    }
  })
 
});
