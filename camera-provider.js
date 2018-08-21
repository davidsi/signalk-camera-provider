const SocketClientHelper = require( './lib/client-server/socket-client-helper' );
const SocketMessages     = require( './lib/client-server/net-const' ).SocketMessages;
const util               = require( 'util' );

/**
 * the camera provider finds the cameras.  It can also send PTZ commands if required but this usually will be done by a dedicated
 * client.  It does NOT provide a media stream but rather the handle to it.
 * 
 * @param {*} plugin the signalk server plugin
 */
function CameraProvider( plugin ) {

    this.plugin             = plugin;
    this.cameras            = Object.create( null );
    this.brb                = Object.create( null );
    this.joyFi              = Object.create( null );
    this.error              = null;
    this.socketClientHelper = new SocketClientHelper( { 
        port      : plugin.options.port, 
        ipAddress : plugin.options.ipAddress, 
        name      : 'ip camera socket server', 
        noRouter  : false } 
    );

    // test examples, no discovery yet
    //
    this.brb["media-mac.local"] = { name      : "iTunes playlist" };
    this.joyFi["pilothouse"]    = { ipAddress : 'pilothouse.local' };

    this.socketClientHelper.on( SocketMessages.SOCKET_CONNECTION, function() {
        this._onSocketOpen();
    }.bind(this));
}

/**
 * get the stream port
 * 
 * @param {*} cameraName 
 * @param {*} callback 
 */
CameraProvider.prototype.getStreamAddress = function( cameraName, callback ) {

    console.log( 'got a port request for camera ' + cameraName );
        
    this.socketClientHelper.sendMessage( { name : SocketMessages.GET_CAMERA_STREAM, camera : cameraName }, function( wsClient, response ) {

        console.log( 'got a port request ACK  for camera ' + cameraName + ' : ' + JSON.stringify(response) );
        
        callback( response );
    });
}

/**
 * socket opened, do discovery
 */
CameraProvider.prototype._onSocketOpen = function() {

    console.log( 'recieved socket opened message' );

    this.socketClientHelper.sendMessage( { name : SocketMessages.LIST_CAMERAS }, function( wsClient, response ) {

        if( response.success === false ) {
            this.error = 'discovery error ' + response.error.toString();
            if( response.error ) {
                this.error += ': ' + response.error.toString();
            }
            console.log( 'discovery complete with error: ' + JSON.stringify( response ) );
            return;
        }
        console.log( 'discovery complete: ' + JSON.stringify( response ) );

        if( !response.result ) {
            this.error = 'no response from discovery';
            return;
        }

        this.cameras = response.result;

        let values = [];
        let index  = 0;

        console.log( 'camera provider supplying camera list: ' + JSON.stringify( this.cameras) );
        Object.keys( this.cameras ).forEach( (c) => { 
            values.push( { path : 'environment.cameras.'+index+'.ipAddress', value : c } );
            values.push( { path : 'environment.cameras.'+index+'.name',      value : this.cameras[c].name } );
            values.push( { path : 'environment.cameras.'+index+'.streams.0', value : 'rtsp' } );

            index ++;
        });

        console.log( 'camera provider supplying joyFi list: ' + JSON.stringify( this.joyFi) );
        index = 0;
        Object.keys( this.joyFi).forEach((j) => { 
            values.push( { path : 'environment.inside.joyfi-receivers.'+index+'.name',      value : j } );
            values.push( { path : 'environment.inside.joyfi-receivers.'+index+'.ipAddress', value : this.joyFi[j] } );

            index ++;
        });

        console.log( 'camera provider supplying brb list: ' + JSON.stringify( this.brb) );
        index = 0;
        Object.keys(this.brb).forEach((b) => { 
            values.push( { path : 'environment.inside.big-red-button.'+index+'.name',      value : b } );
            values.push( { path : 'environment.inside.big-red-button.'+index+'.ipAddress', value : this.brb[b] } );

            index ++;
        });
            
        let update = { "updates" : [{ "timestamp": new Date().toISOString(), "values": values}] };
        this.plugin.serverApp.handleMessage( this.plugin.id, update )

    }.bind(this));
}

/**
 * provide status of the cameras
 */
CameraProvider.prototype.status = function() {

    if( this.error ) {
        return this.error;
    }

    if( this.connected === false ) {
        return 'not connected to camera helper';
    }

    if( !this.socketClientHelper.wsClient ) {
        return 'error: no connection to camera helper';
    }

    return 'cameras: ' + JSON.stringify( this.cameras );
}

/**
 * close the ws connection
 */
CameraProvider.prototype.stop = function() {

}

/**
 * look for any ip cameras on the local net
 */
CameraProvider.prototype.start = function() {

    if( this.socketClientHelper.connected  ) {

        this.stop();
    }

    this.socketClientHelper.ipAddress = this.plugin.options.ipAddress;
    this.socketClientHelper.port      = this.plugin.options.port;

    this.socketClientHelper.start();
}

module.exports.CameraProvider = CameraProvider;