// A simple host for managing scripts with isolated data outputs each run automatically
// both on the development box as well as in production if necessary.

// If we want to load a configuration file, just set this property in pConfiguration:
// ConfigFile:`${__dirname}/Extra-Configuration.json`,

/*
 * This will have some run-specific data in settings:
 *
 * (DataFolder is where the data goes)

 {
	"App":
	{
		"Hash": "Script",
		"RunID": "Script-Run-2022-08-12-15-35-01-21-859",
		"DataRoot": "/some/folderlike/container/for/rundata/",
		"DataFolder": "/some/folderlike/container/for/rundata/Script-Run-2022-08-12-15-35-01-21-859/"
	}
 }

 */

const libFS = require('fs');

// This expects either a config object or a string that points to a file.
class Choreographic
{
	constructor(pConfiguration)
	{
		this._InitialConfiguration = (typeof(pConfiguration) == 'object') ? pConfiguration : {};
		this._InitialConfigurationFile = {};

		this._Dependencies = (
			{
				fs: libFS
			});

		if (typeof(pConfiguration) == 'string')
		{
			this.loadInitialConfigurationFile(pConfiguration);
		}
		else if ((this._InitialConfiguration.hasOwnProperty('ConfigFile')))
		{
			// We are going to manually override the Fable auto-config loading
			// So we can generate extra elements regarding the run-specific folders
			this.loadInitialConfigurationFile(this._InitialConfiguration.ConfigFile);
		}

		this.settings = null;

		// Timestamps will just be the long ints
		this.timeStamps = {};
		// ProgressTrackers have an object format of: {Hash:'SomeHash',EndTime:UINT,CurrentTime:UINT,TotalCount:INT,CurrentCount:INT}
		this.progressTrackers = {};

		this.initializeSettingsObject();

		this.initializeRunSpecificData();
	}

	/************************************************************************
	 * BEGINNING OF -->  Script Initialization Functions
	 */
	loadInitialConfigurationFile(pConfigurationFile)
	{
		if (typeof(pConfigurationFile) == 'string')
		{
			// Try to load the config file.
			try
			{
				this._InitialConfigurationFile = require(pConfigurationFile);
				console.log(`Loaded configuration file [${pConfigurationFile}].`)
			}
			catch (pConfigFileLoadException)
			{
				this._InitialConfigurationFile = {};
				console.log(`Error attempting to load configuration file [${pConfigurationFile}]: ${pConfigFileLoadException}`);
			}
		}
	}

	initializeSettingsObject()
	{
		// Merge the file and the passed-in config.
		// The passed-in config takes precedence in this spread merge operation.
		this.settings = { ...this._InitialConfigurationFile, ...this._InitialConfiguration};
	}

