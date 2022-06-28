import {Component , createRef} from "preact";
import { useRef } from "preact/hooks";
import {html} from "htm/preact";
import { If } from "./If";

const tagsToReplace = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

const replaceToTags = {
  '&amp;':'&',
  '&lt;': '<',
  '&gt;': '>'
}

export function escapeTags(s){
  if(typeof(s)!=='string'){return s};
  const replacer=(tag)=>{return tagsToReplace[tag]||tag}
  return s.replace(/[&<>]/g , replacer);
}
export function unescapeTags(s){
  if(typeof(s)!=='string'){return s};
  const replacer=(tag)=>{return replaceToTags[tag]||tag}
  return s.replace(/&amp;|&lt;|&gt;/g , replacer);
}

function byteCount(s) {
    return encodeURI(s).split(/%..|./).length - 1;
}

function sizeFormat(n){
  if(n<600){return n+"B"}
  return ( Math.round(n/102.4)/10 ) + "Kb";
}

export function objectSize(o){
  return sizeFormat( byteCount(JSON.stringify(o)) );
}


export function TheInput(props){
  const inp = useRef(null);
  const onChange = ()=>{props.handler(inp.current.value)};

  return html`<div class="TheInput">
  <label class="label" for=${props.name || "" }>${props.title}</label>
  <${If} condition=${props.area==true}>
  <textarea ref=${inp} 
  style="min-height: 120px;transition:height .5s"
  class=${"input biginout area"+props.name}
  name=${props.name || ""} 
  onfocus=${(e)=>{
     const bh = e.target.getBoundingClientRect().height;
     const sh = e.target.scrollHeight;
     if(sh>bh){
       e.target.style.height=(sh+16)+"px"
       }
    }}
  onblur=${ (e)=>e.target.style.height="120px" }
  onkeyup=${(e)=>{ 
     const bh = e.target.getBoundingClientRect().height;
     const sh = e.target.scrollHeight;
     if(sh>bh){
       e.target.style.height=(sh+16)+"px"
     }
     onChange()
    }}
  onchange=${(e)=>{ onChange(); }} >
  ${props.value || ""}
  </textarea>
  </${If}>
  <${If} condition=${props.area==false}>
  <input class="input" type="text" ref=${inp} name=${props.name || ""}
  value=${props.value || ""}
  onchange=${onChange}
  ></input>
  </${If}>
  </div>`

}

