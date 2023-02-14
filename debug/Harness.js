let libChoreographic = require(`../source/Choreographic.js`);

let _ScriptHost = new libChoreographic(
    {
        "App": {Hash: 'Development-Harness'}
    });

_ScriptHost.logMemoryResourcesUsed();

let libAsync = _ScriptHost._Dependencies.async;

libAsync.waterfall(
    [
        (fStageComplete) =>
        {
            _ScriptHost.log.info(`Authenticating...`);
            return fStageComplete();
        },
        (fStageComplete) =>
        {
            _ScriptHost.DocumentSet = [];
            return fStageComplete();           
        },
        (fStageComplete) =>
        {
            _ScriptHost.createProgressTracker(_ScriptHost.TotalApprovalActionSteps, 'Bundles');
            return fStageComplete();            
        }
    ],
    (pError)=>
    {
        _ScriptHost.logMemoryResourcesUsed();
        _ScriptHost.log.info(`Hello done...`);        
    }
)
