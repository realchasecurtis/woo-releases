'use strict';
// Neither flags nor renderer settings can turn on an ordinary release build.
exports.mode=({policy,args,profile})=>{
 const requested=args.includes('--download-native-acceptance');
 if(requested){if(policy.nativeAcceptanceBuild!==true||typeof profile!=='string'||!require('node:path').isAbsolute(profile)||!args.includes('--supervised-native-save'))throw Error('Native download acceptance requires a dedicated acceptance build, explicit profile and supervised Save consent');return {enabled:true,acceptance:true};}
 return {enabled:policy.enabled===true,acceptance:false};
};
