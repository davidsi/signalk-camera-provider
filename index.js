const util           = require( 'util' );
const CameraProvider = require( './camera-provider' ).CameraProvider;
const CommonPorts    = require( '../../lib/client-server/net-const');
const Logger         = require( './lib/general/logger' );

Logger.globalLogger  = new Logger.ConsoleLogger();

/**
 * the plugin
 */
let plugin = {
    id             : 'camera-provider',
    name           : 'ip camera access',
    description    : 'allow ip cameras to be viewed and the PTZ changed if appropriate',
    running        : false,
    options        : Object.create( null ),
    serverApp      : null,
    cameraProvider : null,

    schema         : () => ({
        title : 'schema camera provider',
        type  : 'object',

        properties: {
            port: {
                type    : 'number',
                title   : 'port for provider',
                default : CommonPorts.CAMERA_STREAM_FINDER_WS
            },
            ipAddress: {
                type    : 'string',
                title   : 'ip address of provider',
                default : 'localhost'
            },
            cameras: {
                type : 'array',
                items : [
                    {
                        default : 'admin',
                        title   : 'user',
                        type    : 'string'
                    },
                    {
                        default : 'admin',
                        title   : 'password',
                        type    : 'string'
                    },
                    {
                        default : '',
                        title   : 'ipaddress',
                        type    : 'string'
                    },
                    {
                        default : '',
                        title   : 'name',
                        type    : 'string'
                    },
                    {
                        default : false,
                        title   : 'ptz support',
                        type    : 'boolean'
                    }
                ]
            }
        }
    }),

    stop : function () {
        this.running = false;
        this.cameraProvider.stop();
        // plugin.unsubscribes.forEach(f => f())
    },

    statusMessage : function () {

        if( this.cameraProvider ) {
            return this.cameraProvider.status();
        }
        else {
            return 'no camera provider running';
        }
    },

    start : function( options ) {

        this.running = true;
        this.options = options;

        if( this.cameraProvider === null ) {
            this.cameraProvider = new CameraProvider( plugin );
        }

        this.cameraProvider.start();
    },

    signalKApiRoutes : router => {    

        // see https://github.com/SignalK/simple-gpx/blob/master/index.js for router info
        // note that WITHOUT /vessels/self, if there are not any entries, the call will fail as the
        // ... server does not recognize the node in the tree
        //
        router.get( '/vessels/self/environment/inside/big-red-button', ( req, res ) => {

            let result = Object.create( null );

            if( Object.keys( plugin.cameraProvider.brb ).length ) {
                result = plugin.cameraProvider.brb;
            }

            console.log( 'getting results for big red button: ' + JSON.stringify( result) );
            
            res.json( result );
        })

        router.get( '/vessels/self/environment/cameras', ( req, res ) => {
            
            let result = Object.create( null );

            if( Object.keys( plugin.cameraProvider.cameras ).length > 0 ) {
                result = plugin.cameraProvider.cameras;
            }

            console.log( 'getting results for cameras: ' + JSON.stringify( result) );
            
            res.json( result );
        })

        router.get( '/vessels/self/environment/inside/joyfi-receivers', ( req, res ) => {
            
            let result = Object.create( null );

            if( Object.keys( plugin.cameraProvider.joyFi ).length ) {
                result = plugin.cameraProvider.joyFi;
            }

            console.log( 'getting results for joyFi: ' + JSON.stringify( result) );
            
            res.json( result );
        })

        router.get( '/getCameraStream', (req, res ) => {

            if( req.uri == undefined || req.uri.query === undefined || req.uri.query.camera === undefined ) {
                res.json( { success : false } );
                return;
            }

            plugin.cameraProvider.getStreamAddress( req.uri.query.camera, function( response ) {
                res.json( { 
                    success   : response.success,
                    ipAddress : response.success ?response.result.ipAddress :'',
                    port      : response.success ?response.result.port      :0
                } );
            });
        })

        return router;
    }
};

/**
 * the module export - tells the signal k server about the pluggin
 * 
 * @param {*} application the signal k server
 */
module.exports = function( application ) {
    const logError = application.error || (err => {
        console.error(err)
    })

    const debug = application.debug || (msg => {
        console.log(msg)
    })

    plugin.serverApp = application;

    return plugin;
}

