import {Component , createRef} from "preact";
import { useRef } from "preact/hooks";
import {html} from "htm/preact";
import {CodeJar} from "codejar";
import {withLineNumbers} from 'codejar/linenumbers';
import Prism from 'prismjs';
require("prismjs/themes/prism-dark.css");
require("./codeeditor.scss");


export class CodeEditor extends Component{
  constructor(props){
    super(props);
    this.container = createRef();
  }

  componentDidMount(){
    this.editor = CodeJar(this.container.current , 
    // withLineNumbers(Prism.highlightElement)
    e=>Prism.highlightElement(e)
    )
    //
    this.editor.updateCode(this.props.value || "");
    this.editor.onUpdate(e=>this.props.handler(e));
  }

  render(){

    return html`<div class="CodeEditor language-${this.props.lang || 'none'}" ref=${this.container}>
      
    </div>`
  }
}

