import {h , render } from "preact";
import { Fiddler } from "./Fiddler";
import {escapeTags , unescapeTags} from "./util";
import { create as createSettings } from "./settings";
console.log("Loading editor, stage 1");

//ACTIONS
//remove all link tags
const ls = document.head.querySelectorAll("link");
ls.forEach(e=>e.remove());

//
//remove custom JS
//save it's value
const j = document.getElementById("customJS");
const js =  j.innerHTML ;
j.remove();
//remove custom CSS
//save it's value
const c= document.getElementById("customCSS")
const css = c.innerHTML;
c.remove();
//load html source
//save it's value
const ht = document.getElementById("htmlSource");
const html=unescapeTags( ht.innerHTML );
ht.remove();
const settings = createSettings(window.settings || {});


//remove everything inside BODY
document.body.innerHTML = "<!--empty-->"
//load editor 
//    --- render it inside body


const Editor = h(
   Fiddler,
   {css,js,html,settings}

);

render(Editor, document.body)
