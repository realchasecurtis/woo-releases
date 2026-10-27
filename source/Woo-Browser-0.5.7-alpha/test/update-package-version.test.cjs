'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {UpdateChecker,compare}=require('../src/updates.cjs');
test('packaged alpha version starts unconfigured without broadening signed stable manifest versions',()=>{const pkg=require('../package.json');const checker=new UpdateChecker({current:pkg.version,config:null});assert.equal(checker.snapshot().status,'not-configured');assert.equal(checker.currentStable,'0.5.7');assert.equal(checker.prerelease,true);assert.throws(()=>compare('0.5.7-alpha','0.5.7'),/Invalid stable/);for(const current of ['0.5.7-evil','0.5.7-alpha.extra','garbage'])assert.throws(()=>new UpdateChecker({current,config:null}));});
