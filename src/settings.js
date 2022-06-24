 import { escapeTags , unescapeTags } from "./util"

const STORE = {};
const props = [
   "title" , 
   "description" , 
   "image" , 
   "filename" , //html 
   "headHTML", //html
   "author",
   "keywords",
   "autoRun",
   "editor",
   "webViewed"
   ]
var callback ;

export function create(settings_src , cb){
// console.log("Creating settings wrapper" , settings_src)
  if(cb){callback=cb}
  props.forEach(p=>STORE[p]=settings_src[p] || "");
  return createWrapper();
}

function updated(k,v){
  if(callback){callback(k,v)}
  // console.log("Updated setting" , k)
}

function escapedCopy(){
  return props.reduce( (a,e)=>{a[e]=( STORE[e] || "" ) ; return a}  , {})
  
}

function unescapedCopy(){
  return props.reduce( (a,e)=>{a[e]=unescapeTags( STORE[e] || "" ) ; return a}  , {})
}

function createWrapper(){
   const w = {};
   w.listProps = ()=> props.slice(0);
   w.copy = (escape)=> escape ? escapedCopy() : unescapedCopy();
   props.forEach( p=>{
      w[p] = (v)=>{ if(v===undefined){return unescapeTags( STORE[p] || "" )} ;  
      const ev = escapeTags(v);
      console.log("EV" , p , ev);
      if(STORE[p]===ev){return w}
      STORE[p]=ev ; updated(p,v) ; return w }
   } )
   return w;
}

