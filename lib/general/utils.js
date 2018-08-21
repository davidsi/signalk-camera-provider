'use strict';

const debug  = require( 'debug-levels' )( 'utils' ),
      path   = require( 'path' ),
      xml2js = require('xml2js'),
      fs     = require( 'fs' );

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// object management functions
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * get raw json out of a file and attach to an object. If it does not exist, create an empty object
 * 
 * @public
 */
function jsonObjectFromFile( fileName ) {

    let retVal  = Object.create( null );
    let rawJson = '';

    try {
        if( fs.existsSync( fileName ) ) {

            rawJson = fs.readFileSync( fileName );
            retVal = JSON.parse( rawJson );
        }
    }
    catch( err ) {
        debug.warn( 'error loading json file: ' + err + ' from file ' + rawJson );
    }
    finally {
        return retVal;
    }
}

/**
 * clone an object
 * 
 * @public
 */
function clone( obj, allowNonCopyableProperties ) {

    let copy;

    // Handle the 3 simple types, and null or undefined
    //
    if( !obj || "object" != typeof obj )  {
        return obj;
    }

    // Handle Date
    //
    if( obj instanceof Date ) {

        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    //
    if( obj instanceof Array ) {

        copy = [];
        
        for( let idx = 0, len = obj.length; idx < len; idx++ ) {

            let prop = clone(obj[idx]);
            if( prop ) {
                copy.push( prop );
            }
        }
        return copy;
    }

    // Handle Object
    //
    if( obj instanceof Object ) {

        copy = Object.create( null );

        for( let attr in obj ) {
            if( obj.hasOwnProperty(attr) ) {

                let prop = clone( obj[attr], allowNonCopyableProperties );

                if( prop ) {
                    copy[attr] = prop;
                }
            }
        }
        return copy;
    }

    if( allowNonCopyableProperties ) {
        return undefined;
    }
    else {
        throw new Error("Unable to copy obj! Its type isn't supported.");
    }
}

/**
 * copy an object and keep only the named properties
 * 
 * @public
 */
function cleanObjectInclusive( object, propertiesToKeep ) {

    let cleanObject = Object.assign( Object.create( null ), object );

    for( let propertyName in object ) {
        if( propertiesToKeep.indexOf( propertyName) < 0 ) {
            delete cleanObject[propertyName];
        }
    }

    return cleanObject;
}

/**
 * copy an object and strip out unwanted properties
 * 
 * @public
 */
function cleanObjectExclusive( object, propertiesToKill ) {
    
    let cleanObject = Object.assign( Object.create( null ), object );

    for( let propertyName in object ) {
        if( propertiesToKill.indexOf( propertyName) >= 0 ) {
            delete cleanObject[propertyName];
        }
    }

    return cleanObject;
}

/**
 * fall thru an objects properties making sure we can find a deep property and return it
 * 
 * @param {any} the object to parse
 * @param {any} array of keys
 * 
 * @public
 */
function findDeepProperty( theObj, theKeys ) {
    
    if( !theObj ) {
        return null;
    }
    let idx = 0;

    while(  idx < theKeys.length ) {

        if( !theObj[theKeys[idx]] ) {
            return null;
        }
        theObj = theObj[theKeys[idx]];
        idx++;
    }
    return theObj;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/**
 * take a buffer of data and convert a section into an unsigned integer
 * 
 * @public
 */
 function buffToInt( buffer, start, count ) {
	let result = 0;

	for( let idx = 0; idx<count; idx++ ) {
		let chr = buffer[start++];
		result = result * 10 + chr - 48;	// 48 = '0'
	}
	return result;
}

/*************************************************************************************************************
 * make all required subfolders exist
 */
function ensureDirectoryStructure( dirStructure, level, currentPath ) {

	currentPath = currentPath + '/' + dirStructure[level];

	if( level < dirStructure.length-1 ) {

		let fullPath = process.cwd() + '/' + currentPath;

		try {
			fs.accessSync( fullPath, fs.constants.W_OK );
		}
		catch( err ) {
			fs.mkdirSync( fullPath, 0o777 );

			// now make sure we succeeded
			//
			try {
				fs.accessSync( fullPath, fs.constants.W_OK );
			}
			catch( err ) {
				return null;
			}
		}
		return ensureDirectoryStructure( dirStructure, level+1, currentPath );
	}
	else {
		return currentPath;
	}
}

/**
 * parse arguments
 *
 * requirements is a dictionary.
 * 		key : parameter name (without --)
 *      value : object
 *				args     : max number of args to the argument
 *					       i.e. --filename 4  means up to 4 filenames
 *				required : true/false if the arg is required
 */
function parseArgs( requirements ) {
    
    const theArgs  = process.argv.slice(2);
    let   retVal   = Object.create( null );
    let   required = [];

    // check which arguments are required
    //
    if( requirements !== undefined ) {
        for( let req in requirements ) {
            let prop = requirements[req];

            if( prop['required'] !== undefined && prop['required'] ) {
                required.push( req );
            }

            if( prop['defaultValue'] !== undefined  ) {
                retVal[req] = prop['defaultValue'];
            }
        }
    }

    if( theArgs !== undefined ) {

        const count = theArgs.length;
        let   idx   = 0;

        while( idx < count ) {
            let arg    = theArgs[idx++];
            let param  = null;
            let reqIdx = -1;

            // see if this is a "regular" argument
            //
            if( arg.length < 3 ||  arg.startsWith( "--" ) == false ) {
                reqIdx      = required.indexOf( arg );
                retVal[arg] = null;
            }
            else {

                // it's a --X argument
                //
                param  = arg.substring( 2, arg.length );
                reqIdx = required.indexOf( param );

                debug.warn( 'param = ' + param );

                // see if we know anything about it
                //
                let numParams = ( requirements[param] && requirements[param]['args'] ) ?requirements[param]['args'] :0;

                if( numParams === undefined ) {

                    retVal[param] = null;
                }
                else if( numParams === 0 ) {
                    retVal[param] = true;
                }
                else if( numParams == 1 ){
                    retVal[param] = theArgs[idx++];
                }
                else {
                    let params = [];

                    idx ++ ;
                    while( numParams-- && idx < count ) {
                        if( theArgs[idx].length > 2 &&  theArgs[idx].startsWith( "--" )  ) {
                            break;
                        }
                        else {
                            params.push( theArgs[idx++] );
                        }
                    }
                    retVal[param] = params;
                }
            }

            // if this is a required argument, note the fact
            //
            if( reqIdx > -1 ) {

                required.splice( reqIdx, 1 );
            }
        }
    }

    if( required.length ) {
        retVal['__required_missing__'] = required;
    }

    return retVal;
}
    
/**
 * test if a filename corresponds to a javascript file
 * @param {*} filename 
 */
function isJSFile( filename ) {

    return path.extname( filename.toLowerCase() ) === '.js';
}

/**
 * test if a filename corresponds to an objective-cfile
 * @param {*} filename 
 */
function isObjCFile( filename ) {

    let ext    = path.extname( filename.toLowerCase() );
    let isFile = ext.length > 0 && (ext === '.m') || (ext === '.h') ;
    return isFile;
}

/**
 * walk a directory structure, returning all the files
 * 
 * if filter is non-null, the array will be filtered on it (see isJSFile for an example) 
 * 
 * @param {*} root 
 * @param {*} filter 
 * @param {*} callback 
 */
function directoryWalk( root, fileFilter, callback ) {

    var results = [];

    fs.readdir( root, function( err, list ) {

        if( err ) {
            return callback( err );
        }
        let i = 0;

        (function next() {
            let file = list[i++];

            if( !file ) { 
                return callback( null, results );
            }

            if( file.charAt(0) === '.' ) {
                next();
                return;
            }

            file = root + '/' + file;
            fs.stat( file, function(err, stat) {

                if (stat && stat.isDirectory()) {
                    directoryWalk( file, fileFilter, function( err, res ) {
                        if( fileFilter ) {
                            results = results.concat( res.filter( fileFilter) );
                        }
                        else {
                            results = results.concat( res );
                        }
    
                        next();
                    });
                } 
                else {
                    results.push( file );
                    next();
                }
            });
        })();
    });
}
    
/**
 * Parse SOAP object to pretty JS-object
 * @param {object} xml
 * @returns {object}
 */
function parseSOAP( xml ) {
    
	const numberRE    = /^-?([1-9]\d*|0)(\.\d*)?$/;
	const dateRE      = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z$/;
	const prefixMatch = /(?!xmlns)^.*:/;

	if (Array.isArray(xml)) {
		if (xml.length > 1) {
			return xml.map(linerase);
        } 
        else {
			xml = xml[0];
		}
    }
    
	if( typeof xml === 'object' ) {

		var obj = {};
		Object.keys(xml).forEach(function(key) {
			if (key === '$') {
				obj.$ = linerase(xml.$);
            } 
            else {
				obj[key] = linerase(xml[key]);
			}
		});
		return obj;
    } 
    else {
		if (xml === 'true') { 
            return true; 
        }

		if (xml === 'false') { 
            return false; 
        }

		if (numberRE.test(xml)) { 
            return parseFloat(xml); 
        }

		if (dateRE.test(xml)) { 
            return new Date(xml); 
        }

		return xml;
	}
};

module.exports = {
    parseSOAP                : parseSOAP,
    findDeepProperty         : findDeepProperty,
    jsonObjectFromFile       : jsonObjectFromFile,
    buffToInt                : buffToInt,
    clone                    : clone,
    cleanObjectInclusive     : cleanObjectInclusive,
    cleanObjectExclusive     : cleanObjectExclusive,
    directoryWalk            : directoryWalk,
    isJSFile                 : isJSFile,
    isObjCFile               : isObjCFile,
    parseArgs                : parseArgs,
    ensureDirectoryStructure : ensureDirectoryStructure
};
