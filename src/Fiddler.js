import { Component , createRef } from "preact";
import { useRef } from "preact/hooks";
import { html } from "htm/preact";
import Split from "split.js";
import { CodeEditor } from "./CodeEditor";
import { saveFile } from "./fileops";
require("./fiddler.scss")


export class Fiddler extends Component{
  constructor(props){
    super(props);
    console.log("Props" , props);
    this.mainContainer = createRef();
    this.editors = createRef();
    this.preview = createRef();
    this.cssEditor = createRef();
    this.jsEditor = createRef();
    this.htmlEditor = createRef();
    this.modified = false;
    this.state = { 
      html: props.html || "",
      js: props.js || "",
      css: props.css || "",
      settings: this.props.settings,
      modified: false,

    }
    this.renderPreview = this.renderPreview.bind(this);
    
  }
  render(){
    
     return html`<div class="Fiddler">
     <div id="toolbar">

     <div id="immediateTools">
     <input type="button" value="Save" 
     onclick=${()=>saveFile(this.props.settings , this.state.html , this.state.css , this.state.js )}
     class=${this.state.modified ? "modified" : "regular"}
     style=${{marginRight: "16px"}}></input>
     <input type="button"
     style=${{marginRight: "16px"}}
     value="Run"
     onclick=${this.renderPreview}
     ></input>
     <input type="checkbox"
     checked=${this.props.settings.autoRun()}
     onclick=${(e)=>{this.props.settings.autoRun(e.target.checked)}  }
     ></input><label>Auto run</label>
     </div>

     <div id="otherTools">
   <input type="button" value="Page Settings"></input>
     </div>

     </div>

     <div class="split vertical" id="mainContainer" ref=${this.mainContainer}>
         
          <div class="split horizontal" id="editors" ref=${this.editors}>
             <div class="editorContainer" id="css" ref=${this.cssEditor}>
               <h3>CSS</h3>
               <${CodeEditor} 
               value=${this.state.css}
               handler=${this.makeHandler('css')}
               lang="css" />
             </div>
             <div class="editorContainer" id="html" ref=${this.htmlEditor}>

               <h3>HTML</h3>
               <${CodeEditor} 
               value=${this.state.html}
               handler=${this.makeHandler('html')}
               lang="html" />
             </div>
             <div class="editorContainer" id="js" ref=${this.jsEditor}>
               <h3>Java Script</h3>
               <${CodeEditor} 
               value=${this.state.js}
               handler=${this.makeHandler('js')}
               lang="js" />
             </div>
          </div>

          <iframe ref=${this.preview}></iframe>

     </div>
     </div>`
  }
  makeHandler(name, initValue){
     
     const f = (v)=> { console.log(name, v)  ; 
     const c = {} ;
     c["modified"] = true;

     c[name]=v ;
     this.setState(c) } ;

     f.bind(this);
     return f;

  }
  componentDidUpdate(){
    this.modified = true;
    if(this.props.settings.autoRun())
    {
      this.renderPreview();
    }
    this.props.settings.title(this.props.title || "")
    
  }
  componentDidMount(){
    Split( [ this.cssEditor.current , this.htmlEditor.current , this.jsEditor.current ] );
    Split( [this.editors.current , this.preview.current] , {direction: 'vertical' , sizes: [30,70]} );
    this.renderPreview();
  }
  renderPreview(){
     this.preview.current.srcdoc = `<html><head>${this.props.settings.headHTML()}
     <style>${this.state.css || ""}</style>
     <script>${this.state.js || ""}</script>
     </head><body>${this.state.html || ""}</body></html>`
  }
}
