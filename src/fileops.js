import { escapeTags } from "./util";

export function toHTML(
   settings,
   html,
   css,
   js
){
  const tpl = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${settings.title()}</title>
  <meta name="description" content="${settings.description()}">
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
      if(window.location.hash==="#view"){
        return;
      }
      if(p.startsWith("http") && 
        window.settings.webViewed==="result" &&
        window.location.hash !== "#edit"
        ){
        return;
      }

      if(p=='file:' || window.location.hash=="#edit"){
          console.log("Loading editor")
          const s = document.createElement("script");
          s.src =  "${settings.editor() || 'fiddler.js'}"
          document.head.appendChild(s);
      }

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

export function saveFile(settings, html, css , js){
   console.info("Saving...")
   const t = toHTML(settings, html, css, js);
   const f = settings.filename();
   saveToDisk(f, t);

}

