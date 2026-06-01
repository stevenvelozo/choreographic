# Choreographic

> **[Read the Choreographic Documentation](https://stevenvelozo.github.io/choreographic/)** - interactive docs with the full API reference.

Prepackaged application services and behaviors for single-run scripts.  Services provided by fable.  The key elements:

* settings/configuratin
* logging
* reading files of common formats (csv, text)
* writing files to the execution-specific rundata folder

Specifically, I kept writing a bunch of these one-off scripts that do tasks like importing a set of data.  Or mutating a set of records.  Or exercising a set of endpoints.  And at times, had to pull in data multiple iterations or on different servers.

When using traditional application services for this, it can be rough.  If I were to, say, import 50,000 records and wanted to log anomalies as well as some surrounding data.  And, there are 20,000 anomalies.

After running the thing a bunch of times, the log file is fricken enormous.  And if I'm running it against qa, staging and production based on shifting config it gets even trickier.

## Using This Thing

So you want to Choreograph something:

## 1. Install the Package:

`~/Code/someawesomescript: npm i --save choreographic`

## 2. Write Your Awesome Script:

```js
const libChoreographic = require('choreographic');

const _ScriptHost = new libChoreographic({ "ImportantSettingValue":"I am an important setting!" });

_ScriptHost.log.info('My script is running!');

// Do some important stuff
_ScriptHost.log.error(`There are settings like [ImportantSettingsValue] you can use [${_ScriptHost.settings.ImportantSettingValue}].`);
```

## 3. Run Your Awesome Script:

```
~/Code/someawesomescript: node index.js
2023-04-24T23:43:31.849Z [info] (ScriptHost): Starting up script host [/Users/steven/Code/someawesomescript/rundata/ScriptHost-Run-2023-04-24-16-43-31-833/ScriptHost-Run-2023-04-24-16-43-31-833.log] for ScriptHost...
2023-04-24T23:43:31.855Z [info] (ScriptHost): My script is running!
2023-04-24T23:43:31.855Z [error] (ScriptHost): There are settings like [ImportantSettingsValue] you can use [I am an important setting!].

~/Code/someawesomescript:
```

## 4. But Wait, There's More!

After running the script, there will also be a `rundata` folder:

```
~/Code/someawesomescript: ls -l rundata/
drwxr-xr-x  3 steven  staff  96 Apr 24 16:42 ScriptHost-Run-2023-04-24-16-42-11-581
drwxr-xr-x  3 steven  staff  96 Apr 24 16:42 ScriptHost-Run-2023-04-24-16-42-31-419
drwxr-xr-x  3 steven  staff  96 Apr 24 16:43 ScriptHost-Run-2023-04-24-16-43-31-833
```

And in this case the script has been run three times.  There is a log file in each folder.  Each time you execute the script, it has a new folder for itself.

If you want the prefix to not be `ScriptHost`, it just uses the common `fable` settings format for application name: 

```json
{
	"Product": "MyProductName"
}
```

## Reading Common-Format Input Files

Choreographic itself does not ship dedicated CSV or text **parsers** -- the class exposes no `read*` methods. Input is handled with the tools you already have in a script host: Node's `fs` module (a reference is kept at `_ScriptHost._Dependencies.fs`) for loading file contents, and the [fable](https://github.com/fable-retold/fable) services hanging off `_ScriptHost.fable` for working through the rows.

A common pattern is to read a file synchronously at the top of the script, split it into lines, and walk the rows with the bundled async helper so you can throttle parallelism and log progress as you go:

```javascript
const libFS = require('fs');
const libChoreographic = require('choreographic');

const _ScriptHost = new libChoreographic({ "Product": "ImportRecords" });

// Read a line-delimited input file from disk.
let tmpFileContents = libFS.readFileSync(`${process.cwd()}/input/records.csv`, 'utf8');
let tmpRows = tmpFileContents.split('\n');

_ScriptHost.createProgressTracker(tmpRows.length, 'Import');

// fable.Utility.eachLimit walks the rows; here we process 4 at a time.
_ScriptHost.fable.Utility.eachLimit(tmpRows, 4,
	(pRow, fRowComplete) =>
	{
		_ScriptHost.incrementProgressTrackerStatus('Import', 1);
		// ... do something with pRow ...
		return fRowComplete();
	},
	(pError) =>
	{
		_ScriptHost.printProgressTrackerStatus('Import');
		_ScriptHost.log.info('Import complete.');
	});
```

The `_Dependencies.fs` handle exists so the same `fs` instance is reachable from anywhere you hold the script host, without re-requiring it.

> **Note:** The "common format" framing here is read-by-convention, not a parser API. If you need structured CSV parsing (quoted fields, embedded delimiters), bring your own parser or a fable-provided service -- Choreographic only provides the run scaffolding, logging, and progress tracking around it.

## Writing a File to the Current Rundata Folder

Every run gets its own timestamped folder under `DataRoot` (see `settings.App.DataFolder`). The script host provides three helpers that write into that folder, so output from each run stays isolated alongside that run's log file.

**Write an object as pretty-printed JSON:**

```javascript
_ScriptHost.writeFileToRunDataFolderFromObjectSync('anomalies.json', { Count: 20000, Records: tmpAnomalies });
```

Serializes the object with `JSON.stringify(pObject, null, 4)` and writes it (UTF-8) to `DataFolder/anomalies.json`.

**Write a string verbatim:**

```javascript
_ScriptHost.writeFileToRunDataFolderSync('report.txt', 'Run finished with 3 warnings.\n');
```

Writes the string content as-is (UTF-8) to `DataFolder/report.txt`.

**Write an array of lines (appending one row at a time):**

```javascript
_ScriptHost.writeTextFileFromArray('rows.csv', ['id,name', '1,Alice', '2,Bob']);
```

Appends each array entry followed by a newline (`\n`) to `DataFolder/rows.csv`. If the value passed is not an array, the helper logs an error via `_ScriptHost.log.error` and writes nothing.

All three are synchronous and resolve filenames relative to the active run's `DataFolder` -- you pass only the file name, never a path. Because the folder is unique per run, re-running the script never clobbers a previous run's output.

## Documentation

Full documentation, including the script lifecycle and a complete API reference, is published at **[stevenvelozo.github.io/choreographic](https://stevenvelozo.github.io/choreographic/)**.

- [Quick Start](docs/quickstart.md) -- install, write, and run your first script
- [API Reference](docs/api.md) -- lifecycle, logging and telemetry, file writers, enumeration helpers

## Related Modules

- [fable](https://github.com/fable-retold/fable) -- the service dependency-injection framework that provides Choreographic's logging, configuration, and async utility services
