/**
* Unit tests for Choreographic
*
* @license     MIT
*
* @author      Steven Velozo <steven@velozo.com>
*/

var Chai = require("chai");
var Expect = Chai.expect;

let libChoreographic = require('../source/Choreographic.js');

suite
(
	'Choreographic Basic',
	function()
	{
		setup (()=> {} );

		suite
		(
			'Object Sanity',
			()=>
			{
				test
				(
					'The class should initialize itself into a happy little object.',
					(fTestComplete)=>
					{
						let _Choreographic = new libChoreographic({});
						Expect(_Choreographic)
							.to.be.an('object', 'Choreographic should initialize as an object with no parameters.');
						fTestComplete();
					}
				);

			}
		);
	}
);
