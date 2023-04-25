# Choreographic

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

# Documentation Yet to Write

* read common format files
* write a file to the current rundata folder