	initializeRunSpecificData()
	{
		// Make sure the app-specific and run-specific object is available.
		if (!this.settings.hasOwnProperty('App'))
		{
			this.settings.App = {};
		}
		else if (typeof(this.settings.App) != 'object')
		{
			// If the App settings thing isn't an object, this is all going to be really challenging.
			console.log(`Settings object has an "App" property but it is not an object, it is of type ${typeof(this.settings.App)} with a value of [${this.settings.App}].  Moving this property to the "__ERROR_App" property.`);
			this.settings._ERROR_App = this.settings.App;
			this.settings.App = {};
		}

		if (!this.settings.App.hasOwnProperty('Hash'))
		{
			// TODO: Potentially pull the App Name from the config.
			this.settings.App.Hash = 'ScriptHost';
		}
		if (!this.settings.hasOwnProperty('Product'))
		{
			this.settings.Product = this.settings.App.Hash;
		}
		if (!this.settings.hasOwnProperty('ProductVersion'))
		{
			this.settings.ProductVersion = '0.0.0';
		}

		// Check to see if a folder in the settings for the unique per-run folders.
		// Note this is the "data root" folder, meaning each time you run the script
		//     a folder will be created in here with a timestamp with logs and data
		//     from the run.
		// By default create a "rundata" folder in the same place as the code file.
		if (!this.settings.App.hasOwnProperty('DataRoot'))
		{
			this.settings.App.DataRoot = `${process.cwd()}/rundata/`;
		}

		// Now create the root folder for the rundata.
		// TODO: Change this to recursive dropbag folder create functions
		if (!libFS.existsSync(this.settings.App.DataRoot))
		{
			libFS.mkdirSync(this.settings.App.DataRoot);
		}

		// Create a specific run folder (for caching files, output and a log) based on time
		this.settings.App.RunTimeStart = new Date();
		// Small macro to return a 2 digit number that is zero filled on the left
		// TODO: Tested simple library for data processing as such
		let formatDateString = (pDateValue) => { return (`00${pDateValue}`).slice(-2); };

		// Create a unique run hash for this specific run
		this.settings.App.RunID = `${this.settings.App.Hash}-Run-${this.settings.App.RunTimeStart.getFullYear()}-${formatDateString(this.settings.App.RunTimeStart.getMonth()+1)}-${formatDateString(this.settings.App.RunTimeStart.getDate())}-${formatDateString(this.settings.App.RunTimeStart.getHours())}-${formatDateString(this.settings.App.RunTimeStart.getMinutes())}-${formatDateString(this.settings.App.RunTimeStart.getSeconds())}-${this.settings.App.RunTimeStart.getMilliseconds()}`;
		this.settings.App.DataFolder = `${this.settings.App.DataRoot}${this.settings.App.RunID}`;

		// Now create the run specific data folder
		libFS.mkdirSync(this.settings.App.DataFolder);

		// Check to see if there is a log streams object, or create one if there isn't.
		if (!this.settings.hasOwnProperty('LogStreams'))
		{
			this.settings.LogStreams = [];
		}
		// Add a log file for this run, in the run specific data folder.
		this.settings.LogStreams.push(
			// Because the simpleflatfile log stream writes to console and file, we are good!
			{
				"level": "trace",
				"streamtype": "simpleflatfile",
				"path": `${this.settings.App.DataFolder}/${this.settings.App.RunID}.log`
			});

		this.fable = require('fable').new(this.settings);

		this.log = this.fable.log;

		this.log.info(`Starting up script host [${this.settings.App.DataFolder}/${this.settings.App.RunID}.log] for ${this.settings.App.Hash}...`);
	}
	/*
	 * END OF       -->  Script Initialization Functions
	 ************************************************************************/



	/************************************************************************
	 * BEGINNING OF -->  Logging and Telemetry Helpers
	 */
	createTimeStamp(pTimeStampHash)
	{
		let tmpTimeStampHash = (typeof(pTimeStampHash) == 'string') ? pTimeStampHash : 'Default';
		this.timeStamps[tmpTimeStampHash] = +new Date();
		return this.timeStamps[tmpTimeStampHash];
	}

	getTimeDelta(pTimeStampHash)
	{
		let tmpTimeStampHash = (typeof(pTimeStampHash) == 'string') ? pTimeStampHash : 'Default';
		if (this.timeStamps.hasOwnProperty(tmpTimeStampHash))
		{
			let tmpEndTime = +new Date();
			return tmpEndTime-this.timeStamps[tmpTimeStampHash];	
		}
		else
		{
			return -1;
		}
	}

	logTimeDelta(pTimeStampHash, pMessage)
	{
		let tmpTimeStampHash = (typeof(pTimeStampHash) == 'string') ? pTimeStampHash : 'Default';
		let tmpMessage = (typeof(pMessage) !== 'undefined') ? pMessage : `Elapsed for ${tmpTimeStampHash}: `;
		let tmpOperationTime = this.getTimeDelta(pTimeStampHash);
		this.info(tmpMessage +' ('+tmpOperationTime+'ms)');
		return tmpOperationTime;
	}

	createProgressTracker(pTotalOperations, pProgressTrackerHash)
	{
		let tmpProgressTrackerHash = (typeof(pProgressTrackerHash) == 'string') ? pProgressTrackerHash : 'DefaultProgressTracker';
		let tmpTotalOperations = (typeof(pTotalOperations) == 'number') ? pTotalOperations : 100;

		let tmpProgressTracker = (
			{
				Hash: tmpProgressTrackerHash,
				StartTime: this.createTimeStamp(tmpProgressTrackerHash),
				EndTime: 0,
				CurrentTime: 0,
				PercentComplete: -1,
				AverageOperationTime: -1,
				EstimatedCompletionTime: -1,
				TotalCount: tmpTotalOperations,
				CurrentCount:-1
			});

		this.progressTrackers[tmpProgressTrackerHash] = tmpProgressTracker;

		return tmpProgressTracker;
	}

