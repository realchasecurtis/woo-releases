const {test}=require('node:test'),assert=require('node:assert/strict');
const branding=require('../src/branding.cjs'),pkg=require('../package.json');
test('Woo display name and stable Windows taskbar identity are configured',()=>{const calls=[];branding.configureBranding({setName:x=>calls.push(['name',x]),setAppUserModelId:x=>calls.push(['aumid',x])},'win32');assert.deepEqual(calls,[['name','Woo'],['aumid','Woo.Browser']]);});
test('name correction preserves the existing 0.3 profile directory',()=>{assert.equal(branding.PROFILE_DIRECTORY,'Woo-Foundation-0.3');assert.equal(pkg.productName,'Woo');assert.equal(pkg.version,'0.5.4');});
test('non-Windows configuration does not call the Windows-only setter',()=>{const calls=[];branding.configureBranding({setName:x=>calls.push(x)},'darwin');assert.deepEqual(calls,['Woo']);});





