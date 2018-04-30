import Logger from 'logplease'

let logger = Logger.create('SimpleRegistry');


let events = ['result', 'success']
const eventExists = (e) => {
  return events.indexOf(e) !== -1
}

let registry = {}

export default function Registry() {
  let handlers = {
  }
  this.on = (event, handler) => {
    if(!eventExists(event)) {
      logger.error(`event ${event} does not exist`)
      return
    }
    if(!handlers[event]) handlers[event] = []
    handlers[event].push(handler)
  }

  const send = (event, msg) => {
    for(let handler of handlers[event]) {
      handler(msg)
    }
  }

  this.message = (message) => {
    logger.debug('received: ', message)
    switch(message.type) {
      case 'set':
        if(!message.key || !message.value) {
          logger.error("Received invalid 'set'",message)
          break
        }
        registry[message.key] = message.value
        logger.debug('send success for ' + message.key)
        setTimeout(() => send('success', {key: message.key}), 1)
        break
      case 'get':
        if(!message.key) {
          logger.error("Received invalid 'get', message was %s", message)
          break
        }
        let value = registry[message.key]
        setTimeout(() => send('result', {key: message.key, value : value}), 1)
        break
    }
  }
}
