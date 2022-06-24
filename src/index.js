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
const js =  j.innerHTML.trim() ;
j.remove();
//remove custom CSS
//save it's value
const c= document.getElementById("customCSS")
const css = c.innerHTML.trim();
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

const Editor = h(
   Fiddler,
   {css,js,html,settings}
);
//    --- render it inside body
render(Editor, document.body)
