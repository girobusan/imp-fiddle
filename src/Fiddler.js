import { Component , createRef } from "preact";
import { useRef } from "preact/hooks";
import { html } from "htm/preact";
import Split from "split.js";
import { CodeEditor } from "./CodeEditor";
import { TheInput } from "./util";
import { If } from "./If";
import { csvParse } from "d3-dsv";
import { saveFile, uploadData } from "./fileops";
require("./fiddler.scss")
const version = VERSION;

function DataBlock(props){
  return html`<div class="DataBlock">
  <div class="dataName">${props.name}</div>
  <div class="dataVar">window.datasets["${props.name}"]</div>
  <div class="deleteData" onclick=${()=>props.delFunction(props.name)}>Delete</div>
  </div>`
}


export class Fiddler extends Component{
  constructor(props){
    super(props);
    console.info("Imp Fiddle, v" + version);
    this.mainContainer = createRef();
    this.editors = createRef();
    this.preview = createRef();
    this.cssEditor = createRef();
    this.jsEditor = createRef();
    this.htmlEditor = createRef();
    this.modified = false;
    this.state = { 
      page: 'main',
      data: props.data,
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
      image: props.settings.image(),

    }
    this.renderPreview = this.renderPreview.bind(this);
    this.addData = this.addData.bind(this);
    this.removeData = this.removeData.bind(this);
    
  }
  render(){
    
     return html`<div
     class=${"Fiddler " + this.state.page}>
     <div id="toolbar">

     <div id="immediateTools">
     <input type="button" value="Save" 
     onclick=${()=>{ 
     saveFile(this.props.settings , this.state.html , this.state.css , this.state.js , this.state.data ) ;
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
     onclick=${(e)=>{this.props.settings.autoRun(e.target.checked) ; 
     this.setState({'autoRun' : e.target.checked}) ;
     this.renderPreview()}  }
     ></input><label>Auto run</label>
     </div>

     <div id="otherTools">

   <input type="button" 
   class="tab main"
   onclick=${()=>this.setState({page: "main"})}
   value="Playground"
   style=${{marginRight: "16px"}}
   ></input>

   <input type="button" 
   class="tab settings"
   onclick=${()=>this.setState({page: "settings"})}
   value="Page Settings"
   style=${{marginRight: "16px"}}
   ></input>

   <input type="button" 
   class="tab data"
   onclick=${()=>this.setState({page: "data"})}
   value="Data"
   style=${{marginRight: "0"}}
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
               <${TheInput} area=${false} name="image" title="Preview image adress"
               value=${this.state.image}
               handler=${this.makeHandler("image")}
               />
               <${TheInput} area=${false} name="editor" title="Editor location"
               value=${this.state.editor}
               handler=${this.makeHandler("editor")}
               />
               <label>When viewed on the web:</label>
               <select onchange=${e=>this.makeHandler('webViewed')(e.target.value)}>
                   <option value="result" selected=${this.state.webViewed=='result'}>Show result (html) only, do not load editor</option>
                   <option value="editor" selected=${this.state.webViewed=='editor'}>Load and show editor</option>

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
     <div id="dataContainer">
     <h2>Attached Data</h2>

     <div class="dataList">
     ${Object.keys( this.state.data ).map(e=>html`<${DataBlock} name=${e} 
     delFunction=${this.removeData}
     />`)}
     </div>
    <input type="button" value="Add JSON or CSV"
    onclick=${()=>uploadData(this.addData)}
    ></input> 

     </div>

     </div>`
  }
  makeHandler(name, initValue){
     
     const f = (v)=> { 
     // console.log(name, v)  ; 
     const c = {} ;
     c["modified"] = true;

     c[name]=v ;
     this.setState(c) } ;

     f.bind(this);
     return f;

  }

  addData(name, data){
    const d = Object.assign({} , this.state.data);
    d[name] = data;
    this.setState({data:d});
  }

  removeData(name){
    if(this.state.data[name]){
      const d = Object.assign({}, this.state.data);
      delete(d[name]);
      this.setState({data: d})
    }
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
    .image(this.state.image)
    .autoRun(this.state.autoRun)

    
  }
  componentDidMount(){
    Split( [ this.cssEditor.current , this.htmlEditor.current , this.jsEditor.current ] );
    Split( [this.editors.current , this.preview.current] , {direction: 'vertical' , sizes: [30,70]} );
    this.renderPreview();
  }
  renderPreview(){
     this.preview.current.srcdoc = `<html><head>
     <script>window.datasets = ${JSON.stringify(this.state.data)}</script>
     ${this.props.settings.headHTML()}
     <style>${this.state.css || ""}</style>
     <script>${this.state.js || ""}</script>
     </head><body>${this.state.html || ""}</body></html>`
  }
}