	solveProgressTrackerStatus(pProgressTrackerHash)
	{
		let tmpProgressTrackerHash = (typeof(pProgressTrackerHash) == 'string') ? pProgressTrackerHash : 'DefaultProgressTracker';

		if (!this.progressTrackers.hasOwnProperty(tmpProgressTrackerHash))
		{
			this.createProgressTracker(100, tmpProgressTrackerHash);
		}

		let tmpProgressTracker = this.progressTrackers[tmpProgressTrackerHash];

		tmpProgressTracker.CurrentTime = this.getTimeDelta(tmpProgressTracker.Hash);

		if ((tmpProgressTracker.CurrentCount > 0) && (tmpProgressTracker.TotalCount > 0))
		{
			tmpProgressTracker.PercentComplete = (tmpProgressTracker.CurrentCount / tmpProgressTracker.TotalCount) * 100.0;
		}

		if ((tmpProgressTracker.CurrentCount > 0) && (tmpProgressTracker.CurrentTime > 0))
		{
			tmpProgressTracker.AverageOperationTime = tmpProgressTracker.CurrentTime / tmpProgressTracker.CurrentCount;
		}

		if ((tmpProgressTracker.CurrentCount < tmpProgressTracker.TotalCount) && (tmpProgressTracker.AverageOperationTime > 0))
		{
			tmpProgressTracker.EstimatedCompletionTime = (tmpProgressTracker.TotalCount - tmpProgressTracker.CurrentCount) * tmpProgressTracker.AverageOperationTime;
		}
	}

	updateProgressTrackerStatus(pProgressTrackerHash, pCurrentOperations)
	{
		let tmpProgressTrackerHash = (typeof(pProgressTrackerHash) == 'string') ? pProgressTrackerHash : 'DefaultProgressTracker';
		let tmpCurrentOperations = parseInt(pCurrentOperations);

		if (isNaN(tmpCurrentOperations))
		{
			return false;
		}

		if (!this.progressTrackers.hasOwnProperty(tmpProgressTrackerHash))
		{
			this.createProgressTracker(100, tmpProgressTrackerHash);
		}

		this.progressTrackers[tmpProgressTrackerHash].CurrentCount = tmpCurrentOperations;
		this.progressTrackers[tmpProgressTrackerHash].CurrentTime = this.getTimeDelta(tmpProgressTrackerHash);

		this.solveProgressTrackerStatus(tmpProgressTrackerHash);

		return this.progressTrackers[tmpProgressTrackerHash];
	}

	incrementProgressTrackerStatus(pProgressTrackerHash, pIncrementSize)
	{
		let tmpProgressTrackerHash = (typeof(pProgressTrackerHash) == 'string') ? pProgressTrackerHash : 'DefaultProgressTracker';
		let tmpIncrementSize = parseInt(pIncrementSize);

		if (isNaN(tmpIncrementSize))
		{
			return false;
		}

		if (!this.progressTrackers.hasOwnProperty(tmpProgressTrackerHash))
		{
			this.createProgressTracker(100, tmpProgressTrackerHash);
		}

		this.progressTrackers[tmpProgressTrackerHash].CurrentCount = this.progressTrackers[tmpProgressTrackerHash].CurrentCount + tmpIncrementSize;
		this.progressTrackers[tmpProgressTrackerHash].CurrentTime = this.getTimeDelta(tmpProgressTrackerHash);

		this.solveProgressTrackerStatus(tmpProgressTrackerHash);

		return this.progressTrackers[tmpProgressTrackerHash];
	}

	setProgressTrackerEndTime(pProgressTrackerHash, pCurrentOperations)
	{
		let tmpProgressTrackerHash = (typeof(pProgressTrackerHash) == 'string') ? pProgressTrackerHash : 'DefaultProgressTracker';
		let tmpCurrentOperations = parseInt(pCurrentOperations);

		if (!this.progressTrackers.hasOwnProperty(tmpProgressTrackerHash))
		{
			return false;
		}
		if (!isNaN(tmpCurrentOperations))
		{
			this.updateProgressTrackerStatus(tmpProgressTrackerHash, tmpCurrentOperations);
		}

		this.progressTrackers[tmpProgressTrackerHash].EndTime = this.getTimeDelta(tmpProgressTrackerHash);
		
		this.solveProgressTrackerStatus(tmpProgressTrackerHash);

		return this.progressTrackers[tmpProgressTrackerHash];
	}

