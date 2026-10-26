'use strict';
// No secret write or auto-generation path. Activation requires later approval.
class UninitializedIdentity {
 status(){return {configured:false,canSign:false,reason:'Real owner identity creation has not been approved.'};}
 sign(){throw Error('Signing unavailable: no approved persistent identity configured');}
}
module.exports={UninitializedIdentity};
