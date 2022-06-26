import { Component , createRef } from "preact";
import { useRef } from "preact/hooks";
import { html } from "htm/preact";
import Split from "split.js";
import { CodeEditor } from "./CodeEditor";
import { TheInput } from "./util";
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
      settings: props.settings,
      modified: false,
      showSettings: false,
      filename: props.settings.filename(),
      title: props.settings.title(),
      description: props.settings.description(),
      headHTML: props.settings.headHTML(),
      autoRun: props.settings.autoRun(),
      webViewed: props.settings.webViewed(),
      editor: props.settings.editor(),

    }
    this.renderPreview = this.renderPreview.bind(this);
    
  }
  render(){
    
     return html`<div
     class=${this.state.showSettings ? "Fiddler settings" : "Fiddler main"}>
     <div id="toolbar">

     <div id="immediateTools">
     <input type="button" value="Save" 
     onclick=${()=>{ 
     saveFile(this.props.settings , this.state.html , this.state.css , this.state.js ) ;
     // this.setState({modified: false})
     }}
     class=${this.state.modified ? "modified" : "regular"}
     style=${{marginRight: "16px"}}></input>
     <input type="button"
     style=${{marginRight: "16px"}}
     value="Run"
     onclick=${this.renderPreview}
     ></input>
     <input type="checkbox"
     checked=${this.props.settings.autoRun()}
     onclick=${(e)=>{this.props.settings.autoRun(e.target.checked) ; this.renderPreview()}  }
     ></input><label>Auto run</label>
     </div>

     <div id="otherTools">
   <input type="button" 
   onclick=${()=>this.setState({showSettings: !this.state.showSettings})}
   value=${this.state.showSettings ? "Hide Settings" : "Page Settings"}
   style=${{marginRight: "16px"}}
   ></input>
   <input type="button" value="View Mode"
   onclick=${e=>window.location="#view"}
   ></input>


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
     <div id="settingsContainer">
     <h2>Settings</h2>
               <div class="settingsPanel">
               <div class="left">
               <${TheInput} area=${false} name="filename" title="File name"
               value=${this.state.filename}
               handler=${this.makeHandler("filename")}
               />
               <${TheInput} area=${false} name="title" title="Page title"
               value=${this.state.title}
               handler=${this.makeHandler("title")}
               />
               <${TheInput} area=${true} name="description" 
               title="Page description"
               value=${this.state.description}
               handler=${this.makeHandler("description")}
               />
               <${TheInput} area=${false} name="editor" title="Editor location"
               value=${this.state.editor}
               handler=${this.makeHandler("editor")}
               />
               <label>When viewed on the web:</label>
               <select onchange=${e=>this.makeHandler('webViewed')(e.target.value)}>
                   <option value="result" selected=${this.state.webViewed=='result'}>Show result only</option>
                   <option value="editor" selectd=${this.state.webViewed=='editor'}>Load editor</option>

               </select>
               </div>
               <div class="right" style=${{position:"relative"}}>
               <label>Head HTML</label>
               <div class="editor" style=${{position:"relative", flexGrow: 1}}>
               <${CodeEditor} value=${this.state.headHTML} 
               handler=${this.makeHandler("headHTML")}
               lang="html" />
               </div>
               </div>
               </div>
     </div>

     </div>`
  }
  makeHandler(name, initValue){
     
     const f = (v)=> { 
     console.log(name, v)  ; 
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
    .filename(this.state.filename)
    .title(this.state.title)
    .description(this.state.description)
    .headHTML(this.state.headHTML)
    .webViewed(this.state.webViewed)
    .editor(this.state.editor)
    .autoRun(this.state.autoRun)

    
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
