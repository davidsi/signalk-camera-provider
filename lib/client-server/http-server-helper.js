const Emitter           = require( 'events' ).EventEmitter,			// http://www.tutorialsteacher.com/nodejs/nodejs-eventemitter
      Util              = require( 'util' ),
      Http              = require( "http" ),
	  Url               = require( "url" ),
	  Formidable        = require( 'formidable' ),
	  NetUtils          = require( "./net-utils" ),
	  Utils             = require( '../general/utils' ),
	  HomePageResponder = require( './home-page' ),
	  querystring       = require( 'querystring' ),
	  fs                = require( 'fs' ),
	  LogLevel          = require( '../general/logger').LogLevel,
      CommonPorts       = NetUtils.CommonPorts,
      ipAddressFinder   = require( './server-ip-finder' ).ipAddressFinder,

	  loggerModule      = 'httpServer';

/**
 * Helper class for an http server. The class is a wrapper over the http module and provides the router and (if not overwritten) a router, logger and file loader
 * 
 * @constructor
 * @class
 * 
 * @property HttpServerHelper.server  		instance of npm http class
 * @property HttpServerHelper.ipAddress		ipaddress of the server
 * @property HttpServerHelper.port     		port of the server
 * @property HttpServerHelper.uploadDir 	where files are uploaded to
 * @property HttpServerHelper.logger		injected logger module
 * 
 * @param {*} opts options for the http server
 * 
 * | property name   | meaning                        |
 * | :-------------- | :----------------------------- |
 * | port            | port to open the server on     |
 * | uploadDirectory | where to upload files to       |
 * | logger          | injected logger to save events |
 */
function HttpServerHelper( opts ) {

	if( opts === undefined ) {
		opts = Object.create( null );
	}
	this.server    = null;
	this.ipAddress = null;
	this.port      = opts.port ?opts.port :CommonPorts.MESH_MASTER_HTTP;
	this.uploadDir = opts.uploadDirectory || './upload';
	this.logger    = opts.logger;
}

/**
 * helper function to start the server
 * @param {*} ipAddr ip address the server is on
 */
HttpServerHelper.prototype.startServerHelper = function( ipAddr ) {

	if( ipAddr ) {
		this.ipAddress = ipAddr;
	}

	if( this.logger ) {
		this.logger.addEvent( "starting http server", LogLevel.Log, { module : loggerModule, ipAddress : this.ipAddress, port : this.port } );
	}

	this.server.listen( this.port, this.ipAddress );
};

/**
 * private function to move a file from the temp cache
 * 
 * @param {*} source temp cache location
 * @param {*} name   destination
 */
HttpServerHelper.prototype._moveFile = function( source, name ) {

	let directoryStructure = name.split( '-$-' );
	directoryStructure.unshift( this.uploadDir );

	let newPath = Utils.ensureDirectoryStructure( directoryStructure, 0, '.' );

	if( newPath == null ) {
		if( this.logger ) {
			this.logger( "error moving file", { module : loggerModule }, ['could not create destination location'] );
		}
	}

	try {
		let dest = newPath;
		fs.renameSync( source, dest );
		return true;
	}
	catch( err ) {
		if( this.logger ) {
			this.logger( "error moving file", { module : loggerModule }, [err] );
		}
		return false;
	}
}

/**
 * start method for the server
 */
HttpServerHelper.prototype.start = function() {

	const that = this;
	this.server = Http.createServer( function ( request, response ) {

		let pathname  = Url.parse( request.url ).pathname;
		let pathKnown = this.listenerCount( pathname );  

		if( this.logger ) {
			this.logger.addEvent( 'url request', LogLevel.Log, { module : loggerModule, pathName : pathname, query : JSON.stringify( querystring.parse( request.url.query ) ) });
		}

		let rawParams = Url.parse( request.url ).query;
		let params    = Object.create( null );

		if( rawParams  ) {

			let paramsArray = rawParams.split( "&" );

			paramsArray.forEach( function( kvp ) {

				let kvpArray = kvp.split( "=" );

				if( kvpArray.length == 1 ) {
					params[kvpArray[0]] = null;
				}
				else if( kvpArray.length == 2 ) {
					let value = kvpArray[1];
					if( isNaN(value) === false ) {
						value = parseInt(value);
					}
					params[kvpArray[0]] = value;
				}
			});
		};
		
		if( pathKnown ) {

			this.emit( pathname, response, request, params );
		}
		else if( pathname == '/' ) {
			let homePage = new HomePageResponder();
			homePage.httpResponder( response, request, params );
		}

		else if( pathname == '/upload' && request.method == 'POST' ) {

			// upload a file from the client
			//
			if( !params.name ) {
				response.writeHead( 405, {"Content-Type": "application/json", });
				response.write( JSON.stringify( { success : false, error : 'no filename supplied' } ) );
				response.end();		
			}
			else {
				let form = new Formidable.IncomingForm();
				form.parse( request, function( err, fields, files ) {
					let responseCode  = 405;
					let responseText  = '';
					let debugText     = '';

					if( err ) {
						responseText = JSON.stringify( { success : false, error : 'could not parse filename and upload' } );
						debugText    = responseText;
					}
					else if( that.moveFile( files.file.path, params.name ) ) {
						responseCode = 200;
						responseText = JSON.stringify( { success : true } );
						debugText    = 'successfully recieved: ' + files.file.path + ' / ' + params.name;
					}
					else {
						responseText = JSON.stringify( { success : false, error : 'could not save file locally' } );
						debugText    = 'could not save file locally: ' + files.file.path + ' / ' + params.name;
					}
				
					response.writeHead( responseCode, {"Content-Type": "application/json", });
					response.write( responseText );
					response.end();		
				});
			}		
		}
		else {
			// download a file to the client
			//
			if( pathname.startsWith( '/' )  ) {
				pathname = '.' + pathname;
			}

			fs.readFile( pathname, 'utf-8', function( err, data ) {

				if( err ) {
					if( this.logger ) {
						this.logger.addEvent( 'missing file on server', LogLevel.Warning, { module : loggerModule } [pathname] );
					}
			
				    response.writeHead( 404, {"Content-Type": "text/html"} );
			        response.write( "404 Not found" );
			        response.end();
				}
				else {
					let mimeType = NetUtils.getContentType( pathname );

				    response.writeHead( 200, {"Content-Type": mimeType } );
			        response.write( data );
			        response.end();
				}
			});
	    }
	}.bind( this ));

	ipAddressFinder( this, this.port );
};

Util.inherits( HttpServerHelper, Emitter );
module.exports = HttpServerHelper;
