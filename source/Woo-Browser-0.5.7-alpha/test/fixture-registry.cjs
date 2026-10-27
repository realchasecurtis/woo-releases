const real=require('../src/registry.cjs');module.exports={...real,Registry:class extends real.Registry{constructor(dir){super(dir,{allowNewRegistrations:true});}}};