	printProgressTrackerStatus(pProgressTrackerHash)
	{
		let tmpProgressTrackerHash = (typeof(pProgressTrackerHash) == 'string') ? pProgressTrackerHash : 'DefaultProgressTracker';
		
		if (!this.progressTrackers.hasOwnProperty(tmpProgressTrackerHash))
		{
			this.log.info(`>> Progress Tracker ${tmpProgressTrackerHash} does not exist!  No stats to display.`);
		}
		else
		{
			const tmpProgressTracker = this.progressTrackers[tmpProgressTrackerHash];

			if (tmpProgressTracker.CurrentCount < 1)
			{
				this.log.info(`>> Progress Tracker ${tmpProgressTracker.Hash} has no completed operations.  ${tmpProgressTracker.CurrentTime}ms have elapsed since it was started.`);
			}
			else if (tmpProgressTracker.EndTime < 1)
			{
				this.log.info(`>> Progress Tracker ${tmpProgressTracker.Hash} is ${tmpProgressTracker.PercentComplete.toFixed(3)}% completed - ${tmpProgressTracker.CurrentCount} / ${tmpProgressTracker.TotalCount} operations over ${tmpProgressTracker.CurrentTime}ms (median ${tmpProgressTracker.AverageOperationTime.toFixed(3)} per).  Estimated completion in ${tmpProgressTracker.EstimatedCompletionTime.toFixed(0)}ms or ${(tmpProgressTracker.EstimatedCompletionTime / 1000 / 60).toFixed(2)}minutes`)
			}
			else
			{
				this.log.info(`>> Progress Tracker ${tmpProgressTracker.Hash} is done and completed ${tmpProgressTracker.CurrentCount} / ${tmpProgressTracker.TotalCount} operations in ${tmpProgressTracker.EndTime}ms.`)
			}
		}
	}

	logMemoryResourcesUsed()
	{

		const tmpResourcesUsed = process.memoryUsage().heapUsed / 1024 / 1024;
		this.log.info(`Memory usage at ${Math.round(tmpResourcesUsed * 100) / 100} MB`);		
	}
	/*
	 * END OF       -->  Logging and Telemetry Helpers
	 ************************************************************************/



	/************************************************************************
	 * BEGINNING OF -->  Script File Persistence Helpers
	 */
	writeFileToRunDataFolderFromObjectSync(pFileName, pObject)
	{
		libFS.writeFileSync(`${this.settings.App.DataFolder}/${pFileName}`, JSON.stringify(pObject, null, 4), 'utf8');
	}

	writeFileToRunDataFolderSync(pFileName, pFileContent)
	{
		libFS.writeFileSync(`${this.settings.App.DataFolder}/${pFileName}`,pFileContent,'utf8');		
	}

	writeTextFileFromArray(pFileName, pFileArray)
	{
		if (!Array.isArray(pFileArray))
		{
			this.log.error(`Attempted to write ${pFileName} but the expected array was not an array.`);
		}
		else
		{
			let tmpOutCSVFile = `${this.settings.App.DataFolder}/${pFileName}`;
			for (let i = 0; i < pFileArray.length; i++)
			{
				libFS.appendFileSync(tmpOutCSVFile, pFileArray[i]+"\n", 'utf8');
			}
		}
	}
	/*
	 * END OF       -->  Script File Persistence Helpers
	 ************************************************************************/



	/************************************************************************
	 * BEGINNING OF -->  Object Enumeration Helpers
	 */
	// fProcessFunction has the following signature:
	// (pObjectKey, pObject, pScriptHost, fOperationComplete)
	enumerateObjectProperties(pObject, fProcessFunction, fEnumerationComplete, pParallelOperations)
	{
		let tmpParallelOperations = (typeof(pParallelOperations) == 'number') ? pParallelOperations : 1;
		let tmpObjectPropertyKeys = Object.keys(pObject);
		let tmpfEnumerationComplete = (typeof(fEnumerationComplete) == 'function') ? fEnumerationComplete : ()=>{};

		libAsync.eachLimit(tmpObjectPropertyKeys, tmpParallelOperations,
			(tmpKey, fOperationComplete) =>
			{
				return fProcessFunction(tmpKey, pObject[tmpKey], this, fOperationComplete);
			}, tmpfEnumerationComplete);
	}

	enumerateArrayEntries(pArray, fProcessFunction, fEnumerationComplete, pParallelOperations)
	{
		let tmpParallelOperations = (typeof(pParallelOperations) == 'number') ? pParallelOperations : 1;
		let tmpfEnumerationComplete = (typeof(fEnumerationComplete) == 'function') ? fEnumerationComplete : ()=>{};

		libAsync.eachLimit(pArray, tmpParallelOperations,
			(tmpEntry, fOperationComplete) =>
			{
				return fProcessFunction(tmpKey, tmpEntry, this, fOperationComplete);
			}, tmpfEnumerationComplete);
	}
	/*
	 * END OF       -->  Object Enumeration Helpers
	 ************************************************************************/
}

module.exports = Choreographic;
