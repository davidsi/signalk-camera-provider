'use strict';

const WebSocket        = require( 'ws' ),                         // require( "websocket.io" ),
      Util             = require( 'util' ),
      Emitter          = require( 'events' ).EventEmitter,			// http://www.tutorialsteacher.com/nodejs/nodejs-eventemitter

      CommonPorts      = require( './net-const' ).CommonPorts,
      SocketMessages   = require( './net-const' ).SocketMessages,
      Logger           = require( '../general/logger'),
      HttpServerHelper = require( './http-server-helper' ),

	  LogLevel        = Logger.LogLevel,
      loggerModule    = 'socket-server-helper';

/**
 * socket server - helps the services
 *
 * see https://github.com/websockets/ws/blob/HEAD/doc/ws.md
 * see https://www.npmjs.com/package/ws#server-example for interesting examples of broadcast, find ip address, sending binary data, errro handling, etc
 * 
 *  @param {*} opts options for the mesh master
 * 
 * | property name    | meaning                                                                                      |
 * | :--------------- | :------------------------------------------------------------------------------------------- |
 * | logger           | injected logger to save events                                                               |     
 * | httpServer       | already created http server to use                                                           |
 * | createHttpServer | run ws via http. If wss is required this is used automatically if httpServer is not supplied |
 * | ssl              | secure wss required                                                                          |
 * | ipAddress        | address to expose the server                                                                 |
 * | name             | name of the server, only used for logging                                                    |
 * | port             | port to use for the server                                                                   |
 * | commonToken      | common token for the router                                                                  |
 * | noRouter         | do not use the router, simply emit the message                                               |
 *
 * @constructor
 * @class
 * 
 * @property SocketServerHelper.logger    - the event logger
 * @property SocketServerHelper.ipAddress - the ipaddress of the socket server
 * @property SocketServerHelper.port      - the port of the socket server
 * @property SocketServerHelper.router    - the server message router
 * @property SocketServerHelper.wsServer  - the server ws handle
 */
function SocketServerHelper( opts ) {

    if( opts === undefined ) {
        opts          = Object.create( null );
        opts.noRouter = false;
    }
    else if( opts.noRouter === undefined ) {
        opts.noRouter = false;
    }

    if( !opts.logger ) {
        opts.logger = Logger.globalLogger;
    }

    if( !opts.name ) {
        opts.name = 'socket-server';
    }

    if( opts.ssl !== undefined && opts.ssl ) {
        if( !opts.httpServer ) {
            opts.httpServer = new HttpServerHelper( { port : 8998 } );
        }
    }

    if( opts.httpServer ) {
        // combine ws: and http: onto the same port.
        //      can NOT do with npm('websocket'), needs to be websocket.io
        //      https://serverfault.com/questions/575467/running-a-websocket-server-and-a-http-server-on-the-same-server
        //      https://www.npmjs.com/package/websocket.io
        //
		this.logger.addEvent( 'websocket.io currently not supported. If supported, need to modify WebSocket.list() below as well', LogLevel.Exception, { module : loggerModule } );
    }

    this.logger    = opts.logger;
    this.ipAddress = opts.ipAddress ?opts.ipAddress :null;
    this.port      = opts.port      ?opts.port      :null;
    this.wsServer  = null;
    this.name      = opts.name;

    if( opts.noRouter ) {
        this.router = null;
    }
    else {
        const SocketRouter    = require( "./socket-router" );

        this.router             = new SocketRouter( {emitter : this, name : opts.name, logger : opts.logger } );
        this.router.commonToken = opts.commonToken;
    }
}

/**************************************************************************************************
 *  start the server
 ***************************************************************************************************/
SocketServerHelper.prototype.start = function() {

    // if( this.options.httpServer ) {
    //     this.startServerHelper();
    // }
    // else {
        if( this.port === undefined ) {
            this.port = CommonPorts.INTER_DEVICE_WS;
        }

        if( this.ipAddress ) {

			this.startServerHelper( this.ipAddress );
        }
        else {
            const ipAddressFinder = require( './server-ip-finder' ).ipAddressFinder;

            ipAddressFinder( this, this.port );
        }
    // }
}

/**************************************************************************************************
 *  helper function to start the server
 ***************************************************************************************************/
SocketServerHelper.prototype.startServerHelper = function( ipAddress ) {

    if( this.httpServer ) {
        this.socketServer = WebSocket.attach( this.httpServer.server );

		this.logger.addEvent( 'starting socket server via http', LogLevel.Log, { module : loggerModule, name : this.name } );
        
    }
    else {
        // this.socketServer = WebSocket.listen( this.port ); // new WebSocket.Server( { port : this.port } );

        this.ipAddress = ipAddress;
        this.wsServer  = new WebSocket.Server( { host : this.ipAddress, port : this.port} );

		this.logger.addEvent( 'starting socket server via websocket', LogLevel.Log, { module : loggerModule, address : this.ipAddress, port : this.port, name : this.name } );
    }

    this.wsServer.on( SocketMessages.SOCKET_CONNECTION, function connection( wsClient, req ) {

        // tell any users of the socket server about the incoming client
        //
        this.emit( SocketMessages.SOCKET_CONNECTION, wsClient, req.connection.remoteAddress, req );

        // message came in
        //
    	wsClient.on( 'message', function( message ) {

            if( this.router ) {
                this.router.route( wsClient, message );
            }
            else {
                this.emit( SocketMessages.SOCKET_MESSAGE, wsClient, message );
            }

    	}.bind( this ));

        // client closed
        //
        wsClient.on( SocketMessages.SOCKET_CLOSED, function() {
            this.logger.addEvent( 'socket client closed', LogLevel.Error, { module : loggerModule, name : this.name } );
            this.emit( SocketMessages.SOCKET_CLOSED, wsClient );

    	}.bind( this ));

        // error occured
        //
    	wsClient.on( 'error' , function() {

            this.logger.addEvent( 'socket server error', LogLevel.Error, { module : loggerModule, name : this.name } );
    	})
    }.bind( this ));
}

/***************************************************************************************************
 * helper functions to send and return messages.
 ***************************************************************************************************
 * send message
 */
SocketServerHelper.prototype.sendMessage = function( target, request, responseCallback ) {

	this.respondToMessage( target, request, null, responseCallback  );
};

/***************************************************************************************************
 * return  message
 */
SocketServerHelper.prototype.respondToMessage = function( target, request, inResponseTo, responseCallback ) {
    
    if( this.router ) {    
        this.router.respondToMessage( target, request, inResponseTo, responseCallback  );
    }
    else {
        target.send( JSON.stringify( request) );
    }
};

Util.inherits( SocketServerHelper, Emitter );
module.exports = SocketServerHelper;