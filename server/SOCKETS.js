// import lib from './lib.js'
import log from './log.js'
import BROKER from './BROKER.js'

const sockets = {}


const disconnect = event => {
	/*
		this callback is fired by BOTH
		- user disconnects
		- serverside force disconnects
	*/
	const { socket } = event

	const user = socket.request.session?.USER
	const uuid = user?.uuid
	BROKER.publish('CLEANUP_USER', {
		user,
		socket,
		caller: 'sock-disconnect'
	})

	delete sockets[ uuid ]
}






BROKER.subscribe('SOCKET_DISCONNECT', disconnect )

export default sockets
