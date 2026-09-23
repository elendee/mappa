import { WebSocketServer } from 'ws'
import env from './.env.js'
// import log from './log.js'


let wss = false

function getInstance(){

	if( wss ) return wss

	// wss = new WebSocket.Server({
	wss = new WebSocketServer({
		// port: env.PORT,// + 1,
		noServer: true, // ^^ mutex
		clientTracking: true,
	})

	// wss.user_data = { // use this instead of passing WebSocket everywhere Server is required
	// 	OPEN: WebSocket.OPEN
	// }

	return wss

}

export default getInstance

