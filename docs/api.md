# API Reference

The module exports a single class. Construct it once at the top of your script; the instance is your script host.

```javascript
const libChoreographic = require('choreographic');
const _ScriptHost = new libChoreographic(pConfiguration);
```

## Constructor and Lifecycle

### new Choreographic(pConfiguration)

`pConfiguration` may be either:

- an **object** -- used directly as the initial configuration, or
- a **string** -- treated as a path to a config file, which is `require`d and used as the initial configuration.

If `pConfiguration` is an object that contains a `ConfigFile` property, that file is loaded as well and the passed-in object is merged over it.

Construction runs the full lifecycle synchronously, in order:

1. **`loadInitialConfigurationFile(pConfigurationFile)`** -- if a config file path was supplied (directly or via `ConfigFile`), it is `require`d into `_InitialConfigurationFile`. A load failure is caught and logged with `console.log`; the script still starts with an empty file config.
2. **`initializeSettingsObject()`** -- merges the file config and the passed-in object into `this.settings` as `{ ...fileConfig, ...passedInConfig }`. **The passed-in object takes precedence on conflicting keys.**
3. **`initializeRunSpecificData()`** -- fills in run metadata, creates the run folders, configures the log stream, and instantiates fable (detailed below).

After construction, the useful surface is:

| Property | Description |
|----------|-------------|
| `settings` | The merged settings object, including the populated `App` block |
| `fable` | The fable instance created from `settings` |
| `log` | `fable.log` -- the configured logger (console + run log file) |
| `timeStamps` | Map of named timestamps created by `createTimeStamp` |
| `progressTrackers` | Map of named progress trackers |
| `_Dependencies` | Holds `{ fs }` -- a reference to Node's `fs` module |

### Run-Specific Settings

`initializeRunSpecificData` guarantees a `settings.App` object and populates it. If `App` exists but is not an object, it is moved aside to `settings._ERROR_App` and replaced with an empty object.

| `settings.App` field | Default | Meaning |
|----------------------|---------|---------|
| `Hash` | `'ScriptHost'` | Prefix for the run ID and folder name |
| `DataRoot` | `<cwd>/rundata/` | Parent folder that holds all run folders |
| `RunTimeStart` | `new Date()` at construction | Timestamp the run started |
| `RunID` | `<Hash>-Run-<YYYY>-<MM>-<DD>-<HH>-<mm>-<ss>-<ms>` | Unique identifier for this run |
| `DataFolder` | `<DataRoot><RunID>` | The per-run output folder |

Choreographic also defaults two top-level settings if absent: `Product` (set to `App.Hash`) and `ProductVersion` (set to `'0.0.0'`).

> **Note:** `Product` is only defaulted from `App.Hash` when it is not already present. Setting `Product` in your config does **not** change the run-folder prefix -- the prefix comes from `App.Hash`. To change the prefix, set `App.Hash` directly.

The `DataRoot` folder is created with `fs.mkdirSync` only if it does not already exist; the `DataFolder` is then created unconditionally. Both use non-recursive `mkdirSync`, so a multi-segment custom `DataRoot` whose parents do not exist will fail.

### Logging Configuration

Choreographic appends a log stream to `settings.LogStreams` (creating the array if needed):

```javascript
{
	"level": "trace",
	"loggertype": "simpleflatfile",
	"path": "<DataFolder>/<RunID>.log"
}
```

The `simpleflatfile` logger writes to both the console and that file, so all output for a run is captured on disk and echoed live. fable is then instantiated with the full settings, and `this.log` is set to `fable.log`.

### Using the Logger

`this.log` is the standard fable logger. Log methods take a message string and an optional structured datum object as the **second** argument:

```javascript
_ScriptHost.log.trace('Verbose detail');
_ScriptHost.log.debug('Debug detail');
_ScriptHost.log.info('Something happened', { RecordID: 42 });
_ScriptHost.log.warn('Heads up');
_ScriptHost.log.error('Something failed', { Error: tmpError });
_ScriptHost.log.fatal('Unrecoverable');
```

