'use strict';

const Utils                = require( "../general/utils" ),
      Logger               = require( '../general/logger' ),

	  cleanObjectExclusive = Utils.cleanObjectExclusive,
	  globalLogger         = Logger.globalLogger,
	  LogLevel             = Logger.LogLevel,
	  loggerModule         = 'socket-router';


// add logging functionality -- a message with the name 'log-only' is logged here
// means that we need to provide the router with a log file

/*
 * clean up any hidden properties added for routing * uses the omh to tell the device manager about the urls we care about
 */
function cleanMessage( message ) {

	return cleanObjectExclusive( message, ['sender', "sender-token", 'return-token'] );
}

/**
 * router for outgoing messages.
 * uses the omh to tell the device manager about the urls we care about
 * handle incomming messages from websocket to here
 * 
 * message formats:
 * 		name : name of message
 * 
 * 		responses
 * 			success : true or false
 *  		error   : error message - MUST exist if success == false
 * 
 * 		error
 * 			name  : 'error'
 * 			cuase : what caused the error
 * 			error : message string 
 * 
 * 		callbacks 
 * 			do not nesscarily have a name in the message
 * 			MUST be a response style

 * options
 *      * baseLocatoin : where to find the property bag
 * @constructor
 * @class
 * 
 *  @param {*} opts options for the device manager
 * 
 * | property name | meaning                                                       |
 * | :------------ | :------------------------------------------------------------ |
 * | emitter       | the event emitter, (usually the owning http or socket server) |
 * | name          | the router owner name                                         |
 * | logger        | owners logger. If none, the global logger will be used        |
 * 
 * @property SocketRouter.eventEmitter   passed in event emitter (usually the owning http or socket server)
 * @property SocketRouter.routerName     name of the router/owner
 * @property SocketRouter.routes         routes to, route back to this process
 * @property SocketRouter.sendOut       
 * @property SocketRouter.defaultRoute   
 * @property SocketRouter.requestQueue   
 * @property SocketRouter.requestQueueID queue ID of the message, for comparisons for responses
 * @property SocketRouter.commonToken    
 * @property SocketRouter.logger         the logger
 */
function SocketRouter( opts ) {

	if( !opts ) {
		opts = Object.create( null );
	}

	if( !opts.name ) {
		opts.name = 'server';
	}

	if( !opts.logger ) {
		opts.logger = globalLogger;
	}

	this.sendOut        = null;
	this.defaultRoute   = null;
	this.commonToken    = null;
	this.requestQueueID = 1;
	this.eventEmitter   = opts.emitter;
	this.routerName     = opts.name + '(router)';
	this.routes         = Object.create( null );
	this.requestQueue   = Object.create( null );
    this.logger         = opts.logger;
}

/**
 * recieved a message
 */
SocketRouter.prototype.route = function( wsClient, messageString ) {

	let message;
	let messageName;
	let returnToken;
	
	this.logger.addEvent( 'recieved message', LogLevel.Verbose, { module : this.routerName, message : messageString } );
	
	try {

		message = JSON.parse( messageString );

		if( message !== undefined ) {
			messageName = message.name;
		}
		else {
			this.logger.addEvent( 'no message recieved', LogLevel.Error, { module : this.routerName, message : messageString })
			return;
		}

		returnToken = message['return-token'];
		
		if( !messageName &&  !returnToken ) {
			this.logger.addEvent( 'invalid message received: no message name and no return token', LogLevel.Error, { module : this.routerName, message : messageString, details : JSON.stringify(message) });
			return;
		}
	}
	catch( exp ) {
		this.logger.addEvent( 'message not in JSON format', LogLevel.Error, { module : this.routerName, exception : JSON.stringify(exp) });
		return ;
	}

	// note that if the message contains a sender-token field, it is up to the target function
	// to store it and send it back as 'return-token'
	//
	// here we ignore sender-token and check for return-token
	//
	
	// first of all, see if this is a response to a message.
	// if it is, the message will have a request ID
	//
	if( returnToken && returnToken.startsWith( this.routerName ) ) {

		this.logger.addEvent( 'recieved callback message', LogLevel.Verbose, { name : messageName, module : this.routerName });
		let callback = this.requestQueue[returnToken];

		delete this.requestQueue[returnToken];			// this is slower than setting to undefined, but removes the key too: https://stackoverflow.com/questions/208105/how-do-i-remove-a-property-from-a-javascript-object

		if( !callback ) {
			this.logger.addEvent( 'no callback function', LogLevel.Error, { module : this.routerName });
		}
		else {
			this.logger.addEvent( 'sending message on as a callback', LogLevel.Verbose, { module : this.routerName });
			callback( wsClient, message );
		}
	}
	else {
		this.logger.addEvent( 'emitting message', LogLevel.Verbose, { module : this.routerName });
		this.eventEmitter.emit( messageName, wsClient, message );
	}
}

/**
 * helper function to send messages.
 */
SocketRouter.prototype.sendMessage = function( target, message, responseCallback  ) {

	this.respondToMessage( target, message, null, responseCallback );
}

/**
 * helper function to send messages.
 */
SocketRouter.prototype.respondToMessage = function( target, message, inResponseTo, responseCallback  ) {

	if( this.commonToken ) {
		Object.assign( message, this.commonToken );
	}
	
    if( this.messageTagKey && this.messageTagValue )  {
        message[this.messageTagKey] = this.messageTagValue;
    }
	
	if( responseCallback ) {
		let reqID = this.routerName + this.requestQueueID++ ;

		message['sender-token']  = reqID;
		this.requestQueue[reqID] = responseCallback;
	}

	if( inResponseTo ) {
		if( inResponseTo['sender-token']  ) {
			message['return-token'] = inResponseTo['sender-token'];
		}
	}

	message['sender'] = this.routerName;

	this.logger.addEvent( 'sending message', LogLevel.Verbose, { module : this.routerName, message : JSON.stringify(message)  });
	target.send( JSON.stringify(message) );
}

module.exports = SocketRouter;
module.exports.cleanMessage = cleanMessage;
