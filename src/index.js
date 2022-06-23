import {h , render } from "preact";
import { Fiddler } from "./Fiddler";
console.log("Loading editor, stage 1");

//ACTIONS
//
//remove custom JS
//save it's value
const j = document.getElementById("customJS");
const js = j.innerHTML;
j.remove();
//remove custom CSS
//save it's value
const c= document.getElementById("customCSS")
const css = c.innerHTML;
c.remove();
//load html source
//save it's value
const ht = document.getElementById("htmlSource");
const html=ht.innerHTML;
ht.remove();

//remove everything inside BODY
document.body.innerHTML = "<!--empty-->"
//load editor 
//    --- render it inside body

const Editor = h(
   Fiddler,
   {css,js,html}

);

render(Editor, document.body)
