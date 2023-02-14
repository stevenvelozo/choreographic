/**
* @license MIT
* @author <steven@velozo.com>
*/

/**
* Choreographic browser shim loader
*/

// Load the informary module into the browser global automatically.
var libChoreographic = require('./Choreographic.js');

if (typeof(window) === 'object')
    window.Choreographic = libChoreographic;

module.exports = libChoreographic;