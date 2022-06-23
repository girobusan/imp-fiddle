import {Component , createRef} from "preact";
import { useRef } from "preact/hooks";
import {html} from "htm/preact";
import Split from "split.js";
import {CodeEditor} from "./CodeEditor";
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
    this.state = { 
      html: props.html || "",
      js: props.js || "",
      css: props.css || "",

    }
    
  }
  render(){
     return html`<div class="Fiddler">
     <div id="toolbar"></div>

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
     c[name]=v ;
     this.setState(c) } ;

     f.bind(this);
     return f;

  }
  componentDidUpdate(){
    this.renderPreview();
  }
  componentDidMount(){
    Split( [ this.cssEditor.current , this.htmlEditor.current , this.jsEditor.current ] );
    Split( [this.editors.current , this.preview.current] , {direction: 'vertical'} );
    this.renderPreview();
  }
  renderPreview(){
     this.preview.current.srcdoc = `<html><head><style>${this.state.css || ""}</style>
     <script>${this.state.js || ""}</script>
     </head><body>${this.state.html || ""}</body></html>`
  }
}
