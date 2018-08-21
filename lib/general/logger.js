const moment               = require( 'moment'),      // good datetime convert utils
      cleanObjectExclusive = require( './utils' ).cleanObjectExclusive,
      NoName               = '(none)';

function ConsoleLogger() {
    this.level = LogLevel.Verbose;
}

ConsoleLogger.prototype.addEvent = function( name, lvl, attributes, errors ) {

    if( lvl > this.level ) {
        return;
    }

    console.log( name + JSON.stringify( attributes ) );
}

function DummyLogger() {

}

DummyLogger.prototype.addEvent = function( name, level, attributes, errors ) {
}

let  globalLogger = new DummyLogger();

/**
 * turn off the global logger. Will turn off logging from utils etc
 */
function turnOffGlobalLogger() {
    globalLogger = new DummyLogger();
}

/**
 * Logging level.
 * This allows the called to specify a level at which the event should be seen. This level will be used for both the console and the file
 * 
 * | name      | meaning                                                                               |
 * | :-------- | :------------------------------------------------------------------------------------ |
 * | Verbose   | all messages will be emitted                                                          |
 * | Log       | only log, warning and error messages will be emitted                                  |
 * | Warning   | only warning and error messages will be emitted                                       |
 * | Error     | only error messages will be emitted                                                   |
 * | Exception | same as the error level, but when the message is emited, an exception will be thrown  |
 */
const LogLevel = {
    Verbose   : 3,      /**  */
    Log       : 2,      /**  */
    Warning   : 1,      /**  */
    Error     : 0,      /**  */
    Exception : -1      /**  */
}

/**
 * creates and maintains a log. The logger function is a pass through to "real-logger". This is so that we do not need to 
 * burden public projects with the debugging logger
 */
function Logger() {
    return new require( './real-logger-private' ).Logger();
}


module.exports = {
    Logger              : Logger,
    DummyLogger         : DummyLogger,
    ConsoleLogger       : ConsoleLogger,
    globalLogger        : globalLogger,
    turnOffGlobalLogger : turnOffGlobalLogger,
    LogLevel            : LogLevel
};