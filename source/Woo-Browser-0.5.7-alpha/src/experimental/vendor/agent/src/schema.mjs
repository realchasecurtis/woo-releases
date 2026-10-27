// A deliberately small validator for the keywords used by our owned schemas.
export const str = (maxLength=128) => ({type:'string',minLength:1,maxLength});
export const object = (properties,required=Object.keys(properties)) => ({type:'object',properties,required,additionalProperties:false});
const paging={limit:{type:'integer',minimum:1,maximum:50}};
export const inputs={
 'capabilities.read':object({}), 'tabs.list':object(paging,[]),
 'page.inspect':object({tabId:str(),documentRevision:str()}),
 'sites.search':object({query:str(256),scope:{const:'local'},...paging},['query','scope']),
 'projects.list':object(paging,[]), 'projects.inspect':object({projectId:str()}),
 'documentation.read':object({uri:{enum:['woo-agent://docs/help','woo-agent://docs/capabilities','woo-agent://docs/categories']}})
};
export const requestSchema={ $schema:'https://json-schema.org/draft/2020-12/schema',oneOf:Object.entries(inputs).map(([operation,input])=>object({schemaVersion:{const:1},operation:{const:operation},input}))};
export function valid(s,v){
 if(s.oneOf)return s.oneOf.filter(x=>valid(x,v)).length===1;
 if('const'in s&&v!==s.const)return false;
 if(s.enum&&!s.enum.includes(v))return false;
 if(s.type==='object')return v!==null&&typeof v==='object'&&!Array.isArray(v)&&Object.getPrototypeOf(v)===Object.prototype&&s.required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>Object.hasOwn(s.properties,k)&&valid(s.properties[k],v[k]));
 if(s.type==='string')return typeof v==='string'&&v.length>=(s.minLength??0)&&v.length<=s.maxLength;
 if(s.type==='integer')return Number.isSafeInteger(v)&&v>=s.minimum&&v<=s.maximum;
 return true;
}
