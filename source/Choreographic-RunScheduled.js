// Run the transformer service on a schedule.
const libChildProcess = require('child_process');
const libScheduler = require('node-schedule');

// Simple mutex so it doesn't execute twice.
let _ScriptRunMutex = false;
let _ScriptSchedulerFrequency = '*/5 * * * *';

// Execution function for the transformer service
let executeScriptService = (fCallback) =>
{
	// libScheduler uses a different pattern of watchers so ignore callbacks.
	let tmpCallback =  (typeof(fCallback) === 'function') ? fCallback : ()=>{};

	// Use the mutex to figure out if the process is running or not.
	if (_ScriptRunMutex)
	{
		console.log('Script service already running!  Waiting another tick for it to complete.')
	}
	else
	{
		console.log('Script service starting.')
		_ScriptRunMutex = true;
	}

	// Create the child process
	let tmpExecutionProcess = libChildProcess.fork('./RunOnce.js');

	// Watch for errors
	tmpExecutionProcess.on('error', (pError) =>
	{
		// Log the error
		console.log(`Script Process Error: ${pError}`);
		console.log(JSON.stringify(pError));

		// Some versions of node do weird things if we don't return explicitly from these closures
		return;
	});

	// Fix the mutex and log something once the process is done.
	tmpExecutionProcess.on('exit', (pProcessStatusCode) =>
	{
		_ScriptRunMutex = false;

		// If the process didn't exit with code 0, figure out why.
		var tmpProcessError = (pProcessStatusCode === 0) ? null : `Process ended with non-standard code: ${pProcessStatusCode}`;

		return tmpCallback(tmpProcessError);
	});
}

console.log(`Starting scheduler service with cron frequency [${_ScriptSchedulerFrequency}]...`)
const _ScriptScheduler = libScheduler.scheduleJob(_ScriptSchedulerFrequency, executeScriptService);