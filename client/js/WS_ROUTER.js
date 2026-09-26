import env from './env.js'
import BROKER from './EventBroker.js'
import hal from './hal.js'


const route = ( packet ) => {

	if( !packet ) return console.error('no packet')

	// console.group('ws-router')
	// if( env.LOCAL ) console.log(  packet )
	// console.groupEnd()

	switch( packet.type ){

	case 'init_user':
		BROKER.publish('INIT_USER', packet )
		break;

	case 'init_cove':
		BROKER.publish('INIT_COVE', packet )
		break;

	case 'leave_member':
		BROKER.publish('LEAVE_COVE', packet )
		break;

	case 'join_new_member':
		BROKER.publish('JOIN_NEW_MEMBER', packet )
		break;

	case 'add_user':
		BROKER.publish('ADD_USER', packet )
		break;

	case 'chat':
		BROKER.publish('HANDLE_CHAT', packet )
		break;

	case 'update_chat':
		BROKER.publish('HANDLE_CHAT_UPDATE', packet )
		break;

	case 'purge_chat':
		BROKER.publish('PURGE_CHAT', packet )
		break;

	case 'restore_input_chat':
		BROKER.publish('RESTORE_CHAT', packet )
		break;

	case 'alcove_users':
		BROKER.publish('ALCOVE_USERS', packet )
		break;

	case 'pong_user':
		BROKER.publish('PONG_USER', packet )
		break;

	case 'friend_status':
		BROKER.publish('FRIEND_STATUS', packet )
		break;

	case 'update_syntax':
		BROKER.publish('UPDATE_CHAT_SYNTAX', packet )
		break;

	case 'hal':
		hal( packet.msg_type, packet.msg, packet.time || 10 * 1000 )
		// console.log( packet )
		break;

	default: 
		if( env.LOCAL ){
			hal('standard', 'packet? ' + packet.type, 1500 )
		}else{
			console.warn('unknown packet: ', packet )
		}
		break
	}

}


export default route