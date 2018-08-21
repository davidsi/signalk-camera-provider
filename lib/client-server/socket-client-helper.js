'use strict';

const WebSocket      = require( "ws" ),
      NetUtils       = require( "./net-utils" ),
      CommonPorts    = require( './net-const' ).CommonPorts,
      SocketMessages = require( './net-const' ).SocketMessages,
      SocketRouter   = require( "./socket-router" ),
      Emitter        = require('events').EventEmitter,			// http://www.tutorialsteacher.com/nodejs/nodejs-eventemitter
      Util           = require('util'),
      Logger         = require( '../general/logger' ),

	  globalLogger         = Logger.globalLogger,
	  LogLevel             = Logger.LogLevel,
	  loggerModule         = 'socket-client';

/**
 * websocket client for intra-device communication
 * 
 * @constructor
 * @class
 * 
 * @param {*} opts - options for the class
 * 
 * | property name | meaning                                     |
 * | :------------ | :------------------------------------------ |
 * | name          | name of the device owning the socket client |
 * | server        | ip address of the socket client             |
 * | port          | port of the socket client                   |
 * | commonToken   | common token                                |
 * | logger        | the logger                                  |
 *  
 * @property SocketClientHelper.name            name of the device the socket runs on
 * @property SocketClientHelper.wsClient        socket handle
 * @property SocketClientHelper.ipAddress       the ip address to open the socket client on
 * @property SocketClientHelper.port            the port to open the socket client on
 * @property SocketClientHelper.router          the router to handle the messaging
 * @property SocketClientHelper.connected       whether the socket is alive
 * @property SocketClientHelper.logger          the logger
 */
function SocketClientHelper( opts  ) {

    if( opts === undefined ) {
        opts = Object.create( null );
    }

    if( !opts.logger ) {
        opts.logger = Logger.globalLogger;
    }

    if( !opts.name ) {
        opts.name = 'socket-client';
    }

	this.wsClient           = null;
    this.connected          = false;
	this.name               = opts.name;
	this.ipAddress          = opts.server;
	this.port               = opts.port;
    this.logger             = opts.logger;
    this.router             = new SocketRouter( {emitter : this, name : this.name, logger : opts.logger } );
    this.router.commonToken = opts.commonToken;
}

/**
 * the service wants to open the websocket
 */
SocketClientHelper.prototype.start = function() {

    console.log( "starting socket client" );

	if( this.port === undefined ) {
		this.port = CommonPorts.INTER_DEVICE_WS;
	}

    this.wsClient = new WebSocket( "ws://" + this.ipAddress + ":" + this.port );

    // client is opening up!
    //
    this.wsClient.onopen = function() {

        console.log( "socket client opened, msg from wsClient" );
    
        this.logger.addEvent( 'websocket client opened', LogLevel.Log, { module : loggerModule, device : this.name } );

        this.connected = true;
        this.emit( SocketMessages.SOCKET_CONNECTION );
    }.bind(this);

    // we got a message
    //
    this.wsClient.onmessage = function( eventMessage ) {

        console.log( "socket client got message " + eventMessage );
    
        this.router.route( this, eventMessage.data );
    }.bind(this);

    // client is closing!
    //
    this.wsClient.onclose = function() {

        console.log( "socket client closed" );
    
        this.connected = false;
    }.bind(this);

    // got some kind of connection error
    //
    this.wsClient.onerror = function( errorMessage ) {
        console.log( "socket client got error #1 " + errorMessage  );
    
        this.emit( SocketMessages.SOCKET_ERROR, errorMessage );
    }.bind(this);

    // make sure there is at least ONE listener to this message
    //
    this.on( SocketMessages.SOCKET_ERROR, function( errorMessage ) {

        console.log( "socket client got error #2" + JSON.stringify(errorMessage) );
        // let it fall on the floor for now
        //
        this.logger.addEvent( 'websocket client error', LogLevel.Error, { module : loggerModule, device : this.name }, [errorMessage] );
    }.bind(this));
}

/**
 * stop the socket
 */
SocketClientHelper.prototype.stop = function() {

    if( this.connected && this.wsClient ) {
        this.wsClient.terminate();
    }
}

/**
 * helper function to send messages.
 * 
 * @param {*} request           the request to send. The message must have a 'name' key if this is a routed socket
 * @param {*} responseCallback  response callback if the server is to send an async response
 */
SocketClientHelper.prototype.sendMessage = function( request, responseCallback ) {

    this.respondToMessage( request, null, responseCallback );
};

/**
 * helper function to return messages.
 * 
 * @param {*} response          the message to send in response to the incoming one. It must have the fields descibed below
 * @param {*} inResponseTo      the incoming message this is a response to
 * @param {*} responseCallback  response callback if the server is to send an async response to, yes, this response
 */
SocketClientHelper.prototype.respondToMessage = function( response, inResponseTo, responseCallback ) {
    
    this.router.respondToMessage( this.wsClient, response, inResponseTo, responseCallback );
};

Util.inherits( SocketClientHelper, Emitter );
module.exports = SocketClientHelper;