const CommonPorts = {
    MESH_MASTER_HTTP          : 8882,
    INTER_DEVICE_WS           : 8883,		// web socket port to use if needed. Boat controller always has one
    DEVICE_SIGNALK            : 8884,		// port for signal K service
	DEVICE_LOCAL_WS           : 8885,		// web socket port to use if needed. Boat controller always has one
	TEMP_HTTP                 : 8886,		// used for temp projects
    INPUT_DEVICE_TARGET_WS    : 8887,		// allows for remote control of a device

    CAMERA_STREAM_FINDER_WS   : 8999,
    CAMERA_STREAM_FINDER_HTTP : 9990,      // camera discovery service
    CAMERA_STREAM_1           : 9991,      // first camera allocated
    CAMERA_STREAM_2           : 9992,      // ... etc
    CAMERA_STREAM_3           : 9993,
    CAMERA_STREAM_4           : 9994,
    CAMERA_STREAM_5           : 9995,
    CAMERA_STREAM_6           : 9996,
    CAMERA_STREAM_7           : 9997,
    CAMERA_STREAM_8           : 9998,
    CAMERA_STREAM_9           : 9999
};

const SocketMessages = {
    SOCKET_CONNECTION    : 'connection',        // socket opened
    SOCKET_CONNECTIONACK : 'connectionAck',     // socket opened (not always sent, depends on context)
    SOCKET_ERROR         : 'error',             // socket had error
    SOCKET_CLOSED        : 'close',             // socket closed
    SOCKET_MESSAGE       : 'message',           // ONLY used with non-router driven helpers

    // onvif cameras
    //
    START_DISCOVERY       : 'startDiscovery',         // start a new discovery pass
    LIST_CAMERAS          : 'listCameras',            // get a list of all the cameras
    LIST_CAMERAS_ACK      : 'listCamerasAck',         // ACK for camera list - has the list
    GET_CAMERA_STREAM     : 'getCameraStream',
    GET_CAMERA_STREAM_ACK : 'getCameraStreamAck'
};

module.exports = {
    CommonPorts    : CommonPorts,
    SocketMessages : SocketMessages
};