Refer to [fable](https://github.com/fable-retold/fable) for the complete logger API.

## Logging and Telemetry Helpers

### createTimeStamp(pTimeStampHash)

Record the current time (epoch milliseconds) under a named key and return it. `pTimeStampHash` defaults to `'Default'` if not a string. Stored in `this.timeStamps`.

```javascript
_ScriptHost.createTimeStamp('phase-one');
```

### getTimeDelta(pTimeStampHash)

Return milliseconds elapsed since the named timestamp was created. Returns `-1` if the hash is unknown. `pTimeStampHash` defaults to `'Default'`.

```javascript
let tmpElapsed = _ScriptHost.getTimeDelta('phase-one');
```

### logTimeDelta(pTimeStampHash, pMessage)

Compute the delta for `pTimeStampHash` and log it (with the elapsed milliseconds appended in parentheses). `pMessage` defaults to `` `Elapsed for <hash>: ` ``. Returns the elapsed time.

```javascript
_ScriptHost.createTimeStamp('phase-one');
// ... work ...
_ScriptHost.logTimeDelta('phase-one', 'Phase one done');
```

> **Note:** `logTimeDelta` emits its line through `this.info(...)`. The class does not define an `info` method (logging is on `this.log`), so calling `logTimeDelta` in the current release throws. Use `this.log.info(\`... (${_ScriptHost.getTimeDelta('phase-one')}ms)\`)` directly, or the progress-tracker helpers below, for elapsed-time logging.

### logMemoryResourcesUsed()

Log current heap usage in megabytes via `this.log.info`.

```javascript
_ScriptHost.logMemoryResourcesUsed();
// (ScriptHost): Memory usage at 12.34 MB
```

## Progress Trackers

Progress trackers measure throughput over a known number of operations and estimate completion. Each is stored by hash in `this.progressTrackers`. Where a hash is accepted it defaults to `'DefaultProgressTracker'`.

A tracker object has this shape:

```javascript
{
	Hash: 'Import',
	StartTime: 1708300000000,   // epoch ms when created
	EndTime: 0,
	CurrentTime: 0,             // ms elapsed since start
	PercentComplete: -1,
	AverageOperationTime: -1,   // ms per completed operation
	EstimatedCompletionTime: -1,// ms remaining
	TotalCount: 50000,
	CurrentCount: -1
}
```

### createProgressTracker(pTotalOperations, pProgressTrackerHash)

Create (or replace) a tracker. `pTotalOperations` defaults to `100` if not a number. Records the start time and returns the tracker.

```javascript
_ScriptHost.createProgressTracker(50000, 'Import');
```

### updateProgressTrackerStatus(pProgressTrackerHash, pCurrentOperations)

Set the tracker's completed-operation count to `pCurrentOperations` (parsed as an integer), recompute derived stats, and return the tracker. Returns `false` if `pCurrentOperations` is not a number. Creates a 100-operation tracker first if the hash is unknown.

```javascript
_ScriptHost.updateProgressTrackerStatus('Import', 12000);
```

### incrementProgressTrackerStatus(pProgressTrackerHash, pIncrementSize)

Add `pIncrementSize` (parsed as an integer) to the completed count, recompute, and return the tracker. Returns `false` if `pIncrementSize` is not a number. Creates the tracker first if unknown.

```javascript
_ScriptHost.incrementProgressTrackerStatus('Import', 1);
```

### setProgressTrackerEndTime(pProgressTrackerHash, pCurrentOperations)

Stamp the tracker's `EndTime` (as elapsed ms since start) and recompute. Returns `false` if the hash is unknown. If `pCurrentOperations` is a number, the count is updated first.

```javascript
_ScriptHost.setProgressTrackerEndTime('Import');
```

### solveProgressTrackerStatus(pProgressTrackerHash)

Recompute `CurrentTime`, `PercentComplete`, `AverageOperationTime`, and `EstimatedCompletionTime` from the current count and elapsed time. Called internally by the update/increment/end-time methods; you rarely call it directly. Creates a 100-operation tracker first if the hash is unknown.

### printProgressTrackerStatus(pProgressTrackerHash)

Log a human-readable status line via `this.log.info`, choosing the message based on tracker state:

- unknown hash -- logs that the tracker does not exist
- no completed operations -- logs elapsed time only
- in progress (`EndTime < 1`) -- logs percent complete, counts, elapsed time, median per-operation time, and estimated completion
- finished (`EndTime` set) -- logs the final count and total duration

```javascript
_ScriptHost.printProgressTrackerStatus('Import');
```

## File Writers

These helpers write into the active run's `settings.App.DataFolder`. You pass only a **file name** -- the folder is prepended for you. All are synchronous and write UTF-8.

### writeFileToRunDataFolderFromObjectSync(pFileName, pObject)

Serialize `pObject` with `JSON.stringify(pObject, null, 4)` (4-space pretty print) and write it to `<DataFolder>/<pFileName>`.

```javascript
_ScriptHost.writeFileToRunDataFolderFromObjectSync('summary.json', { Total: 50000, Anomalies: 20000 });
```

### writeFileToRunDataFolderSync(pFileName, pFileContent)

Write the string `pFileContent` verbatim to `<DataFolder>/<pFileName>`.

```javascript
_ScriptHost.writeFileToRunDataFolderSync('report.txt', 'Finished with 3 warnings.\n');
```

### writeTextFileFromArray(pFileName, pFileArray)

Append each entry of `pFileArray`, followed by a newline (`\n`), to `<DataFolder>/<pFileName>`. Useful for streaming out rows as you build them. If `pFileArray` is not an array, the method logs an error via `this.log.error` and writes nothing.

```javascript
_ScriptHost.writeTextFileFromArray('rows.csv', ['id,name', '1,Alice', '2,Bob']);
```

## Reading Input Files

Choreographic does not expose `read*` methods or a CSV/text parser. To consume input, use Node's `fs` (a reference is available at `_ScriptHost._Dependencies.fs`) and iterate the data with [fable](https://github.com/fable-retold/fable)'s async utilities (see below). For structured CSV parsing, bring your own parser.

```javascript
let tmpRows = libFS.readFileSync(`${process.cwd()}/input/records.csv`, 'utf8').split('\n');
```

## Enumeration Helpers

These iterate a collection with bounded parallelism. The per-item function receives the script host so you can log and write from inside the loop.

### enumerateObjectProperties(pObject, fProcessFunction, fEnumerationComplete, pParallelOperations)

Walk each own key of `pObject`. `pParallelOperations` defaults to `1` (serial). `fProcessFunction` has the signature `(pObjectKey, pObject, pScriptHost, fOperationComplete)` and must call `fOperationComplete` when done. `fEnumerationComplete` defaults to a no-op.

```javascript
_ScriptHost.enumerateObjectProperties(tmpRecords,
	(pKey, pValue, pScriptHost, fItemComplete) =>
	{
		pScriptHost.log.info(`Processing ${pKey}`);
		return fItemComplete();
	},
	(pError) => { _ScriptHost.log.info('Done.'); },
	4);
```

### enumerateArrayEntries(pArray, fProcessFunction, fEnumerationComplete, pParallelOperations)

Walk each entry of `pArray` with the same callback contract and defaults as above.

> **Note:** Both enumeration helpers reference an `async` library internally that the current release does not import, so calling them throws a `ReferenceError`. Until that is resolved, iterate with `_ScriptHost.fable.Utility.eachLimit(pCollection, pLimit, fIteratee, fComplete)` instead -- it provides the same bounded-parallel iteration and is what the bundled debug harness uses.

## Fable Utility Access

The fable instance exposes async helpers at `_ScriptHost.fable.Utility`, including:

- `waterfall(pTasks, fCallback)` -- run async stages in sequence
- `eachLimit(pCollection, pLimit, fIteratee, fCallback)` -- iterate with bounded parallelism

```javascript
_ScriptHost.fable.Utility.waterfall(
	[
		(fStageComplete) =>
		{
			_ScriptHost.log.info('Authenticating...');
			return fStageComplete();
		},
		(fStageComplete) =>
		{
			_ScriptHost.DocumentSet = [];
			return fStageComplete();
		}
	],
	(pError) =>
	{
		_ScriptHost.log.info('Done.');
	});
```

See [fable](https://github.com/fable-retold/fable) for the full utility and service surface.

## Related Modules

- [fable](https://github.com/fable-retold/fable) -- the service dependency-injection framework that provides Choreographic's logging, configuration, and async utility services
