import { csvParse } from "d3-dsv";
import { escapeTags } from "./util";

export function toHTML(
   settings,
   html,
   css,
   js,
   data 
){
  const tpl = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${settings.title()}</title>
  <meta name="description" content="${settings.description()}">
  <meta name="og:image" content="${settings.image()}">
  <meta name="og:title" content="${settings.title()}">
  <meta name="og:description" content="${settings.description()}">
  <meta name="twitter:image" content="${settings.image()}">
  <meta name="twitter:card" content="summary_large_image">
  <script>window.datasets=${JSON.stringify(data)}</script>
  ${settings.headHTML()}
  <script>
  window.settings = ${JSON.stringify(settings.copy(true) , null , 2)}
  </script>
  <script>
  window.addEventListener("hashchange" , ()=>history.go(0));
  window.addEventListener(
  "DOMContentLoaded" , 
  function(){
      const p = window.location.protocol;
      const doEdit = function(){

          console.log("Loading editor")
          const s = document.createElement("script");
          s.src =  'fiddler.js'
          document.head.appendChild(s);
      }
      /* console.log("Loaded, proto" , p , "window name" , wn) */
      if(window.location.hash==="#view"){
        return;
      }

      if( window.location.hash==="#edit"){
        doEdit();
        return;
      }

      if(p=='file:' || window.location.hash=="#edit"){
          console.log("Loading editor")
          const s = document.createElement("script");
          s.src =  window.settings.editor || 'fiddler.js'
          document.head.appendChild(s);
          }

      if(window.settings.webViewed==="viewonly" ){
        return;
      }

      if(p.startsWith("http") && window.settings.webViewed==="result"){
        return;
      }
      doEdit();
})
  </script>
  <script id="customJS">${js}</script>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
<style id="customCSS">
${css}
</style>
</head>
<body>
${html}
 <script id="htmlSource" type="text/html">${escapeTags( html )}</script>
</body>
</html>
`;
return tpl;
}

export function saveToDisk(name,content){
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', name);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);

}

export function saveFile(settings, html, css , js , data){
   console.info("Saving...")
   const t = toHTML(settings, html, css, js , data);
   const f = settings.filename();
   saveToDisk(f, t);

}

export function uploadData(cb){
  const e = document.createElement("input");
  e.type="file";
  e.onchange=(evt)=>{
    const f = e.files[0];
      // console.log("file" , f)
      const n = f.name;
      f.text()
      .then(r=>{
      console.log(f.type);
        
        var c = null;
        try{
        c=JSON.parse(r);
        }catch{
         c= csvParse(r);
        }


        if(cb && c){ cb(n,c) }else{
        console.log(n , c);
      }
      })
  }

  document.body.appendChild(e);
  e.click();
  e.remove();
  
}

