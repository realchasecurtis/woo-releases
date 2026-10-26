'use strict';
const PRODUCT_NAME='Woo';
const APP_USER_MODEL_ID='Woo.Browser';
// Keep the established profile path despite the display-name correction.
const PROFILE_DIRECTORY='Woo-Foundation-0.3';
function configureBranding(app,platform=process.platform){
 app.setName(PRODUCT_NAME);
 if(platform==='win32')app.setAppUserModelId(APP_USER_MODEL_ID);
}
module.exports={PRODUCT_NAME,APP_USER_MODEL_ID,PROFILE_DIRECTORY,configureBranding};
