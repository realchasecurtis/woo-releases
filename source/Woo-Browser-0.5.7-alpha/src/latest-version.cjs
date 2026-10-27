'use strict';
// Main-process only. Renderer input can select this action, never its URL.
const TARGET='https://trywoo.app/#download';
exports.openLatestVersion=async function(command,openExternal){
 if(command!=='latest')throw Error('Invalid latest-version action');
 await openExternal(TARGET);
};
