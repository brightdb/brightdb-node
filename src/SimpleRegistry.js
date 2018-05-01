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
    setTimeout(() => {
      for(let handler of handlers[event]) {
        handler(msg)
      }
    }, 1)
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
        send('success', {key: message.key, context : message.context})
        break
      case 'get':
        if(!message.key) {
          logger.error("Received invalid 'get', message was %s", message)
          break
        }
        let value = registry[message.key]
        send('result', {key: message.key, value : value, context : message.context})
        break
      case 'add':
        if(!message.key || !message.value) {
          logger.error("Received invalid 'add'",message)
          break
        }
        {
          let set = new Set(registry[message.key])
          set.add(message.value)
          registry[message.key] = set
        }
        break
      case 'remove':
        if(!message.key || !message.value) {
          logger.error("Received invalid 'remove'",message)
          break
        }
        { 
          let set = new Set(registry[message.key])
          set.delete(message.value)
          registry[message.key] = set
        }
        break

    }
  }
}
