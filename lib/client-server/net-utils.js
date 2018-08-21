'use strict';

const os           = require( 'os' ),
      exec         = require( 'child_process' ).exec,
	  tcpp         = require( 'tcp-ping' ),
	  CommonPorts  = require( './net-const' ),
	  Logger       = require( '../general/logger'),
	  logger       = Logger.globalLogger,
	  LogLevel     = Logger.LogLevel,

	  loggerModule = 'net-utils';

/**
 * get active servers on the intranet
 */
function getActiveNodes( ipHeader, port, callback ) {

	if( port === undefined || port === null ) {
		port = CommonPorts.MESH_MASTER_HTTP;
	}

	let liveServers  = new Array();
	let count        = 0;
	let checkConnect = function( thisIP, callback ) {

		tcpp.probe( thisIP, port, function( err, available ) {

			if( available ) {
				liveServers.push( thisIP );
	    	}
			count++;

			if( count == 254 ) {
				logger.addEvent( 'getActiveNotes', LogLevel.Verbose, { module : loggerModule, ipAddress : ipHeader, port : port, servers : JSON.stringify(liveServers) } );
				callback( liveServers );
			}
		
		});
	};

	for( let ip = 1; ip < 255; ip ++ ) {

		let thisIP = ipHeader + "." + ip;
		checkConnect( thisIP, callback );
	}
}

/**
 * returns a dictionary of interfaces and ipaddress.
 */
function getIpAddresses() {

	let ifaces     = os.networkInterfaces();
	let interfaces = Object.create( null );

	Object.keys( ifaces ).forEach( function( ifname ) {

		let alias = 0;

		ifaces[ifname].forEach( function( iface ) {
			if( 'IPv4' !== iface.family || iface.internal !== false ) {
				// skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
				//
				return;
			}

			if( alias >= 1 ) {
				// this single interface has multiple ipv4 addresses
				//
				interfaces[ifname + ':' + alias] = iface.address;
				logger.addEvent( 'iface has multiple ipv4 addressee', LogLevel.Verbose, { module : loggerModule, ifname : ifname + ':' + alias, address : iface.address } );
			}
			else {
				// this interface has only one ipv4 adress
				//
				interfaces[ifname] = iface.address;
				logger.addEvent( 'iface has one ipv4 addressee', LogLevel.Verbose, { module : loggerModule, ifname : iface.address } );
			}
			++alias;
		});
	});

	logger.addEvent( 'interfaces', LogLevel.Verbose, { module : loggerModule, interfaces : JSON.stringify( interfaces ) } );

	return interfaces;
}

/**
 * spawn a child process to find the wifi ssid
 * this will only work on a system with the nmcli tool
 */
function findWifiSSIDSync( ) {

	let cmd     = "nmcli -t -f active,ssid dev wifi| grep yes: | colrm 1 4";
	let results = require('sync-exec')( cmd );

	if (!results.status) {
		return results.stdout.trim();
	}
	else {
		return results;
	}

	throw {
		stderr: results.stderr
	};
}

/**
 * spawn a child process to find the wifi ssid
 * this will only work on a system with the nmcli tool
 */
function findWifiSSID( callback ) {

	let cmd  = "nmcli -t -f active,ssid dev wifi| grep yes: | colrm 1 4";
	let exec = require("child_process").exec;

	exec( cmd, function( error, stdout, stderr ) {
		console.log( "stdout: [" + stdout +"]" );
		console.log( "stderr: " + stderr );

		if( error !== null ) {
			console.log( "exec error: " + error );

			if( callback !== undefined ) {
				callback( undefined);
			}
			else {
				console.log( "callback = undefined" );
			}
		}
		else if( callback !== undefined ) {
			callback( stdout.trim() );
		}
	});

	// let child = exec( "nmcli -t -f active,ssid dev wifi| grep yes: | colrm 1 4", ( error, stdout, stderr ) => {

        // console.log( "stdout: [" + stdout +"]" );
        // console.log( "stderr: " + stderr );
        //
        // if( error !== null ) {
        //     console.log( "exec error: " + error );
        //
        //     if( callback !== undefined ) {
        //     	callback( undefined);
        //     }
        // }
        // else if( callback !== undefined ) {
        // 	callback( "["+stdout.trim()+"]" );
  //      }
	// });
}

/**
 * spawn a child process to find the wifi ssid
 * this will only work on a system with the nmcli tool
 */
function setWifiSSID( ssid, password, callback ) {

	let cmd  = "sudo nmcli device wifi connect '" + ssid + "' password '" + password + "' ifname wlan0";
	let exec = require("child_process").exec;

	exec( cmd, function( error, stdout, stderr ) {
		console.log( "stdout: [" + stdout +"]" );
		console.log( "stderr: " + stderr );

		if( error !== null ) {
			console.log( "exec error: " + error );

			if( callback !== undefined ) {
				callback( undefined);
			}
			else {
				console.log( "callback = undefined" );
			}
		}
		else if( callback !== undefined ) {
			callback( stdout.trim() );
		}
	});

	// let child = exec( "nmcli -t -f active,ssid dev wifi| grep yes: | colrm 1 4", ( error, stdout, stderr ) => {

        // console.log( "stdout: [" + stdout +"]" );
        // console.log( "stderr: " + stderr );
        //
        // if( error !== null ) {
        //     console.log( "exec error: " + error );
        //
        //     if( callback !== undefined ) {
        //     	callback( undefined);
        //     }
        // }
        // else if( callback !== undefined ) {
        // 	callback( "["+stdout.trim()+"]" );
  //      }
	// });
}

/******************************************************************
 *
 ******************************************************************/

function getContentType( fpath ) {

	var ext = fpath.split('.').pop().toLowerCase();

	if(ext.match(/^(html|htm)$/)) {
		return 'text/html';
	}

	else if(ext.match(/^(jpeg|jpg)$/)) {
		return 'image/jpeg';
	}

	else if(ext.match(/^(png|gif)$/)) {
		return 'image/' + ext;
	}

	else if(ext === 'css') {
		return 'text/css';
	}

	else if(ext === 'json') {
		return 'application/json';
	}

	else if(ext === 'js') {
		return 'text/javascript';
	}

	else if(ext === 'woff2') {
		return 'application/font-woff';
	}

	else if(ext === 'woff') {
		return 'application/font-woff';
	}

	else if(ext === 'ttf') {
		return 'application/font-ttf';
	}

	else if(ext === 'svg') {
		return 'image/svg+xml';
	}

	else if(ext === 'eot') {
		return 'application/vnd.ms-fontobject';
	}

	else if(ext === 'oft') {
		return 'application/x-font-otf';
	}

	else {
		return 'application/octet-stream';
	}
}

module.exports.getContentType   = getContentType;
module.exports.getIpAddresses   = getIpAddresses;
module.exports.findWifiSSID     = findWifiSSID;
module.exports.findWifiSSIDSync = findWifiSSIDSync;
module.exports.setWifiSSID      = setWifiSSID;
module.exports.getActiveNodes   = getActiveNodes;
