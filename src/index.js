import WebSocket from 'ws'

const port = 5454

const wss = new WebSocket.Server({port : port})

wss.on('connection', ws => {
  ws.on('message', message => {
    switch (message.type) {
      case 'register':
        ws.send(JSON.stringify({type:'registered'})) 
    }
    console.log('received: %s', message)
  })
 
});
