# Quick Start

This walkthrough takes you from an empty folder to a running script that logs, tracks progress, and writes a result file into its own run folder.

## 1. Install the Package

```bash
npm install --save choreographic
```

## 2. Write Your Script

Create `index.js`. The only required step is constructing a `Choreographic` instance -- everything you need hangs off it.

```javascript
const libChoreographic = require('choreographic');

const _ScriptHost = new libChoreographic({ "ImportantSettingValue": "I am an important setting!" });

_ScriptHost.log.info('My script is running!');

// Settings you pass to the constructor are available on _ScriptHost.settings
_ScriptHost.log.error(`Settings like [ImportantSettingValue] are available: [${_ScriptHost.settings.ImportantSettingValue}].`);
```

## 3. Run It

```bash
node index.js
```

```
2023-04-24T23:43:31.849Z [info] (ScriptHost): Starting up script host [/Users/steven/Code/someawesomescript/rundata/ScriptHost-Run-2023-04-24-16-43-31-833/ScriptHost-Run-2023-04-24-16-43-31-833.log] for ScriptHost...
2023-04-24T23:43:31.855Z [info] (ScriptHost): My script is running!
2023-04-24T23:43:31.855Z [error] (ScriptHost): Settings like [ImportantSettingValue] are available: [I am an important setting!].
```

## 4. Find the Run Folder

After running, there is a `rundata` folder. Each execution gets its own subfolder:

```bash
ls -l rundata/
```

```
drwxr-xr-x  3 steven  staff  96 Apr 24 16:42 ScriptHost-Run-2023-04-24-16-42-11-581
drwxr-xr-x  3 steven  staff  96 Apr 24 16:42 ScriptHost-Run-2023-04-24-16-42-31-419
drwxr-xr-x  3 steven  staff  96 Apr 24 16:43 ScriptHost-Run-2023-04-24-16-43-31-833
```

This script has been run three times. Each folder holds that run's log file (and any output files the script writes).

## 5. Name Your Script

By default the run folders are prefixed with `ScriptHost`. To use your own prefix, set the standard fable `Product` name in your config:

```json
{
	"Product": "MyProductName"
}
```

You can pass this inline in the constructor or in a config file. The prefix is actually driven by `settings.App.Hash`; if you do not set `App.Hash`, Choreographic defaults it to `ScriptHost` and then derives `Product` from it. To control the folder prefix directly, set `App.Hash`:

```javascript
const _ScriptHost = new libChoreographic({ "App": { "Hash": "MyProductName" } });
```

## 6. Load Settings From a File

Pass a string instead of an object and Choreographic treats it as a path to a config file to `require`:

```javascript
const _ScriptHost = new libChoreographic(`${__dirname}/MyConfig.json`);
```

You can also keep passing an object and point at an extra file with the `ConfigFile` property -- the file is loaded first, then your object is merged on top (your object wins on conflicts):

```javascript
const _ScriptHost = new libChoreographic(
	{
		ConfigFile: `${__dirname}/MyConfig.json`,
		Product: "OverridesTheFileValue"
	});
```

## 7. Add Instrumentation and Output

A more realistic script tracks progress through a batch and writes results into the run folder:

```javascript
const libFS = require('fs');
const libChoreographic = require('choreographic');

const _ScriptHost = new libChoreographic({ "Product": "ImportRecords" });

// Read a line-delimited input file.
let tmpRows = libFS.readFileSync(`${process.cwd()}/input/records.csv`, 'utf8').split('\n');

// Track progress across the batch.
_ScriptHost.createProgressTracker(tmpRows.length, 'Import');

let tmpAnomalies = [];

_ScriptHost.fable.Utility.eachLimit(tmpRows, 4,
	(pRow, fRowComplete) =>
	{
		// ... process pRow, collect anomalies ...
		_ScriptHost.incrementProgressTrackerStatus('Import', 1);
		return fRowComplete();
	},
	(pError) =>
	{
		_ScriptHost.setProgressTrackerEndTime('Import');
		_ScriptHost.printProgressTrackerStatus('Import');

		// Persist results into this run's folder.
		_ScriptHost.writeFileToRunDataFolderFromObjectSync('anomalies.json', tmpAnomalies);

		_ScriptHost.logMemoryResourcesUsed();
		_ScriptHost.log.info('Import complete.');
	});
```

See the [API Reference](api.md) for the full set of lifecycle, telemetry, and writer methods.
