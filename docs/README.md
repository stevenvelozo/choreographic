# Choreographic

> Simple framework for single-run scripts.

Choreographic is a lightweight host for the kind of one-off scripts you write all the time -- importing a batch of data, mutating a set of records, or exercising a list of endpoints. It wraps a [fable](https://fable-retold.github.io/fable/) instance to give every script the same baseline: configuration, logging, a per-run log file, progress tracking, and a clean place to drop output.

The core idea is **run isolation**. Each time you execute the script, Choreographic creates a fresh timestamped folder for that run. The run's log and any files it writes land in that folder, so running the same script against QA, then staging, then production never tangles one run's output into another's.

## Features

- **Run-Isolated Output** -- every execution creates a unique `<Hash>-Run-<timestamp>` folder under the data root, with its own log file
- **Fable-Backed Logging** -- a configured `log` object writes to both the console and the run's log file via fable's `simpleflatfile` log stream
- **Settings Merge** -- combines an optional config file with a passed-in config object, with the passed-in object taking precedence
- **Progress Trackers** -- named trackers compute percent complete, average operation time, and estimated completion for long loops
- **Timing Helpers** -- create named timestamps and log elapsed deltas
- **One-Call Writers** -- write JSON objects, raw strings, or line arrays into the active run folder without managing paths
- **Async Enumeration** -- iterate objects and arrays with bounded parallelism

## Quick Start

```javascript
const libChoreographic = require('choreographic');

// The constructor takes a config object (or a path to a config file).
const _ScriptHost = new libChoreographic({ "Product": "ImportRecords" });

_ScriptHost.log.info('My script is running!');

// Settings you pass in are available on _ScriptHost.settings
_ScriptHost.log.info(`Run folder is ${_ScriptHost.settings.App.DataFolder}`);

// Write a result file into this run's folder
_ScriptHost.writeFileToRunDataFolderFromObjectSync('result.json', { Status: 'ok' });
```

## Installation

```bash
npm install choreographic
```

## How a Run Works

When you construct a `Choreographic`, it:

1. Merges your config file (if any) and your config object into `settings`.
2. Fills in run metadata under `settings.App` -- a `Hash`, a unique `RunID`, a `DataRoot`, and a per-run `DataFolder`.
3. Creates the `DataRoot` folder (if needed) and the per-run `DataFolder`.
4. Adds a `simpleflatfile` log stream pointed at `<DataFolder>/<RunID>.log`.
5. Instantiates fable with those settings and exposes `_ScriptHost.fable` and `_ScriptHost.log`.

From there your script uses `log` for output, the progress/timing helpers for instrumentation, and the writer helpers to persist results.

## Documentation

- [Quick Start](quickstart.md) -- install, write, and run your first script
- [API Reference](api.md) -- the script lifecycle, logging and telemetry, file writers, and enumeration helpers

## Related Modules

- [fable](https://fable-retold.github.io/fable/) -- the service dependency-injection framework that provides Choreographic's logging, configuration, and async utility services
