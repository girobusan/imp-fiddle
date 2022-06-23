import {Component , createRef} from "preact";
import { useRef } from "preact/hooks";
import {html} from "htm/preact";
import {CodeJar} from "codejar";
import Prism from 'prismjs';
require("prismjs/themes/prism-dark.css");
require("./codeeditor.scss");


export class CodeEditor extends Component{
  constructor(props){
    super(props);
    this.container = createRef();
  }

  componentDidMount(){
    this.editor = CodeJar(this.container.current , e=>Prism.highlightElement(e) , {tab: '  '});
  }

  render(){

    return html`<div class="CodeEditor language-${this.props.lang || 'none'}" ref=${this.container}>
      
    </div>`
  }
}

