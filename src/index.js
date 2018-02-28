import WebSocket from 'ws'

const port = 5454

const wss = new WebSocket.Server({port : port})

const client = redis.createClient({host : "redis"})

wss.on('connection', ws => {
  ws.on('message', message => {
    switch (message.type) {
      case 'register':
        if( !message.uri ) return
        client.get(message.uri, (err, res) => {
          if( !ws ) return
          ws.send(0)
        })
        ws.send(JSON.stringify({type:'registered'})) 
    }
    console.log('received: %s', message)
  })
 
});
