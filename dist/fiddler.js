/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/codejar/codejar.js":
/*!*****************************************!*\
  !*** ./node_modules/codejar/codejar.js ***!
  \*****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CodeJar": () => (/* binding */ CodeJar)
/* harmony export */ });
const globalWindow = window;
function CodeJar(editor, highlight, opt = {}) {
    const options = Object.assign({ tab: '\t', indentOn: /[({\[]$/, moveToNewLine: /^[)}\]]/, spellcheck: false, catchTab: true, preserveIdent: true, addClosing: true, history: true, window: globalWindow }, opt);
    const window = options.window;
    const document = window.document;
    let listeners = [];
    let history = [];
    let at = -1;
    let focus = false;
    let callback;
    let prev; // code content prior keydown event
    editor.setAttribute('contenteditable', 'plaintext-only');
    editor.setAttribute('spellcheck', options.spellcheck ? 'true' : 'false');
    editor.style.outline = 'none';
    editor.style.overflowWrap = 'break-word';
    editor.style.overflowY = 'auto';
    editor.style.whiteSpace = 'pre-wrap';
    let isLegacy = false; // true if plaintext-only is not supported
    highlight(editor);
    if (editor.contentEditable !== 'plaintext-only')
        isLegacy = true;
    if (isLegacy)
        editor.setAttribute('contenteditable', 'true');
    const debounceHighlight = debounce(() => {
        const pos = save();
        highlight(editor, pos);
        restore(pos);
    }, 30);
    let recording = false;
    const shouldRecord = (event) => {
        return !isUndo(event) && !isRedo(event)
            && event.key !== 'Meta'
            && event.key !== 'Control'
            && event.key !== 'Alt'
            && !event.key.startsWith('Arrow');
    };
    const debounceRecordHistory = debounce((event) => {
        if (shouldRecord(event)) {
            recordHistory();
            recording = false;
        }
    }, 300);
    const on = (type, fn) => {
        listeners.push([type, fn]);
        editor.addEventListener(type, fn);
    };
    on('keydown', event => {
        if (event.defaultPrevented)
            return;
        prev = toString();
        if (options.preserveIdent)
            handleNewLine(event);
        else
            legacyNewLineFix(event);
        if (options.catchTab)
            handleTabCharacters(event);
        if (options.addClosing)
            handleSelfClosingCharacters(event);
        if (options.history) {
            handleUndoRedo(event);
            if (shouldRecord(event) && !recording) {
                recordHistory();
                recording = true;
            }
        }
        if (isLegacy)
            restore(save());
    });
    on('keyup', event => {
        if (event.defaultPrevented)
            return;
        if (event.isComposing)
            return;
        if (prev !== toString())
            debounceHighlight();
        debounceRecordHistory(event);
        if (callback)
            callback(toString());
    });
    on('focus', _event => {
        focus = true;
    });
    on('blur', _event => {
        focus = false;
    });
    on('paste', event => {
        recordHistory();
        handlePaste(event);
        recordHistory();
        if (callback)
            callback(toString());
    });
    function save() {
        const s = getSelection();
        const pos = { start: 0, end: 0, dir: undefined };
        let { anchorNode, anchorOffset, focusNode, focusOffset } = s;
        if (!anchorNode || !focusNode)
            throw 'error1';
        // Selection anchor and focus are expected to be text nodes,
        // so normalize them.
        if (anchorNode.nodeType === Node.ELEMENT_NODE) {
            const node = document.createTextNode('');
            anchorNode.insertBefore(node, anchorNode.childNodes[anchorOffset]);
            anchorNode = node;
            anchorOffset = 0;
        }
        if (focusNode.nodeType === Node.ELEMENT_NODE) {
            const node = document.createTextNode('');
            focusNode.insertBefore(node, focusNode.childNodes[focusOffset]);
            focusNode = node;
            focusOffset = 0;
        }
        visit(editor, el => {
            if (el === anchorNode && el === focusNode) {
                pos.start += anchorOffset;
                pos.end += focusOffset;
                pos.dir = anchorOffset <= focusOffset ? '->' : '<-';
                return 'stop';
            }
            if (el === anchorNode) {
                pos.start += anchorOffset;
                if (!pos.dir) {
                    pos.dir = '->';
                }
                else {
                    return 'stop';
                }
            }
            else if (el === focusNode) {
                pos.end += focusOffset;
                if (!pos.dir) {
                    pos.dir = '<-';
                }
                else {
                    return 'stop';
                }
            }
            if (el.nodeType === Node.TEXT_NODE) {
                if (pos.dir != '->')
                    pos.start += el.nodeValue.length;
                if (pos.dir != '<-')
                    pos.end += el.nodeValue.length;
            }
        });
        // collapse empty text nodes
        editor.normalize();
        return pos;
    }
    function restore(pos) {
        const s = getSelection();
        let startNode, startOffset = 0;
        let endNode, endOffset = 0;
        if (!pos.dir)
            pos.dir = '->';
        if (pos.start < 0)
            pos.start = 0;
        if (pos.end < 0)
            pos.end = 0;
        // Flip start and end if the direction reversed
        if (pos.dir == '<-') {
            const { start, end } = pos;
            pos.start = end;
            pos.end = start;
        }
        let current = 0;
        visit(editor, el => {
            if (el.nodeType !== Node.TEXT_NODE)
                return;
            const len = (el.nodeValue || '').length;
            if (current + len > pos.start) {
                if (!startNode) {
                    startNode = el;
                    startOffset = pos.start - current;
                }
                if (current + len > pos.end) {
                    endNode = el;
                    endOffset = pos.end - current;
                    return 'stop';
                }
            }
            current += len;
        });
        if (!startNode)
            startNode = editor, startOffset = editor.childNodes.length;
        if (!endNode)
            endNode = editor, endOffset = editor.childNodes.length;
        // Flip back the selection
        if (pos.dir == '<-') {
            [startNode, startOffset, endNode, endOffset] = [endNode, endOffset, startNode, startOffset];
        }
        s.setBaseAndExtent(startNode, startOffset, endNode, endOffset);
    }
    function beforeCursor() {
        const s = getSelection();
        const r0 = s.getRangeAt(0);
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.setEnd(r0.startContainer, r0.startOffset);
        return r.toString();
    }
    function afterCursor() {
        const s = getSelection();
        const r0 = s.getRangeAt(0);
        const r = document.createRange();
        r.selectNodeContents(editor);
        r.setStart(r0.endContainer, r0.endOffset);
        return r.toString();
    }
    function handleNewLine(event) {
        if (event.key === 'Enter') {
            const before = beforeCursor();
            const after = afterCursor();
            let [padding] = findPadding(before);
            let newLinePadding = padding;
            // If last symbol is "{" ident new line
            if (options.indentOn.test(before)) {
                newLinePadding += options.tab;
            }
            // Preserve padding
            if (newLinePadding.length > 0) {
                preventDefault(event);
                event.stopPropagation();
                insert('\n' + newLinePadding);
            }
            else {
                legacyNewLineFix(event);
            }
            // Place adjacent "}" on next line
            if (newLinePadding !== padding && options.moveToNewLine.test(after)) {
                const pos = save();
                insert('\n' + padding);
                restore(pos);
            }
        }
    }
    function legacyNewLineFix(event) {
        // Firefox does not support plaintext-only mode
        // and puts <div><br></div> on Enter. Let's help.
        if (isLegacy && event.key === 'Enter') {
            preventDefault(event);
            event.stopPropagation();
            if (afterCursor() == '') {
                insert('\n ');
                const pos = save();
                pos.start = --pos.end;
                restore(pos);
            }
            else {
                insert('\n');
            }
        }
    }
    function handleSelfClosingCharacters(event) {
        const open = `([{'"`;
        const close = `)]}'"`;
        const codeAfter = afterCursor();
        const codeBefore = beforeCursor();
        const escapeCharacter = codeBefore.substr(codeBefore.length - 1) === '\\';
        const charAfter = codeAfter.substr(0, 1);
        if (close.includes(event.key) && !escapeCharacter && charAfter === event.key) {
            // We already have closing char next to cursor.
            // Move one char to right.
            const pos = save();
            preventDefault(event);
            pos.start = ++pos.end;
            restore(pos);
        }
        else if (open.includes(event.key)
            && !escapeCharacter
            && (`"'`.includes(event.key) || ['', ' ', '\n'].includes(charAfter))) {
            preventDefault(event);
            const pos = save();
            const wrapText = pos.start == pos.end ? '' : getSelection().toString();
            const text = event.key + wrapText + close[open.indexOf(event.key)];
            insert(text);
            pos.start++;
            pos.end++;
            restore(pos);
        }
    }
    function handleTabCharacters(event) {
        if (event.key === 'Tab') {
            preventDefault(event);
            if (event.shiftKey) {
                const before = beforeCursor();
                let [padding, start,] = findPadding(before);
                if (padding.length > 0) {
                    const pos = save();
                    // Remove full length tab or just remaining padding
                    const len = Math.min(options.tab.length, padding.length);
                    restore({ start, end: start + len });
                    document.execCommand('delete');
                    pos.start -= len;
                    pos.end -= len;
                    restore(pos);
                }
            }
            else {
                insert(options.tab);
            }
        }
    }
    function handleUndoRedo(event) {
        if (isUndo(event)) {
            preventDefault(event);
            at--;
            const record = history[at];
            if (record) {
                editor.innerHTML = record.html;
                restore(record.pos);
            }
            if (at < 0)
                at = 0;
        }
        if (isRedo(event)) {
            preventDefault(event);
            at++;
            const record = history[at];
            if (record) {
                editor.innerHTML = record.html;
                restore(record.pos);
            }
            if (at >= history.length)
                at--;
        }
    }
    function recordHistory() {
        if (!focus)
            return;
        const html = editor.innerHTML;
        const pos = save();
        const lastRecord = history[at];
        if (lastRecord) {
            if (lastRecord.html === html
                && lastRecord.pos.start === pos.start
                && lastRecord.pos.end === pos.end)
                return;
        }
        at++;
        history[at] = { html, pos };
        history.splice(at + 1);
        const maxHistory = 300;
        if (at > maxHistory) {
            at = maxHistory;
            history.splice(0, 1);
        }
    }
    function handlePaste(event) {
        preventDefault(event);
        const text = (event.originalEvent || event)
            .clipboardData
            .getData('text/plain')
            .replace(/\r/g, '');
        const pos = save();
        insert(text);
        highlight(editor);
        restore({
            start: Math.min(pos.start, pos.end) + text.length,
            end: Math.min(pos.start, pos.end) + text.length,
            dir: '<-',
        });
    }
    function visit(editor, visitor) {
        const queue = [];
        if (editor.firstChild)
            queue.push(editor.firstChild);
        let el = queue.pop();
        while (el) {
            if (visitor(el) === 'stop')
                break;
            if (el.nextSibling)
                queue.push(el.nextSibling);
            if (el.firstChild)
                queue.push(el.firstChild);
            el = queue.pop();
        }
    }
    function isCtrl(event) {
        return event.metaKey || event.ctrlKey;
    }
    function isUndo(event) {
        return isCtrl(event) && !event.shiftKey && event.code === 'KeyZ';
    }
    function isRedo(event) {
        return isCtrl(event) && event.shiftKey && event.code === 'KeyZ';
    }
    function insert(text) {
        text = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        document.execCommand('insertHTML', false, text);
    }
    function debounce(cb, wait) {
        let timeout = 0;
        return (...args) => {
            clearTimeout(timeout);
            timeout = window.setTimeout(() => cb(...args), wait);
        };
    }
    function findPadding(text) {
        // Find beginning of previous line.
        let i = text.length - 1;
        while (i >= 0 && text[i] !== '\n')
            i--;
        i++;
        // Find padding of the line.
        let j = i;
        while (j < text.length && /[ \t]/.test(text[j]))
            j++;
        return [text.substring(i, j) || '', i, j];
    }
    function toString() {
        return editor.textContent || '';
    }
    function preventDefault(event) {
        event.preventDefault();
    }
    function getSelection() {
        var _a;
        if (((_a = editor.parentNode) === null || _a === void 0 ? void 0 : _a.nodeType) == Node.DOCUMENT_FRAGMENT_NODE) {
            return editor.parentNode.getSelection();
        }
        return window.getSelection();
    }
    return {
        updateOptions(newOptions) {
            Object.assign(options, newOptions);
        },
        updateCode(code) {
            editor.textContent = code;
            highlight(editor);
        },
        onUpdate(cb) {
            callback = cb;
        },
        toString,
        save,
        restore,
        recordHistory,
        destroy() {
            for (let [type, fn] of listeners) {
                editor.removeEventListener(type, fn);
            }
        },
    };
}


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./node_modules/prismjs/themes/prism-dark.css":
/*!*********************************************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./node_modules/prismjs/themes/prism-dark.css ***!
  \*********************************************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, "@charset \"UTF-8\";\n/**\n * prism.js Dark theme for JavaScript, CSS and HTML\n * Based on the slides of the talk “/Reg(exp){2}lained/”\n * @author Lea Verou\n */\ncode[class*=language-],\npre[class*=language-] {\n  color: white;\n  background: none;\n  text-shadow: 0 -0.1em 0.2em black;\n  font-family: Consolas, Monaco, \"Andale Mono\", \"Ubuntu Mono\", monospace;\n  font-size: 1em;\n  text-align: left;\n  white-space: pre;\n  word-spacing: normal;\n  word-break: normal;\n  word-wrap: normal;\n  line-height: 1.5;\n  -moz-tab-size: 4;\n  -o-tab-size: 4;\n  tab-size: 4;\n  -webkit-hyphens: none;\n  -moz-hyphens: none;\n  -ms-hyphens: none;\n  hyphens: none;\n}\n\n@media print {\n  code[class*=language-],\npre[class*=language-] {\n    text-shadow: none;\n  }\n}\npre[class*=language-],\n:not(pre) > code[class*=language-] {\n  background: hsl(30deg, 20%, 25%);\n}\n\n/* Code blocks */\npre[class*=language-] {\n  padding: 1em;\n  margin: 0.5em 0;\n  overflow: auto;\n  border: 0.3em solid hsl(30deg, 20%, 40%);\n  border-radius: 0.5em;\n  box-shadow: 1px 1px 0.5em black inset;\n}\n\n/* Inline code */\n:not(pre) > code[class*=language-] {\n  padding: 0.15em 0.2em 0.05em;\n  border-radius: 0.3em;\n  border: 0.13em solid hsl(30deg, 20%, 40%);\n  box-shadow: 1px 1px 0.3em -0.1em black inset;\n  white-space: normal;\n}\n\n.token.comment,\n.token.prolog,\n.token.doctype,\n.token.cdata {\n  color: hsl(30deg, 20%, 50%);\n}\n\n.token.punctuation {\n  opacity: 0.7;\n}\n\n.token.namespace {\n  opacity: 0.7;\n}\n\n.token.property,\n.token.tag,\n.token.boolean,\n.token.number,\n.token.constant,\n.token.symbol {\n  color: hsl(350deg, 40%, 70%);\n}\n\n.token.selector,\n.token.attr-name,\n.token.string,\n.token.char,\n.token.builtin,\n.token.inserted {\n  color: hsl(75deg, 70%, 60%);\n}\n\n.token.operator,\n.token.entity,\n.token.url,\n.language-css .token.string,\n.style .token.string,\n.token.variable {\n  color: hsl(40deg, 90%, 60%);\n}\n\n.token.atrule,\n.token.attr-value,\n.token.keyword {\n  color: hsl(350deg, 40%, 70%);\n}\n\n.token.regex,\n.token.important {\n  color: #e90;\n}\n\n.token.important,\n.token.bold {\n  font-weight: bold;\n}\n\n.token.italic {\n  font-style: italic;\n}\n\n.token.entity {\n  cursor: help;\n}\n\n.token.deleted {\n  color: red;\n}", "",{"version":3,"sources":["webpack://./node_modules/prismjs/themes/prism-dark.css"],"names":[],"mappings":"AAAA,gBAAgB;AAAhB;;;;EAAA;AAMA;;EAEC,YAAA;EACA,gBAAA;EACA,iCAAA;EACA,sEAAA;EACA,cAAA;EACA,gBAAA;EACA,gBAAA;EACA,oBAAA;EACA,kBAAA;EACA,iBAAA;EACA,gBAAA;EAEA,gBAAA;EACA,cAAA;EACA,WAAA;EAEA,qBAAA;EACA,kBAAA;EACA,iBAAA;EACA,aAAA;AADD;;AAIA;EACC;;IAEC,iBAAA;EADA;AACF;AAIA;;EAEC,gCAAA;AAFD;;AAKA,gBAAA;AACA;EACC,YAAA;EACA,eAAA;EACA,cAAA;EACA,wCAAA;EACA,oBAAA;EACA,qCAAA;AAFD;;AAKA,gBAAA;AACA;EACC,4BAAA;EACA,oBAAA;EACA,yCAAA;EACA,4CAAA;EACA,mBAAA;AAFD;;AAKA;;;;EAIC,2BAAA;AAFD;;AAKA;EACC,YAAA;AAFD;;AAKA;EACC,YAAA;AAFD;;AAKA;;;;;;EAMC,4BAAA;AAFD;;AAKA;;;;;;EAMC,2BAAA;AAFD;;AAKA;;;;;;EAMC,2BAAA;AAFD;;AAKA;;;EAGC,4BAAA;AAFD;;AAKA;;EAEC,WAAA;AAFD;;AAKA;;EAEC,iBAAA;AAFD;;AAIA;EACC,kBAAA;AADD;;AAIA;EACC,YAAA;AADD;;AAIA;EACC,UAAA;AADD","sourcesContent":["/**\n * prism.js Dark theme for JavaScript, CSS and HTML\n * Based on the slides of the talk “/Reg(exp){2}lained/”\n * @author Lea Verou\n */\n\ncode[class*=\"language-\"],\npre[class*=\"language-\"] {\n\tcolor: white;\n\tbackground: none;\n\ttext-shadow: 0 -.1em .2em black;\n\tfont-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;\n\tfont-size: 1em;\n\ttext-align: left;\n\twhite-space: pre;\n\tword-spacing: normal;\n\tword-break: normal;\n\tword-wrap: normal;\n\tline-height: 1.5;\n\n\t-moz-tab-size: 4;\n\t-o-tab-size: 4;\n\ttab-size: 4;\n\n\t-webkit-hyphens: none;\n\t-moz-hyphens: none;\n\t-ms-hyphens: none;\n\thyphens: none;\n}\n\n@media print {\n\tcode[class*=\"language-\"],\n\tpre[class*=\"language-\"] {\n\t\ttext-shadow: none;\n\t}\n}\n\npre[class*=\"language-\"],\n:not(pre) > code[class*=\"language-\"] {\n\tbackground: hsl(30, 20%, 25%);\n}\n\n/* Code blocks */\npre[class*=\"language-\"] {\n\tpadding: 1em;\n\tmargin: .5em 0;\n\toverflow: auto;\n\tborder: .3em solid hsl(30, 20%, 40%);\n\tborder-radius: .5em;\n\tbox-shadow: 1px 1px .5em black inset;\n}\n\n/* Inline code */\n:not(pre) > code[class*=\"language-\"] {\n\tpadding: .15em .2em .05em;\n\tborder-radius: .3em;\n\tborder: .13em solid hsl(30, 20%, 40%);\n\tbox-shadow: 1px 1px .3em -.1em black inset;\n\twhite-space: normal;\n}\n\n.token.comment,\n.token.prolog,\n.token.doctype,\n.token.cdata {\n\tcolor: hsl(30, 20%, 50%);\n}\n\n.token.punctuation {\n\topacity: .7;\n}\n\n.token.namespace {\n\topacity: .7;\n}\n\n.token.property,\n.token.tag,\n.token.boolean,\n.token.number,\n.token.constant,\n.token.symbol {\n\tcolor: hsl(350, 40%, 70%);\n}\n\n.token.selector,\n.token.attr-name,\n.token.string,\n.token.char,\n.token.builtin,\n.token.inserted {\n\tcolor: hsl(75, 70%, 60%);\n}\n\n.token.operator,\n.token.entity,\n.token.url,\n.language-css .token.string,\n.style .token.string,\n.token.variable {\n\tcolor: hsl(40, 90%, 60%);\n}\n\n.token.atrule,\n.token.attr-value,\n.token.keyword {\n\tcolor: hsl(350, 40%, 70%);\n}\n\n.token.regex,\n.token.important {\n\tcolor: #e90;\n}\n\n.token.important,\n.token.bold {\n\tfont-weight: bold;\n}\n.token.italic {\n\tfont-style: italic;\n}\n\n.token.entity {\n\tcursor: help;\n}\n\n.token.deleted {\n\tcolor: red;\n}\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/codeeditor.scss":
/*!**********************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/codeeditor.scss ***!
  \**********************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
// Imports


var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
// Module
___CSS_LOADER_EXPORT___.push([module.id, ".CodeEditor {\n  position: absolute;\n  top: 0px;\n  width: 100%;\n  bottom: 0;\n  background-color: #1f1f1c;\n  color: silver;\n  font-family: monospace;\n  padding: 24px;\n  font-size: 16px;\n  line-height: 120%;\n  scrollbar-width: thin;\n}\n.CodeEditor::-webkit-scrollbar {\n  width: 0.3em;\n  height: 0.3em;\n}\n.CodeEditor::-webkit-scrollbar-button {\n  background: #1f1f1c;\n  height: 1px;\n}\n.CodeEditor::-webkit-scrollbar-track-piece {\n  background: #1f1f1c;\n}\n.CodeEditor::-webkit-scrollbar-thumb {\n  background: #999;\n  border-radius: 0.15em;\n}", "",{"version":3,"sources":["webpack://./src/codeeditor.scss"],"names":[],"mappings":"AAAA;EACE,kBAAA;EACA,QAAA;EACA,WAAA;EACA,SAAA;EACA,yBAAA;EACA,aAAA;EACA,sBAAA;EACA,aAAA;EACA,eAAA;EACA,iBAAA;EACA,qBAAA;AACF;AACE;EACE,YAAA;EACA,aAAA;AACJ;AACE;EACE,mBAAA;EACA,WAAA;AACJ;AACE;EACE,mBAAA;AACJ;AACE;EACE,gBAAA;EACA,qBAAA;AACJ","sourcesContent":[".CodeEditor{\r\n  position: absolute;\r\n  top: 0px;\r\n  width: 100%;\r\n  bottom: 0;\r\n  background-color: #1f1f1c;\r\n  color: silver;\r\n  font-family: monospace;\r\n  padding: 24px;\r\n  font-size: 16px;\r\n  line-height: 120%;\r\n  scrollbar-width: thin;\r\n\r\n  &::-webkit-scrollbar {\r\n    width: .3em;\r\n    height: .3em;\r\n  }\r\n  &::-webkit-scrollbar-button {\r\n    background: #1f1f1c;\r\n    height: 1px;\r\n  }\r\n  &::-webkit-scrollbar-track-piece {\r\n    background: #1f1f1c;\r\n  }\r\n  &::-webkit-scrollbar-thumb {\r\n    background: #999;\r\n    border-radius: .15em;\r\n  }\r\n}\r\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/fiddler.scss":
/*!*******************************************************************************************************!*\
  !*** ./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/fiddler.scss ***!
  \*******************************************************************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/sourceMaps.js */ "./node_modules/css-loader/dist/runtime/sourceMaps.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/api.js */ "./node_modules/css-loader/dist/runtime/api.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../node_modules/css-loader/dist/runtime/getUrl.js */ "./node_modules/css-loader/dist/runtime/getUrl.js");
/* harmony import */ var _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2__);
// Imports



var ___CSS_LOADER_URL_IMPORT_0___ = new URL(/* asset import */ __webpack_require__(/*! data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg== */ "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg=="), __webpack_require__.b);
var ___CSS_LOADER_URL_IMPORT_1___ = new URL(/* asset import */ __webpack_require__(/*! data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII= */ "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII="), __webpack_require__.b);
var ___CSS_LOADER_EXPORT___ = _node_modules_css_loader_dist_runtime_api_js__WEBPACK_IMPORTED_MODULE_1___default()((_node_modules_css_loader_dist_runtime_sourceMaps_js__WEBPACK_IMPORTED_MODULE_0___default()));
var ___CSS_LOADER_URL_REPLACEMENT_0___ = _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default()(___CSS_LOADER_URL_IMPORT_0___);
var ___CSS_LOADER_URL_REPLACEMENT_1___ = _node_modules_css_loader_dist_runtime_getUrl_js__WEBPACK_IMPORTED_MODULE_2___default()(___CSS_LOADER_URL_IMPORT_1___);
// Module
___CSS_LOADER_EXPORT___.push([module.id, "body, html {\n  padding: 0;\n  margin: 0;\n  min-width: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n  font-size: 16px;\n}\nbody *, html * {\n  box-sizing: border-box;\n}\n\n.Fiddler {\n  width: 100%;\n  height: 100vh;\n  background-color: silver;\n  display: flex;\n  flex-direction: column;\n}\n.Fiddler.settings #mainContainer {\n  display: none;\n}\n.Fiddler.main #settingsContainer {\n  display: none;\n}\n.Fiddler #mainContainer, .Fiddler #editors {\n  flex-grow: 1;\n}\n.Fiddler #mainContainer {\n  flex-direction: column;\n}\n.Fiddler #mainContainer iframe {\n  flex-grow: 1;\n  border: none;\n  height: 60%;\n}\n.Fiddler #settingsContainer {\n  padding: 16px;\n}\n\n#editors .editorContainer {\n  flex-grow: 1;\n  position: relative;\n}\n#editors .editorContainer h3 {\n  position: absolute;\n  color: white;\n  opacity: 0.3;\n  z-index: 10;\n  font-size: 13px;\n  font-weight: normal;\n  height: 24px;\n  margin: 0;\n  padding: 4px;\n  padding-left: 12px;\n  pointer-events: none;\n  user-select: none;\n  letter-spacing: 0.05em;\n}\n\n#toolbar {\n  width: 100%;\n  height: 64px;\n  background-color: #666;\n  color: white;\n  padding: 16px;\n  display: flex;\n  flex-direction: row;\n  justify-content: space-between;\n}\n#toolbar input[type=button] {\n  height: 32px;\n  padding-left: 16px;\n  padding-right: 16px;\n  border: none;\n  outline: none;\n  border-radius: 4px;\n}\n#toolbar input[type=button].modified {\n  background-color: orangered;\n}\n\n.settingsPanel {\n  display: flex;\n  flex-direction: row;\n  justify-content: stretch;\n}\n.settingsPanel * {\n  flex-grow: 0.75;\n}\n.settingsPanel .left {\n  padding-right: 16px;\n  margin-bottom: -1rem;\n}\n.settingsPanel .right {\n  flex-grow: 1.5;\n  display: flex;\n  flex-direction: column;\n  justify-content: stretch;\n}\n.settingsPanel label {\n  display: block;\n  font-size: 13px;\n  padding: 6px 4px;\n  flex-grow: 0;\n}\n.settingsPanel input, .settingsPanel textarea, .settingsPanel select {\n  width: 100%;\n  margin-bottom: 1rem;\n  font-size: inherit;\n  border: none;\n  padding: 8px;\n  resize: none;\n}\n.settingsPanel input, .settingsPanel textarea, .settingsPanel .CodeEditor, .settingsPanel select {\n  border-radius: 4px;\n}\n.settingsPanel .CodeEditor {\n  padding: 8px;\n  height: auto;\n}\n@media (max-width: 1000px) {\n  .settingsPanel {\n    flex-direction: column;\n  }\n  .settingsPanel .left {\n    padding-right: 0;\n    margin-bottom: 0;\n  }\n  .settingsPanel .right {\n    min-height: 300px;\n  }\n}\n\n.split {\n  display: flex;\n  flex-grow: 1;\n}\n.split.horizontal {\n  flex-direction: row;\n}\n\n.gutter {\n  background-color: #666;\n  background-repeat: no-repeat;\n  background-position: 50%;\n}\n\n.gutter.gutter-horizontal {\n  background-image: url(" + ___CSS_LOADER_URL_REPLACEMENT_0___ + ");\n  cursor: col-resize;\n}\n\n.gutter.gutter-vertical {\n  background-image: url(" + ___CSS_LOADER_URL_REPLACEMENT_1___ + ");\n  cursor: row-resize;\n}", "",{"version":3,"sources":["webpack://./src/fiddler.scss"],"names":[],"mappings":"AAAA;EACE,UAAA;EACA,SAAA;EACA,eAAA;EACA,yCAAA;EACA,eAAA;AACF;AAAE;EACE,sBAAA;AAEJ;;AAEA;EACE,WAAA;EACA,aAAA;EACA,wBAAA;EACA,aAAA;EACA,sBAAA;AACF;AAEI;EACE,aAAA;AAAN;AAKI;EACE,aAAA;AAHN;AAOE;EACE,YAAA;AALJ;AAQE;EACE,sBAAA;AANJ;AAOI;EACE,YAAA;EACA,YAAA;EACA,WAAA;AALN;AAQE;EACE,aAAA;AANJ;;AAYE;EACE,YAAA;EACA,kBAAA;AATJ;AAUI;EACE,kBAAA;EACA,YAAA;EACA,YAAA;EACA,WAAA;EACA,eAAA;EACA,mBAAA;EACA,YAAA;EACA,SAAA;EACA,YAAA;EACA,kBAAA;EACA,oBAAA;EACA,iBAAA;EACA,sBAAA;AARN;;AAcA;EACE,WAAA;EACA,YAAA;EACA,sBAAA;EACA,YAAA;EACA,aAAA;EACA,aAAA;EACA,mBAAA;EACA,8BAAA;AAXF;AAYE;EACE,YAAA;EACA,kBAAA;EACA,mBAAA;EACA,YAAA;EACA,aAAA;EACA,kBAAA;AAVJ;AAWI;EACE,2BAAA;AATN;;AAcA;EACI,aAAA;EACA,mBAAA;EACA,wBAAA;AAXJ;AAYI;EACE,eAAA;AAVN;AAYI;EACE,mBAAA;EACA,oBAAA;AAVN;AAYI;EACE,cAAA;EACA,aAAA;EACA,sBAAA;EACA,wBAAA;AAVN;AAYI;EACE,cAAA;EACA,eAAA;EACA,gBAAA;EACA,YAAA;AAVN;AAaI;EACE,WAAA;EACA,mBAAA;EACA,kBAAA;EACA,YAAA;EACA,YAAA;EACA,YAAA;AAXN;AAaI;EACE,kBAAA;AAXN;AAaI;EACE,YAAA;EACA,YAAA;AAXN;AAaI;EAvCJ;IAwCM,sBAAA;EAVJ;EAWI;IACE,gBAAA;IACA,gBAAA;EATN;EAWI;IACE,iBAAA;EATN;AACF;;AAaA;EACI,aAAA;EACA,YAAA;AAVJ;AAWI;EAEE,mBAAA;AAVN;;AAcA;EACI,sBAAA;EACA,4BAAA;EACA,wBAAA;AAXJ;;AAcA;EACI,yDAAA;EACA,kBAAA;AAXJ;;AAaA;EACI,yDAAA;EACA,kBAAA;AAVJ","sourcesContent":["body, html{\r\n  padding: 0;\r\n  margin: 0;\r\n  min-width: 100%;\r\n  font-family: Arial, Helvetica, sans-serif;\r\n  font-size: 16px;\r\n  *{\r\n    box-sizing: border-box;\r\n  }\r\n}\r\n\r\n.Fiddler{\r\n  width: 100%;\r\n  height: 100vh;\r\n  background-color: silver;\r\n  display: flex;\r\n  flex-direction: column;\r\n\r\n  &.settings{\r\n    #mainContainer{\r\n      display: none;\r\n    }\r\n  }\r\n\r\n  &.main{\r\n    #settingsContainer{\r\n      display: none;\r\n    }\r\n  }\r\n\r\n  #mainContainer , #editors{\r\n    flex-grow: 1;\r\n  }\r\n\r\n  #mainContainer{\r\n    flex-direction: column;\r\n    iframe{\r\n      flex-grow: 1;\r\n      border: none;\r\n      height: 60%;\r\n    }\r\n  }\r\n  #settingsContainer{\r\n    padding: 16px;\r\n  }\r\n\r\n}\r\n\r\n#editors{\r\n  .editorContainer{\r\n    flex-grow: 1;\r\n    position: relative;\r\n    h3{\r\n      position: absolute;\r\n      color: white;\r\n      opacity: .3;\r\n      z-index: 10;\r\n      font-size: 13px;\r\n      font-weight: normal;\r\n      height: 24px;\r\n      margin: 0;\r\n      padding: 4px;\r\n      padding-left: 12px;\r\n      pointer-events: none;\r\n      user-select: none;\r\n      letter-spacing: 0.05em;\r\n    }\r\n  }\r\n\r\n}\r\n\r\n#toolbar{\r\n  width: 100%;\r\n  height: 64px;\r\n  background-color: #666;\r\n  color: white;\r\n  padding: 16px;\r\n  display: flex;\r\n  flex-direction: row;\r\n  justify-content: space-between;\r\n  input[type=button]{\r\n    height: 32px;\r\n    padding-left: 16px;\r\n    padding-right: 16px;\r\n    border: none;\r\n    outline: none;\r\n    border-radius: 4px;\r\n    &.modified{\r\n      background-color: orangered;\r\n    }\r\n  }\r\n}\r\n\r\n.settingsPanel{\r\n    display: flex;\r\n    flex-direction: row;\r\n    justify-content: stretch;\r\n    *{\r\n      flex-grow: 0.75;\r\n    }\r\n    .left{\r\n      padding-right: 16px;\r\n      margin-bottom: -1rem;\r\n    }\r\n    .right{\r\n      flex-grow: 1.5;\r\n      display: flex;\r\n      flex-direction: column;\r\n      justify-content: stretch;\r\n    }\r\n    label{\r\n      display: block;\r\n      font-size: 13px;\r\n      padding:  6px 4px;\r\n      flex-grow: 0;\r\n\r\n    }\r\n    input, textarea , select{\r\n      width: 100%;\r\n      margin-bottom: 1rem;\r\n      font-size: inherit;\r\n      border: none;\r\n      padding: 8px;\r\n      resize: none;\r\n    }\r\n    input, textarea, .CodeEditor, select{\r\n      border-radius: 4px;\r\n    }\r\n    .CodeEditor{\r\n      padding: 8px ;\r\n      height: auto;\r\n    }\r\n    @media(max-width: 1000px){\r\n      flex-direction: column;\r\n      .left{\r\n        padding-right: 0;\r\n        margin-bottom: 0;\r\n      }\r\n      .right{\r\n        min-height: 300px;\r\n      }\r\n    }\r\n}\r\n\r\n.split {\r\n    display: flex;\r\n    flex-grow: 1;\r\n    &.horizontal//for horizontal  | | | |\r\n    {\r\n      flex-direction: row;\r\n    }\r\n}\r\n\r\n.gutter {\r\n    background-color: #666;\r\n    background-repeat: no-repeat;\r\n    background-position: 50%;\r\n}\r\n\r\n.gutter.gutter-horizontal {\r\n    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');\r\n    cursor: col-resize;\r\n}\r\n.gutter.gutter-vertical {\r\n    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');\r\n    cursor: row-resize;\r\n}\r\n"],"sourceRoot":""}]);
// Exports
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (___CSS_LOADER_EXPORT___);


/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/api.js":
/*!*****************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/api.js ***!
  \*****************************************************/
/***/ ((module) => {

"use strict";


/*
  MIT License http://www.opensource.org/licenses/mit-license.php
  Author Tobias Koppers @sokra
*/
module.exports = function (cssWithMappingToString) {
  var list = []; // return the list of modules as css string

  list.toString = function toString() {
    return this.map(function (item) {
      var content = "";
      var needLayer = typeof item[5] !== "undefined";

      if (item[4]) {
        content += "@supports (".concat(item[4], ") {");
      }

      if (item[2]) {
        content += "@media ".concat(item[2], " {");
      }

      if (needLayer) {
        content += "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {");
      }

      content += cssWithMappingToString(item);

      if (needLayer) {
        content += "}";
      }

      if (item[2]) {
        content += "}";
      }

      if (item[4]) {
        content += "}";
      }

      return content;
    }).join("");
  }; // import a list of modules into the list


  list.i = function i(modules, media, dedupe, supports, layer) {
    if (typeof modules === "string") {
      modules = [[null, modules, undefined]];
    }

    var alreadyImportedModules = {};

    if (dedupe) {
      for (var k = 0; k < this.length; k++) {
        var id = this[k][0];

        if (id != null) {
          alreadyImportedModules[id] = true;
        }
      }
    }

    for (var _k = 0; _k < modules.length; _k++) {
      var item = [].concat(modules[_k]);

      if (dedupe && alreadyImportedModules[item[0]]) {
        continue;
      }

      if (typeof layer !== "undefined") {
        if (typeof item[5] === "undefined") {
          item[5] = layer;
        } else {
          item[1] = "@layer".concat(item[5].length > 0 ? " ".concat(item[5]) : "", " {").concat(item[1], "}");
          item[5] = layer;
        }
      }

      if (media) {
        if (!item[2]) {
          item[2] = media;
        } else {
          item[1] = "@media ".concat(item[2], " {").concat(item[1], "}");
          item[2] = media;
        }
      }

      if (supports) {
        if (!item[4]) {
          item[4] = "".concat(supports);
        } else {
          item[1] = "@supports (".concat(item[4], ") {").concat(item[1], "}");
          item[4] = supports;
        }
      }

      list.push(item);
    }
  };

  return list;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/getUrl.js":
/*!********************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/getUrl.js ***!
  \********************************************************/
/***/ ((module) => {

"use strict";


module.exports = function (url, options) {
  if (!options) {
    options = {};
  }

  if (!url) {
    return url;
  }

  url = String(url.__esModule ? url.default : url); // If url is already wrapped in quotes, remove them

  if (/^['"].*['"]$/.test(url)) {
    url = url.slice(1, -1);
  }

  if (options.hash) {
    url += options.hash;
  } // Should url be wrapped?
  // See https://drafts.csswg.org/css-values-3/#urls


  if (/["'() \t\n]|(%20)/.test(url) || options.needQuotes) {
    return "\"".concat(url.replace(/"/g, '\\"').replace(/\n/g, "\\n"), "\"");
  }

  return url;
};

/***/ }),

/***/ "./node_modules/css-loader/dist/runtime/sourceMaps.js":
/*!************************************************************!*\
  !*** ./node_modules/css-loader/dist/runtime/sourceMaps.js ***!
  \************************************************************/
/***/ ((module) => {

"use strict";


module.exports = function (item) {
  var content = item[1];
  var cssMapping = item[3];

  if (!cssMapping) {
    return content;
  }

  if (typeof btoa === "function") {
    var base64 = btoa(unescape(encodeURIComponent(JSON.stringify(cssMapping))));
    var data = "sourceMappingURL=data:application/json;charset=utf-8;base64,".concat(base64);
    var sourceMapping = "/*# ".concat(data, " */");
    var sourceURLs = cssMapping.sources.map(function (source) {
      return "/*# sourceURL=".concat(cssMapping.sourceRoot || "").concat(source, " */");
    });
    return [content].concat(sourceURLs).concat([sourceMapping]).join("\n");
  }

  return [content].join("\n");
};

/***/ }),

/***/ "./node_modules/htm/dist/htm.module.js":
/*!*********************************************!*\
  !*** ./node_modules/htm/dist/htm.module.js ***!
  \*********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* export default binding */ __WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
var n=function(t,s,r,e){var u;s[0]=0;for(var h=1;h<s.length;h++){var p=s[h++],a=s[h]?(s[0]|=p?1:2,r[s[h++]]):s[++h];3===p?e[0]=a:4===p?e[1]=Object.assign(e[1]||{},a):5===p?(e[1]=e[1]||{})[s[++h]]=a:6===p?e[1][s[++h]]+=a+"":p?(u=t.apply(a,n(t,a,r,["",null])),e.push(u),a[0]?s[0]|=2:(s[h-2]=0,s[h]=u)):e.push(a)}return e},t=new Map;/* harmony default export */ function __WEBPACK_DEFAULT_EXPORT__(s){var r=t.get(this);return r||(r=new Map,t.set(this,r)),(r=n(this,r.get(s)||(r.set(s,r=function(n){for(var t,s,r=1,e="",u="",h=[0],p=function(n){1===r&&(n||(e=e.replace(/^\s*\n\s*|\s*\n\s*$/g,"")))?h.push(0,n,e):3===r&&(n||e)?(h.push(3,n,e),r=2):2===r&&"..."===e&&n?h.push(4,n,0):2===r&&e&&!n?h.push(5,0,!0,e):r>=5&&((e||!n&&5===r)&&(h.push(r,0,e,s),r=6),n&&(h.push(r,n,0,s),r=6)),e=""},a=0;a<n.length;a++){a&&(1===r&&p(),p(a));for(var l=0;l<n[a].length;l++)t=n[a][l],1===r?"<"===t?(p(),h=[h],r=3):e+=t:4===r?"--"===e&&">"===t?(r=1,e=""):e=t+e[0]:u?t===u?u="":e+=t:'"'===t||"'"===t?u=t:">"===t?(p(),r=1):r&&("="===t?(r=5,s=e,e=""):"/"===t&&(r<5||">"===n[a][l+1])?(p(),3===r&&(h=h[0]),r=h,(h=h[0]).push(2,0,r),r=0):" "===t||"\t"===t||"\n"===t||"\r"===t?(p(),r=2):e+=t),3===r&&"!--"===e&&(r=4,h=h[0])}return p(),h}(s)),r),arguments,[])).length>1?r:r[0]}


/***/ }),

/***/ "./node_modules/htm/preact/index.module.js":
/*!*************************************************!*\
  !*** ./node_modules/htm/preact/index.module.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Component": () => (/* reexport safe */ preact__WEBPACK_IMPORTED_MODULE_0__.Component),
/* harmony export */   "h": () => (/* reexport safe */ preact__WEBPACK_IMPORTED_MODULE_0__.h),
/* harmony export */   "html": () => (/* binding */ m),
/* harmony export */   "render": () => (/* reexport safe */ preact__WEBPACK_IMPORTED_MODULE_0__.render)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
/* harmony import */ var htm__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! htm */ "./node_modules/htm/dist/htm.module.js");
var m=htm__WEBPACK_IMPORTED_MODULE_1__["default"].bind(preact__WEBPACK_IMPORTED_MODULE_0__.h);


/***/ }),

/***/ "./node_modules/preact/dist/preact.module.js":
/*!***************************************************!*\
  !*** ./node_modules/preact/dist/preact.module.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Component": () => (/* binding */ _),
/* harmony export */   "Fragment": () => (/* binding */ d),
/* harmony export */   "cloneElement": () => (/* binding */ B),
/* harmony export */   "createContext": () => (/* binding */ D),
/* harmony export */   "createElement": () => (/* binding */ v),
/* harmony export */   "createRef": () => (/* binding */ p),
/* harmony export */   "h": () => (/* binding */ v),
/* harmony export */   "hydrate": () => (/* binding */ q),
/* harmony export */   "isValidElement": () => (/* binding */ i),
/* harmony export */   "options": () => (/* binding */ l),
/* harmony export */   "render": () => (/* binding */ S),
/* harmony export */   "toChildArray": () => (/* binding */ A)
/* harmony export */ });
var n,l,u,i,t,o,r,f,e={},c=[],s=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;function a(n,l){for(var u in l)n[u]=l[u];return n}function h(n){var l=n.parentNode;l&&l.removeChild(n)}function v(l,u,i){var t,o,r,f={};for(r in u)"key"==r?t=u[r]:"ref"==r?o=u[r]:f[r]=u[r];if(arguments.length>2&&(f.children=arguments.length>3?n.call(arguments,2):i),"function"==typeof l&&null!=l.defaultProps)for(r in l.defaultProps)void 0===f[r]&&(f[r]=l.defaultProps[r]);return y(l,f,t,o,null)}function y(n,i,t,o,r){var f={type:n,props:i,key:t,ref:o,__k:null,__:null,__b:0,__e:null,__d:void 0,__c:null,__h:null,constructor:void 0,__v:null==r?++u:r};return null==r&&null!=l.vnode&&l.vnode(f),f}function p(){return{current:null}}function d(n){return n.children}function _(n,l){this.props=n,this.context=l}function k(n,l){if(null==l)return n.__?k(n.__,n.__.__k.indexOf(n)+1):null;for(var u;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e)return u.__e;return"function"==typeof n.type?k(n):null}function b(n){var l,u;if(null!=(n=n.__)&&null!=n.__c){for(n.__e=n.__c.base=null,l=0;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e){n.__e=n.__c.base=u.__e;break}return b(n)}}function m(n){(!n.__d&&(n.__d=!0)&&t.push(n)&&!g.__r++||r!==l.debounceRendering)&&((r=l.debounceRendering)||o)(g)}function g(){for(var n;g.__r=t.length;)n=t.sort(function(n,l){return n.__v.__b-l.__v.__b}),t=[],n.some(function(n){var l,u,i,t,o,r;n.__d&&(o=(t=(l=n).__v).__e,(r=l.__P)&&(u=[],(i=a({},t)).__v=t.__v+1,j(r,t,i,l.__n,void 0!==r.ownerSVGElement,null!=t.__h?[o]:null,u,null==o?k(t):o,t.__h),z(u,t),t.__e!=o&&b(t)))})}function w(n,l,u,i,t,o,r,f,s,a){var h,v,p,_,b,m,g,w=i&&i.__k||c,A=w.length;for(u.__k=[],h=0;h<l.length;h++)if(null!=(_=u.__k[h]=null==(_=l[h])||"boolean"==typeof _?null:"string"==typeof _||"number"==typeof _||"bigint"==typeof _?y(null,_,null,null,_):Array.isArray(_)?y(d,{children:_},null,null,null):_.__b>0?y(_.type,_.props,_.key,null,_.__v):_)){if(_.__=u,_.__b=u.__b+1,null===(p=w[h])||p&&_.key==p.key&&_.type===p.type)w[h]=void 0;else for(v=0;v<A;v++){if((p=w[v])&&_.key==p.key&&_.type===p.type){w[v]=void 0;break}p=null}j(n,_,p=p||e,t,o,r,f,s,a),b=_.__e,(v=_.ref)&&p.ref!=v&&(g||(g=[]),p.ref&&g.push(p.ref,null,_),g.push(v,_.__c||b,_)),null!=b?(null==m&&(m=b),"function"==typeof _.type&&_.__k===p.__k?_.__d=s=x(_,s,n):s=P(n,_,p,w,b,s),"function"==typeof u.type&&(u.__d=s)):s&&p.__e==s&&s.parentNode!=n&&(s=k(p))}for(u.__e=m,h=A;h--;)null!=w[h]&&("function"==typeof u.type&&null!=w[h].__e&&w[h].__e==u.__d&&(u.__d=k(i,h+1)),N(w[h],w[h]));if(g)for(h=0;h<g.length;h++)M(g[h],g[++h],g[++h])}function x(n,l,u){for(var i,t=n.__k,o=0;t&&o<t.length;o++)(i=t[o])&&(i.__=n,l="function"==typeof i.type?x(i,l,u):P(u,i,i,t,i.__e,l));return l}function A(n,l){return l=l||[],null==n||"boolean"==typeof n||(Array.isArray(n)?n.some(function(n){A(n,l)}):l.push(n)),l}function P(n,l,u,i,t,o){var r,f,e;if(void 0!==l.__d)r=l.__d,l.__d=void 0;else if(null==u||t!=o||null==t.parentNode)n:if(null==o||o.parentNode!==n)n.appendChild(t),r=null;else{for(f=o,e=0;(f=f.nextSibling)&&e<i.length;e+=2)if(f==t)break n;n.insertBefore(t,o),r=o}return void 0!==r?r:t.nextSibling}function C(n,l,u,i,t){var o;for(o in u)"children"===o||"key"===o||o in l||H(n,o,null,u[o],i);for(o in l)t&&"function"!=typeof l[o]||"children"===o||"key"===o||"value"===o||"checked"===o||u[o]===l[o]||H(n,o,l[o],u[o],i)}function $(n,l,u){"-"===l[0]?n.setProperty(l,u):n[l]=null==u?"":"number"!=typeof u||s.test(l)?u:u+"px"}function H(n,l,u,i,t){var o;n:if("style"===l)if("string"==typeof u)n.style.cssText=u;else{if("string"==typeof i&&(n.style.cssText=i=""),i)for(l in i)u&&l in u||$(n.style,l,"");if(u)for(l in u)i&&u[l]===i[l]||$(n.style,l,u[l])}else if("o"===l[0]&&"n"===l[1])o=l!==(l=l.replace(/Capture$/,"")),l=l.toLowerCase()in n?l.toLowerCase().slice(2):l.slice(2),n.l||(n.l={}),n.l[l+o]=u,u?i||n.addEventListener(l,o?T:I,o):n.removeEventListener(l,o?T:I,o);else if("dangerouslySetInnerHTML"!==l){if(t)l=l.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if("href"!==l&&"list"!==l&&"form"!==l&&"tabIndex"!==l&&"download"!==l&&l in n)try{n[l]=null==u?"":u;break n}catch(n){}"function"==typeof u||(null!=u&&(!1!==u||"a"===l[0]&&"r"===l[1])?n.setAttribute(l,u):n.removeAttribute(l))}}function I(n){this.l[n.type+!1](l.event?l.event(n):n)}function T(n){this.l[n.type+!0](l.event?l.event(n):n)}function j(n,u,i,t,o,r,f,e,c){var s,h,v,y,p,k,b,m,g,x,A,P,C,$=u.type;if(void 0!==u.constructor)return null;null!=i.__h&&(c=i.__h,e=u.__e=i.__e,u.__h=null,r=[e]),(s=l.__b)&&s(u);try{n:if("function"==typeof $){if(m=u.props,g=(s=$.contextType)&&t[s.__c],x=s?g?g.props.value:s.__:t,i.__c?b=(h=u.__c=i.__c).__=h.__E:("prototype"in $&&$.prototype.render?u.__c=h=new $(m,x):(u.__c=h=new _(m,x),h.constructor=$,h.render=O),g&&g.sub(h),h.props=m,h.state||(h.state={}),h.context=x,h.__n=t,v=h.__d=!0,h.__h=[]),null==h.__s&&(h.__s=h.state),null!=$.getDerivedStateFromProps&&(h.__s==h.state&&(h.__s=a({},h.__s)),a(h.__s,$.getDerivedStateFromProps(m,h.__s))),y=h.props,p=h.state,v)null==$.getDerivedStateFromProps&&null!=h.componentWillMount&&h.componentWillMount(),null!=h.componentDidMount&&h.__h.push(h.componentDidMount);else{if(null==$.getDerivedStateFromProps&&m!==y&&null!=h.componentWillReceiveProps&&h.componentWillReceiveProps(m,x),!h.__e&&null!=h.shouldComponentUpdate&&!1===h.shouldComponentUpdate(m,h.__s,x)||u.__v===i.__v){h.props=m,h.state=h.__s,u.__v!==i.__v&&(h.__d=!1),h.__v=u,u.__e=i.__e,u.__k=i.__k,u.__k.forEach(function(n){n&&(n.__=u)}),h.__h.length&&f.push(h);break n}null!=h.componentWillUpdate&&h.componentWillUpdate(m,h.__s,x),null!=h.componentDidUpdate&&h.__h.push(function(){h.componentDidUpdate(y,p,k)})}if(h.context=x,h.props=m,h.__v=u,h.__P=n,A=l.__r,P=0,"prototype"in $&&$.prototype.render)h.state=h.__s,h.__d=!1,A&&A(u),s=h.render(h.props,h.state,h.context);else do{h.__d=!1,A&&A(u),s=h.render(h.props,h.state,h.context),h.state=h.__s}while(h.__d&&++P<25);h.state=h.__s,null!=h.getChildContext&&(t=a(a({},t),h.getChildContext())),v||null==h.getSnapshotBeforeUpdate||(k=h.getSnapshotBeforeUpdate(y,p)),C=null!=s&&s.type===d&&null==s.key?s.props.children:s,w(n,Array.isArray(C)?C:[C],u,i,t,o,r,f,e,c),h.base=u.__e,u.__h=null,h.__h.length&&f.push(h),b&&(h.__E=h.__=null),h.__e=!1}else null==r&&u.__v===i.__v?(u.__k=i.__k,u.__e=i.__e):u.__e=L(i.__e,u,i,t,o,r,f,c);(s=l.diffed)&&s(u)}catch(n){u.__v=null,(c||null!=r)&&(u.__e=e,u.__h=!!c,r[r.indexOf(e)]=null),l.__e(n,u,i)}}function z(n,u){l.__c&&l.__c(u,n),n.some(function(u){try{n=u.__h,u.__h=[],n.some(function(n){n.call(u)})}catch(n){l.__e(n,u.__v)}})}function L(l,u,i,t,o,r,f,c){var s,a,v,y=i.props,p=u.props,d=u.type,_=0;if("svg"===d&&(o=!0),null!=r)for(;_<r.length;_++)if((s=r[_])&&"setAttribute"in s==!!d&&(d?s.localName===d:3===s.nodeType)){l=s,r[_]=null;break}if(null==l){if(null===d)return document.createTextNode(p);l=o?document.createElementNS("http://www.w3.org/2000/svg",d):document.createElement(d,p.is&&p),r=null,c=!1}if(null===d)y===p||c&&l.data===p||(l.data=p);else{if(r=r&&n.call(l.childNodes),a=(y=i.props||e).dangerouslySetInnerHTML,v=p.dangerouslySetInnerHTML,!c){if(null!=r)for(y={},_=0;_<l.attributes.length;_++)y[l.attributes[_].name]=l.attributes[_].value;(v||a)&&(v&&(a&&v.__html==a.__html||v.__html===l.innerHTML)||(l.innerHTML=v&&v.__html||""))}if(C(l,p,y,o,c),v)u.__k=[];else if(_=u.props.children,w(l,Array.isArray(_)?_:[_],u,i,t,o&&"foreignObject"!==d,r,f,r?r[0]:i.__k&&k(i,0),c),null!=r)for(_=r.length;_--;)null!=r[_]&&h(r[_]);c||("value"in p&&void 0!==(_=p.value)&&(_!==l.value||"progress"===d&&!_||"option"===d&&_!==y.value)&&H(l,"value",_,y.value,!1),"checked"in p&&void 0!==(_=p.checked)&&_!==l.checked&&H(l,"checked",_,y.checked,!1))}return l}function M(n,u,i){try{"function"==typeof n?n(u):n.current=u}catch(n){l.__e(n,i)}}function N(n,u,i){var t,o;if(l.unmount&&l.unmount(n),(t=n.ref)&&(t.current&&t.current!==n.__e||M(t,null,u)),null!=(t=n.__c)){if(t.componentWillUnmount)try{t.componentWillUnmount()}catch(n){l.__e(n,u)}t.base=t.__P=null}if(t=n.__k)for(o=0;o<t.length;o++)t[o]&&N(t[o],u,"function"!=typeof n.type);i||null==n.__e||h(n.__e),n.__e=n.__d=void 0}function O(n,l,u){return this.constructor(n,u)}function S(u,i,t){var o,r,f;l.__&&l.__(u,i),r=(o="function"==typeof t)?null:t&&t.__k||i.__k,f=[],j(i,u=(!o&&t||i).__k=v(d,null,[u]),r||e,e,void 0!==i.ownerSVGElement,!o&&t?[t]:r?null:i.firstChild?n.call(i.childNodes):null,f,!o&&t?t:r?r.__e:i.firstChild,o),z(f,u)}function q(n,l){S(n,l,q)}function B(l,u,i){var t,o,r,f=a({},l.props);for(r in u)"key"==r?t=u[r]:"ref"==r?o=u[r]:f[r]=u[r];return arguments.length>2&&(f.children=arguments.length>3?n.call(arguments,2):i),y(l.type,f,t||l.key,o||l.ref,null)}function D(n,l){var u={__c:l="__cC"+f++,__:n,Consumer:function(n,l){return n.children(l)},Provider:function(n){var u,i;return this.getChildContext||(u=[],(i={})[l]=this,this.getChildContext=function(){return i},this.shouldComponentUpdate=function(n){this.props.value!==n.value&&u.some(m)},this.sub=function(n){u.push(n);var l=n.componentWillUnmount;n.componentWillUnmount=function(){u.splice(u.indexOf(n),1),l&&l.call(n)}}),n.children}};return u.Provider.__=u.Consumer.contextType=u}n=c.slice,l={__e:function(n,l,u,i){for(var t,o,r;l=l.__;)if((t=l.__c)&&!t.__)try{if((o=t.constructor)&&null!=o.getDerivedStateFromError&&(t.setState(o.getDerivedStateFromError(n)),r=t.__d),null!=t.componentDidCatch&&(t.componentDidCatch(n,i||{}),r=t.__d),r)return t.__E=t}catch(l){n=l}throw n}},u=0,i=function(n){return null!=n&&void 0===n.constructor},_.prototype.setState=function(n,l){var u;u=null!=this.__s&&this.__s!==this.state?this.__s:this.__s=a({},this.state),"function"==typeof n&&(n=n(a({},u),this.props)),n&&a(u,n),null!=n&&this.__v&&(l&&this.__h.push(l),m(this))},_.prototype.forceUpdate=function(n){this.__v&&(this.__e=!0,n&&this.__h.push(n),m(this))},_.prototype.render=d,t=[],o="function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout,g.__r=0,f=0;
//# sourceMappingURL=preact.module.js.map


/***/ }),

/***/ "./node_modules/preact/hooks/dist/hooks.module.js":
/*!********************************************************!*\
  !*** ./node_modules/preact/hooks/dist/hooks.module.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "useCallback": () => (/* binding */ T),
/* harmony export */   "useContext": () => (/* binding */ q),
/* harmony export */   "useDebugValue": () => (/* binding */ x),
/* harmony export */   "useEffect": () => (/* binding */ _),
/* harmony export */   "useErrorBoundary": () => (/* binding */ V),
/* harmony export */   "useImperativeHandle": () => (/* binding */ A),
/* harmony export */   "useLayoutEffect": () => (/* binding */ h),
/* harmony export */   "useMemo": () => (/* binding */ F),
/* harmony export */   "useReducer": () => (/* binding */ d),
/* harmony export */   "useRef": () => (/* binding */ s),
/* harmony export */   "useState": () => (/* binding */ y)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
var t,u,r,o,i=0,c=[],f=[],e=preact__WEBPACK_IMPORTED_MODULE_0__.options.__b,a=preact__WEBPACK_IMPORTED_MODULE_0__.options.__r,v=preact__WEBPACK_IMPORTED_MODULE_0__.options.diffed,l=preact__WEBPACK_IMPORTED_MODULE_0__.options.__c,m=preact__WEBPACK_IMPORTED_MODULE_0__.options.unmount;function p(t,r){preact__WEBPACK_IMPORTED_MODULE_0__.options.__h&&preact__WEBPACK_IMPORTED_MODULE_0__.options.__h(u,t,i||r),i=0;var o=u.__H||(u.__H={__:[],__h:[]});return t>=o.__.length&&o.__.push({__V:f}),o.__[t]}function y(n){return i=1,d(z,n)}function d(n,r,o){var i=p(t++,2);return i.t=n,i.__c||(i.__=[o?o(r):z(void 0,r),function(n){var t=i.t(i.__[0],n);i.__[0]!==t&&(i.__=[t,i.__[1]],i.__c.setState({}))}],i.__c=u),i.__}function _(r,o){var i=p(t++,3);!preact__WEBPACK_IMPORTED_MODULE_0__.options.__s&&w(i.__H,o)&&(i.__=r,i.u=o,u.__H.__h.push(i))}function h(r,o){var i=p(t++,4);!preact__WEBPACK_IMPORTED_MODULE_0__.options.__s&&w(i.__H,o)&&(i.__=r,i.u=o,u.__h.push(i))}function s(n){return i=5,F(function(){return{current:n}},[])}function A(n,t,u){i=6,h(function(){return"function"==typeof n?(n(t()),function(){return n(null)}):n?(n.current=t(),function(){return n.current=null}):void 0},null==u?u:u.concat(n))}function F(n,u){var r=p(t++,7);return w(r.__H,u)?(r.__V=n(),r.u=u,r.__h=n,r.__V):r.__}function T(n,t){return i=8,F(function(){return n},t)}function q(n){var r=u.context[n.__c],o=p(t++,9);return o.c=n,r?(null==o.__&&(o.__=!0,r.sub(u)),r.props.value):n.__}function x(t,u){preact__WEBPACK_IMPORTED_MODULE_0__.options.useDebugValue&&preact__WEBPACK_IMPORTED_MODULE_0__.options.useDebugValue(u?u(t):t)}function V(n){var r=p(t++,10),o=y();return r.__=n,u.componentDidCatch||(u.componentDidCatch=function(n){r.__&&r.__(n),o[1](n)}),[o[0],function(){o[1](void 0)}]}function b(){for(var t;t=c.shift();)if(t.__P)try{t.__H.__h.forEach(j),t.__H.__h.forEach(k),t.__H.__h=[]}catch(u){t.__H.__h=[],preact__WEBPACK_IMPORTED_MODULE_0__.options.__e(u,t.__v)}}preact__WEBPACK_IMPORTED_MODULE_0__.options.__b=function(n){u=null,e&&e(n)},preact__WEBPACK_IMPORTED_MODULE_0__.options.__r=function(n){a&&a(n),t=0;var o=(u=n.__c).__H;o&&(r===u?(o.__h=[],u.__h=[],o.__.forEach(function(n){n.__V=f,n.u=void 0})):(o.__h.forEach(j),o.__h.forEach(k),o.__h=[])),r=u},preact__WEBPACK_IMPORTED_MODULE_0__.options.diffed=function(t){v&&v(t);var i=t.__c;i&&i.__H&&(i.__H.__h.length&&(1!==c.push(i)&&o===preact__WEBPACK_IMPORTED_MODULE_0__.options.requestAnimationFrame||((o=preact__WEBPACK_IMPORTED_MODULE_0__.options.requestAnimationFrame)||function(n){var t,u=function(){clearTimeout(r),g&&cancelAnimationFrame(t),setTimeout(n)},r=setTimeout(u,100);g&&(t=requestAnimationFrame(u))})(b)),i.__H.__.forEach(function(n){n.u&&(n.__H=n.u),n.__V!==f&&(n.__=n.__V),n.u=void 0,n.__V=f})),r=u=null},preact__WEBPACK_IMPORTED_MODULE_0__.options.__c=function(t,u){u.some(function(t){try{t.__h.forEach(j),t.__h=t.__h.filter(function(n){return!n.__||k(n)})}catch(r){u.some(function(n){n.__h&&(n.__h=[])}),u=[],preact__WEBPACK_IMPORTED_MODULE_0__.options.__e(r,t.__v)}}),l&&l(t,u)},preact__WEBPACK_IMPORTED_MODULE_0__.options.unmount=function(t){m&&m(t);var u,r=t.__c;r&&r.__H&&(r.__H.__.forEach(function(n){try{j(n)}catch(n){u=n}}),u&&preact__WEBPACK_IMPORTED_MODULE_0__.options.__e(u,r.__v))};var g="function"==typeof requestAnimationFrame;function j(n){var t=u,r=n.__c;"function"==typeof r&&(n.__c=void 0,r()),u=t}function k(n){var t=u;n.__c=n.__(),u=t}function w(n,t){return!n||n.length!==t.length||t.some(function(t,u){return t!==n[u]})}function z(n,t){return"function"==typeof t?t(n):t}
//# sourceMappingURL=hooks.module.js.map


/***/ }),

/***/ "./node_modules/prismjs/prism.js":
/*!***************************************!*\
  !*** ./node_modules/prismjs/prism.js ***!
  \***************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {


/* **********************************************
     Begin prism-core.js
********************************************** */

/// <reference lib="WebWorker"/>

var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
			? self // if in worker
			: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
var Prism = (function (_self) {

	// Private helper vars
	var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
	var uniqueId = 0;

	// The grammar object for plaintext
	var plainTextGrammar = {};


	var _ = {
		/**
		 * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
		 * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
		 * additional languages or plugins yourself.
		 *
		 * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
		 *
		 * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
		 * empty Prism object into the global scope before loading the Prism script like this:
		 *
		 * ```js
		 * window.Prism = window.Prism || {};
		 * Prism.manual = true;
		 * // add a new <script> to load Prism's script
		 * ```
		 *
		 * @default false
		 * @type {boolean}
		 * @memberof Prism
		 * @public
		 */
		manual: _self.Prism && _self.Prism.manual,
		/**
		 * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
		 * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
		 * own worker, you don't want it to do this.
		 *
		 * By setting this value to `true`, Prism will not add its own listeners to the worker.
		 *
		 * You obviously have to change this value before Prism executes. To do this, you can add an
		 * empty Prism object into the global scope before loading the Prism script like this:
		 *
		 * ```js
		 * window.Prism = window.Prism || {};
		 * Prism.disableWorkerMessageHandler = true;
		 * // Load Prism's script
		 * ```
		 *
		 * @default false
		 * @type {boolean}
		 * @memberof Prism
		 * @public
		 */
		disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,

		/**
		 * A namespace for utility methods.
		 *
		 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
		 * change or disappear at any time.
		 *
		 * @namespace
		 * @memberof Prism
		 */
		util: {
			encode: function encode(tokens) {
				if (tokens instanceof Token) {
					return new Token(tokens.type, encode(tokens.content), tokens.alias);
				} else if (Array.isArray(tokens)) {
					return tokens.map(encode);
				} else {
					return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
				}
			},

			/**
			 * Returns the name of the type of the given value.
			 *
			 * @param {any} o
			 * @returns {string}
			 * @example
			 * type(null)      === 'Null'
			 * type(undefined) === 'Undefined'
			 * type(123)       === 'Number'
			 * type('foo')     === 'String'
			 * type(true)      === 'Boolean'
			 * type([1, 2])    === 'Array'
			 * type({})        === 'Object'
			 * type(String)    === 'Function'
			 * type(/abc+/)    === 'RegExp'
			 */
			type: function (o) {
				return Object.prototype.toString.call(o).slice(8, -1);
			},

			/**
			 * Returns a unique number for the given object. Later calls will still return the same number.
			 *
			 * @param {Object} obj
			 * @returns {number}
			 */
			objId: function (obj) {
				if (!obj['__id']) {
					Object.defineProperty(obj, '__id', { value: ++uniqueId });
				}
				return obj['__id'];
			},

			/**
			 * Creates a deep clone of the given object.
			 *
			 * The main intended use of this function is to clone language definitions.
			 *
			 * @param {T} o
			 * @param {Record<number, any>} [visited]
			 * @returns {T}
			 * @template T
			 */
			clone: function deepClone(o, visited) {
				visited = visited || {};

				var clone; var id;
				switch (_.util.type(o)) {
					case 'Object':
						id = _.util.objId(o);
						if (visited[id]) {
							return visited[id];
						}
						clone = /** @type {Record<string, any>} */ ({});
						visited[id] = clone;

						for (var key in o) {
							if (o.hasOwnProperty(key)) {
								clone[key] = deepClone(o[key], visited);
							}
						}

						return /** @type {any} */ (clone);

					case 'Array':
						id = _.util.objId(o);
						if (visited[id]) {
							return visited[id];
						}
						clone = [];
						visited[id] = clone;

						(/** @type {Array} */(/** @type {any} */(o))).forEach(function (v, i) {
							clone[i] = deepClone(v, visited);
						});

						return /** @type {any} */ (clone);

					default:
						return o;
				}
			},

			/**
			 * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
			 *
			 * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
			 *
			 * @param {Element} element
			 * @returns {string}
			 */
			getLanguage: function (element) {
				while (element) {
					var m = lang.exec(element.className);
					if (m) {
						return m[1].toLowerCase();
					}
					element = element.parentElement;
				}
				return 'none';
			},

			/**
			 * Sets the Prism `language-xxxx` class of the given element.
			 *
			 * @param {Element} element
			 * @param {string} language
			 * @returns {void}
			 */
			setLanguage: function (element, language) {
				// remove all `language-xxxx` classes
				// (this might leave behind a leading space)
				element.className = element.className.replace(RegExp(lang, 'gi'), '');

				// add the new `language-xxxx` class
				// (using `classList` will automatically clean up spaces for us)
				element.classList.add('language-' + language);
			},

			/**
			 * Returns the script element that is currently executing.
			 *
			 * This does __not__ work for line script element.
			 *
			 * @returns {HTMLScriptElement | null}
			 */
			currentScript: function () {
				if (typeof document === 'undefined') {
					return null;
				}
				if ('currentScript' in document && 1 < 2 /* hack to trip TS' flow analysis */) {
					return /** @type {any} */ (document.currentScript);
				}

				// IE11 workaround
				// we'll get the src of the current script by parsing IE11's error stack trace
				// this will not work for inline scripts

				try {
					throw new Error();
				} catch (err) {
					// Get file src url from stack. Specifically works with the format of stack traces in IE.
					// A stack will look like this:
					//
					// Error
					//    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
					//    at Global code (http://localhost/components/prism-core.js:606:1)

					var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
					if (src) {
						var scripts = document.getElementsByTagName('script');
						for (var i in scripts) {
							if (scripts[i].src == src) {
								return scripts[i];
							}
						}
					}
					return null;
				}
			},

			/**
			 * Returns whether a given class is active for `element`.
			 *
			 * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
			 * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
			 * given class is just the given class with a `no-` prefix.
			 *
			 * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
			 * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
			 * ancestors have the given class or the negated version of it, then the default activation will be returned.
			 *
			 * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
			 * version of it, the class is considered active.
			 *
			 * @param {Element} element
			 * @param {string} className
			 * @param {boolean} [defaultActivation=false]
			 * @returns {boolean}
			 */
			isActive: function (element, className, defaultActivation) {
				var no = 'no-' + className;

				while (element) {
					var classList = element.classList;
					if (classList.contains(className)) {
						return true;
					}
					if (classList.contains(no)) {
						return false;
					}
					element = element.parentElement;
				}
				return !!defaultActivation;
			}
		},

		/**
		 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
		 *
		 * @namespace
		 * @memberof Prism
		 * @public
		 */
		languages: {
			/**
			 * The grammar for plain, unformatted text.
			 */
			plain: plainTextGrammar,
			plaintext: plainTextGrammar,
			text: plainTextGrammar,
			txt: plainTextGrammar,

			/**
			 * Creates a deep copy of the language with the given id and appends the given tokens.
			 *
			 * If a token in `redef` also appears in the copied language, then the existing token in the copied language
			 * will be overwritten at its original position.
			 *
			 * ## Best practices
			 *
			 * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
			 * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
			 * understand the language definition because, normally, the order of tokens matters in Prism grammars.
			 *
			 * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
			 * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
			 *
			 * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
			 * @param {Grammar} redef The new tokens to append.
			 * @returns {Grammar} The new language created.
			 * @public
			 * @example
			 * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
			 *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
			 *     // at its original position
			 *     'comment': { ... },
			 *     // CSS doesn't have a 'color' token, so this token will be appended
			 *     'color': /\b(?:red|green|blue)\b/
			 * });
			 */
			extend: function (id, redef) {
				var lang = _.util.clone(_.languages[id]);

				for (var key in redef) {
					lang[key] = redef[key];
				}

				return lang;
			},

			/**
			 * Inserts tokens _before_ another token in a language definition or any other grammar.
			 *
			 * ## Usage
			 *
			 * This helper method makes it easy to modify existing languages. For example, the CSS language definition
			 * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
			 * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
			 * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
			 * this:
			 *
			 * ```js
			 * Prism.languages.markup.style = {
			 *     // token
			 * };
			 * ```
			 *
			 * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
			 * before existing tokens. For the CSS example above, you would use it like this:
			 *
			 * ```js
			 * Prism.languages.insertBefore('markup', 'cdata', {
			 *     'style': {
			 *         // token
			 *     }
			 * });
			 * ```
			 *
			 * ## Special cases
			 *
			 * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
			 * will be ignored.
			 *
			 * This behavior can be used to insert tokens after `before`:
			 *
			 * ```js
			 * Prism.languages.insertBefore('markup', 'comment', {
			 *     'comment': Prism.languages.markup.comment,
			 *     // tokens after 'comment'
			 * });
			 * ```
			 *
			 * ## Limitations
			 *
			 * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
			 * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
			 * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
			 * deleting properties which is necessary to insert at arbitrary positions.
			 *
			 * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
			 * Instead, it will create a new object and replace all references to the target object with the new one. This
			 * can be done without temporarily deleting properties, so the iteration order is well-defined.
			 *
			 * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
			 * you hold the target object in a variable, then the value of the variable will not change.
			 *
			 * ```js
			 * var oldMarkup = Prism.languages.markup;
			 * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
			 *
			 * assert(oldMarkup !== Prism.languages.markup);
			 * assert(newMarkup === Prism.languages.markup);
			 * ```
			 *
			 * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
			 * object to be modified.
			 * @param {string} before The key to insert before.
			 * @param {Grammar} insert An object containing the key-value pairs to be inserted.
			 * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
			 * object to be modified.
			 *
			 * Defaults to `Prism.languages`.
			 * @returns {Grammar} The new grammar object.
			 * @public
			 */
			insertBefore: function (inside, before, insert, root) {
				root = root || /** @type {any} */ (_.languages);
				var grammar = root[inside];
				/** @type {Grammar} */
				var ret = {};

				for (var token in grammar) {
					if (grammar.hasOwnProperty(token)) {

						if (token == before) {
							for (var newToken in insert) {
								if (insert.hasOwnProperty(newToken)) {
									ret[newToken] = insert[newToken];
								}
							}
						}

						// Do not insert token which also occur in insert. See #1525
						if (!insert.hasOwnProperty(token)) {
							ret[token] = grammar[token];
						}
					}
				}

				var old = root[inside];
				root[inside] = ret;

				// Update references in other language definitions
				_.languages.DFS(_.languages, function (key, value) {
					if (value === old && key != inside) {
						this[key] = ret;
					}
				});

				return ret;
			},

			// Traverse a language definition with Depth First Search
			DFS: function DFS(o, callback, type, visited) {
				visited = visited || {};

				var objId = _.util.objId;

				for (var i in o) {
					if (o.hasOwnProperty(i)) {
						callback.call(o, i, o[i], type || i);

						var property = o[i];
						var propertyType = _.util.type(property);

						if (propertyType === 'Object' && !visited[objId(property)]) {
							visited[objId(property)] = true;
							DFS(property, callback, null, visited);
						} else if (propertyType === 'Array' && !visited[objId(property)]) {
							visited[objId(property)] = true;
							DFS(property, callback, i, visited);
						}
					}
				}
			}
		},

		plugins: {},

		/**
		 * This is the most high-level function in Prism’s API.
		 * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
		 * each one of them.
		 *
		 * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
		 *
		 * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
		 * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
		 * @memberof Prism
		 * @public
		 */
		highlightAll: function (async, callback) {
			_.highlightAllUnder(document, async, callback);
		},

		/**
		 * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
		 * {@link Prism.highlightElement} on each one of them.
		 *
		 * The following hooks will be run:
		 * 1. `before-highlightall`
		 * 2. `before-all-elements-highlight`
		 * 3. All hooks of {@link Prism.highlightElement} for each element.
		 *
		 * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
		 * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
		 * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
		 * @memberof Prism
		 * @public
		 */
		highlightAllUnder: function (container, async, callback) {
			var env = {
				callback: callback,
				container: container,
				selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
			};

			_.hooks.run('before-highlightall', env);

			env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

			_.hooks.run('before-all-elements-highlight', env);

			for (var i = 0, element; (element = env.elements[i++]);) {
				_.highlightElement(element, async === true, env.callback);
			}
		},

		/**
		 * Highlights the code inside a single element.
		 *
		 * The following hooks will be run:
		 * 1. `before-sanity-check`
		 * 2. `before-highlight`
		 * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
		 * 4. `before-insert`
		 * 5. `after-highlight`
		 * 6. `complete`
		 *
		 * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
		 * the element's language.
		 *
		 * @param {Element} element The element containing the code.
		 * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
		 * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
		 * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
		 * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
		 *
		 * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
		 * asynchronous highlighting to work. You can build your own bundle on the
		 * [Download page](https://prismjs.com/download.html).
		 * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
		 * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
		 * @memberof Prism
		 * @public
		 */
		highlightElement: function (element, async, callback) {
			// Find language
			var language = _.util.getLanguage(element);
			var grammar = _.languages[language];

			// Set language on the element, if not present
			_.util.setLanguage(element, language);

			// Set language on the parent, for styling
			var parent = element.parentElement;
			if (parent && parent.nodeName.toLowerCase() === 'pre') {
				_.util.setLanguage(parent, language);
			}

			var code = element.textContent;

			var env = {
				element: element,
				language: language,
				grammar: grammar,
				code: code
			};

			function insertHighlightedCode(highlightedCode) {
				env.highlightedCode = highlightedCode;

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				_.hooks.run('after-highlight', env);
				_.hooks.run('complete', env);
				callback && callback.call(env.element);
			}

			_.hooks.run('before-sanity-check', env);

			// plugins may change/add the parent/element
			parent = env.element.parentElement;
			if (parent && parent.nodeName.toLowerCase() === 'pre' && !parent.hasAttribute('tabindex')) {
				parent.setAttribute('tabindex', '0');
			}

			if (!env.code) {
				_.hooks.run('complete', env);
				callback && callback.call(env.element);
				return;
			}

			_.hooks.run('before-highlight', env);

			if (!env.grammar) {
				insertHighlightedCode(_.util.encode(env.code));
				return;
			}

			if (async && _self.Worker) {
				var worker = new Worker(_.filename);

				worker.onmessage = function (evt) {
					insertHighlightedCode(evt.data);
				};

				worker.postMessage(JSON.stringify({
					language: env.language,
					code: env.code,
					immediateClose: true
				}));
			} else {
				insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
			}
		},

		/**
		 * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
		 * and the language definitions to use, and returns a string with the HTML produced.
		 *
		 * The following hooks will be run:
		 * 1. `before-tokenize`
		 * 2. `after-tokenize`
		 * 3. `wrap`: On each {@link Token}.
		 *
		 * @param {string} text A string with the code to be highlighted.
		 * @param {Grammar} grammar An object containing the tokens to use.
		 *
		 * Usually a language definition like `Prism.languages.markup`.
		 * @param {string} language The name of the language definition passed to `grammar`.
		 * @returns {string} The highlighted HTML.
		 * @memberof Prism
		 * @public
		 * @example
		 * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
		 */
		highlight: function (text, grammar, language) {
			var env = {
				code: text,
				grammar: grammar,
				language: language
			};
			_.hooks.run('before-tokenize', env);
			if (!env.grammar) {
				throw new Error('The language "' + env.language + '" has no grammar.');
			}
			env.tokens = _.tokenize(env.code, env.grammar);
			_.hooks.run('after-tokenize', env);
			return Token.stringify(_.util.encode(env.tokens), env.language);
		},

		/**
		 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
		 * and the language definitions to use, and returns an array with the tokenized code.
		 *
		 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
		 *
		 * This method could be useful in other contexts as well, as a very crude parser.
		 *
		 * @param {string} text A string with the code to be highlighted.
		 * @param {Grammar} grammar An object containing the tokens to use.
		 *
		 * Usually a language definition like `Prism.languages.markup`.
		 * @returns {TokenStream} An array of strings and tokens, a token stream.
		 * @memberof Prism
		 * @public
		 * @example
		 * let code = `var foo = 0;`;
		 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
		 * tokens.forEach(token => {
		 *     if (token instanceof Prism.Token && token.type === 'number') {
		 *         console.log(`Found numeric literal: ${token.content}`);
		 *     }
		 * });
		 */
		tokenize: function (text, grammar) {
			var rest = grammar.rest;
			if (rest) {
				for (var token in rest) {
					grammar[token] = rest[token];
				}

				delete grammar.rest;
			}

			var tokenList = new LinkedList();
			addAfter(tokenList, tokenList.head, text);

			matchGrammar(text, tokenList, grammar, tokenList.head, 0);

			return toArray(tokenList);
		},

		/**
		 * @namespace
		 * @memberof Prism
		 * @public
		 */
		hooks: {
			all: {},

			/**
			 * Adds the given callback to the list of callbacks for the given hook.
			 *
			 * The callback will be invoked when the hook it is registered for is run.
			 * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
			 *
			 * One callback function can be registered to multiple hooks and the same hook multiple times.
			 *
			 * @param {string} name The name of the hook.
			 * @param {HookCallback} callback The callback function which is given environment variables.
			 * @public
			 */
			add: function (name, callback) {
				var hooks = _.hooks.all;

				hooks[name] = hooks[name] || [];

				hooks[name].push(callback);
			},

			/**
			 * Runs a hook invoking all registered callbacks with the given environment variables.
			 *
			 * Callbacks will be invoked synchronously and in the order in which they were registered.
			 *
			 * @param {string} name The name of the hook.
			 * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
			 * @public
			 */
			run: function (name, env) {
				var callbacks = _.hooks.all[name];

				if (!callbacks || !callbacks.length) {
					return;
				}

				for (var i = 0, callback; (callback = callbacks[i++]);) {
					callback(env);
				}
			}
		},

		Token: Token
	};
	_self.Prism = _;


	// Typescript note:
	// The following can be used to import the Token type in JSDoc:
	//
	//   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

	/**
	 * Creates a new token.
	 *
	 * @param {string} type See {@link Token#type type}
	 * @param {string | TokenStream} content See {@link Token#content content}
	 * @param {string|string[]} [alias] The alias(es) of the token.
	 * @param {string} [matchedStr=""] A copy of the full string this token was created from.
	 * @class
	 * @global
	 * @public
	 */
	function Token(type, content, alias, matchedStr) {
		/**
		 * The type of the token.
		 *
		 * This is usually the key of a pattern in a {@link Grammar}.
		 *
		 * @type {string}
		 * @see GrammarToken
		 * @public
		 */
		this.type = type;
		/**
		 * The strings or tokens contained by this token.
		 *
		 * This will be a token stream if the pattern matched also defined an `inside` grammar.
		 *
		 * @type {string | TokenStream}
		 * @public
		 */
		this.content = content;
		/**
		 * The alias(es) of the token.
		 *
		 * @type {string|string[]}
		 * @see GrammarToken
		 * @public
		 */
		this.alias = alias;
		// Copy of the full string this token was created from
		this.length = (matchedStr || '').length | 0;
	}

	/**
	 * A token stream is an array of strings and {@link Token Token} objects.
	 *
	 * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
	 * them.
	 *
	 * 1. No adjacent strings.
	 * 2. No empty strings.
	 *
	 *    The only exception here is the token stream that only contains the empty string and nothing else.
	 *
	 * @typedef {Array<string | Token>} TokenStream
	 * @global
	 * @public
	 */

	/**
	 * Converts the given token or token stream to an HTML representation.
	 *
	 * The following hooks will be run:
	 * 1. `wrap`: On each {@link Token}.
	 *
	 * @param {string | Token | TokenStream} o The token or token stream to be converted.
	 * @param {string} language The name of current language.
	 * @returns {string} The HTML representation of the token or token stream.
	 * @memberof Token
	 * @static
	 */
	Token.stringify = function stringify(o, language) {
		if (typeof o == 'string') {
			return o;
		}
		if (Array.isArray(o)) {
			var s = '';
			o.forEach(function (e) {
				s += stringify(e, language);
			});
			return s;
		}

		var env = {
			type: o.type,
			content: stringify(o.content, language),
			tag: 'span',
			classes: ['token', o.type],
			attributes: {},
			language: language
		};

		var aliases = o.alias;
		if (aliases) {
			if (Array.isArray(aliases)) {
				Array.prototype.push.apply(env.classes, aliases);
			} else {
				env.classes.push(aliases);
			}
		}

		_.hooks.run('wrap', env);

		var attributes = '';
		for (var name in env.attributes) {
			attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
		}

		return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + attributes + '>' + env.content + '</' + env.tag + '>';
	};

	/**
	 * @param {RegExp} pattern
	 * @param {number} pos
	 * @param {string} text
	 * @param {boolean} lookbehind
	 * @returns {RegExpExecArray | null}
	 */
	function matchPattern(pattern, pos, text, lookbehind) {
		pattern.lastIndex = pos;
		var match = pattern.exec(text);
		if (match && lookbehind && match[1]) {
			// change the match to remove the text matched by the Prism lookbehind group
			var lookbehindLength = match[1].length;
			match.index += lookbehindLength;
			match[0] = match[0].slice(lookbehindLength);
		}
		return match;
	}

	/**
	 * @param {string} text
	 * @param {LinkedList<string | Token>} tokenList
	 * @param {any} grammar
	 * @param {LinkedListNode<string | Token>} startNode
	 * @param {number} startPos
	 * @param {RematchOptions} [rematch]
	 * @returns {void}
	 * @private
	 *
	 * @typedef RematchOptions
	 * @property {string} cause
	 * @property {number} reach
	 */
	function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
		for (var token in grammar) {
			if (!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = Array.isArray(patterns) ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				if (rematch && rematch.cause == token + ',' + j) {
					return;
				}

				var patternObj = patterns[j];
				var inside = patternObj.inside;
				var lookbehind = !!patternObj.lookbehind;
				var greedy = !!patternObj.greedy;
				var alias = patternObj.alias;

				if (greedy && !patternObj.pattern.global) {
					// Without the global flag, lastIndex won't work
					var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
					patternObj.pattern = RegExp(patternObj.pattern.source, flags + 'g');
				}

				/** @type {RegExp} */
				var pattern = patternObj.pattern || patternObj;

				for ( // iterate the token list and keep track of the current token/string position
					var currentNode = startNode.next, pos = startPos;
					currentNode !== tokenList.tail;
					pos += currentNode.value.length, currentNode = currentNode.next
				) {

					if (rematch && pos >= rematch.reach) {
						break;
					}

					var str = currentNode.value;

					if (tokenList.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						return;
					}

					if (str instanceof Token) {
						continue;
					}

					var removeCount = 1; // this is the to parameter of removeBetween
					var match;

					if (greedy) {
						match = matchPattern(pattern, pos, text, lookbehind);
						if (!match || match.index >= text.length) {
							break;
						}

						var from = match.index;
						var to = match.index + match[0].length;
						var p = pos;

						// find the node that contains the match
						p += currentNode.value.length;
						while (from >= p) {
							currentNode = currentNode.next;
							p += currentNode.value.length;
						}
						// adjust pos (and p)
						p -= currentNode.value.length;
						pos = p;

						// the current node is a Token, then the match starts inside another Token, which is invalid
						if (currentNode.value instanceof Token) {
							continue;
						}

						// find the last node which is affected by this match
						for (
							var k = currentNode;
							k !== tokenList.tail && (p < to || typeof k.value === 'string');
							k = k.next
						) {
							removeCount++;
							p += k.value.length;
						}
						removeCount--;

						// replace with the new match
						str = text.slice(pos, p);
						match.index -= pos;
					} else {
						match = matchPattern(pattern, 0, str, lookbehind);
						if (!match) {
							continue;
						}
					}

					// eslint-disable-next-line no-redeclare
					var from = match.index;
					var matchStr = match[0];
					var before = str.slice(0, from);
					var after = str.slice(from + matchStr.length);

					var reach = pos + str.length;
					if (rematch && reach > rematch.reach) {
						rematch.reach = reach;
					}

					var removeFrom = currentNode.prev;

					if (before) {
						removeFrom = addAfter(tokenList, removeFrom, before);
						pos += before.length;
					}

					removeRange(tokenList, removeFrom, removeCount);

					var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
					currentNode = addAfter(tokenList, removeFrom, wrapped);

					if (after) {
						addAfter(tokenList, currentNode, after);
					}

					if (removeCount > 1) {
						// at least one Token object was removed, so we have to do some rematching
						// this can only happen if the current pattern is greedy

						/** @type {RematchOptions} */
						var nestedRematch = {
							cause: token + ',' + j,
							reach: reach
						};
						matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

						// the reach might have been extended because of the rematching
						if (rematch && nestedRematch.reach > rematch.reach) {
							rematch.reach = nestedRematch.reach;
						}
					}
				}
			}
		}
	}

	/**
	 * @typedef LinkedListNode
	 * @property {T} value
	 * @property {LinkedListNode<T> | null} prev The previous node.
	 * @property {LinkedListNode<T> | null} next The next node.
	 * @template T
	 * @private
	 */

	/**
	 * @template T
	 * @private
	 */
	function LinkedList() {
		/** @type {LinkedListNode<T>} */
		var head = { value: null, prev: null, next: null };
		/** @type {LinkedListNode<T>} */
		var tail = { value: null, prev: head, next: null };
		head.next = tail;

		/** @type {LinkedListNode<T>} */
		this.head = head;
		/** @type {LinkedListNode<T>} */
		this.tail = tail;
		this.length = 0;
	}

	/**
	 * Adds a new node with the given value to the list.
	 *
	 * @param {LinkedList<T>} list
	 * @param {LinkedListNode<T>} node
	 * @param {T} value
	 * @returns {LinkedListNode<T>} The added node.
	 * @template T
	 */
	function addAfter(list, node, value) {
		// assumes that node != list.tail && values.length >= 0
		var next = node.next;

		var newNode = { value: value, prev: node, next: next };
		node.next = newNode;
		next.prev = newNode;
		list.length++;

		return newNode;
	}
	/**
	 * Removes `count` nodes after the given node. The given node will not be removed.
	 *
	 * @param {LinkedList<T>} list
	 * @param {LinkedListNode<T>} node
	 * @param {number} count
	 * @template T
	 */
	function removeRange(list, node, count) {
		var next = node.next;
		for (var i = 0; i < count && next !== list.tail; i++) {
			next = next.next;
		}
		node.next = next;
		next.prev = node;
		list.length -= i;
	}
	/**
	 * @param {LinkedList<T>} list
	 * @returns {T[]}
	 * @template T
	 */
	function toArray(list) {
		var array = [];
		var node = list.head.next;
		while (node !== list.tail) {
			array.push(node.value);
			node = node.next;
		}
		return array;
	}


	if (!_self.document) {
		if (!_self.addEventListener) {
			// in Node.js
			return _;
		}

		if (!_.disableWorkerMessageHandler) {
			// In worker
			_self.addEventListener('message', function (evt) {
				var message = JSON.parse(evt.data);
				var lang = message.language;
				var code = message.code;
				var immediateClose = message.immediateClose;

				_self.postMessage(_.highlight(code, _.languages[lang], lang));
				if (immediateClose) {
					_self.close();
				}
			}, false);
		}

		return _;
	}

	// Get current script and highlight
	var script = _.util.currentScript();

	if (script) {
		_.filename = script.src;

		if (script.hasAttribute('data-manual')) {
			_.manual = true;
		}
	}

	function highlightAutomaticallyCallback() {
		if (!_.manual) {
			_.highlightAll();
		}
	}

	if (!_.manual) {
		// If the document state is "loading", then we'll use DOMContentLoaded.
		// If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
		// DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
		// might take longer one animation frame to execute which can create a race condition where only some plugins have
		// been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
		// See https://github.com/PrismJS/prism/issues/2102
		var readyState = document.readyState;
		if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
			document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
		} else {
			if (window.requestAnimationFrame) {
				window.requestAnimationFrame(highlightAutomaticallyCallback);
			} else {
				window.setTimeout(highlightAutomaticallyCallback, 16);
			}
		}
	}

	return _;

}(_self));

if ( true && module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof __webpack_require__.g !== 'undefined') {
	__webpack_require__.g.Prism = Prism;
}

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * A function which will invoked after an element was successfully highlighted.
 *
 * @callback HighlightCallback
 * @param {Element} element The element successfully highlighted.
 * @returns {void}
 * @global
 * @public
 */

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */


/* **********************************************
     Begin prism-markup.js
********************************************** */

Prism.languages.markup = {
	'comment': {
		pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
		greedy: true
	},
	'prolog': {
		pattern: /<\?[\s\S]+?\?>/,
		greedy: true
	},
	'doctype': {
		// https://www.w3.org/TR/xml/#NT-doctypedecl
		pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
		greedy: true,
		inside: {
			'internal-subset': {
				pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
				lookbehind: true,
				greedy: true,
				inside: null // see below
			},
			'string': {
				pattern: /"[^"]*"|'[^']*'/,
				greedy: true
			},
			'punctuation': /^<!|>$|[[\]]/,
			'doctype-tag': /^DOCTYPE/i,
			'name': /[^\s<>'"]+/
		}
	},
	'cdata': {
		pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
		greedy: true
	},
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
		greedy: true,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'special-attr': [],
			'attr-value': {
				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
				inside: {
					'punctuation': [
						{
							pattern: /^=/,
							alias: 'attr-equals'
						},
						/"|'/
					]
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': [
		{
			pattern: /&[\da-z]{1,8};/i,
			alias: 'named-entity'
		},
		/&#x?[\da-f]{1,8};/i
	]
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
	Prism.languages.markup['entity'];
Prism.languages.markup['doctype'].inside['internal-subset'].inside = Prism.languages.markup;

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
	/**
	 * Adds an inlined language to markup.
	 *
	 * An example of an inlined language is CSS with `<style>` tags.
	 *
	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addInlined('style', 'css');
	 */
	value: function addInlined(tagName, lang) {
		var includedCdataInside = {};
		includedCdataInside['language-' + lang] = {
			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
			lookbehind: true,
			inside: Prism.languages[lang]
		};
		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

		var inside = {
			'included-cdata': {
				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
				inside: includedCdataInside
			}
		};
		inside['language-' + lang] = {
			pattern: /[\s\S]+/,
			inside: Prism.languages[lang]
		};

		var def = {};
		def[tagName] = {
			pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function () { return tagName; }), 'i'),
			lookbehind: true,
			greedy: true,
			inside: inside
		};

		Prism.languages.insertBefore('markup', 'cdata', def);
	}
});
Object.defineProperty(Prism.languages.markup.tag, 'addAttribute', {
	/**
	 * Adds an pattern to highlight languages embedded in HTML attributes.
	 *
	 * An example of an inlined language is CSS with `style` attributes.
	 *
	 * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addAttribute('style', 'css');
	 */
	value: function (attrName, lang) {
		Prism.languages.markup.tag.inside['special-attr'].push({
			pattern: RegExp(
				/(^|["'\s])/.source + '(?:' + attrName + ')' + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
				'i'
			),
			lookbehind: true,
			inside: {
				'attr-name': /^[^\s=]+/,
				'attr-value': {
					pattern: /=[\s\S]+/,
					inside: {
						'value': {
							pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
							lookbehind: true,
							alias: [lang, 'language-' + lang],
							inside: Prism.languages[lang]
						},
						'punctuation': [
							{
								pattern: /^=/,
								alias: 'attr-equals'
							},
							/"|'/
						]
					}
				}
			}
		});
	}
});

Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.ssml = Prism.languages.xml;
Prism.languages.atom = Prism.languages.xml;
Prism.languages.rss = Prism.languages.xml;


/* **********************************************
     Begin prism-css.js
********************************************** */

(function (Prism) {

	var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

	Prism.languages.css = {
		'comment': /\/\*[\s\S]*?\*\//,
		'atrule': {
			pattern: /@[\w-](?:[^;{\s]|\s+(?![\s{]))*(?:;|(?=\s*\{))/,
			inside: {
				'rule': /^@[\w-]+/,
				'selector-function-argument': {
					pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
					lookbehind: true,
					alias: 'selector'
				},
				'keyword': {
					pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
					lookbehind: true
				}
				// See rest below
			}
		},
		'url': {
			// https://drafts.csswg.org/css-values-3/#urls
			pattern: RegExp('\\burl\\((?:' + string.source + '|' + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)', 'i'),
			greedy: true,
			inside: {
				'function': /^url/i,
				'punctuation': /^\(|\)$/,
				'string': {
					pattern: RegExp('^' + string.source + '$'),
					alias: 'url'
				}
			}
		},
		'selector': {
			pattern: RegExp('(^|[{}\\s])[^{}\\s](?:[^{};"\'\\s]|\\s+(?![\\s{])|' + string.source + ')*(?=\\s*\\{)'),
			lookbehind: true
		},
		'string': {
			pattern: string,
			greedy: true
		},
		'property': {
			pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
			lookbehind: true
		},
		'important': /!important\b/i,
		'function': {
			pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
			lookbehind: true
		},
		'punctuation': /[(){};:,]/
	};

	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

	var markup = Prism.languages.markup;
	if (markup) {
		markup.tag.addInlined('style', 'css');
		markup.tag.addAttribute('style', 'css');
	}

}(Prism));


/* **********************************************
     Begin prism-clike.js
********************************************** */

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
			lookbehind: true,
			greedy: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*/,
			lookbehind: true,
			greedy: true
		}
	],
	'string': {
		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'class-name': {
		pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
		lookbehind: true,
		inside: {
			'punctuation': /[.\\]/
		}
	},
	'keyword': /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
	'boolean': /\b(?:false|true)\b/,
	'function': /\b\w+(?=\()/,
	'number': /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
	'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
	'punctuation': /[{}[\];(),.:]/
};


/* **********************************************
     Begin prism-javascript.js
********************************************** */

Prism.languages.javascript = Prism.languages.extend('clike', {
	'class-name': [
		Prism.languages.clike['class-name'],
		{
			pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
			lookbehind: true
		}
	],
	'keyword': [
		{
			pattern: /((?:^|\})\s*)catch\b/,
			lookbehind: true
		},
		{
			pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
			lookbehind: true
		},
	],
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
	'number': {
		pattern: RegExp(
			/(^|[^\w$])/.source +
			'(?:' +
			(
				// constant
				/NaN|Infinity/.source +
				'|' +
				// binary integer
				/0[bB][01]+(?:_[01]+)*n?/.source +
				'|' +
				// octal integer
				/0[oO][0-7]+(?:_[0-7]+)*n?/.source +
				'|' +
				// hexadecimal integer
				/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source +
				'|' +
				// decimal bigint
				/\d+(?:_\d+)*n/.source +
				'|' +
				// decimal number (integer or float) but no bigint
				/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source
			) +
			')' +
			/(?![\w$])/.source
		),
		lookbehind: true
	},
	'operator': /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
});

Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: RegExp(
			// lookbehind
			// eslint-disable-next-line regexp/no-dupe-characters-character-class
			/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source +
			// Regex pattern:
			// There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
			// classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
			// with the only syntax, so we have to define 2 different regex patterns.
			/\//.source +
			'(?:' +
			/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source +
			'|' +
			// `v` flag syntax. This supports 3 levels of nested character classes.
			/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source +
			')' +
			// lookahead
			/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
		),
		lookbehind: true,
		greedy: true,
		inside: {
			'regex-source': {
				pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
				lookbehind: true,
				alias: 'language-regex',
				inside: Prism.languages.regex
			},
			'regex-delimiter': /^\/|\/$/,
			'regex-flags': /^[a-z]+$/,
		}
	},
	// This must be declared before keyword because we use "function" inside the look-forward
	'function-variable': {
		pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
		alias: 'function'
	},
	'parameter': [
		{
			pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		}
	],
	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});

Prism.languages.insertBefore('javascript', 'string', {
	'hashbang': {
		pattern: /^#!.*/,
		greedy: true,
		alias: 'comment'
	},
	'template-string': {
		pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
		greedy: true,
		inside: {
			'template-punctuation': {
				pattern: /^`|`$/,
				alias: 'string'
			},
			'interpolation': {
				pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
				lookbehind: true,
				inside: {
					'interpolation-punctuation': {
						pattern: /^\$\{|\}$/,
						alias: 'punctuation'
					},
					rest: Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	},
	'string-property': {
		pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
		lookbehind: true,
		greedy: true,
		alias: 'property'
	}
});

Prism.languages.insertBefore('javascript', 'operator', {
	'literal-property': {
		pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
		lookbehind: true,
		alias: 'property'
	},
});

if (Prism.languages.markup) {
	Prism.languages.markup.tag.addInlined('script', 'javascript');

	// add attribute support for all DOM events.
	// https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
	Prism.languages.markup.tag.addAttribute(
		/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
		'javascript'
	);
}

Prism.languages.js = Prism.languages.javascript;


/* **********************************************
     Begin prism-file-highlight.js
********************************************** */

(function () {

	if (typeof Prism === 'undefined' || typeof document === 'undefined') {
		return;
	}

	// https://developer.mozilla.org/en-US/docs/Web/API/Element/matches#Polyfill
	if (!Element.prototype.matches) {
		Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
	}

	var LOADING_MESSAGE = 'Loading…';
	var FAILURE_MESSAGE = function (status, message) {
		return '✖ Error ' + status + ' while fetching file: ' + message;
	};
	var FAILURE_EMPTY_MESSAGE = '✖ Error: File does not exist or is empty';

	var EXTENSIONS = {
		'js': 'javascript',
		'py': 'python',
		'rb': 'ruby',
		'ps1': 'powershell',
		'psm1': 'powershell',
		'sh': 'bash',
		'bat': 'batch',
		'h': 'c',
		'tex': 'latex'
	};

	var STATUS_ATTR = 'data-src-status';
	var STATUS_LOADING = 'loading';
	var STATUS_LOADED = 'loaded';
	var STATUS_FAILED = 'failed';

	var SELECTOR = 'pre[data-src]:not([' + STATUS_ATTR + '="' + STATUS_LOADED + '"])'
		+ ':not([' + STATUS_ATTR + '="' + STATUS_LOADING + '"])';

	/**
	 * Loads the given file.
	 *
	 * @param {string} src The URL or path of the source file to load.
	 * @param {(result: string) => void} success
	 * @param {(reason: string) => void} error
	 */
	function loadFile(src, success, error) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', src, true);
		xhr.onreadystatechange = function () {
			if (xhr.readyState == 4) {
				if (xhr.status < 400 && xhr.responseText) {
					success(xhr.responseText);
				} else {
					if (xhr.status >= 400) {
						error(FAILURE_MESSAGE(xhr.status, xhr.statusText));
					} else {
						error(FAILURE_EMPTY_MESSAGE);
					}
				}
			}
		};
		xhr.send(null);
	}

	/**
	 * Parses the given range.
	 *
	 * This returns a range with inclusive ends.
	 *
	 * @param {string | null | undefined} range
	 * @returns {[number, number | undefined] | undefined}
	 */
	function parseRange(range) {
		var m = /^\s*(\d+)\s*(?:(,)\s*(?:(\d+)\s*)?)?$/.exec(range || '');
		if (m) {
			var start = Number(m[1]);
			var comma = m[2];
			var end = m[3];

			if (!comma) {
				return [start, start];
			}
			if (!end) {
				return [start, undefined];
			}
			return [start, Number(end)];
		}
		return undefined;
	}

	Prism.hooks.add('before-highlightall', function (env) {
		env.selector += ', ' + SELECTOR;
	});

	Prism.hooks.add('before-sanity-check', function (env) {
		var pre = /** @type {HTMLPreElement} */ (env.element);
		if (pre.matches(SELECTOR)) {
			env.code = ''; // fast-path the whole thing and go to complete

			pre.setAttribute(STATUS_ATTR, STATUS_LOADING); // mark as loading

			// add code element with loading message
			var code = pre.appendChild(document.createElement('CODE'));
			code.textContent = LOADING_MESSAGE;

			var src = pre.getAttribute('data-src');

			var language = env.language;
			if (language === 'none') {
				// the language might be 'none' because there is no language set;
				// in this case, we want to use the extension as the language
				var extension = (/\.(\w+)$/.exec(src) || [, 'none'])[1];
				language = EXTENSIONS[extension] || extension;
			}

			// set language classes
			Prism.util.setLanguage(code, language);
			Prism.util.setLanguage(pre, language);

			// preload the language
			var autoloader = Prism.plugins.autoloader;
			if (autoloader) {
				autoloader.loadLanguages(language);
			}

			// load file
			loadFile(
				src,
				function (text) {
					// mark as loaded
					pre.setAttribute(STATUS_ATTR, STATUS_LOADED);

					// handle data-range
					var range = parseRange(pre.getAttribute('data-range'));
					if (range) {
						var lines = text.split(/\r\n?|\n/g);

						// the range is one-based and inclusive on both ends
						var start = range[0];
						var end = range[1] == null ? lines.length : range[1];

						if (start < 0) { start += lines.length; }
						start = Math.max(0, Math.min(start - 1, lines.length));
						if (end < 0) { end += lines.length; }
						end = Math.max(0, Math.min(end, lines.length));

						text = lines.slice(start, end).join('\n');

						// add data-start for line numbers
						if (!pre.hasAttribute('data-start')) {
							pre.setAttribute('data-start', String(start + 1));
						}
					}

					// highlight code
					code.textContent = text;
					Prism.highlightElement(code);
				},
				function (error) {
					// mark as failed
					pre.setAttribute(STATUS_ATTR, STATUS_FAILED);

					code.textContent = error;
				}
			);
		}
	});

	Prism.plugins.fileHighlight = {
		/**
		 * Executes the File Highlight plugin for all matching `pre` elements under the given container.
		 *
		 * Note: Elements which are already loaded or currently loading will not be touched by this method.
		 *
		 * @param {ParentNode} [container=document]
		 */
		highlight: function highlight(container) {
			var elements = (container || document).querySelectorAll(SELECTOR);

			for (var i = 0, element; (element = elements[i++]);) {
				Prism.highlightElement(element);
			}
		}
	};

	var logged = false;
	/** @deprecated Use `Prism.plugins.fileHighlight.highlight` instead. */
	Prism.fileHighlight = function () {
		if (!logged) {
			console.warn('Prism.fileHighlight is deprecated. Use `Prism.plugins.fileHighlight.highlight` instead.');
			logged = true;
		}
		Prism.plugins.fileHighlight.highlight.apply(this, arguments);
	};

}());


/***/ }),

/***/ "./node_modules/split.js/dist/split.es.js":
/*!************************************************!*\
  !*** ./node_modules/split.js/dist/split.es.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
// The programming goals of Split.js are to deliver readable, understandable and
// maintainable code, while at the same time manually optimizing for tiny minified file size,
// browser compatibility without additional requirements
// and very few assumptions about the user's page layout.
var global = typeof window !== 'undefined' ? window : null;
var ssr = global === null;
var document = !ssr ? global.document : undefined;

// Save a couple long function names that are used frequently.
// This optimization saves around 400 bytes.
var addEventListener = 'addEventListener';
var removeEventListener = 'removeEventListener';
var getBoundingClientRect = 'getBoundingClientRect';
var gutterStartDragging = '_a';
var aGutterSize = '_b';
var bGutterSize = '_c';
var HORIZONTAL = 'horizontal';
var NOOP = function () { return false; };

// Helper function determines which prefixes of CSS calc we need.
// We only need to do this once on startup, when this anonymous function is called.
//
// Tests -webkit, -moz and -o prefixes. Modified from StackOverflow:
// http://stackoverflow.com/questions/16625140/js-feature-detection-to-detect-the-usage-of-webkit-calc-over-calc/16625167#16625167
var calc = ssr
    ? 'calc'
    : ((['', '-webkit-', '-moz-', '-o-']
          .filter(function (prefix) {
              var el = document.createElement('div');
              el.style.cssText = "width:" + prefix + "calc(9px)";

              return !!el.style.length
          })
          .shift()) + "calc");

// Helper function checks if its argument is a string-like type
var isString = function (v) { return typeof v === 'string' || v instanceof String; };

// Helper function allows elements and string selectors to be used
// interchangeably. In either case an element is returned. This allows us to
// do `Split([elem1, elem2])` as well as `Split(['#id1', '#id2'])`.
var elementOrSelector = function (el) {
    if (isString(el)) {
        var ele = document.querySelector(el);
        if (!ele) {
            throw new Error(("Selector " + el + " did not match a DOM element"))
        }
        return ele
    }

    return el
};

// Helper function gets a property from the properties object, with a default fallback
var getOption = function (options, propName, def) {
    var value = options[propName];
    if (value !== undefined) {
        return value
    }
    return def
};

var getGutterSize = function (gutterSize, isFirst, isLast, gutterAlign) {
    if (isFirst) {
        if (gutterAlign === 'end') {
            return 0
        }
        if (gutterAlign === 'center') {
            return gutterSize / 2
        }
    } else if (isLast) {
        if (gutterAlign === 'start') {
            return 0
        }
        if (gutterAlign === 'center') {
            return gutterSize / 2
        }
    }

    return gutterSize
};

// Default options
var defaultGutterFn = function (i, gutterDirection) {
    var gut = document.createElement('div');
    gut.className = "gutter gutter-" + gutterDirection;
    return gut
};

var defaultElementStyleFn = function (dim, size, gutSize) {
    var style = {};

    if (!isString(size)) {
        style[dim] = calc + "(" + size + "% - " + gutSize + "px)";
    } else {
        style[dim] = size;
    }

    return style
};

var defaultGutterStyleFn = function (dim, gutSize) {
    var obj;

    return (( obj = {}, obj[dim] = (gutSize + "px"), obj ));
};

// The main function to initialize a split. Split.js thinks about each pair
// of elements as an independant pair. Dragging the gutter between two elements
// only changes the dimensions of elements in that pair. This is key to understanding
// how the following functions operate, since each function is bound to a pair.
//
// A pair object is shaped like this:
//
// {
//     a: DOM element,
//     b: DOM element,
//     aMin: Number,
//     bMin: Number,
//     dragging: Boolean,
//     parent: DOM element,
//     direction: 'horizontal' | 'vertical'
// }
//
// The basic sequence:
//
// 1. Set defaults to something sane. `options` doesn't have to be passed at all.
// 2. Initialize a bunch of strings based on the direction we're splitting.
//    A lot of the behavior in the rest of the library is paramatized down to
//    rely on CSS strings and classes.
// 3. Define the dragging helper functions, and a few helpers to go with them.
// 4. Loop through the elements while pairing them off. Every pair gets an
//    `pair` object and a gutter.
// 5. Actually size the pair elements, insert gutters and attach event listeners.
var Split = function (idsOption, options) {
    if ( options === void 0 ) options = {};

    if (ssr) { return {} }

    var ids = idsOption;
    var dimension;
    var clientAxis;
    var position;
    var positionEnd;
    var clientSize;
    var elements;

    // Allow HTMLCollection to be used as an argument when supported
    if (Array.from) {
        ids = Array.from(ids);
    }

    // All DOM elements in the split should have a common parent. We can grab
    // the first elements parent and hope users read the docs because the
    // behavior will be whacky otherwise.
    var firstElement = elementOrSelector(ids[0]);
    var parent = firstElement.parentNode;
    var parentStyle = getComputedStyle ? getComputedStyle(parent) : null;
    var parentFlexDirection = parentStyle ? parentStyle.flexDirection : null;

    // Set default options.sizes to equal percentages of the parent element.
    var sizes = getOption(options, 'sizes') || ids.map(function () { return 100 / ids.length; });

    // Standardize minSize and maxSize to an array if it isn't already.
    // This allows minSize and maxSize to be passed as a number.
    var minSize = getOption(options, 'minSize', 100);
    var minSizes = Array.isArray(minSize) ? minSize : ids.map(function () { return minSize; });
    var maxSize = getOption(options, 'maxSize', Infinity);
    var maxSizes = Array.isArray(maxSize) ? maxSize : ids.map(function () { return maxSize; });

    // Get other options
    var expandToMin = getOption(options, 'expandToMin', false);
    var gutterSize = getOption(options, 'gutterSize', 10);
    var gutterAlign = getOption(options, 'gutterAlign', 'center');
    var snapOffset = getOption(options, 'snapOffset', 30);
    var snapOffsets = Array.isArray(snapOffset) ? snapOffset : ids.map(function () { return snapOffset; });
    var dragInterval = getOption(options, 'dragInterval', 1);
    var direction = getOption(options, 'direction', HORIZONTAL);
    var cursor = getOption(
        options,
        'cursor',
        direction === HORIZONTAL ? 'col-resize' : 'row-resize'
    );
    var gutter = getOption(options, 'gutter', defaultGutterFn);
    var elementStyle = getOption(
        options,
        'elementStyle',
        defaultElementStyleFn
    );
    var gutterStyle = getOption(options, 'gutterStyle', defaultGutterStyleFn);

    // 2. Initialize a bunch of strings based on the direction we're splitting.
    // A lot of the behavior in the rest of the library is paramatized down to
    // rely on CSS strings and classes.
    if (direction === HORIZONTAL) {
        dimension = 'width';
        clientAxis = 'clientX';
        position = 'left';
        positionEnd = 'right';
        clientSize = 'clientWidth';
    } else if (direction === 'vertical') {
        dimension = 'height';
        clientAxis = 'clientY';
        position = 'top';
        positionEnd = 'bottom';
        clientSize = 'clientHeight';
    }

    // 3. Define the dragging helper functions, and a few helpers to go with them.
    // Each helper is bound to a pair object that contains its metadata. This
    // also makes it easy to store references to listeners that that will be
    // added and removed.
    //
    // Even though there are no other functions contained in them, aliasing
    // this to self saves 50 bytes or so since it's used so frequently.
    //
    // The pair object saves metadata like dragging state, position and
    // event listener references.

    function setElementSize(el, size, gutSize, i) {
        // Split.js allows setting sizes via numbers (ideally), or if you must,
        // by string, like '300px'. This is less than ideal, because it breaks
        // the fluid layout that `calc(% - px)` provides. You're on your own if you do that,
        // make sure you calculate the gutter size by hand.
        var style = elementStyle(dimension, size, gutSize, i);

        Object.keys(style).forEach(function (prop) {
            // eslint-disable-next-line no-param-reassign
            el.style[prop] = style[prop];
        });
    }

    function setGutterSize(gutterElement, gutSize, i) {
        var style = gutterStyle(dimension, gutSize, i);

        Object.keys(style).forEach(function (prop) {
            // eslint-disable-next-line no-param-reassign
            gutterElement.style[prop] = style[prop];
        });
    }

    function getSizes() {
        return elements.map(function (element) { return element.size; })
    }

    // Supports touch events, but not multitouch, so only the first
    // finger `touches[0]` is counted.
    function getMousePosition(e) {
        if ('touches' in e) { return e.touches[0][clientAxis] }
        return e[clientAxis]
    }

    // Actually adjust the size of elements `a` and `b` to `offset` while dragging.
    // calc is used to allow calc(percentage + gutterpx) on the whole split instance,
    // which allows the viewport to be resized without additional logic.
    // Element a's size is the same as offset. b's size is total size - a size.
    // Both sizes are calculated from the initial parent percentage,
    // then the gutter size is subtracted.
    function adjust(offset) {
        var a = elements[this.a];
        var b = elements[this.b];
        var percentage = a.size + b.size;

        a.size = (offset / this.size) * percentage;
        b.size = percentage - (offset / this.size) * percentage;

        setElementSize(a.element, a.size, this[aGutterSize], a.i);
        setElementSize(b.element, b.size, this[bGutterSize], b.i);
    }

    // drag, where all the magic happens. The logic is really quite simple:
    //
    // 1. Ignore if the pair is not dragging.
    // 2. Get the offset of the event.
    // 3. Snap offset to min if within snappable range (within min + snapOffset).
    // 4. Actually adjust each element in the pair to offset.
    //
    // ---------------------------------------------------------------------
    // |    | <- a.minSize               ||              b.minSize -> |    |
    // |    |  | <- this.snapOffset      ||     this.snapOffset -> |  |    |
    // |    |  |                         ||                        |  |    |
    // |    |  |                         ||                        |  |    |
    // ---------------------------------------------------------------------
    // | <- this.start                                        this.size -> |
    function drag(e) {
        var offset;
        var a = elements[this.a];
        var b = elements[this.b];

        if (!this.dragging) { return }

        // Get the offset of the event from the first side of the
        // pair `this.start`. Then offset by the initial position of the
        // mouse compared to the gutter size.
        offset =
            getMousePosition(e) -
            this.start +
            (this[aGutterSize] - this.dragOffset);

        if (dragInterval > 1) {
            offset = Math.round(offset / dragInterval) * dragInterval;
        }

        // If within snapOffset of min or max, set offset to min or max.
        // snapOffset buffers a.minSize and b.minSize, so logic is opposite for both.
        // Include the appropriate gutter sizes to prevent overflows.
        if (offset <= a.minSize + a.snapOffset + this[aGutterSize]) {
            offset = a.minSize + this[aGutterSize];
        } else if (
            offset >=
            this.size - (b.minSize + b.snapOffset + this[bGutterSize])
        ) {
            offset = this.size - (b.minSize + this[bGutterSize]);
        }

        if (offset >= a.maxSize - a.snapOffset + this[aGutterSize]) {
            offset = a.maxSize + this[aGutterSize];
        } else if (
            offset <=
            this.size - (b.maxSize - b.snapOffset + this[bGutterSize])
        ) {
            offset = this.size - (b.maxSize + this[bGutterSize]);
        }

        // Actually adjust the size.
        adjust.call(this, offset);

        // Call the drag callback continously. Don't do anything too intensive
        // in this callback.
        getOption(options, 'onDrag', NOOP)(getSizes());
    }

    // Cache some important sizes when drag starts, so we don't have to do that
    // continously:
    //
    // `size`: The total size of the pair. First + second + first gutter + second gutter.
    // `start`: The leading side of the first element.
    //
    // ------------------------------------------------
    // |      aGutterSize -> |||                      |
    // |                     |||                      |
    // |                     |||                      |
    // |                     ||| <- bGutterSize       |
    // ------------------------------------------------
    // | <- start                             size -> |
    function calculateSizes() {
        // Figure out the parent size minus padding.
        var a = elements[this.a].element;
        var b = elements[this.b].element;

        var aBounds = a[getBoundingClientRect]();
        var bBounds = b[getBoundingClientRect]();

        this.size =
            aBounds[dimension] +
            bBounds[dimension] +
            this[aGutterSize] +
            this[bGutterSize];
        this.start = aBounds[position];
        this.end = aBounds[positionEnd];
    }

    function innerSize(element) {
        // Return nothing if getComputedStyle is not supported (< IE9)
        // Or if parent element has no layout yet
        if (!getComputedStyle) { return null }

        var computedStyle = getComputedStyle(element);

        if (!computedStyle) { return null }

        var size = element[clientSize];

        if (size === 0) { return null }

        if (direction === HORIZONTAL) {
            size -=
                parseFloat(computedStyle.paddingLeft) +
                parseFloat(computedStyle.paddingRight);
        } else {
            size -=
                parseFloat(computedStyle.paddingTop) +
                parseFloat(computedStyle.paddingBottom);
        }

        return size
    }

    // When specifying percentage sizes that are less than the computed
    // size of the element minus the gutter, the lesser percentages must be increased
    // (and decreased from the other elements) to make space for the pixels
    // subtracted by the gutters.
    function trimToMin(sizesToTrim) {
        // Try to get inner size of parent element.
        // If it's no supported, return original sizes.
        var parentSize = innerSize(parent);
        if (parentSize === null) {
            return sizesToTrim
        }

        if (minSizes.reduce(function (a, b) { return a + b; }, 0) > parentSize) {
            return sizesToTrim
        }

        // Keep track of the excess pixels, the amount of pixels over the desired percentage
        // Also keep track of the elements with pixels to spare, to decrease after if needed
        var excessPixels = 0;
        var toSpare = [];

        var pixelSizes = sizesToTrim.map(function (size, i) {
            // Convert requested percentages to pixel sizes
            var pixelSize = (parentSize * size) / 100;
            var elementGutterSize = getGutterSize(
                gutterSize,
                i === 0,
                i === sizesToTrim.length - 1,
                gutterAlign
            );
            var elementMinSize = minSizes[i] + elementGutterSize;

            // If element is too smal, increase excess pixels by the difference
            // and mark that it has no pixels to spare
            if (pixelSize < elementMinSize) {
                excessPixels += elementMinSize - pixelSize;
                toSpare.push(0);
                return elementMinSize
            }

            // Otherwise, mark the pixels it has to spare and return it's original size
            toSpare.push(pixelSize - elementMinSize);
            return pixelSize
        });

        // If nothing was adjusted, return the original sizes
        if (excessPixels === 0) {
            return sizesToTrim
        }

        return pixelSizes.map(function (pixelSize, i) {
            var newPixelSize = pixelSize;

            // While there's still pixels to take, and there's enough pixels to spare,
            // take as many as possible up to the total excess pixels
            if (excessPixels > 0 && toSpare[i] - excessPixels > 0) {
                var takenPixels = Math.min(
                    excessPixels,
                    toSpare[i] - excessPixels
                );

                // Subtract the amount taken for the next iteration
                excessPixels -= takenPixels;
                newPixelSize = pixelSize - takenPixels;
            }

            // Return the pixel size adjusted as a percentage
            return (newPixelSize / parentSize) * 100
        })
    }

    // stopDragging is very similar to startDragging in reverse.
    function stopDragging() {
        var self = this;
        var a = elements[self.a].element;
        var b = elements[self.b].element;

        if (self.dragging) {
            getOption(options, 'onDragEnd', NOOP)(getSizes());
        }

        self.dragging = false;

        // Remove the stored event listeners. This is why we store them.
        global[removeEventListener]('mouseup', self.stop);
        global[removeEventListener]('touchend', self.stop);
        global[removeEventListener]('touchcancel', self.stop);
        global[removeEventListener]('mousemove', self.move);
        global[removeEventListener]('touchmove', self.move);

        // Clear bound function references
        self.stop = null;
        self.move = null;

        a[removeEventListener]('selectstart', NOOP);
        a[removeEventListener]('dragstart', NOOP);
        b[removeEventListener]('selectstart', NOOP);
        b[removeEventListener]('dragstart', NOOP);

        a.style.userSelect = '';
        a.style.webkitUserSelect = '';
        a.style.MozUserSelect = '';
        a.style.pointerEvents = '';

        b.style.userSelect = '';
        b.style.webkitUserSelect = '';
        b.style.MozUserSelect = '';
        b.style.pointerEvents = '';

        self.gutter.style.cursor = '';
        self.parent.style.cursor = '';
        document.body.style.cursor = '';
    }

    // startDragging calls `calculateSizes` to store the inital size in the pair object.
    // It also adds event listeners for mouse/touch events,
    // and prevents selection while dragging so avoid the selecting text.
    function startDragging(e) {
        // Right-clicking can't start dragging.
        if ('button' in e && e.button !== 0) {
            return
        }

        // Alias frequently used variables to save space. 200 bytes.
        var self = this;
        var a = elements[self.a].element;
        var b = elements[self.b].element;

        // Call the onDragStart callback.
        if (!self.dragging) {
            getOption(options, 'onDragStart', NOOP)(getSizes());
        }

        // Don't actually drag the element. We emulate that in the drag function.
        e.preventDefault();

        // Set the dragging property of the pair object.
        self.dragging = true;

        // Create two event listeners bound to the same pair object and store
        // them in the pair object.
        self.move = drag.bind(self);
        self.stop = stopDragging.bind(self);

        // All the binding. `window` gets the stop events in case we drag out of the elements.
        global[addEventListener]('mouseup', self.stop);
        global[addEventListener]('touchend', self.stop);
        global[addEventListener]('touchcancel', self.stop);
        global[addEventListener]('mousemove', self.move);
        global[addEventListener]('touchmove', self.move);

        // Disable selection. Disable!
        a[addEventListener]('selectstart', NOOP);
        a[addEventListener]('dragstart', NOOP);
        b[addEventListener]('selectstart', NOOP);
        b[addEventListener]('dragstart', NOOP);

        a.style.userSelect = 'none';
        a.style.webkitUserSelect = 'none';
        a.style.MozUserSelect = 'none';
        a.style.pointerEvents = 'none';

        b.style.userSelect = 'none';
        b.style.webkitUserSelect = 'none';
        b.style.MozUserSelect = 'none';
        b.style.pointerEvents = 'none';

        // Set the cursor at multiple levels
        self.gutter.style.cursor = cursor;
        self.parent.style.cursor = cursor;
        document.body.style.cursor = cursor;

        // Cache the initial sizes of the pair.
        calculateSizes.call(self);

        // Determine the position of the mouse compared to the gutter
        self.dragOffset = getMousePosition(e) - self.end;
    }

    // adjust sizes to ensure percentage is within min size and gutter.
    sizes = trimToMin(sizes);

    // 5. Create pair and element objects. Each pair has an index reference to
    // elements `a` and `b` of the pair (first and second elements).
    // Loop through the elements while pairing them off. Every pair gets a
    // `pair` object and a gutter.
    //
    // Basic logic:
    //
    // - Starting with the second element `i > 0`, create `pair` objects with
    //   `a = i - 1` and `b = i`
    // - Set gutter sizes based on the _pair_ being first/last. The first and last
    //   pair have gutterSize / 2, since they only have one half gutter, and not two.
    // - Create gutter elements and add event listeners.
    // - Set the size of the elements, minus the gutter sizes.
    //
    // -----------------------------------------------------------------------
    // |     i=0     |         i=1         |        i=2       |      i=3     |
    // |             |                     |                  |              |
    // |           pair 0                pair 1             pair 2           |
    // |             |                     |                  |              |
    // -----------------------------------------------------------------------
    var pairs = [];
    elements = ids.map(function (id, i) {
        // Create the element object.
        var element = {
            element: elementOrSelector(id),
            size: sizes[i],
            minSize: minSizes[i],
            maxSize: maxSizes[i],
            snapOffset: snapOffsets[i],
            i: i,
        };

        var pair;

        if (i > 0) {
            // Create the pair object with its metadata.
            pair = {
                a: i - 1,
                b: i,
                dragging: false,
                direction: direction,
                parent: parent,
            };

            pair[aGutterSize] = getGutterSize(
                gutterSize,
                i - 1 === 0,
                false,
                gutterAlign
            );
            pair[bGutterSize] = getGutterSize(
                gutterSize,
                false,
                i === ids.length - 1,
                gutterAlign
            );

            // if the parent has a reverse flex-direction, switch the pair elements.
            if (
                parentFlexDirection === 'row-reverse' ||
                parentFlexDirection === 'column-reverse'
            ) {
                var temp = pair.a;
                pair.a = pair.b;
                pair.b = temp;
            }
        }

        // Determine the size of the current element. IE8 is supported by
        // staticly assigning sizes without draggable gutters. Assigns a string
        // to `size`.
        //
        // Create gutter elements for each pair.
        if (i > 0) {
            var gutterElement = gutter(i, direction, element.element);
            setGutterSize(gutterElement, gutterSize, i);

            // Save bound event listener for removal later
            pair[gutterStartDragging] = startDragging.bind(pair);

            // Attach bound event listener
            gutterElement[addEventListener](
                'mousedown',
                pair[gutterStartDragging]
            );
            gutterElement[addEventListener](
                'touchstart',
                pair[gutterStartDragging]
            );

            parent.insertBefore(gutterElement, element.element);

            pair.gutter = gutterElement;
        }

        setElementSize(
            element.element,
            element.size,
            getGutterSize(
                gutterSize,
                i === 0,
                i === ids.length - 1,
                gutterAlign
            ),
            i
        );

        // After the first iteration, and we have a pair object, append it to the
        // list of pairs.
        if (i > 0) {
            pairs.push(pair);
        }

        return element
    });

    function adjustToMin(element) {
        var isLast = element.i === pairs.length;
        var pair = isLast ? pairs[element.i - 1] : pairs[element.i];

        calculateSizes.call(pair);

        var size = isLast
            ? pair.size - element.minSize - pair[bGutterSize]
            : element.minSize + pair[aGutterSize];

        adjust.call(pair, size);
    }

    elements.forEach(function (element) {
        var computedSize = element.element[getBoundingClientRect]()[dimension];

        if (computedSize < element.minSize) {
            if (expandToMin) {
                adjustToMin(element);
            } else {
                // eslint-disable-next-line no-param-reassign
                element.minSize = computedSize;
            }
        }
    });

    function setSizes(newSizes) {
        var trimmed = trimToMin(newSizes);
        trimmed.forEach(function (newSize, i) {
            if (i > 0) {
                var pair = pairs[i - 1];

                var a = elements[pair.a];
                var b = elements[pair.b];

                a.size = trimmed[i - 1];
                b.size = newSize;

                setElementSize(a.element, a.size, pair[aGutterSize], a.i);
                setElementSize(b.element, b.size, pair[bGutterSize], b.i);
            }
        });
    }

    function destroy(preserveStyles, preserveGutter) {
        pairs.forEach(function (pair) {
            if (preserveGutter !== true) {
                pair.parent.removeChild(pair.gutter);
            } else {
                pair.gutter[removeEventListener](
                    'mousedown',
                    pair[gutterStartDragging]
                );
                pair.gutter[removeEventListener](
                    'touchstart',
                    pair[gutterStartDragging]
                );
            }

            if (preserveStyles !== true) {
                var style = elementStyle(
                    dimension,
                    pair.a.size,
                    pair[aGutterSize]
                );

                Object.keys(style).forEach(function (prop) {
                    elements[pair.a].element.style[prop] = '';
                    elements[pair.b].element.style[prop] = '';
                });
            }
        });
    }

    return {
        setSizes: setSizes,
        getSizes: getSizes,
        collapse: function collapse(i) {
            adjustToMin(elements[i]);
        },
        destroy: destroy,
        parent: parent,
        pairs: pairs,
    }
};

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Split);


/***/ }),

/***/ "./node_modules/prismjs/themes/prism-dark.css":
/*!****************************************************!*\
  !*** ./node_modules/prismjs/themes/prism-dark.css ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../../style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../../style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../../style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../../style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../../style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../../style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _css_loader_dist_cjs_js_sass_loader_dist_cjs_js_prism_dark_css__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../../css-loader/dist/cjs.js!../../sass-loader/dist/cjs.js!./prism-dark.css */ "./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./node_modules/prismjs/themes/prism-dark.css");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_css_loader_dist_cjs_js_sass_loader_dist_cjs_js_prism_dark_css__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_css_loader_dist_cjs_js_sass_loader_dist_cjs_js_prism_dark_css__WEBPACK_IMPORTED_MODULE_6__["default"] && _css_loader_dist_cjs_js_sass_loader_dist_cjs_js_prism_dark_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _css_loader_dist_cjs_js_sass_loader_dist_cjs_js_prism_dark_css__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/codeeditor.scss":
/*!*****************************!*\
  !*** ./src/codeeditor.scss ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_codeeditor_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!../node_modules/sass-loader/dist/cjs.js!./codeeditor.scss */ "./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/codeeditor.scss");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_codeeditor_scss__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_codeeditor_scss__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_codeeditor_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_codeeditor_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./src/fiddler.scss":
/*!**************************!*\
  !*** ./src/fiddler.scss ***!
  \**************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js */ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleDomAPI.js */ "./node_modules/style-loader/dist/runtime/styleDomAPI.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertBySelector.js */ "./node_modules/style-loader/dist/runtime/insertBySelector.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js */ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/insertStyleElement.js */ "./node_modules/style-loader/dist/runtime/insertStyleElement.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4__);
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! !../node_modules/style-loader/dist/runtime/styleTagTransform.js */ "./node_modules/style-loader/dist/runtime/styleTagTransform.js");
/* harmony import */ var _node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default = /*#__PURE__*/__webpack_require__.n(_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5__);
/* harmony import */ var _node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_fiddler_scss__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! !!../node_modules/css-loader/dist/cjs.js!../node_modules/sass-loader/dist/cjs.js!./fiddler.scss */ "./node_modules/css-loader/dist/cjs.js!./node_modules/sass-loader/dist/cjs.js!./src/fiddler.scss");

      
      
      
      
      
      
      
      
      

var options = {};

options.styleTagTransform = (_node_modules_style_loader_dist_runtime_styleTagTransform_js__WEBPACK_IMPORTED_MODULE_5___default());
options.setAttributes = (_node_modules_style_loader_dist_runtime_setAttributesWithoutAttributes_js__WEBPACK_IMPORTED_MODULE_3___default());

      options.insert = _node_modules_style_loader_dist_runtime_insertBySelector_js__WEBPACK_IMPORTED_MODULE_2___default().bind(null, "head");
    
options.domAPI = (_node_modules_style_loader_dist_runtime_styleDomAPI_js__WEBPACK_IMPORTED_MODULE_1___default());
options.insertStyleElement = (_node_modules_style_loader_dist_runtime_insertStyleElement_js__WEBPACK_IMPORTED_MODULE_4___default());

var update = _node_modules_style_loader_dist_runtime_injectStylesIntoStyleTag_js__WEBPACK_IMPORTED_MODULE_0___default()(_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_fiddler_scss__WEBPACK_IMPORTED_MODULE_6__["default"], options);




       /* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (_node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_fiddler_scss__WEBPACK_IMPORTED_MODULE_6__["default"] && _node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_fiddler_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals ? _node_modules_css_loader_dist_cjs_js_node_modules_sass_loader_dist_cjs_js_fiddler_scss__WEBPACK_IMPORTED_MODULE_6__["default"].locals : undefined);


/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js":
/*!****************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/injectStylesIntoStyleTag.js ***!
  \****************************************************************************/
/***/ ((module) => {

"use strict";


var stylesInDOM = [];

function getIndexByIdentifier(identifier) {
  var result = -1;

  for (var i = 0; i < stylesInDOM.length; i++) {
    if (stylesInDOM[i].identifier === identifier) {
      result = i;
      break;
    }
  }

  return result;
}

function modulesToDom(list, options) {
  var idCountMap = {};
  var identifiers = [];

  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var id = options.base ? item[0] + options.base : item[0];
    var count = idCountMap[id] || 0;
    var identifier = "".concat(id, " ").concat(count);
    idCountMap[id] = count + 1;
    var indexByIdentifier = getIndexByIdentifier(identifier);
    var obj = {
      css: item[1],
      media: item[2],
      sourceMap: item[3],
      supports: item[4],
      layer: item[5]
    };

    if (indexByIdentifier !== -1) {
      stylesInDOM[indexByIdentifier].references++;
      stylesInDOM[indexByIdentifier].updater(obj);
    } else {
      var updater = addElementStyle(obj, options);
      options.byIndex = i;
      stylesInDOM.splice(i, 0, {
        identifier: identifier,
        updater: updater,
        references: 1
      });
    }

    identifiers.push(identifier);
  }

  return identifiers;
}

function addElementStyle(obj, options) {
  var api = options.domAPI(options);
  api.update(obj);

  var updater = function updater(newObj) {
    if (newObj) {
      if (newObj.css === obj.css && newObj.media === obj.media && newObj.sourceMap === obj.sourceMap && newObj.supports === obj.supports && newObj.layer === obj.layer) {
        return;
      }

      api.update(obj = newObj);
    } else {
      api.remove();
    }
  };

  return updater;
}

module.exports = function (list, options) {
  options = options || {};
  list = list || [];
  var lastIdentifiers = modulesToDom(list, options);
  return function update(newList) {
    newList = newList || [];

    for (var i = 0; i < lastIdentifiers.length; i++) {
      var identifier = lastIdentifiers[i];
      var index = getIndexByIdentifier(identifier);
      stylesInDOM[index].references--;
    }

    var newLastIdentifiers = modulesToDom(newList, options);

    for (var _i = 0; _i < lastIdentifiers.length; _i++) {
      var _identifier = lastIdentifiers[_i];

      var _index = getIndexByIdentifier(_identifier);

      if (stylesInDOM[_index].references === 0) {
        stylesInDOM[_index].updater();

        stylesInDOM.splice(_index, 1);
      }
    }

    lastIdentifiers = newLastIdentifiers;
  };
};

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertBySelector.js":
/*!********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertBySelector.js ***!
  \********************************************************************/
/***/ ((module) => {

"use strict";


var memo = {};
/* istanbul ignore next  */

function getTarget(target) {
  if (typeof memo[target] === "undefined") {
    var styleTarget = document.querySelector(target); // Special case to return head of iframe instead of iframe itself

    if (window.HTMLIFrameElement && styleTarget instanceof window.HTMLIFrameElement) {
      try {
        // This will throw an exception if access to iframe is blocked
        // due to cross-origin restrictions
        styleTarget = styleTarget.contentDocument.head;
      } catch (e) {
        // istanbul ignore next
        styleTarget = null;
      }
    }

    memo[target] = styleTarget;
  }

  return memo[target];
}
/* istanbul ignore next  */


function insertBySelector(insert, style) {
  var target = getTarget(insert);

  if (!target) {
    throw new Error("Couldn't find a style target. This probably means that the value for the 'insert' parameter is invalid.");
  }

  target.appendChild(style);
}

module.exports = insertBySelector;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/insertStyleElement.js":
/*!**********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/insertStyleElement.js ***!
  \**********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function insertStyleElement(options) {
  var element = document.createElement("style");
  options.setAttributes(element, options.attributes);
  options.insert(element, options.options);
  return element;
}

module.exports = insertStyleElement;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/setAttributesWithoutAttributes.js ***!
  \**********************************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

"use strict";


/* istanbul ignore next  */
function setAttributesWithoutAttributes(styleElement) {
  var nonce =  true ? __webpack_require__.nc : 0;

  if (nonce) {
    styleElement.setAttribute("nonce", nonce);
  }
}

module.exports = setAttributesWithoutAttributes;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleDomAPI.js":
/*!***************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleDomAPI.js ***!
  \***************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function apply(styleElement, options, obj) {
  var css = "";

  if (obj.supports) {
    css += "@supports (".concat(obj.supports, ") {");
  }

  if (obj.media) {
    css += "@media ".concat(obj.media, " {");
  }

  var needLayer = typeof obj.layer !== "undefined";

  if (needLayer) {
    css += "@layer".concat(obj.layer.length > 0 ? " ".concat(obj.layer) : "", " {");
  }

  css += obj.css;

  if (needLayer) {
    css += "}";
  }

  if (obj.media) {
    css += "}";
  }

  if (obj.supports) {
    css += "}";
  }

  var sourceMap = obj.sourceMap;

  if (sourceMap && typeof btoa !== "undefined") {
    css += "\n/*# sourceMappingURL=data:application/json;base64,".concat(btoa(unescape(encodeURIComponent(JSON.stringify(sourceMap)))), " */");
  } // For old IE

  /* istanbul ignore if  */


  options.styleTagTransform(css, styleElement, options.options);
}

function removeStyleElement(styleElement) {
  // istanbul ignore if
  if (styleElement.parentNode === null) {
    return false;
  }

  styleElement.parentNode.removeChild(styleElement);
}
/* istanbul ignore next  */


function domAPI(options) {
  var styleElement = options.insertStyleElement(options);
  return {
    update: function update(obj) {
      apply(styleElement, options, obj);
    },
    remove: function remove() {
      removeStyleElement(styleElement);
    }
  };
}

module.exports = domAPI;

/***/ }),

/***/ "./node_modules/style-loader/dist/runtime/styleTagTransform.js":
/*!*********************************************************************!*\
  !*** ./node_modules/style-loader/dist/runtime/styleTagTransform.js ***!
  \*********************************************************************/
/***/ ((module) => {

"use strict";


/* istanbul ignore next  */
function styleTagTransform(css, styleElement) {
  if (styleElement.styleSheet) {
    styleElement.styleSheet.cssText = css;
  } else {
    while (styleElement.firstChild) {
      styleElement.removeChild(styleElement.firstChild);
    }

    styleElement.appendChild(document.createTextNode(css));
  }
}

module.exports = styleTagTransform;

/***/ }),

/***/ "./src/CodeEditor.js":
/*!***************************!*\
  !*** ./src/CodeEditor.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "CodeEditor": () => (/* binding */ CodeEditor)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var htm_preact__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! htm/preact */ "./node_modules/htm/preact/index.module.js");
/* harmony import */ var codejar__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! codejar */ "./node_modules/codejar/codejar.js");
/* harmony import */ var prismjs__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! prismjs */ "./node_modules/prismjs/prism.js");
/* harmony import */ var prismjs__WEBPACK_IMPORTED_MODULE_4___default = /*#__PURE__*/__webpack_require__.n(prismjs__WEBPACK_IMPORTED_MODULE_4__);





__webpack_require__(/*! prismjs/themes/prism-dark.css */ "./node_modules/prismjs/themes/prism-dark.css");
__webpack_require__(/*! ./codeeditor.scss */ "./src/codeeditor.scss");


class CodeEditor extends preact__WEBPACK_IMPORTED_MODULE_0__.Component{
  constructor(props){
    super(props);
    this.container = (0,preact__WEBPACK_IMPORTED_MODULE_0__.createRef)();
  }

  componentDidMount(){
    this.editor = (0,codejar__WEBPACK_IMPORTED_MODULE_3__.CodeJar)(this.container.current , 
    e=>prismjs__WEBPACK_IMPORTED_MODULE_4___default().highlightElement(e) , {tab: '  '});
    //
    this.editor.updateCode(this.props.value || "");
    this.editor.onUpdate(e=>this.props.handler(e));
  }

  render(){

    return htm_preact__WEBPACK_IMPORTED_MODULE_2__.html`<div class="CodeEditor language-${this.props.lang || 'none'}" ref=${this.container}>
      
    </div>`
  }
}



/***/ }),

/***/ "./src/Fiddler.js":
/*!************************!*\
  !*** ./src/Fiddler.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Fiddler": () => (/* binding */ Fiddler)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var htm_preact__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! htm/preact */ "./node_modules/htm/preact/index.module.js");
/* harmony import */ var split_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! split.js */ "./node_modules/split.js/dist/split.es.js");
/* harmony import */ var _CodeEditor__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./CodeEditor */ "./src/CodeEditor.js");
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./util */ "./src/util.js");
/* harmony import */ var _fileops__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./fileops */ "./src/fileops.js");







__webpack_require__(/*! ./fiddler.scss */ "./src/fiddler.scss")


class Fiddler extends preact__WEBPACK_IMPORTED_MODULE_0__.Component{
  constructor(props){
    super(props);
    console.log("Props" , props);
    this.mainContainer = (0,preact__WEBPACK_IMPORTED_MODULE_0__.createRef)();
    this.editors = (0,preact__WEBPACK_IMPORTED_MODULE_0__.createRef)();
    this.preview = (0,preact__WEBPACK_IMPORTED_MODULE_0__.createRef)();
    this.cssEditor = (0,preact__WEBPACK_IMPORTED_MODULE_0__.createRef)();
    this.jsEditor = (0,preact__WEBPACK_IMPORTED_MODULE_0__.createRef)();
    this.htmlEditor = (0,preact__WEBPACK_IMPORTED_MODULE_0__.createRef)();
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
      webViewed: props.settings.webViewed(),

    }
    this.renderPreview = this.renderPreview.bind(this);
    
  }
  render(){
    
     return htm_preact__WEBPACK_IMPORTED_MODULE_2__.html`<div
     class=${this.state.showSettings ? "Fiddler settings" : "Fiddler main"}>
     <div id="toolbar">

     <div id="immediateTools">
     <input type="button" value="Save" 
     onclick=${()=>{ 
     (0,_fileops__WEBPACK_IMPORTED_MODULE_6__.saveFile)(this.props.settings , this.state.html , this.state.css , this.state.js ) ;
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
               <${_CodeEditor__WEBPACK_IMPORTED_MODULE_4__.CodeEditor} 
               value=${this.state.css}
               handler=${this.makeHandler('css')}
               lang="css" />
             </div>
             <div class="editorContainer" id="html" ref=${this.htmlEditor}>

               <h3>HTML</h3>
               <${_CodeEditor__WEBPACK_IMPORTED_MODULE_4__.CodeEditor} 
               value=${this.state.html}
               handler=${this.makeHandler('html')}
               lang="html" />
             </div>
             <div class="editorContainer" id="js" ref=${this.jsEditor}>
               <h3>Java Script</h3>
               <${_CodeEditor__WEBPACK_IMPORTED_MODULE_4__.CodeEditor} 
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
               <${_util__WEBPACK_IMPORTED_MODULE_5__.TheInput} area=${false} name="filename" title="File name"
               value=${this.state.filename}
               handler=${this.makeHandler("filename")}
               />
               <${_util__WEBPACK_IMPORTED_MODULE_5__.TheInput} area=${false} name="title" title="Page title"
               value=${this.state.title}
               handler=${this.makeHandler("title")}
               />
               <${_util__WEBPACK_IMPORTED_MODULE_5__.TheInput} area=${true} name="description" 
               title="Page description"
               value=${this.state.description}
               handler=${this.makeHandler("description")}
               />
               <label>Web behavior</label>
               <select onchange=${e=>this.makeHandler('webViewed')(e.target.value)}>
                   <option value="result" selected=${this.state.webViewed=='result'}>Show result only</option>
                   <option value="editor" selectd=${this.state.webViewed=='editor'}>Load editor</option>

               </select>
               </div>
               <div class="right" style=${{position:"relative"}}>
               <label>Head HTML</label>
               <div class="editor" style=${{position:"relative", flexGrow: 1}}>
               <${_CodeEditor__WEBPACK_IMPORTED_MODULE_4__.CodeEditor} value=${this.state.headHTML} 
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
    .autoRun(this.state.autoRun)

    
  }
  componentDidMount(){
    (0,split_js__WEBPACK_IMPORTED_MODULE_3__["default"])( [ this.cssEditor.current , this.htmlEditor.current , this.jsEditor.current ] );
    (0,split_js__WEBPACK_IMPORTED_MODULE_3__["default"])( [this.editors.current , this.preview.current] , {direction: 'vertical' , sizes: [30,70]} );
    this.renderPreview();
  }
  renderPreview(){
     this.preview.current.srcdoc = `<html><head>${this.props.settings.headHTML()}
     <style>${this.state.css || ""}</style>
     <script>${this.state.js || ""}</script>
     </head><body>${this.state.html || ""}</body></html>`
  }
}


/***/ }),

/***/ "./src/If.js":
/*!*******************!*\
  !*** ./src/If.js ***!
  \*******************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "If": () => (/* binding */ If)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");


class If extends preact__WEBPACK_IMPORTED_MODULE_0__.Component{
  constructor(props){
    super(props)
  }

  render(){
    // console.log("IF" , this.props.condition)
    if(this.props.condition){
      return this.props.children
    }else{
    return ""
    }
  }
}



/***/ }),

/***/ "./src/fileops.js":
/*!************************!*\
  !*** ./src/fileops.js ***!
  \************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "saveFile": () => (/* binding */ saveFile),
/* harmony export */   "saveToDisk": () => (/* binding */ saveToDisk),
/* harmony export */   "toHTML": () => (/* binding */ toHTML)
/* harmony export */ });
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util */ "./src/util.js");


function toHTML(
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
          s.src =  'fiddler.js'
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
 <script id="htmlSource" type="text/html">${(0,_util__WEBPACK_IMPORTED_MODULE_0__.escapeTags)( html )}</script>
</body>
</html>
`;
return tpl;
}

function saveToDisk(name,content){
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  element.setAttribute('download', name);
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);

}

function saveFile(settings, html, css , js){
   console.info("Saving...")
   const t = toHTML(settings, html, css, js);
   const f = settings.filename();
   saveToDisk(f, t);

}



/***/ }),

/***/ "./src/settings.js":
/*!*************************!*\
  !*** ./src/settings.js ***!
  \*************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "create": () => (/* binding */ create)
/* harmony export */ });
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util */ "./src/util.js");
 

const STORE = {};
const props = [
   "title" , 
   "description" , 
   "image" , 
   "filename" , //html 
   "headHTML", //html
   "author",
   "keywords",
   "autoRun",
   "editor",
   "webViewed"
   ]
var callback ;

function create(settings_src , cb){
// console.log("Creating settings wrapper" , settings_src)
  if(cb){callback=cb}
  props.forEach(p=>STORE[p]=settings_src[p] || "");
  return createWrapper();
}

function updated(k,v){
  if(callback){callback(k,v)}
  // console.log("Updated setting" , k)
}

function escapedCopy(){
  return props.reduce( (a,e)=>{a[e]=( STORE[e] || "" ) ; return a}  , {})
  
}

function unescapedCopy(){
  return props.reduce( (a,e)=>{a[e]=(0,_util__WEBPACK_IMPORTED_MODULE_0__.unescapeTags)( STORE[e] || "" ) ; return a}  , {})
}

function createWrapper(){
   const w = {};
   w.listProps = ()=> props.slice(0);
   w.copy = (escape)=> escape ? escapedCopy() : unescapedCopy();
   props.forEach( p=>{
      w[p] = (v)=>{ if(v===undefined){return (0,_util__WEBPACK_IMPORTED_MODULE_0__.unescapeTags)( STORE[p] || "" )} ;  
      const ev = (0,_util__WEBPACK_IMPORTED_MODULE_0__.escapeTags)(v);
      console.log("EV" , p , ev);
      if(STORE[p]===ev){return w}
      STORE[p]=ev ; updated(p,v) ; return w }
   } )
   return w;
}



/***/ }),

/***/ "./src/util.js":
/*!*********************!*\
  !*** ./src/util.js ***!
  \*********************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TheInput": () => (/* binding */ TheInput),
/* harmony export */   "escapeTags": () => (/* binding */ escapeTags),
/* harmony export */   "unescapeTags": () => (/* binding */ unescapeTags)
/* harmony export */ });
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
/* harmony import */ var preact_hooks__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! preact/hooks */ "./node_modules/preact/hooks/dist/hooks.module.js");
/* harmony import */ var htm_preact__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! htm/preact */ "./node_modules/htm/preact/index.module.js");
/* harmony import */ var _If__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./If */ "./src/If.js");





const tagsToReplace = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;'
};

const replaceToTags = {
  '&amp;':'&',
  '&lt;': '<',
  '&gt;': '>'
}

function escapeTags(s){
  if(typeof(s)!=='string'){return s};
  const replacer=(tag)=>{return tagsToReplace[tag]||tag}
  return s.replace(/[&<>]/g , replacer);
}
function unescapeTags(s){
  if(typeof(s)!=='string'){return s};
  const replacer=(tag)=>{return replaceToTags[tag]||tag}
  return s.replace(/&amp;|&lt;|&gt;/g , replacer);
}


function TheInput(props){
  const inp = (0,preact_hooks__WEBPACK_IMPORTED_MODULE_1__.useRef)(null);
  const onChange = ()=>{props.handler(inp.current.value)};

  return htm_preact__WEBPACK_IMPORTED_MODULE_2__.html`<div class="TheInput">
  <label class="label" for=${props.name || "" }>${props.title}</label>
  <${_If__WEBPACK_IMPORTED_MODULE_3__.If} condition=${props.area==true}>
  <textarea ref=${inp} 
  style="min-height: 120px;transition:height .5s"
  class=${"input biginout area"+props.name}
  name=${props.name || ""} 
  onfocus=${(e)=>{
     const bh = e.target.getBoundingClientRect().height;
     const sh = e.target.scrollHeight;
     if(sh>bh){
       e.target.style.height=(sh+16)+"px"
       }
    }}
  onblur=${ (e)=>e.target.style.height="120px" }
  onkeyup=${(e)=>{ 
     const bh = e.target.getBoundingClientRect().height;
     const sh = e.target.scrollHeight;
     if(sh>bh){
       e.target.style.height=(sh+16)+"px"
     }
     onChange()
    }}
  onchange=${(e)=>{ onChange(); }} >
  ${props.value || ""}
  </textarea>
  </${_If__WEBPACK_IMPORTED_MODULE_3__.If}>
  <${_If__WEBPACK_IMPORTED_MODULE_3__.If} condition=${props.area==false}>
  <input class="input" type="text" ref=${inp} name=${props.name || ""}
  value=${props.value || ""}
  onchange=${onChange}
  ></input>
  </${_If__WEBPACK_IMPORTED_MODULE_3__.If}>
  </div>`

}



/***/ }),

/***/ "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==":
/*!**********************************************************************************************************************************************************!*\
  !*** data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg== ***!
  \**********************************************************************************************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==";

/***/ }),

/***/ "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=":
/*!**************************************************************************************************************************************************************************!*\
  !*** data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII= ***!
  \**************************************************************************************************************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=";

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		__webpack_require__.b = document.baseURI || self.location.href;
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			"fiddler": 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		// no on chunks loaded
/******/ 		
/******/ 		// no jsonp function
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/nonce */
/******/ 	(() => {
/******/ 		__webpack_require__.nc = undefined;
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! preact */ "./node_modules/preact/dist/preact.module.js");
/* harmony import */ var _Fiddler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Fiddler */ "./src/Fiddler.js");
/* harmony import */ var _util__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./util */ "./src/util.js");
/* harmony import */ var _settings__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./settings */ "./src/settings.js");




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
const html=(0,_util__WEBPACK_IMPORTED_MODULE_2__.unescapeTags)( ht.innerHTML );
ht.remove();
const settings = (0,_settings__WEBPACK_IMPORTED_MODULE_3__.create)(window.settings || {});


//remove everything inside BODY
document.body.innerHTML = "<!--empty-->"
//load editor 

const Editor = (0,preact__WEBPACK_IMPORTED_MODULE_0__.h)(
   _Fiddler__WEBPACK_IMPORTED_MODULE_1__.Fiddler,
   {css,js,html,settings}
);
//    --- render it inside body
(0,preact__WEBPACK_IMPORTED_MODULE_0__.render)(Editor, document.body)

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFFOztBQUVGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLGFBQWEsWUFBWTtBQUN6QjtBQUNBO0FBQ0E7O0FBRUEsNEJBQTRCLDBCQUEwQjtBQUN0RDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsQ0FBQzs7Ozs7Ozs7Ozs7Ozs7OztBQ3Q1REQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EseUJBQXlCOztBQUV6QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EsV0FBVztBQUNYOztBQUVBO0FBQ0EsOEJBQThCOztBQUU5QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLE1BQU07QUFDTjtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxzQkFBc0I7QUFDdEI7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSxlQUFlOztBQUVmO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0EscUVBQXFFLDBCQUEwQjs7QUFFL0Y7QUFDQTtBQUNBO0FBQ0EsNEVBQTRFLGlCQUFpQjtBQUM3RjtBQUNBLDRFQUE0RSxpQkFBaUI7O0FBRTdGO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxxRkFBcUYsb0JBQW9CO0FBQ3pHO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBTTtBQUNOO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUztBQUNUOztBQUVBO0FBQ0EsaURBQWlELHNCQUFzQjtBQUN2RTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSw4QkFBOEI7QUFDOUI7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsOEJBQThCOztBQUU5QjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGlDQUFpQzs7QUFFakM7O0FBRUEsOEJBQThCOztBQUU5Qjs7QUFFQSwwQkFBMEI7O0FBRTFCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSw4Q0FBOEMsZUFBZTtBQUM3RDtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLFNBQVM7O0FBRVQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0EsU0FBUztBQUNUOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQSxLQUFLOztBQUVMO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtB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Y29kZWphci9jb2RlamFyLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvcHJpc21qcy90aGVtZXMvcHJpc20tZGFyay5jc3MiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9jb2RlZWRpdG9yLnNjc3MiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9maWRkbGVyLnNjc3MiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvaHRtL2Rpc3QvaHRtLm1vZHVsZS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL2h0bS9wcmVhY3QvaW5kZXgubW9kdWxlLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvcHJlYWN0L2Rpc3QvcHJlYWN0Lm1vZHVsZS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3ByZWFjdC9ob29rcy9kaXN0L2hvb2tzLm1vZHVsZS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3ByaXNtanMvcHJpc20uanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9zcGxpdC5qcy9kaXN0L3NwbGl0LmVzLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvcHJpc21qcy90aGVtZXMvcHJpc20tZGFyay5jc3M/MzVhMyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vc3JjL2NvZGVlZGl0b3Iuc2Nzcz81NmEyIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvZmlkZGxlci5zY3NzP2ExZDgiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vc3JjL0NvZGVFZGl0b3IuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9GaWRkbGVyLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvSWYuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9maWxlb3BzLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvc2V0dGluZ3MuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy91dGlsLmpzIiwid2VicGFjazovL2ZpZGRsZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZmlkZGxlci93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9maWRkbGVyL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9maWRkbGVyL3dlYnBhY2svcnVudGltZS9nbG9iYWwiLCJ3ZWJwYWNrOi8vZmlkZGxlci93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL2ZpZGRsZXIvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9maWRkbGVyL3dlYnBhY2svcnVudGltZS9qc29ucCBjaHVuayBsb2FkaW5nIiwid2VicGFjazovL2ZpZGRsZXIvd2VicGFjay9ydW50aW1lL25vbmNlIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZ2xvYmFsV2luZG93ID0gd2luZG93O1xuZXhwb3J0IGZ1bmN0aW9uIENvZGVKYXIoZWRpdG9yLCBoaWdobGlnaHQsIG9wdCA9IHt9KSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyB0YWI6ICdcXHQnLCBpbmRlbnRPbjogL1soe1xcW10kLywgbW92ZVRvTmV3TGluZTogL15bKX1cXF1dLywgc3BlbGxjaGVjazogZmFsc2UsIGNhdGNoVGFiOiB0cnVlLCBwcmVzZXJ2ZUlkZW50OiB0cnVlLCBhZGRDbG9zaW5nOiB0cnVlLCBoaXN0b3J5OiB0cnVlLCB3aW5kb3c6IGdsb2JhbFdpbmRvdyB9LCBvcHQpO1xuICAgIGNvbnN0IHdpbmRvdyA9IG9wdGlvbnMud2luZG93O1xuICAgIGNvbnN0IGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuICAgIGxldCBsaXN0ZW5lcnMgPSBbXTtcbiAgICBsZXQgaGlzdG9yeSA9IFtdO1xuICAgIGxldCBhdCA9IC0xO1xuICAgIGxldCBmb2N1cyA9IGZhbHNlO1xuICAgIGxldCBjYWxsYmFjaztcbiAgICBsZXQgcHJldjsgLy8gY29kZSBjb250ZW50IHByaW9yIGtleWRvd24gZXZlbnRcbiAgICBlZGl0b3Iuc2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnLCAncGxhaW50ZXh0LW9ubHknKTtcbiAgICBlZGl0b3Iuc2V0QXR0cmlidXRlKCdzcGVsbGNoZWNrJywgb3B0aW9ucy5zcGVsbGNoZWNrID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG4gICAgZWRpdG9yLnN0eWxlLm91dGxpbmUgPSAnbm9uZSc7XG4gICAgZWRpdG9yLnN0eWxlLm92ZXJmbG93V3JhcCA9ICdicmVhay13b3JkJztcbiAgICBlZGl0b3Iuc3R5bGUub3ZlcmZsb3dZID0gJ2F1dG8nO1xuICAgIGVkaXRvci5zdHlsZS53aGl0ZVNwYWNlID0gJ3ByZS13cmFwJztcbiAgICBsZXQgaXNMZWdhY3kgPSBmYWxzZTsgLy8gdHJ1ZSBpZiBwbGFpbnRleHQtb25seSBpcyBub3Qgc3VwcG9ydGVkXG4gICAgaGlnaGxpZ2h0KGVkaXRvcik7XG4gICAgaWYgKGVkaXRvci5jb250ZW50RWRpdGFibGUgIT09ICdwbGFpbnRleHQtb25seScpXG4gICAgICAgIGlzTGVnYWN5ID0gdHJ1ZTtcbiAgICBpZiAoaXNMZWdhY3kpXG4gICAgICAgIGVkaXRvci5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScsICd0cnVlJyk7XG4gICAgY29uc3QgZGVib3VuY2VIaWdobGlnaHQgPSBkZWJvdW5jZSgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHNhdmUoKTtcbiAgICAgICAgaGlnaGxpZ2h0KGVkaXRvciwgcG9zKTtcbiAgICAgICAgcmVzdG9yZShwb3MpO1xuICAgIH0sIDMwKTtcbiAgICBsZXQgcmVjb3JkaW5nID0gZmFsc2U7XG4gICAgY29uc3Qgc2hvdWxkUmVjb3JkID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIHJldHVybiAhaXNVbmRvKGV2ZW50KSAmJiAhaXNSZWRvKGV2ZW50KVxuICAgICAgICAgICAgJiYgZXZlbnQua2V5ICE9PSAnTWV0YSdcbiAgICAgICAgICAgICYmIGV2ZW50LmtleSAhPT0gJ0NvbnRyb2wnXG4gICAgICAgICAgICAmJiBldmVudC5rZXkgIT09ICdBbHQnXG4gICAgICAgICAgICAmJiAhZXZlbnQua2V5LnN0YXJ0c1dpdGgoJ0Fycm93Jyk7XG4gICAgfTtcbiAgICBjb25zdCBkZWJvdW5jZVJlY29yZEhpc3RvcnkgPSBkZWJvdW5jZSgoZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKHNob3VsZFJlY29yZChldmVudCkpIHtcbiAgICAgICAgICAgIHJlY29yZEhpc3RvcnkoKTtcbiAgICAgICAgICAgIHJlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSwgMzAwKTtcbiAgICBjb25zdCBvbiA9ICh0eXBlLCBmbikgPT4ge1xuICAgICAgICBsaXN0ZW5lcnMucHVzaChbdHlwZSwgZm5dKTtcbiAgICAgICAgZWRpdG9yLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4pO1xuICAgIH07XG4gICAgb24oJ2tleWRvd24nLCBldmVudCA9PiB7XG4gICAgICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBwcmV2ID0gdG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKG9wdGlvbnMucHJlc2VydmVJZGVudClcbiAgICAgICAgICAgIGhhbmRsZU5ld0xpbmUoZXZlbnQpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsZWdhY3lOZXdMaW5lRml4KGV2ZW50KTtcbiAgICAgICAgaWYgKG9wdGlvbnMuY2F0Y2hUYWIpXG4gICAgICAgICAgICBoYW5kbGVUYWJDaGFyYWN0ZXJzKGV2ZW50KTtcbiAgICAgICAgaWYgKG9wdGlvbnMuYWRkQ2xvc2luZylcbiAgICAgICAgICAgIGhhbmRsZVNlbGZDbG9zaW5nQ2hhcmFjdGVycyhldmVudCk7XG4gICAgICAgIGlmIChvcHRpb25zLmhpc3RvcnkpIHtcbiAgICAgICAgICAgIGhhbmRsZVVuZG9SZWRvKGV2ZW50KTtcbiAgICAgICAgICAgIGlmIChzaG91bGRSZWNvcmQoZXZlbnQpICYmICFyZWNvcmRpbmcpIHtcbiAgICAgICAgICAgICAgICByZWNvcmRIaXN0b3J5KCk7XG4gICAgICAgICAgICAgICAgcmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNMZWdhY3kpXG4gICAgICAgICAgICByZXN0b3JlKHNhdmUoKSk7XG4gICAgfSk7XG4gICAgb24oJ2tleXVwJywgZXZlbnQgPT4ge1xuICAgICAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKGV2ZW50LmlzQ29tcG9zaW5nKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAocHJldiAhPT0gdG9TdHJpbmcoKSlcbiAgICAgICAgICAgIGRlYm91bmNlSGlnaGxpZ2h0KCk7XG4gICAgICAgIGRlYm91bmNlUmVjb3JkSGlzdG9yeShldmVudCk7XG4gICAgICAgIGlmIChjYWxsYmFjaylcbiAgICAgICAgICAgIGNhbGxiYWNrKHRvU3RyaW5nKCkpO1xuICAgIH0pO1xuICAgIG9uKCdmb2N1cycsIF9ldmVudCA9PiB7XG4gICAgICAgIGZvY3VzID0gdHJ1ZTtcbiAgICB9KTtcbiAgICBvbignYmx1cicsIF9ldmVudCA9PiB7XG4gICAgICAgIGZvY3VzID0gZmFsc2U7XG4gICAgfSk7XG4gICAgb24oJ3Bhc3RlJywgZXZlbnQgPT4ge1xuICAgICAgICByZWNvcmRIaXN0b3J5KCk7XG4gICAgICAgIGhhbmRsZVBhc3RlKGV2ZW50KTtcbiAgICAgICAgcmVjb3JkSGlzdG9yeSgpO1xuICAgICAgICBpZiAoY2FsbGJhY2spXG4gICAgICAgICAgICBjYWxsYmFjayh0b1N0cmluZygpKTtcbiAgICB9KTtcbiAgICBmdW5jdGlvbiBzYXZlKCkge1xuICAgICAgICBjb25zdCBzID0gZ2V0U2VsZWN0aW9uKCk7XG4gICAgICAgIGNvbnN0IHBvcyA9IHsgc3RhcnQ6IDAsIGVuZDogMCwgZGlyOiB1bmRlZmluZWQgfTtcbiAgICAgICAgbGV0IHsgYW5jaG9yTm9kZSwgYW5jaG9yT2Zmc2V0LCBmb2N1c05vZGUsIGZvY3VzT2Zmc2V0IH0gPSBzO1xuICAgICAgICBpZiAoIWFuY2hvck5vZGUgfHwgIWZvY3VzTm9kZSlcbiAgICAgICAgICAgIHRocm93ICdlcnJvcjEnO1xuICAgICAgICAvLyBTZWxlY3Rpb24gYW5jaG9yIGFuZCBmb2N1cyBhcmUgZXhwZWN0ZWQgdG8gYmUgdGV4dCBub2RlcyxcbiAgICAgICAgLy8gc28gbm9ybWFsaXplIHRoZW0uXG4gICAgICAgIGlmIChhbmNob3JOb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgICAgIGFuY2hvck5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGFuY2hvck5vZGUuY2hpbGROb2Rlc1thbmNob3JPZmZzZXRdKTtcbiAgICAgICAgICAgIGFuY2hvck5vZGUgPSBub2RlO1xuICAgICAgICAgICAgYW5jaG9yT2Zmc2V0ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZm9jdXNOb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgICAgIGZvY3VzTm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgZm9jdXNOb2RlLmNoaWxkTm9kZXNbZm9jdXNPZmZzZXRdKTtcbiAgICAgICAgICAgIGZvY3VzTm9kZSA9IG5vZGU7XG4gICAgICAgICAgICBmb2N1c09mZnNldCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdmlzaXQoZWRpdG9yLCBlbCA9PiB7XG4gICAgICAgICAgICBpZiAoZWwgPT09IGFuY2hvck5vZGUgJiYgZWwgPT09IGZvY3VzTm9kZSkge1xuICAgICAgICAgICAgICAgIHBvcy5zdGFydCArPSBhbmNob3JPZmZzZXQ7XG4gICAgICAgICAgICAgICAgcG9zLmVuZCArPSBmb2N1c09mZnNldDtcbiAgICAgICAgICAgICAgICBwb3MuZGlyID0gYW5jaG9yT2Zmc2V0IDw9IGZvY3VzT2Zmc2V0ID8gJy0+JyA6ICc8LSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdzdG9wJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlbCA9PT0gYW5jaG9yTm9kZSkge1xuICAgICAgICAgICAgICAgIHBvcy5zdGFydCArPSBhbmNob3JPZmZzZXQ7XG4gICAgICAgICAgICAgICAgaWYgKCFwb3MuZGlyKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcy5kaXIgPSAnLT4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdzdG9wJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChlbCA9PT0gZm9jdXNOb2RlKSB7XG4gICAgICAgICAgICAgICAgcG9zLmVuZCArPSBmb2N1c09mZnNldDtcbiAgICAgICAgICAgICAgICBpZiAoIXBvcy5kaXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zLmRpciA9ICc8LSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3N0b3AnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlbC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgICAgICAgICAgICBpZiAocG9zLmRpciAhPSAnLT4nKVxuICAgICAgICAgICAgICAgICAgICBwb3Muc3RhcnQgKz0gZWwubm9kZVZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAocG9zLmRpciAhPSAnPC0nKVxuICAgICAgICAgICAgICAgICAgICBwb3MuZW5kICs9IGVsLm5vZGVWYWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjb2xsYXBzZSBlbXB0eSB0ZXh0IG5vZGVzXG4gICAgICAgIGVkaXRvci5ub3JtYWxpemUoKTtcbiAgICAgICAgcmV0dXJuIHBvcztcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVzdG9yZShwb3MpIHtcbiAgICAgICAgY29uc3QgcyA9IGdldFNlbGVjdGlvbigpO1xuICAgICAgICBsZXQgc3RhcnROb2RlLCBzdGFydE9mZnNldCA9IDA7XG4gICAgICAgIGxldCBlbmROb2RlLCBlbmRPZmZzZXQgPSAwO1xuICAgICAgICBpZiAoIXBvcy5kaXIpXG4gICAgICAgICAgICBwb3MuZGlyID0gJy0+JztcbiAgICAgICAgaWYgKHBvcy5zdGFydCA8IDApXG4gICAgICAgICAgICBwb3Muc3RhcnQgPSAwO1xuICAgICAgICBpZiAocG9zLmVuZCA8IDApXG4gICAgICAgICAgICBwb3MuZW5kID0gMDtcbiAgICAgICAgLy8gRmxpcCBzdGFydCBhbmQgZW5kIGlmIHRoZSBkaXJlY3Rpb24gcmV2ZXJzZWRcbiAgICAgICAgaWYgKHBvcy5kaXIgPT0gJzwtJykge1xuICAgICAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBwb3M7XG4gICAgICAgICAgICBwb3Muc3RhcnQgPSBlbmQ7XG4gICAgICAgICAgICBwb3MuZW5kID0gc3RhcnQ7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN1cnJlbnQgPSAwO1xuICAgICAgICB2aXNpdChlZGl0b3IsIGVsID0+IHtcbiAgICAgICAgICAgIGlmIChlbC5ub2RlVHlwZSAhPT0gTm9kZS5URVhUX05PREUpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgbGVuID0gKGVsLm5vZGVWYWx1ZSB8fCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnQgKyBsZW4gPiBwb3Muc3RhcnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGUgPSBlbDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRPZmZzZXQgPSBwb3Muc3RhcnQgLSBjdXJyZW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCArIGxlbiA+IHBvcy5lbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kTm9kZSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBlbmRPZmZzZXQgPSBwb3MuZW5kIC0gY3VycmVudDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdzdG9wJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyZW50ICs9IGxlbjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc3RhcnROb2RlKVxuICAgICAgICAgICAgc3RhcnROb2RlID0gZWRpdG9yLCBzdGFydE9mZnNldCA9IGVkaXRvci5jaGlsZE5vZGVzLmxlbmd0aDtcbiAgICAgICAgaWYgKCFlbmROb2RlKVxuICAgICAgICAgICAgZW5kTm9kZSA9IGVkaXRvciwgZW5kT2Zmc2V0ID0gZWRpdG9yLmNoaWxkTm9kZXMubGVuZ3RoO1xuICAgICAgICAvLyBGbGlwIGJhY2sgdGhlIHNlbGVjdGlvblxuICAgICAgICBpZiAocG9zLmRpciA9PSAnPC0nKSB7XG4gICAgICAgICAgICBbc3RhcnROb2RlLCBzdGFydE9mZnNldCwgZW5kTm9kZSwgZW5kT2Zmc2V0XSA9IFtlbmROb2RlLCBlbmRPZmZzZXQsIHN0YXJ0Tm9kZSwgc3RhcnRPZmZzZXRdO1xuICAgICAgICB9XG4gICAgICAgIHMuc2V0QmFzZUFuZEV4dGVudChzdGFydE5vZGUsIHN0YXJ0T2Zmc2V0LCBlbmROb2RlLCBlbmRPZmZzZXQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBiZWZvcmVDdXJzb3IoKSB7XG4gICAgICAgIGNvbnN0IHMgPSBnZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgY29uc3QgcjAgPSBzLmdldFJhbmdlQXQoMCk7XG4gICAgICAgIGNvbnN0IHIgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgICAgICByLnNlbGVjdE5vZGVDb250ZW50cyhlZGl0b3IpO1xuICAgICAgICByLnNldEVuZChyMC5zdGFydENvbnRhaW5lciwgcjAuc3RhcnRPZmZzZXQpO1xuICAgICAgICByZXR1cm4gci50b1N0cmluZygpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBhZnRlckN1cnNvcigpIHtcbiAgICAgICAgY29uc3QgcyA9IGdldFNlbGVjdGlvbigpO1xuICAgICAgICBjb25zdCByMCA9IHMuZ2V0UmFuZ2VBdCgwKTtcbiAgICAgICAgY29uc3QgciA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgIHIuc2VsZWN0Tm9kZUNvbnRlbnRzKGVkaXRvcik7XG4gICAgICAgIHIuc2V0U3RhcnQocjAuZW5kQ29udGFpbmVyLCByMC5lbmRPZmZzZXQpO1xuICAgICAgICByZXR1cm4gci50b1N0cmluZygpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBoYW5kbGVOZXdMaW5lKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IGJlZm9yZUN1cnNvcigpO1xuICAgICAgICAgICAgY29uc3QgYWZ0ZXIgPSBhZnRlckN1cnNvcigpO1xuICAgICAgICAgICAgbGV0IFtwYWRkaW5nXSA9IGZpbmRQYWRkaW5nKGJlZm9yZSk7XG4gICAgICAgICAgICBsZXQgbmV3TGluZVBhZGRpbmcgPSBwYWRkaW5nO1xuICAgICAgICAgICAgLy8gSWYgbGFzdCBzeW1ib2wgaXMgXCJ7XCIgaWRlbnQgbmV3IGxpbmVcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmluZGVudE9uLnRlc3QoYmVmb3JlKSkge1xuICAgICAgICAgICAgICAgIG5ld0xpbmVQYWRkaW5nICs9IG9wdGlvbnMudGFiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUHJlc2VydmUgcGFkZGluZ1xuICAgICAgICAgICAgaWYgKG5ld0xpbmVQYWRkaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaW5zZXJ0KCdcXG4nICsgbmV3TGluZVBhZGRpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbGVnYWN5TmV3TGluZUZpeChldmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQbGFjZSBhZGphY2VudCBcIn1cIiBvbiBuZXh0IGxpbmVcbiAgICAgICAgICAgIGlmIChuZXdMaW5lUGFkZGluZyAhPT0gcGFkZGluZyAmJiBvcHRpb25zLm1vdmVUb05ld0xpbmUudGVzdChhZnRlcikpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBzYXZlKCk7XG4gICAgICAgICAgICAgICAgaW5zZXJ0KCdcXG4nICsgcGFkZGluZyk7XG4gICAgICAgICAgICAgICAgcmVzdG9yZShwb3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxlZ2FjeU5ld0xpbmVGaXgoZXZlbnQpIHtcbiAgICAgICAgLy8gRmlyZWZveCBkb2VzIG5vdCBzdXBwb3J0IHBsYWludGV4dC1vbmx5IG1vZGVcbiAgICAgICAgLy8gYW5kIHB1dHMgPGRpdj48YnI+PC9kaXY+IG9uIEVudGVyLiBMZXQncyBoZWxwLlxuICAgICAgICBpZiAoaXNMZWdhY3kgJiYgZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGlmIChhZnRlckN1cnNvcigpID09ICcnKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0KCdcXG4gJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICAgICAgICAgIHBvcy5zdGFydCA9IC0tcG9zLmVuZDtcbiAgICAgICAgICAgICAgICByZXN0b3JlKHBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnNlcnQoJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGhhbmRsZVNlbGZDbG9zaW5nQ2hhcmFjdGVycyhldmVudCkge1xuICAgICAgICBjb25zdCBvcGVuID0gYChbeydcImA7XG4gICAgICAgIGNvbnN0IGNsb3NlID0gYCldfSdcImA7XG4gICAgICAgIGNvbnN0IGNvZGVBZnRlciA9IGFmdGVyQ3Vyc29yKCk7XG4gICAgICAgIGNvbnN0IGNvZGVCZWZvcmUgPSBiZWZvcmVDdXJzb3IoKTtcbiAgICAgICAgY29uc3QgZXNjYXBlQ2hhcmFjdGVyID0gY29kZUJlZm9yZS5zdWJzdHIoY29kZUJlZm9yZS5sZW5ndGggLSAxKSA9PT0gJ1xcXFwnO1xuICAgICAgICBjb25zdCBjaGFyQWZ0ZXIgPSBjb2RlQWZ0ZXIuc3Vic3RyKDAsIDEpO1xuICAgICAgICBpZiAoY2xvc2UuaW5jbHVkZXMoZXZlbnQua2V5KSAmJiAhZXNjYXBlQ2hhcmFjdGVyICYmIGNoYXJBZnRlciA9PT0gZXZlbnQua2V5KSB7XG4gICAgICAgICAgICAvLyBXZSBhbHJlYWR5IGhhdmUgY2xvc2luZyBjaGFyIG5leHQgdG8gY3Vyc29yLlxuICAgICAgICAgICAgLy8gTW92ZSBvbmUgY2hhciB0byByaWdodC5cbiAgICAgICAgICAgIGNvbnN0IHBvcyA9IHNhdmUoKTtcbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgICAgIHBvcy5zdGFydCA9ICsrcG9zLmVuZDtcbiAgICAgICAgICAgIHJlc3RvcmUocG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvcGVuLmluY2x1ZGVzKGV2ZW50LmtleSlcbiAgICAgICAgICAgICYmICFlc2NhcGVDaGFyYWN0ZXJcbiAgICAgICAgICAgICYmIChgXCInYC5pbmNsdWRlcyhldmVudC5rZXkpIHx8IFsnJywgJyAnLCAnXFxuJ10uaW5jbHVkZXMoY2hhckFmdGVyKSkpIHtcbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgICAgIGNvbnN0IHBvcyA9IHNhdmUoKTtcbiAgICAgICAgICAgIGNvbnN0IHdyYXBUZXh0ID0gcG9zLnN0YXJ0ID09IHBvcy5lbmQgPyAnJyA6IGdldFNlbGVjdGlvbigpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gZXZlbnQua2V5ICsgd3JhcFRleHQgKyBjbG9zZVtvcGVuLmluZGV4T2YoZXZlbnQua2V5KV07XG4gICAgICAgICAgICBpbnNlcnQodGV4dCk7XG4gICAgICAgICAgICBwb3Muc3RhcnQrKztcbiAgICAgICAgICAgIHBvcy5lbmQrKztcbiAgICAgICAgICAgIHJlc3RvcmUocG9zKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBoYW5kbGVUYWJDaGFyYWN0ZXJzKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXkgPT09ICdUYWInKSB7XG4gICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmUgPSBiZWZvcmVDdXJzb3IoKTtcbiAgICAgICAgICAgICAgICBsZXQgW3BhZGRpbmcsIHN0YXJ0LF0gPSBmaW5kUGFkZGluZyhiZWZvcmUpO1xuICAgICAgICAgICAgICAgIGlmIChwYWRkaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnVsbCBsZW5ndGggdGFiIG9yIGp1c3QgcmVtYWluaW5nIHBhZGRpbmdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVuID0gTWF0aC5taW4ob3B0aW9ucy50YWIubGVuZ3RoLCBwYWRkaW5nLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3RvcmUoeyBzdGFydCwgZW5kOiBzdGFydCArIGxlbiB9KTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2RlbGV0ZScpO1xuICAgICAgICAgICAgICAgICAgICBwb3Muc3RhcnQgLT0gbGVuO1xuICAgICAgICAgICAgICAgICAgICBwb3MuZW5kIC09IGxlbjtcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZShwb3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGluc2VydChvcHRpb25zLnRhYik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gaGFuZGxlVW5kb1JlZG8oZXZlbnQpIHtcbiAgICAgICAgaWYgKGlzVW5kbyhldmVudCkpIHtcbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgICAgIGF0LS07XG4gICAgICAgICAgICBjb25zdCByZWNvcmQgPSBoaXN0b3J5W2F0XTtcbiAgICAgICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3IuaW5uZXJIVE1MID0gcmVjb3JkLmh0bWw7XG4gICAgICAgICAgICAgICAgcmVzdG9yZShyZWNvcmQucG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdCA8IDApXG4gICAgICAgICAgICAgICAgYXQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1JlZG8oZXZlbnQpKSB7XG4gICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICBhdCsrO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gaGlzdG9yeVthdF07XG4gICAgICAgICAgICBpZiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgZWRpdG9yLmlubmVySFRNTCA9IHJlY29yZC5odG1sO1xuICAgICAgICAgICAgICAgIHJlc3RvcmUocmVjb3JkLnBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXQgPj0gaGlzdG9yeS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYXQtLTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZWNvcmRIaXN0b3J5KCkge1xuICAgICAgICBpZiAoIWZvY3VzKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBodG1sID0gZWRpdG9yLmlubmVySFRNTDtcbiAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICBjb25zdCBsYXN0UmVjb3JkID0gaGlzdG9yeVthdF07XG4gICAgICAgIGlmIChsYXN0UmVjb3JkKSB7XG4gICAgICAgICAgICBpZiAobGFzdFJlY29yZC5odG1sID09PSBodG1sXG4gICAgICAgICAgICAgICAgJiYgbGFzdFJlY29yZC5wb3Muc3RhcnQgPT09IHBvcy5zdGFydFxuICAgICAgICAgICAgICAgICYmIGxhc3RSZWNvcmQucG9zLmVuZCA9PT0gcG9zLmVuZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgYXQrKztcbiAgICAgICAgaGlzdG9yeVthdF0gPSB7IGh0bWwsIHBvcyB9O1xuICAgICAgICBoaXN0b3J5LnNwbGljZShhdCArIDEpO1xuICAgICAgICBjb25zdCBtYXhIaXN0b3J5ID0gMzAwO1xuICAgICAgICBpZiAoYXQgPiBtYXhIaXN0b3J5KSB7XG4gICAgICAgICAgICBhdCA9IG1heEhpc3Rvcnk7XG4gICAgICAgICAgICBoaXN0b3J5LnNwbGljZSgwLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBoYW5kbGVQYXN0ZShldmVudCkge1xuICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgIGNvbnN0IHRleHQgPSAoZXZlbnQub3JpZ2luYWxFdmVudCB8fCBldmVudClcbiAgICAgICAgICAgIC5jbGlwYm9hcmREYXRhXG4gICAgICAgICAgICAuZ2V0RGF0YSgndGV4dC9wbGFpbicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxyL2csICcnKTtcbiAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICBpbnNlcnQodGV4dCk7XG4gICAgICAgIGhpZ2hsaWdodChlZGl0b3IpO1xuICAgICAgICByZXN0b3JlKHtcbiAgICAgICAgICAgIHN0YXJ0OiBNYXRoLm1pbihwb3Muc3RhcnQsIHBvcy5lbmQpICsgdGV4dC5sZW5ndGgsXG4gICAgICAgICAgICBlbmQ6IE1hdGgubWluKHBvcy5zdGFydCwgcG9zLmVuZCkgKyB0ZXh0Lmxlbmd0aCxcbiAgICAgICAgICAgIGRpcjogJzwtJyxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHZpc2l0KGVkaXRvciwgdmlzaXRvcikge1xuICAgICAgICBjb25zdCBxdWV1ZSA9IFtdO1xuICAgICAgICBpZiAoZWRpdG9yLmZpcnN0Q2hpbGQpXG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGVkaXRvci5maXJzdENoaWxkKTtcbiAgICAgICAgbGV0IGVsID0gcXVldWUucG9wKCk7XG4gICAgICAgIHdoaWxlIChlbCkge1xuICAgICAgICAgICAgaWYgKHZpc2l0b3IoZWwpID09PSAnc3RvcCcpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBpZiAoZWwubmV4dFNpYmxpbmcpXG4gICAgICAgICAgICAgICAgcXVldWUucHVzaChlbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICBpZiAoZWwuZmlyc3RDaGlsZClcbiAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGVsLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgZWwgPSBxdWV1ZS5wb3AoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBpc0N0cmwoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNVbmRvKGV2ZW50KSB7XG4gICAgICAgIHJldHVybiBpc0N0cmwoZXZlbnQpICYmICFldmVudC5zaGlmdEtleSAmJiBldmVudC5jb2RlID09PSAnS2V5Wic7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzUmVkbyhldmVudCkge1xuICAgICAgICByZXR1cm4gaXNDdHJsKGV2ZW50KSAmJiBldmVudC5zaGlmdEtleSAmJiBldmVudC5jb2RlID09PSAnS2V5Wic7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluc2VydCh0ZXh0KSB7XG4gICAgICAgIHRleHQgPSB0ZXh0XG4gICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMDM5OycpO1xuICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnaW5zZXJ0SFRNTCcsIGZhbHNlLCB0ZXh0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZGVib3VuY2UoY2IsIHdhaXQpIHtcbiAgICAgICAgbGV0IHRpbWVvdXQgPSAwO1xuICAgICAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgIHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBjYiguLi5hcmdzKSwgd2FpdCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZpbmRQYWRkaW5nKHRleHQpIHtcbiAgICAgICAgLy8gRmluZCBiZWdpbm5pbmcgb2YgcHJldmlvdXMgbGluZS5cbiAgICAgICAgbGV0IGkgPSB0ZXh0Lmxlbmd0aCAtIDE7XG4gICAgICAgIHdoaWxlIChpID49IDAgJiYgdGV4dFtpXSAhPT0gJ1xcbicpXG4gICAgICAgICAgICBpLS07XG4gICAgICAgIGkrKztcbiAgICAgICAgLy8gRmluZCBwYWRkaW5nIG9mIHRoZSBsaW5lLlxuICAgICAgICBsZXQgaiA9IGk7XG4gICAgICAgIHdoaWxlIChqIDwgdGV4dC5sZW5ndGggJiYgL1sgXFx0XS8udGVzdCh0ZXh0W2pdKSlcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgcmV0dXJuIFt0ZXh0LnN1YnN0cmluZyhpLCBqKSB8fCAnJywgaSwgal07XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gZWRpdG9yLnRleHRDb250ZW50IHx8ICcnO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwcmV2ZW50RGVmYXVsdChldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3Rpb24oKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKCgoX2EgPSBlZGl0b3IucGFyZW50Tm9kZSkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLm5vZGVUeXBlKSA9PSBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUpIHtcbiAgICAgICAgICAgIHJldHVybiBlZGl0b3IucGFyZW50Tm9kZS5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2luZG93LmdldFNlbGVjdGlvbigpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICB1cGRhdGVPcHRpb25zKG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgbmV3T3B0aW9ucyk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZUNvZGUoY29kZSkge1xuICAgICAgICAgICAgZWRpdG9yLnRleHRDb250ZW50ID0gY29kZTtcbiAgICAgICAgICAgIGhpZ2hsaWdodChlZGl0b3IpO1xuICAgICAgICB9LFxuICAgICAgICBvblVwZGF0ZShjYikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBjYjtcbiAgICAgICAgfSxcbiAgICAgICAgdG9TdHJpbmcsXG4gICAgICAgIHNhdmUsXG4gICAgICAgIHJlc3RvcmUsXG4gICAgICAgIHJlY29yZEhpc3RvcnksXG4gICAgICAgIGRlc3Ryb3koKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBbdHlwZSwgZm5dIG9mIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGVkaXRvci5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xufVxuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiQGNoYXJzZXQgXFxcIlVURi04XFxcIjtcXG4vKipcXG4gKiBwcmlzbS5qcyBEYXJrIHRoZW1lIGZvciBKYXZhU2NyaXB0LCBDU1MgYW5kIEhUTUxcXG4gKiBCYXNlZCBvbiB0aGUgc2xpZGVzIG9mIHRoZSB0YWxrIOKAnC9SZWcoZXhwKXsyfWxhaW5lZC/igJ1cXG4gKiBAYXV0aG9yIExlYSBWZXJvdVxcbiAqL1xcbmNvZGVbY2xhc3MqPWxhbmd1YWdlLV0sXFxucHJlW2NsYXNzKj1sYW5ndWFnZS1dIHtcXG4gIGNvbG9yOiB3aGl0ZTtcXG4gIGJhY2tncm91bmQ6IG5vbmU7XFxuICB0ZXh0LXNoYWRvdzogMCAtMC4xZW0gMC4yZW0gYmxhY2s7XFxuICBmb250LWZhbWlseTogQ29uc29sYXMsIE1vbmFjbywgXFxcIkFuZGFsZSBNb25vXFxcIiwgXFxcIlVidW50dSBNb25vXFxcIiwgbW9ub3NwYWNlO1xcbiAgZm9udC1zaXplOiAxZW07XFxuICB0ZXh0LWFsaWduOiBsZWZ0O1xcbiAgd2hpdGUtc3BhY2U6IHByZTtcXG4gIHdvcmQtc3BhY2luZzogbm9ybWFsO1xcbiAgd29yZC1icmVhazogbm9ybWFsO1xcbiAgd29yZC13cmFwOiBub3JtYWw7XFxuICBsaW5lLWhlaWdodDogMS41O1xcbiAgLW1vei10YWItc2l6ZTogNDtcXG4gIC1vLXRhYi1zaXplOiA0O1xcbiAgdGFiLXNpemU6IDQ7XFxuICAtd2Via2l0LWh5cGhlbnM6IG5vbmU7XFxuICAtbW96LWh5cGhlbnM6IG5vbmU7XFxuICAtbXMtaHlwaGVuczogbm9uZTtcXG4gIGh5cGhlbnM6IG5vbmU7XFxufVxcblxcbkBtZWRpYSBwcmludCB7XFxuICBjb2RlW2NsYXNzKj1sYW5ndWFnZS1dLFxcbnByZVtjbGFzcyo9bGFuZ3VhZ2UtXSB7XFxuICAgIHRleHQtc2hhZG93OiBub25lO1xcbiAgfVxcbn1cXG5wcmVbY2xhc3MqPWxhbmd1YWdlLV0sXFxuOm5vdChwcmUpID4gY29kZVtjbGFzcyo9bGFuZ3VhZ2UtXSB7XFxuICBiYWNrZ3JvdW5kOiBoc2woMzBkZWcsIDIwJSwgMjUlKTtcXG59XFxuXFxuLyogQ29kZSBibG9ja3MgKi9cXG5wcmVbY2xhc3MqPWxhbmd1YWdlLV0ge1xcbiAgcGFkZGluZzogMWVtO1xcbiAgbWFyZ2luOiAwLjVlbSAwO1xcbiAgb3ZlcmZsb3c6IGF1dG87XFxuICBib3JkZXI6IDAuM2VtIHNvbGlkIGhzbCgzMGRlZywgMjAlLCA0MCUpO1xcbiAgYm9yZGVyLXJhZGl1czogMC41ZW07XFxuICBib3gtc2hhZG93OiAxcHggMXB4IDAuNWVtIGJsYWNrIGluc2V0O1xcbn1cXG5cXG4vKiBJbmxpbmUgY29kZSAqL1xcbjpub3QocHJlKSA+IGNvZGVbY2xhc3MqPWxhbmd1YWdlLV0ge1xcbiAgcGFkZGluZzogMC4xNWVtIDAuMmVtIDAuMDVlbTtcXG4gIGJvcmRlci1yYWRpdXM6IDAuM2VtO1xcbiAgYm9yZGVyOiAwLjEzZW0gc29saWQgaHNsKDMwZGVnLCAyMCUsIDQwJSk7XFxuICBib3gtc2hhZG93OiAxcHggMXB4IDAuM2VtIC0wLjFlbSBibGFjayBpbnNldDtcXG4gIHdoaXRlLXNwYWNlOiBub3JtYWw7XFxufVxcblxcbi50b2tlbi5jb21tZW50LFxcbi50b2tlbi5wcm9sb2csXFxuLnRva2VuLmRvY3R5cGUsXFxuLnRva2VuLmNkYXRhIHtcXG4gIGNvbG9yOiBoc2woMzBkZWcsIDIwJSwgNTAlKTtcXG59XFxuXFxuLnRva2VuLnB1bmN0dWF0aW9uIHtcXG4gIG9wYWNpdHk6IDAuNztcXG59XFxuXFxuLnRva2VuLm5hbWVzcGFjZSB7XFxuICBvcGFjaXR5OiAwLjc7XFxufVxcblxcbi50b2tlbi5wcm9wZXJ0eSxcXG4udG9rZW4udGFnLFxcbi50b2tlbi5ib29sZWFuLFxcbi50b2tlbi5udW1iZXIsXFxuLnRva2VuLmNvbnN0YW50LFxcbi50b2tlbi5zeW1ib2wge1xcbiAgY29sb3I6IGhzbCgzNTBkZWcsIDQwJSwgNzAlKTtcXG59XFxuXFxuLnRva2VuLnNlbGVjdG9yLFxcbi50b2tlbi5hdHRyLW5hbWUsXFxuLnRva2VuLnN0cmluZyxcXG4udG9rZW4uY2hhcixcXG4udG9rZW4uYnVpbHRpbixcXG4udG9rZW4uaW5zZXJ0ZWQge1xcbiAgY29sb3I6IGhzbCg3NWRlZywgNzAlLCA2MCUpO1xcbn1cXG5cXG4udG9rZW4ub3BlcmF0b3IsXFxuLnRva2VuLmVudGl0eSxcXG4udG9rZW4udXJsLFxcbi5sYW5ndWFnZS1jc3MgLnRva2VuLnN0cmluZyxcXG4uc3R5bGUgLnRva2VuLnN0cmluZyxcXG4udG9rZW4udmFyaWFibGUge1xcbiAgY29sb3I6IGhzbCg0MGRlZywgOTAlLCA2MCUpO1xcbn1cXG5cXG4udG9rZW4uYXRydWxlLFxcbi50b2tlbi5hdHRyLXZhbHVlLFxcbi50b2tlbi5rZXl3b3JkIHtcXG4gIGNvbG9yOiBoc2woMzUwZGVnLCA0MCUsIDcwJSk7XFxufVxcblxcbi50b2tlbi5yZWdleCxcXG4udG9rZW4uaW1wb3J0YW50IHtcXG4gIGNvbG9yOiAjZTkwO1xcbn1cXG5cXG4udG9rZW4uaW1wb3J0YW50LFxcbi50b2tlbi5ib2xkIHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbn1cXG5cXG4udG9rZW4uaXRhbGljIHtcXG4gIGZvbnQtc3R5bGU6IGl0YWxpYztcXG59XFxuXFxuLnRva2VuLmVudGl0eSB7XFxuICBjdXJzb3I6IGhlbHA7XFxufVxcblxcbi50b2tlbi5kZWxldGVkIHtcXG4gIGNvbG9yOiByZWQ7XFxufVwiLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL25vZGVfbW9kdWxlcy9wcmlzbWpzL3RoZW1lcy9wcmlzbS1kYXJrLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQSxnQkFBZ0I7QUFBaEI7Ozs7RUFBQTtBQU1BOztFQUVDLFlBQUE7RUFDQSxnQkFBQTtFQUNBLGlDQUFBO0VBQ0Esc0VBQUE7RUFDQSxjQUFBO0VBQ0EsZ0JBQUE7RUFDQSxnQkFBQTtFQUNBLG9CQUFBO0VBQ0Esa0JBQUE7RUFDQSxpQkFBQTtFQUNBLGdCQUFBO0VBRUEsZ0JBQUE7RUFDQSxjQUFBO0VBQ0EsV0FBQTtFQUVBLHFCQUFBO0VBQ0Esa0JBQUE7RUFDQSxpQkFBQTtFQUNBLGFBQUE7QUFERDs7QUFJQTtFQUNDOztJQUVDLGlCQUFBO0VBREE7QUFDRjtBQUlBOztFQUVDLGdDQUFBO0FBRkQ7O0FBS0EsZ0JBQUE7QUFDQTtFQUNDLFlBQUE7RUFDQSxlQUFBO0VBQ0EsY0FBQTtFQUNBLHdDQUFBO0VBQ0Esb0JBQUE7RUFDQSxxQ0FBQTtBQUZEOztBQUtBLGdCQUFBO0FBQ0E7RUFDQyw0QkFBQTtFQUNBLG9CQUFBO0VBQ0EseUNBQUE7RUFDQSw0Q0FBQTtFQUNBLG1CQUFBO0FBRkQ7O0FBS0E7Ozs7RUFJQywyQkFBQTtBQUZEOztBQUtBO0VBQ0MsWUFBQTtBQUZEOztBQUtBO0VBQ0MsWUFBQTtBQUZEOztBQUtBOzs7Ozs7RUFNQyw0QkFBQTtBQUZEOztBQUtBOzs7Ozs7RUFNQywyQkFBQTtBQUZEOztBQUtBOzs7Ozs7RUFNQywyQkFBQTtBQUZEOztBQUtBOzs7RUFHQyw0QkFBQTtBQUZEOztBQUtBOztFQUVDLFdBQUE7QUFGRDs7QUFLQTs7RUFFQyxpQkFBQTtBQUZEOztBQUlBO0VBQ0Msa0JBQUE7QUFERDs7QUFJQTtFQUNDLFlBQUE7QUFERDs7QUFJQTtFQUNDLFVBQUE7QUFERFwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIvKipcXG4gKiBwcmlzbS5qcyBEYXJrIHRoZW1lIGZvciBKYXZhU2NyaXB0LCBDU1MgYW5kIEhUTUxcXG4gKiBCYXNlZCBvbiB0aGUgc2xpZGVzIG9mIHRoZSB0YWxrIOKAnC9SZWcoZXhwKXsyfWxhaW5lZC/igJ1cXG4gKiBAYXV0aG9yIExlYSBWZXJvdVxcbiAqL1xcblxcbmNvZGVbY2xhc3MqPVxcXCJsYW5ndWFnZS1cXFwiXSxcXG5wcmVbY2xhc3MqPVxcXCJsYW5ndWFnZS1cXFwiXSB7XFxuXFx0Y29sb3I6IHdoaXRlO1xcblxcdGJhY2tncm91bmQ6IG5vbmU7XFxuXFx0dGV4dC1zaGFkb3c6IDAgLS4xZW0gLjJlbSBibGFjaztcXG5cXHRmb250LWZhbWlseTogQ29uc29sYXMsIE1vbmFjbywgJ0FuZGFsZSBNb25vJywgJ1VidW50dSBNb25vJywgbW9ub3NwYWNlO1xcblxcdGZvbnQtc2l6ZTogMWVtO1xcblxcdHRleHQtYWxpZ246IGxlZnQ7XFxuXFx0d2hpdGUtc3BhY2U6IHByZTtcXG5cXHR3b3JkLXNwYWNpbmc6IG5vcm1hbDtcXG5cXHR3b3JkLWJyZWFrOiBub3JtYWw7XFxuXFx0d29yZC13cmFwOiBub3JtYWw7XFxuXFx0bGluZS1oZWlnaHQ6IDEuNTtcXG5cXG5cXHQtbW96LXRhYi1zaXplOiA0O1xcblxcdC1vLXRhYi1zaXplOiA0O1xcblxcdHRhYi1zaXplOiA0O1xcblxcblxcdC13ZWJraXQtaHlwaGVuczogbm9uZTtcXG5cXHQtbW96LWh5cGhlbnM6IG5vbmU7XFxuXFx0LW1zLWh5cGhlbnM6IG5vbmU7XFxuXFx0aHlwaGVuczogbm9uZTtcXG59XFxuXFxuQG1lZGlhIHByaW50IHtcXG5cXHRjb2RlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0sXFxuXFx0cHJlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0ge1xcblxcdFxcdHRleHQtc2hhZG93OiBub25lO1xcblxcdH1cXG59XFxuXFxucHJlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0sXFxuOm5vdChwcmUpID4gY29kZVtjbGFzcyo9XFxcImxhbmd1YWdlLVxcXCJdIHtcXG5cXHRiYWNrZ3JvdW5kOiBoc2woMzAsIDIwJSwgMjUlKTtcXG59XFxuXFxuLyogQ29kZSBibG9ja3MgKi9cXG5wcmVbY2xhc3MqPVxcXCJsYW5ndWFnZS1cXFwiXSB7XFxuXFx0cGFkZGluZzogMWVtO1xcblxcdG1hcmdpbjogLjVlbSAwO1xcblxcdG92ZXJmbG93OiBhdXRvO1xcblxcdGJvcmRlcjogLjNlbSBzb2xpZCBoc2woMzAsIDIwJSwgNDAlKTtcXG5cXHRib3JkZXItcmFkaXVzOiAuNWVtO1xcblxcdGJveC1zaGFkb3c6IDFweCAxcHggLjVlbSBibGFjayBpbnNldDtcXG59XFxuXFxuLyogSW5saW5lIGNvZGUgKi9cXG46bm90KHByZSkgPiBjb2RlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0ge1xcblxcdHBhZGRpbmc6IC4xNWVtIC4yZW0gLjA1ZW07XFxuXFx0Ym9yZGVyLXJhZGl1czogLjNlbTtcXG5cXHRib3JkZXI6IC4xM2VtIHNvbGlkIGhzbCgzMCwgMjAlLCA0MCUpO1xcblxcdGJveC1zaGFkb3c6IDFweCAxcHggLjNlbSAtLjFlbSBibGFjayBpbnNldDtcXG5cXHR3aGl0ZS1zcGFjZTogbm9ybWFsO1xcbn1cXG5cXG4udG9rZW4uY29tbWVudCxcXG4udG9rZW4ucHJvbG9nLFxcbi50b2tlbi5kb2N0eXBlLFxcbi50b2tlbi5jZGF0YSB7XFxuXFx0Y29sb3I6IGhzbCgzMCwgMjAlLCA1MCUpO1xcbn1cXG5cXG4udG9rZW4ucHVuY3R1YXRpb24ge1xcblxcdG9wYWNpdHk6IC43O1xcbn1cXG5cXG4udG9rZW4ubmFtZXNwYWNlIHtcXG5cXHRvcGFjaXR5OiAuNztcXG59XFxuXFxuLnRva2VuLnByb3BlcnR5LFxcbi50b2tlbi50YWcsXFxuLnRva2VuLmJvb2xlYW4sXFxuLnRva2VuLm51bWJlcixcXG4udG9rZW4uY29uc3RhbnQsXFxuLnRva2VuLnN5bWJvbCB7XFxuXFx0Y29sb3I6IGhzbCgzNTAsIDQwJSwgNzAlKTtcXG59XFxuXFxuLnRva2VuLnNlbGVjdG9yLFxcbi50b2tlbi5hdHRyLW5hbWUsXFxuLnRva2VuLnN0cmluZyxcXG4udG9rZW4uY2hhcixcXG4udG9rZW4uYnVpbHRpbixcXG4udG9rZW4uaW5zZXJ0ZWQge1xcblxcdGNvbG9yOiBoc2woNzUsIDcwJSwgNjAlKTtcXG59XFxuXFxuLnRva2VuLm9wZXJhdG9yLFxcbi50b2tlbi5lbnRpdHksXFxuLnRva2VuLnVybCxcXG4ubGFuZ3VhZ2UtY3NzIC50b2tlbi5zdHJpbmcsXFxuLnN0eWxlIC50b2tlbi5zdHJpbmcsXFxuLnRva2VuLnZhcmlhYmxlIHtcXG5cXHRjb2xvcjogaHNsKDQwLCA5MCUsIDYwJSk7XFxufVxcblxcbi50b2tlbi5hdHJ1bGUsXFxuLnRva2VuLmF0dHItdmFsdWUsXFxuLnRva2VuLmtleXdvcmQge1xcblxcdGNvbG9yOiBoc2woMzUwLCA0MCUsIDcwJSk7XFxufVxcblxcbi50b2tlbi5yZWdleCxcXG4udG9rZW4uaW1wb3J0YW50IHtcXG5cXHRjb2xvcjogI2U5MDtcXG59XFxuXFxuLnRva2VuLmltcG9ydGFudCxcXG4udG9rZW4uYm9sZCB7XFxuXFx0Zm9udC13ZWlnaHQ6IGJvbGQ7XFxufVxcbi50b2tlbi5pdGFsaWMge1xcblxcdGZvbnQtc3R5bGU6IGl0YWxpYztcXG59XFxuXFxuLnRva2VuLmVudGl0eSB7XFxuXFx0Y3Vyc29yOiBoZWxwO1xcbn1cXG5cXG4udG9rZW4uZGVsZXRlZCB7XFxuXFx0Y29sb3I6IHJlZDtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiLkNvZGVFZGl0b3Ige1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAwcHg7XFxuICB3aWR0aDogMTAwJTtcXG4gIGJvdHRvbTogMDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMxZjFmMWM7XFxuICBjb2xvcjogc2lsdmVyO1xcbiAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTtcXG4gIHBhZGRpbmc6IDI0cHg7XFxuICBmb250LXNpemU6IDE2cHg7XFxuICBsaW5lLWhlaWdodDogMTIwJTtcXG4gIHNjcm9sbGJhci13aWR0aDogdGhpbjtcXG59XFxuLkNvZGVFZGl0b3I6Oi13ZWJraXQtc2Nyb2xsYmFyIHtcXG4gIHdpZHRoOiAwLjNlbTtcXG4gIGhlaWdodDogMC4zZW07XFxufVxcbi5Db2RlRWRpdG9yOjotd2Via2l0LXNjcm9sbGJhci1idXR0b24ge1xcbiAgYmFja2dyb3VuZDogIzFmMWYxYztcXG4gIGhlaWdodDogMXB4O1xcbn1cXG4uQ29kZUVkaXRvcjo6LXdlYmtpdC1zY3JvbGxiYXItdHJhY2stcGllY2Uge1xcbiAgYmFja2dyb3VuZDogIzFmMWYxYztcXG59XFxuLkNvZGVFZGl0b3I6Oi13ZWJraXQtc2Nyb2xsYmFyLXRodW1iIHtcXG4gIGJhY2tncm91bmQ6ICM5OTk7XFxuICBib3JkZXItcmFkaXVzOiAwLjE1ZW07XFxufVwiLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9jb2RlZWRpdG9yLnNjc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxrQkFBQTtFQUNBLFFBQUE7RUFDQSxXQUFBO0VBQ0EsU0FBQTtFQUNBLHlCQUFBO0VBQ0EsYUFBQTtFQUNBLHNCQUFBO0VBQ0EsYUFBQTtFQUNBLGVBQUE7RUFDQSxpQkFBQTtFQUNBLHFCQUFBO0FBQ0Y7QUFDRTtFQUNFLFlBQUE7RUFDQSxhQUFBO0FBQ0o7QUFDRTtFQUNFLG1CQUFBO0VBQ0EsV0FBQTtBQUNKO0FBQ0U7RUFDRSxtQkFBQTtBQUNKO0FBQ0U7RUFDRSxnQkFBQTtFQUNBLHFCQUFBO0FBQ0pcIixcInNvdXJjZXNDb250ZW50XCI6W1wiLkNvZGVFZGl0b3J7XFxyXFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxyXFxuICB0b3A6IDBweDtcXHJcXG4gIHdpZHRoOiAxMDAlO1xcclxcbiAgYm90dG9tOiAwO1xcclxcbiAgYmFja2dyb3VuZC1jb2xvcjogIzFmMWYxYztcXHJcXG4gIGNvbG9yOiBzaWx2ZXI7XFxyXFxuICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xcclxcbiAgcGFkZGluZzogMjRweDtcXHJcXG4gIGZvbnQtc2l6ZTogMTZweDtcXHJcXG4gIGxpbmUtaGVpZ2h0OiAxMjAlO1xcclxcbiAgc2Nyb2xsYmFyLXdpZHRoOiB0aGluO1xcclxcblxcclxcbiAgJjo6LXdlYmtpdC1zY3JvbGxiYXIge1xcclxcbiAgICB3aWR0aDogLjNlbTtcXHJcXG4gICAgaGVpZ2h0OiAuM2VtO1xcclxcbiAgfVxcclxcbiAgJjo6LXdlYmtpdC1zY3JvbGxiYXItYnV0dG9uIHtcXHJcXG4gICAgYmFja2dyb3VuZDogIzFmMWYxYztcXHJcXG4gICAgaGVpZ2h0OiAxcHg7XFxyXFxuICB9XFxyXFxuICAmOjotd2Via2l0LXNjcm9sbGJhci10cmFjay1waWVjZSB7XFxyXFxuICAgIGJhY2tncm91bmQ6ICMxZjFmMWM7XFxyXFxuICB9XFxyXFxuICAmOjotd2Via2l0LXNjcm9sbGJhci10aHVtYiB7XFxyXFxuICAgIGJhY2tncm91bmQ6ICM5OTk7XFxyXFxuICAgIGJvcmRlci1yYWRpdXM6IC4xNWVtO1xcclxcbiAgfVxcclxcbn1cXHJcXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8wX19fID0gbmV3IFVSTChcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQVVBQUFBZUNBWUFBQURrZnRTOUFBQUFJa2xFUVZRb1UyTTRjK2JNZnhBR0FnWVltd0dySUlpRGpyRUxqcG81YWlaZU13Rit5Tm5PczVLU3ZnQUFBQUJKUlU1RXJrSmdnZz09XCIsIGltcG9ydC5tZXRhLnVybCk7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzFfX18gPSBuZXcgVVJMKFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCNEFBQUFGQVFNQUFBQm83ODY1QUFBQUJsQk1WRVZIY0V6TXpNenlBdjJzQUFBQUFYUlNUbE1BUU9iWVpnQUFBQkJKUkVGVWVGNWpPQU1FRUFJRUVGd0FuM2tNd2NCNkkyQUFBQUFBU1VWT1JLNUNZSUk9XCIsIGltcG9ydC5tZXRhLnVybCk7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fXyA9IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18pO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzFfX18gPSBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8xX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBcImJvZHksIGh0bWwge1xcbiAgcGFkZGluZzogMDtcXG4gIG1hcmdpbjogMDtcXG4gIG1pbi13aWR0aDogMTAwJTtcXG4gIGZvbnQtZmFtaWx5OiBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmO1xcbiAgZm9udC1zaXplOiAxNnB4O1xcbn1cXG5ib2R5ICosIGh0bWwgKiB7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbn1cXG5cXG4uRmlkZGxlciB7XFxuICB3aWR0aDogMTAwJTtcXG4gIGhlaWdodDogMTAwdmg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBzaWx2ZXI7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG59XFxuLkZpZGRsZXIuc2V0dGluZ3MgI21haW5Db250YWluZXIge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuLkZpZGRsZXIubWFpbiAjc2V0dGluZ3NDb250YWluZXIge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuLkZpZGRsZXIgI21haW5Db250YWluZXIsIC5GaWRkbGVyICNlZGl0b3JzIHtcXG4gIGZsZXgtZ3JvdzogMTtcXG59XFxuLkZpZGRsZXIgI21haW5Db250YWluZXIge1xcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG59XFxuLkZpZGRsZXIgI21haW5Db250YWluZXIgaWZyYW1lIHtcXG4gIGZsZXgtZ3JvdzogMTtcXG4gIGJvcmRlcjogbm9uZTtcXG4gIGhlaWdodDogNjAlO1xcbn1cXG4uRmlkZGxlciAjc2V0dGluZ3NDb250YWluZXIge1xcbiAgcGFkZGluZzogMTZweDtcXG59XFxuXFxuI2VkaXRvcnMgLmVkaXRvckNvbnRhaW5lciB7XFxuICBmbGV4LWdyb3c6IDE7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxufVxcbiNlZGl0b3JzIC5lZGl0b3JDb250YWluZXIgaDMge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgY29sb3I6IHdoaXRlO1xcbiAgb3BhY2l0eTogMC4zO1xcbiAgei1pbmRleDogMTA7XFxuICBmb250LXNpemU6IDEzcHg7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgaGVpZ2h0OiAyNHB4O1xcbiAgbWFyZ2luOiAwO1xcbiAgcGFkZGluZzogNHB4O1xcbiAgcGFkZGluZy1sZWZ0OiAxMnB4O1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuICB1c2VyLXNlbGVjdDogbm9uZTtcXG4gIGxldHRlci1zcGFjaW5nOiAwLjA1ZW07XFxufVxcblxcbiN0b29sYmFyIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiA2NHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzY2NjtcXG4gIGNvbG9yOiB3aGl0ZTtcXG4gIHBhZGRpbmc6IDE2cHg7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcXG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG59XFxuI3Rvb2xiYXIgaW5wdXRbdHlwZT1idXR0b25dIHtcXG4gIGhlaWdodDogMzJweDtcXG4gIHBhZGRpbmctbGVmdDogMTZweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDE2cHg7XFxuICBib3JkZXI6IG5vbmU7XFxuICBvdXRsaW5lOiBub25lO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4jdG9vbGJhciBpbnB1dFt0eXBlPWJ1dHRvbl0ubW9kaWZpZWQge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogb3JhbmdlcmVkO1xcbn1cXG5cXG4uc2V0dGluZ3NQYW5lbCB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcXG4gIGp1c3RpZnktY29udGVudDogc3RyZXRjaDtcXG59XFxuLnNldHRpbmdzUGFuZWwgKiB7XFxuICBmbGV4LWdyb3c6IDAuNzU7XFxufVxcbi5zZXR0aW5nc1BhbmVsIC5sZWZ0IHtcXG4gIHBhZGRpbmctcmlnaHQ6IDE2cHg7XFxuICBtYXJnaW4tYm90dG9tOiAtMXJlbTtcXG59XFxuLnNldHRpbmdzUGFuZWwgLnJpZ2h0IHtcXG4gIGZsZXgtZ3JvdzogMS41O1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuICBqdXN0aWZ5LWNvbnRlbnQ6IHN0cmV0Y2g7XFxufVxcbi5zZXR0aW5nc1BhbmVsIGxhYmVsIHtcXG4gIGRpc3BsYXk6IGJsb2NrO1xcbiAgZm9udC1zaXplOiAxM3B4O1xcbiAgcGFkZGluZzogNnB4IDRweDtcXG4gIGZsZXgtZ3JvdzogMDtcXG59XFxuLnNldHRpbmdzUGFuZWwgaW5wdXQsIC5zZXR0aW5nc1BhbmVsIHRleHRhcmVhLCAuc2V0dGluZ3NQYW5lbCBzZWxlY3Qge1xcbiAgd2lkdGg6IDEwMCU7XFxuICBtYXJnaW4tYm90dG9tOiAxcmVtO1xcbiAgZm9udC1zaXplOiBpbmhlcml0O1xcbiAgYm9yZGVyOiBub25lO1xcbiAgcGFkZGluZzogOHB4O1xcbiAgcmVzaXplOiBub25lO1xcbn1cXG4uc2V0dGluZ3NQYW5lbCBpbnB1dCwgLnNldHRpbmdzUGFuZWwgdGV4dGFyZWEsIC5zZXR0aW5nc1BhbmVsIC5Db2RlRWRpdG9yLCAuc2V0dGluZ3NQYW5lbCBzZWxlY3Qge1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4uc2V0dGluZ3NQYW5lbCAuQ29kZUVkaXRvciB7XFxuICBwYWRkaW5nOiA4cHg7XFxuICBoZWlnaHQ6IGF1dG87XFxufVxcbkBtZWRpYSAobWF4LXdpZHRoOiAxMDAwcHgpIHtcXG4gIC5zZXR0aW5nc1BhbmVsIHtcXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gIH1cXG4gIC5zZXR0aW5nc1BhbmVsIC5sZWZ0IHtcXG4gICAgcGFkZGluZy1yaWdodDogMDtcXG4gICAgbWFyZ2luLWJvdHRvbTogMDtcXG4gIH1cXG4gIC5zZXR0aW5nc1BhbmVsIC5yaWdodCB7XFxuICAgIG1pbi1oZWlnaHQ6IDMwMHB4O1xcbiAgfVxcbn1cXG5cXG4uc3BsaXQge1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGZsZXgtZ3JvdzogMTtcXG59XFxuLnNwbGl0Lmhvcml6b250YWwge1xcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcXG59XFxuXFxuLmd1dHRlciB7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNjY2O1xcbiAgYmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcXG4gIGJhY2tncm91bmQtcG9zaXRpb246IDUwJTtcXG59XFxuXFxuLmd1dHRlci5ndXR0ZXItaG9yaXpvbnRhbCB7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoXCIgKyBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8wX19fICsgXCIpO1xcbiAgY3Vyc29yOiBjb2wtcmVzaXplO1xcbn1cXG5cXG4uZ3V0dGVyLmd1dHRlci12ZXJ0aWNhbCB7XFxuICBiYWNrZ3JvdW5kLWltYWdlOiB1cmwoXCIgKyBfX19DU1NfTE9BREVSX1VSTF9SRVBMQUNFTUVOVF8xX19fICsgXCIpO1xcbiAgY3Vyc29yOiByb3ctcmVzaXplO1xcbn1cIiwgXCJcIix7XCJ2ZXJzaW9uXCI6MyxcInNvdXJjZXNcIjpbXCJ3ZWJwYWNrOi8vLi9zcmMvZmlkZGxlci5zY3NzXCJdLFwibmFtZXNcIjpbXSxcIm1hcHBpbmdzXCI6XCJBQUFBO0VBQ0UsVUFBQTtFQUNBLFNBQUE7RUFDQSxlQUFBO0VBQ0EseUNBQUE7RUFDQSxlQUFBO0FBQ0Y7QUFBRTtFQUNFLHNCQUFBO0FBRUo7O0FBRUE7RUFDRSxXQUFBO0VBQ0EsYUFBQTtFQUNBLHdCQUFBO0VBQ0EsYUFBQTtFQUNBLHNCQUFBO0FBQ0Y7QUFFSTtFQUNFLGFBQUE7QUFBTjtBQUtJO0VBQ0UsYUFBQTtBQUhOO0FBT0U7RUFDRSxZQUFBO0FBTEo7QUFRRTtFQUNFLHNCQUFBO0FBTko7QUFPSTtFQUNFLFlBQUE7RUFDQSxZQUFBO0VBQ0EsV0FBQTtBQUxOO0FBUUU7RUFDRSxhQUFBO0FBTko7O0FBWUU7RUFDRSxZQUFBO0VBQ0Esa0JBQUE7QUFUSjtBQVVJO0VBQ0Usa0JBQUE7RUFDQSxZQUFBO0VBQ0EsWUFBQTtFQUNBLFdBQUE7RUFDQSxlQUFBO0VBQ0EsbUJBQUE7RUFDQSxZQUFBO0VBQ0EsU0FBQTtFQUNBLFlBQUE7RUFDQSxrQkFBQTtFQUNBLG9CQUFBO0VBQ0EsaUJBQUE7RUFDQSxzQkFBQTtBQVJOOztBQWNBO0VBQ0UsV0FBQTtFQUNBLFlBQUE7RUFDQSxzQkFBQTtFQUNBLFlBQUE7RUFDQSxhQUFBO0VBQ0EsYUFBQTtFQUNBLG1CQUFBO0VBQ0EsOEJBQUE7QUFYRjtBQVlFO0VBQ0UsWUFBQTtFQUNBLGtCQUFBO0VBQ0EsbUJBQUE7RUFDQSxZQUFBO0VBQ0EsYUFBQTtFQUNBLGtCQUFBO0FBVko7QUFXSTtFQUNFLDJCQUFBO0FBVE47O0FBY0E7RUFDSSxhQUFBO0VBQ0EsbUJBQUE7RUFDQSx3QkFBQTtBQVhKO0FBWUk7RUFDRSxlQUFBO0FBVk47QUFZSTtFQUNFLG1CQUFBO0VBQ0Esb0JBQUE7QUFWTjtBQVlJO0VBQ0UsY0FBQTtFQUNBLGFBQUE7RUFDQSxzQkFBQTtFQUNBLHdCQUFBO0FBVk47QUFZSTtFQUNFLGNBQUE7RUFDQSxlQUFBO0VBQ0EsZ0JBQUE7RUFDQSxZQUFBO0FBVk47QUFhSTtFQUNFLFdBQUE7RUFDQSxtQkFBQTtFQUNBLGtCQUFBO0VBQ0EsWUFBQTtFQUNBLFlBQUE7RUFDQSxZQUFBO0FBWE47QUFhSTtFQUNFLGtCQUFBO0FBWE47QUFhSTtFQUNFLFlBQUE7RUFDQSxZQUFBO0FBWE47QUFhSTtFQXZDSjtJQXdDTSxzQkFBQTtFQVZKO0VBV0k7SUFDRSxnQkFBQTtJQUNBLGdCQUFBO0VBVE47RUFXSTtJQUNFLGlCQUFBO0VBVE47QUFDRjs7QUFhQTtFQUNJLGFBQUE7RUFDQSxZQUFBO0FBVko7QUFXSTtFQUVFLG1CQUFBO0FBVk47O0FBY0E7RUFDSSxzQkFBQTtFQUNBLDRCQUFBO0VBQ0Esd0JBQUE7QUFYSjs7QUFjQTtFQUNJLHlEQUFBO0VBQ0Esa0JBQUE7QUFYSjs7QUFhQTtFQUNJLHlEQUFBO0VBQ0Esa0JBQUE7QUFWSlwiLFwic291cmNlc0NvbnRlbnRcIjpbXCJib2R5LCBodG1se1xcclxcbiAgcGFkZGluZzogMDtcXHJcXG4gIG1hcmdpbjogMDtcXHJcXG4gIG1pbi13aWR0aDogMTAwJTtcXHJcXG4gIGZvbnQtZmFtaWx5OiBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmO1xcclxcbiAgZm9udC1zaXplOiAxNnB4O1xcclxcbiAgKntcXHJcXG4gICAgYm94LXNpemluZzogYm9yZGVyLWJveDtcXHJcXG4gIH1cXHJcXG59XFxyXFxuXFxyXFxuLkZpZGRsZXJ7XFxyXFxuICB3aWR0aDogMTAwJTtcXHJcXG4gIGhlaWdodDogMTAwdmg7XFxyXFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBzaWx2ZXI7XFxyXFxuICBkaXNwbGF5OiBmbGV4O1xcclxcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXHJcXG5cXHJcXG4gICYuc2V0dGluZ3N7XFxyXFxuICAgICNtYWluQ29udGFpbmVye1xcclxcbiAgICAgIGRpc3BsYXk6IG5vbmU7XFxyXFxuICAgIH1cXHJcXG4gIH1cXHJcXG5cXHJcXG4gICYubWFpbntcXHJcXG4gICAgI3NldHRpbmdzQ29udGFpbmVye1xcclxcbiAgICAgIGRpc3BsYXk6IG5vbmU7XFxyXFxuICAgIH1cXHJcXG4gIH1cXHJcXG5cXHJcXG4gICNtYWluQ29udGFpbmVyICwgI2VkaXRvcnN7XFxyXFxuICAgIGZsZXgtZ3JvdzogMTtcXHJcXG4gIH1cXHJcXG5cXHJcXG4gICNtYWluQ29udGFpbmVye1xcclxcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xcclxcbiAgICBpZnJhbWV7XFxyXFxuICAgICAgZmxleC1ncm93OiAxO1xcclxcbiAgICAgIGJvcmRlcjogbm9uZTtcXHJcXG4gICAgICBoZWlnaHQ6IDYwJTtcXHJcXG4gICAgfVxcclxcbiAgfVxcclxcbiAgI3NldHRpbmdzQ29udGFpbmVye1xcclxcbiAgICBwYWRkaW5nOiAxNnB4O1xcclxcbiAgfVxcclxcblxcclxcbn1cXHJcXG5cXHJcXG4jZWRpdG9yc3tcXHJcXG4gIC5lZGl0b3JDb250YWluZXJ7XFxyXFxuICAgIGZsZXgtZ3JvdzogMTtcXHJcXG4gICAgcG9zaXRpb246IHJlbGF0aXZlO1xcclxcbiAgICBoM3tcXHJcXG4gICAgICBwb3NpdGlvbjogYWJzb2x1dGU7XFxyXFxuICAgICAgY29sb3I6IHdoaXRlO1xcclxcbiAgICAgIG9wYWNpdHk6IC4zO1xcclxcbiAgICAgIHotaW5kZXg6IDEwO1xcclxcbiAgICAgIGZvbnQtc2l6ZTogMTNweDtcXHJcXG4gICAgICBmb250LXdlaWdodDogbm9ybWFsO1xcclxcbiAgICAgIGhlaWdodDogMjRweDtcXHJcXG4gICAgICBtYXJnaW46IDA7XFxyXFxuICAgICAgcGFkZGluZzogNHB4O1xcclxcbiAgICAgIHBhZGRpbmctbGVmdDogMTJweDtcXHJcXG4gICAgICBwb2ludGVyLWV2ZW50czogbm9uZTtcXHJcXG4gICAgICB1c2VyLXNlbGVjdDogbm9uZTtcXHJcXG4gICAgICBsZXR0ZXItc3BhY2luZzogMC4wNWVtO1xcclxcbiAgICB9XFxyXFxuICB9XFxyXFxuXFxyXFxufVxcclxcblxcclxcbiN0b29sYmFye1xcclxcbiAgd2lkdGg6IDEwMCU7XFxyXFxuICBoZWlnaHQ6IDY0cHg7XFxyXFxuICBiYWNrZ3JvdW5kLWNvbG9yOiAjNjY2O1xcclxcbiAgY29sb3I6IHdoaXRlO1xcclxcbiAgcGFkZGluZzogMTZweDtcXHJcXG4gIGRpc3BsYXk6IGZsZXg7XFxyXFxuICBmbGV4LWRpcmVjdGlvbjogcm93O1xcclxcbiAganVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xcclxcbiAgaW5wdXRbdHlwZT1idXR0b25de1xcclxcbiAgICBoZWlnaHQ6IDMycHg7XFxyXFxuICAgIHBhZGRpbmctbGVmdDogMTZweDtcXHJcXG4gICAgcGFkZGluZy1yaWdodDogMTZweDtcXHJcXG4gICAgYm9yZGVyOiBub25lO1xcclxcbiAgICBvdXRsaW5lOiBub25lO1xcclxcbiAgICBib3JkZXItcmFkaXVzOiA0cHg7XFxyXFxuICAgICYubW9kaWZpZWR7XFxyXFxuICAgICAgYmFja2dyb3VuZC1jb2xvcjogb3JhbmdlcmVkO1xcclxcbiAgICB9XFxyXFxuICB9XFxyXFxufVxcclxcblxcclxcbi5zZXR0aW5nc1BhbmVse1xcclxcbiAgICBkaXNwbGF5OiBmbGV4O1xcclxcbiAgICBmbGV4LWRpcmVjdGlvbjogcm93O1xcclxcbiAgICBqdXN0aWZ5LWNvbnRlbnQ6IHN0cmV0Y2g7XFxyXFxuICAgICp7XFxyXFxuICAgICAgZmxleC1ncm93OiAwLjc1O1xcclxcbiAgICB9XFxyXFxuICAgIC5sZWZ0e1xcclxcbiAgICAgIHBhZGRpbmctcmlnaHQ6IDE2cHg7XFxyXFxuICAgICAgbWFyZ2luLWJvdHRvbTogLTFyZW07XFxyXFxuICAgIH1cXHJcXG4gICAgLnJpZ2h0e1xcclxcbiAgICAgIGZsZXgtZ3JvdzogMS41O1xcclxcbiAgICAgIGRpc3BsYXk6IGZsZXg7XFxyXFxuICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXHJcXG4gICAgICBqdXN0aWZ5LWNvbnRlbnQ6IHN0cmV0Y2g7XFxyXFxuICAgIH1cXHJcXG4gICAgbGFiZWx7XFxyXFxuICAgICAgZGlzcGxheTogYmxvY2s7XFxyXFxuICAgICAgZm9udC1zaXplOiAxM3B4O1xcclxcbiAgICAgIHBhZGRpbmc6ICA2cHggNHB4O1xcclxcbiAgICAgIGZsZXgtZ3JvdzogMDtcXHJcXG5cXHJcXG4gICAgfVxcclxcbiAgICBpbnB1dCwgdGV4dGFyZWEgLCBzZWxlY3R7XFxyXFxuICAgICAgd2lkdGg6IDEwMCU7XFxyXFxuICAgICAgbWFyZ2luLWJvdHRvbTogMXJlbTtcXHJcXG4gICAgICBmb250LXNpemU6IGluaGVyaXQ7XFxyXFxuICAgICAgYm9yZGVyOiBub25lO1xcclxcbiAgICAgIHBhZGRpbmc6IDhweDtcXHJcXG4gICAgICByZXNpemU6IG5vbmU7XFxyXFxuICAgIH1cXHJcXG4gICAgaW5wdXQsIHRleHRhcmVhLCAuQ29kZUVkaXRvciwgc2VsZWN0e1xcclxcbiAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcXHJcXG4gICAgfVxcclxcbiAgICAuQ29kZUVkaXRvcntcXHJcXG4gICAgICBwYWRkaW5nOiA4cHggO1xcclxcbiAgICAgIGhlaWdodDogYXV0bztcXHJcXG4gICAgfVxcclxcbiAgICBAbWVkaWEobWF4LXdpZHRoOiAxMDAwcHgpe1xcclxcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxyXFxuICAgICAgLmxlZnR7XFxyXFxuICAgICAgICBwYWRkaW5nLXJpZ2h0OiAwO1xcclxcbiAgICAgICAgbWFyZ2luLWJvdHRvbTogMDtcXHJcXG4gICAgICB9XFxyXFxuICAgICAgLnJpZ2h0e1xcclxcbiAgICAgICAgbWluLWhlaWdodDogMzAwcHg7XFxyXFxuICAgICAgfVxcclxcbiAgICB9XFxyXFxufVxcclxcblxcclxcbi5zcGxpdCB7XFxyXFxuICAgIGRpc3BsYXk6IGZsZXg7XFxyXFxuICAgIGZsZXgtZ3JvdzogMTtcXHJcXG4gICAgJi5ob3Jpem9udGFsLy9mb3IgaG9yaXpvbnRhbCAgfCB8IHwgfFxcclxcbiAgICB7XFxyXFxuICAgICAgZmxleC1kaXJlY3Rpb246IHJvdztcXHJcXG4gICAgfVxcclxcbn1cXHJcXG5cXHJcXG4uZ3V0dGVyIHtcXHJcXG4gICAgYmFja2dyb3VuZC1jb2xvcjogIzY2NjtcXHJcXG4gICAgYmFja2dyb3VuZC1yZXBlYXQ6IG5vLXJlcGVhdDtcXHJcXG4gICAgYmFja2dyb3VuZC1wb3NpdGlvbjogNTAlO1xcclxcbn1cXHJcXG5cXHJcXG4uZ3V0dGVyLmd1dHRlci1ob3Jpem9udGFsIHtcXHJcXG4gICAgYmFja2dyb3VuZC1pbWFnZTogdXJsKCdkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUFVQUFBQWVDQVlBQUFEa2Z0UzlBQUFBSWtsRVFWUW9VMk00YytiTWZ4QUdBZ1lZbXdHcklJaURqckVManBvNWFpWmVNd0YreU5uT3M1S1N2Z0FBQUFCSlJVNUVya0pnZ2c9PScpO1xcclxcbiAgICBjdXJzb3I6IGNvbC1yZXNpemU7XFxyXFxufVxcclxcbi5ndXR0ZXIuZ3V0dGVyLXZlcnRpY2FsIHtcXHJcXG4gICAgYmFja2dyb3VuZC1pbWFnZTogdXJsKCdkYXRhOmltYWdlL3BuZztiYXNlNjQsaVZCT1J3MEtHZ29BQUFBTlNVaEVVZ0FBQUI0QUFBQUZBUU1BQUFCbzc4NjVBQUFBQmxCTVZFVkhjRXpNek16eUF2MnNBQUFBQVhSU1RsTUFRT2JZWmdBQUFCQkpSRUZVZUY1ak9BTUVFQUlFRUZ3QW4za013Y0I2STJBQUFBQUFTVVZPUks1Q1lJST0nKTtcXHJcXG4gICAgY3Vyc29yOiByb3ctcmVzaXplO1xcclxcbn1cXHJcXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qXG4gIE1JVCBMaWNlbnNlIGh0dHA6Ly93d3cub3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvbWl0LWxpY2Vuc2UucGhwXG4gIEF1dGhvciBUb2JpYXMgS29wcGVycyBAc29rcmFcbiovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChjc3NXaXRoTWFwcGluZ1RvU3RyaW5nKSB7XG4gIHZhciBsaXN0ID0gW107IC8vIHJldHVybiB0aGUgbGlzdCBvZiBtb2R1bGVzIGFzIGNzcyBzdHJpbmdcblxuICBsaXN0LnRvU3RyaW5nID0gZnVuY3Rpb24gdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICB2YXIgY29udGVudCA9IFwiXCI7XG4gICAgICB2YXIgbmVlZExheWVyID0gdHlwZW9mIGl0ZW1bNV0gIT09IFwidW5kZWZpbmVkXCI7XG5cbiAgICAgIGlmIChpdGVtWzRdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW1bMl0pIHtcbiAgICAgICAgY29udGVudCArPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKTtcbiAgICAgIH1cblxuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwiQGxheWVyXCIuY29uY2F0KGl0ZW1bNV0ubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChpdGVtWzVdKSA6IFwiXCIsIFwiIHtcIik7XG4gICAgICB9XG5cbiAgICAgIGNvbnRlbnQgKz0gY3NzV2l0aE1hcHBpbmdUb1N0cmluZyhpdGVtKTtcblxuICAgICAgaWYgKG5lZWRMYXllcikge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXRlbVsyXSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwifVwiO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gY29udGVudDtcbiAgICB9KS5qb2luKFwiXCIpO1xuICB9OyAvLyBpbXBvcnQgYSBsaXN0IG9mIG1vZHVsZXMgaW50byB0aGUgbGlzdFxuXG5cbiAgbGlzdC5pID0gZnVuY3Rpb24gaShtb2R1bGVzLCBtZWRpYSwgZGVkdXBlLCBzdXBwb3J0cywgbGF5ZXIpIHtcbiAgICBpZiAodHlwZW9mIG1vZHVsZXMgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIG1vZHVsZXMgPSBbW251bGwsIG1vZHVsZXMsIHVuZGVmaW5lZF1dO1xuICAgIH1cblxuICAgIHZhciBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzID0ge307XG5cbiAgICBpZiAoZGVkdXBlKSB7XG4gICAgICBmb3IgKHZhciBrID0gMDsgayA8IHRoaXMubGVuZ3RoOyBrKyspIHtcbiAgICAgICAgdmFyIGlkID0gdGhpc1trXVswXTtcblxuICAgICAgICBpZiAoaWQgIT0gbnVsbCkge1xuICAgICAgICAgIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaWRdID0gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGZvciAodmFyIF9rID0gMDsgX2sgPCBtb2R1bGVzLmxlbmd0aDsgX2srKykge1xuICAgICAgdmFyIGl0ZW0gPSBbXS5jb25jYXQobW9kdWxlc1tfa10pO1xuXG4gICAgICBpZiAoZGVkdXBlICYmIGFscmVhZHlJbXBvcnRlZE1vZHVsZXNbaXRlbVswXV0pIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIGlmICh0eXBlb2YgbGF5ZXIgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBpdGVtWzVdID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs1XSA9IGxheWVyO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChtZWRpYSkge1xuICAgICAgICBpZiAoIWl0ZW1bMl0pIHtcbiAgICAgICAgICBpdGVtWzJdID0gbWVkaWE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXRlbVsxXSA9IFwiQG1lZGlhIFwiLmNvbmNhdChpdGVtWzJdLCBcIiB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChzdXBwb3J0cykge1xuICAgICAgICBpZiAoIWl0ZW1bNF0pIHtcbiAgICAgICAgICBpdGVtWzRdID0gXCJcIi5jb25jYXQoc3VwcG9ydHMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBzdXBwb3J0cyAoXCIuY29uY2F0KGl0ZW1bNF0sIFwiKSB7XCIpLmNvbmNhdChpdGVtWzFdLCBcIn1cIik7XG4gICAgICAgICAgaXRlbVs0XSA9IHN1cHBvcnRzO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGxpc3QucHVzaChpdGVtKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGxpc3Q7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uICh1cmwsIG9wdGlvbnMpIHtcbiAgaWYgKCFvcHRpb25zKSB7XG4gICAgb3B0aW9ucyA9IHt9O1xuICB9XG5cbiAgaWYgKCF1cmwpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG5cbiAgdXJsID0gU3RyaW5nKHVybC5fX2VzTW9kdWxlID8gdXJsLmRlZmF1bHQgOiB1cmwpOyAvLyBJZiB1cmwgaXMgYWxyZWFkeSB3cmFwcGVkIGluIHF1b3RlcywgcmVtb3ZlIHRoZW1cblxuICBpZiAoL15bJ1wiXS4qWydcIl0kLy50ZXN0KHVybCkpIHtcbiAgICB1cmwgPSB1cmwuc2xpY2UoMSwgLTEpO1xuICB9XG5cbiAgaWYgKG9wdGlvbnMuaGFzaCkge1xuICAgIHVybCArPSBvcHRpb25zLmhhc2g7XG4gIH0gLy8gU2hvdWxkIHVybCBiZSB3cmFwcGVkP1xuICAvLyBTZWUgaHR0cHM6Ly9kcmFmdHMuY3Nzd2cub3JnL2Nzcy12YWx1ZXMtMy8jdXJsc1xuXG5cbiAgaWYgKC9bXCInKCkgXFx0XFxuXXwoJTIwKS8udGVzdCh1cmwpIHx8IG9wdGlvbnMubmVlZFF1b3Rlcykge1xuICAgIHJldHVybiBcIlxcXCJcIi5jb25jYXQodXJsLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgXCJcXFxcblwiKSwgXCJcXFwiXCIpO1xuICB9XG5cbiAgcmV0dXJuIHVybDtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGl0ZW0pIHtcbiAgdmFyIGNvbnRlbnQgPSBpdGVtWzFdO1xuICB2YXIgY3NzTWFwcGluZyA9IGl0ZW1bM107XG5cbiAgaWYgKCFjc3NNYXBwaW5nKSB7XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH1cblxuICBpZiAodHlwZW9mIGJ0b2EgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHZhciBiYXNlNjQgPSBidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShjc3NNYXBwaW5nKSkpKTtcbiAgICB2YXIgZGF0YSA9IFwic291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldD11dGYtODtiYXNlNjQsXCIuY29uY2F0KGJhc2U2NCk7XG4gICAgdmFyIHNvdXJjZU1hcHBpbmcgPSBcIi8qIyBcIi5jb25jYXQoZGF0YSwgXCIgKi9cIik7XG4gICAgdmFyIHNvdXJjZVVSTHMgPSBjc3NNYXBwaW5nLnNvdXJjZXMubWFwKGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgIHJldHVybiBcIi8qIyBzb3VyY2VVUkw9XCIuY29uY2F0KGNzc01hcHBpbmcuc291cmNlUm9vdCB8fCBcIlwiKS5jb25jYXQoc291cmNlLCBcIiAqL1wiKTtcbiAgICB9KTtcbiAgICByZXR1cm4gW2NvbnRlbnRdLmNvbmNhdChzb3VyY2VVUkxzKS5jb25jYXQoW3NvdXJjZU1hcHBpbmddKS5qb2luKFwiXFxuXCIpO1xuICB9XG5cbiAgcmV0dXJuIFtjb250ZW50XS5qb2luKFwiXFxuXCIpO1xufTsiLCJ2YXIgbj1mdW5jdGlvbih0LHMscixlKXt2YXIgdTtzWzBdPTA7Zm9yKHZhciBoPTE7aDxzLmxlbmd0aDtoKyspe3ZhciBwPXNbaCsrXSxhPXNbaF0/KHNbMF18PXA/MToyLHJbc1toKytdXSk6c1srK2hdOzM9PT1wP2VbMF09YTo0PT09cD9lWzFdPU9iamVjdC5hc3NpZ24oZVsxXXx8e30sYSk6NT09PXA/KGVbMV09ZVsxXXx8e30pW3NbKytoXV09YTo2PT09cD9lWzFdW3NbKytoXV0rPWErXCJcIjpwPyh1PXQuYXBwbHkoYSxuKHQsYSxyLFtcIlwiLG51bGxdKSksZS5wdXNoKHUpLGFbMF0/c1swXXw9Mjooc1toLTJdPTAsc1toXT11KSk6ZS5wdXNoKGEpfXJldHVybiBlfSx0PW5ldyBNYXA7ZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24ocyl7dmFyIHI9dC5nZXQodGhpcyk7cmV0dXJuIHJ8fChyPW5ldyBNYXAsdC5zZXQodGhpcyxyKSksKHI9bih0aGlzLHIuZ2V0KHMpfHwoci5zZXQocyxyPWZ1bmN0aW9uKG4pe2Zvcih2YXIgdCxzLHI9MSxlPVwiXCIsdT1cIlwiLGg9WzBdLHA9ZnVuY3Rpb24obil7MT09PXImJihufHwoZT1lLnJlcGxhY2UoL15cXHMqXFxuXFxzKnxcXHMqXFxuXFxzKiQvZyxcIlwiKSkpP2gucHVzaCgwLG4sZSk6Mz09PXImJihufHxlKT8oaC5wdXNoKDMsbixlKSxyPTIpOjI9PT1yJiZcIi4uLlwiPT09ZSYmbj9oLnB1c2goNCxuLDApOjI9PT1yJiZlJiYhbj9oLnB1c2goNSwwLCEwLGUpOnI+PTUmJigoZXx8IW4mJjU9PT1yKSYmKGgucHVzaChyLDAsZSxzKSxyPTYpLG4mJihoLnB1c2gocixuLDAscykscj02KSksZT1cIlwifSxhPTA7YTxuLmxlbmd0aDthKyspe2EmJigxPT09ciYmcCgpLHAoYSkpO2Zvcih2YXIgbD0wO2w8blthXS5sZW5ndGg7bCsrKXQ9blthXVtsXSwxPT09cj9cIjxcIj09PXQ/KHAoKSxoPVtoXSxyPTMpOmUrPXQ6ND09PXI/XCItLVwiPT09ZSYmXCI+XCI9PT10PyhyPTEsZT1cIlwiKTplPXQrZVswXTp1P3Q9PT11P3U9XCJcIjplKz10OidcIic9PT10fHxcIidcIj09PXQ/dT10OlwiPlwiPT09dD8ocCgpLHI9MSk6ciYmKFwiPVwiPT09dD8ocj01LHM9ZSxlPVwiXCIpOlwiL1wiPT09dCYmKHI8NXx8XCI+XCI9PT1uW2FdW2wrMV0pPyhwKCksMz09PXImJihoPWhbMF0pLHI9aCwoaD1oWzBdKS5wdXNoKDIsMCxyKSxyPTApOlwiIFwiPT09dHx8XCJcXHRcIj09PXR8fFwiXFxuXCI9PT10fHxcIlxcclwiPT09dD8ocCgpLHI9Mik6ZSs9dCksMz09PXImJlwiIS0tXCI9PT1lJiYocj00LGg9aFswXSl9cmV0dXJuIHAoKSxofShzKSksciksYXJndW1lbnRzLFtdKSkubGVuZ3RoPjE/cjpyWzBdfVxuIiwiaW1wb3J0e2ggYXMgcixDb21wb25lbnQgYXMgbyxyZW5kZXIgYXMgdH1mcm9tXCJwcmVhY3RcIjtleHBvcnR7aCxyZW5kZXIsQ29tcG9uZW50fWZyb21cInByZWFjdFwiO2ltcG9ydCBlIGZyb21cImh0bVwiO3ZhciBtPWUuYmluZChyKTtleHBvcnR7bSBhcyBodG1sfTtcbiIsInZhciBuLGwsdSxpLHQsbyxyLGYsZT17fSxjPVtdLHM9L2FjaXR8ZXgoPzpzfGd8bnxwfCQpfHJwaHxncmlkfG93c3xtbmN8bnR3fGluZVtjaF18em9vfF5vcmR8aXRlcmEvaTtmdW5jdGlvbiBhKG4sbCl7Zm9yKHZhciB1IGluIGwpblt1XT1sW3VdO3JldHVybiBufWZ1bmN0aW9uIGgobil7dmFyIGw9bi5wYXJlbnROb2RlO2wmJmwucmVtb3ZlQ2hpbGQobil9ZnVuY3Rpb24gdihsLHUsaSl7dmFyIHQsbyxyLGY9e307Zm9yKHIgaW4gdSlcImtleVwiPT1yP3Q9dVtyXTpcInJlZlwiPT1yP289dVtyXTpmW3JdPXVbcl07aWYoYXJndW1lbnRzLmxlbmd0aD4yJiYoZi5jaGlsZHJlbj1hcmd1bWVudHMubGVuZ3RoPjM/bi5jYWxsKGFyZ3VtZW50cywyKTppKSxcImZ1bmN0aW9uXCI9PXR5cGVvZiBsJiZudWxsIT1sLmRlZmF1bHRQcm9wcylmb3IociBpbiBsLmRlZmF1bHRQcm9wcyl2b2lkIDA9PT1mW3JdJiYoZltyXT1sLmRlZmF1bHRQcm9wc1tyXSk7cmV0dXJuIHkobCxmLHQsbyxudWxsKX1mdW5jdGlvbiB5KG4saSx0LG8scil7dmFyIGY9e3R5cGU6bixwcm9wczppLGtleTp0LHJlZjpvLF9fazpudWxsLF9fOm51bGwsX19iOjAsX19lOm51bGwsX19kOnZvaWQgMCxfX2M6bnVsbCxfX2g6bnVsbCxjb25zdHJ1Y3Rvcjp2b2lkIDAsX192Om51bGw9PXI/Kyt1OnJ9O3JldHVybiBudWxsPT1yJiZudWxsIT1sLnZub2RlJiZsLnZub2RlKGYpLGZ9ZnVuY3Rpb24gcCgpe3JldHVybntjdXJyZW50Om51bGx9fWZ1bmN0aW9uIGQobil7cmV0dXJuIG4uY2hpbGRyZW59ZnVuY3Rpb24gXyhuLGwpe3RoaXMucHJvcHM9bix0aGlzLmNvbnRleHQ9bH1mdW5jdGlvbiBrKG4sbCl7aWYobnVsbD09bClyZXR1cm4gbi5fXz9rKG4uX18sbi5fXy5fX2suaW5kZXhPZihuKSsxKTpudWxsO2Zvcih2YXIgdTtsPG4uX19rLmxlbmd0aDtsKyspaWYobnVsbCE9KHU9bi5fX2tbbF0pJiZudWxsIT11Ll9fZSlyZXR1cm4gdS5fX2U7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2Ygbi50eXBlP2sobik6bnVsbH1mdW5jdGlvbiBiKG4pe3ZhciBsLHU7aWYobnVsbCE9KG49bi5fXykmJm51bGwhPW4uX19jKXtmb3Iobi5fX2U9bi5fX2MuYmFzZT1udWxsLGw9MDtsPG4uX19rLmxlbmd0aDtsKyspaWYobnVsbCE9KHU9bi5fX2tbbF0pJiZudWxsIT11Ll9fZSl7bi5fX2U9bi5fX2MuYmFzZT11Ll9fZTticmVha31yZXR1cm4gYihuKX19ZnVuY3Rpb24gbShuKXsoIW4uX19kJiYobi5fX2Q9ITApJiZ0LnB1c2gobikmJiFnLl9fcisrfHxyIT09bC5kZWJvdW5jZVJlbmRlcmluZykmJigocj1sLmRlYm91bmNlUmVuZGVyaW5nKXx8bykoZyl9ZnVuY3Rpb24gZygpe2Zvcih2YXIgbjtnLl9fcj10Lmxlbmd0aDspbj10LnNvcnQoZnVuY3Rpb24obixsKXtyZXR1cm4gbi5fX3YuX19iLWwuX192Ll9fYn0pLHQ9W10sbi5zb21lKGZ1bmN0aW9uKG4pe3ZhciBsLHUsaSx0LG8scjtuLl9fZCYmKG89KHQ9KGw9bikuX192KS5fX2UsKHI9bC5fX1ApJiYodT1bXSwoaT1hKHt9LHQpKS5fX3Y9dC5fX3YrMSxqKHIsdCxpLGwuX19uLHZvaWQgMCE9PXIub3duZXJTVkdFbGVtZW50LG51bGwhPXQuX19oP1tvXTpudWxsLHUsbnVsbD09bz9rKHQpOm8sdC5fX2gpLHoodSx0KSx0Ll9fZSE9byYmYih0KSkpfSl9ZnVuY3Rpb24gdyhuLGwsdSxpLHQsbyxyLGYscyxhKXt2YXIgaCx2LHAsXyxiLG0sZyx3PWkmJmkuX19rfHxjLEE9dy5sZW5ndGg7Zm9yKHUuX19rPVtdLGg9MDtoPGwubGVuZ3RoO2grKylpZihudWxsIT0oXz11Ll9fa1toXT1udWxsPT0oXz1sW2hdKXx8XCJib29sZWFuXCI9PXR5cGVvZiBfP251bGw6XCJzdHJpbmdcIj09dHlwZW9mIF98fFwibnVtYmVyXCI9PXR5cGVvZiBffHxcImJpZ2ludFwiPT10eXBlb2YgXz95KG51bGwsXyxudWxsLG51bGwsXyk6QXJyYXkuaXNBcnJheShfKT95KGQse2NoaWxkcmVuOl99LG51bGwsbnVsbCxudWxsKTpfLl9fYj4wP3koXy50eXBlLF8ucHJvcHMsXy5rZXksbnVsbCxfLl9fdik6Xykpe2lmKF8uX189dSxfLl9fYj11Ll9fYisxLG51bGw9PT0ocD13W2hdKXx8cCYmXy5rZXk9PXAua2V5JiZfLnR5cGU9PT1wLnR5cGUpd1toXT12b2lkIDA7ZWxzZSBmb3Iodj0wO3Y8QTt2Kyspe2lmKChwPXdbdl0pJiZfLmtleT09cC5rZXkmJl8udHlwZT09PXAudHlwZSl7d1t2XT12b2lkIDA7YnJlYWt9cD1udWxsfWoobixfLHA9cHx8ZSx0LG8scixmLHMsYSksYj1fLl9fZSwodj1fLnJlZikmJnAucmVmIT12JiYoZ3x8KGc9W10pLHAucmVmJiZnLnB1c2gocC5yZWYsbnVsbCxfKSxnLnB1c2godixfLl9fY3x8YixfKSksbnVsbCE9Yj8obnVsbD09bSYmKG09YiksXCJmdW5jdGlvblwiPT10eXBlb2YgXy50eXBlJiZfLl9faz09PXAuX19rP18uX19kPXM9eChfLHMsbik6cz1QKG4sXyxwLHcsYixzKSxcImZ1bmN0aW9uXCI9PXR5cGVvZiB1LnR5cGUmJih1Ll9fZD1zKSk6cyYmcC5fX2U9PXMmJnMucGFyZW50Tm9kZSE9biYmKHM9ayhwKSl9Zm9yKHUuX19lPW0saD1BO2gtLTspbnVsbCE9d1toXSYmKFwiZnVuY3Rpb25cIj09dHlwZW9mIHUudHlwZSYmbnVsbCE9d1toXS5fX2UmJndbaF0uX19lPT11Ll9fZCYmKHUuX19kPWsoaSxoKzEpKSxOKHdbaF0sd1toXSkpO2lmKGcpZm9yKGg9MDtoPGcubGVuZ3RoO2grKylNKGdbaF0sZ1srK2hdLGdbKytoXSl9ZnVuY3Rpb24geChuLGwsdSl7Zm9yKHZhciBpLHQ9bi5fX2ssbz0wO3QmJm88dC5sZW5ndGg7bysrKShpPXRbb10pJiYoaS5fXz1uLGw9XCJmdW5jdGlvblwiPT10eXBlb2YgaS50eXBlP3goaSxsLHUpOlAodSxpLGksdCxpLl9fZSxsKSk7cmV0dXJuIGx9ZnVuY3Rpb24gQShuLGwpe3JldHVybiBsPWx8fFtdLG51bGw9PW58fFwiYm9vbGVhblwiPT10eXBlb2Ygbnx8KEFycmF5LmlzQXJyYXkobik/bi5zb21lKGZ1bmN0aW9uKG4pe0EobixsKX0pOmwucHVzaChuKSksbH1mdW5jdGlvbiBQKG4sbCx1LGksdCxvKXt2YXIgcixmLGU7aWYodm9pZCAwIT09bC5fX2Qpcj1sLl9fZCxsLl9fZD12b2lkIDA7ZWxzZSBpZihudWxsPT11fHx0IT1vfHxudWxsPT10LnBhcmVudE5vZGUpbjppZihudWxsPT1vfHxvLnBhcmVudE5vZGUhPT1uKW4uYXBwZW5kQ2hpbGQodCkscj1udWxsO2Vsc2V7Zm9yKGY9byxlPTA7KGY9Zi5uZXh0U2libGluZykmJmU8aS5sZW5ndGg7ZSs9MilpZihmPT10KWJyZWFrIG47bi5pbnNlcnRCZWZvcmUodCxvKSxyPW99cmV0dXJuIHZvaWQgMCE9PXI/cjp0Lm5leHRTaWJsaW5nfWZ1bmN0aW9uIEMobixsLHUsaSx0KXt2YXIgbztmb3IobyBpbiB1KVwiY2hpbGRyZW5cIj09PW98fFwia2V5XCI9PT1vfHxvIGluIGx8fEgobixvLG51bGwsdVtvXSxpKTtmb3IobyBpbiBsKXQmJlwiZnVuY3Rpb25cIiE9dHlwZW9mIGxbb118fFwiY2hpbGRyZW5cIj09PW98fFwia2V5XCI9PT1vfHxcInZhbHVlXCI9PT1vfHxcImNoZWNrZWRcIj09PW98fHVbb109PT1sW29dfHxIKG4sbyxsW29dLHVbb10saSl9ZnVuY3Rpb24gJChuLGwsdSl7XCItXCI9PT1sWzBdP24uc2V0UHJvcGVydHkobCx1KTpuW2xdPW51bGw9PXU/XCJcIjpcIm51bWJlclwiIT10eXBlb2YgdXx8cy50ZXN0KGwpP3U6dStcInB4XCJ9ZnVuY3Rpb24gSChuLGwsdSxpLHQpe3ZhciBvO246aWYoXCJzdHlsZVwiPT09bClpZihcInN0cmluZ1wiPT10eXBlb2YgdSluLnN0eWxlLmNzc1RleHQ9dTtlbHNle2lmKFwic3RyaW5nXCI9PXR5cGVvZiBpJiYobi5zdHlsZS5jc3NUZXh0PWk9XCJcIiksaSlmb3IobCBpbiBpKXUmJmwgaW4gdXx8JChuLnN0eWxlLGwsXCJcIik7aWYodSlmb3IobCBpbiB1KWkmJnVbbF09PT1pW2xdfHwkKG4uc3R5bGUsbCx1W2xdKX1lbHNlIGlmKFwib1wiPT09bFswXSYmXCJuXCI9PT1sWzFdKW89bCE9PShsPWwucmVwbGFjZSgvQ2FwdHVyZSQvLFwiXCIpKSxsPWwudG9Mb3dlckNhc2UoKWluIG4/bC50b0xvd2VyQ2FzZSgpLnNsaWNlKDIpOmwuc2xpY2UoMiksbi5sfHwobi5sPXt9KSxuLmxbbCtvXT11LHU/aXx8bi5hZGRFdmVudExpc3RlbmVyKGwsbz9UOkksbyk6bi5yZW1vdmVFdmVudExpc3RlbmVyKGwsbz9UOkksbyk7ZWxzZSBpZihcImRhbmdlcm91c2x5U2V0SW5uZXJIVE1MXCIhPT1sKXtpZih0KWw9bC5yZXBsYWNlKC94bGluayhIfDpoKS8sXCJoXCIpLnJlcGxhY2UoL3NOYW1lJC8sXCJzXCIpO2Vsc2UgaWYoXCJocmVmXCIhPT1sJiZcImxpc3RcIiE9PWwmJlwiZm9ybVwiIT09bCYmXCJ0YWJJbmRleFwiIT09bCYmXCJkb3dubG9hZFwiIT09bCYmbCBpbiBuKXRyeXtuW2xdPW51bGw9PXU/XCJcIjp1O2JyZWFrIG59Y2F0Y2gobil7fVwiZnVuY3Rpb25cIj09dHlwZW9mIHV8fChudWxsIT11JiYoITEhPT11fHxcImFcIj09PWxbMF0mJlwiclwiPT09bFsxXSk/bi5zZXRBdHRyaWJ1dGUobCx1KTpuLnJlbW92ZUF0dHJpYnV0ZShsKSl9fWZ1bmN0aW9uIEkobil7dGhpcy5sW24udHlwZSshMV0obC5ldmVudD9sLmV2ZW50KG4pOm4pfWZ1bmN0aW9uIFQobil7dGhpcy5sW24udHlwZSshMF0obC5ldmVudD9sLmV2ZW50KG4pOm4pfWZ1bmN0aW9uIGoobix1LGksdCxvLHIsZixlLGMpe3ZhciBzLGgsdix5LHAsayxiLG0sZyx4LEEsUCxDLCQ9dS50eXBlO2lmKHZvaWQgMCE9PXUuY29uc3RydWN0b3IpcmV0dXJuIG51bGw7bnVsbCE9aS5fX2gmJihjPWkuX19oLGU9dS5fX2U9aS5fX2UsdS5fX2g9bnVsbCxyPVtlXSksKHM9bC5fX2IpJiZzKHUpO3RyeXtuOmlmKFwiZnVuY3Rpb25cIj09dHlwZW9mICQpe2lmKG09dS5wcm9wcyxnPShzPSQuY29udGV4dFR5cGUpJiZ0W3MuX19jXSx4PXM/Zz9nLnByb3BzLnZhbHVlOnMuX186dCxpLl9fYz9iPShoPXUuX19jPWkuX19jKS5fXz1oLl9fRTooXCJwcm90b3R5cGVcImluICQmJiQucHJvdG90eXBlLnJlbmRlcj91Ll9fYz1oPW5ldyAkKG0seCk6KHUuX19jPWg9bmV3IF8obSx4KSxoLmNvbnN0cnVjdG9yPSQsaC5yZW5kZXI9TyksZyYmZy5zdWIoaCksaC5wcm9wcz1tLGguc3RhdGV8fChoLnN0YXRlPXt9KSxoLmNvbnRleHQ9eCxoLl9fbj10LHY9aC5fX2Q9ITAsaC5fX2g9W10pLG51bGw9PWguX19zJiYoaC5fX3M9aC5zdGF0ZSksbnVsbCE9JC5nZXREZXJpdmVkU3RhdGVGcm9tUHJvcHMmJihoLl9fcz09aC5zdGF0ZSYmKGguX19zPWEoe30saC5fX3MpKSxhKGguX19zLCQuZ2V0RGVyaXZlZFN0YXRlRnJvbVByb3BzKG0saC5fX3MpKSkseT1oLnByb3BzLHA9aC5zdGF0ZSx2KW51bGw9PSQuZ2V0RGVyaXZlZFN0YXRlRnJvbVByb3BzJiZudWxsIT1oLmNvbXBvbmVudFdpbGxNb3VudCYmaC5jb21wb25lbnRXaWxsTW91bnQoKSxudWxsIT1oLmNvbXBvbmVudERpZE1vdW50JiZoLl9faC5wdXNoKGguY29tcG9uZW50RGlkTW91bnQpO2Vsc2V7aWYobnVsbD09JC5nZXREZXJpdmVkU3RhdGVGcm9tUHJvcHMmJm0hPT15JiZudWxsIT1oLmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMmJmguY29tcG9uZW50V2lsbFJlY2VpdmVQcm9wcyhtLHgpLCFoLl9fZSYmbnVsbCE9aC5zaG91bGRDb21wb25lbnRVcGRhdGUmJiExPT09aC5zaG91bGRDb21wb25lbnRVcGRhdGUobSxoLl9fcyx4KXx8dS5fX3Y9PT1pLl9fdil7aC5wcm9wcz1tLGguc3RhdGU9aC5fX3MsdS5fX3YhPT1pLl9fdiYmKGguX19kPSExKSxoLl9fdj11LHUuX19lPWkuX19lLHUuX19rPWkuX19rLHUuX19rLmZvckVhY2goZnVuY3Rpb24obil7biYmKG4uX189dSl9KSxoLl9faC5sZW5ndGgmJmYucHVzaChoKTticmVhayBufW51bGwhPWguY29tcG9uZW50V2lsbFVwZGF0ZSYmaC5jb21wb25lbnRXaWxsVXBkYXRlKG0saC5fX3MseCksbnVsbCE9aC5jb21wb25lbnREaWRVcGRhdGUmJmguX19oLnB1c2goZnVuY3Rpb24oKXtoLmNvbXBvbmVudERpZFVwZGF0ZSh5LHAsayl9KX1pZihoLmNvbnRleHQ9eCxoLnByb3BzPW0saC5fX3Y9dSxoLl9fUD1uLEE9bC5fX3IsUD0wLFwicHJvdG90eXBlXCJpbiAkJiYkLnByb3RvdHlwZS5yZW5kZXIpaC5zdGF0ZT1oLl9fcyxoLl9fZD0hMSxBJiZBKHUpLHM9aC5yZW5kZXIoaC5wcm9wcyxoLnN0YXRlLGguY29udGV4dCk7ZWxzZSBkb3toLl9fZD0hMSxBJiZBKHUpLHM9aC5yZW5kZXIoaC5wcm9wcyxoLnN0YXRlLGguY29udGV4dCksaC5zdGF0ZT1oLl9fc313aGlsZShoLl9fZCYmKytQPDI1KTtoLnN0YXRlPWguX19zLG51bGwhPWguZ2V0Q2hpbGRDb250ZXh0JiYodD1hKGEoe30sdCksaC5nZXRDaGlsZENvbnRleHQoKSkpLHZ8fG51bGw9PWguZ2V0U25hcHNob3RCZWZvcmVVcGRhdGV8fChrPWguZ2V0U25hcHNob3RCZWZvcmVVcGRhdGUoeSxwKSksQz1udWxsIT1zJiZzLnR5cGU9PT1kJiZudWxsPT1zLmtleT9zLnByb3BzLmNoaWxkcmVuOnMsdyhuLEFycmF5LmlzQXJyYXkoQyk/QzpbQ10sdSxpLHQsbyxyLGYsZSxjKSxoLmJhc2U9dS5fX2UsdS5fX2g9bnVsbCxoLl9faC5sZW5ndGgmJmYucHVzaChoKSxiJiYoaC5fX0U9aC5fXz1udWxsKSxoLl9fZT0hMX1lbHNlIG51bGw9PXImJnUuX192PT09aS5fX3Y/KHUuX19rPWkuX19rLHUuX19lPWkuX19lKTp1Ll9fZT1MKGkuX19lLHUsaSx0LG8scixmLGMpOyhzPWwuZGlmZmVkKSYmcyh1KX1jYXRjaChuKXt1Ll9fdj1udWxsLChjfHxudWxsIT1yKSYmKHUuX19lPWUsdS5fX2g9ISFjLHJbci5pbmRleE9mKGUpXT1udWxsKSxsLl9fZShuLHUsaSl9fWZ1bmN0aW9uIHoobix1KXtsLl9fYyYmbC5fX2ModSxuKSxuLnNvbWUoZnVuY3Rpb24odSl7dHJ5e249dS5fX2gsdS5fX2g9W10sbi5zb21lKGZ1bmN0aW9uKG4pe24uY2FsbCh1KX0pfWNhdGNoKG4pe2wuX19lKG4sdS5fX3YpfX0pfWZ1bmN0aW9uIEwobCx1LGksdCxvLHIsZixjKXt2YXIgcyxhLHYseT1pLnByb3BzLHA9dS5wcm9wcyxkPXUudHlwZSxfPTA7aWYoXCJzdmdcIj09PWQmJihvPSEwKSxudWxsIT1yKWZvcig7XzxyLmxlbmd0aDtfKyspaWYoKHM9cltfXSkmJlwic2V0QXR0cmlidXRlXCJpbiBzPT0hIWQmJihkP3MubG9jYWxOYW1lPT09ZDozPT09cy5ub2RlVHlwZSkpe2w9cyxyW19dPW51bGw7YnJlYWt9aWYobnVsbD09bCl7aWYobnVsbD09PWQpcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHApO2w9bz9kb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoXCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiLGQpOmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoZCxwLmlzJiZwKSxyPW51bGwsYz0hMX1pZihudWxsPT09ZCl5PT09cHx8YyYmbC5kYXRhPT09cHx8KGwuZGF0YT1wKTtlbHNle2lmKHI9ciYmbi5jYWxsKGwuY2hpbGROb2RlcyksYT0oeT1pLnByb3BzfHxlKS5kYW5nZXJvdXNseVNldElubmVySFRNTCx2PXAuZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwsIWMpe2lmKG51bGwhPXIpZm9yKHk9e30sXz0wO188bC5hdHRyaWJ1dGVzLmxlbmd0aDtfKyspeVtsLmF0dHJpYnV0ZXNbX10ubmFtZV09bC5hdHRyaWJ1dGVzW19dLnZhbHVlOyh2fHxhKSYmKHYmJihhJiZ2Ll9faHRtbD09YS5fX2h0bWx8fHYuX19odG1sPT09bC5pbm5lckhUTUwpfHwobC5pbm5lckhUTUw9diYmdi5fX2h0bWx8fFwiXCIpKX1pZihDKGwscCx5LG8sYyksdil1Ll9faz1bXTtlbHNlIGlmKF89dS5wcm9wcy5jaGlsZHJlbix3KGwsQXJyYXkuaXNBcnJheShfKT9fOltfXSx1LGksdCxvJiZcImZvcmVpZ25PYmplY3RcIiE9PWQscixmLHI/clswXTppLl9fayYmayhpLDApLGMpLG51bGwhPXIpZm9yKF89ci5sZW5ndGg7Xy0tOyludWxsIT1yW19dJiZoKHJbX10pO2N8fChcInZhbHVlXCJpbiBwJiZ2b2lkIDAhPT0oXz1wLnZhbHVlKSYmKF8hPT1sLnZhbHVlfHxcInByb2dyZXNzXCI9PT1kJiYhX3x8XCJvcHRpb25cIj09PWQmJl8hPT15LnZhbHVlKSYmSChsLFwidmFsdWVcIixfLHkudmFsdWUsITEpLFwiY2hlY2tlZFwiaW4gcCYmdm9pZCAwIT09KF89cC5jaGVja2VkKSYmXyE9PWwuY2hlY2tlZCYmSChsLFwiY2hlY2tlZFwiLF8seS5jaGVja2VkLCExKSl9cmV0dXJuIGx9ZnVuY3Rpb24gTShuLHUsaSl7dHJ5e1wiZnVuY3Rpb25cIj09dHlwZW9mIG4/bih1KTpuLmN1cnJlbnQ9dX1jYXRjaChuKXtsLl9fZShuLGkpfX1mdW5jdGlvbiBOKG4sdSxpKXt2YXIgdCxvO2lmKGwudW5tb3VudCYmbC51bm1vdW50KG4pLCh0PW4ucmVmKSYmKHQuY3VycmVudCYmdC5jdXJyZW50IT09bi5fX2V8fE0odCxudWxsLHUpKSxudWxsIT0odD1uLl9fYykpe2lmKHQuY29tcG9uZW50V2lsbFVubW91bnQpdHJ5e3QuY29tcG9uZW50V2lsbFVubW91bnQoKX1jYXRjaChuKXtsLl9fZShuLHUpfXQuYmFzZT10Ll9fUD1udWxsfWlmKHQ9bi5fX2spZm9yKG89MDtvPHQubGVuZ3RoO28rKyl0W29dJiZOKHRbb10sdSxcImZ1bmN0aW9uXCIhPXR5cGVvZiBuLnR5cGUpO2l8fG51bGw9PW4uX19lfHxoKG4uX19lKSxuLl9fZT1uLl9fZD12b2lkIDB9ZnVuY3Rpb24gTyhuLGwsdSl7cmV0dXJuIHRoaXMuY29uc3RydWN0b3Iobix1KX1mdW5jdGlvbiBTKHUsaSx0KXt2YXIgbyxyLGY7bC5fXyYmbC5fXyh1LGkpLHI9KG89XCJmdW5jdGlvblwiPT10eXBlb2YgdCk/bnVsbDp0JiZ0Ll9fa3x8aS5fX2ssZj1bXSxqKGksdT0oIW8mJnR8fGkpLl9faz12KGQsbnVsbCxbdV0pLHJ8fGUsZSx2b2lkIDAhPT1pLm93bmVyU1ZHRWxlbWVudCwhbyYmdD9bdF06cj9udWxsOmkuZmlyc3RDaGlsZD9uLmNhbGwoaS5jaGlsZE5vZGVzKTpudWxsLGYsIW8mJnQ/dDpyP3IuX19lOmkuZmlyc3RDaGlsZCxvKSx6KGYsdSl9ZnVuY3Rpb24gcShuLGwpe1MobixsLHEpfWZ1bmN0aW9uIEIobCx1LGkpe3ZhciB0LG8scixmPWEoe30sbC5wcm9wcyk7Zm9yKHIgaW4gdSlcImtleVwiPT1yP3Q9dVtyXTpcInJlZlwiPT1yP289dVtyXTpmW3JdPXVbcl07cmV0dXJuIGFyZ3VtZW50cy5sZW5ndGg+MiYmKGYuY2hpbGRyZW49YXJndW1lbnRzLmxlbmd0aD4zP24uY2FsbChhcmd1bWVudHMsMik6aSkseShsLnR5cGUsZix0fHxsLmtleSxvfHxsLnJlZixudWxsKX1mdW5jdGlvbiBEKG4sbCl7dmFyIHU9e19fYzpsPVwiX19jQ1wiK2YrKyxfXzpuLENvbnN1bWVyOmZ1bmN0aW9uKG4sbCl7cmV0dXJuIG4uY2hpbGRyZW4obCl9LFByb3ZpZGVyOmZ1bmN0aW9uKG4pe3ZhciB1LGk7cmV0dXJuIHRoaXMuZ2V0Q2hpbGRDb250ZXh0fHwodT1bXSwoaT17fSlbbF09dGhpcyx0aGlzLmdldENoaWxkQ29udGV4dD1mdW5jdGlvbigpe3JldHVybiBpfSx0aGlzLnNob3VsZENvbXBvbmVudFVwZGF0ZT1mdW5jdGlvbihuKXt0aGlzLnByb3BzLnZhbHVlIT09bi52YWx1ZSYmdS5zb21lKG0pfSx0aGlzLnN1Yj1mdW5jdGlvbihuKXt1LnB1c2gobik7dmFyIGw9bi5jb21wb25lbnRXaWxsVW5tb3VudDtuLmNvbXBvbmVudFdpbGxVbm1vdW50PWZ1bmN0aW9uKCl7dS5zcGxpY2UodS5pbmRleE9mKG4pLDEpLGwmJmwuY2FsbChuKX19KSxuLmNoaWxkcmVufX07cmV0dXJuIHUuUHJvdmlkZXIuX189dS5Db25zdW1lci5jb250ZXh0VHlwZT11fW49Yy5zbGljZSxsPXtfX2U6ZnVuY3Rpb24obixsLHUsaSl7Zm9yKHZhciB0LG8scjtsPWwuX187KWlmKCh0PWwuX19jKSYmIXQuX18pdHJ5e2lmKChvPXQuY29uc3RydWN0b3IpJiZudWxsIT1vLmdldERlcml2ZWRTdGF0ZUZyb21FcnJvciYmKHQuc2V0U3RhdGUoby5nZXREZXJpdmVkU3RhdGVGcm9tRXJyb3IobikpLHI9dC5fX2QpLG51bGwhPXQuY29tcG9uZW50RGlkQ2F0Y2gmJih0LmNvbXBvbmVudERpZENhdGNoKG4saXx8e30pLHI9dC5fX2QpLHIpcmV0dXJuIHQuX19FPXR9Y2F0Y2gobCl7bj1sfXRocm93IG59fSx1PTAsaT1mdW5jdGlvbihuKXtyZXR1cm4gbnVsbCE9biYmdm9pZCAwPT09bi5jb25zdHJ1Y3Rvcn0sXy5wcm90b3R5cGUuc2V0U3RhdGU9ZnVuY3Rpb24obixsKXt2YXIgdTt1PW51bGwhPXRoaXMuX19zJiZ0aGlzLl9fcyE9PXRoaXMuc3RhdGU/dGhpcy5fX3M6dGhpcy5fX3M9YSh7fSx0aGlzLnN0YXRlKSxcImZ1bmN0aW9uXCI9PXR5cGVvZiBuJiYobj1uKGEoe30sdSksdGhpcy5wcm9wcykpLG4mJmEodSxuKSxudWxsIT1uJiZ0aGlzLl9fdiYmKGwmJnRoaXMuX19oLnB1c2gobCksbSh0aGlzKSl9LF8ucHJvdG90eXBlLmZvcmNlVXBkYXRlPWZ1bmN0aW9uKG4pe3RoaXMuX192JiYodGhpcy5fX2U9ITAsbiYmdGhpcy5fX2gucHVzaChuKSxtKHRoaXMpKX0sXy5wcm90b3R5cGUucmVuZGVyPWQsdD1bXSxvPVwiZnVuY3Rpb25cIj09dHlwZW9mIFByb21pc2U/UHJvbWlzZS5wcm90b3R5cGUudGhlbi5iaW5kKFByb21pc2UucmVzb2x2ZSgpKTpzZXRUaW1lb3V0LGcuX19yPTAsZj0wO2V4cG9ydHtTIGFzIHJlbmRlcixxIGFzIGh5ZHJhdGUsdiBhcyBjcmVhdGVFbGVtZW50LHYgYXMgaCxkIGFzIEZyYWdtZW50LHAgYXMgY3JlYXRlUmVmLGkgYXMgaXNWYWxpZEVsZW1lbnQsXyBhcyBDb21wb25lbnQsQiBhcyBjbG9uZUVsZW1lbnQsRCBhcyBjcmVhdGVDb250ZXh0LEEgYXMgdG9DaGlsZEFycmF5LGwgYXMgb3B0aW9uc307XG4vLyMgc291cmNlTWFwcGluZ1VSTD1wcmVhY3QubW9kdWxlLmpzLm1hcFxuIiwiaW1wb3J0e29wdGlvbnMgYXMgbn1mcm9tXCJwcmVhY3RcIjt2YXIgdCx1LHIsbyxpPTAsYz1bXSxmPVtdLGU9bi5fX2IsYT1uLl9fcix2PW4uZGlmZmVkLGw9bi5fX2MsbT1uLnVubW91bnQ7ZnVuY3Rpb24gcCh0LHIpe24uX19oJiZuLl9faCh1LHQsaXx8ciksaT0wO3ZhciBvPXUuX19IfHwodS5fX0g9e19fOltdLF9faDpbXX0pO3JldHVybiB0Pj1vLl9fLmxlbmd0aCYmby5fXy5wdXNoKHtfX1Y6Zn0pLG8uX19bdF19ZnVuY3Rpb24geShuKXtyZXR1cm4gaT0xLGQoeixuKX1mdW5jdGlvbiBkKG4scixvKXt2YXIgaT1wKHQrKywyKTtyZXR1cm4gaS50PW4saS5fX2N8fChpLl9fPVtvP28ocik6eih2b2lkIDAsciksZnVuY3Rpb24obil7dmFyIHQ9aS50KGkuX19bMF0sbik7aS5fX1swXSE9PXQmJihpLl9fPVt0LGkuX19bMV1dLGkuX19jLnNldFN0YXRlKHt9KSl9XSxpLl9fYz11KSxpLl9ffWZ1bmN0aW9uIF8ocixvKXt2YXIgaT1wKHQrKywzKTshbi5fX3MmJncoaS5fX0gsbykmJihpLl9fPXIsaS51PW8sdS5fX0guX19oLnB1c2goaSkpfWZ1bmN0aW9uIGgocixvKXt2YXIgaT1wKHQrKyw0KTshbi5fX3MmJncoaS5fX0gsbykmJihpLl9fPXIsaS51PW8sdS5fX2gucHVzaChpKSl9ZnVuY3Rpb24gcyhuKXtyZXR1cm4gaT01LEYoZnVuY3Rpb24oKXtyZXR1cm57Y3VycmVudDpufX0sW10pfWZ1bmN0aW9uIEEobix0LHUpe2k9NixoKGZ1bmN0aW9uKCl7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2Ygbj8obih0KCkpLGZ1bmN0aW9uKCl7cmV0dXJuIG4obnVsbCl9KTpuPyhuLmN1cnJlbnQ9dCgpLGZ1bmN0aW9uKCl7cmV0dXJuIG4uY3VycmVudD1udWxsfSk6dm9pZCAwfSxudWxsPT11P3U6dS5jb25jYXQobikpfWZ1bmN0aW9uIEYobix1KXt2YXIgcj1wKHQrKyw3KTtyZXR1cm4gdyhyLl9fSCx1KT8oci5fX1Y9bigpLHIudT11LHIuX19oPW4sci5fX1YpOnIuX199ZnVuY3Rpb24gVChuLHQpe3JldHVybiBpPTgsRihmdW5jdGlvbigpe3JldHVybiBufSx0KX1mdW5jdGlvbiBxKG4pe3ZhciByPXUuY29udGV4dFtuLl9fY10sbz1wKHQrKyw5KTtyZXR1cm4gby5jPW4scj8obnVsbD09by5fXyYmKG8uX189ITAsci5zdWIodSkpLHIucHJvcHMudmFsdWUpOm4uX199ZnVuY3Rpb24geCh0LHUpe24udXNlRGVidWdWYWx1ZSYmbi51c2VEZWJ1Z1ZhbHVlKHU/dSh0KTp0KX1mdW5jdGlvbiBWKG4pe3ZhciByPXAodCsrLDEwKSxvPXkoKTtyZXR1cm4gci5fXz1uLHUuY29tcG9uZW50RGlkQ2F0Y2h8fCh1LmNvbXBvbmVudERpZENhdGNoPWZ1bmN0aW9uKG4pe3IuX18mJnIuX18obiksb1sxXShuKX0pLFtvWzBdLGZ1bmN0aW9uKCl7b1sxXSh2b2lkIDApfV19ZnVuY3Rpb24gYigpe2Zvcih2YXIgdDt0PWMuc2hpZnQoKTspaWYodC5fX1ApdHJ5e3QuX19ILl9faC5mb3JFYWNoKGopLHQuX19ILl9faC5mb3JFYWNoKGspLHQuX19ILl9faD1bXX1jYXRjaCh1KXt0Ll9fSC5fX2g9W10sbi5fX2UodSx0Ll9fdil9fW4uX19iPWZ1bmN0aW9uKG4pe3U9bnVsbCxlJiZlKG4pfSxuLl9fcj1mdW5jdGlvbihuKXthJiZhKG4pLHQ9MDt2YXIgbz0odT1uLl9fYykuX19IO28mJihyPT09dT8oby5fX2g9W10sdS5fX2g9W10sby5fXy5mb3JFYWNoKGZ1bmN0aW9uKG4pe24uX19WPWYsbi51PXZvaWQgMH0pKTooby5fX2guZm9yRWFjaChqKSxvLl9faC5mb3JFYWNoKGspLG8uX19oPVtdKSkscj11fSxuLmRpZmZlZD1mdW5jdGlvbih0KXt2JiZ2KHQpO3ZhciBpPXQuX19jO2kmJmkuX19IJiYoaS5fX0guX19oLmxlbmd0aCYmKDEhPT1jLnB1c2goaSkmJm89PT1uLnJlcXVlc3RBbmltYXRpb25GcmFtZXx8KChvPW4ucmVxdWVzdEFuaW1hdGlvbkZyYW1lKXx8ZnVuY3Rpb24obil7dmFyIHQsdT1mdW5jdGlvbigpe2NsZWFyVGltZW91dChyKSxnJiZjYW5jZWxBbmltYXRpb25GcmFtZSh0KSxzZXRUaW1lb3V0KG4pfSxyPXNldFRpbWVvdXQodSwxMDApO2cmJih0PXJlcXVlc3RBbmltYXRpb25GcmFtZSh1KSl9KShiKSksaS5fX0guX18uZm9yRWFjaChmdW5jdGlvbihuKXtuLnUmJihuLl9fSD1uLnUpLG4uX19WIT09ZiYmKG4uX189bi5fX1YpLG4udT12b2lkIDAsbi5fX1Y9Zn0pKSxyPXU9bnVsbH0sbi5fX2M9ZnVuY3Rpb24odCx1KXt1LnNvbWUoZnVuY3Rpb24odCl7dHJ5e3QuX19oLmZvckVhY2goaiksdC5fX2g9dC5fX2guZmlsdGVyKGZ1bmN0aW9uKG4pe3JldHVybiFuLl9ffHxrKG4pfSl9Y2F0Y2gocil7dS5zb21lKGZ1bmN0aW9uKG4pe24uX19oJiYobi5fX2g9W10pfSksdT1bXSxuLl9fZShyLHQuX192KX19KSxsJiZsKHQsdSl9LG4udW5tb3VudD1mdW5jdGlvbih0KXttJiZtKHQpO3ZhciB1LHI9dC5fX2M7ciYmci5fX0gmJihyLl9fSC5fXy5mb3JFYWNoKGZ1bmN0aW9uKG4pe3RyeXtqKG4pfWNhdGNoKG4pe3U9bn19KSx1JiZuLl9fZSh1LHIuX192KSl9O3ZhciBnPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVlc3RBbmltYXRpb25GcmFtZTtmdW5jdGlvbiBqKG4pe3ZhciB0PXUscj1uLl9fYztcImZ1bmN0aW9uXCI9PXR5cGVvZiByJiYobi5fX2M9dm9pZCAwLHIoKSksdT10fWZ1bmN0aW9uIGsobil7dmFyIHQ9dTtuLl9fYz1uLl9fKCksdT10fWZ1bmN0aW9uIHcobix0KXtyZXR1cm4hbnx8bi5sZW5ndGghPT10Lmxlbmd0aHx8dC5zb21lKGZ1bmN0aW9uKHQsdSl7cmV0dXJuIHQhPT1uW3VdfSl9ZnVuY3Rpb24geihuLHQpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIHQ/dChuKTp0fWV4cG9ydHt5IGFzIHVzZVN0YXRlLGQgYXMgdXNlUmVkdWNlcixfIGFzIHVzZUVmZmVjdCxoIGFzIHVzZUxheW91dEVmZmVjdCxzIGFzIHVzZVJlZixBIGFzIHVzZUltcGVyYXRpdmVIYW5kbGUsRiBhcyB1c2VNZW1vLFQgYXMgdXNlQ2FsbGJhY2sscSBhcyB1c2VDb250ZXh0LHggYXMgdXNlRGVidWdWYWx1ZSxWIGFzIHVzZUVycm9yQm91bmRhcnl9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aG9va3MubW9kdWxlLmpzLm1hcFxuIiwiXG4vKiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEJlZ2luIHByaXNtLWNvcmUuanNcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cblxuLy8vIDxyZWZlcmVuY2UgbGliPVwiV2ViV29ya2VyXCIvPlxuXG52YXIgX3NlbGYgPSAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG5cdD8gd2luZG93ICAgLy8gaWYgaW4gYnJvd3NlclxuXHQ6IChcblx0XHQodHlwZW9mIFdvcmtlckdsb2JhbFNjb3BlICE9PSAndW5kZWZpbmVkJyAmJiBzZWxmIGluc3RhbmNlb2YgV29ya2VyR2xvYmFsU2NvcGUpXG5cdFx0XHQ/IHNlbGYgLy8gaWYgaW4gd29ya2VyXG5cdFx0XHQ6IHt9ICAgLy8gaWYgaW4gbm9kZSBqc1xuXHQpO1xuXG4vKipcbiAqIFByaXNtOiBMaWdodHdlaWdodCwgcm9idXN0LCBlbGVnYW50IHN5bnRheCBoaWdobGlnaHRpbmdcbiAqXG4gKiBAbGljZW5zZSBNSVQgPGh0dHBzOi8vb3BlbnNvdXJjZS5vcmcvbGljZW5zZXMvTUlUPlxuICogQGF1dGhvciBMZWEgVmVyb3UgPGh0dHBzOi8vbGVhLnZlcm91Lm1lPlxuICogQG5hbWVzcGFjZVxuICogQHB1YmxpY1xuICovXG52YXIgUHJpc20gPSAoZnVuY3Rpb24gKF9zZWxmKSB7XG5cblx0Ly8gUHJpdmF0ZSBoZWxwZXIgdmFyc1xuXHR2YXIgbGFuZyA9IC8oPzpefFxccylsYW5nKD86dWFnZSk/LShbXFx3LV0rKSg/PVxcc3wkKS9pO1xuXHR2YXIgdW5pcXVlSWQgPSAwO1xuXG5cdC8vIFRoZSBncmFtbWFyIG9iamVjdCBmb3IgcGxhaW50ZXh0XG5cdHZhciBwbGFpblRleHRHcmFtbWFyID0ge307XG5cblxuXHR2YXIgXyA9IHtcblx0XHQvKipcblx0XHQgKiBCeSBkZWZhdWx0LCBQcmlzbSB3aWxsIGF0dGVtcHQgdG8gaGlnaGxpZ2h0IGFsbCBjb2RlIGVsZW1lbnRzIChieSBjYWxsaW5nIHtAbGluayBQcmlzbS5oaWdobGlnaHRBbGx9KSBvbiB0aGVcblx0XHQgKiBjdXJyZW50IHBhZ2UgYWZ0ZXIgdGhlIHBhZ2UgZmluaXNoZWQgbG9hZGluZy4gVGhpcyBtaWdodCBiZSBhIHByb2JsZW0gaWYgZS5nLiB5b3Ugd2FudGVkIHRvIGFzeW5jaHJvbm91c2x5IGxvYWRcblx0XHQgKiBhZGRpdGlvbmFsIGxhbmd1YWdlcyBvciBwbHVnaW5zIHlvdXJzZWxmLlxuXHRcdCAqXG5cdFx0ICogQnkgc2V0dGluZyB0aGlzIHZhbHVlIHRvIGB0cnVlYCwgUHJpc20gd2lsbCBub3QgYXV0b21hdGljYWxseSBoaWdobGlnaHQgYWxsIGNvZGUgZWxlbWVudHMgb24gdGhlIHBhZ2UuXG5cdFx0ICpcblx0XHQgKiBZb3Ugb2J2aW91c2x5IGhhdmUgdG8gY2hhbmdlIHRoaXMgdmFsdWUgYmVmb3JlIHRoZSBhdXRvbWF0aWMgaGlnaGxpZ2h0aW5nIHN0YXJ0ZWQuIFRvIGRvIHRoaXMsIHlvdSBjYW4gYWRkIGFuXG5cdFx0ICogZW1wdHkgUHJpc20gb2JqZWN0IGludG8gdGhlIGdsb2JhbCBzY29wZSBiZWZvcmUgbG9hZGluZyB0aGUgUHJpc20gc2NyaXB0IGxpa2UgdGhpczpcblx0XHQgKlxuXHRcdCAqIGBgYGpzXG5cdFx0ICogd2luZG93LlByaXNtID0gd2luZG93LlByaXNtIHx8IHt9O1xuXHRcdCAqIFByaXNtLm1hbnVhbCA9IHRydWU7XG5cdFx0ICogLy8gYWRkIGEgbmV3IDxzY3JpcHQ+IHRvIGxvYWQgUHJpc20ncyBzY3JpcHRcblx0XHQgKiBgYGBcblx0XHQgKlxuXHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0ICogQHR5cGUge2Jvb2xlYW59XG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdG1hbnVhbDogX3NlbGYuUHJpc20gJiYgX3NlbGYuUHJpc20ubWFudWFsLFxuXHRcdC8qKlxuXHRcdCAqIEJ5IGRlZmF1bHQsIGlmIFByaXNtIGlzIGluIGEgd2ViIHdvcmtlciwgaXQgYXNzdW1lcyB0aGF0IGl0IGlzIGluIGEgd29ya2VyIGl0IGNyZWF0ZWQgaXRzZWxmLCBzbyBpdCB1c2VzXG5cdFx0ICogYGFkZEV2ZW50TGlzdGVuZXJgIHRvIGNvbW11bmljYXRlIHdpdGggaXRzIHBhcmVudCBpbnN0YW5jZS4gSG93ZXZlciwgaWYgeW91J3JlIHVzaW5nIFByaXNtIG1hbnVhbGx5IGluIHlvdXJcblx0XHQgKiBvd24gd29ya2VyLCB5b3UgZG9uJ3Qgd2FudCBpdCB0byBkbyB0aGlzLlxuXHRcdCAqXG5cdFx0ICogQnkgc2V0dGluZyB0aGlzIHZhbHVlIHRvIGB0cnVlYCwgUHJpc20gd2lsbCBub3QgYWRkIGl0cyBvd24gbGlzdGVuZXJzIHRvIHRoZSB3b3JrZXIuXG5cdFx0ICpcblx0XHQgKiBZb3Ugb2J2aW91c2x5IGhhdmUgdG8gY2hhbmdlIHRoaXMgdmFsdWUgYmVmb3JlIFByaXNtIGV4ZWN1dGVzLiBUbyBkbyB0aGlzLCB5b3UgY2FuIGFkZCBhblxuXHRcdCAqIGVtcHR5IFByaXNtIG9iamVjdCBpbnRvIHRoZSBnbG9iYWwgc2NvcGUgYmVmb3JlIGxvYWRpbmcgdGhlIFByaXNtIHNjcmlwdCBsaWtlIHRoaXM6XG5cdFx0ICpcblx0XHQgKiBgYGBqc1xuXHRcdCAqIHdpbmRvdy5QcmlzbSA9IHdpbmRvdy5QcmlzbSB8fCB7fTtcblx0XHQgKiBQcmlzbS5kaXNhYmxlV29ya2VyTWVzc2FnZUhhbmRsZXIgPSB0cnVlO1xuXHRcdCAqIC8vIExvYWQgUHJpc20ncyBzY3JpcHRcblx0XHQgKiBgYGBcblx0XHQgKlxuXHRcdCAqIEBkZWZhdWx0IGZhbHNlXG5cdFx0ICogQHR5cGUge2Jvb2xlYW59XG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdGRpc2FibGVXb3JrZXJNZXNzYWdlSGFuZGxlcjogX3NlbGYuUHJpc20gJiYgX3NlbGYuUHJpc20uZGlzYWJsZVdvcmtlck1lc3NhZ2VIYW5kbGVyLFxuXG5cdFx0LyoqXG5cdFx0ICogQSBuYW1lc3BhY2UgZm9yIHV0aWxpdHkgbWV0aG9kcy5cblx0XHQgKlxuXHRcdCAqIEFsbCBmdW5jdGlvbiBpbiB0aGlzIG5hbWVzcGFjZSB0aGF0IGFyZSBub3QgZXhwbGljaXRseSBtYXJrZWQgYXMgX3B1YmxpY18gYXJlIGZvciBfX2ludGVybmFsIHVzZSBvbmx5X18gYW5kIG1heVxuXHRcdCAqIGNoYW5nZSBvciBkaXNhcHBlYXIgYXQgYW55IHRpbWUuXG5cdFx0ICpcblx0XHQgKiBAbmFtZXNwYWNlXG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICovXG5cdFx0dXRpbDoge1xuXHRcdFx0ZW5jb2RlOiBmdW5jdGlvbiBlbmNvZGUodG9rZW5zKSB7XG5cdFx0XHRcdGlmICh0b2tlbnMgaW5zdGFuY2VvZiBUb2tlbikge1xuXHRcdFx0XHRcdHJldHVybiBuZXcgVG9rZW4odG9rZW5zLnR5cGUsIGVuY29kZSh0b2tlbnMuY29udGVudCksIHRva2Vucy5hbGlhcyk7XG5cdFx0XHRcdH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0b2tlbnMpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRva2Vucy5tYXAoZW5jb2RlKTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRyZXR1cm4gdG9rZW5zLnJlcGxhY2UoLyYvZywgJyZhbXA7JykucmVwbGFjZSgvPC9nLCAnJmx0OycpLnJlcGxhY2UoL1xcdTAwYTAvZywgJyAnKTtcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIHRoZSBuYW1lIG9mIHRoZSB0eXBlIG9mIHRoZSBnaXZlbiB2YWx1ZS5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge2FueX0gb1xuXHRcdFx0ICogQHJldHVybnMge3N0cmluZ31cblx0XHRcdCAqIEBleGFtcGxlXG5cdFx0XHQgKiB0eXBlKG51bGwpICAgICAgPT09ICdOdWxsJ1xuXHRcdFx0ICogdHlwZSh1bmRlZmluZWQpID09PSAnVW5kZWZpbmVkJ1xuXHRcdFx0ICogdHlwZSgxMjMpICAgICAgID09PSAnTnVtYmVyJ1xuXHRcdFx0ICogdHlwZSgnZm9vJykgICAgID09PSAnU3RyaW5nJ1xuXHRcdFx0ICogdHlwZSh0cnVlKSAgICAgID09PSAnQm9vbGVhbidcblx0XHRcdCAqIHR5cGUoWzEsIDJdKSAgICA9PT0gJ0FycmF5J1xuXHRcdFx0ICogdHlwZSh7fSkgICAgICAgID09PSAnT2JqZWN0J1xuXHRcdFx0ICogdHlwZShTdHJpbmcpICAgID09PSAnRnVuY3Rpb24nXG5cdFx0XHQgKiB0eXBlKC9hYmMrLykgICAgPT09ICdSZWdFeHAnXG5cdFx0XHQgKi9cblx0XHRcdHR5cGU6IGZ1bmN0aW9uIChvKSB7XG5cdFx0XHRcdHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobykuc2xpY2UoOCwgLTEpO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIGEgdW5pcXVlIG51bWJlciBmb3IgdGhlIGdpdmVuIG9iamVjdC4gTGF0ZXIgY2FsbHMgd2lsbCBzdGlsbCByZXR1cm4gdGhlIHNhbWUgbnVtYmVyLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcblx0XHRcdCAqIEByZXR1cm5zIHtudW1iZXJ9XG5cdFx0XHQgKi9cblx0XHRcdG9iaklkOiBmdW5jdGlvbiAob2JqKSB7XG5cdFx0XHRcdGlmICghb2JqWydfX2lkJ10pIHtcblx0XHRcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkob2JqLCAnX19pZCcsIHsgdmFsdWU6ICsrdW5pcXVlSWQgfSk7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuIG9ialsnX19pZCddO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDcmVhdGVzIGEgZGVlcCBjbG9uZSBvZiB0aGUgZ2l2ZW4gb2JqZWN0LlxuXHRcdFx0ICpcblx0XHRcdCAqIFRoZSBtYWluIGludGVuZGVkIHVzZSBvZiB0aGlzIGZ1bmN0aW9uIGlzIHRvIGNsb25lIGxhbmd1YWdlIGRlZmluaXRpb25zLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7VH0gb1xuXHRcdFx0ICogQHBhcmFtIHtSZWNvcmQ8bnVtYmVyLCBhbnk+fSBbdmlzaXRlZF1cblx0XHRcdCAqIEByZXR1cm5zIHtUfVxuXHRcdFx0ICogQHRlbXBsYXRlIFRcblx0XHRcdCAqL1xuXHRcdFx0Y2xvbmU6IGZ1bmN0aW9uIGRlZXBDbG9uZShvLCB2aXNpdGVkKSB7XG5cdFx0XHRcdHZpc2l0ZWQgPSB2aXNpdGVkIHx8IHt9O1xuXG5cdFx0XHRcdHZhciBjbG9uZTsgdmFyIGlkO1xuXHRcdFx0XHRzd2l0Y2ggKF8udXRpbC50eXBlKG8pKSB7XG5cdFx0XHRcdFx0Y2FzZSAnT2JqZWN0Jzpcblx0XHRcdFx0XHRcdGlkID0gXy51dGlsLm9iaklkKG8pO1xuXHRcdFx0XHRcdFx0aWYgKHZpc2l0ZWRbaWRdKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB2aXNpdGVkW2lkXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNsb25lID0gLyoqIEB0eXBlIHtSZWNvcmQ8c3RyaW5nLCBhbnk+fSAqLyAoe30pO1xuXHRcdFx0XHRcdFx0dmlzaXRlZFtpZF0gPSBjbG9uZTtcblxuXHRcdFx0XHRcdFx0Zm9yICh2YXIga2V5IGluIG8pIHtcblx0XHRcdFx0XHRcdFx0aWYgKG8uaGFzT3duUHJvcGVydHkoa2V5KSkge1xuXHRcdFx0XHRcdFx0XHRcdGNsb25lW2tleV0gPSBkZWVwQ2xvbmUob1trZXldLCB2aXNpdGVkKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRyZXR1cm4gLyoqIEB0eXBlIHthbnl9ICovIChjbG9uZSk7XG5cblx0XHRcdFx0XHRjYXNlICdBcnJheSc6XG5cdFx0XHRcdFx0XHRpZCA9IF8udXRpbC5vYmpJZChvKTtcblx0XHRcdFx0XHRcdGlmICh2aXNpdGVkW2lkXSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdmlzaXRlZFtpZF07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjbG9uZSA9IFtdO1xuXHRcdFx0XHRcdFx0dmlzaXRlZFtpZF0gPSBjbG9uZTtcblxuXHRcdFx0XHRcdFx0KC8qKiBAdHlwZSB7QXJyYXl9ICovKC8qKiBAdHlwZSB7YW55fSAqLyhvKSkpLmZvckVhY2goZnVuY3Rpb24gKHYsIGkpIHtcblx0XHRcdFx0XHRcdFx0Y2xvbmVbaV0gPSBkZWVwQ2xvbmUodiwgdmlzaXRlZCk7XG5cdFx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdFx0cmV0dXJuIC8qKiBAdHlwZSB7YW55fSAqLyAoY2xvbmUpO1xuXG5cdFx0XHRcdFx0ZGVmYXVsdDpcblx0XHRcdFx0XHRcdHJldHVybiBvO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgdGhlIFByaXNtIGxhbmd1YWdlIG9mIHRoZSBnaXZlbiBlbGVtZW50IHNldCBieSBhIGBsYW5ndWFnZS14eHh4YCBvciBgbGFuZy14eHh4YCBjbGFzcy5cblx0XHRcdCAqXG5cdFx0XHQgKiBJZiBubyBsYW5ndWFnZSBpcyBzZXQgZm9yIHRoZSBlbGVtZW50IG9yIHRoZSBlbGVtZW50IGlzIGBudWxsYCBvciBgdW5kZWZpbmVkYCwgYG5vbmVgIHdpbGwgYmUgcmV0dXJuZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50XG5cdFx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHRcdFx0ICovXG5cdFx0XHRnZXRMYW5ndWFnZTogZnVuY3Rpb24gKGVsZW1lbnQpIHtcblx0XHRcdFx0d2hpbGUgKGVsZW1lbnQpIHtcblx0XHRcdFx0XHR2YXIgbSA9IGxhbmcuZXhlYyhlbGVtZW50LmNsYXNzTmFtZSk7XG5cdFx0XHRcdFx0aWYgKG0pIHtcblx0XHRcdFx0XHRcdHJldHVybiBtWzFdLnRvTG93ZXJDYXNlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuICdub25lJztcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogU2V0cyB0aGUgUHJpc20gYGxhbmd1YWdlLXh4eHhgIGNsYXNzIG9mIHRoZSBnaXZlbiBlbGVtZW50LlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IGxhbmd1YWdlXG5cdFx0XHQgKiBAcmV0dXJucyB7dm9pZH1cblx0XHRcdCAqL1xuXHRcdFx0c2V0TGFuZ3VhZ2U6IGZ1bmN0aW9uIChlbGVtZW50LCBsYW5ndWFnZSkge1xuXHRcdFx0XHQvLyByZW1vdmUgYWxsIGBsYW5ndWFnZS14eHh4YCBjbGFzc2VzXG5cdFx0XHRcdC8vICh0aGlzIG1pZ2h0IGxlYXZlIGJlaGluZCBhIGxlYWRpbmcgc3BhY2UpXG5cdFx0XHRcdGVsZW1lbnQuY2xhc3NOYW1lID0gZWxlbWVudC5jbGFzc05hbWUucmVwbGFjZShSZWdFeHAobGFuZywgJ2dpJyksICcnKTtcblxuXHRcdFx0XHQvLyBhZGQgdGhlIG5ldyBgbGFuZ3VhZ2UteHh4eGAgY2xhc3Ncblx0XHRcdFx0Ly8gKHVzaW5nIGBjbGFzc0xpc3RgIHdpbGwgYXV0b21hdGljYWxseSBjbGVhbiB1cCBzcGFjZXMgZm9yIHVzKVxuXHRcdFx0XHRlbGVtZW50LmNsYXNzTGlzdC5hZGQoJ2xhbmd1YWdlLScgKyBsYW5ndWFnZSk7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgdGhlIHNjcmlwdCBlbGVtZW50IHRoYXQgaXMgY3VycmVudGx5IGV4ZWN1dGluZy5cblx0XHRcdCAqXG5cdFx0XHQgKiBUaGlzIGRvZXMgX19ub3RfXyB3b3JrIGZvciBsaW5lIHNjcmlwdCBlbGVtZW50LlxuXHRcdFx0ICpcblx0XHRcdCAqIEByZXR1cm5zIHtIVE1MU2NyaXB0RWxlbWVudCB8IG51bGx9XG5cdFx0XHQgKi9cblx0XHRcdGN1cnJlbnRTY3JpcHQ6IGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0aWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRcdFx0XHRyZXR1cm4gbnVsbDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoJ2N1cnJlbnRTY3JpcHQnIGluIGRvY3VtZW50ICYmIDEgPCAyIC8qIGhhY2sgdG8gdHJpcCBUUycgZmxvdyBhbmFseXNpcyAqLykge1xuXHRcdFx0XHRcdHJldHVybiAvKiogQHR5cGUge2FueX0gKi8gKGRvY3VtZW50LmN1cnJlbnRTY3JpcHQpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gSUUxMSB3b3JrYXJvdW5kXG5cdFx0XHRcdC8vIHdlJ2xsIGdldCB0aGUgc3JjIG9mIHRoZSBjdXJyZW50IHNjcmlwdCBieSBwYXJzaW5nIElFMTEncyBlcnJvciBzdGFjayB0cmFjZVxuXHRcdFx0XHQvLyB0aGlzIHdpbGwgbm90IHdvcmsgZm9yIGlubGluZSBzY3JpcHRzXG5cblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoKTtcblx0XHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdFx0Ly8gR2V0IGZpbGUgc3JjIHVybCBmcm9tIHN0YWNrLiBTcGVjaWZpY2FsbHkgd29ya3Mgd2l0aCB0aGUgZm9ybWF0IG9mIHN0YWNrIHRyYWNlcyBpbiBJRS5cblx0XHRcdFx0XHQvLyBBIHN0YWNrIHdpbGwgbG9vayBsaWtlIHRoaXM6XG5cdFx0XHRcdFx0Ly9cblx0XHRcdFx0XHQvLyBFcnJvclxuXHRcdFx0XHRcdC8vICAgIGF0IF8udXRpbC5jdXJyZW50U2NyaXB0IChodHRwOi8vbG9jYWxob3N0L2NvbXBvbmVudHMvcHJpc20tY29yZS5qczoxMTk6NSlcblx0XHRcdFx0XHQvLyAgICBhdCBHbG9iYWwgY29kZSAoaHR0cDovL2xvY2FsaG9zdC9jb21wb25lbnRzL3ByaXNtLWNvcmUuanM6NjA2OjEpXG5cblx0XHRcdFx0XHR2YXIgc3JjID0gKC9hdCBbXihcXHJcXG5dKlxcKCguKik6W146XSs6W146XStcXCkkL2kuZXhlYyhlcnIuc3RhY2spIHx8IFtdKVsxXTtcblx0XHRcdFx0XHRpZiAoc3JjKSB7XG5cdFx0XHRcdFx0XHR2YXIgc2NyaXB0cyA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCdzY3JpcHQnKTtcblx0XHRcdFx0XHRcdGZvciAodmFyIGkgaW4gc2NyaXB0cykge1xuXHRcdFx0XHRcdFx0XHRpZiAoc2NyaXB0c1tpXS5zcmMgPT0gc3JjKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuIHNjcmlwdHNbaV07XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyB3aGV0aGVyIGEgZ2l2ZW4gY2xhc3MgaXMgYWN0aXZlIGZvciBgZWxlbWVudGAuXG5cdFx0XHQgKlxuXHRcdFx0ICogVGhlIGNsYXNzIGNhbiBiZSBhY3RpdmF0ZWQgaWYgYGVsZW1lbnRgIG9yIG9uZSBvZiBpdHMgYW5jZXN0b3JzIGhhcyB0aGUgZ2l2ZW4gY2xhc3MgYW5kIGl0IGNhbiBiZSBkZWFjdGl2YXRlZFxuXHRcdFx0ICogaWYgYGVsZW1lbnRgIG9yIG9uZSBvZiBpdHMgYW5jZXN0b3JzIGhhcyB0aGUgbmVnYXRlZCB2ZXJzaW9uIG9mIHRoZSBnaXZlbiBjbGFzcy4gVGhlIF9uZWdhdGVkIHZlcnNpb25fIG9mIHRoZVxuXHRcdFx0ICogZ2l2ZW4gY2xhc3MgaXMganVzdCB0aGUgZ2l2ZW4gY2xhc3Mgd2l0aCBhIGBuby1gIHByZWZpeC5cblx0XHRcdCAqXG5cdFx0XHQgKiBXaGV0aGVyIHRoZSBjbGFzcyBpcyBhY3RpdmUgaXMgZGV0ZXJtaW5lZCBieSB0aGUgY2xvc2VzdCBhbmNlc3RvciBvZiBgZWxlbWVudGAgKHdoZXJlIGBlbGVtZW50YCBpdHNlbGYgaXNcblx0XHRcdCAqIGNsb3Nlc3QgYW5jZXN0b3IpIHRoYXQgaGFzIHRoZSBnaXZlbiBjbGFzcyBvciB0aGUgbmVnYXRlZCB2ZXJzaW9uIG9mIGl0LiBJZiBuZWl0aGVyIGBlbGVtZW50YCBub3IgYW55IG9mIGl0c1xuXHRcdFx0ICogYW5jZXN0b3JzIGhhdmUgdGhlIGdpdmVuIGNsYXNzIG9yIHRoZSBuZWdhdGVkIHZlcnNpb24gb2YgaXQsIHRoZW4gdGhlIGRlZmF1bHQgYWN0aXZhdGlvbiB3aWxsIGJlIHJldHVybmVkLlxuXHRcdFx0ICpcblx0XHRcdCAqIEluIHRoZSBwYXJhZG94aWNhbCBzaXR1YXRpb24gd2hlcmUgdGhlIGNsb3Nlc3QgYW5jZXN0b3IgY29udGFpbnMgX19ib3RoX18gdGhlIGdpdmVuIGNsYXNzIGFuZCB0aGUgbmVnYXRlZFxuXHRcdFx0ICogdmVyc2lvbiBvZiBpdCwgdGhlIGNsYXNzIGlzIGNvbnNpZGVyZWQgYWN0aXZlLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IGNsYXNzTmFtZVxuXHRcdFx0ICogQHBhcmFtIHtib29sZWFufSBbZGVmYXVsdEFjdGl2YXRpb249ZmFsc2VdXG5cdFx0XHQgKiBAcmV0dXJucyB7Ym9vbGVhbn1cblx0XHRcdCAqL1xuXHRcdFx0aXNBY3RpdmU6IGZ1bmN0aW9uIChlbGVtZW50LCBjbGFzc05hbWUsIGRlZmF1bHRBY3RpdmF0aW9uKSB7XG5cdFx0XHRcdHZhciBubyA9ICduby0nICsgY2xhc3NOYW1lO1xuXG5cdFx0XHRcdHdoaWxlIChlbGVtZW50KSB7XG5cdFx0XHRcdFx0dmFyIGNsYXNzTGlzdCA9IGVsZW1lbnQuY2xhc3NMaXN0O1xuXHRcdFx0XHRcdGlmIChjbGFzc0xpc3QuY29udGFpbnMoY2xhc3NOYW1lKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmIChjbGFzc0xpc3QuY29udGFpbnMobm8pKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGVsZW1lbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0cmV0dXJuICEhZGVmYXVsdEFjdGl2YXRpb247XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIFRoaXMgbmFtZXNwYWNlIGNvbnRhaW5zIGFsbCBjdXJyZW50bHkgbG9hZGVkIGxhbmd1YWdlcyBhbmQgdGhlIHNvbWUgaGVscGVyIGZ1bmN0aW9ucyB0byBjcmVhdGUgYW5kIG1vZGlmeSBsYW5ndWFnZXMuXG5cdFx0ICpcblx0XHQgKiBAbmFtZXNwYWNlXG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdGxhbmd1YWdlczoge1xuXHRcdFx0LyoqXG5cdFx0XHQgKiBUaGUgZ3JhbW1hciBmb3IgcGxhaW4sIHVuZm9ybWF0dGVkIHRleHQuXG5cdFx0XHQgKi9cblx0XHRcdHBsYWluOiBwbGFpblRleHRHcmFtbWFyLFxuXHRcdFx0cGxhaW50ZXh0OiBwbGFpblRleHRHcmFtbWFyLFxuXHRcdFx0dGV4dDogcGxhaW5UZXh0R3JhbW1hcixcblx0XHRcdHR4dDogcGxhaW5UZXh0R3JhbW1hcixcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBDcmVhdGVzIGEgZGVlcCBjb3B5IG9mIHRoZSBsYW5ndWFnZSB3aXRoIHRoZSBnaXZlbiBpZCBhbmQgYXBwZW5kcyB0aGUgZ2l2ZW4gdG9rZW5zLlxuXHRcdFx0ICpcblx0XHRcdCAqIElmIGEgdG9rZW4gaW4gYHJlZGVmYCBhbHNvIGFwcGVhcnMgaW4gdGhlIGNvcGllZCBsYW5ndWFnZSwgdGhlbiB0aGUgZXhpc3RpbmcgdG9rZW4gaW4gdGhlIGNvcGllZCBsYW5ndWFnZVxuXHRcdFx0ICogd2lsbCBiZSBvdmVyd3JpdHRlbiBhdCBpdHMgb3JpZ2luYWwgcG9zaXRpb24uXG5cdFx0XHQgKlxuXHRcdFx0ICogIyMgQmVzdCBwcmFjdGljZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBTaW5jZSB0aGUgcG9zaXRpb24gb2Ygb3ZlcndyaXRpbmcgdG9rZW5zICh0b2tlbiBpbiBgcmVkZWZgIHRoYXQgb3ZlcndyaXRlIHRva2VucyBpbiB0aGUgY29waWVkIGxhbmd1YWdlKVxuXHRcdFx0ICogZG9lc24ndCBtYXR0ZXIsIHRoZXkgY2FuIHRlY2huaWNhbGx5IGJlIGluIGFueSBvcmRlci4gSG93ZXZlciwgdGhpcyBjYW4gYmUgY29uZnVzaW5nIHRvIG90aGVycyB0aGF0IHRyeWluZyB0b1xuXHRcdFx0ICogdW5kZXJzdGFuZCB0aGUgbGFuZ3VhZ2UgZGVmaW5pdGlvbiBiZWNhdXNlLCBub3JtYWxseSwgdGhlIG9yZGVyIG9mIHRva2VucyBtYXR0ZXJzIGluIFByaXNtIGdyYW1tYXJzLlxuXHRcdFx0ICpcblx0XHRcdCAqIFRoZXJlZm9yZSwgaXQgaXMgZW5jb3VyYWdlZCB0byBvcmRlciBvdmVyd3JpdGluZyB0b2tlbnMgYWNjb3JkaW5nIHRvIHRoZSBwb3NpdGlvbnMgb2YgdGhlIG92ZXJ3cml0dGVuIHRva2Vucy5cblx0XHRcdCAqIEZ1cnRoZXJtb3JlLCBhbGwgbm9uLW92ZXJ3cml0aW5nIHRva2VucyBzaG91bGQgYmUgcGxhY2VkIGFmdGVyIHRoZSBvdmVyd3JpdGluZyBvbmVzLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBpZCBUaGUgaWQgb2YgdGhlIGxhbmd1YWdlIHRvIGV4dGVuZC4gVGhpcyBoYXMgdG8gYmUgYSBrZXkgaW4gYFByaXNtLmxhbmd1YWdlc2AuXG5cdFx0XHQgKiBAcGFyYW0ge0dyYW1tYXJ9IHJlZGVmIFRoZSBuZXcgdG9rZW5zIHRvIGFwcGVuZC5cblx0XHRcdCAqIEByZXR1cm5zIHtHcmFtbWFyfSBUaGUgbmV3IGxhbmd1YWdlIGNyZWF0ZWQuXG5cdFx0XHQgKiBAcHVibGljXG5cdFx0XHQgKiBAZXhhbXBsZVxuXHRcdFx0ICogUHJpc20ubGFuZ3VhZ2VzWydjc3Mtd2l0aC1jb2xvcnMnXSA9IFByaXNtLmxhbmd1YWdlcy5leHRlbmQoJ2NzcycsIHtcblx0XHRcdCAqICAgICAvLyBQcmlzbS5sYW5ndWFnZXMuY3NzIGFscmVhZHkgaGFzIGEgJ2NvbW1lbnQnIHRva2VuLCBzbyB0aGlzIHRva2VuIHdpbGwgb3ZlcndyaXRlIENTUycgJ2NvbW1lbnQnIHRva2VuXG5cdFx0XHQgKiAgICAgLy8gYXQgaXRzIG9yaWdpbmFsIHBvc2l0aW9uXG5cdFx0XHQgKiAgICAgJ2NvbW1lbnQnOiB7IC4uLiB9LFxuXHRcdFx0ICogICAgIC8vIENTUyBkb2Vzbid0IGhhdmUgYSAnY29sb3InIHRva2VuLCBzbyB0aGlzIHRva2VuIHdpbGwgYmUgYXBwZW5kZWRcblx0XHRcdCAqICAgICAnY29sb3InOiAvXFxiKD86cmVkfGdyZWVufGJsdWUpXFxiL1xuXHRcdFx0ICogfSk7XG5cdFx0XHQgKi9cblx0XHRcdGV4dGVuZDogZnVuY3Rpb24gKGlkLCByZWRlZikge1xuXHRcdFx0XHR2YXIgbGFuZyA9IF8udXRpbC5jbG9uZShfLmxhbmd1YWdlc1tpZF0pO1xuXG5cdFx0XHRcdGZvciAodmFyIGtleSBpbiByZWRlZikge1xuXHRcdFx0XHRcdGxhbmdba2V5XSA9IHJlZGVmW2tleV07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gbGFuZztcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogSW5zZXJ0cyB0b2tlbnMgX2JlZm9yZV8gYW5vdGhlciB0b2tlbiBpbiBhIGxhbmd1YWdlIGRlZmluaXRpb24gb3IgYW55IG90aGVyIGdyYW1tYXIuXG5cdFx0XHQgKlxuXHRcdFx0ICogIyMgVXNhZ2Vcblx0XHRcdCAqXG5cdFx0XHQgKiBUaGlzIGhlbHBlciBtZXRob2QgbWFrZXMgaXQgZWFzeSB0byBtb2RpZnkgZXhpc3RpbmcgbGFuZ3VhZ2VzLiBGb3IgZXhhbXBsZSwgdGhlIENTUyBsYW5ndWFnZSBkZWZpbml0aW9uXG5cdFx0XHQgKiBub3Qgb25seSBkZWZpbmVzIENTUyBoaWdobGlnaHRpbmcgZm9yIENTUyBkb2N1bWVudHMsIGJ1dCBhbHNvIG5lZWRzIHRvIGRlZmluZSBoaWdobGlnaHRpbmcgZm9yIENTUyBlbWJlZGRlZFxuXHRcdFx0ICogaW4gSFRNTCB0aHJvdWdoIGA8c3R5bGU+YCBlbGVtZW50cy4gVG8gZG8gdGhpcywgaXQgbmVlZHMgdG8gbW9kaWZ5IGBQcmlzbS5sYW5ndWFnZXMubWFya3VwYCBhbmQgYWRkIHRoZVxuXHRcdFx0ICogYXBwcm9wcmlhdGUgdG9rZW5zLiBIb3dldmVyLCBgUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cGAgaXMgYSByZWd1bGFyIEphdmFTY3JpcHQgb2JqZWN0IGxpdGVyYWwsIHNvIGlmIHlvdSBkb1xuXHRcdFx0ICogdGhpczpcblx0XHRcdCAqXG5cdFx0XHQgKiBgYGBqc1xuXHRcdFx0ICogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC5zdHlsZSA9IHtcblx0XHRcdCAqICAgICAvLyB0b2tlblxuXHRcdFx0ICogfTtcblx0XHRcdCAqIGBgYFxuXHRcdFx0ICpcblx0XHRcdCAqIHRoZW4gdGhlIGBzdHlsZWAgdG9rZW4gd2lsbCBiZSBhZGRlZCAoYW5kIHByb2Nlc3NlZCkgYXQgdGhlIGVuZC4gYGluc2VydEJlZm9yZWAgYWxsb3dzIHlvdSB0byBpbnNlcnQgdG9rZW5zXG5cdFx0XHQgKiBiZWZvcmUgZXhpc3RpbmcgdG9rZW5zLiBGb3IgdGhlIENTUyBleGFtcGxlIGFib3ZlLCB5b3Ugd291bGQgdXNlIGl0IGxpa2UgdGhpczpcblx0XHRcdCAqXG5cdFx0XHQgKiBgYGBqc1xuXHRcdFx0ICogUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnbWFya3VwJywgJ2NkYXRhJywge1xuXHRcdFx0ICogICAgICdzdHlsZSc6IHtcblx0XHRcdCAqICAgICAgICAgLy8gdG9rZW5cblx0XHRcdCAqICAgICB9XG5cdFx0XHQgKiB9KTtcblx0XHRcdCAqIGBgYFxuXHRcdFx0ICpcblx0XHRcdCAqICMjIFNwZWNpYWwgY2FzZXNcblx0XHRcdCAqXG5cdFx0XHQgKiBJZiB0aGUgZ3JhbW1hcnMgb2YgYGluc2lkZWAgYW5kIGBpbnNlcnRgIGhhdmUgdG9rZW5zIHdpdGggdGhlIHNhbWUgbmFtZSwgdGhlIHRva2VucyBpbiBgaW5zaWRlYCdzIGdyYW1tYXJcblx0XHRcdCAqIHdpbGwgYmUgaWdub3JlZC5cblx0XHRcdCAqXG5cdFx0XHQgKiBUaGlzIGJlaGF2aW9yIGNhbiBiZSB1c2VkIHRvIGluc2VydCB0b2tlbnMgYWZ0ZXIgYGJlZm9yZWA6XG5cdFx0XHQgKlxuXHRcdFx0ICogYGBganNcblx0XHRcdCAqIFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ21hcmt1cCcsICdjb21tZW50Jywge1xuXHRcdFx0ICogICAgICdjb21tZW50JzogUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC5jb21tZW50LFxuXHRcdFx0ICogICAgIC8vIHRva2VucyBhZnRlciAnY29tbWVudCdcblx0XHRcdCAqIH0pO1xuXHRcdFx0ICogYGBgXG5cdFx0XHQgKlxuXHRcdFx0ICogIyMgTGltaXRhdGlvbnNcblx0XHRcdCAqXG5cdFx0XHQgKiBUaGUgbWFpbiBwcm9ibGVtIGBpbnNlcnRCZWZvcmVgIGhhcyB0byBzb2x2ZSBpcyBpdGVyYXRpb24gb3JkZXIuIFNpbmNlIEVTMjAxNSwgdGhlIGl0ZXJhdGlvbiBvcmRlciBmb3Igb2JqZWN0XG5cdFx0XHQgKiBwcm9wZXJ0aWVzIGlzIGd1YXJhbnRlZWQgdG8gYmUgdGhlIGluc2VydGlvbiBvcmRlciAoZXhjZXB0IGZvciBpbnRlZ2VyIGtleXMpIGJ1dCBzb21lIGJyb3dzZXJzIGJlaGF2ZVxuXHRcdFx0ICogZGlmZmVyZW50bHkgd2hlbiBrZXlzIGFyZSBkZWxldGVkIGFuZCByZS1pbnNlcnRlZC4gU28gYGluc2VydEJlZm9yZWAgY2FuJ3QgYmUgaW1wbGVtZW50ZWQgYnkgdGVtcG9yYXJpbHlcblx0XHRcdCAqIGRlbGV0aW5nIHByb3BlcnRpZXMgd2hpY2ggaXMgbmVjZXNzYXJ5IHRvIGluc2VydCBhdCBhcmJpdHJhcnkgcG9zaXRpb25zLlxuXHRcdFx0ICpcblx0XHRcdCAqIFRvIHNvbHZlIHRoaXMgcHJvYmxlbSwgYGluc2VydEJlZm9yZWAgZG9lc24ndCBhY3R1YWxseSBpbnNlcnQgdGhlIGdpdmVuIHRva2VucyBpbnRvIHRoZSB0YXJnZXQgb2JqZWN0LlxuXHRcdFx0ICogSW5zdGVhZCwgaXQgd2lsbCBjcmVhdGUgYSBuZXcgb2JqZWN0IGFuZCByZXBsYWNlIGFsbCByZWZlcmVuY2VzIHRvIHRoZSB0YXJnZXQgb2JqZWN0IHdpdGggdGhlIG5ldyBvbmUuIFRoaXNcblx0XHRcdCAqIGNhbiBiZSBkb25lIHdpdGhvdXQgdGVtcG9yYXJpbHkgZGVsZXRpbmcgcHJvcGVydGllcywgc28gdGhlIGl0ZXJhdGlvbiBvcmRlciBpcyB3ZWxsLWRlZmluZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogSG93ZXZlciwgb25seSByZWZlcmVuY2VzIHRoYXQgY2FuIGJlIHJlYWNoZWQgZnJvbSBgUHJpc20ubGFuZ3VhZ2VzYCBvciBgaW5zZXJ0YCB3aWxsIGJlIHJlcGxhY2VkLiBJLmUuIGlmXG5cdFx0XHQgKiB5b3UgaG9sZCB0aGUgdGFyZ2V0IG9iamVjdCBpbiBhIHZhcmlhYmxlLCB0aGVuIHRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUgd2lsbCBub3QgY2hhbmdlLlxuXHRcdFx0ICpcblx0XHRcdCAqIGBgYGpzXG5cdFx0XHQgKiB2YXIgb2xkTWFya3VwID0gUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cDtcblx0XHRcdCAqIHZhciBuZXdNYXJrdXAgPSBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdtYXJrdXAnLCAnY29tbWVudCcsIHsgLi4uIH0pO1xuXHRcdFx0ICpcblx0XHRcdCAqIGFzc2VydChvbGRNYXJrdXAgIT09IFByaXNtLmxhbmd1YWdlcy5tYXJrdXApO1xuXHRcdFx0ICogYXNzZXJ0KG5ld01hcmt1cCA9PT0gUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cCk7XG5cdFx0XHQgKiBgYGBcblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gaW5zaWRlIFRoZSBwcm9wZXJ0eSBvZiBgcm9vdGAgKGUuZy4gYSBsYW5ndWFnZSBpZCBpbiBgUHJpc20ubGFuZ3VhZ2VzYCkgdGhhdCBjb250YWlucyB0aGVcblx0XHRcdCAqIG9iamVjdCB0byBiZSBtb2RpZmllZC5cblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBiZWZvcmUgVGhlIGtleSB0byBpbnNlcnQgYmVmb3JlLlxuXHRcdFx0ICogQHBhcmFtIHtHcmFtbWFyfSBpbnNlcnQgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIGtleS12YWx1ZSBwYWlycyB0byBiZSBpbnNlcnRlZC5cblx0XHRcdCAqIEBwYXJhbSB7T2JqZWN0PHN0cmluZywgYW55Pn0gW3Jvb3RdIFRoZSBvYmplY3QgY29udGFpbmluZyBgaW5zaWRlYCwgaS5lLiB0aGUgb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlXG5cdFx0XHQgKiBvYmplY3QgdG8gYmUgbW9kaWZpZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogRGVmYXVsdHMgdG8gYFByaXNtLmxhbmd1YWdlc2AuXG5cdFx0XHQgKiBAcmV0dXJucyB7R3JhbW1hcn0gVGhlIG5ldyBncmFtbWFyIG9iamVjdC5cblx0XHRcdCAqIEBwdWJsaWNcblx0XHRcdCAqL1xuXHRcdFx0aW5zZXJ0QmVmb3JlOiBmdW5jdGlvbiAoaW5zaWRlLCBiZWZvcmUsIGluc2VydCwgcm9vdCkge1xuXHRcdFx0XHRyb290ID0gcm9vdCB8fCAvKiogQHR5cGUge2FueX0gKi8gKF8ubGFuZ3VhZ2VzKTtcblx0XHRcdFx0dmFyIGdyYW1tYXIgPSByb290W2luc2lkZV07XG5cdFx0XHRcdC8qKiBAdHlwZSB7R3JhbW1hcn0gKi9cblx0XHRcdFx0dmFyIHJldCA9IHt9O1xuXG5cdFx0XHRcdGZvciAodmFyIHRva2VuIGluIGdyYW1tYXIpIHtcblx0XHRcdFx0XHRpZiAoZ3JhbW1hci5oYXNPd25Qcm9wZXJ0eSh0b2tlbikpIHtcblxuXHRcdFx0XHRcdFx0aWYgKHRva2VuID09IGJlZm9yZSkge1xuXHRcdFx0XHRcdFx0XHRmb3IgKHZhciBuZXdUb2tlbiBpbiBpbnNlcnQpIHtcblx0XHRcdFx0XHRcdFx0XHRpZiAoaW5zZXJ0Lmhhc093blByb3BlcnR5KG5ld1Rva2VuKSkge1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0W25ld1Rva2VuXSA9IGluc2VydFtuZXdUb2tlbl07XG5cdFx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdC8vIERvIG5vdCBpbnNlcnQgdG9rZW4gd2hpY2ggYWxzbyBvY2N1ciBpbiBpbnNlcnQuIFNlZSAjMTUyNVxuXHRcdFx0XHRcdFx0aWYgKCFpbnNlcnQuaGFzT3duUHJvcGVydHkodG9rZW4pKSB7XG5cdFx0XHRcdFx0XHRcdHJldFt0b2tlbl0gPSBncmFtbWFyW3Rva2VuXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR2YXIgb2xkID0gcm9vdFtpbnNpZGVdO1xuXHRcdFx0XHRyb290W2luc2lkZV0gPSByZXQ7XG5cblx0XHRcdFx0Ly8gVXBkYXRlIHJlZmVyZW5jZXMgaW4gb3RoZXIgbGFuZ3VhZ2UgZGVmaW5pdGlvbnNcblx0XHRcdFx0Xy5sYW5ndWFnZXMuREZTKF8ubGFuZ3VhZ2VzLCBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuXHRcdFx0XHRcdGlmICh2YWx1ZSA9PT0gb2xkICYmIGtleSAhPSBpbnNpZGUpIHtcblx0XHRcdFx0XHRcdHRoaXNba2V5XSA9IHJldDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pO1xuXG5cdFx0XHRcdHJldHVybiByZXQ7XG5cdFx0XHR9LFxuXG5cdFx0XHQvLyBUcmF2ZXJzZSBhIGxhbmd1YWdlIGRlZmluaXRpb24gd2l0aCBEZXB0aCBGaXJzdCBTZWFyY2hcblx0XHRcdERGUzogZnVuY3Rpb24gREZTKG8sIGNhbGxiYWNrLCB0eXBlLCB2aXNpdGVkKSB7XG5cdFx0XHRcdHZpc2l0ZWQgPSB2aXNpdGVkIHx8IHt9O1xuXG5cdFx0XHRcdHZhciBvYmpJZCA9IF8udXRpbC5vYmpJZDtcblxuXHRcdFx0XHRmb3IgKHZhciBpIGluIG8pIHtcblx0XHRcdFx0XHRpZiAoby5oYXNPd25Qcm9wZXJ0eShpKSkge1xuXHRcdFx0XHRcdFx0Y2FsbGJhY2suY2FsbChvLCBpLCBvW2ldLCB0eXBlIHx8IGkpO1xuXG5cdFx0XHRcdFx0XHR2YXIgcHJvcGVydHkgPSBvW2ldO1xuXHRcdFx0XHRcdFx0dmFyIHByb3BlcnR5VHlwZSA9IF8udXRpbC50eXBlKHByb3BlcnR5KTtcblxuXHRcdFx0XHRcdFx0aWYgKHByb3BlcnR5VHlwZSA9PT0gJ09iamVjdCcgJiYgIXZpc2l0ZWRbb2JqSWQocHJvcGVydHkpXSkge1xuXHRcdFx0XHRcdFx0XHR2aXNpdGVkW29iaklkKHByb3BlcnR5KV0gPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRERlMocHJvcGVydHksIGNhbGxiYWNrLCBudWxsLCB2aXNpdGVkKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAocHJvcGVydHlUeXBlID09PSAnQXJyYXknICYmICF2aXNpdGVkW29iaklkKHByb3BlcnR5KV0pIHtcblx0XHRcdFx0XHRcdFx0dmlzaXRlZFtvYmpJZChwcm9wZXJ0eSldID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0REZTKHByb3BlcnR5LCBjYWxsYmFjaywgaSwgdmlzaXRlZCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdHBsdWdpbnM6IHt9LFxuXG5cdFx0LyoqXG5cdFx0ICogVGhpcyBpcyB0aGUgbW9zdCBoaWdoLWxldmVsIGZ1bmN0aW9uIGluIFByaXNt4oCZcyBBUEkuXG5cdFx0ICogSXQgZmV0Y2hlcyBhbGwgdGhlIGVsZW1lbnRzIHRoYXQgaGF2ZSBhIGAubGFuZ3VhZ2UteHh4eGAgY2xhc3MgYW5kIHRoZW4gY2FsbHMge0BsaW5rIFByaXNtLmhpZ2hsaWdodEVsZW1lbnR9IG9uXG5cdFx0ICogZWFjaCBvbmUgb2YgdGhlbS5cblx0XHQgKlxuXHRcdCAqIFRoaXMgaXMgZXF1aXZhbGVudCB0byBgUHJpc20uaGlnaGxpZ2h0QWxsVW5kZXIoZG9jdW1lbnQsIGFzeW5jLCBjYWxsYmFjaylgLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbYXN5bmM9ZmFsc2VdIFNhbWUgYXMgaW4ge0BsaW5rIFByaXNtLmhpZ2hsaWdodEFsbFVuZGVyfS5cblx0XHQgKiBAcGFyYW0ge0hpZ2hsaWdodENhbGxiYWNrfSBbY2FsbGJhY2tdIFNhbWUgYXMgaW4ge0BsaW5rIFByaXNtLmhpZ2hsaWdodEFsbFVuZGVyfS5cblx0XHQgKiBAbWVtYmVyb2YgUHJpc21cblx0XHQgKiBAcHVibGljXG5cdFx0ICovXG5cdFx0aGlnaGxpZ2h0QWxsOiBmdW5jdGlvbiAoYXN5bmMsIGNhbGxiYWNrKSB7XG5cdFx0XHRfLmhpZ2hsaWdodEFsbFVuZGVyKGRvY3VtZW50LCBhc3luYywgY2FsbGJhY2spO1xuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBGZXRjaGVzIGFsbCB0aGUgZGVzY2VuZGFudHMgb2YgYGNvbnRhaW5lcmAgdGhhdCBoYXZlIGEgYC5sYW5ndWFnZS14eHh4YCBjbGFzcyBhbmQgdGhlbiBjYWxsc1xuXHRcdCAqIHtAbGluayBQcmlzbS5oaWdobGlnaHRFbGVtZW50fSBvbiBlYWNoIG9uZSBvZiB0aGVtLlxuXHRcdCAqXG5cdFx0ICogVGhlIGZvbGxvd2luZyBob29rcyB3aWxsIGJlIHJ1bjpcblx0XHQgKiAxLiBgYmVmb3JlLWhpZ2hsaWdodGFsbGBcblx0XHQgKiAyLiBgYmVmb3JlLWFsbC1lbGVtZW50cy1oaWdobGlnaHRgXG5cdFx0ICogMy4gQWxsIGhvb2tzIG9mIHtAbGluayBQcmlzbS5oaWdobGlnaHRFbGVtZW50fSBmb3IgZWFjaCBlbGVtZW50LlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtQYXJlbnROb2RlfSBjb250YWluZXIgVGhlIHJvb3QgZWxlbWVudCwgd2hvc2UgZGVzY2VuZGFudHMgdGhhdCBoYXZlIGEgYC5sYW5ndWFnZS14eHh4YCBjbGFzcyB3aWxsIGJlIGhpZ2hsaWdodGVkLlxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FzeW5jPWZhbHNlXSBXaGV0aGVyIGVhY2ggZWxlbWVudCBpcyB0byBiZSBoaWdobGlnaHRlZCBhc3luY2hyb25vdXNseSB1c2luZyBXZWIgV29ya2Vycy5cblx0XHQgKiBAcGFyYW0ge0hpZ2hsaWdodENhbGxiYWNrfSBbY2FsbGJhY2tdIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgb24gZWFjaCBlbGVtZW50IGFmdGVyIGl0cyBoaWdobGlnaHRpbmcgaXMgZG9uZS5cblx0XHQgKiBAbWVtYmVyb2YgUHJpc21cblx0XHQgKiBAcHVibGljXG5cdFx0ICovXG5cdFx0aGlnaGxpZ2h0QWxsVW5kZXI6IGZ1bmN0aW9uIChjb250YWluZXIsIGFzeW5jLCBjYWxsYmFjaykge1xuXHRcdFx0dmFyIGVudiA9IHtcblx0XHRcdFx0Y2FsbGJhY2s6IGNhbGxiYWNrLFxuXHRcdFx0XHRjb250YWluZXI6IGNvbnRhaW5lcixcblx0XHRcdFx0c2VsZWN0b3I6ICdjb2RlW2NsYXNzKj1cImxhbmd1YWdlLVwiXSwgW2NsYXNzKj1cImxhbmd1YWdlLVwiXSBjb2RlLCBjb2RlW2NsYXNzKj1cImxhbmctXCJdLCBbY2xhc3MqPVwibGFuZy1cIl0gY29kZSdcblx0XHRcdH07XG5cblx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaGlnaGxpZ2h0YWxsJywgZW52KTtcblxuXHRcdFx0ZW52LmVsZW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGVudi5jb250YWluZXIucXVlcnlTZWxlY3RvckFsbChlbnYuc2VsZWN0b3IpKTtcblxuXHRcdFx0Xy5ob29rcy5ydW4oJ2JlZm9yZS1hbGwtZWxlbWVudHMtaGlnaGxpZ2h0JywgZW52KTtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGVsZW1lbnQ7IChlbGVtZW50ID0gZW52LmVsZW1lbnRzW2krK10pOykge1xuXHRcdFx0XHRfLmhpZ2hsaWdodEVsZW1lbnQoZWxlbWVudCwgYXN5bmMgPT09IHRydWUsIGVudi5jYWxsYmFjayk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEhpZ2hsaWdodHMgdGhlIGNvZGUgaW5zaWRlIGEgc2luZ2xlIGVsZW1lbnQuXG5cdFx0ICpcblx0XHQgKiBUaGUgZm9sbG93aW5nIGhvb2tzIHdpbGwgYmUgcnVuOlxuXHRcdCAqIDEuIGBiZWZvcmUtc2FuaXR5LWNoZWNrYFxuXHRcdCAqIDIuIGBiZWZvcmUtaGlnaGxpZ2h0YFxuXHRcdCAqIDMuIEFsbCBob29rcyBvZiB7QGxpbmsgUHJpc20uaGlnaGxpZ2h0fS4gVGhlc2UgaG9va3Mgd2lsbCBiZSBydW4gYnkgYW4gYXN5bmNocm9ub3VzIHdvcmtlciBpZiBgYXN5bmNgIGlzIGB0cnVlYC5cblx0XHQgKiA0LiBgYmVmb3JlLWluc2VydGBcblx0XHQgKiA1LiBgYWZ0ZXItaGlnaGxpZ2h0YFxuXHRcdCAqIDYuIGBjb21wbGV0ZWBcblx0XHQgKlxuXHRcdCAqIFNvbWUgdGhlIGFib3ZlIGhvb2tzIHdpbGwgYmUgc2tpcHBlZCBpZiB0aGUgZWxlbWVudCBkb2Vzbid0IGNvbnRhaW4gYW55IHRleHQgb3IgdGhlcmUgaXMgbm8gZ3JhbW1hciBsb2FkZWQgZm9yXG5cdFx0ICogdGhlIGVsZW1lbnQncyBsYW5ndWFnZS5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCBjb250YWluaW5nIHRoZSBjb2RlLlxuXHRcdCAqIEl0IG11c3QgaGF2ZSBhIGNsYXNzIG9mIGBsYW5ndWFnZS14eHh4YCB0byBiZSBwcm9jZXNzZWQsIHdoZXJlIGB4eHh4YCBpcyBhIHZhbGlkIGxhbmd1YWdlIGlkZW50aWZpZXIuXG5cdFx0ICogQHBhcmFtIHtib29sZWFufSBbYXN5bmM9ZmFsc2VdIFdoZXRoZXIgdGhlIGVsZW1lbnQgaXMgdG8gYmUgaGlnaGxpZ2h0ZWQgYXN5bmNocm9ub3VzbHkgdXNpbmcgV2ViIFdvcmtlcnNcblx0XHQgKiB0byBpbXByb3ZlIHBlcmZvcm1hbmNlIGFuZCBhdm9pZCBibG9ja2luZyB0aGUgVUkgd2hlbiBoaWdobGlnaHRpbmcgdmVyeSBsYXJnZSBjaHVua3Mgb2YgY29kZS4gVGhpcyBvcHRpb24gaXNcblx0XHQgKiBbZGlzYWJsZWQgYnkgZGVmYXVsdF0oaHR0cHM6Ly9wcmlzbWpzLmNvbS9mYXEuaHRtbCN3aHktaXMtYXN5bmNocm9ub3VzLWhpZ2hsaWdodGluZy1kaXNhYmxlZC1ieS1kZWZhdWx0KS5cblx0XHQgKlxuXHRcdCAqIE5vdGU6IEFsbCBsYW5ndWFnZSBkZWZpbml0aW9ucyByZXF1aXJlZCB0byBoaWdobGlnaHQgdGhlIGNvZGUgbXVzdCBiZSBpbmNsdWRlZCBpbiB0aGUgbWFpbiBgcHJpc20uanNgIGZpbGUgZm9yXG5cdFx0ICogYXN5bmNocm9ub3VzIGhpZ2hsaWdodGluZyB0byB3b3JrLiBZb3UgY2FuIGJ1aWxkIHlvdXIgb3duIGJ1bmRsZSBvbiB0aGVcblx0XHQgKiBbRG93bmxvYWQgcGFnZV0oaHR0cHM6Ly9wcmlzbWpzLmNvbS9kb3dubG9hZC5odG1sKS5cblx0XHQgKiBAcGFyYW0ge0hpZ2hsaWdodENhbGxiYWNrfSBbY2FsbGJhY2tdIEFuIG9wdGlvbmFsIGNhbGxiYWNrIHRvIGJlIGludm9rZWQgYWZ0ZXIgdGhlIGhpZ2hsaWdodGluZyBpcyBkb25lLlxuXHRcdCAqIE1vc3RseSB1c2VmdWwgd2hlbiBgYXN5bmNgIGlzIGB0cnVlYCwgc2luY2UgaW4gdGhhdCBjYXNlLCB0aGUgaGlnaGxpZ2h0aW5nIGlzIGRvbmUgYXN5bmNocm9ub3VzbHkuXG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdGhpZ2hsaWdodEVsZW1lbnQ6IGZ1bmN0aW9uIChlbGVtZW50LCBhc3luYywgY2FsbGJhY2spIHtcblx0XHRcdC8vIEZpbmQgbGFuZ3VhZ2Vcblx0XHRcdHZhciBsYW5ndWFnZSA9IF8udXRpbC5nZXRMYW5ndWFnZShlbGVtZW50KTtcblx0XHRcdHZhciBncmFtbWFyID0gXy5sYW5ndWFnZXNbbGFuZ3VhZ2VdO1xuXG5cdFx0XHQvLyBTZXQgbGFuZ3VhZ2Ugb24gdGhlIGVsZW1lbnQsIGlmIG5vdCBwcmVzZW50XG5cdFx0XHRfLnV0aWwuc2V0TGFuZ3VhZ2UoZWxlbWVudCwgbGFuZ3VhZ2UpO1xuXG5cdFx0XHQvLyBTZXQgbGFuZ3VhZ2Ugb24gdGhlIHBhcmVudCwgZm9yIHN0eWxpbmdcblx0XHRcdHZhciBwYXJlbnQgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XG5cdFx0XHRpZiAocGFyZW50ICYmIHBhcmVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpID09PSAncHJlJykge1xuXHRcdFx0XHRfLnV0aWwuc2V0TGFuZ3VhZ2UocGFyZW50LCBsYW5ndWFnZSk7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBjb2RlID0gZWxlbWVudC50ZXh0Q29udGVudDtcblxuXHRcdFx0dmFyIGVudiA9IHtcblx0XHRcdFx0ZWxlbWVudDogZWxlbWVudCxcblx0XHRcdFx0bGFuZ3VhZ2U6IGxhbmd1YWdlLFxuXHRcdFx0XHRncmFtbWFyOiBncmFtbWFyLFxuXHRcdFx0XHRjb2RlOiBjb2RlXG5cdFx0XHR9O1xuXG5cdFx0XHRmdW5jdGlvbiBpbnNlcnRIaWdobGlnaHRlZENvZGUoaGlnaGxpZ2h0ZWRDb2RlKSB7XG5cdFx0XHRcdGVudi5oaWdobGlnaHRlZENvZGUgPSBoaWdobGlnaHRlZENvZGU7XG5cblx0XHRcdFx0Xy5ob29rcy5ydW4oJ2JlZm9yZS1pbnNlcnQnLCBlbnYpO1xuXG5cdFx0XHRcdGVudi5lbGVtZW50LmlubmVySFRNTCA9IGVudi5oaWdobGlnaHRlZENvZGU7XG5cblx0XHRcdFx0Xy5ob29rcy5ydW4oJ2FmdGVyLWhpZ2hsaWdodCcsIGVudik7XG5cdFx0XHRcdF8uaG9va3MucnVuKCdjb21wbGV0ZScsIGVudik7XG5cdFx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZW52LmVsZW1lbnQpO1xuXHRcdFx0fVxuXG5cdFx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLXNhbml0eS1jaGVjaycsIGVudik7XG5cblx0XHRcdC8vIHBsdWdpbnMgbWF5IGNoYW5nZS9hZGQgdGhlIHBhcmVudC9lbGVtZW50XG5cdFx0XHRwYXJlbnQgPSBlbnYuZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuXHRcdFx0aWYgKHBhcmVudCAmJiBwYXJlbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3ByZScgJiYgIXBhcmVudC5oYXNBdHRyaWJ1dGUoJ3RhYmluZGV4JykpIHtcblx0XHRcdFx0cGFyZW50LnNldEF0dHJpYnV0ZSgndGFiaW5kZXgnLCAnMCcpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIWVudi5jb2RlKSB7XG5cdFx0XHRcdF8uaG9va3MucnVuKCdjb21wbGV0ZScsIGVudik7XG5cdFx0XHRcdGNhbGxiYWNrICYmIGNhbGxiYWNrLmNhbGwoZW52LmVsZW1lbnQpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaGlnaGxpZ2h0JywgZW52KTtcblxuXHRcdFx0aWYgKCFlbnYuZ3JhbW1hcikge1xuXHRcdFx0XHRpbnNlcnRIaWdobGlnaHRlZENvZGUoXy51dGlsLmVuY29kZShlbnYuY29kZSkpO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGlmIChhc3luYyAmJiBfc2VsZi5Xb3JrZXIpIHtcblx0XHRcdFx0dmFyIHdvcmtlciA9IG5ldyBXb3JrZXIoXy5maWxlbmFtZSk7XG5cblx0XHRcdFx0d29ya2VyLm9ubWVzc2FnZSA9IGZ1bmN0aW9uIChldnQpIHtcblx0XHRcdFx0XHRpbnNlcnRIaWdobGlnaHRlZENvZGUoZXZ0LmRhdGEpO1xuXHRcdFx0XHR9O1xuXG5cdFx0XHRcdHdvcmtlci5wb3N0TWVzc2FnZShKU09OLnN0cmluZ2lmeSh7XG5cdFx0XHRcdFx0bGFuZ3VhZ2U6IGVudi5sYW5ndWFnZSxcblx0XHRcdFx0XHRjb2RlOiBlbnYuY29kZSxcblx0XHRcdFx0XHRpbW1lZGlhdGVDbG9zZTogdHJ1ZVxuXHRcdFx0XHR9KSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpbnNlcnRIaWdobGlnaHRlZENvZGUoXy5oaWdobGlnaHQoZW52LmNvZGUsIGVudi5ncmFtbWFyLCBlbnYubGFuZ3VhZ2UpKTtcblx0XHRcdH1cblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogTG93LWxldmVsIGZ1bmN0aW9uLCBvbmx5IHVzZSBpZiB5b3Uga25vdyB3aGF0IHlvdeKAmXJlIGRvaW5nLiBJdCBhY2NlcHRzIGEgc3RyaW5nIG9mIHRleHQgYXMgaW5wdXRcblx0XHQgKiBhbmQgdGhlIGxhbmd1YWdlIGRlZmluaXRpb25zIHRvIHVzZSwgYW5kIHJldHVybnMgYSBzdHJpbmcgd2l0aCB0aGUgSFRNTCBwcm9kdWNlZC5cblx0XHQgKlxuXHRcdCAqIFRoZSBmb2xsb3dpbmcgaG9va3Mgd2lsbCBiZSBydW46XG5cdFx0ICogMS4gYGJlZm9yZS10b2tlbml6ZWBcblx0XHQgKiAyLiBgYWZ0ZXItdG9rZW5pemVgXG5cdFx0ICogMy4gYHdyYXBgOiBPbiBlYWNoIHtAbGluayBUb2tlbn0uXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCBBIHN0cmluZyB3aXRoIHRoZSBjb2RlIHRvIGJlIGhpZ2hsaWdodGVkLlxuXHRcdCAqIEBwYXJhbSB7R3JhbW1hcn0gZ3JhbW1hciBBbiBvYmplY3QgY29udGFpbmluZyB0aGUgdG9rZW5zIHRvIHVzZS5cblx0XHQgKlxuXHRcdCAqIFVzdWFsbHkgYSBsYW5ndWFnZSBkZWZpbml0aW9uIGxpa2UgYFByaXNtLmxhbmd1YWdlcy5tYXJrdXBgLlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBsYW5ndWFnZSBUaGUgbmFtZSBvZiB0aGUgbGFuZ3VhZ2UgZGVmaW5pdGlvbiBwYXNzZWQgdG8gYGdyYW1tYXJgLlxuXHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBoaWdobGlnaHRlZCBIVE1MLlxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIFByaXNtLmhpZ2hsaWdodCgndmFyIGZvbyA9IHRydWU7JywgUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQsICdqYXZhc2NyaXB0Jyk7XG5cdFx0ICovXG5cdFx0aGlnaGxpZ2h0OiBmdW5jdGlvbiAodGV4dCwgZ3JhbW1hciwgbGFuZ3VhZ2UpIHtcblx0XHRcdHZhciBlbnYgPSB7XG5cdFx0XHRcdGNvZGU6IHRleHQsXG5cdFx0XHRcdGdyYW1tYXI6IGdyYW1tYXIsXG5cdFx0XHRcdGxhbmd1YWdlOiBsYW5ndWFnZVxuXHRcdFx0fTtcblx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtdG9rZW5pemUnLCBlbnYpO1xuXHRcdFx0aWYgKCFlbnYuZ3JhbW1hcikge1xuXHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ1RoZSBsYW5ndWFnZSBcIicgKyBlbnYubGFuZ3VhZ2UgKyAnXCIgaGFzIG5vIGdyYW1tYXIuJyk7XG5cdFx0XHR9XG5cdFx0XHRlbnYudG9rZW5zID0gXy50b2tlbml6ZShlbnYuY29kZSwgZW52LmdyYW1tYXIpO1xuXHRcdFx0Xy5ob29rcy5ydW4oJ2FmdGVyLXRva2VuaXplJywgZW52KTtcblx0XHRcdHJldHVybiBUb2tlbi5zdHJpbmdpZnkoXy51dGlsLmVuY29kZShlbnYudG9rZW5zKSwgZW52Lmxhbmd1YWdlKTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogVGhpcyBpcyB0aGUgaGVhcnQgb2YgUHJpc20sIGFuZCB0aGUgbW9zdCBsb3ctbGV2ZWwgZnVuY3Rpb24geW91IGNhbiB1c2UuIEl0IGFjY2VwdHMgYSBzdHJpbmcgb2YgdGV4dCBhcyBpbnB1dFxuXHRcdCAqIGFuZCB0aGUgbGFuZ3VhZ2UgZGVmaW5pdGlvbnMgdG8gdXNlLCBhbmQgcmV0dXJucyBhbiBhcnJheSB3aXRoIHRoZSB0b2tlbml6ZWQgY29kZS5cblx0XHQgKlxuXHRcdCAqIFdoZW4gdGhlIGxhbmd1YWdlIGRlZmluaXRpb24gaW5jbHVkZXMgbmVzdGVkIHRva2VucywgdGhlIGZ1bmN0aW9uIGlzIGNhbGxlZCByZWN1cnNpdmVseSBvbiBlYWNoIG9mIHRoZXNlIHRva2Vucy5cblx0XHQgKlxuXHRcdCAqIFRoaXMgbWV0aG9kIGNvdWxkIGJlIHVzZWZ1bCBpbiBvdGhlciBjb250ZXh0cyBhcyB3ZWxsLCBhcyBhIHZlcnkgY3J1ZGUgcGFyc2VyLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQgQSBzdHJpbmcgd2l0aCB0aGUgY29kZSB0byBiZSBoaWdobGlnaHRlZC5cblx0XHQgKiBAcGFyYW0ge0dyYW1tYXJ9IGdyYW1tYXIgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHRva2VucyB0byB1c2UuXG5cdFx0ICpcblx0XHQgKiBVc3VhbGx5IGEgbGFuZ3VhZ2UgZGVmaW5pdGlvbiBsaWtlIGBQcmlzbS5sYW5ndWFnZXMubWFya3VwYC5cblx0XHQgKiBAcmV0dXJucyB7VG9rZW5TdHJlYW19IEFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIHRva2VucywgYSB0b2tlbiBzdHJlYW0uXG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqIEBleGFtcGxlXG5cdFx0ICogbGV0IGNvZGUgPSBgdmFyIGZvbyA9IDA7YDtcblx0XHQgKiBsZXQgdG9rZW5zID0gUHJpc20udG9rZW5pemUoY29kZSwgUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQpO1xuXHRcdCAqIHRva2Vucy5mb3JFYWNoKHRva2VuID0+IHtcblx0XHQgKiAgICAgaWYgKHRva2VuIGluc3RhbmNlb2YgUHJpc20uVG9rZW4gJiYgdG9rZW4udHlwZSA9PT0gJ251bWJlcicpIHtcblx0XHQgKiAgICAgICAgIGNvbnNvbGUubG9nKGBGb3VuZCBudW1lcmljIGxpdGVyYWw6ICR7dG9rZW4uY29udGVudH1gKTtcblx0XHQgKiAgICAgfVxuXHRcdCAqIH0pO1xuXHRcdCAqL1xuXHRcdHRva2VuaXplOiBmdW5jdGlvbiAodGV4dCwgZ3JhbW1hcikge1xuXHRcdFx0dmFyIHJlc3QgPSBncmFtbWFyLnJlc3Q7XG5cdFx0XHRpZiAocmVzdCkge1xuXHRcdFx0XHRmb3IgKHZhciB0b2tlbiBpbiByZXN0KSB7XG5cdFx0XHRcdFx0Z3JhbW1hclt0b2tlbl0gPSByZXN0W3Rva2VuXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGRlbGV0ZSBncmFtbWFyLnJlc3Q7XG5cdFx0XHR9XG5cblx0XHRcdHZhciB0b2tlbkxpc3QgPSBuZXcgTGlua2VkTGlzdCgpO1xuXHRcdFx0YWRkQWZ0ZXIodG9rZW5MaXN0LCB0b2tlbkxpc3QuaGVhZCwgdGV4dCk7XG5cblx0XHRcdG1hdGNoR3JhbW1hcih0ZXh0LCB0b2tlbkxpc3QsIGdyYW1tYXIsIHRva2VuTGlzdC5oZWFkLCAwKTtcblxuXHRcdFx0cmV0dXJuIHRvQXJyYXkodG9rZW5MaXN0KTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogQG5hbWVzcGFjZVxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHRob29rczoge1xuXHRcdFx0YWxsOiB7fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBBZGRzIHRoZSBnaXZlbiBjYWxsYmFjayB0byB0aGUgbGlzdCBvZiBjYWxsYmFja3MgZm9yIHRoZSBnaXZlbiBob29rLlxuXHRcdFx0ICpcblx0XHRcdCAqIFRoZSBjYWxsYmFjayB3aWxsIGJlIGludm9rZWQgd2hlbiB0aGUgaG9vayBpdCBpcyByZWdpc3RlcmVkIGZvciBpcyBydW4uXG5cdFx0XHQgKiBIb29rcyBhcmUgdXN1YWxseSBkaXJlY3RseSBydW4gYnkgYSBoaWdobGlnaHQgZnVuY3Rpb24gYnV0IHlvdSBjYW4gYWxzbyBydW4gaG9va3MgeW91cnNlbGYuXG5cdFx0XHQgKlxuXHRcdFx0ICogT25lIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbiBiZSByZWdpc3RlcmVkIHRvIG11bHRpcGxlIGhvb2tzIGFuZCB0aGUgc2FtZSBob29rIG11bHRpcGxlIHRpbWVzLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBob29rLlxuXHRcdFx0ICogQHBhcmFtIHtIb29rQ2FsbGJhY2t9IGNhbGxiYWNrIFRoZSBjYWxsYmFjayBmdW5jdGlvbiB3aGljaCBpcyBnaXZlbiBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG5cdFx0XHQgKiBAcHVibGljXG5cdFx0XHQgKi9cblx0XHRcdGFkZDogZnVuY3Rpb24gKG5hbWUsIGNhbGxiYWNrKSB7XG5cdFx0XHRcdHZhciBob29rcyA9IF8uaG9va3MuYWxsO1xuXG5cdFx0XHRcdGhvb2tzW25hbWVdID0gaG9va3NbbmFtZV0gfHwgW107XG5cblx0XHRcdFx0aG9va3NbbmFtZV0ucHVzaChjYWxsYmFjayk7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJ1bnMgYSBob29rIGludm9raW5nIGFsbCByZWdpc3RlcmVkIGNhbGxiYWNrcyB3aXRoIHRoZSBnaXZlbiBlbnZpcm9ubWVudCB2YXJpYWJsZXMuXG5cdFx0XHQgKlxuXHRcdFx0ICogQ2FsbGJhY2tzIHdpbGwgYmUgaW52b2tlZCBzeW5jaHJvbm91c2x5IGFuZCBpbiB0aGUgb3JkZXIgaW4gd2hpY2ggdGhleSB3ZXJlIHJlZ2lzdGVyZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IG5hbWUgVGhlIG5hbWUgb2YgdGhlIGhvb2suXG5cdFx0XHQgKiBAcGFyYW0ge09iamVjdDxzdHJpbmcsIGFueT59IGVudiBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIG9mIHRoZSBob29rIHBhc3NlZCB0byBhbGwgY2FsbGJhY2tzIHJlZ2lzdGVyZWQuXG5cdFx0XHQgKiBAcHVibGljXG5cdFx0XHQgKi9cblx0XHRcdHJ1bjogZnVuY3Rpb24gKG5hbWUsIGVudikge1xuXHRcdFx0XHR2YXIgY2FsbGJhY2tzID0gXy5ob29rcy5hbGxbbmFtZV07XG5cblx0XHRcdFx0aWYgKCFjYWxsYmFja3MgfHwgIWNhbGxiYWNrcy5sZW5ndGgpIHtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRmb3IgKHZhciBpID0gMCwgY2FsbGJhY2s7IChjYWxsYmFjayA9IGNhbGxiYWNrc1tpKytdKTspIHtcblx0XHRcdFx0XHRjYWxsYmFjayhlbnYpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdFRva2VuOiBUb2tlblxuXHR9O1xuXHRfc2VsZi5QcmlzbSA9IF87XG5cblxuXHQvLyBUeXBlc2NyaXB0IG5vdGU6XG5cdC8vIFRoZSBmb2xsb3dpbmcgY2FuIGJlIHVzZWQgdG8gaW1wb3J0IHRoZSBUb2tlbiB0eXBlIGluIEpTRG9jOlxuXHQvL1xuXHQvLyAgIEB0eXBlZGVmIHtJbnN0YW5jZVR5cGU8aW1wb3J0KFwiLi9wcmlzbS1jb3JlXCIpW1wiVG9rZW5cIl0+fSBUb2tlblxuXG5cdC8qKlxuXHQgKiBDcmVhdGVzIGEgbmV3IHRva2VuLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSBTZWUge0BsaW5rIFRva2VuI3R5cGUgdHlwZX1cblx0ICogQHBhcmFtIHtzdHJpbmcgfCBUb2tlblN0cmVhbX0gY29udGVudCBTZWUge0BsaW5rIFRva2VuI2NvbnRlbnQgY29udGVudH1cblx0ICogQHBhcmFtIHtzdHJpbmd8c3RyaW5nW119IFthbGlhc10gVGhlIGFsaWFzKGVzKSBvZiB0aGUgdG9rZW4uXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBbbWF0Y2hlZFN0cj1cIlwiXSBBIGNvcHkgb2YgdGhlIGZ1bGwgc3RyaW5nIHRoaXMgdG9rZW4gd2FzIGNyZWF0ZWQgZnJvbS5cblx0ICogQGNsYXNzXG5cdCAqIEBnbG9iYWxcblx0ICogQHB1YmxpY1xuXHQgKi9cblx0ZnVuY3Rpb24gVG9rZW4odHlwZSwgY29udGVudCwgYWxpYXMsIG1hdGNoZWRTdHIpIHtcblx0XHQvKipcblx0XHQgKiBUaGUgdHlwZSBvZiB0aGUgdG9rZW4uXG5cdFx0ICpcblx0XHQgKiBUaGlzIGlzIHVzdWFsbHkgdGhlIGtleSBvZiBhIHBhdHRlcm4gaW4gYSB7QGxpbmsgR3JhbW1hcn0uXG5cdFx0ICpcblx0XHQgKiBAdHlwZSB7c3RyaW5nfVxuXHRcdCAqIEBzZWUgR3JhbW1hclRva2VuXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdHRoaXMudHlwZSA9IHR5cGU7XG5cdFx0LyoqXG5cdFx0ICogVGhlIHN0cmluZ3Mgb3IgdG9rZW5zIGNvbnRhaW5lZCBieSB0aGlzIHRva2VuLlxuXHRcdCAqXG5cdFx0ICogVGhpcyB3aWxsIGJlIGEgdG9rZW4gc3RyZWFtIGlmIHRoZSBwYXR0ZXJuIG1hdGNoZWQgYWxzbyBkZWZpbmVkIGFuIGBpbnNpZGVgIGdyYW1tYXIuXG5cdFx0ICpcblx0XHQgKiBAdHlwZSB7c3RyaW5nIHwgVG9rZW5TdHJlYW19XG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdHRoaXMuY29udGVudCA9IGNvbnRlbnQ7XG5cdFx0LyoqXG5cdFx0ICogVGhlIGFsaWFzKGVzKSBvZiB0aGUgdG9rZW4uXG5cdFx0ICpcblx0XHQgKiBAdHlwZSB7c3RyaW5nfHN0cmluZ1tdfVxuXHRcdCAqIEBzZWUgR3JhbW1hclRva2VuXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdHRoaXMuYWxpYXMgPSBhbGlhcztcblx0XHQvLyBDb3B5IG9mIHRoZSBmdWxsIHN0cmluZyB0aGlzIHRva2VuIHdhcyBjcmVhdGVkIGZyb21cblx0XHR0aGlzLmxlbmd0aCA9IChtYXRjaGVkU3RyIHx8ICcnKS5sZW5ndGggfCAwO1xuXHR9XG5cblx0LyoqXG5cdCAqIEEgdG9rZW4gc3RyZWFtIGlzIGFuIGFycmF5IG9mIHN0cmluZ3MgYW5kIHtAbGluayBUb2tlbiBUb2tlbn0gb2JqZWN0cy5cblx0ICpcblx0ICogVG9rZW4gc3RyZWFtcyBoYXZlIHRvIGZ1bGZpbGwgYSBmZXcgcHJvcGVydGllcyB0aGF0IGFyZSBhc3N1bWVkIGJ5IG1vc3QgZnVuY3Rpb25zIChtb3N0bHkgaW50ZXJuYWwgb25lcykgdGhhdCBwcm9jZXNzXG5cdCAqIHRoZW0uXG5cdCAqXG5cdCAqIDEuIE5vIGFkamFjZW50IHN0cmluZ3MuXG5cdCAqIDIuIE5vIGVtcHR5IHN0cmluZ3MuXG5cdCAqXG5cdCAqICAgIFRoZSBvbmx5IGV4Y2VwdGlvbiBoZXJlIGlzIHRoZSB0b2tlbiBzdHJlYW0gdGhhdCBvbmx5IGNvbnRhaW5zIHRoZSBlbXB0eSBzdHJpbmcgYW5kIG5vdGhpbmcgZWxzZS5cblx0ICpcblx0ICogQHR5cGVkZWYge0FycmF5PHN0cmluZyB8IFRva2VuPn0gVG9rZW5TdHJlYW1cblx0ICogQGdsb2JhbFxuXHQgKiBAcHVibGljXG5cdCAqL1xuXG5cdC8qKlxuXHQgKiBDb252ZXJ0cyB0aGUgZ2l2ZW4gdG9rZW4gb3IgdG9rZW4gc3RyZWFtIHRvIGFuIEhUTUwgcmVwcmVzZW50YXRpb24uXG5cdCAqXG5cdCAqIFRoZSBmb2xsb3dpbmcgaG9va3Mgd2lsbCBiZSBydW46XG5cdCAqIDEuIGB3cmFwYDogT24gZWFjaCB7QGxpbmsgVG9rZW59LlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZyB8IFRva2VuIHwgVG9rZW5TdHJlYW19IG8gVGhlIHRva2VuIG9yIHRva2VuIHN0cmVhbSB0byBiZSBjb252ZXJ0ZWQuXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBsYW5ndWFnZSBUaGUgbmFtZSBvZiBjdXJyZW50IGxhbmd1YWdlLlxuXHQgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCByZXByZXNlbnRhdGlvbiBvZiB0aGUgdG9rZW4gb3IgdG9rZW4gc3RyZWFtLlxuXHQgKiBAbWVtYmVyb2YgVG9rZW5cblx0ICogQHN0YXRpY1xuXHQgKi9cblx0VG9rZW4uc3RyaW5naWZ5ID0gZnVuY3Rpb24gc3RyaW5naWZ5KG8sIGxhbmd1YWdlKSB7XG5cdFx0aWYgKHR5cGVvZiBvID09ICdzdHJpbmcnKSB7XG5cdFx0XHRyZXR1cm4gbztcblx0XHR9XG5cdFx0aWYgKEFycmF5LmlzQXJyYXkobykpIHtcblx0XHRcdHZhciBzID0gJyc7XG5cdFx0XHRvLmZvckVhY2goZnVuY3Rpb24gKGUpIHtcblx0XHRcdFx0cyArPSBzdHJpbmdpZnkoZSwgbGFuZ3VhZ2UpO1xuXHRcdFx0fSk7XG5cdFx0XHRyZXR1cm4gcztcblx0XHR9XG5cblx0XHR2YXIgZW52ID0ge1xuXHRcdFx0dHlwZTogby50eXBlLFxuXHRcdFx0Y29udGVudDogc3RyaW5naWZ5KG8uY29udGVudCwgbGFuZ3VhZ2UpLFxuXHRcdFx0dGFnOiAnc3BhbicsXG5cdFx0XHRjbGFzc2VzOiBbJ3Rva2VuJywgby50eXBlXSxcblx0XHRcdGF0dHJpYnV0ZXM6IHt9LFxuXHRcdFx0bGFuZ3VhZ2U6IGxhbmd1YWdlXG5cdFx0fTtcblxuXHRcdHZhciBhbGlhc2VzID0gby5hbGlhcztcblx0XHRpZiAoYWxpYXNlcykge1xuXHRcdFx0aWYgKEFycmF5LmlzQXJyYXkoYWxpYXNlcykpIHtcblx0XHRcdFx0QXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZW52LmNsYXNzZXMsIGFsaWFzZXMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZW52LmNsYXNzZXMucHVzaChhbGlhc2VzKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRfLmhvb2tzLnJ1bignd3JhcCcsIGVudik7XG5cblx0XHR2YXIgYXR0cmlidXRlcyA9ICcnO1xuXHRcdGZvciAodmFyIG5hbWUgaW4gZW52LmF0dHJpYnV0ZXMpIHtcblx0XHRcdGF0dHJpYnV0ZXMgKz0gJyAnICsgbmFtZSArICc9XCInICsgKGVudi5hdHRyaWJ1dGVzW25hbWVdIHx8ICcnKS5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JykgKyAnXCInO1xuXHRcdH1cblxuXHRcdHJldHVybiAnPCcgKyBlbnYudGFnICsgJyBjbGFzcz1cIicgKyBlbnYuY2xhc3Nlcy5qb2luKCcgJykgKyAnXCInICsgYXR0cmlidXRlcyArICc+JyArIGVudi5jb250ZW50ICsgJzwvJyArIGVudi50YWcgKyAnPic7XG5cdH07XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7UmVnRXhwfSBwYXR0ZXJuXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBwb3Ncblx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHRcblx0ICogQHBhcmFtIHtib29sZWFufSBsb29rYmVoaW5kXG5cdCAqIEByZXR1cm5zIHtSZWdFeHBFeGVjQXJyYXkgfCBudWxsfVxuXHQgKi9cblx0ZnVuY3Rpb24gbWF0Y2hQYXR0ZXJuKHBhdHRlcm4sIHBvcywgdGV4dCwgbG9va2JlaGluZCkge1xuXHRcdHBhdHRlcm4ubGFzdEluZGV4ID0gcG9zO1xuXHRcdHZhciBtYXRjaCA9IHBhdHRlcm4uZXhlYyh0ZXh0KTtcblx0XHRpZiAobWF0Y2ggJiYgbG9va2JlaGluZCAmJiBtYXRjaFsxXSkge1xuXHRcdFx0Ly8gY2hhbmdlIHRoZSBtYXRjaCB0byByZW1vdmUgdGhlIHRleHQgbWF0Y2hlZCBieSB0aGUgUHJpc20gbG9va2JlaGluZCBncm91cFxuXHRcdFx0dmFyIGxvb2tiZWhpbmRMZW5ndGggPSBtYXRjaFsxXS5sZW5ndGg7XG5cdFx0XHRtYXRjaC5pbmRleCArPSBsb29rYmVoaW5kTGVuZ3RoO1xuXHRcdFx0bWF0Y2hbMF0gPSBtYXRjaFswXS5zbGljZShsb29rYmVoaW5kTGVuZ3RoKTtcblx0XHR9XG5cdFx0cmV0dXJuIG1hdGNoO1xuXHR9XG5cblx0LyoqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG5cdCAqIEBwYXJhbSB7TGlua2VkTGlzdDxzdHJpbmcgfCBUb2tlbj59IHRva2VuTGlzdFxuXHQgKiBAcGFyYW0ge2FueX0gZ3JhbW1hclxuXHQgKiBAcGFyYW0ge0xpbmtlZExpc3ROb2RlPHN0cmluZyB8IFRva2VuPn0gc3RhcnROb2RlXG5cdCAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydFBvc1xuXHQgKiBAcGFyYW0ge1JlbWF0Y2hPcHRpb25zfSBbcmVtYXRjaF1cblx0ICogQHJldHVybnMge3ZvaWR9XG5cdCAqIEBwcml2YXRlXG5cdCAqXG5cdCAqIEB0eXBlZGVmIFJlbWF0Y2hPcHRpb25zXG5cdCAqIEBwcm9wZXJ0eSB7c3RyaW5nfSBjYXVzZVxuXHQgKiBAcHJvcGVydHkge251bWJlcn0gcmVhY2hcblx0ICovXG5cdGZ1bmN0aW9uIG1hdGNoR3JhbW1hcih0ZXh0LCB0b2tlbkxpc3QsIGdyYW1tYXIsIHN0YXJ0Tm9kZSwgc3RhcnRQb3MsIHJlbWF0Y2gpIHtcblx0XHRmb3IgKHZhciB0b2tlbiBpbiBncmFtbWFyKSB7XG5cdFx0XHRpZiAoIWdyYW1tYXIuaGFzT3duUHJvcGVydHkodG9rZW4pIHx8ICFncmFtbWFyW3Rva2VuXSkge1xuXHRcdFx0XHRjb250aW51ZTtcblx0XHRcdH1cblxuXHRcdFx0dmFyIHBhdHRlcm5zID0gZ3JhbW1hclt0b2tlbl07XG5cdFx0XHRwYXR0ZXJucyA9IEFycmF5LmlzQXJyYXkocGF0dGVybnMpID8gcGF0dGVybnMgOiBbcGF0dGVybnNdO1xuXG5cdFx0XHRmb3IgKHZhciBqID0gMDsgaiA8IHBhdHRlcm5zLmxlbmd0aDsgKytqKSB7XG5cdFx0XHRcdGlmIChyZW1hdGNoICYmIHJlbWF0Y2guY2F1c2UgPT0gdG9rZW4gKyAnLCcgKyBqKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHBhdHRlcm5PYmogPSBwYXR0ZXJuc1tqXTtcblx0XHRcdFx0dmFyIGluc2lkZSA9IHBhdHRlcm5PYmouaW5zaWRlO1xuXHRcdFx0XHR2YXIgbG9va2JlaGluZCA9ICEhcGF0dGVybk9iai5sb29rYmVoaW5kO1xuXHRcdFx0XHR2YXIgZ3JlZWR5ID0gISFwYXR0ZXJuT2JqLmdyZWVkeTtcblx0XHRcdFx0dmFyIGFsaWFzID0gcGF0dGVybk9iai5hbGlhcztcblxuXHRcdFx0XHRpZiAoZ3JlZWR5ICYmICFwYXR0ZXJuT2JqLnBhdHRlcm4uZ2xvYmFsKSB7XG5cdFx0XHRcdFx0Ly8gV2l0aG91dCB0aGUgZ2xvYmFsIGZsYWcsIGxhc3RJbmRleCB3b24ndCB3b3JrXG5cdFx0XHRcdFx0dmFyIGZsYWdzID0gcGF0dGVybk9iai5wYXR0ZXJuLnRvU3RyaW5nKCkubWF0Y2goL1tpbXN1eV0qJC8pWzBdO1xuXHRcdFx0XHRcdHBhdHRlcm5PYmoucGF0dGVybiA9IFJlZ0V4cChwYXR0ZXJuT2JqLnBhdHRlcm4uc291cmNlLCBmbGFncyArICdnJyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHQvKiogQHR5cGUge1JlZ0V4cH0gKi9cblx0XHRcdFx0dmFyIHBhdHRlcm4gPSBwYXR0ZXJuT2JqLnBhdHRlcm4gfHwgcGF0dGVybk9iajtcblxuXHRcdFx0XHRmb3IgKCAvLyBpdGVyYXRlIHRoZSB0b2tlbiBsaXN0IGFuZCBrZWVwIHRyYWNrIG9mIHRoZSBjdXJyZW50IHRva2VuL3N0cmluZyBwb3NpdGlvblxuXHRcdFx0XHRcdHZhciBjdXJyZW50Tm9kZSA9IHN0YXJ0Tm9kZS5uZXh0LCBwb3MgPSBzdGFydFBvcztcblx0XHRcdFx0XHRjdXJyZW50Tm9kZSAhPT0gdG9rZW5MaXN0LnRhaWw7XG5cdFx0XHRcdFx0cG9zICs9IGN1cnJlbnROb2RlLnZhbHVlLmxlbmd0aCwgY3VycmVudE5vZGUgPSBjdXJyZW50Tm9kZS5uZXh0XG5cdFx0XHRcdCkge1xuXG5cdFx0XHRcdFx0aWYgKHJlbWF0Y2ggJiYgcG9zID49IHJlbWF0Y2gucmVhY2gpIHtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHZhciBzdHIgPSBjdXJyZW50Tm9kZS52YWx1ZTtcblxuXHRcdFx0XHRcdGlmICh0b2tlbkxpc3QubGVuZ3RoID4gdGV4dC5sZW5ndGgpIHtcblx0XHRcdFx0XHRcdC8vIFNvbWV0aGluZyB3ZW50IHRlcnJpYmx5IHdyb25nLCBBQk9SVCwgQUJPUlQhXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKHN0ciBpbnN0YW5jZW9mIFRva2VuKSB7XG5cdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR2YXIgcmVtb3ZlQ291bnQgPSAxOyAvLyB0aGlzIGlzIHRoZSB0byBwYXJhbWV0ZXIgb2YgcmVtb3ZlQmV0d2VlblxuXHRcdFx0XHRcdHZhciBtYXRjaDtcblxuXHRcdFx0XHRcdGlmIChncmVlZHkpIHtcblx0XHRcdFx0XHRcdG1hdGNoID0gbWF0Y2hQYXR0ZXJuKHBhdHRlcm4sIHBvcywgdGV4dCwgbG9va2JlaGluZCk7XG5cdFx0XHRcdFx0XHRpZiAoIW1hdGNoIHx8IG1hdGNoLmluZGV4ID49IHRleHQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR2YXIgZnJvbSA9IG1hdGNoLmluZGV4O1xuXHRcdFx0XHRcdFx0dmFyIHRvID0gbWF0Y2guaW5kZXggKyBtYXRjaFswXS5sZW5ndGg7XG5cdFx0XHRcdFx0XHR2YXIgcCA9IHBvcztcblxuXHRcdFx0XHRcdFx0Ly8gZmluZCB0aGUgbm9kZSB0aGF0IGNvbnRhaW5zIHRoZSBtYXRjaFxuXHRcdFx0XHRcdFx0cCArPSBjdXJyZW50Tm9kZS52YWx1ZS5sZW5ndGg7XG5cdFx0XHRcdFx0XHR3aGlsZSAoZnJvbSA+PSBwKSB7XG5cdFx0XHRcdFx0XHRcdGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUubmV4dDtcblx0XHRcdFx0XHRcdFx0cCArPSBjdXJyZW50Tm9kZS52YWx1ZS5sZW5ndGg7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQvLyBhZGp1c3QgcG9zIChhbmQgcClcblx0XHRcdFx0XHRcdHAgLT0gY3VycmVudE5vZGUudmFsdWUubGVuZ3RoO1xuXHRcdFx0XHRcdFx0cG9zID0gcDtcblxuXHRcdFx0XHRcdFx0Ly8gdGhlIGN1cnJlbnQgbm9kZSBpcyBhIFRva2VuLCB0aGVuIHRoZSBtYXRjaCBzdGFydHMgaW5zaWRlIGFub3RoZXIgVG9rZW4sIHdoaWNoIGlzIGludmFsaWRcblx0XHRcdFx0XHRcdGlmIChjdXJyZW50Tm9kZS52YWx1ZSBpbnN0YW5jZW9mIFRva2VuKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBmaW5kIHRoZSBsYXN0IG5vZGUgd2hpY2ggaXMgYWZmZWN0ZWQgYnkgdGhpcyBtYXRjaFxuXHRcdFx0XHRcdFx0Zm9yIChcblx0XHRcdFx0XHRcdFx0dmFyIGsgPSBjdXJyZW50Tm9kZTtcblx0XHRcdFx0XHRcdFx0ayAhPT0gdG9rZW5MaXN0LnRhaWwgJiYgKHAgPCB0byB8fCB0eXBlb2Ygay52YWx1ZSA9PT0gJ3N0cmluZycpO1xuXHRcdFx0XHRcdFx0XHRrID0gay5uZXh0XG5cdFx0XHRcdFx0XHQpIHtcblx0XHRcdFx0XHRcdFx0cmVtb3ZlQ291bnQrKztcblx0XHRcdFx0XHRcdFx0cCArPSBrLnZhbHVlLmxlbmd0aDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJlbW92ZUNvdW50LS07XG5cblx0XHRcdFx0XHRcdC8vIHJlcGxhY2Ugd2l0aCB0aGUgbmV3IG1hdGNoXG5cdFx0XHRcdFx0XHRzdHIgPSB0ZXh0LnNsaWNlKHBvcywgcCk7XG5cdFx0XHRcdFx0XHRtYXRjaC5pbmRleCAtPSBwb3M7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdG1hdGNoID0gbWF0Y2hQYXR0ZXJuKHBhdHRlcm4sIDAsIHN0ciwgbG9va2JlaGluZCk7XG5cdFx0XHRcdFx0XHRpZiAoIW1hdGNoKSB7XG5cdFx0XHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1yZWRlY2xhcmVcblx0XHRcdFx0XHR2YXIgZnJvbSA9IG1hdGNoLmluZGV4O1xuXHRcdFx0XHRcdHZhciBtYXRjaFN0ciA9IG1hdGNoWzBdO1xuXHRcdFx0XHRcdHZhciBiZWZvcmUgPSBzdHIuc2xpY2UoMCwgZnJvbSk7XG5cdFx0XHRcdFx0dmFyIGFmdGVyID0gc3RyLnNsaWNlKGZyb20gKyBtYXRjaFN0ci5sZW5ndGgpO1xuXG5cdFx0XHRcdFx0dmFyIHJlYWNoID0gcG9zICsgc3RyLmxlbmd0aDtcblx0XHRcdFx0XHRpZiAocmVtYXRjaCAmJiByZWFjaCA+IHJlbWF0Y2gucmVhY2gpIHtcblx0XHRcdFx0XHRcdHJlbWF0Y2gucmVhY2ggPSByZWFjaDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR2YXIgcmVtb3ZlRnJvbSA9IGN1cnJlbnROb2RlLnByZXY7XG5cblx0XHRcdFx0XHRpZiAoYmVmb3JlKSB7XG5cdFx0XHRcdFx0XHRyZW1vdmVGcm9tID0gYWRkQWZ0ZXIodG9rZW5MaXN0LCByZW1vdmVGcm9tLCBiZWZvcmUpO1xuXHRcdFx0XHRcdFx0cG9zICs9IGJlZm9yZS5sZW5ndGg7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0cmVtb3ZlUmFuZ2UodG9rZW5MaXN0LCByZW1vdmVGcm9tLCByZW1vdmVDb3VudCk7XG5cblx0XHRcdFx0XHR2YXIgd3JhcHBlZCA9IG5ldyBUb2tlbih0b2tlbiwgaW5zaWRlID8gXy50b2tlbml6ZShtYXRjaFN0ciwgaW5zaWRlKSA6IG1hdGNoU3RyLCBhbGlhcywgbWF0Y2hTdHIpO1xuXHRcdFx0XHRcdGN1cnJlbnROb2RlID0gYWRkQWZ0ZXIodG9rZW5MaXN0LCByZW1vdmVGcm9tLCB3cmFwcGVkKTtcblxuXHRcdFx0XHRcdGlmIChhZnRlcikge1xuXHRcdFx0XHRcdFx0YWRkQWZ0ZXIodG9rZW5MaXN0LCBjdXJyZW50Tm9kZSwgYWZ0ZXIpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChyZW1vdmVDb3VudCA+IDEpIHtcblx0XHRcdFx0XHRcdC8vIGF0IGxlYXN0IG9uZSBUb2tlbiBvYmplY3Qgd2FzIHJlbW92ZWQsIHNvIHdlIGhhdmUgdG8gZG8gc29tZSByZW1hdGNoaW5nXG5cdFx0XHRcdFx0XHQvLyB0aGlzIGNhbiBvbmx5IGhhcHBlbiBpZiB0aGUgY3VycmVudCBwYXR0ZXJuIGlzIGdyZWVkeVxuXG5cdFx0XHRcdFx0XHQvKiogQHR5cGUge1JlbWF0Y2hPcHRpb25zfSAqL1xuXHRcdFx0XHRcdFx0dmFyIG5lc3RlZFJlbWF0Y2ggPSB7XG5cdFx0XHRcdFx0XHRcdGNhdXNlOiB0b2tlbiArICcsJyArIGosXG5cdFx0XHRcdFx0XHRcdHJlYWNoOiByZWFjaFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdG1hdGNoR3JhbW1hcih0ZXh0LCB0b2tlbkxpc3QsIGdyYW1tYXIsIGN1cnJlbnROb2RlLnByZXYsIHBvcywgbmVzdGVkUmVtYXRjaCk7XG5cblx0XHRcdFx0XHRcdC8vIHRoZSByZWFjaCBtaWdodCBoYXZlIGJlZW4gZXh0ZW5kZWQgYmVjYXVzZSBvZiB0aGUgcmVtYXRjaGluZ1xuXHRcdFx0XHRcdFx0aWYgKHJlbWF0Y2ggJiYgbmVzdGVkUmVtYXRjaC5yZWFjaCA+IHJlbWF0Y2gucmVhY2gpIHtcblx0XHRcdFx0XHRcdFx0cmVtYXRjaC5yZWFjaCA9IG5lc3RlZFJlbWF0Y2gucmVhY2g7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0LyoqXG5cdCAqIEB0eXBlZGVmIExpbmtlZExpc3ROb2RlXG5cdCAqIEBwcm9wZXJ0eSB7VH0gdmFsdWVcblx0ICogQHByb3BlcnR5IHtMaW5rZWRMaXN0Tm9kZTxUPiB8IG51bGx9IHByZXYgVGhlIHByZXZpb3VzIG5vZGUuXG5cdCAqIEBwcm9wZXJ0eSB7TGlua2VkTGlzdE5vZGU8VD4gfCBudWxsfSBuZXh0IFRoZSBuZXh0IG5vZGUuXG5cdCAqIEB0ZW1wbGF0ZSBUXG5cdCAqIEBwcml2YXRlXG5cdCAqL1xuXG5cdC8qKlxuXHQgKiBAdGVtcGxhdGUgVFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblx0ZnVuY3Rpb24gTGlua2VkTGlzdCgpIHtcblx0XHQvKiogQHR5cGUge0xpbmtlZExpc3ROb2RlPFQ+fSAqL1xuXHRcdHZhciBoZWFkID0geyB2YWx1ZTogbnVsbCwgcHJldjogbnVsbCwgbmV4dDogbnVsbCB9O1xuXHRcdC8qKiBAdHlwZSB7TGlua2VkTGlzdE5vZGU8VD59ICovXG5cdFx0dmFyIHRhaWwgPSB7IHZhbHVlOiBudWxsLCBwcmV2OiBoZWFkLCBuZXh0OiBudWxsIH07XG5cdFx0aGVhZC5uZXh0ID0gdGFpbDtcblxuXHRcdC8qKiBAdHlwZSB7TGlua2VkTGlzdE5vZGU8VD59ICovXG5cdFx0dGhpcy5oZWFkID0gaGVhZDtcblx0XHQvKiogQHR5cGUge0xpbmtlZExpc3ROb2RlPFQ+fSAqL1xuXHRcdHRoaXMudGFpbCA9IHRhaWw7XG5cdFx0dGhpcy5sZW5ndGggPSAwO1xuXHR9XG5cblx0LyoqXG5cdCAqIEFkZHMgYSBuZXcgbm9kZSB3aXRoIHRoZSBnaXZlbiB2YWx1ZSB0byB0aGUgbGlzdC5cblx0ICpcblx0ICogQHBhcmFtIHtMaW5rZWRMaXN0PFQ+fSBsaXN0XG5cdCAqIEBwYXJhbSB7TGlua2VkTGlzdE5vZGU8VD59IG5vZGVcblx0ICogQHBhcmFtIHtUfSB2YWx1ZVxuXHQgKiBAcmV0dXJucyB7TGlua2VkTGlzdE5vZGU8VD59IFRoZSBhZGRlZCBub2RlLlxuXHQgKiBAdGVtcGxhdGUgVFxuXHQgKi9cblx0ZnVuY3Rpb24gYWRkQWZ0ZXIobGlzdCwgbm9kZSwgdmFsdWUpIHtcblx0XHQvLyBhc3N1bWVzIHRoYXQgbm9kZSAhPSBsaXN0LnRhaWwgJiYgdmFsdWVzLmxlbmd0aCA+PSAwXG5cdFx0dmFyIG5leHQgPSBub2RlLm5leHQ7XG5cblx0XHR2YXIgbmV3Tm9kZSA9IHsgdmFsdWU6IHZhbHVlLCBwcmV2OiBub2RlLCBuZXh0OiBuZXh0IH07XG5cdFx0bm9kZS5uZXh0ID0gbmV3Tm9kZTtcblx0XHRuZXh0LnByZXYgPSBuZXdOb2RlO1xuXHRcdGxpc3QubGVuZ3RoKys7XG5cblx0XHRyZXR1cm4gbmV3Tm9kZTtcblx0fVxuXHQvKipcblx0ICogUmVtb3ZlcyBgY291bnRgIG5vZGVzIGFmdGVyIHRoZSBnaXZlbiBub2RlLiBUaGUgZ2l2ZW4gbm9kZSB3aWxsIG5vdCBiZSByZW1vdmVkLlxuXHQgKlxuXHQgKiBAcGFyYW0ge0xpbmtlZExpc3Q8VD59IGxpc3Rcblx0ICogQHBhcmFtIHtMaW5rZWRMaXN0Tm9kZTxUPn0gbm9kZVxuXHQgKiBAcGFyYW0ge251bWJlcn0gY291bnRcblx0ICogQHRlbXBsYXRlIFRcblx0ICovXG5cdGZ1bmN0aW9uIHJlbW92ZVJhbmdlKGxpc3QsIG5vZGUsIGNvdW50KSB7XG5cdFx0dmFyIG5leHQgPSBub2RlLm5leHQ7XG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBjb3VudCAmJiBuZXh0ICE9PSBsaXN0LnRhaWw7IGkrKykge1xuXHRcdFx0bmV4dCA9IG5leHQubmV4dDtcblx0XHR9XG5cdFx0bm9kZS5uZXh0ID0gbmV4dDtcblx0XHRuZXh0LnByZXYgPSBub2RlO1xuXHRcdGxpc3QubGVuZ3RoIC09IGk7XG5cdH1cblx0LyoqXG5cdCAqIEBwYXJhbSB7TGlua2VkTGlzdDxUPn0gbGlzdFxuXHQgKiBAcmV0dXJucyB7VFtdfVxuXHQgKiBAdGVtcGxhdGUgVFxuXHQgKi9cblx0ZnVuY3Rpb24gdG9BcnJheShsaXN0KSB7XG5cdFx0dmFyIGFycmF5ID0gW107XG5cdFx0dmFyIG5vZGUgPSBsaXN0LmhlYWQubmV4dDtcblx0XHR3aGlsZSAobm9kZSAhPT0gbGlzdC50YWlsKSB7XG5cdFx0XHRhcnJheS5wdXNoKG5vZGUudmFsdWUpO1xuXHRcdFx0bm9kZSA9IG5vZGUubmV4dDtcblx0XHR9XG5cdFx0cmV0dXJuIGFycmF5O1xuXHR9XG5cblxuXHRpZiAoIV9zZWxmLmRvY3VtZW50KSB7XG5cdFx0aWYgKCFfc2VsZi5hZGRFdmVudExpc3RlbmVyKSB7XG5cdFx0XHQvLyBpbiBOb2RlLmpzXG5cdFx0XHRyZXR1cm4gXztcblx0XHR9XG5cblx0XHRpZiAoIV8uZGlzYWJsZVdvcmtlck1lc3NhZ2VIYW5kbGVyKSB7XG5cdFx0XHQvLyBJbiB3b3JrZXJcblx0XHRcdF9zZWxmLmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBmdW5jdGlvbiAoZXZ0KSB7XG5cdFx0XHRcdHZhciBtZXNzYWdlID0gSlNPTi5wYXJzZShldnQuZGF0YSk7XG5cdFx0XHRcdHZhciBsYW5nID0gbWVzc2FnZS5sYW5ndWFnZTtcblx0XHRcdFx0dmFyIGNvZGUgPSBtZXNzYWdlLmNvZGU7XG5cdFx0XHRcdHZhciBpbW1lZGlhdGVDbG9zZSA9IG1lc3NhZ2UuaW1tZWRpYXRlQ2xvc2U7XG5cblx0XHRcdFx0X3NlbGYucG9zdE1lc3NhZ2UoXy5oaWdobGlnaHQoY29kZSwgXy5sYW5ndWFnZXNbbGFuZ10sIGxhbmcpKTtcblx0XHRcdFx0aWYgKGltbWVkaWF0ZUNsb3NlKSB7XG5cdFx0XHRcdFx0X3NlbGYuY2xvc2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSwgZmFsc2UpO1xuXHRcdH1cblxuXHRcdHJldHVybiBfO1xuXHR9XG5cblx0Ly8gR2V0IGN1cnJlbnQgc2NyaXB0IGFuZCBoaWdobGlnaHRcblx0dmFyIHNjcmlwdCA9IF8udXRpbC5jdXJyZW50U2NyaXB0KCk7XG5cblx0aWYgKHNjcmlwdCkge1xuXHRcdF8uZmlsZW5hbWUgPSBzY3JpcHQuc3JjO1xuXG5cdFx0aWYgKHNjcmlwdC5oYXNBdHRyaWJ1dGUoJ2RhdGEtbWFudWFsJykpIHtcblx0XHRcdF8ubWFudWFsID0gdHJ1ZTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBoaWdobGlnaHRBdXRvbWF0aWNhbGx5Q2FsbGJhY2soKSB7XG5cdFx0aWYgKCFfLm1hbnVhbCkge1xuXHRcdFx0Xy5oaWdobGlnaHRBbGwoKTtcblx0XHR9XG5cdH1cblxuXHRpZiAoIV8ubWFudWFsKSB7XG5cdFx0Ly8gSWYgdGhlIGRvY3VtZW50IHN0YXRlIGlzIFwibG9hZGluZ1wiLCB0aGVuIHdlJ2xsIHVzZSBET01Db250ZW50TG9hZGVkLlxuXHRcdC8vIElmIHRoZSBkb2N1bWVudCBzdGF0ZSBpcyBcImludGVyYWN0aXZlXCIgYW5kIHRoZSBwcmlzbS5qcyBzY3JpcHQgaXMgZGVmZXJyZWQsIHRoZW4gd2UnbGwgYWxzbyB1c2UgdGhlXG5cdFx0Ly8gRE9NQ29udGVudExvYWRlZCBldmVudCBiZWNhdXNlIHRoZXJlIG1pZ2h0IGJlIHNvbWUgcGx1Z2lucyBvciBsYW5ndWFnZXMgd2hpY2ggaGF2ZSBhbHNvIGJlZW4gZGVmZXJyZWQgYW5kIHRoZXlcblx0XHQvLyBtaWdodCB0YWtlIGxvbmdlciBvbmUgYW5pbWF0aW9uIGZyYW1lIHRvIGV4ZWN1dGUgd2hpY2ggY2FuIGNyZWF0ZSBhIHJhY2UgY29uZGl0aW9uIHdoZXJlIG9ubHkgc29tZSBwbHVnaW5zIGhhdmVcblx0XHQvLyBiZWVuIGxvYWRlZCB3aGVuIFByaXNtLmhpZ2hsaWdodEFsbCgpIGlzIGV4ZWN1dGVkLCBkZXBlbmRpbmcgb24gaG93IGZhc3QgcmVzb3VyY2VzIGFyZSBsb2FkZWQuXG5cdFx0Ly8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9QcmlzbUpTL3ByaXNtL2lzc3Vlcy8yMTAyXG5cdFx0dmFyIHJlYWR5U3RhdGUgPSBkb2N1bWVudC5yZWFkeVN0YXRlO1xuXHRcdGlmIChyZWFkeVN0YXRlID09PSAnbG9hZGluZycgfHwgcmVhZHlTdGF0ZSA9PT0gJ2ludGVyYWN0aXZlJyAmJiBzY3JpcHQgJiYgc2NyaXB0LmRlZmVyKSB7XG5cdFx0XHRkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdET01Db250ZW50TG9hZGVkJywgaGlnaGxpZ2h0QXV0b21hdGljYWxseUNhbGxiYWNrKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpIHtcblx0XHRcdFx0d2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShoaWdobGlnaHRBdXRvbWF0aWNhbGx5Q2FsbGJhY2spO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0d2luZG93LnNldFRpbWVvdXQoaGlnaGxpZ2h0QXV0b21hdGljYWxseUNhbGxiYWNrLCAxNik7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIF87XG5cbn0oX3NlbGYpKTtcblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdG1vZHVsZS5leHBvcnRzID0gUHJpc207XG59XG5cbi8vIGhhY2sgZm9yIGNvbXBvbmVudHMgdG8gd29yayBjb3JyZWN0bHkgaW4gbm9kZS5qc1xuaWYgKHR5cGVvZiBnbG9iYWwgIT09ICd1bmRlZmluZWQnKSB7XG5cdGdsb2JhbC5QcmlzbSA9IFByaXNtO1xufVxuXG4vLyBzb21lIGFkZGl0aW9uYWwgZG9jdW1lbnRhdGlvbi90eXBlc1xuXG4vKipcbiAqIFRoZSBleHBhbnNpb24gb2YgYSBzaW1wbGUgYFJlZ0V4cGAgbGl0ZXJhbCB0byBzdXBwb3J0IGFkZGl0aW9uYWwgcHJvcGVydGllcy5cbiAqXG4gKiBAdHlwZWRlZiBHcmFtbWFyVG9rZW5cbiAqIEBwcm9wZXJ0eSB7UmVnRXhwfSBwYXR0ZXJuIFRoZSByZWd1bGFyIGV4cHJlc3Npb24gb2YgdGhlIHRva2VuLlxuICogQHByb3BlcnR5IHtib29sZWFufSBbbG9va2JlaGluZD1mYWxzZV0gSWYgYHRydWVgLCB0aGVuIHRoZSBmaXJzdCBjYXB0dXJpbmcgZ3JvdXAgb2YgYHBhdHRlcm5gIHdpbGwgKGVmZmVjdGl2ZWx5KVxuICogYmVoYXZlIGFzIGEgbG9va2JlaGluZCBncm91cCBtZWFuaW5nIHRoYXQgdGhlIGNhcHR1cmVkIHRleHQgd2lsbCBub3QgYmUgcGFydCBvZiB0aGUgbWF0Y2hlZCB0ZXh0IG9mIHRoZSBuZXcgdG9rZW4uXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IFtncmVlZHk9ZmFsc2VdIFdoZXRoZXIgdGhlIHRva2VuIGlzIGdyZWVkeS5cbiAqIEBwcm9wZXJ0eSB7c3RyaW5nfHN0cmluZ1tdfSBbYWxpYXNdIEFuIG9wdGlvbmFsIGFsaWFzIG9yIGxpc3Qgb2YgYWxpYXNlcy5cbiAqIEBwcm9wZXJ0eSB7R3JhbW1hcn0gW2luc2lkZV0gVGhlIG5lc3RlZCBncmFtbWFyIG9mIHRoaXMgdG9rZW4uXG4gKlxuICogVGhlIGBpbnNpZGVgIGdyYW1tYXIgd2lsbCBiZSB1c2VkIHRvIHRva2VuaXplIHRoZSB0ZXh0IHZhbHVlIG9mIGVhY2ggdG9rZW4gb2YgdGhpcyBraW5kLlxuICpcbiAqIFRoaXMgY2FuIGJlIHVzZWQgdG8gbWFrZSBuZXN0ZWQgYW5kIGV2ZW4gcmVjdXJzaXZlIGxhbmd1YWdlIGRlZmluaXRpb25zLlxuICpcbiAqIE5vdGU6IFRoaXMgY2FuIGNhdXNlIGluZmluaXRlIHJlY3Vyc2lvbi4gQmUgY2FyZWZ1bCB3aGVuIHlvdSBlbWJlZCBkaWZmZXJlbnQgbGFuZ3VhZ2VzIG9yIGV2ZW4gdGhlIHNhbWUgbGFuZ3VhZ2UgaW50b1xuICogZWFjaCBhbm90aGVyLlxuICogQGdsb2JhbFxuICogQHB1YmxpY1xuICovXG5cbi8qKlxuICogQHR5cGVkZWYgR3JhbW1hclxuICogQHR5cGUge09iamVjdDxzdHJpbmcsIFJlZ0V4cCB8IEdyYW1tYXJUb2tlbiB8IEFycmF5PFJlZ0V4cCB8IEdyYW1tYXJUb2tlbj4+fVxuICogQHByb3BlcnR5IHtHcmFtbWFyfSBbcmVzdF0gQW4gb3B0aW9uYWwgZ3JhbW1hciBvYmplY3QgdGhhdCB3aWxsIGJlIGFwcGVuZGVkIHRvIHRoaXMgZ3JhbW1hci5cbiAqIEBnbG9iYWxcbiAqIEBwdWJsaWNcbiAqL1xuXG4vKipcbiAqIEEgZnVuY3Rpb24gd2hpY2ggd2lsbCBpbnZva2VkIGFmdGVyIGFuIGVsZW1lbnQgd2FzIHN1Y2Nlc3NmdWxseSBoaWdobGlnaHRlZC5cbiAqXG4gKiBAY2FsbGJhY2sgSGlnaGxpZ2h0Q2FsbGJhY2tcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCBzdWNjZXNzZnVsbHkgaGlnaGxpZ2h0ZWQuXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqIEBnbG9iYWxcbiAqIEBwdWJsaWNcbiAqL1xuXG4vKipcbiAqIEBjYWxsYmFjayBIb29rQ2FsbGJhY2tcbiAqIEBwYXJhbSB7T2JqZWN0PHN0cmluZywgYW55Pn0gZW52IFRoZSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgb2YgdGhlIGhvb2suXG4gKiBAcmV0dXJucyB7dm9pZH1cbiAqIEBnbG9iYWxcbiAqIEBwdWJsaWNcbiAqL1xuXG5cbi8qICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcbiAgICAgQmVnaW4gcHJpc20tbWFya3VwLmpzXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXG5cblByaXNtLmxhbmd1YWdlcy5tYXJrdXAgPSB7XG5cdCdjb21tZW50Jzoge1xuXHRcdHBhdHRlcm46IC88IS0tKD86KD8hPCEtLSlbXFxzXFxTXSkqPy0tPi8sXG5cdFx0Z3JlZWR5OiB0cnVlXG5cdH0sXG5cdCdwcm9sb2cnOiB7XG5cdFx0cGF0dGVybjogLzxcXD9bXFxzXFxTXSs/XFw/Pi8sXG5cdFx0Z3JlZWR5OiB0cnVlXG5cdH0sXG5cdCdkb2N0eXBlJzoge1xuXHRcdC8vIGh0dHBzOi8vd3d3LnczLm9yZy9UUi94bWwvI05ULWRvY3R5cGVkZWNsXG5cdFx0cGF0dGVybjogLzwhRE9DVFlQRSg/OltePlwiJ1tcXF1dfFwiW15cIl0qXCJ8J1teJ10qJykrKD86XFxbKD86W148XCInXFxdXXxcIlteXCJdKlwifCdbXiddKid8PCg/ISEtLSl8PCEtLSg/OlteLV18LSg/IS0+KSkqLS0+KSpcXF1cXHMqKT8+L2ksXG5cdFx0Z3JlZWR5OiB0cnVlLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J2ludGVybmFsLXN1YnNldCc6IHtcblx0XHRcdFx0cGF0dGVybjogLyheW15cXFtdKlxcWylbXFxzXFxTXSsoPz1cXF0+JCkvLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRncmVlZHk6IHRydWUsXG5cdFx0XHRcdGluc2lkZTogbnVsbCAvLyBzZWUgYmVsb3dcblx0XHRcdH0sXG5cdFx0XHQnc3RyaW5nJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXCJbXlwiXSpcInwnW14nXSonLyxcblx0XHRcdFx0Z3JlZWR5OiB0cnVlXG5cdFx0XHR9LFxuXHRcdFx0J3B1bmN0dWF0aW9uJzogL148IXw+JHxbW1xcXV0vLFxuXHRcdFx0J2RvY3R5cGUtdGFnJzogL15ET0NUWVBFL2ksXG5cdFx0XHQnbmFtZSc6IC9bXlxcczw+J1wiXSsvXG5cdFx0fVxuXHR9LFxuXHQnY2RhdGEnOiB7XG5cdFx0cGF0dGVybjogLzwhXFxbQ0RBVEFcXFtbXFxzXFxTXSo/XFxdXFxdPi9pLFxuXHRcdGdyZWVkeTogdHJ1ZVxuXHR9LFxuXHQndGFnJzoge1xuXHRcdHBhdHRlcm46IC88XFwvPyg/IVxcZClbXlxccz5cXC89JDwlXSsoPzpcXHMoPzpcXHMqW15cXHM+XFwvPV0rKD86XFxzKj1cXHMqKD86XCJbXlwiXSpcInwnW14nXSonfFteXFxzJ1wiPj1dKyg/PVtcXHM+XSkpfCg/PVtcXHMvPl0pKSkrKT9cXHMqXFwvPz4vLFxuXHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCd0YWcnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9ePFxcLz9bXlxccz5cXC9dKy8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IC9ePFxcLz8vLFxuXHRcdFx0XHRcdCduYW1lc3BhY2UnOiAvXlteXFxzPlxcLzpdKzovXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQnc3BlY2lhbC1hdHRyJzogW10sXG5cdFx0XHQnYXR0ci12YWx1ZSc6IHtcblx0XHRcdFx0cGF0dGVybjogLz1cXHMqKD86XCJbXlwiXSpcInwnW14nXSonfFteXFxzJ1wiPj1dKykvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiBbXG5cdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdHBhdHRlcm46IC9ePS8sXG5cdFx0XHRcdFx0XHRcdGFsaWFzOiAnYXR0ci1lcXVhbHMnXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0L1wifCcvXG5cdFx0XHRcdFx0XVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1xcLz8+Lyxcblx0XHRcdCdhdHRyLW5hbWUnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9bXlxccz5cXC9dKy8sXG5cdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdCduYW1lc3BhY2UnOiAvXlteXFxzPlxcLzpdKzovXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdH1cblx0fSxcblx0J2VudGl0eSc6IFtcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvJltcXGRhLXpdezEsOH07L2ksXG5cdFx0XHRhbGlhczogJ25hbWVkLWVudGl0eSdcblx0XHR9LFxuXHRcdC8mI3g/W1xcZGEtZl17MSw4fTsvaVxuXHRdXG59O1xuXG5QcmlzbS5sYW5ndWFnZXMubWFya3VwWyd0YWcnXS5pbnNpZGVbJ2F0dHItdmFsdWUnXS5pbnNpZGVbJ2VudGl0eSddID1cblx0UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFsnZW50aXR5J107XG5QcmlzbS5sYW5ndWFnZXMubWFya3VwWydkb2N0eXBlJ10uaW5zaWRlWydpbnRlcm5hbC1zdWJzZXQnXS5pbnNpZGUgPSBQcmlzbS5sYW5ndWFnZXMubWFya3VwO1xuXG4vLyBQbHVnaW4gdG8gbWFrZSBlbnRpdHkgdGl0bGUgc2hvdyB0aGUgcmVhbCBlbnRpdHksIGlkZWEgYnkgUm9tYW4gS29tYXJvdlxuUHJpc20uaG9va3MuYWRkKCd3cmFwJywgZnVuY3Rpb24gKGVudikge1xuXG5cdGlmIChlbnYudHlwZSA9PT0gJ2VudGl0eScpIHtcblx0XHRlbnYuYXR0cmlidXRlc1sndGl0bGUnXSA9IGVudi5jb250ZW50LnJlcGxhY2UoLyZhbXA7LywgJyYnKTtcblx0fVxufSk7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZywgJ2FkZElubGluZWQnLCB7XG5cdC8qKlxuXHQgKiBBZGRzIGFuIGlubGluZWQgbGFuZ3VhZ2UgdG8gbWFya3VwLlxuXHQgKlxuXHQgKiBBbiBleGFtcGxlIG9mIGFuIGlubGluZWQgbGFuZ3VhZ2UgaXMgQ1NTIHdpdGggYDxzdHlsZT5gIHRhZ3MuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lIFRoZSBuYW1lIG9mIHRoZSB0YWcgdGhhdCBjb250YWlucyB0aGUgaW5saW5lZCBsYW5ndWFnZS4gVGhpcyBuYW1lIHdpbGwgYmUgdHJlYXRlZCBhc1xuXHQgKiBjYXNlIGluc2Vuc2l0aXZlLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbGFuZyBUaGUgbGFuZ3VhZ2Uga2V5LlxuXHQgKiBAZXhhbXBsZVxuXHQgKiBhZGRJbmxpbmVkKCdzdHlsZScsICdjc3MnKTtcblx0ICovXG5cdHZhbHVlOiBmdW5jdGlvbiBhZGRJbmxpbmVkKHRhZ05hbWUsIGxhbmcpIHtcblx0XHR2YXIgaW5jbHVkZWRDZGF0YUluc2lkZSA9IHt9O1xuXHRcdGluY2x1ZGVkQ2RhdGFJbnNpZGVbJ2xhbmd1YWdlLScgKyBsYW5nXSA9IHtcblx0XHRcdHBhdHRlcm46IC8oXjwhXFxbQ0RBVEFcXFspW1xcc1xcU10rPyg/PVxcXVxcXT4kKS9pLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzW2xhbmddXG5cdFx0fTtcblx0XHRpbmNsdWRlZENkYXRhSW5zaWRlWydjZGF0YSddID0gL148IVxcW0NEQVRBXFxbfFxcXVxcXT4kL2k7XG5cblx0XHR2YXIgaW5zaWRlID0ge1xuXHRcdFx0J2luY2x1ZGVkLWNkYXRhJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvPCFcXFtDREFUQVxcW1tcXHNcXFNdKj9cXF1cXF0+L2ksXG5cdFx0XHRcdGluc2lkZTogaW5jbHVkZWRDZGF0YUluc2lkZVxuXHRcdFx0fVxuXHRcdH07XG5cdFx0aW5zaWRlWydsYW5ndWFnZS0nICsgbGFuZ10gPSB7XG5cdFx0XHRwYXR0ZXJuOiAvW1xcc1xcU10rLyxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzW2xhbmddXG5cdFx0fTtcblxuXHRcdHZhciBkZWYgPSB7fTtcblx0XHRkZWZbdGFnTmFtZV0gPSB7XG5cdFx0XHRwYXR0ZXJuOiBSZWdFeHAoLyg8X19bXj5dKj4pKD86PCFcXFtDREFUQVxcWyg/OlteXFxdXXxcXF0oPyFcXF0+KSkqXFxdXFxdPnwoPyE8IVxcW0NEQVRBXFxbKVtcXHNcXFNdKSo/KD89PFxcL19fPikvLnNvdXJjZS5yZXBsYWNlKC9fXy9nLCBmdW5jdGlvbiAoKSB7IHJldHVybiB0YWdOYW1lOyB9KSwgJ2knKSxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRncmVlZHk6IHRydWUsXG5cdFx0XHRpbnNpZGU6IGluc2lkZVxuXHRcdH07XG5cblx0XHRQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdtYXJrdXAnLCAnY2RhdGEnLCBkZWYpO1xuXHR9XG59KTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZywgJ2FkZEF0dHJpYnV0ZScsIHtcblx0LyoqXG5cdCAqIEFkZHMgYW4gcGF0dGVybiB0byBoaWdobGlnaHQgbGFuZ3VhZ2VzIGVtYmVkZGVkIGluIEhUTUwgYXR0cmlidXRlcy5cblx0ICpcblx0ICogQW4gZXhhbXBsZSBvZiBhbiBpbmxpbmVkIGxhbmd1YWdlIGlzIENTUyB3aXRoIGBzdHlsZWAgYXR0cmlidXRlcy5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IGF0dHJOYW1lIFRoZSBuYW1lIG9mIHRoZSB0YWcgdGhhdCBjb250YWlucyB0aGUgaW5saW5lZCBsYW5ndWFnZS4gVGhpcyBuYW1lIHdpbGwgYmUgdHJlYXRlZCBhc1xuXHQgKiBjYXNlIGluc2Vuc2l0aXZlLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbGFuZyBUaGUgbGFuZ3VhZ2Uga2V5LlxuXHQgKiBAZXhhbXBsZVxuXHQgKiBhZGRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2NzcycpO1xuXHQgKi9cblx0dmFsdWU6IGZ1bmN0aW9uIChhdHRyTmFtZSwgbGFuZykge1xuXHRcdFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmluc2lkZVsnc3BlY2lhbC1hdHRyJ10ucHVzaCh7XG5cdFx0XHRwYXR0ZXJuOiBSZWdFeHAoXG5cdFx0XHRcdC8oXnxbXCInXFxzXSkvLnNvdXJjZSArICcoPzonICsgYXR0ck5hbWUgKyAnKScgKyAvXFxzKj1cXHMqKD86XCJbXlwiXSpcInwnW14nXSonfFteXFxzJ1wiPj1dKyg/PVtcXHM+XSkpLy5zb3VyY2UsXG5cdFx0XHRcdCdpJ1xuXHRcdFx0KSxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0J2F0dHItbmFtZSc6IC9eW15cXHM9XSsvLFxuXHRcdFx0XHQnYXR0ci12YWx1ZSc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvPVtcXHNcXFNdKy8sXG5cdFx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0XHQndmFsdWUnOiB7XG5cdFx0XHRcdFx0XHRcdHBhdHRlcm46IC8oXj1cXHMqKFtcIiddfCg/IVtcIiddKSkpXFxTW1xcc1xcU10qKD89XFwyJCkvLFxuXHRcdFx0XHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRcdFx0XHRhbGlhczogW2xhbmcsICdsYW5ndWFnZS0nICsgbGFuZ10sXG5cdFx0XHRcdFx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzW2xhbmddXG5cdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogW1xuXHRcdFx0XHRcdFx0XHR7XG5cdFx0XHRcdFx0XHRcdFx0cGF0dGVybjogL149Lyxcblx0XHRcdFx0XHRcdFx0XHRhbGlhczogJ2F0dHItZXF1YWxzJ1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHQvXCJ8Jy9cblx0XHRcdFx0XHRcdF1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fVxufSk7XG5cblByaXNtLmxhbmd1YWdlcy5odG1sID0gUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cDtcblByaXNtLmxhbmd1YWdlcy5tYXRobWwgPSBQcmlzbS5sYW5ndWFnZXMubWFya3VwO1xuUHJpc20ubGFuZ3VhZ2VzLnN2ZyA9IFByaXNtLmxhbmd1YWdlcy5tYXJrdXA7XG5cblByaXNtLmxhbmd1YWdlcy54bWwgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdtYXJrdXAnLCB7fSk7XG5QcmlzbS5sYW5ndWFnZXMuc3NtbCA9IFByaXNtLmxhbmd1YWdlcy54bWw7XG5QcmlzbS5sYW5ndWFnZXMuYXRvbSA9IFByaXNtLmxhbmd1YWdlcy54bWw7XG5QcmlzbS5sYW5ndWFnZXMucnNzID0gUHJpc20ubGFuZ3VhZ2VzLnhtbDtcblxuXG4vKiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEJlZ2luIHByaXNtLWNzcy5qc1xuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuXG4oZnVuY3Rpb24gKFByaXNtKSB7XG5cblx0dmFyIHN0cmluZyA9IC8oPzpcIig/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfFteXCJcXFxcXFxyXFxuXSkqXCJ8Jyg/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfFteJ1xcXFxcXHJcXG5dKSonKS87XG5cblx0UHJpc20ubGFuZ3VhZ2VzLmNzcyA9IHtcblx0XHQnY29tbWVudCc6IC9cXC9cXCpbXFxzXFxTXSo/XFwqXFwvLyxcblx0XHQnYXRydWxlJzoge1xuXHRcdFx0cGF0dGVybjogL0BbXFx3LV0oPzpbXjt7XFxzXXxcXHMrKD8hW1xcc3tdKSkqKD86O3woPz1cXHMqXFx7KSkvLFxuXHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdCdydWxlJzogL15AW1xcdy1dKy8sXG5cdFx0XHRcdCdzZWxlY3Rvci1mdW5jdGlvbi1hcmd1bWVudCc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvKFxcYnNlbGVjdG9yXFxzKlxcKFxccyooPyFbXFxzKV0pKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKCg/OlteKCldfFxcKFteKCldKlxcKSkqXFwpKSsoPz1cXHMqXFwpKS8sXG5cdFx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdFx0XHRhbGlhczogJ3NlbGVjdG9yJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHQna2V5d29yZCc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiAvKF58W15cXHctXSkoPzphbmR8bm90fG9ubHl8b3IpKD8hW1xcdy1dKS8sXG5cdFx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdFx0XHR9XG5cdFx0XHRcdC8vIFNlZSByZXN0IGJlbG93XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQndXJsJzoge1xuXHRcdFx0Ly8gaHR0cHM6Ly9kcmFmdHMuY3Nzd2cub3JnL2Nzcy12YWx1ZXMtMy8jdXJsc1xuXHRcdFx0cGF0dGVybjogUmVnRXhwKCdcXFxcYnVybFxcXFwoKD86JyArIHN0cmluZy5zb3VyY2UgKyAnfCcgKyAvKD86W15cXFxcXFxyXFxuKClcIiddfFxcXFxbXFxzXFxTXSkqLy5zb3VyY2UgKyAnKVxcXFwpJywgJ2knKSxcblx0XHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRcdGluc2lkZToge1xuXHRcdFx0XHQnZnVuY3Rpb24nOiAvXnVybC9pLFxuXHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXlxcKHxcXCkkLyxcblx0XHRcdFx0J3N0cmluZyc6IHtcblx0XHRcdFx0XHRwYXR0ZXJuOiBSZWdFeHAoJ14nICsgc3RyaW5nLnNvdXJjZSArICckJyksXG5cdFx0XHRcdFx0YWxpYXM6ICd1cmwnXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdCdzZWxlY3Rvcic6IHtcblx0XHRcdHBhdHRlcm46IFJlZ0V4cCgnKF58W3t9XFxcXHNdKVtee31cXFxcc10oPzpbXnt9O1wiXFwnXFxcXHNdfFxcXFxzKyg/IVtcXFxcc3tdKXwnICsgc3RyaW5nLnNvdXJjZSArICcpKig/PVxcXFxzKlxcXFx7KScpLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH0sXG5cdFx0J3N0cmluZyc6IHtcblx0XHRcdHBhdHRlcm46IHN0cmluZyxcblx0XHRcdGdyZWVkeTogdHJ1ZVxuXHRcdH0sXG5cdFx0J3Byb3BlcnR5Jzoge1xuXHRcdFx0cGF0dGVybjogLyhefFteLVxcd1xceEEwLVxcdUZGRkZdKSg/IVxccylbLV9hLXpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbLVxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqOikvaSxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9LFxuXHRcdCdpbXBvcnRhbnQnOiAvIWltcG9ydGFudFxcYi9pLFxuXHRcdCdmdW5jdGlvbic6IHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXi1hLXowLTldKVstYS16MC05XSsoPz1cXCgpL2ksXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fSxcblx0XHQncHVuY3R1YXRpb24nOiAvWygpe307OixdL1xuXHR9O1xuXG5cdFByaXNtLmxhbmd1YWdlcy5jc3NbJ2F0cnVsZSddLmluc2lkZS5yZXN0ID0gUHJpc20ubGFuZ3VhZ2VzLmNzcztcblxuXHR2YXIgbWFya3VwID0gUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cDtcblx0aWYgKG1hcmt1cCkge1xuXHRcdG1hcmt1cC50YWcuYWRkSW5saW5lZCgnc3R5bGUnLCAnY3NzJyk7XG5cdFx0bWFya3VwLnRhZy5hZGRBdHRyaWJ1dGUoJ3N0eWxlJywgJ2NzcycpO1xuXHR9XG5cbn0oUHJpc20pKTtcblxuXG4vKiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEJlZ2luIHByaXNtLWNsaWtlLmpzXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXG5cblByaXNtLmxhbmd1YWdlcy5jbGlrZSA9IHtcblx0J2NvbW1lbnQnOiBbXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteXFxcXF0pXFwvXFwqW1xcc1xcU10qPyg/OlxcKlxcL3wkKS8sXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0Z3JlZWR5OiB0cnVlXG5cdFx0fSxcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKF58W15cXFxcOl0pXFwvXFwvLiovLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdGdyZWVkeTogdHJ1ZVxuXHRcdH1cblx0XSxcblx0J3N0cmluZyc6IHtcblx0XHRwYXR0ZXJuOiAvKFtcIiddKSg/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfCg/IVxcMSlbXlxcXFxcXHJcXG5dKSpcXDEvLFxuXHRcdGdyZWVkeTogdHJ1ZVxuXHR9LFxuXHQnY2xhc3MtbmFtZSc6IHtcblx0XHRwYXR0ZXJuOiAvKFxcYig/OmNsYXNzfGV4dGVuZHN8aW1wbGVtZW50c3xpbnN0YW5jZW9mfGludGVyZmFjZXxuZXd8dHJhaXQpXFxzK3xcXGJjYXRjaFxccytcXCgpW1xcdy5cXFxcXSsvaSxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdGluc2lkZToge1xuXHRcdFx0J3B1bmN0dWF0aW9uJzogL1suXFxcXF0vXG5cdFx0fVxuXHR9LFxuXHQna2V5d29yZCc6IC9cXGIoPzpicmVha3xjYXRjaHxjb250aW51ZXxkb3xlbHNlfGZpbmFsbHl8Zm9yfGZ1bmN0aW9ufGlmfGlufGluc3RhbmNlb2Z8bmV3fG51bGx8cmV0dXJufHRocm93fHRyeXx3aGlsZSlcXGIvLFxuXHQnYm9vbGVhbic6IC9cXGIoPzpmYWxzZXx0cnVlKVxcYi8sXG5cdCdmdW5jdGlvbic6IC9cXGJcXHcrKD89XFwoKS8sXG5cdCdudW1iZXInOiAvXFxiMHhbXFxkYS1mXStcXGJ8KD86XFxiXFxkKyg/OlxcLlxcZCopP3xcXEJcXC5cXGQrKSg/OmVbKy1dP1xcZCspPy9pLFxuXHQnb3BlcmF0b3InOiAvWzw+XT0/fFshPV09Pz0/fC0tP3xcXCtcXCs/fCYmP3xcXHxcXHw/fFs/Ki9+XiVdLyxcblx0J3B1bmN0dWF0aW9uJzogL1t7fVtcXF07KCksLjpdL1xufTtcblxuXG4vKiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEJlZ2luIHByaXNtLWphdmFzY3JpcHQuanNcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cblxuUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQgPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjbGlrZScsIHtcblx0J2NsYXNzLW5hbWUnOiBbXG5cdFx0UHJpc20ubGFuZ3VhZ2VzLmNsaWtlWydjbGFzcy1uYW1lJ10sXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteJFxcd1xceEEwLVxcdUZGRkZdKSg/IVxccylbXyRBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXC4oPzpjb25zdHJ1Y3Rvcnxwcm90b3R5cGUpKS8sXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fVxuXHRdLFxuXHQna2V5d29yZCc6IFtcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKCg/Ol58XFx9KVxccyopY2F0Y2hcXGIvLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteLl18XFwuXFwuXFwuXFxzKilcXGIoPzphc3xhc3NlcnQoPz1cXHMqXFx7KXxhc3luYyg/PVxccyooPzpmdW5jdGlvblxcYnxcXCh8WyRcXHdcXHhBMC1cXHVGRkZGXXwkKSl8YXdhaXR8YnJlYWt8Y2FzZXxjbGFzc3xjb25zdHxjb250aW51ZXxkZWJ1Z2dlcnxkZWZhdWx0fGRlbGV0ZXxkb3xlbHNlfGVudW18ZXhwb3J0fGV4dGVuZHN8ZmluYWxseSg/PVxccyooPzpcXHt8JCkpfGZvcnxmcm9tKD89XFxzKig/OlsnXCJdfCQpKXxmdW5jdGlvbnwoPzpnZXR8c2V0KSg/PVxccyooPzpbI1xcWyRcXHdcXHhBMC1cXHVGRkZGXXwkKSl8aWZ8aW1wbGVtZW50c3xpbXBvcnR8aW58aW5zdGFuY2VvZnxpbnRlcmZhY2V8bGV0fG5ld3xudWxsfG9mfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJldHVybnxzdGF0aWN8c3VwZXJ8c3dpdGNofHRoaXN8dGhyb3d8dHJ5fHR5cGVvZnx1bmRlZmluZWR8dmFyfHZvaWR8d2hpbGV8d2l0aHx5aWVsZClcXGIvLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH0sXG5cdF0sXG5cdC8vIEFsbG93IGZvciBhbGwgbm9uLUFTQ0lJIGNoYXJhY3RlcnMgKFNlZSBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8yMDA4NDQ0KVxuXHQnZnVuY3Rpb24nOiAvIz8oPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKig/OlxcLlxccyooPzphcHBseXxiaW5kfGNhbGwpXFxzKik/XFwoKS8sXG5cdCdudW1iZXInOiB7XG5cdFx0cGF0dGVybjogUmVnRXhwKFxuXHRcdFx0LyhefFteXFx3JF0pLy5zb3VyY2UgK1xuXHRcdFx0Jyg/OicgK1xuXHRcdFx0KFxuXHRcdFx0XHQvLyBjb25zdGFudFxuXHRcdFx0XHQvTmFOfEluZmluaXR5Ly5zb3VyY2UgK1xuXHRcdFx0XHQnfCcgK1xuXHRcdFx0XHQvLyBiaW5hcnkgaW50ZWdlclxuXHRcdFx0XHQvMFtiQl1bMDFdKyg/Ol9bMDFdKykqbj8vLnNvdXJjZSArXG5cdFx0XHRcdCd8JyArXG5cdFx0XHRcdC8vIG9jdGFsIGludGVnZXJcblx0XHRcdFx0LzBbb09dWzAtN10rKD86X1swLTddKykqbj8vLnNvdXJjZSArXG5cdFx0XHRcdCd8JyArXG5cdFx0XHRcdC8vIGhleGFkZWNpbWFsIGludGVnZXJcblx0XHRcdFx0LzBbeFhdW1xcZEEtRmEtZl0rKD86X1tcXGRBLUZhLWZdKykqbj8vLnNvdXJjZSArXG5cdFx0XHRcdCd8JyArXG5cdFx0XHRcdC8vIGRlY2ltYWwgYmlnaW50XG5cdFx0XHRcdC9cXGQrKD86X1xcZCspKm4vLnNvdXJjZSArXG5cdFx0XHRcdCd8JyArXG5cdFx0XHRcdC8vIGRlY2ltYWwgbnVtYmVyIChpbnRlZ2VyIG9yIGZsb2F0KSBidXQgbm8gYmlnaW50XG5cdFx0XHRcdC8oPzpcXGQrKD86X1xcZCspKig/OlxcLig/OlxcZCsoPzpfXFxkKykqKT8pP3xcXC5cXGQrKD86X1xcZCspKikoPzpbRWVdWystXT9cXGQrKD86X1xcZCspKik/Ly5zb3VyY2Vcblx0XHRcdCkgK1xuXHRcdFx0JyknICtcblx0XHRcdC8oPyFbXFx3JF0pLy5zb3VyY2Vcblx0XHQpLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0fSxcblx0J29wZXJhdG9yJzogLy0tfFxcK1xcK3xcXCpcXCo9P3w9PnwmJj0/fFxcfFxcfD0/fFshPV09PXw8PD0/fD4+Pj89P3xbLSsqLyUmfF4hPTw+XT0/fFxcLnszfXxcXD9cXD89P3xcXD9cXC4/fFt+Ol0vXG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHRbJ2NsYXNzLW5hbWUnXVswXS5wYXR0ZXJuID0gLyhcXGIoPzpjbGFzc3xleHRlbmRzfGltcGxlbWVudHN8aW5zdGFuY2VvZnxpbnRlcmZhY2V8bmV3KVxccyspW1xcdy5cXFxcXSsvO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdqYXZhc2NyaXB0JywgJ2tleXdvcmQnLCB7XG5cdCdyZWdleCc6IHtcblx0XHRwYXR0ZXJuOiBSZWdFeHAoXG5cdFx0XHQvLyBsb29rYmVoaW5kXG5cdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgcmVnZXhwL25vLWR1cGUtY2hhcmFjdGVycy1jaGFyYWN0ZXItY2xhc3Ncblx0XHRcdC8oKD86XnxbXiRcXHdcXHhBMC1cXHVGRkZGLlwiJ1xcXSlcXHNdfFxcYig/OnJldHVybnx5aWVsZCkpXFxzKikvLnNvdXJjZSArXG5cdFx0XHQvLyBSZWdleCBwYXR0ZXJuOlxuXHRcdFx0Ly8gVGhlcmUgYXJlIDIgcmVnZXggcGF0dGVybnMgaGVyZS4gVGhlIFJlZ0V4cCBzZXQgbm90YXRpb24gcHJvcG9zYWwgYWRkZWQgc3VwcG9ydCBmb3IgbmVzdGVkIGNoYXJhY3RlclxuXHRcdFx0Ly8gY2xhc3NlcyBpZiB0aGUgYHZgIGZsYWcgaXMgcHJlc2VudC4gVW5mb3J0dW5hdGVseSwgbmVzdGVkIENDcyBhcmUgYm90aCBjb250ZXh0LWZyZWUgYW5kIGluY29tcGF0aWJsZVxuXHRcdFx0Ly8gd2l0aCB0aGUgb25seSBzeW50YXgsIHNvIHdlIGhhdmUgdG8gZGVmaW5lIDIgZGlmZmVyZW50IHJlZ2V4IHBhdHRlcm5zLlxuXHRcdFx0L1xcLy8uc291cmNlICtcblx0XHRcdCcoPzonICtcblx0XHRcdC8oPzpcXFsoPzpbXlxcXVxcXFxcXHJcXG5dfFxcXFwuKSpcXF18XFxcXC58W14vXFxcXFxcW1xcclxcbl0pK1xcL1tkZ2lteXVzXXswLDd9Ly5zb3VyY2UgK1xuXHRcdFx0J3wnICtcblx0XHRcdC8vIGB2YCBmbGFnIHN5bnRheC4gVGhpcyBzdXBwb3J0cyAzIGxldmVscyBvZiBuZXN0ZWQgY2hhcmFjdGVyIGNsYXNzZXMuXG5cdFx0XHQvKD86XFxbKD86W15bXFxdXFxcXFxcclxcbl18XFxcXC58XFxbKD86W15bXFxdXFxcXFxcclxcbl18XFxcXC58XFxbKD86W15bXFxdXFxcXFxcclxcbl18XFxcXC4pKlxcXSkqXFxdKSpcXF18XFxcXC58W14vXFxcXFxcW1xcclxcbl0pK1xcL1tkZ2lteXVzXXswLDd9dltkZ2lteXVzXXswLDd9Ly5zb3VyY2UgK1xuXHRcdFx0JyknICtcblx0XHRcdC8vIGxvb2thaGVhZFxuXHRcdFx0Lyg/PSg/Olxcc3xcXC9cXCooPzpbXipdfFxcKig/IVxcLykpKlxcKlxcLykqKD86JHxbXFxyXFxuLC47On0pXFxdXXxcXC9cXC8pKS8uc291cmNlXG5cdFx0KSxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdyZWdleC1zb3VyY2UnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9eKFxcLylbXFxzXFxTXSsoPz1cXC9bYS16XSokKS8sXG5cdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRcdGFsaWFzOiAnbGFuZ3VhZ2UtcmVnZXgnLFxuXHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5yZWdleFxuXHRcdFx0fSxcblx0XHRcdCdyZWdleC1kZWxpbWl0ZXInOiAvXlxcL3xcXC8kLyxcblx0XHRcdCdyZWdleC1mbGFncyc6IC9eW2Etel0rJC8sXG5cdFx0fVxuXHR9LFxuXHQvLyBUaGlzIG11c3QgYmUgZGVjbGFyZWQgYmVmb3JlIGtleXdvcmQgYmVjYXVzZSB3ZSB1c2UgXCJmdW5jdGlvblwiIGluc2lkZSB0aGUgbG9vay1mb3J3YXJkXG5cdCdmdW5jdGlvbi12YXJpYWJsZSc6IHtcblx0XHRwYXR0ZXJuOiAvIz8oPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKls9Ol1cXHMqKD86YXN5bmNcXHMqKT8oPzpcXGJmdW5jdGlvblxcYnwoPzpcXCgoPzpbXigpXXxcXChbXigpXSpcXCkpKlxcKXwoPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKVxccyo9PikpLyxcblx0XHRhbGlhczogJ2Z1bmN0aW9uJ1xuXHR9LFxuXHQncGFyYW1ldGVyJzogW1xuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oZnVuY3Rpb24oPzpcXHMrKD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKik/XFxzKlxcKFxccyopKD8hXFxzKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKFteKCldKlxcKSkrKD89XFxzKlxcKSkvLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHRcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXiRcXHdcXHhBMC1cXHVGRkZGXSkoPyFcXHMpW18kYS16XFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKj0+KS9pLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHRcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXFwoXFxzKikoPyFcXHMpKD86W14oKVxcc118XFxzKyg/IVtcXHMpXSl8XFwoW14oKV0qXFwpKSsoPz1cXHMqXFwpXFxzKj0+KS8sXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdFxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLygoPzpcXGJ8XFxzfF4pKD8hKD86YXN8YXN5bmN8YXdhaXR8YnJlYWt8Y2FzZXxjYXRjaHxjbGFzc3xjb25zdHxjb250aW51ZXxkZWJ1Z2dlcnxkZWZhdWx0fGRlbGV0ZXxkb3xlbHNlfGVudW18ZXhwb3J0fGV4dGVuZHN8ZmluYWxseXxmb3J8ZnJvbXxmdW5jdGlvbnxnZXR8aWZ8aW1wbGVtZW50c3xpbXBvcnR8aW58aW5zdGFuY2VvZnxpbnRlcmZhY2V8bGV0fG5ld3xudWxsfG9mfHBhY2thZ2V8cHJpdmF0ZXxwcm90ZWN0ZWR8cHVibGljfHJldHVybnxzZXR8c3RhdGljfHN1cGVyfHN3aXRjaHx0aGlzfHRocm93fHRyeXx0eXBlb2Z8dW5kZWZpbmVkfHZhcnx2b2lkfHdoaWxlfHdpdGh8eWllbGQpKD8hWyRcXHdcXHhBMC1cXHVGRkZGXSkpKD86KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKlxccyopXFwoXFxzKnxcXF1cXHMqXFwoXFxzKikoPyFcXHMpKD86W14oKVxcc118XFxzKyg/IVtcXHMpXSl8XFwoW14oKV0qXFwpKSsoPz1cXHMqXFwpXFxzKlxceykvLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHRcblx0XHR9XG5cdF0sXG5cdCdjb25zdGFudCc6IC9cXGJbQS1aXSg/OltBLVpfXXxcXGR4PykqXFxiL1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ2phdmFzY3JpcHQnLCAnc3RyaW5nJywge1xuXHQnaGFzaGJhbmcnOiB7XG5cdFx0cGF0dGVybjogL14jIS4qLyxcblx0XHRncmVlZHk6IHRydWUsXG5cdFx0YWxpYXM6ICdjb21tZW50J1xuXHR9LFxuXHQndGVtcGxhdGUtc3RyaW5nJzoge1xuXHRcdHBhdHRlcm46IC9gKD86XFxcXFtcXHNcXFNdfFxcJFxceyg/Oltee31dfFxceyg/Oltee31dfFxce1tefV0qXFx9KSpcXH0pK1xcfXwoPyFcXCRcXHspW15cXFxcYF0pKmAvLFxuXHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCd0ZW1wbGF0ZS1wdW5jdHVhdGlvbic6IHtcblx0XHRcdFx0cGF0dGVybjogL15gfGAkLyxcblx0XHRcdFx0YWxpYXM6ICdzdHJpbmcnXG5cdFx0XHR9LFxuXHRcdFx0J2ludGVycG9sYXRpb24nOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8oKD86XnxbXlxcXFxdKSg/OlxcXFx7Mn0pKilcXCRcXHsoPzpbXnt9XXxcXHsoPzpbXnt9XXxcXHtbXn1dKlxcfSkqXFx9KStcXH0vLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQnaW50ZXJwb2xhdGlvbi1wdW5jdHVhdGlvbic6IHtcblx0XHRcdFx0XHRcdHBhdHRlcm46IC9eXFwkXFx7fFxcfSQvLFxuXHRcdFx0XHRcdFx0YWxpYXM6ICdwdW5jdHVhdGlvbidcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHJlc3Q6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHQnc3RyaW5nJzogL1tcXHNcXFNdKy9cblx0XHR9XG5cdH0sXG5cdCdzdHJpbmctcHJvcGVydHknOiB7XG5cdFx0cGF0dGVybjogLygoPzpefFsse10pWyBcXHRdKikoW1wiJ10pKD86XFxcXCg/OlxcclxcbnxbXFxzXFxTXSl8KD8hXFwyKVteXFxcXFxcclxcbl0pKlxcMig/PVxccyo6KS9tLFxuXHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0Z3JlZWR5OiB0cnVlLFxuXHRcdGFsaWFzOiAncHJvcGVydHknXG5cdH1cbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdqYXZhc2NyaXB0JywgJ29wZXJhdG9yJywge1xuXHQnbGl0ZXJhbC1wcm9wZXJ0eSc6IHtcblx0XHRwYXR0ZXJuOiAvKCg/Ol58Wyx7XSlbIFxcdF0qKSg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSooPz1cXHMqOikvbSxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdGFsaWFzOiAncHJvcGVydHknXG5cdH0sXG59KTtcblxuaWYgKFByaXNtLmxhbmd1YWdlcy5tYXJrdXApIHtcblx0UHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcuYWRkSW5saW5lZCgnc2NyaXB0JywgJ2phdmFzY3JpcHQnKTtcblxuXHQvLyBhZGQgYXR0cmlidXRlIHN1cHBvcnQgZm9yIGFsbCBET00gZXZlbnRzLlxuXHQvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9FdmVudHMjU3RhbmRhcmRfZXZlbnRzXG5cdFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmFkZEF0dHJpYnV0ZShcblx0XHQvb24oPzphYm9ydHxibHVyfGNoYW5nZXxjbGlja3xjb21wb3NpdGlvbig/OmVuZHxzdGFydHx1cGRhdGUpfGRibGNsaWNrfGVycm9yfGZvY3VzKD86aW58b3V0KT98a2V5KD86ZG93bnx1cCl8bG9hZHxtb3VzZSg/OmRvd258ZW50ZXJ8bGVhdmV8bW92ZXxvdXR8b3Zlcnx1cCl8cmVzZXR8cmVzaXplfHNjcm9sbHxzZWxlY3R8c2xvdGNoYW5nZXxzdWJtaXR8dW5sb2FkfHdoZWVsKS8uc291cmNlLFxuXHRcdCdqYXZhc2NyaXB0J1xuXHQpO1xufVxuXG5QcmlzbS5sYW5ndWFnZXMuanMgPSBQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdDtcblxuXG4vKiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEJlZ2luIHByaXNtLWZpbGUtaGlnaGxpZ2h0LmpzXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXG5cbihmdW5jdGlvbiAoKSB7XG5cblx0aWYgKHR5cGVvZiBQcmlzbSA9PT0gJ3VuZGVmaW5lZCcgfHwgdHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykge1xuXHRcdHJldHVybjtcblx0fVxuXG5cdC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9FbGVtZW50L21hdGNoZXMjUG9seWZpbGxcblx0aWYgKCFFbGVtZW50LnByb3RvdHlwZS5tYXRjaGVzKSB7XG5cdFx0RWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcyA9IEVsZW1lbnQucHJvdG90eXBlLm1zTWF0Y2hlc1NlbGVjdG9yIHx8IEVsZW1lbnQucHJvdG90eXBlLndlYmtpdE1hdGNoZXNTZWxlY3Rvcjtcblx0fVxuXG5cdHZhciBMT0FESU5HX01FU1NBR0UgPSAnTG9hZGluZ+KApic7XG5cdHZhciBGQUlMVVJFX01FU1NBR0UgPSBmdW5jdGlvbiAoc3RhdHVzLCBtZXNzYWdlKSB7XG5cdFx0cmV0dXJuICfinJYgRXJyb3IgJyArIHN0YXR1cyArICcgd2hpbGUgZmV0Y2hpbmcgZmlsZTogJyArIG1lc3NhZ2U7XG5cdH07XG5cdHZhciBGQUlMVVJFX0VNUFRZX01FU1NBR0UgPSAn4pyWIEVycm9yOiBGaWxlIGRvZXMgbm90IGV4aXN0IG9yIGlzIGVtcHR5JztcblxuXHR2YXIgRVhURU5TSU9OUyA9IHtcblx0XHQnanMnOiAnamF2YXNjcmlwdCcsXG5cdFx0J3B5JzogJ3B5dGhvbicsXG5cdFx0J3JiJzogJ3J1YnknLFxuXHRcdCdwczEnOiAncG93ZXJzaGVsbCcsXG5cdFx0J3BzbTEnOiAncG93ZXJzaGVsbCcsXG5cdFx0J3NoJzogJ2Jhc2gnLFxuXHRcdCdiYXQnOiAnYmF0Y2gnLFxuXHRcdCdoJzogJ2MnLFxuXHRcdCd0ZXgnOiAnbGF0ZXgnXG5cdH07XG5cblx0dmFyIFNUQVRVU19BVFRSID0gJ2RhdGEtc3JjLXN0YXR1cyc7XG5cdHZhciBTVEFUVVNfTE9BRElORyA9ICdsb2FkaW5nJztcblx0dmFyIFNUQVRVU19MT0FERUQgPSAnbG9hZGVkJztcblx0dmFyIFNUQVRVU19GQUlMRUQgPSAnZmFpbGVkJztcblxuXHR2YXIgU0VMRUNUT1IgPSAncHJlW2RhdGEtc3JjXTpub3QoWycgKyBTVEFUVVNfQVRUUiArICc9XCInICsgU1RBVFVTX0xPQURFRCArICdcIl0pJ1xuXHRcdCsgJzpub3QoWycgKyBTVEFUVVNfQVRUUiArICc9XCInICsgU1RBVFVTX0xPQURJTkcgKyAnXCJdKSc7XG5cblx0LyoqXG5cdCAqIExvYWRzIHRoZSBnaXZlbiBmaWxlLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gc3JjIFRoZSBVUkwgb3IgcGF0aCBvZiB0aGUgc291cmNlIGZpbGUgdG8gbG9hZC5cblx0ICogQHBhcmFtIHsocmVzdWx0OiBzdHJpbmcpID0+IHZvaWR9IHN1Y2Nlc3Ncblx0ICogQHBhcmFtIHsocmVhc29uOiBzdHJpbmcpID0+IHZvaWR9IGVycm9yXG5cdCAqL1xuXHRmdW5jdGlvbiBsb2FkRmlsZShzcmMsIHN1Y2Nlc3MsIGVycm9yKSB7XG5cdFx0dmFyIHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXHRcdHhoci5vcGVuKCdHRVQnLCBzcmMsIHRydWUpO1xuXHRcdHhoci5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG5cdFx0XHRpZiAoeGhyLnJlYWR5U3RhdGUgPT0gNCkge1xuXHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA8IDQwMCAmJiB4aHIucmVzcG9uc2VUZXh0KSB7XG5cdFx0XHRcdFx0c3VjY2Vzcyh4aHIucmVzcG9uc2VUZXh0KTtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRpZiAoeGhyLnN0YXR1cyA+PSA0MDApIHtcblx0XHRcdFx0XHRcdGVycm9yKEZBSUxVUkVfTUVTU0FHRSh4aHIuc3RhdHVzLCB4aHIuc3RhdHVzVGV4dCkpO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRlcnJvcihGQUlMVVJFX0VNUFRZX01FU1NBR0UpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH07XG5cdFx0eGhyLnNlbmQobnVsbCk7XG5cdH1cblxuXHQvKipcblx0ICogUGFyc2VzIHRoZSBnaXZlbiByYW5nZS5cblx0ICpcblx0ICogVGhpcyByZXR1cm5zIGEgcmFuZ2Ugd2l0aCBpbmNsdXNpdmUgZW5kcy5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkfSByYW5nZVxuXHQgKiBAcmV0dXJucyB7W251bWJlciwgbnVtYmVyIHwgdW5kZWZpbmVkXSB8IHVuZGVmaW5lZH1cblx0ICovXG5cdGZ1bmN0aW9uIHBhcnNlUmFuZ2UocmFuZ2UpIHtcblx0XHR2YXIgbSA9IC9eXFxzKihcXGQrKVxccyooPzooLClcXHMqKD86KFxcZCspXFxzKik/KT8kLy5leGVjKHJhbmdlIHx8ICcnKTtcblx0XHRpZiAobSkge1xuXHRcdFx0dmFyIHN0YXJ0ID0gTnVtYmVyKG1bMV0pO1xuXHRcdFx0dmFyIGNvbW1hID0gbVsyXTtcblx0XHRcdHZhciBlbmQgPSBtWzNdO1xuXG5cdFx0XHRpZiAoIWNvbW1hKSB7XG5cdFx0XHRcdHJldHVybiBbc3RhcnQsIHN0YXJ0XTtcblx0XHRcdH1cblx0XHRcdGlmICghZW5kKSB7XG5cdFx0XHRcdHJldHVybiBbc3RhcnQsIHVuZGVmaW5lZF07XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4gW3N0YXJ0LCBOdW1iZXIoZW5kKV07XG5cdFx0fVxuXHRcdHJldHVybiB1bmRlZmluZWQ7XG5cdH1cblxuXHRQcmlzbS5ob29rcy5hZGQoJ2JlZm9yZS1oaWdobGlnaHRhbGwnLCBmdW5jdGlvbiAoZW52KSB7XG5cdFx0ZW52LnNlbGVjdG9yICs9ICcsICcgKyBTRUxFQ1RPUjtcblx0fSk7XG5cblx0UHJpc20uaG9va3MuYWRkKCdiZWZvcmUtc2FuaXR5LWNoZWNrJywgZnVuY3Rpb24gKGVudikge1xuXHRcdHZhciBwcmUgPSAvKiogQHR5cGUge0hUTUxQcmVFbGVtZW50fSAqLyAoZW52LmVsZW1lbnQpO1xuXHRcdGlmIChwcmUubWF0Y2hlcyhTRUxFQ1RPUikpIHtcblx0XHRcdGVudi5jb2RlID0gJyc7IC8vIGZhc3QtcGF0aCB0aGUgd2hvbGUgdGhpbmcgYW5kIGdvIHRvIGNvbXBsZXRlXG5cblx0XHRcdHByZS5zZXRBdHRyaWJ1dGUoU1RBVFVTX0FUVFIsIFNUQVRVU19MT0FESU5HKTsgLy8gbWFyayBhcyBsb2FkaW5nXG5cblx0XHRcdC8vIGFkZCBjb2RlIGVsZW1lbnQgd2l0aCBsb2FkaW5nIG1lc3NhZ2Vcblx0XHRcdHZhciBjb2RlID0gcHJlLmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ0NPREUnKSk7XG5cdFx0XHRjb2RlLnRleHRDb250ZW50ID0gTE9BRElOR19NRVNTQUdFO1xuXG5cdFx0XHR2YXIgc3JjID0gcHJlLmdldEF0dHJpYnV0ZSgnZGF0YS1zcmMnKTtcblxuXHRcdFx0dmFyIGxhbmd1YWdlID0gZW52Lmxhbmd1YWdlO1xuXHRcdFx0aWYgKGxhbmd1YWdlID09PSAnbm9uZScpIHtcblx0XHRcdFx0Ly8gdGhlIGxhbmd1YWdlIG1pZ2h0IGJlICdub25lJyBiZWNhdXNlIHRoZXJlIGlzIG5vIGxhbmd1YWdlIHNldDtcblx0XHRcdFx0Ly8gaW4gdGhpcyBjYXNlLCB3ZSB3YW50IHRvIHVzZSB0aGUgZXh0ZW5zaW9uIGFzIHRoZSBsYW5ndWFnZVxuXHRcdFx0XHR2YXIgZXh0ZW5zaW9uID0gKC9cXC4oXFx3KykkLy5leGVjKHNyYykgfHwgWywgJ25vbmUnXSlbMV07XG5cdFx0XHRcdGxhbmd1YWdlID0gRVhURU5TSU9OU1tleHRlbnNpb25dIHx8IGV4dGVuc2lvbjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc2V0IGxhbmd1YWdlIGNsYXNzZXNcblx0XHRcdFByaXNtLnV0aWwuc2V0TGFuZ3VhZ2UoY29kZSwgbGFuZ3VhZ2UpO1xuXHRcdFx0UHJpc20udXRpbC5zZXRMYW5ndWFnZShwcmUsIGxhbmd1YWdlKTtcblxuXHRcdFx0Ly8gcHJlbG9hZCB0aGUgbGFuZ3VhZ2Vcblx0XHRcdHZhciBhdXRvbG9hZGVyID0gUHJpc20ucGx1Z2lucy5hdXRvbG9hZGVyO1xuXHRcdFx0aWYgKGF1dG9sb2FkZXIpIHtcblx0XHRcdFx0YXV0b2xvYWRlci5sb2FkTGFuZ3VhZ2VzKGxhbmd1YWdlKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gbG9hZCBmaWxlXG5cdFx0XHRsb2FkRmlsZShcblx0XHRcdFx0c3JjLFxuXHRcdFx0XHRmdW5jdGlvbiAodGV4dCkge1xuXHRcdFx0XHRcdC8vIG1hcmsgYXMgbG9hZGVkXG5cdFx0XHRcdFx0cHJlLnNldEF0dHJpYnV0ZShTVEFUVVNfQVRUUiwgU1RBVFVTX0xPQURFRCk7XG5cblx0XHRcdFx0XHQvLyBoYW5kbGUgZGF0YS1yYW5nZVxuXHRcdFx0XHRcdHZhciByYW5nZSA9IHBhcnNlUmFuZ2UocHJlLmdldEF0dHJpYnV0ZSgnZGF0YS1yYW5nZScpKTtcblx0XHRcdFx0XHRpZiAocmFuZ2UpIHtcblx0XHRcdFx0XHRcdHZhciBsaW5lcyA9IHRleHQuc3BsaXQoL1xcclxcbj98XFxuL2cpO1xuXG5cdFx0XHRcdFx0XHQvLyB0aGUgcmFuZ2UgaXMgb25lLWJhc2VkIGFuZCBpbmNsdXNpdmUgb24gYm90aCBlbmRzXG5cdFx0XHRcdFx0XHR2YXIgc3RhcnQgPSByYW5nZVswXTtcblx0XHRcdFx0XHRcdHZhciBlbmQgPSByYW5nZVsxXSA9PSBudWxsID8gbGluZXMubGVuZ3RoIDogcmFuZ2VbMV07XG5cblx0XHRcdFx0XHRcdGlmIChzdGFydCA8IDApIHsgc3RhcnQgKz0gbGluZXMubGVuZ3RoOyB9XG5cdFx0XHRcdFx0XHRzdGFydCA9IE1hdGgubWF4KDAsIE1hdGgubWluKHN0YXJ0IC0gMSwgbGluZXMubGVuZ3RoKSk7XG5cdFx0XHRcdFx0XHRpZiAoZW5kIDwgMCkgeyBlbmQgKz0gbGluZXMubGVuZ3RoOyB9XG5cdFx0XHRcdFx0XHRlbmQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihlbmQsIGxpbmVzLmxlbmd0aCkpO1xuXG5cdFx0XHRcdFx0XHR0ZXh0ID0gbGluZXMuc2xpY2Uoc3RhcnQsIGVuZCkuam9pbignXFxuJyk7XG5cblx0XHRcdFx0XHRcdC8vIGFkZCBkYXRhLXN0YXJ0IGZvciBsaW5lIG51bWJlcnNcblx0XHRcdFx0XHRcdGlmICghcHJlLmhhc0F0dHJpYnV0ZSgnZGF0YS1zdGFydCcpKSB7XG5cdFx0XHRcdFx0XHRcdHByZS5zZXRBdHRyaWJ1dGUoJ2RhdGEtc3RhcnQnLCBTdHJpbmcoc3RhcnQgKyAxKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gaGlnaGxpZ2h0IGNvZGVcblx0XHRcdFx0XHRjb2RlLnRleHRDb250ZW50ID0gdGV4dDtcblx0XHRcdFx0XHRQcmlzbS5oaWdobGlnaHRFbGVtZW50KGNvZGUpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRmdW5jdGlvbiAoZXJyb3IpIHtcblx0XHRcdFx0XHQvLyBtYXJrIGFzIGZhaWxlZFxuXHRcdFx0XHRcdHByZS5zZXRBdHRyaWJ1dGUoU1RBVFVTX0FUVFIsIFNUQVRVU19GQUlMRUQpO1xuXG5cdFx0XHRcdFx0Y29kZS50ZXh0Q29udGVudCA9IGVycm9yO1xuXHRcdFx0XHR9XG5cdFx0XHQpO1xuXHRcdH1cblx0fSk7XG5cblx0UHJpc20ucGx1Z2lucy5maWxlSGlnaGxpZ2h0ID0ge1xuXHRcdC8qKlxuXHRcdCAqIEV4ZWN1dGVzIHRoZSBGaWxlIEhpZ2hsaWdodCBwbHVnaW4gZm9yIGFsbCBtYXRjaGluZyBgcHJlYCBlbGVtZW50cyB1bmRlciB0aGUgZ2l2ZW4gY29udGFpbmVyLlxuXHRcdCAqXG5cdFx0ICogTm90ZTogRWxlbWVudHMgd2hpY2ggYXJlIGFscmVhZHkgbG9hZGVkIG9yIGN1cnJlbnRseSBsb2FkaW5nIHdpbGwgbm90IGJlIHRvdWNoZWQgYnkgdGhpcyBtZXRob2QuXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge1BhcmVudE5vZGV9IFtjb250YWluZXI9ZG9jdW1lbnRdXG5cdFx0ICovXG5cdFx0aGlnaGxpZ2h0OiBmdW5jdGlvbiBoaWdobGlnaHQoY29udGFpbmVyKSB7XG5cdFx0XHR2YXIgZWxlbWVudHMgPSAoY29udGFpbmVyIHx8IGRvY3VtZW50KS5xdWVyeVNlbGVjdG9yQWxsKFNFTEVDVE9SKTtcblxuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGVsZW1lbnQ7IChlbGVtZW50ID0gZWxlbWVudHNbaSsrXSk7KSB7XG5cdFx0XHRcdFByaXNtLmhpZ2hsaWdodEVsZW1lbnQoZWxlbWVudCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9O1xuXG5cdHZhciBsb2dnZWQgPSBmYWxzZTtcblx0LyoqIEBkZXByZWNhdGVkIFVzZSBgUHJpc20ucGx1Z2lucy5maWxlSGlnaGxpZ2h0LmhpZ2hsaWdodGAgaW5zdGVhZC4gKi9cblx0UHJpc20uZmlsZUhpZ2hsaWdodCA9IGZ1bmN0aW9uICgpIHtcblx0XHRpZiAoIWxvZ2dlZCkge1xuXHRcdFx0Y29uc29sZS53YXJuKCdQcmlzbS5maWxlSGlnaGxpZ2h0IGlzIGRlcHJlY2F0ZWQuIFVzZSBgUHJpc20ucGx1Z2lucy5maWxlSGlnaGxpZ2h0LmhpZ2hsaWdodGAgaW5zdGVhZC4nKTtcblx0XHRcdGxvZ2dlZCA9IHRydWU7XG5cdFx0fVxuXHRcdFByaXNtLnBsdWdpbnMuZmlsZUhpZ2hsaWdodC5oaWdobGlnaHQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcblx0fTtcblxufSgpKTtcbiIsIi8vIFRoZSBwcm9ncmFtbWluZyBnb2FscyBvZiBTcGxpdC5qcyBhcmUgdG8gZGVsaXZlciByZWFkYWJsZSwgdW5kZXJzdGFuZGFibGUgYW5kXG4vLyBtYWludGFpbmFibGUgY29kZSwgd2hpbGUgYXQgdGhlIHNhbWUgdGltZSBtYW51YWxseSBvcHRpbWl6aW5nIGZvciB0aW55IG1pbmlmaWVkIGZpbGUgc2l6ZSxcbi8vIGJyb3dzZXIgY29tcGF0aWJpbGl0eSB3aXRob3V0IGFkZGl0aW9uYWwgcmVxdWlyZW1lbnRzXG4vLyBhbmQgdmVyeSBmZXcgYXNzdW1wdGlvbnMgYWJvdXQgdGhlIHVzZXIncyBwYWdlIGxheW91dC5cbnZhciBnbG9iYWwgPSB0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyA/IHdpbmRvdyA6IG51bGw7XG52YXIgc3NyID0gZ2xvYmFsID09PSBudWxsO1xudmFyIGRvY3VtZW50ID0gIXNzciA/IGdsb2JhbC5kb2N1bWVudCA6IHVuZGVmaW5lZDtcblxuLy8gU2F2ZSBhIGNvdXBsZSBsb25nIGZ1bmN0aW9uIG5hbWVzIHRoYXQgYXJlIHVzZWQgZnJlcXVlbnRseS5cbi8vIFRoaXMgb3B0aW1pemF0aW9uIHNhdmVzIGFyb3VuZCA0MDAgYnl0ZXMuXG52YXIgYWRkRXZlbnRMaXN0ZW5lciA9ICdhZGRFdmVudExpc3RlbmVyJztcbnZhciByZW1vdmVFdmVudExpc3RlbmVyID0gJ3JlbW92ZUV2ZW50TGlzdGVuZXInO1xudmFyIGdldEJvdW5kaW5nQ2xpZW50UmVjdCA9ICdnZXRCb3VuZGluZ0NsaWVudFJlY3QnO1xudmFyIGd1dHRlclN0YXJ0RHJhZ2dpbmcgPSAnX2EnO1xudmFyIGFHdXR0ZXJTaXplID0gJ19iJztcbnZhciBiR3V0dGVyU2l6ZSA9ICdfYyc7XG52YXIgSE9SSVpPTlRBTCA9ICdob3Jpem9udGFsJztcbnZhciBOT09QID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gZmFsc2U7IH07XG5cbi8vIEhlbHBlciBmdW5jdGlvbiBkZXRlcm1pbmVzIHdoaWNoIHByZWZpeGVzIG9mIENTUyBjYWxjIHdlIG5lZWQuXG4vLyBXZSBvbmx5IG5lZWQgdG8gZG8gdGhpcyBvbmNlIG9uIHN0YXJ0dXAsIHdoZW4gdGhpcyBhbm9ueW1vdXMgZnVuY3Rpb24gaXMgY2FsbGVkLlxuLy9cbi8vIFRlc3RzIC13ZWJraXQsIC1tb3ogYW5kIC1vIHByZWZpeGVzLiBNb2RpZmllZCBmcm9tIFN0YWNrT3ZlcmZsb3c6XG4vLyBodHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzE2NjI1MTQwL2pzLWZlYXR1cmUtZGV0ZWN0aW9uLXRvLWRldGVjdC10aGUtdXNhZ2Utb2Ytd2Via2l0LWNhbGMtb3Zlci1jYWxjLzE2NjI1MTY3IzE2NjI1MTY3XG52YXIgY2FsYyA9IHNzclxuICAgID8gJ2NhbGMnXG4gICAgOiAoKFsnJywgJy13ZWJraXQtJywgJy1tb3otJywgJy1vLSddXG4gICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAocHJlZml4KSB7XG4gICAgICAgICAgICAgIHZhciBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgICBlbC5zdHlsZS5jc3NUZXh0ID0gXCJ3aWR0aDpcIiArIHByZWZpeCArIFwiY2FsYyg5cHgpXCI7XG5cbiAgICAgICAgICAgICAgcmV0dXJuICEhZWwuc3R5bGUubGVuZ3RoXG4gICAgICAgICAgfSlcbiAgICAgICAgICAuc2hpZnQoKSkgKyBcImNhbGNcIik7XG5cbi8vIEhlbHBlciBmdW5jdGlvbiBjaGVja3MgaWYgaXRzIGFyZ3VtZW50IGlzIGEgc3RyaW5nLWxpa2UgdHlwZVxudmFyIGlzU3RyaW5nID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHR5cGVvZiB2ID09PSAnc3RyaW5nJyB8fCB2IGluc3RhbmNlb2YgU3RyaW5nOyB9O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gYWxsb3dzIGVsZW1lbnRzIGFuZCBzdHJpbmcgc2VsZWN0b3JzIHRvIGJlIHVzZWRcbi8vIGludGVyY2hhbmdlYWJseS4gSW4gZWl0aGVyIGNhc2UgYW4gZWxlbWVudCBpcyByZXR1cm5lZC4gVGhpcyBhbGxvd3MgdXMgdG9cbi8vIGRvIGBTcGxpdChbZWxlbTEsIGVsZW0yXSlgIGFzIHdlbGwgYXMgYFNwbGl0KFsnI2lkMScsICcjaWQyJ10pYC5cbnZhciBlbGVtZW50T3JTZWxlY3RvciA9IGZ1bmN0aW9uIChlbCkge1xuICAgIGlmIChpc1N0cmluZyhlbCkpIHtcbiAgICAgICAgdmFyIGVsZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoZWwpO1xuICAgICAgICBpZiAoIWVsZSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKChcIlNlbGVjdG9yIFwiICsgZWwgKyBcIiBkaWQgbm90IG1hdGNoIGEgRE9NIGVsZW1lbnRcIikpXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGVsZVxuICAgIH1cblxuICAgIHJldHVybiBlbFxufTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIGdldHMgYSBwcm9wZXJ0eSBmcm9tIHRoZSBwcm9wZXJ0aWVzIG9iamVjdCwgd2l0aCBhIGRlZmF1bHQgZmFsbGJhY2tcbnZhciBnZXRPcHRpb24gPSBmdW5jdGlvbiAob3B0aW9ucywgcHJvcE5hbWUsIGRlZikge1xuICAgIHZhciB2YWx1ZSA9IG9wdGlvbnNbcHJvcE5hbWVdO1xuICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZVxuICAgIH1cbiAgICByZXR1cm4gZGVmXG59O1xuXG52YXIgZ2V0R3V0dGVyU2l6ZSA9IGZ1bmN0aW9uIChndXR0ZXJTaXplLCBpc0ZpcnN0LCBpc0xhc3QsIGd1dHRlckFsaWduKSB7XG4gICAgaWYgKGlzRmlyc3QpIHtcbiAgICAgICAgaWYgKGd1dHRlckFsaWduID09PSAnZW5kJykge1xuICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ3V0dGVyQWxpZ24gPT09ICdjZW50ZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gZ3V0dGVyU2l6ZSAvIDJcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNMYXN0KSB7XG4gICAgICAgIGlmIChndXR0ZXJBbGlnbiA9PT0gJ3N0YXJ0Jykge1xuICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgfVxuICAgICAgICBpZiAoZ3V0dGVyQWxpZ24gPT09ICdjZW50ZXInKSB7XG4gICAgICAgICAgICByZXR1cm4gZ3V0dGVyU2l6ZSAvIDJcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBndXR0ZXJTaXplXG59O1xuXG4vLyBEZWZhdWx0IG9wdGlvbnNcbnZhciBkZWZhdWx0R3V0dGVyRm4gPSBmdW5jdGlvbiAoaSwgZ3V0dGVyRGlyZWN0aW9uKSB7XG4gICAgdmFyIGd1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIGd1dC5jbGFzc05hbWUgPSBcImd1dHRlciBndXR0ZXItXCIgKyBndXR0ZXJEaXJlY3Rpb247XG4gICAgcmV0dXJuIGd1dFxufTtcblxudmFyIGRlZmF1bHRFbGVtZW50U3R5bGVGbiA9IGZ1bmN0aW9uIChkaW0sIHNpemUsIGd1dFNpemUpIHtcbiAgICB2YXIgc3R5bGUgPSB7fTtcblxuICAgIGlmICghaXNTdHJpbmcoc2l6ZSkpIHtcbiAgICAgICAgc3R5bGVbZGltXSA9IGNhbGMgKyBcIihcIiArIHNpemUgKyBcIiUgLSBcIiArIGd1dFNpemUgKyBcInB4KVwiO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHN0eWxlW2RpbV0gPSBzaXplO1xuICAgIH1cblxuICAgIHJldHVybiBzdHlsZVxufTtcblxudmFyIGRlZmF1bHRHdXR0ZXJTdHlsZUZuID0gZnVuY3Rpb24gKGRpbSwgZ3V0U2l6ZSkge1xuICAgIHZhciBvYmo7XG5cbiAgICByZXR1cm4gKCggb2JqID0ge30sIG9ialtkaW1dID0gKGd1dFNpemUgKyBcInB4XCIpLCBvYmogKSk7XG59O1xuXG4vLyBUaGUgbWFpbiBmdW5jdGlvbiB0byBpbml0aWFsaXplIGEgc3BsaXQuIFNwbGl0LmpzIHRoaW5rcyBhYm91dCBlYWNoIHBhaXJcbi8vIG9mIGVsZW1lbnRzIGFzIGFuIGluZGVwZW5kYW50IHBhaXIuIERyYWdnaW5nIHRoZSBndXR0ZXIgYmV0d2VlbiB0d28gZWxlbWVudHNcbi8vIG9ubHkgY2hhbmdlcyB0aGUgZGltZW5zaW9ucyBvZiBlbGVtZW50cyBpbiB0aGF0IHBhaXIuIFRoaXMgaXMga2V5IHRvIHVuZGVyc3RhbmRpbmdcbi8vIGhvdyB0aGUgZm9sbG93aW5nIGZ1bmN0aW9ucyBvcGVyYXRlLCBzaW5jZSBlYWNoIGZ1bmN0aW9uIGlzIGJvdW5kIHRvIGEgcGFpci5cbi8vXG4vLyBBIHBhaXIgb2JqZWN0IGlzIHNoYXBlZCBsaWtlIHRoaXM6XG4vL1xuLy8ge1xuLy8gICAgIGE6IERPTSBlbGVtZW50LFxuLy8gICAgIGI6IERPTSBlbGVtZW50LFxuLy8gICAgIGFNaW46IE51bWJlcixcbi8vICAgICBiTWluOiBOdW1iZXIsXG4vLyAgICAgZHJhZ2dpbmc6IEJvb2xlYW4sXG4vLyAgICAgcGFyZW50OiBET00gZWxlbWVudCxcbi8vICAgICBkaXJlY3Rpb246ICdob3Jpem9udGFsJyB8ICd2ZXJ0aWNhbCdcbi8vIH1cbi8vXG4vLyBUaGUgYmFzaWMgc2VxdWVuY2U6XG4vL1xuLy8gMS4gU2V0IGRlZmF1bHRzIHRvIHNvbWV0aGluZyBzYW5lLiBgb3B0aW9uc2AgZG9lc24ndCBoYXZlIHRvIGJlIHBhc3NlZCBhdCBhbGwuXG4vLyAyLiBJbml0aWFsaXplIGEgYnVuY2ggb2Ygc3RyaW5ncyBiYXNlZCBvbiB0aGUgZGlyZWN0aW9uIHdlJ3JlIHNwbGl0dGluZy5cbi8vICAgIEEgbG90IG9mIHRoZSBiZWhhdmlvciBpbiB0aGUgcmVzdCBvZiB0aGUgbGlicmFyeSBpcyBwYXJhbWF0aXplZCBkb3duIHRvXG4vLyAgICByZWx5IG9uIENTUyBzdHJpbmdzIGFuZCBjbGFzc2VzLlxuLy8gMy4gRGVmaW5lIHRoZSBkcmFnZ2luZyBoZWxwZXIgZnVuY3Rpb25zLCBhbmQgYSBmZXcgaGVscGVycyB0byBnbyB3aXRoIHRoZW0uXG4vLyA0LiBMb29wIHRocm91Z2ggdGhlIGVsZW1lbnRzIHdoaWxlIHBhaXJpbmcgdGhlbSBvZmYuIEV2ZXJ5IHBhaXIgZ2V0cyBhblxuLy8gICAgYHBhaXJgIG9iamVjdCBhbmQgYSBndXR0ZXIuXG4vLyA1LiBBY3R1YWxseSBzaXplIHRoZSBwYWlyIGVsZW1lbnRzLCBpbnNlcnQgZ3V0dGVycyBhbmQgYXR0YWNoIGV2ZW50IGxpc3RlbmVycy5cbnZhciBTcGxpdCA9IGZ1bmN0aW9uIChpZHNPcHRpb24sIG9wdGlvbnMpIHtcbiAgICBpZiAoIG9wdGlvbnMgPT09IHZvaWQgMCApIG9wdGlvbnMgPSB7fTtcblxuICAgIGlmIChzc3IpIHsgcmV0dXJuIHt9IH1cblxuICAgIHZhciBpZHMgPSBpZHNPcHRpb247XG4gICAgdmFyIGRpbWVuc2lvbjtcbiAgICB2YXIgY2xpZW50QXhpcztcbiAgICB2YXIgcG9zaXRpb247XG4gICAgdmFyIHBvc2l0aW9uRW5kO1xuICAgIHZhciBjbGllbnRTaXplO1xuICAgIHZhciBlbGVtZW50cztcblxuICAgIC8vIEFsbG93IEhUTUxDb2xsZWN0aW9uIHRvIGJlIHVzZWQgYXMgYW4gYXJndW1lbnQgd2hlbiBzdXBwb3J0ZWRcbiAgICBpZiAoQXJyYXkuZnJvbSkge1xuICAgICAgICBpZHMgPSBBcnJheS5mcm9tKGlkcyk7XG4gICAgfVxuXG4gICAgLy8gQWxsIERPTSBlbGVtZW50cyBpbiB0aGUgc3BsaXQgc2hvdWxkIGhhdmUgYSBjb21tb24gcGFyZW50LiBXZSBjYW4gZ3JhYlxuICAgIC8vIHRoZSBmaXJzdCBlbGVtZW50cyBwYXJlbnQgYW5kIGhvcGUgdXNlcnMgcmVhZCB0aGUgZG9jcyBiZWNhdXNlIHRoZVxuICAgIC8vIGJlaGF2aW9yIHdpbGwgYmUgd2hhY2t5IG90aGVyd2lzZS5cbiAgICB2YXIgZmlyc3RFbGVtZW50ID0gZWxlbWVudE9yU2VsZWN0b3IoaWRzWzBdKTtcbiAgICB2YXIgcGFyZW50ID0gZmlyc3RFbGVtZW50LnBhcmVudE5vZGU7XG4gICAgdmFyIHBhcmVudFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZSA/IGdldENvbXB1dGVkU3R5bGUocGFyZW50KSA6IG51bGw7XG4gICAgdmFyIHBhcmVudEZsZXhEaXJlY3Rpb24gPSBwYXJlbnRTdHlsZSA/IHBhcmVudFN0eWxlLmZsZXhEaXJlY3Rpb24gOiBudWxsO1xuXG4gICAgLy8gU2V0IGRlZmF1bHQgb3B0aW9ucy5zaXplcyB0byBlcXVhbCBwZXJjZW50YWdlcyBvZiB0aGUgcGFyZW50IGVsZW1lbnQuXG4gICAgdmFyIHNpemVzID0gZ2V0T3B0aW9uKG9wdGlvbnMsICdzaXplcycpIHx8IGlkcy5tYXAoZnVuY3Rpb24gKCkgeyByZXR1cm4gMTAwIC8gaWRzLmxlbmd0aDsgfSk7XG5cbiAgICAvLyBTdGFuZGFyZGl6ZSBtaW5TaXplIGFuZCBtYXhTaXplIHRvIGFuIGFycmF5IGlmIGl0IGlzbid0IGFscmVhZHkuXG4gICAgLy8gVGhpcyBhbGxvd3MgbWluU2l6ZSBhbmQgbWF4U2l6ZSB0byBiZSBwYXNzZWQgYXMgYSBudW1iZXIuXG4gICAgdmFyIG1pblNpemUgPSBnZXRPcHRpb24ob3B0aW9ucywgJ21pblNpemUnLCAxMDApO1xuICAgIHZhciBtaW5TaXplcyA9IEFycmF5LmlzQXJyYXkobWluU2l6ZSkgPyBtaW5TaXplIDogaWRzLm1hcChmdW5jdGlvbiAoKSB7IHJldHVybiBtaW5TaXplOyB9KTtcbiAgICB2YXIgbWF4U2l6ZSA9IGdldE9wdGlvbihvcHRpb25zLCAnbWF4U2l6ZScsIEluZmluaXR5KTtcbiAgICB2YXIgbWF4U2l6ZXMgPSBBcnJheS5pc0FycmF5KG1heFNpemUpID8gbWF4U2l6ZSA6IGlkcy5tYXAoZnVuY3Rpb24gKCkgeyByZXR1cm4gbWF4U2l6ZTsgfSk7XG5cbiAgICAvLyBHZXQgb3RoZXIgb3B0aW9uc1xuICAgIHZhciBleHBhbmRUb01pbiA9IGdldE9wdGlvbihvcHRpb25zLCAnZXhwYW5kVG9NaW4nLCBmYWxzZSk7XG4gICAgdmFyIGd1dHRlclNpemUgPSBnZXRPcHRpb24ob3B0aW9ucywgJ2d1dHRlclNpemUnLCAxMCk7XG4gICAgdmFyIGd1dHRlckFsaWduID0gZ2V0T3B0aW9uKG9wdGlvbnMsICdndXR0ZXJBbGlnbicsICdjZW50ZXInKTtcbiAgICB2YXIgc25hcE9mZnNldCA9IGdldE9wdGlvbihvcHRpb25zLCAnc25hcE9mZnNldCcsIDMwKTtcbiAgICB2YXIgc25hcE9mZnNldHMgPSBBcnJheS5pc0FycmF5KHNuYXBPZmZzZXQpID8gc25hcE9mZnNldCA6IGlkcy5tYXAoZnVuY3Rpb24gKCkgeyByZXR1cm4gc25hcE9mZnNldDsgfSk7XG4gICAgdmFyIGRyYWdJbnRlcnZhbCA9IGdldE9wdGlvbihvcHRpb25zLCAnZHJhZ0ludGVydmFsJywgMSk7XG4gICAgdmFyIGRpcmVjdGlvbiA9IGdldE9wdGlvbihvcHRpb25zLCAnZGlyZWN0aW9uJywgSE9SSVpPTlRBTCk7XG4gICAgdmFyIGN1cnNvciA9IGdldE9wdGlvbihcbiAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgJ2N1cnNvcicsXG4gICAgICAgIGRpcmVjdGlvbiA9PT0gSE9SSVpPTlRBTCA/ICdjb2wtcmVzaXplJyA6ICdyb3ctcmVzaXplJ1xuICAgICk7XG4gICAgdmFyIGd1dHRlciA9IGdldE9wdGlvbihvcHRpb25zLCAnZ3V0dGVyJywgZGVmYXVsdEd1dHRlckZuKTtcbiAgICB2YXIgZWxlbWVudFN0eWxlID0gZ2V0T3B0aW9uKFxuICAgICAgICBvcHRpb25zLFxuICAgICAgICAnZWxlbWVudFN0eWxlJyxcbiAgICAgICAgZGVmYXVsdEVsZW1lbnRTdHlsZUZuXG4gICAgKTtcbiAgICB2YXIgZ3V0dGVyU3R5bGUgPSBnZXRPcHRpb24ob3B0aW9ucywgJ2d1dHRlclN0eWxlJywgZGVmYXVsdEd1dHRlclN0eWxlRm4pO1xuXG4gICAgLy8gMi4gSW5pdGlhbGl6ZSBhIGJ1bmNoIG9mIHN0cmluZ3MgYmFzZWQgb24gdGhlIGRpcmVjdGlvbiB3ZSdyZSBzcGxpdHRpbmcuXG4gICAgLy8gQSBsb3Qgb2YgdGhlIGJlaGF2aW9yIGluIHRoZSByZXN0IG9mIHRoZSBsaWJyYXJ5IGlzIHBhcmFtYXRpemVkIGRvd24gdG9cbiAgICAvLyByZWx5IG9uIENTUyBzdHJpbmdzIGFuZCBjbGFzc2VzLlxuICAgIGlmIChkaXJlY3Rpb24gPT09IEhPUklaT05UQUwpIHtcbiAgICAgICAgZGltZW5zaW9uID0gJ3dpZHRoJztcbiAgICAgICAgY2xpZW50QXhpcyA9ICdjbGllbnRYJztcbiAgICAgICAgcG9zaXRpb24gPSAnbGVmdCc7XG4gICAgICAgIHBvc2l0aW9uRW5kID0gJ3JpZ2h0JztcbiAgICAgICAgY2xpZW50U2l6ZSA9ICdjbGllbnRXaWR0aCc7XG4gICAgfSBlbHNlIGlmIChkaXJlY3Rpb24gPT09ICd2ZXJ0aWNhbCcpIHtcbiAgICAgICAgZGltZW5zaW9uID0gJ2hlaWdodCc7XG4gICAgICAgIGNsaWVudEF4aXMgPSAnY2xpZW50WSc7XG4gICAgICAgIHBvc2l0aW9uID0gJ3RvcCc7XG4gICAgICAgIHBvc2l0aW9uRW5kID0gJ2JvdHRvbSc7XG4gICAgICAgIGNsaWVudFNpemUgPSAnY2xpZW50SGVpZ2h0JztcbiAgICB9XG5cbiAgICAvLyAzLiBEZWZpbmUgdGhlIGRyYWdnaW5nIGhlbHBlciBmdW5jdGlvbnMsIGFuZCBhIGZldyBoZWxwZXJzIHRvIGdvIHdpdGggdGhlbS5cbiAgICAvLyBFYWNoIGhlbHBlciBpcyBib3VuZCB0byBhIHBhaXIgb2JqZWN0IHRoYXQgY29udGFpbnMgaXRzIG1ldGFkYXRhLiBUaGlzXG4gICAgLy8gYWxzbyBtYWtlcyBpdCBlYXN5IHRvIHN0b3JlIHJlZmVyZW5jZXMgdG8gbGlzdGVuZXJzIHRoYXQgdGhhdCB3aWxsIGJlXG4gICAgLy8gYWRkZWQgYW5kIHJlbW92ZWQuXG4gICAgLy9cbiAgICAvLyBFdmVuIHRob3VnaCB0aGVyZSBhcmUgbm8gb3RoZXIgZnVuY3Rpb25zIGNvbnRhaW5lZCBpbiB0aGVtLCBhbGlhc2luZ1xuICAgIC8vIHRoaXMgdG8gc2VsZiBzYXZlcyA1MCBieXRlcyBvciBzbyBzaW5jZSBpdCdzIHVzZWQgc28gZnJlcXVlbnRseS5cbiAgICAvL1xuICAgIC8vIFRoZSBwYWlyIG9iamVjdCBzYXZlcyBtZXRhZGF0YSBsaWtlIGRyYWdnaW5nIHN0YXRlLCBwb3NpdGlvbiBhbmRcbiAgICAvLyBldmVudCBsaXN0ZW5lciByZWZlcmVuY2VzLlxuXG4gICAgZnVuY3Rpb24gc2V0RWxlbWVudFNpemUoZWwsIHNpemUsIGd1dFNpemUsIGkpIHtcbiAgICAgICAgLy8gU3BsaXQuanMgYWxsb3dzIHNldHRpbmcgc2l6ZXMgdmlhIG51bWJlcnMgKGlkZWFsbHkpLCBvciBpZiB5b3UgbXVzdCxcbiAgICAgICAgLy8gYnkgc3RyaW5nLCBsaWtlICczMDBweCcuIFRoaXMgaXMgbGVzcyB0aGFuIGlkZWFsLCBiZWNhdXNlIGl0IGJyZWFrc1xuICAgICAgICAvLyB0aGUgZmx1aWQgbGF5b3V0IHRoYXQgYGNhbGMoJSAtIHB4KWAgcHJvdmlkZXMuIFlvdSdyZSBvbiB5b3VyIG93biBpZiB5b3UgZG8gdGhhdCxcbiAgICAgICAgLy8gbWFrZSBzdXJlIHlvdSBjYWxjdWxhdGUgdGhlIGd1dHRlciBzaXplIGJ5IGhhbmQuXG4gICAgICAgIHZhciBzdHlsZSA9IGVsZW1lbnRTdHlsZShkaW1lbnNpb24sIHNpemUsIGd1dFNpemUsIGkpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHN0eWxlKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgICAgICAgIGVsLnN0eWxlW3Byb3BdID0gc3R5bGVbcHJvcF07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIHNldEd1dHRlclNpemUoZ3V0dGVyRWxlbWVudCwgZ3V0U2l6ZSwgaSkge1xuICAgICAgICB2YXIgc3R5bGUgPSBndXR0ZXJTdHlsZShkaW1lbnNpb24sIGd1dFNpemUsIGkpO1xuXG4gICAgICAgIE9iamVjdC5rZXlzKHN0eWxlKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgICAgICAgIGd1dHRlckVsZW1lbnQuc3R5bGVbcHJvcF0gPSBzdHlsZVtwcm9wXTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U2l6ZXMoKSB7XG4gICAgICAgIHJldHVybiBlbGVtZW50cy5tYXAoZnVuY3Rpb24gKGVsZW1lbnQpIHsgcmV0dXJuIGVsZW1lbnQuc2l6ZTsgfSlcbiAgICB9XG5cbiAgICAvLyBTdXBwb3J0cyB0b3VjaCBldmVudHMsIGJ1dCBub3QgbXVsdGl0b3VjaCwgc28gb25seSB0aGUgZmlyc3RcbiAgICAvLyBmaW5nZXIgYHRvdWNoZXNbMF1gIGlzIGNvdW50ZWQuXG4gICAgZnVuY3Rpb24gZ2V0TW91c2VQb3NpdGlvbihlKSB7XG4gICAgICAgIGlmICgndG91Y2hlcycgaW4gZSkgeyByZXR1cm4gZS50b3VjaGVzWzBdW2NsaWVudEF4aXNdIH1cbiAgICAgICAgcmV0dXJuIGVbY2xpZW50QXhpc11cbiAgICB9XG5cbiAgICAvLyBBY3R1YWxseSBhZGp1c3QgdGhlIHNpemUgb2YgZWxlbWVudHMgYGFgIGFuZCBgYmAgdG8gYG9mZnNldGAgd2hpbGUgZHJhZ2dpbmcuXG4gICAgLy8gY2FsYyBpcyB1c2VkIHRvIGFsbG93IGNhbGMocGVyY2VudGFnZSArIGd1dHRlcnB4KSBvbiB0aGUgd2hvbGUgc3BsaXQgaW5zdGFuY2UsXG4gICAgLy8gd2hpY2ggYWxsb3dzIHRoZSB2aWV3cG9ydCB0byBiZSByZXNpemVkIHdpdGhvdXQgYWRkaXRpb25hbCBsb2dpYy5cbiAgICAvLyBFbGVtZW50IGEncyBzaXplIGlzIHRoZSBzYW1lIGFzIG9mZnNldC4gYidzIHNpemUgaXMgdG90YWwgc2l6ZSAtIGEgc2l6ZS5cbiAgICAvLyBCb3RoIHNpemVzIGFyZSBjYWxjdWxhdGVkIGZyb20gdGhlIGluaXRpYWwgcGFyZW50IHBlcmNlbnRhZ2UsXG4gICAgLy8gdGhlbiB0aGUgZ3V0dGVyIHNpemUgaXMgc3VidHJhY3RlZC5cbiAgICBmdW5jdGlvbiBhZGp1c3Qob2Zmc2V0KSB7XG4gICAgICAgIHZhciBhID0gZWxlbWVudHNbdGhpcy5hXTtcbiAgICAgICAgdmFyIGIgPSBlbGVtZW50c1t0aGlzLmJdO1xuICAgICAgICB2YXIgcGVyY2VudGFnZSA9IGEuc2l6ZSArIGIuc2l6ZTtcblxuICAgICAgICBhLnNpemUgPSAob2Zmc2V0IC8gdGhpcy5zaXplKSAqIHBlcmNlbnRhZ2U7XG4gICAgICAgIGIuc2l6ZSA9IHBlcmNlbnRhZ2UgLSAob2Zmc2V0IC8gdGhpcy5zaXplKSAqIHBlcmNlbnRhZ2U7XG5cbiAgICAgICAgc2V0RWxlbWVudFNpemUoYS5lbGVtZW50LCBhLnNpemUsIHRoaXNbYUd1dHRlclNpemVdLCBhLmkpO1xuICAgICAgICBzZXRFbGVtZW50U2l6ZShiLmVsZW1lbnQsIGIuc2l6ZSwgdGhpc1tiR3V0dGVyU2l6ZV0sIGIuaSk7XG4gICAgfVxuXG4gICAgLy8gZHJhZywgd2hlcmUgYWxsIHRoZSBtYWdpYyBoYXBwZW5zLiBUaGUgbG9naWMgaXMgcmVhbGx5IHF1aXRlIHNpbXBsZTpcbiAgICAvL1xuICAgIC8vIDEuIElnbm9yZSBpZiB0aGUgcGFpciBpcyBub3QgZHJhZ2dpbmcuXG4gICAgLy8gMi4gR2V0IHRoZSBvZmZzZXQgb2YgdGhlIGV2ZW50LlxuICAgIC8vIDMuIFNuYXAgb2Zmc2V0IHRvIG1pbiBpZiB3aXRoaW4gc25hcHBhYmxlIHJhbmdlICh3aXRoaW4gbWluICsgc25hcE9mZnNldCkuXG4gICAgLy8gNC4gQWN0dWFsbHkgYWRqdXN0IGVhY2ggZWxlbWVudCBpbiB0aGUgcGFpciB0byBvZmZzZXQuXG4gICAgLy9cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB8ICAgIHwgPC0gYS5taW5TaXplICAgICAgICAgICAgICAgfHwgICAgICAgICAgICAgIGIubWluU2l6ZSAtPiB8ICAgIHxcbiAgICAvLyB8ICAgIHwgIHwgPC0gdGhpcy5zbmFwT2Zmc2V0ICAgICAgfHwgICAgIHRoaXMuc25hcE9mZnNldCAtPiB8ICB8ICAgIHxcbiAgICAvLyB8ICAgIHwgIHwgICAgICAgICAgICAgICAgICAgICAgICAgfHwgICAgICAgICAgICAgICAgICAgICAgICB8ICB8ICAgIHxcbiAgICAvLyB8ICAgIHwgIHwgICAgICAgICAgICAgICAgICAgICAgICAgfHwgICAgICAgICAgICAgICAgICAgICAgICB8ICB8ICAgIHxcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB8IDwtIHRoaXMuc3RhcnQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zaXplIC0+IHxcbiAgICBmdW5jdGlvbiBkcmFnKGUpIHtcbiAgICAgICAgdmFyIG9mZnNldDtcbiAgICAgICAgdmFyIGEgPSBlbGVtZW50c1t0aGlzLmFdO1xuICAgICAgICB2YXIgYiA9IGVsZW1lbnRzW3RoaXMuYl07XG5cbiAgICAgICAgaWYgKCF0aGlzLmRyYWdnaW5nKSB7IHJldHVybiB9XG5cbiAgICAgICAgLy8gR2V0IHRoZSBvZmZzZXQgb2YgdGhlIGV2ZW50IGZyb20gdGhlIGZpcnN0IHNpZGUgb2YgdGhlXG4gICAgICAgIC8vIHBhaXIgYHRoaXMuc3RhcnRgLiBUaGVuIG9mZnNldCBieSB0aGUgaW5pdGlhbCBwb3NpdGlvbiBvZiB0aGVcbiAgICAgICAgLy8gbW91c2UgY29tcGFyZWQgdG8gdGhlIGd1dHRlciBzaXplLlxuICAgICAgICBvZmZzZXQgPVxuICAgICAgICAgICAgZ2V0TW91c2VQb3NpdGlvbihlKSAtXG4gICAgICAgICAgICB0aGlzLnN0YXJ0ICtcbiAgICAgICAgICAgICh0aGlzW2FHdXR0ZXJTaXplXSAtIHRoaXMuZHJhZ09mZnNldCk7XG5cbiAgICAgICAgaWYgKGRyYWdJbnRlcnZhbCA+IDEpIHtcbiAgICAgICAgICAgIG9mZnNldCA9IE1hdGgucm91bmQob2Zmc2V0IC8gZHJhZ0ludGVydmFsKSAqIGRyYWdJbnRlcnZhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIElmIHdpdGhpbiBzbmFwT2Zmc2V0IG9mIG1pbiBvciBtYXgsIHNldCBvZmZzZXQgdG8gbWluIG9yIG1heC5cbiAgICAgICAgLy8gc25hcE9mZnNldCBidWZmZXJzIGEubWluU2l6ZSBhbmQgYi5taW5TaXplLCBzbyBsb2dpYyBpcyBvcHBvc2l0ZSBmb3IgYm90aC5cbiAgICAgICAgLy8gSW5jbHVkZSB0aGUgYXBwcm9wcmlhdGUgZ3V0dGVyIHNpemVzIHRvIHByZXZlbnQgb3ZlcmZsb3dzLlxuICAgICAgICBpZiAob2Zmc2V0IDw9IGEubWluU2l6ZSArIGEuc25hcE9mZnNldCArIHRoaXNbYUd1dHRlclNpemVdKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBhLm1pblNpemUgKyB0aGlzW2FHdXR0ZXJTaXplXTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIG9mZnNldCA+PVxuICAgICAgICAgICAgdGhpcy5zaXplIC0gKGIubWluU2l6ZSArIGIuc25hcE9mZnNldCArIHRoaXNbYkd1dHRlclNpemVdKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIG9mZnNldCA9IHRoaXMuc2l6ZSAtIChiLm1pblNpemUgKyB0aGlzW2JHdXR0ZXJTaXplXSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAob2Zmc2V0ID49IGEubWF4U2l6ZSAtIGEuc25hcE9mZnNldCArIHRoaXNbYUd1dHRlclNpemVdKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBhLm1heFNpemUgKyB0aGlzW2FHdXR0ZXJTaXplXTtcbiAgICAgICAgfSBlbHNlIGlmIChcbiAgICAgICAgICAgIG9mZnNldCA8PVxuICAgICAgICAgICAgdGhpcy5zaXplIC0gKGIubWF4U2l6ZSAtIGIuc25hcE9mZnNldCArIHRoaXNbYkd1dHRlclNpemVdKVxuICAgICAgICApIHtcbiAgICAgICAgICAgIG9mZnNldCA9IHRoaXMuc2l6ZSAtIChiLm1heFNpemUgKyB0aGlzW2JHdXR0ZXJTaXplXSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBY3R1YWxseSBhZGp1c3QgdGhlIHNpemUuXG4gICAgICAgIGFkanVzdC5jYWxsKHRoaXMsIG9mZnNldCk7XG5cbiAgICAgICAgLy8gQ2FsbCB0aGUgZHJhZyBjYWxsYmFjayBjb250aW5vdXNseS4gRG9uJ3QgZG8gYW55dGhpbmcgdG9vIGludGVuc2l2ZVxuICAgICAgICAvLyBpbiB0aGlzIGNhbGxiYWNrLlxuICAgICAgICBnZXRPcHRpb24ob3B0aW9ucywgJ29uRHJhZycsIE5PT1ApKGdldFNpemVzKCkpO1xuICAgIH1cblxuICAgIC8vIENhY2hlIHNvbWUgaW1wb3J0YW50IHNpemVzIHdoZW4gZHJhZyBzdGFydHMsIHNvIHdlIGRvbid0IGhhdmUgdG8gZG8gdGhhdFxuICAgIC8vIGNvbnRpbm91c2x5OlxuICAgIC8vXG4gICAgLy8gYHNpemVgOiBUaGUgdG90YWwgc2l6ZSBvZiB0aGUgcGFpci4gRmlyc3QgKyBzZWNvbmQgKyBmaXJzdCBndXR0ZXIgKyBzZWNvbmQgZ3V0dGVyLlxuICAgIC8vIGBzdGFydGA6IFRoZSBsZWFkaW5nIHNpZGUgb2YgdGhlIGZpcnN0IGVsZW1lbnQuXG4gICAgLy9cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB8ICAgICAgYUd1dHRlclNpemUgLT4gfHx8ICAgICAgICAgICAgICAgICAgICAgIHxcbiAgICAvLyB8ICAgICAgICAgICAgICAgICAgICAgfHx8ICAgICAgICAgICAgICAgICAgICAgIHxcbiAgICAvLyB8ICAgICAgICAgICAgICAgICAgICAgfHx8ICAgICAgICAgICAgICAgICAgICAgIHxcbiAgICAvLyB8ICAgICAgICAgICAgICAgICAgICAgfHx8IDwtIGJHdXR0ZXJTaXplICAgICAgIHxcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB8IDwtIHN0YXJ0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzaXplIC0+IHxcbiAgICBmdW5jdGlvbiBjYWxjdWxhdGVTaXplcygpIHtcbiAgICAgICAgLy8gRmlndXJlIG91dCB0aGUgcGFyZW50IHNpemUgbWludXMgcGFkZGluZy5cbiAgICAgICAgdmFyIGEgPSBlbGVtZW50c1t0aGlzLmFdLmVsZW1lbnQ7XG4gICAgICAgIHZhciBiID0gZWxlbWVudHNbdGhpcy5iXS5lbGVtZW50O1xuXG4gICAgICAgIHZhciBhQm91bmRzID0gYVtnZXRCb3VuZGluZ0NsaWVudFJlY3RdKCk7XG4gICAgICAgIHZhciBiQm91bmRzID0gYltnZXRCb3VuZGluZ0NsaWVudFJlY3RdKCk7XG5cbiAgICAgICAgdGhpcy5zaXplID1cbiAgICAgICAgICAgIGFCb3VuZHNbZGltZW5zaW9uXSArXG4gICAgICAgICAgICBiQm91bmRzW2RpbWVuc2lvbl0gK1xuICAgICAgICAgICAgdGhpc1thR3V0dGVyU2l6ZV0gK1xuICAgICAgICAgICAgdGhpc1tiR3V0dGVyU2l6ZV07XG4gICAgICAgIHRoaXMuc3RhcnQgPSBhQm91bmRzW3Bvc2l0aW9uXTtcbiAgICAgICAgdGhpcy5lbmQgPSBhQm91bmRzW3Bvc2l0aW9uRW5kXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbm5lclNpemUoZWxlbWVudCkge1xuICAgICAgICAvLyBSZXR1cm4gbm90aGluZyBpZiBnZXRDb21wdXRlZFN0eWxlIGlzIG5vdCBzdXBwb3J0ZWQgKDwgSUU5KVxuICAgICAgICAvLyBPciBpZiBwYXJlbnQgZWxlbWVudCBoYXMgbm8gbGF5b3V0IHlldFxuICAgICAgICBpZiAoIWdldENvbXB1dGVkU3R5bGUpIHsgcmV0dXJuIG51bGwgfVxuXG4gICAgICAgIHZhciBjb21wdXRlZFN0eWxlID0gZ2V0Q29tcHV0ZWRTdHlsZShlbGVtZW50KTtcblxuICAgICAgICBpZiAoIWNvbXB1dGVkU3R5bGUpIHsgcmV0dXJuIG51bGwgfVxuXG4gICAgICAgIHZhciBzaXplID0gZWxlbWVudFtjbGllbnRTaXplXTtcblxuICAgICAgICBpZiAoc2l6ZSA9PT0gMCkgeyByZXR1cm4gbnVsbCB9XG5cbiAgICAgICAgaWYgKGRpcmVjdGlvbiA9PT0gSE9SSVpPTlRBTCkge1xuICAgICAgICAgICAgc2l6ZSAtPVxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoY29tcHV0ZWRTdHlsZS5wYWRkaW5nTGVmdCkgK1xuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoY29tcHV0ZWRTdHlsZS5wYWRkaW5nUmlnaHQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc2l6ZSAtPVxuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoY29tcHV0ZWRTdHlsZS5wYWRkaW5nVG9wKSArXG4gICAgICAgICAgICAgICAgcGFyc2VGbG9hdChjb21wdXRlZFN0eWxlLnBhZGRpbmdCb3R0b20pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHNpemVcbiAgICB9XG5cbiAgICAvLyBXaGVuIHNwZWNpZnlpbmcgcGVyY2VudGFnZSBzaXplcyB0aGF0IGFyZSBsZXNzIHRoYW4gdGhlIGNvbXB1dGVkXG4gICAgLy8gc2l6ZSBvZiB0aGUgZWxlbWVudCBtaW51cyB0aGUgZ3V0dGVyLCB0aGUgbGVzc2VyIHBlcmNlbnRhZ2VzIG11c3QgYmUgaW5jcmVhc2VkXG4gICAgLy8gKGFuZCBkZWNyZWFzZWQgZnJvbSB0aGUgb3RoZXIgZWxlbWVudHMpIHRvIG1ha2Ugc3BhY2UgZm9yIHRoZSBwaXhlbHNcbiAgICAvLyBzdWJ0cmFjdGVkIGJ5IHRoZSBndXR0ZXJzLlxuICAgIGZ1bmN0aW9uIHRyaW1Ub01pbihzaXplc1RvVHJpbSkge1xuICAgICAgICAvLyBUcnkgdG8gZ2V0IGlubmVyIHNpemUgb2YgcGFyZW50IGVsZW1lbnQuXG4gICAgICAgIC8vIElmIGl0J3Mgbm8gc3VwcG9ydGVkLCByZXR1cm4gb3JpZ2luYWwgc2l6ZXMuXG4gICAgICAgIHZhciBwYXJlbnRTaXplID0gaW5uZXJTaXplKHBhcmVudCk7XG4gICAgICAgIGlmIChwYXJlbnRTaXplID09PSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZXNUb1RyaW1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtaW5TaXplcy5yZWR1Y2UoZnVuY3Rpb24gKGEsIGIpIHsgcmV0dXJuIGEgKyBiOyB9LCAwKSA+IHBhcmVudFNpemUpIHtcbiAgICAgICAgICAgIHJldHVybiBzaXplc1RvVHJpbVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gS2VlcCB0cmFjayBvZiB0aGUgZXhjZXNzIHBpeGVscywgdGhlIGFtb3VudCBvZiBwaXhlbHMgb3ZlciB0aGUgZGVzaXJlZCBwZXJjZW50YWdlXG4gICAgICAgIC8vIEFsc28ga2VlcCB0cmFjayBvZiB0aGUgZWxlbWVudHMgd2l0aCBwaXhlbHMgdG8gc3BhcmUsIHRvIGRlY3JlYXNlIGFmdGVyIGlmIG5lZWRlZFxuICAgICAgICB2YXIgZXhjZXNzUGl4ZWxzID0gMDtcbiAgICAgICAgdmFyIHRvU3BhcmUgPSBbXTtcblxuICAgICAgICB2YXIgcGl4ZWxTaXplcyA9IHNpemVzVG9UcmltLm1hcChmdW5jdGlvbiAoc2l6ZSwgaSkge1xuICAgICAgICAgICAgLy8gQ29udmVydCByZXF1ZXN0ZWQgcGVyY2VudGFnZXMgdG8gcGl4ZWwgc2l6ZXNcbiAgICAgICAgICAgIHZhciBwaXhlbFNpemUgPSAocGFyZW50U2l6ZSAqIHNpemUpIC8gMTAwO1xuICAgICAgICAgICAgdmFyIGVsZW1lbnRHdXR0ZXJTaXplID0gZ2V0R3V0dGVyU2l6ZShcbiAgICAgICAgICAgICAgICBndXR0ZXJTaXplLFxuICAgICAgICAgICAgICAgIGkgPT09IDAsXG4gICAgICAgICAgICAgICAgaSA9PT0gc2l6ZXNUb1RyaW0ubGVuZ3RoIC0gMSxcbiAgICAgICAgICAgICAgICBndXR0ZXJBbGlnblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHZhciBlbGVtZW50TWluU2l6ZSA9IG1pblNpemVzW2ldICsgZWxlbWVudEd1dHRlclNpemU7XG5cbiAgICAgICAgICAgIC8vIElmIGVsZW1lbnQgaXMgdG9vIHNtYWwsIGluY3JlYXNlIGV4Y2VzcyBwaXhlbHMgYnkgdGhlIGRpZmZlcmVuY2VcbiAgICAgICAgICAgIC8vIGFuZCBtYXJrIHRoYXQgaXQgaGFzIG5vIHBpeGVscyB0byBzcGFyZVxuICAgICAgICAgICAgaWYgKHBpeGVsU2l6ZSA8IGVsZW1lbnRNaW5TaXplKSB7XG4gICAgICAgICAgICAgICAgZXhjZXNzUGl4ZWxzICs9IGVsZW1lbnRNaW5TaXplIC0gcGl4ZWxTaXplO1xuICAgICAgICAgICAgICAgIHRvU3BhcmUucHVzaCgwKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudE1pblNpemVcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gT3RoZXJ3aXNlLCBtYXJrIHRoZSBwaXhlbHMgaXQgaGFzIHRvIHNwYXJlIGFuZCByZXR1cm4gaXQncyBvcmlnaW5hbCBzaXplXG4gICAgICAgICAgICB0b1NwYXJlLnB1c2gocGl4ZWxTaXplIC0gZWxlbWVudE1pblNpemUpO1xuICAgICAgICAgICAgcmV0dXJuIHBpeGVsU2l6ZVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJZiBub3RoaW5nIHdhcyBhZGp1c3RlZCwgcmV0dXJuIHRoZSBvcmlnaW5hbCBzaXplc1xuICAgICAgICBpZiAoZXhjZXNzUGl4ZWxzID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZXNUb1RyaW1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBwaXhlbFNpemVzLm1hcChmdW5jdGlvbiAocGl4ZWxTaXplLCBpKSB7XG4gICAgICAgICAgICB2YXIgbmV3UGl4ZWxTaXplID0gcGl4ZWxTaXplO1xuXG4gICAgICAgICAgICAvLyBXaGlsZSB0aGVyZSdzIHN0aWxsIHBpeGVscyB0byB0YWtlLCBhbmQgdGhlcmUncyBlbm91Z2ggcGl4ZWxzIHRvIHNwYXJlLFxuICAgICAgICAgICAgLy8gdGFrZSBhcyBtYW55IGFzIHBvc3NpYmxlIHVwIHRvIHRoZSB0b3RhbCBleGNlc3MgcGl4ZWxzXG4gICAgICAgICAgICBpZiAoZXhjZXNzUGl4ZWxzID4gMCAmJiB0b1NwYXJlW2ldIC0gZXhjZXNzUGl4ZWxzID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciB0YWtlblBpeGVscyA9IE1hdGgubWluKFxuICAgICAgICAgICAgICAgICAgICBleGNlc3NQaXhlbHMsXG4gICAgICAgICAgICAgICAgICAgIHRvU3BhcmVbaV0gLSBleGNlc3NQaXhlbHNcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gU3VidHJhY3QgdGhlIGFtb3VudCB0YWtlbiBmb3IgdGhlIG5leHQgaXRlcmF0aW9uXG4gICAgICAgICAgICAgICAgZXhjZXNzUGl4ZWxzIC09IHRha2VuUGl4ZWxzO1xuICAgICAgICAgICAgICAgIG5ld1BpeGVsU2l6ZSA9IHBpeGVsU2l6ZSAtIHRha2VuUGl4ZWxzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBSZXR1cm4gdGhlIHBpeGVsIHNpemUgYWRqdXN0ZWQgYXMgYSBwZXJjZW50YWdlXG4gICAgICAgICAgICByZXR1cm4gKG5ld1BpeGVsU2l6ZSAvIHBhcmVudFNpemUpICogMTAwXG4gICAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gc3RvcERyYWdnaW5nIGlzIHZlcnkgc2ltaWxhciB0byBzdGFydERyYWdnaW5nIGluIHJldmVyc2UuXG4gICAgZnVuY3Rpb24gc3RvcERyYWdnaW5nKCkge1xuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBhID0gZWxlbWVudHNbc2VsZi5hXS5lbGVtZW50O1xuICAgICAgICB2YXIgYiA9IGVsZW1lbnRzW3NlbGYuYl0uZWxlbWVudDtcblxuICAgICAgICBpZiAoc2VsZi5kcmFnZ2luZykge1xuICAgICAgICAgICAgZ2V0T3B0aW9uKG9wdGlvbnMsICdvbkRyYWdFbmQnLCBOT09QKShnZXRTaXplcygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHNlbGYuZHJhZ2dpbmcgPSBmYWxzZTtcblxuICAgICAgICAvLyBSZW1vdmUgdGhlIHN0b3JlZCBldmVudCBsaXN0ZW5lcnMuIFRoaXMgaXMgd2h5IHdlIHN0b3JlIHRoZW0uXG4gICAgICAgIGdsb2JhbFtyZW1vdmVFdmVudExpc3RlbmVyXSgnbW91c2V1cCcsIHNlbGYuc3RvcCk7XG4gICAgICAgIGdsb2JhbFtyZW1vdmVFdmVudExpc3RlbmVyXSgndG91Y2hlbmQnLCBzZWxmLnN0b3ApO1xuICAgICAgICBnbG9iYWxbcmVtb3ZlRXZlbnRMaXN0ZW5lcl0oJ3RvdWNoY2FuY2VsJywgc2VsZi5zdG9wKTtcbiAgICAgICAgZ2xvYmFsW3JlbW92ZUV2ZW50TGlzdGVuZXJdKCdtb3VzZW1vdmUnLCBzZWxmLm1vdmUpO1xuICAgICAgICBnbG9iYWxbcmVtb3ZlRXZlbnRMaXN0ZW5lcl0oJ3RvdWNobW92ZScsIHNlbGYubW92ZSk7XG5cbiAgICAgICAgLy8gQ2xlYXIgYm91bmQgZnVuY3Rpb24gcmVmZXJlbmNlc1xuICAgICAgICBzZWxmLnN0b3AgPSBudWxsO1xuICAgICAgICBzZWxmLm1vdmUgPSBudWxsO1xuXG4gICAgICAgIGFbcmVtb3ZlRXZlbnRMaXN0ZW5lcl0oJ3NlbGVjdHN0YXJ0JywgTk9PUCk7XG4gICAgICAgIGFbcmVtb3ZlRXZlbnRMaXN0ZW5lcl0oJ2RyYWdzdGFydCcsIE5PT1ApO1xuICAgICAgICBiW3JlbW92ZUV2ZW50TGlzdGVuZXJdKCdzZWxlY3RzdGFydCcsIE5PT1ApO1xuICAgICAgICBiW3JlbW92ZUV2ZW50TGlzdGVuZXJdKCdkcmFnc3RhcnQnLCBOT09QKTtcblxuICAgICAgICBhLnN0eWxlLnVzZXJTZWxlY3QgPSAnJztcbiAgICAgICAgYS5zdHlsZS53ZWJraXRVc2VyU2VsZWN0ID0gJyc7XG4gICAgICAgIGEuc3R5bGUuTW96VXNlclNlbGVjdCA9ICcnO1xuICAgICAgICBhLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnJztcblxuICAgICAgICBiLnN0eWxlLnVzZXJTZWxlY3QgPSAnJztcbiAgICAgICAgYi5zdHlsZS53ZWJraXRVc2VyU2VsZWN0ID0gJyc7XG4gICAgICAgIGIuc3R5bGUuTW96VXNlclNlbGVjdCA9ICcnO1xuICAgICAgICBiLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnJztcblxuICAgICAgICBzZWxmLmd1dHRlci5zdHlsZS5jdXJzb3IgPSAnJztcbiAgICAgICAgc2VsZi5wYXJlbnQuc3R5bGUuY3Vyc29yID0gJyc7XG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuY3Vyc29yID0gJyc7XG4gICAgfVxuXG4gICAgLy8gc3RhcnREcmFnZ2luZyBjYWxscyBgY2FsY3VsYXRlU2l6ZXNgIHRvIHN0b3JlIHRoZSBpbml0YWwgc2l6ZSBpbiB0aGUgcGFpciBvYmplY3QuXG4gICAgLy8gSXQgYWxzbyBhZGRzIGV2ZW50IGxpc3RlbmVycyBmb3IgbW91c2UvdG91Y2ggZXZlbnRzLFxuICAgIC8vIGFuZCBwcmV2ZW50cyBzZWxlY3Rpb24gd2hpbGUgZHJhZ2dpbmcgc28gYXZvaWQgdGhlIHNlbGVjdGluZyB0ZXh0LlxuICAgIGZ1bmN0aW9uIHN0YXJ0RHJhZ2dpbmcoZSkge1xuICAgICAgICAvLyBSaWdodC1jbGlja2luZyBjYW4ndCBzdGFydCBkcmFnZ2luZy5cbiAgICAgICAgaWYgKCdidXR0b24nIGluIGUgJiYgZS5idXR0b24gIT09IDApIHtcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWxpYXMgZnJlcXVlbnRseSB1c2VkIHZhcmlhYmxlcyB0byBzYXZlIHNwYWNlLiAyMDAgYnl0ZXMuXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAgICAgdmFyIGEgPSBlbGVtZW50c1tzZWxmLmFdLmVsZW1lbnQ7XG4gICAgICAgIHZhciBiID0gZWxlbWVudHNbc2VsZi5iXS5lbGVtZW50O1xuXG4gICAgICAgIC8vIENhbGwgdGhlIG9uRHJhZ1N0YXJ0IGNhbGxiYWNrLlxuICAgICAgICBpZiAoIXNlbGYuZHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIGdldE9wdGlvbihvcHRpb25zLCAnb25EcmFnU3RhcnQnLCBOT09QKShnZXRTaXplcygpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERvbid0IGFjdHVhbGx5IGRyYWcgdGhlIGVsZW1lbnQuIFdlIGVtdWxhdGUgdGhhdCBpbiB0aGUgZHJhZyBmdW5jdGlvbi5cbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZHJhZ2dpbmcgcHJvcGVydHkgb2YgdGhlIHBhaXIgb2JqZWN0LlxuICAgICAgICBzZWxmLmRyYWdnaW5nID0gdHJ1ZTtcblxuICAgICAgICAvLyBDcmVhdGUgdHdvIGV2ZW50IGxpc3RlbmVycyBib3VuZCB0byB0aGUgc2FtZSBwYWlyIG9iamVjdCBhbmQgc3RvcmVcbiAgICAgICAgLy8gdGhlbSBpbiB0aGUgcGFpciBvYmplY3QuXG4gICAgICAgIHNlbGYubW92ZSA9IGRyYWcuYmluZChzZWxmKTtcbiAgICAgICAgc2VsZi5zdG9wID0gc3RvcERyYWdnaW5nLmJpbmQoc2VsZik7XG5cbiAgICAgICAgLy8gQWxsIHRoZSBiaW5kaW5nLiBgd2luZG93YCBnZXRzIHRoZSBzdG9wIGV2ZW50cyBpbiBjYXNlIHdlIGRyYWcgb3V0IG9mIHRoZSBlbGVtZW50cy5cbiAgICAgICAgZ2xvYmFsW2FkZEV2ZW50TGlzdGVuZXJdKCdtb3VzZXVwJywgc2VsZi5zdG9wKTtcbiAgICAgICAgZ2xvYmFsW2FkZEV2ZW50TGlzdGVuZXJdKCd0b3VjaGVuZCcsIHNlbGYuc3RvcCk7XG4gICAgICAgIGdsb2JhbFthZGRFdmVudExpc3RlbmVyXSgndG91Y2hjYW5jZWwnLCBzZWxmLnN0b3ApO1xuICAgICAgICBnbG9iYWxbYWRkRXZlbnRMaXN0ZW5lcl0oJ21vdXNlbW92ZScsIHNlbGYubW92ZSk7XG4gICAgICAgIGdsb2JhbFthZGRFdmVudExpc3RlbmVyXSgndG91Y2htb3ZlJywgc2VsZi5tb3ZlKTtcblxuICAgICAgICAvLyBEaXNhYmxlIHNlbGVjdGlvbi4gRGlzYWJsZSFcbiAgICAgICAgYVthZGRFdmVudExpc3RlbmVyXSgnc2VsZWN0c3RhcnQnLCBOT09QKTtcbiAgICAgICAgYVthZGRFdmVudExpc3RlbmVyXSgnZHJhZ3N0YXJ0JywgTk9PUCk7XG4gICAgICAgIGJbYWRkRXZlbnRMaXN0ZW5lcl0oJ3NlbGVjdHN0YXJ0JywgTk9PUCk7XG4gICAgICAgIGJbYWRkRXZlbnRMaXN0ZW5lcl0oJ2RyYWdzdGFydCcsIE5PT1ApO1xuXG4gICAgICAgIGEuc3R5bGUudXNlclNlbGVjdCA9ICdub25lJztcbiAgICAgICAgYS5zdHlsZS53ZWJraXRVc2VyU2VsZWN0ID0gJ25vbmUnO1xuICAgICAgICBhLnN0eWxlLk1velVzZXJTZWxlY3QgPSAnbm9uZSc7XG4gICAgICAgIGEuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcblxuICAgICAgICBiLnN0eWxlLnVzZXJTZWxlY3QgPSAnbm9uZSc7XG4gICAgICAgIGIuc3R5bGUud2Via2l0VXNlclNlbGVjdCA9ICdub25lJztcbiAgICAgICAgYi5zdHlsZS5Nb3pVc2VyU2VsZWN0ID0gJ25vbmUnO1xuICAgICAgICBiLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBjdXJzb3IgYXQgbXVsdGlwbGUgbGV2ZWxzXG4gICAgICAgIHNlbGYuZ3V0dGVyLnN0eWxlLmN1cnNvciA9IGN1cnNvcjtcbiAgICAgICAgc2VsZi5wYXJlbnQuc3R5bGUuY3Vyc29yID0gY3Vyc29yO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmN1cnNvciA9IGN1cnNvcjtcblxuICAgICAgICAvLyBDYWNoZSB0aGUgaW5pdGlhbCBzaXplcyBvZiB0aGUgcGFpci5cbiAgICAgICAgY2FsY3VsYXRlU2l6ZXMuY2FsbChzZWxmKTtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgdGhlIHBvc2l0aW9uIG9mIHRoZSBtb3VzZSBjb21wYXJlZCB0byB0aGUgZ3V0dGVyXG4gICAgICAgIHNlbGYuZHJhZ09mZnNldCA9IGdldE1vdXNlUG9zaXRpb24oZSkgLSBzZWxmLmVuZDtcbiAgICB9XG5cbiAgICAvLyBhZGp1c3Qgc2l6ZXMgdG8gZW5zdXJlIHBlcmNlbnRhZ2UgaXMgd2l0aGluIG1pbiBzaXplIGFuZCBndXR0ZXIuXG4gICAgc2l6ZXMgPSB0cmltVG9NaW4oc2l6ZXMpO1xuXG4gICAgLy8gNS4gQ3JlYXRlIHBhaXIgYW5kIGVsZW1lbnQgb2JqZWN0cy4gRWFjaCBwYWlyIGhhcyBhbiBpbmRleCByZWZlcmVuY2UgdG9cbiAgICAvLyBlbGVtZW50cyBgYWAgYW5kIGBiYCBvZiB0aGUgcGFpciAoZmlyc3QgYW5kIHNlY29uZCBlbGVtZW50cykuXG4gICAgLy8gTG9vcCB0aHJvdWdoIHRoZSBlbGVtZW50cyB3aGlsZSBwYWlyaW5nIHRoZW0gb2ZmLiBFdmVyeSBwYWlyIGdldHMgYVxuICAgIC8vIGBwYWlyYCBvYmplY3QgYW5kIGEgZ3V0dGVyLlxuICAgIC8vXG4gICAgLy8gQmFzaWMgbG9naWM6XG4gICAgLy9cbiAgICAvLyAtIFN0YXJ0aW5nIHdpdGggdGhlIHNlY29uZCBlbGVtZW50IGBpID4gMGAsIGNyZWF0ZSBgcGFpcmAgb2JqZWN0cyB3aXRoXG4gICAgLy8gICBgYSA9IGkgLSAxYCBhbmQgYGIgPSBpYFxuICAgIC8vIC0gU2V0IGd1dHRlciBzaXplcyBiYXNlZCBvbiB0aGUgX3BhaXJfIGJlaW5nIGZpcnN0L2xhc3QuIFRoZSBmaXJzdCBhbmQgbGFzdFxuICAgIC8vICAgcGFpciBoYXZlIGd1dHRlclNpemUgLyAyLCBzaW5jZSB0aGV5IG9ubHkgaGF2ZSBvbmUgaGFsZiBndXR0ZXIsIGFuZCBub3QgdHdvLlxuICAgIC8vIC0gQ3JlYXRlIGd1dHRlciBlbGVtZW50cyBhbmQgYWRkIGV2ZW50IGxpc3RlbmVycy5cbiAgICAvLyAtIFNldCB0aGUgc2l6ZSBvZiB0aGUgZWxlbWVudHMsIG1pbnVzIHRoZSBndXR0ZXIgc2l6ZXMuXG4gICAgLy9cbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgIC8vIHwgICAgIGk9MCAgICAgfCAgICAgICAgIGk9MSAgICAgICAgIHwgICAgICAgIGk9MiAgICAgICB8ICAgICAgaT0zICAgICB8XG4gICAgLy8gfCAgICAgICAgICAgICB8ICAgICAgICAgICAgICAgICAgICAgfCAgICAgICAgICAgICAgICAgIHwgICAgICAgICAgICAgIHxcbiAgICAvLyB8ICAgICAgICAgICBwYWlyIDAgICAgICAgICAgICAgICAgcGFpciAxICAgICAgICAgICAgIHBhaXIgMiAgICAgICAgICAgfFxuICAgIC8vIHwgICAgICAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgIHwgICAgICAgICAgICAgICAgICB8ICAgICAgICAgICAgICB8XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB2YXIgcGFpcnMgPSBbXTtcbiAgICBlbGVtZW50cyA9IGlkcy5tYXAoZnVuY3Rpb24gKGlkLCBpKSB7XG4gICAgICAgIC8vIENyZWF0ZSB0aGUgZWxlbWVudCBvYmplY3QuXG4gICAgICAgIHZhciBlbGVtZW50ID0ge1xuICAgICAgICAgICAgZWxlbWVudDogZWxlbWVudE9yU2VsZWN0b3IoaWQpLFxuICAgICAgICAgICAgc2l6ZTogc2l6ZXNbaV0sXG4gICAgICAgICAgICBtaW5TaXplOiBtaW5TaXplc1tpXSxcbiAgICAgICAgICAgIG1heFNpemU6IG1heFNpemVzW2ldLFxuICAgICAgICAgICAgc25hcE9mZnNldDogc25hcE9mZnNldHNbaV0sXG4gICAgICAgICAgICBpOiBpLFxuICAgICAgICB9O1xuXG4gICAgICAgIHZhciBwYWlyO1xuXG4gICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgLy8gQ3JlYXRlIHRoZSBwYWlyIG9iamVjdCB3aXRoIGl0cyBtZXRhZGF0YS5cbiAgICAgICAgICAgIHBhaXIgPSB7XG4gICAgICAgICAgICAgICAgYTogaSAtIDEsXG4gICAgICAgICAgICAgICAgYjogaSxcbiAgICAgICAgICAgICAgICBkcmFnZ2luZzogZmFsc2UsXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uOiBkaXJlY3Rpb24sXG4gICAgICAgICAgICAgICAgcGFyZW50OiBwYXJlbnQsXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBwYWlyW2FHdXR0ZXJTaXplXSA9IGdldEd1dHRlclNpemUoXG4gICAgICAgICAgICAgICAgZ3V0dGVyU2l6ZSxcbiAgICAgICAgICAgICAgICBpIC0gMSA9PT0gMCxcbiAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICBndXR0ZXJBbGlnblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIHBhaXJbYkd1dHRlclNpemVdID0gZ2V0R3V0dGVyU2l6ZShcbiAgICAgICAgICAgICAgICBndXR0ZXJTaXplLFxuICAgICAgICAgICAgICAgIGZhbHNlLFxuICAgICAgICAgICAgICAgIGkgPT09IGlkcy5sZW5ndGggLSAxLFxuICAgICAgICAgICAgICAgIGd1dHRlckFsaWduXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAvLyBpZiB0aGUgcGFyZW50IGhhcyBhIHJldmVyc2UgZmxleC1kaXJlY3Rpb24sIHN3aXRjaCB0aGUgcGFpciBlbGVtZW50cy5cbiAgICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICAgICBwYXJlbnRGbGV4RGlyZWN0aW9uID09PSAncm93LXJldmVyc2UnIHx8XG4gICAgICAgICAgICAgICAgcGFyZW50RmxleERpcmVjdGlvbiA9PT0gJ2NvbHVtbi1yZXZlcnNlJ1xuICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRlbXAgPSBwYWlyLmE7XG4gICAgICAgICAgICAgICAgcGFpci5hID0gcGFpci5iO1xuICAgICAgICAgICAgICAgIHBhaXIuYiA9IHRlbXA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXRlcm1pbmUgdGhlIHNpemUgb2YgdGhlIGN1cnJlbnQgZWxlbWVudC4gSUU4IGlzIHN1cHBvcnRlZCBieVxuICAgICAgICAvLyBzdGF0aWNseSBhc3NpZ25pbmcgc2l6ZXMgd2l0aG91dCBkcmFnZ2FibGUgZ3V0dGVycy4gQXNzaWducyBhIHN0cmluZ1xuICAgICAgICAvLyB0byBgc2l6ZWAuXG4gICAgICAgIC8vXG4gICAgICAgIC8vIENyZWF0ZSBndXR0ZXIgZWxlbWVudHMgZm9yIGVhY2ggcGFpci5cbiAgICAgICAgaWYgKGkgPiAwKSB7XG4gICAgICAgICAgICB2YXIgZ3V0dGVyRWxlbWVudCA9IGd1dHRlcihpLCBkaXJlY3Rpb24sIGVsZW1lbnQuZWxlbWVudCk7XG4gICAgICAgICAgICBzZXRHdXR0ZXJTaXplKGd1dHRlckVsZW1lbnQsIGd1dHRlclNpemUsIGkpO1xuXG4gICAgICAgICAgICAvLyBTYXZlIGJvdW5kIGV2ZW50IGxpc3RlbmVyIGZvciByZW1vdmFsIGxhdGVyXG4gICAgICAgICAgICBwYWlyW2d1dHRlclN0YXJ0RHJhZ2dpbmddID0gc3RhcnREcmFnZ2luZy5iaW5kKHBhaXIpO1xuXG4gICAgICAgICAgICAvLyBBdHRhY2ggYm91bmQgZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgICAgIGd1dHRlckVsZW1lbnRbYWRkRXZlbnRMaXN0ZW5lcl0oXG4gICAgICAgICAgICAgICAgJ21vdXNlZG93bicsXG4gICAgICAgICAgICAgICAgcGFpcltndXR0ZXJTdGFydERyYWdnaW5nXVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGd1dHRlckVsZW1lbnRbYWRkRXZlbnRMaXN0ZW5lcl0oXG4gICAgICAgICAgICAgICAgJ3RvdWNoc3RhcnQnLFxuICAgICAgICAgICAgICAgIHBhaXJbZ3V0dGVyU3RhcnREcmFnZ2luZ11cbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUoZ3V0dGVyRWxlbWVudCwgZWxlbWVudC5lbGVtZW50KTtcblxuICAgICAgICAgICAgcGFpci5ndXR0ZXIgPSBndXR0ZXJFbGVtZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgc2V0RWxlbWVudFNpemUoXG4gICAgICAgICAgICBlbGVtZW50LmVsZW1lbnQsXG4gICAgICAgICAgICBlbGVtZW50LnNpemUsXG4gICAgICAgICAgICBnZXRHdXR0ZXJTaXplKFxuICAgICAgICAgICAgICAgIGd1dHRlclNpemUsXG4gICAgICAgICAgICAgICAgaSA9PT0gMCxcbiAgICAgICAgICAgICAgICBpID09PSBpZHMubGVuZ3RoIC0gMSxcbiAgICAgICAgICAgICAgICBndXR0ZXJBbGlnblxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIGlcbiAgICAgICAgKTtcblxuICAgICAgICAvLyBBZnRlciB0aGUgZmlyc3QgaXRlcmF0aW9uLCBhbmQgd2UgaGF2ZSBhIHBhaXIgb2JqZWN0LCBhcHBlbmQgaXQgdG8gdGhlXG4gICAgICAgIC8vIGxpc3Qgb2YgcGFpcnMuXG4gICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgcGFpcnMucHVzaChwYWlyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBlbGVtZW50XG4gICAgfSk7XG5cbiAgICBmdW5jdGlvbiBhZGp1c3RUb01pbihlbGVtZW50KSB7XG4gICAgICAgIHZhciBpc0xhc3QgPSBlbGVtZW50LmkgPT09IHBhaXJzLmxlbmd0aDtcbiAgICAgICAgdmFyIHBhaXIgPSBpc0xhc3QgPyBwYWlyc1tlbGVtZW50LmkgLSAxXSA6IHBhaXJzW2VsZW1lbnQuaV07XG5cbiAgICAgICAgY2FsY3VsYXRlU2l6ZXMuY2FsbChwYWlyKTtcblxuICAgICAgICB2YXIgc2l6ZSA9IGlzTGFzdFxuICAgICAgICAgICAgPyBwYWlyLnNpemUgLSBlbGVtZW50Lm1pblNpemUgLSBwYWlyW2JHdXR0ZXJTaXplXVxuICAgICAgICAgICAgOiBlbGVtZW50Lm1pblNpemUgKyBwYWlyW2FHdXR0ZXJTaXplXTtcblxuICAgICAgICBhZGp1c3QuY2FsbChwYWlyLCBzaXplKTtcbiAgICB9XG5cbiAgICBlbGVtZW50cy5mb3JFYWNoKGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gICAgICAgIHZhciBjb21wdXRlZFNpemUgPSBlbGVtZW50LmVsZW1lbnRbZ2V0Qm91bmRpbmdDbGllbnRSZWN0XSgpW2RpbWVuc2lvbl07XG5cbiAgICAgICAgaWYgKGNvbXB1dGVkU2l6ZSA8IGVsZW1lbnQubWluU2l6ZSkge1xuICAgICAgICAgICAgaWYgKGV4cGFuZFRvTWluKSB7XG4gICAgICAgICAgICAgICAgYWRqdXN0VG9NaW4oZWxlbWVudCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1wYXJhbS1yZWFzc2lnblxuICAgICAgICAgICAgICAgIGVsZW1lbnQubWluU2l6ZSA9IGNvbXB1dGVkU2l6ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gc2V0U2l6ZXMobmV3U2l6ZXMpIHtcbiAgICAgICAgdmFyIHRyaW1tZWQgPSB0cmltVG9NaW4obmV3U2l6ZXMpO1xuICAgICAgICB0cmltbWVkLmZvckVhY2goZnVuY3Rpb24gKG5ld1NpemUsIGkpIHtcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgICAgIHZhciBwYWlyID0gcGFpcnNbaSAtIDFdO1xuXG4gICAgICAgICAgICAgICAgdmFyIGEgPSBlbGVtZW50c1twYWlyLmFdO1xuICAgICAgICAgICAgICAgIHZhciBiID0gZWxlbWVudHNbcGFpci5iXTtcblxuICAgICAgICAgICAgICAgIGEuc2l6ZSA9IHRyaW1tZWRbaSAtIDFdO1xuICAgICAgICAgICAgICAgIGIuc2l6ZSA9IG5ld1NpemU7XG5cbiAgICAgICAgICAgICAgICBzZXRFbGVtZW50U2l6ZShhLmVsZW1lbnQsIGEuc2l6ZSwgcGFpclthR3V0dGVyU2l6ZV0sIGEuaSk7XG4gICAgICAgICAgICAgICAgc2V0RWxlbWVudFNpemUoYi5lbGVtZW50LCBiLnNpemUsIHBhaXJbYkd1dHRlclNpemVdLCBiLmkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkZXN0cm95KHByZXNlcnZlU3R5bGVzLCBwcmVzZXJ2ZUd1dHRlcikge1xuICAgICAgICBwYWlycy5mb3JFYWNoKGZ1bmN0aW9uIChwYWlyKSB7XG4gICAgICAgICAgICBpZiAocHJlc2VydmVHdXR0ZXIgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBwYWlyLnBhcmVudC5yZW1vdmVDaGlsZChwYWlyLmd1dHRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHBhaXIuZ3V0dGVyW3JlbW92ZUV2ZW50TGlzdGVuZXJdKFxuICAgICAgICAgICAgICAgICAgICAnbW91c2Vkb3duJyxcbiAgICAgICAgICAgICAgICAgICAgcGFpcltndXR0ZXJTdGFydERyYWdnaW5nXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgcGFpci5ndXR0ZXJbcmVtb3ZlRXZlbnRMaXN0ZW5lcl0oXG4gICAgICAgICAgICAgICAgICAgICd0b3VjaHN0YXJ0JyxcbiAgICAgICAgICAgICAgICAgICAgcGFpcltndXR0ZXJTdGFydERyYWdnaW5nXVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChwcmVzZXJ2ZVN0eWxlcyAhPT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIHZhciBzdHlsZSA9IGVsZW1lbnRTdHlsZShcbiAgICAgICAgICAgICAgICAgICAgZGltZW5zaW9uLFxuICAgICAgICAgICAgICAgICAgICBwYWlyLmEuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgcGFpclthR3V0dGVyU2l6ZV1cbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgT2JqZWN0LmtleXMoc3R5bGUpLmZvckVhY2goZnVuY3Rpb24gKHByb3ApIHtcbiAgICAgICAgICAgICAgICAgICAgZWxlbWVudHNbcGFpci5hXS5lbGVtZW50LnN0eWxlW3Byb3BdID0gJyc7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzW3BhaXIuYl0uZWxlbWVudC5zdHlsZVtwcm9wXSA9ICcnO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBzZXRTaXplczogc2V0U2l6ZXMsXG4gICAgICAgIGdldFNpemVzOiBnZXRTaXplcyxcbiAgICAgICAgY29sbGFwc2U6IGZ1bmN0aW9uIGNvbGxhcHNlKGkpIHtcbiAgICAgICAgICAgIGFkanVzdFRvTWluKGVsZW1lbnRzW2ldKTtcbiAgICAgICAgfSxcbiAgICAgICAgZGVzdHJveTogZGVzdHJveSxcbiAgICAgICAgcGFyZW50OiBwYXJlbnQsXG4gICAgICAgIHBhaXJzOiBwYWlycyxcbiAgICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBTcGxpdDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uLy4uL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vLi4vc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vLi4vc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uLy4uL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vLi4vc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vLi4vc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vLi4vY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuLi8uLi9zYXNzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3ByaXNtLWRhcmsuY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vLi4vY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuLi8uLi9zYXNzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL3ByaXNtLWRhcmsuY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuLi9ub2RlX21vZHVsZXMvc2Fzcy1sb2FkZXIvZGlzdC9janMuanMhLi9jb2RlZWRpdG9yLnNjc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuLi9ub2RlX21vZHVsZXMvc2Fzcy1sb2FkZXIvZGlzdC9janMuanMhLi9jb2RlZWRpdG9yLnNjc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbmplY3RTdHlsZXNJbnRvU3R5bGVUYWcuanNcIjtcbiAgICAgIGltcG9ydCBkb21BUEkgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZURvbUFQSS5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydEZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRTdHlsZUVsZW1lbnQgZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRTdHlsZUVsZW1lbnQuanNcIjtcbiAgICAgIGltcG9ydCBzdHlsZVRhZ1RyYW5zZm9ybUZuIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4uL25vZGVfbW9kdWxlcy9zYXNzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2ZpZGRsZXIuc2Nzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4uL25vZGVfbW9kdWxlcy9zYXNzLWxvYWRlci9kaXN0L2Nqcy5qcyEuL2ZpZGRsZXIuc2Nzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgc3R5bGVzSW5ET00gPSBbXTtcblxuZnVuY3Rpb24gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcikge1xuICB2YXIgcmVzdWx0ID0gLTE7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHlsZXNJbkRPTS5sZW5ndGg7IGkrKykge1xuICAgIGlmIChzdHlsZXNJbkRPTVtpXS5pZGVudGlmaWVyID09PSBpZGVudGlmaWVyKSB7XG4gICAgICByZXN1bHQgPSBpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuZnVuY3Rpb24gbW9kdWxlc1RvRG9tKGxpc3QsIG9wdGlvbnMpIHtcbiAgdmFyIGlkQ291bnRNYXAgPSB7fTtcbiAgdmFyIGlkZW50aWZpZXJzID0gW107XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgdmFyIGl0ZW0gPSBsaXN0W2ldO1xuICAgIHZhciBpZCA9IG9wdGlvbnMuYmFzZSA/IGl0ZW1bMF0gKyBvcHRpb25zLmJhc2UgOiBpdGVtWzBdO1xuICAgIHZhciBjb3VudCA9IGlkQ291bnRNYXBbaWRdIHx8IDA7XG4gICAgdmFyIGlkZW50aWZpZXIgPSBcIlwiLmNvbmNhdChpZCwgXCIgXCIpLmNvbmNhdChjb3VudCk7XG4gICAgaWRDb3VudE1hcFtpZF0gPSBjb3VudCArIDE7XG4gICAgdmFyIGluZGV4QnlJZGVudGlmaWVyID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgdmFyIG9iaiA9IHtcbiAgICAgIGNzczogaXRlbVsxXSxcbiAgICAgIG1lZGlhOiBpdGVtWzJdLFxuICAgICAgc291cmNlTWFwOiBpdGVtWzNdLFxuICAgICAgc3VwcG9ydHM6IGl0ZW1bNF0sXG4gICAgICBsYXllcjogaXRlbVs1XVxuICAgIH07XG5cbiAgICBpZiAoaW5kZXhCeUlkZW50aWZpZXIgIT09IC0xKSB7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleEJ5SWRlbnRpZmllcl0ucmVmZXJlbmNlcysrO1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhCeUlkZW50aWZpZXJdLnVwZGF0ZXIob2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHVwZGF0ZXIgPSBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKTtcbiAgICAgIG9wdGlvbnMuYnlJbmRleCA9IGk7XG4gICAgICBzdHlsZXNJbkRPTS5zcGxpY2UoaSwgMCwge1xuICAgICAgICBpZGVudGlmaWVyOiBpZGVudGlmaWVyLFxuICAgICAgICB1cGRhdGVyOiB1cGRhdGVyLFxuICAgICAgICByZWZlcmVuY2VzOiAxXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBpZGVudGlmaWVycy5wdXNoKGlkZW50aWZpZXIpO1xuICB9XG5cbiAgcmV0dXJuIGlkZW50aWZpZXJzO1xufVxuXG5mdW5jdGlvbiBhZGRFbGVtZW50U3R5bGUob2JqLCBvcHRpb25zKSB7XG4gIHZhciBhcGkgPSBvcHRpb25zLmRvbUFQSShvcHRpb25zKTtcbiAgYXBpLnVwZGF0ZShvYmopO1xuXG4gIHZhciB1cGRhdGVyID0gZnVuY3Rpb24gdXBkYXRlcihuZXdPYmopIHtcbiAgICBpZiAobmV3T2JqKSB7XG4gICAgICBpZiAobmV3T2JqLmNzcyA9PT0gb2JqLmNzcyAmJiBuZXdPYmoubWVkaWEgPT09IG9iai5tZWRpYSAmJiBuZXdPYmouc291cmNlTWFwID09PSBvYmouc291cmNlTWFwICYmIG5ld09iai5zdXBwb3J0cyA9PT0gb2JqLnN1cHBvcnRzICYmIG5ld09iai5sYXllciA9PT0gb2JqLmxheWVyKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYXBpLnVwZGF0ZShvYmogPSBuZXdPYmopO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcGkucmVtb3ZlKCk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiB1cGRhdGVyO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChsaXN0LCBvcHRpb25zKSB7XG4gIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICBsaXN0ID0gbGlzdCB8fCBbXTtcbiAgdmFyIGxhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKTtcbiAgcmV0dXJuIGZ1bmN0aW9uIHVwZGF0ZShuZXdMaXN0KSB7XG4gICAgbmV3TGlzdCA9IG5ld0xpc3QgfHwgW107XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxhc3RJZGVudGlmaWVycy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGlkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbaV07XG4gICAgICB2YXIgaW5kZXggPSBnZXRJbmRleEJ5SWRlbnRpZmllcihpZGVudGlmaWVyKTtcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4XS5yZWZlcmVuY2VzLS07XG4gICAgfVxuXG4gICAgdmFyIG5ld0xhc3RJZGVudGlmaWVycyA9IG1vZHVsZXNUb0RvbShuZXdMaXN0LCBvcHRpb25zKTtcblxuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBfaSsrKSB7XG4gICAgICB2YXIgX2lkZW50aWZpZXIgPSBsYXN0SWRlbnRpZmllcnNbX2ldO1xuXG4gICAgICB2YXIgX2luZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoX2lkZW50aWZpZXIpO1xuXG4gICAgICBpZiAoc3R5bGVzSW5ET01bX2luZGV4XS5yZWZlcmVuY2VzID09PSAwKSB7XG4gICAgICAgIHN0eWxlc0luRE9NW19pbmRleF0udXBkYXRlcigpO1xuXG4gICAgICAgIHN0eWxlc0luRE9NLnNwbGljZShfaW5kZXgsIDEpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGxhc3RJZGVudGlmaWVycyA9IG5ld0xhc3RJZGVudGlmaWVycztcbiAgfTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBtZW1vID0ge307XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuZnVuY3Rpb24gZ2V0VGFyZ2V0KHRhcmdldCkge1xuICBpZiAodHlwZW9mIG1lbW9bdGFyZ2V0XSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIHZhciBzdHlsZVRhcmdldCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IodGFyZ2V0KTsgLy8gU3BlY2lhbCBjYXNlIHRvIHJldHVybiBoZWFkIG9mIGlmcmFtZSBpbnN0ZWFkIG9mIGlmcmFtZSBpdHNlbGZcblxuICAgIGlmICh3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQgJiYgc3R5bGVUYXJnZXQgaW5zdGFuY2VvZiB3aW5kb3cuSFRNTElGcmFtZUVsZW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBhbiBleGNlcHRpb24gaWYgYWNjZXNzIHRvIGlmcmFtZSBpcyBibG9ja2VkXG4gICAgICAgIC8vIGR1ZSB0byBjcm9zcy1vcmlnaW4gcmVzdHJpY3Rpb25zXG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gc3R5bGVUYXJnZXQuY29udGVudERvY3VtZW50LmhlYWQ7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGlzdGFuYnVsIGlnbm9yZSBuZXh0XG4gICAgICAgIHN0eWxlVGFyZ2V0ID0gbnVsbDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBtZW1vW3RhcmdldF0gPSBzdHlsZVRhcmdldDtcbiAgfVxuXG4gIHJldHVybiBtZW1vW3RhcmdldF07XG59XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuXG5mdW5jdGlvbiBpbnNlcnRCeVNlbGVjdG9yKGluc2VydCwgc3R5bGUpIHtcbiAgdmFyIHRhcmdldCA9IGdldFRhcmdldChpbnNlcnQpO1xuXG4gIGlmICghdGFyZ2V0KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ291bGRuJ3QgZmluZCBhIHN0eWxlIHRhcmdldC4gVGhpcyBwcm9iYWJseSBtZWFucyB0aGF0IHRoZSB2YWx1ZSBmb3IgdGhlICdpbnNlcnQnIHBhcmFtZXRlciBpcyBpbnZhbGlkLlwiKTtcbiAgfVxuXG4gIHRhcmdldC5hcHBlbmRDaGlsZChzdHlsZSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gaW5zZXJ0QnlTZWxlY3RvcjsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBpbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucykge1xuICB2YXIgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzdHlsZVwiKTtcbiAgb3B0aW9ucy5zZXRBdHRyaWJ1dGVzKGVsZW1lbnQsIG9wdGlvbnMuYXR0cmlidXRlcyk7XG4gIG9wdGlvbnMuaW5zZXJ0KGVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG4gIHJldHVybiBlbGVtZW50O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc2VydFN0eWxlRWxlbWVudDsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMoc3R5bGVFbGVtZW50KSB7XG4gIHZhciBub25jZSA9IHR5cGVvZiBfX3dlYnBhY2tfbm9uY2VfXyAhPT0gXCJ1bmRlZmluZWRcIiA/IF9fd2VicGFja19ub25jZV9fIDogbnVsbDtcblxuICBpZiAobm9uY2UpIHtcbiAgICBzdHlsZUVsZW1lbnQuc2V0QXR0cmlidXRlKFwibm9uY2VcIiwgbm9uY2UpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzOyIsIlwidXNlIHN0cmljdFwiO1xuXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cbmZ1bmN0aW9uIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKSB7XG4gIHZhciBjc3MgPSBcIlwiO1xuXG4gIGlmIChvYmouc3VwcG9ydHMpIHtcbiAgICBjc3MgKz0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChvYmouc3VwcG9ydHMsIFwiKSB7XCIpO1xuICB9XG5cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIkBtZWRpYSBcIi5jb25jYXQob2JqLm1lZGlhLCBcIiB7XCIpO1xuICB9XG5cbiAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBvYmoubGF5ZXIgIT09IFwidW5kZWZpbmVkXCI7XG5cbiAgaWYgKG5lZWRMYXllcikge1xuICAgIGNzcyArPSBcIkBsYXllclwiLmNvbmNhdChvYmoubGF5ZXIubGVuZ3RoID4gMCA/IFwiIFwiLmNvbmNhdChvYmoubGF5ZXIpIDogXCJcIiwgXCIge1wiKTtcbiAgfVxuXG4gIGNzcyArPSBvYmouY3NzO1xuXG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cblxuICBpZiAob2JqLm1lZGlhKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG5cbiAgaWYgKG9iai5zdXBwb3J0cykge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuXG4gIHZhciBzb3VyY2VNYXAgPSBvYmouc291cmNlTWFwO1xuXG4gIGlmIChzb3VyY2VNYXAgJiYgdHlwZW9mIGJ0b2EgIT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICBjc3MgKz0gXCJcXG4vKiMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247YmFzZTY0LFwiLmNvbmNhdChidG9hKHVuZXNjYXBlKGVuY29kZVVSSUNvbXBvbmVudChKU09OLnN0cmluZ2lmeShzb3VyY2VNYXApKSkpLCBcIiAqL1wiKTtcbiAgfSAvLyBGb3Igb2xkIElFXG5cbiAgLyogaXN0YW5idWwgaWdub3JlIGlmICAqL1xuXG5cbiAgb3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCwgb3B0aW9ucy5vcHRpb25zKTtcbn1cblxuZnVuY3Rpb24gcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCkge1xuICAvLyBpc3RhbmJ1bCBpZ25vcmUgaWZcbiAgaWYgKHN0eWxlRWxlbWVudC5wYXJlbnROb2RlID09PSBudWxsKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgc3R5bGVFbGVtZW50LnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoc3R5bGVFbGVtZW50KTtcbn1cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuXG5cbmZ1bmN0aW9uIGRvbUFQSShvcHRpb25zKSB7XG4gIHZhciBzdHlsZUVsZW1lbnQgPSBvcHRpb25zLmluc2VydFN0eWxlRWxlbWVudChvcHRpb25zKTtcbiAgcmV0dXJuIHtcbiAgICB1cGRhdGU6IGZ1bmN0aW9uIHVwZGF0ZShvYmopIHtcbiAgICAgIGFwcGx5KHN0eWxlRWxlbWVudCwgb3B0aW9ucywgb2JqKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24gcmVtb3ZlKCkge1xuICAgICAgcmVtb3ZlU3R5bGVFbGVtZW50KHN0eWxlRWxlbWVudCk7XG4gICAgfVxuICB9O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGRvbUFQSTsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBzdHlsZVRhZ1RyYW5zZm9ybShjc3MsIHN0eWxlRWxlbWVudCkge1xuICBpZiAoc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQpIHtcbiAgICBzdHlsZUVsZW1lbnQuc3R5bGVTaGVldC5jc3NUZXh0ID0gY3NzO1xuICB9IGVsc2Uge1xuICAgIHdoaWxlIChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCkge1xuICAgICAgc3R5bGVFbGVtZW50LnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudC5maXJzdENoaWxkKTtcbiAgICB9XG5cbiAgICBzdHlsZUVsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY3NzKSk7XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdHlsZVRhZ1RyYW5zZm9ybTsiLCJpbXBvcnQge0NvbXBvbmVudCAsIGNyZWF0ZVJlZn0gZnJvbSBcInByZWFjdFwiO1xyXG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tIFwicHJlYWN0L2hvb2tzXCI7XHJcbmltcG9ydCB7aHRtbH0gZnJvbSBcImh0bS9wcmVhY3RcIjtcclxuaW1wb3J0IHtDb2RlSmFyfSBmcm9tIFwiY29kZWphclwiO1xyXG5pbXBvcnQgUHJpc20gZnJvbSAncHJpc21qcyc7XHJcbnJlcXVpcmUoXCJwcmlzbWpzL3RoZW1lcy9wcmlzbS1kYXJrLmNzc1wiKTtcclxucmVxdWlyZShcIi4vY29kZWVkaXRvci5zY3NzXCIpO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBDb2RlRWRpdG9yIGV4dGVuZHMgQ29tcG9uZW50e1xyXG4gIGNvbnN0cnVjdG9yKHByb3BzKXtcclxuICAgIHN1cGVyKHByb3BzKTtcclxuICAgIHRoaXMuY29udGFpbmVyID0gY3JlYXRlUmVmKCk7XHJcbiAgfVxyXG5cclxuICBjb21wb25lbnREaWRNb3VudCgpe1xyXG4gICAgdGhpcy5lZGl0b3IgPSBDb2RlSmFyKHRoaXMuY29udGFpbmVyLmN1cnJlbnQgLCBcclxuICAgIGU9PlByaXNtLmhpZ2hsaWdodEVsZW1lbnQoZSkgLCB7dGFiOiAnICAnfSk7XHJcbiAgICAvL1xyXG4gICAgdGhpcy5lZGl0b3IudXBkYXRlQ29kZSh0aGlzLnByb3BzLnZhbHVlIHx8IFwiXCIpO1xyXG4gICAgdGhpcy5lZGl0b3Iub25VcGRhdGUoZT0+dGhpcy5wcm9wcy5oYW5kbGVyKGUpKTtcclxuICB9XHJcblxyXG4gIHJlbmRlcigpe1xyXG5cclxuICAgIHJldHVybiBodG1sYDxkaXYgY2xhc3M9XCJDb2RlRWRpdG9yIGxhbmd1YWdlLSR7dGhpcy5wcm9wcy5sYW5nIHx8ICdub25lJ31cIiByZWY9JHt0aGlzLmNvbnRhaW5lcn0+XHJcbiAgICAgIFxyXG4gICAgPC9kaXY+YFxyXG4gIH1cclxufVxyXG5cclxuIiwiaW1wb3J0IHsgQ29tcG9uZW50ICwgY3JlYXRlUmVmIH0gZnJvbSBcInByZWFjdFwiO1xyXG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tIFwicHJlYWN0L2hvb2tzXCI7XHJcbmltcG9ydCB7IGh0bWwgfSBmcm9tIFwiaHRtL3ByZWFjdFwiO1xyXG5pbXBvcnQgU3BsaXQgZnJvbSBcInNwbGl0LmpzXCI7XHJcbmltcG9ydCB7IENvZGVFZGl0b3IgfSBmcm9tIFwiLi9Db2RlRWRpdG9yXCI7XHJcbmltcG9ydCB7IFRoZUlucHV0IH0gZnJvbSBcIi4vdXRpbFwiO1xyXG5pbXBvcnQgeyBzYXZlRmlsZSB9IGZyb20gXCIuL2ZpbGVvcHNcIjtcclxucmVxdWlyZShcIi4vZmlkZGxlci5zY3NzXCIpXHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIEZpZGRsZXIgZXh0ZW5kcyBDb21wb25lbnR7XHJcbiAgY29uc3RydWN0b3IocHJvcHMpe1xyXG4gICAgc3VwZXIocHJvcHMpO1xyXG4gICAgY29uc29sZS5sb2coXCJQcm9wc1wiICwgcHJvcHMpO1xyXG4gICAgdGhpcy5tYWluQ29udGFpbmVyID0gY3JlYXRlUmVmKCk7XHJcbiAgICB0aGlzLmVkaXRvcnMgPSBjcmVhdGVSZWYoKTtcclxuICAgIHRoaXMucHJldmlldyA9IGNyZWF0ZVJlZigpO1xyXG4gICAgdGhpcy5jc3NFZGl0b3IgPSBjcmVhdGVSZWYoKTtcclxuICAgIHRoaXMuanNFZGl0b3IgPSBjcmVhdGVSZWYoKTtcclxuICAgIHRoaXMuaHRtbEVkaXRvciA9IGNyZWF0ZVJlZigpO1xyXG4gICAgdGhpcy5tb2RpZmllZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5zdGF0ZSA9IHsgXHJcbiAgICAgIGh0bWw6IHByb3BzLmh0bWwgfHwgXCJcIixcclxuICAgICAganM6IHByb3BzLmpzIHx8IFwiXCIsXHJcbiAgICAgIGNzczogcHJvcHMuY3NzIHx8IFwiXCIsXHJcbiAgICAgIHNldHRpbmdzOiBwcm9wcy5zZXR0aW5ncyxcclxuICAgICAgbW9kaWZpZWQ6IGZhbHNlLFxyXG4gICAgICBzaG93U2V0dGluZ3M6IGZhbHNlLFxyXG4gICAgICBmaWxlbmFtZTogcHJvcHMuc2V0dGluZ3MuZmlsZW5hbWUoKSxcclxuICAgICAgdGl0bGU6IHByb3BzLnNldHRpbmdzLnRpdGxlKCksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBwcm9wcy5zZXR0aW5ncy5kZXNjcmlwdGlvbigpLFxyXG4gICAgICBoZWFkSFRNTDogcHJvcHMuc2V0dGluZ3MuaGVhZEhUTUwoKSxcclxuICAgICAgd2ViVmlld2VkOiBwcm9wcy5zZXR0aW5ncy53ZWJWaWV3ZWQoKSxcclxuXHJcbiAgICB9XHJcbiAgICB0aGlzLnJlbmRlclByZXZpZXcgPSB0aGlzLnJlbmRlclByZXZpZXcuYmluZCh0aGlzKTtcclxuICAgIFxyXG4gIH1cclxuICByZW5kZXIoKXtcclxuICAgIFxyXG4gICAgIHJldHVybiBodG1sYDxkaXZcclxuICAgICBjbGFzcz0ke3RoaXMuc3RhdGUuc2hvd1NldHRpbmdzID8gXCJGaWRkbGVyIHNldHRpbmdzXCIgOiBcIkZpZGRsZXIgbWFpblwifT5cclxuICAgICA8ZGl2IGlkPVwidG9vbGJhclwiPlxyXG5cclxuICAgICA8ZGl2IGlkPVwiaW1tZWRpYXRlVG9vbHNcIj5cclxuICAgICA8aW5wdXQgdHlwZT1cImJ1dHRvblwiIHZhbHVlPVwiU2F2ZVwiIFxyXG4gICAgIG9uY2xpY2s9JHsoKT0+eyBcclxuICAgICBzYXZlRmlsZSh0aGlzLnByb3BzLnNldHRpbmdzICwgdGhpcy5zdGF0ZS5odG1sICwgdGhpcy5zdGF0ZS5jc3MgLCB0aGlzLnN0YXRlLmpzICkgO1xyXG4gICAgIC8vIHRoaXMuc2V0U3RhdGUoe21vZGlmaWVkOiBmYWxzZX0pXHJcbiAgICAgfX1cclxuICAgICBjbGFzcz0ke3RoaXMuc3RhdGUubW9kaWZpZWQgPyBcIm1vZGlmaWVkXCIgOiBcInJlZ3VsYXJcIn1cclxuICAgICBzdHlsZT0ke3ttYXJnaW5SaWdodDogXCIxNnB4XCJ9fT48L2lucHV0PlxyXG4gICAgIDxpbnB1dCB0eXBlPVwiYnV0dG9uXCJcclxuICAgICBzdHlsZT0ke3ttYXJnaW5SaWdodDogXCIxNnB4XCJ9fVxyXG4gICAgIHZhbHVlPVwiUnVuXCJcclxuICAgICBvbmNsaWNrPSR7dGhpcy5yZW5kZXJQcmV2aWV3fVxyXG4gICAgID48L2lucHV0PlxyXG4gICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIlxyXG4gICAgIGNoZWNrZWQ9JHt0aGlzLnByb3BzLnNldHRpbmdzLmF1dG9SdW4oKX1cclxuICAgICBvbmNsaWNrPSR7KGUpPT57dGhpcy5wcm9wcy5zZXR0aW5ncy5hdXRvUnVuKGUudGFyZ2V0LmNoZWNrZWQpIDsgdGhpcy5yZW5kZXJQcmV2aWV3KCl9ICB9XHJcbiAgICAgPjwvaW5wdXQ+PGxhYmVsPkF1dG8gcnVuPC9sYWJlbD5cclxuICAgICA8L2Rpdj5cclxuXHJcbiAgICAgPGRpdiBpZD1cIm90aGVyVG9vbHNcIj5cclxuICAgPGlucHV0IHR5cGU9XCJidXR0b25cIiBcclxuICAgb25jbGljaz0keygpPT50aGlzLnNldFN0YXRlKHtzaG93U2V0dGluZ3M6ICF0aGlzLnN0YXRlLnNob3dTZXR0aW5nc30pfVxyXG4gICB2YWx1ZT0ke3RoaXMuc3RhdGUuc2hvd1NldHRpbmdzID8gXCJIaWRlIFNldHRpbmdzXCIgOiBcIlBhZ2UgU2V0dGluZ3NcIn1cclxuICAgc3R5bGU9JHt7bWFyZ2luUmlnaHQ6IFwiMTZweFwifX1cclxuICAgPjwvaW5wdXQ+XHJcbiAgIDxpbnB1dCB0eXBlPVwiYnV0dG9uXCIgdmFsdWU9XCJWaWV3IE1vZGVcIlxyXG4gICBvbmNsaWNrPSR7ZT0+d2luZG93LmxvY2F0aW9uPVwiI3ZpZXdcIn1cclxuICAgPjwvaW5wdXQ+XHJcblxyXG5cclxuICAgICA8L2Rpdj5cclxuXHJcbiAgICAgPC9kaXY+XHJcblxyXG4gICAgIDxkaXYgY2xhc3M9XCJzcGxpdCB2ZXJ0aWNhbFwiIGlkPVwibWFpbkNvbnRhaW5lclwiIHJlZj0ke3RoaXMubWFpbkNvbnRhaW5lcn0+XHJcbiAgICAgICAgIFxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInNwbGl0IGhvcml6b250YWxcIiBpZD1cImVkaXRvcnNcIiByZWY9JHt0aGlzLmVkaXRvcnN9PlxyXG4gICAgICAgICAgICAgPGRpdiBjbGFzcz1cImVkaXRvckNvbnRhaW5lclwiIGlkPVwiY3NzXCIgcmVmPSR7dGhpcy5jc3NFZGl0b3J9PlxyXG4gICAgICAgICAgICAgICA8aDM+Q1NTPC9oMz5cclxuICAgICAgICAgICAgICAgPCR7Q29kZUVkaXRvcn0gXHJcbiAgICAgICAgICAgICAgIHZhbHVlPSR7dGhpcy5zdGF0ZS5jc3N9XHJcbiAgICAgICAgICAgICAgIGhhbmRsZXI9JHt0aGlzLm1ha2VIYW5kbGVyKCdjc3MnKX1cclxuICAgICAgICAgICAgICAgbGFuZz1cImNzc1wiIC8+XHJcbiAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJlZGl0b3JDb250YWluZXJcIiBpZD1cImh0bWxcIiByZWY9JHt0aGlzLmh0bWxFZGl0b3J9PlxyXG5cclxuICAgICAgICAgICAgICAgPGgzPkhUTUw8L2gzPlxyXG4gICAgICAgICAgICAgICA8JHtDb2RlRWRpdG9yfSBcclxuICAgICAgICAgICAgICAgdmFsdWU9JHt0aGlzLnN0YXRlLmh0bWx9XHJcbiAgICAgICAgICAgICAgIGhhbmRsZXI9JHt0aGlzLm1ha2VIYW5kbGVyKCdodG1sJyl9XHJcbiAgICAgICAgICAgICAgIGxhbmc9XCJodG1sXCIgLz5cclxuICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgPGRpdiBjbGFzcz1cImVkaXRvckNvbnRhaW5lclwiIGlkPVwianNcIiByZWY9JHt0aGlzLmpzRWRpdG9yfT5cclxuICAgICAgICAgICAgICAgPGgzPkphdmEgU2NyaXB0PC9oMz5cclxuICAgICAgICAgICAgICAgPCR7Q29kZUVkaXRvcn0gXHJcbiAgICAgICAgICAgICAgIHZhbHVlPSR7dGhpcy5zdGF0ZS5qc31cclxuICAgICAgICAgICAgICAgaGFuZGxlcj0ke3RoaXMubWFrZUhhbmRsZXIoJ2pzJyl9XHJcbiAgICAgICAgICAgICAgIGxhbmc9XCJqc1wiIC8+XHJcbiAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG5cclxuICAgICAgICAgIDxpZnJhbWUgcmVmPSR7dGhpcy5wcmV2aWV3fT48L2lmcmFtZT5cclxuXHJcbiAgICAgPC9kaXY+XHJcbiAgICAgPGRpdiBpZD1cInNldHRpbmdzQ29udGFpbmVyXCI+XHJcbiAgICAgPGgyPlNldHRpbmdzPC9oMj5cclxuICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNldHRpbmdzUGFuZWxcIj5cclxuICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImxlZnRcIj5cclxuICAgICAgICAgICAgICAgPCR7VGhlSW5wdXR9IGFyZWE9JHtmYWxzZX0gbmFtZT1cImZpbGVuYW1lXCIgdGl0bGU9XCJGaWxlIG5hbWVcIlxyXG4gICAgICAgICAgICAgICB2YWx1ZT0ke3RoaXMuc3RhdGUuZmlsZW5hbWV9XHJcbiAgICAgICAgICAgICAgIGhhbmRsZXI9JHt0aGlzLm1ha2VIYW5kbGVyKFwiZmlsZW5hbWVcIil9XHJcbiAgICAgICAgICAgICAgIC8+XHJcbiAgICAgICAgICAgICAgIDwke1RoZUlucHV0fSBhcmVhPSR7ZmFsc2V9IG5hbWU9XCJ0aXRsZVwiIHRpdGxlPVwiUGFnZSB0aXRsZVwiXHJcbiAgICAgICAgICAgICAgIHZhbHVlPSR7dGhpcy5zdGF0ZS50aXRsZX1cclxuICAgICAgICAgICAgICAgaGFuZGxlcj0ke3RoaXMubWFrZUhhbmRsZXIoXCJ0aXRsZVwiKX1cclxuICAgICAgICAgICAgICAgLz5cclxuICAgICAgICAgICAgICAgPCR7VGhlSW5wdXR9IGFyZWE9JHt0cnVlfSBuYW1lPVwiZGVzY3JpcHRpb25cIiBcclxuICAgICAgICAgICAgICAgdGl0bGU9XCJQYWdlIGRlc2NyaXB0aW9uXCJcclxuICAgICAgICAgICAgICAgdmFsdWU9JHt0aGlzLnN0YXRlLmRlc2NyaXB0aW9ufVxyXG4gICAgICAgICAgICAgICBoYW5kbGVyPSR7dGhpcy5tYWtlSGFuZGxlcihcImRlc2NyaXB0aW9uXCIpfVxyXG4gICAgICAgICAgICAgICAvPlxyXG4gICAgICAgICAgICAgICA8bGFiZWw+V2ViIGJlaGF2aW9yPC9sYWJlbD5cclxuICAgICAgICAgICAgICAgPHNlbGVjdCBvbmNoYW5nZT0ke2U9PnRoaXMubWFrZUhhbmRsZXIoJ3dlYlZpZXdlZCcpKGUudGFyZ2V0LnZhbHVlKX0+XHJcbiAgICAgICAgICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwicmVzdWx0XCIgc2VsZWN0ZWQ9JHt0aGlzLnN0YXRlLndlYlZpZXdlZD09J3Jlc3VsdCd9PlNob3cgcmVzdWx0IG9ubHk8L29wdGlvbj5cclxuICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJlZGl0b3JcIiBzZWxlY3RkPSR7dGhpcy5zdGF0ZS53ZWJWaWV3ZWQ9PSdlZGl0b3InfT5Mb2FkIGVkaXRvcjwvb3B0aW9uPlxyXG5cclxuICAgICAgICAgICAgICAgPC9zZWxlY3Q+XHJcbiAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicmlnaHRcIiBzdHlsZT0ke3twb3NpdGlvbjpcInJlbGF0aXZlXCJ9fT5cclxuICAgICAgICAgICAgICAgPGxhYmVsPkhlYWQgSFRNTDwvbGFiZWw+XHJcbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJlZGl0b3JcIiBzdHlsZT0ke3twb3NpdGlvbjpcInJlbGF0aXZlXCIsIGZsZXhHcm93OiAxfX0+XHJcbiAgICAgICAgICAgICAgIDwke0NvZGVFZGl0b3J9IHZhbHVlPSR7dGhpcy5zdGF0ZS5oZWFkSFRNTH0gXHJcbiAgICAgICAgICAgICAgIGhhbmRsZXI9JHt0aGlzLm1ha2VIYW5kbGVyKFwiaGVhZEhUTUxcIil9XHJcbiAgICAgICAgICAgICAgIGxhbmc9XCJodG1sXCIgLz5cclxuICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICA8L2Rpdj5cclxuXHJcbiAgICAgPC9kaXY+YFxyXG4gIH1cclxuICBtYWtlSGFuZGxlcihuYW1lLCBpbml0VmFsdWUpe1xyXG4gICAgIFxyXG4gICAgIGNvbnN0IGYgPSAodik9PiB7IFxyXG4gICAgIGNvbnNvbGUubG9nKG5hbWUsIHYpICA7IFxyXG4gICAgIGNvbnN0IGMgPSB7fSA7XHJcbiAgICAgY1tcIm1vZGlmaWVkXCJdID0gdHJ1ZTtcclxuXHJcbiAgICAgY1tuYW1lXT12IDtcclxuICAgICB0aGlzLnNldFN0YXRlKGMpIH0gO1xyXG5cclxuICAgICBmLmJpbmQodGhpcyk7XHJcbiAgICAgcmV0dXJuIGY7XHJcblxyXG4gIH1cclxuICBjb21wb25lbnREaWRVcGRhdGUoKXtcclxuICAgIHRoaXMubW9kaWZpZWQgPSB0cnVlO1xyXG4gICAgaWYodGhpcy5wcm9wcy5zZXR0aW5ncy5hdXRvUnVuKCkpXHJcbiAgICB7XHJcbiAgICAgIHRoaXMucmVuZGVyUHJldmlldygpO1xyXG4gICAgfVxyXG4gICAgdGhpcy5wcm9wcy5zZXR0aW5ncy50aXRsZSh0aGlzLnByb3BzLnRpdGxlIHx8IFwiXCIpXHJcbiAgICAuZmlsZW5hbWUodGhpcy5zdGF0ZS5maWxlbmFtZSlcclxuICAgIC50aXRsZSh0aGlzLnN0YXRlLnRpdGxlKVxyXG4gICAgLmRlc2NyaXB0aW9uKHRoaXMuc3RhdGUuZGVzY3JpcHRpb24pXHJcbiAgICAuaGVhZEhUTUwodGhpcy5zdGF0ZS5oZWFkSFRNTClcclxuICAgIC53ZWJWaWV3ZWQodGhpcy5zdGF0ZS53ZWJWaWV3ZWQpXHJcbiAgICAuYXV0b1J1bih0aGlzLnN0YXRlLmF1dG9SdW4pXHJcblxyXG4gICAgXHJcbiAgfVxyXG4gIGNvbXBvbmVudERpZE1vdW50KCl7XHJcbiAgICBTcGxpdCggWyB0aGlzLmNzc0VkaXRvci5jdXJyZW50ICwgdGhpcy5odG1sRWRpdG9yLmN1cnJlbnQgLCB0aGlzLmpzRWRpdG9yLmN1cnJlbnQgXSApO1xyXG4gICAgU3BsaXQoIFt0aGlzLmVkaXRvcnMuY3VycmVudCAsIHRoaXMucHJldmlldy5jdXJyZW50XSAsIHtkaXJlY3Rpb246ICd2ZXJ0aWNhbCcgLCBzaXplczogWzMwLDcwXX0gKTtcclxuICAgIHRoaXMucmVuZGVyUHJldmlldygpO1xyXG4gIH1cclxuICByZW5kZXJQcmV2aWV3KCl7XHJcbiAgICAgdGhpcy5wcmV2aWV3LmN1cnJlbnQuc3JjZG9jID0gYDxodG1sPjxoZWFkPiR7dGhpcy5wcm9wcy5zZXR0aW5ncy5oZWFkSFRNTCgpfVxyXG4gICAgIDxzdHlsZT4ke3RoaXMuc3RhdGUuY3NzIHx8IFwiXCJ9PC9zdHlsZT5cclxuICAgICA8c2NyaXB0PiR7dGhpcy5zdGF0ZS5qcyB8fCBcIlwifTwvc2NyaXB0PlxyXG4gICAgIDwvaGVhZD48Ym9keT4ke3RoaXMuc3RhdGUuaHRtbCB8fCBcIlwifTwvYm9keT48L2h0bWw+YFxyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgeyAgQ29tcG9uZW50fSBmcm9tICdwcmVhY3QnO1xyXG5cclxuZXhwb3J0IGNsYXNzIElmIGV4dGVuZHMgQ29tcG9uZW50e1xyXG4gIGNvbnN0cnVjdG9yKHByb3BzKXtcclxuICAgIHN1cGVyKHByb3BzKVxyXG4gIH1cclxuXHJcbiAgcmVuZGVyKCl7XHJcbiAgICAvLyBjb25zb2xlLmxvZyhcIklGXCIgLCB0aGlzLnByb3BzLmNvbmRpdGlvbilcclxuICAgIGlmKHRoaXMucHJvcHMuY29uZGl0aW9uKXtcclxuICAgICAgcmV0dXJuIHRoaXMucHJvcHMuY2hpbGRyZW5cclxuICAgIH1lbHNle1xyXG4gICAgcmV0dXJuIFwiXCJcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbiIsImltcG9ydCB7IGVzY2FwZVRhZ3MgfSBmcm9tIFwiLi91dGlsXCI7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gdG9IVE1MKFxyXG4gICBzZXR0aW5ncyxcclxuICAgaHRtbCxcclxuICAgY3NzLFxyXG4gICBqc1xyXG4pe1xyXG4gIGNvbnN0IHRwbCA9IGBcclxuPCFET0NUWVBFIGh0bWw+XHJcbjxodG1sIGxhbmc9XCJlblwiPlxyXG48aGVhZD5cclxuICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cclxuICA8dGl0bGU+JHtzZXR0aW5ncy50aXRsZSgpfTwvdGl0bGU+XHJcbiAgPG1ldGEgbmFtZT1cImRlc2NyaXB0aW9uXCIgY29udGVudD1cIiR7c2V0dGluZ3MuZGVzY3JpcHRpb24oKX1cIj5cclxuICAke3NldHRpbmdzLmhlYWRIVE1MKCl9XHJcbiAgPHNjcmlwdD5cclxuICB3aW5kb3cuc2V0dGluZ3MgPSAke0pTT04uc3RyaW5naWZ5KHNldHRpbmdzLmNvcHkodHJ1ZSkgLCBudWxsICwgMil9XHJcbiAgPC9zY3JpcHQ+XHJcbiAgPHNjcmlwdD5cclxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImhhc2hjaGFuZ2VcIiAsICgpPT5oaXN0b3J5LmdvKDApKTtcclxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcclxuICBcIkRPTUNvbnRlbnRMb2FkZWRcIiAsIFxyXG4gIGZ1bmN0aW9uKCl7XHJcbiAgICAgIGNvbnN0IHAgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2w7XHJcbiAgICAgIGlmKHdpbmRvdy5sb2NhdGlvbi5oYXNoPT09XCIjdmlld1wiKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgaWYocC5zdGFydHNXaXRoKFwiaHR0cFwiKSAmJiBcclxuICAgICAgICB3aW5kb3cuc2V0dGluZ3Mud2ViVmlld2VkPT09XCJyZXN1bHRcIiAmJlxyXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoICE9PSBcIiNlZGl0XCJcclxuICAgICAgICApe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocD09J2ZpbGU6JyB8fCB3aW5kb3cubG9jYXRpb24uaGFzaD09XCIjZWRpdFwiKXtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBlZGl0b3JcIilcclxuICAgICAgICAgIGNvbnN0IHMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xyXG4gICAgICAgICAgcy5zcmMgPSAgJ2ZpZGRsZXIuanMnXHJcbiAgICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHMpO1xyXG4gICAgICB9XHJcblxyXG59KVxyXG4gIDwvc2NyaXB0PlxyXG4gIDxzY3JpcHQgaWQ9XCJjdXN0b21KU1wiPiR7anN9PC9zY3JpcHQ+XHJcbiAgPG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cclxuPHN0eWxlIGlkPVwiY3VzdG9tQ1NTXCI+XHJcbiR7Y3NzfVxyXG48L3N0eWxlPlxyXG48L2hlYWQ+XHJcbjxib2R5PlxyXG4ke2h0bWx9XHJcbiA8c2NyaXB0IGlkPVwiaHRtbFNvdXJjZVwiIHR5cGU9XCJ0ZXh0L2h0bWxcIj4ke2VzY2FwZVRhZ3MoIGh0bWwgKX08L3NjcmlwdD5cclxuPC9ib2R5PlxyXG48L2h0bWw+XHJcbmA7XHJcbnJldHVybiB0cGw7XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzYXZlVG9EaXNrKG5hbWUsY29udGVudCl7XHJcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XHJcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCAnZGF0YTp0ZXh0L3BsYWluO2NoYXJzZXQ9dXRmLTgsJyArIGVuY29kZVVSSUNvbXBvbmVudChjb250ZW50KSk7XHJcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2Rvd25sb2FkJywgbmFtZSk7XHJcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChlbGVtZW50KTtcclxuICBlbGVtZW50LmNsaWNrKCk7XHJcbiAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChlbGVtZW50KTtcclxuXHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBzYXZlRmlsZShzZXR0aW5ncywgaHRtbCwgY3NzICwganMpe1xyXG4gICBjb25zb2xlLmluZm8oXCJTYXZpbmcuLi5cIilcclxuICAgY29uc3QgdCA9IHRvSFRNTChzZXR0aW5ncywgaHRtbCwgY3NzLCBqcyk7XHJcbiAgIGNvbnN0IGYgPSBzZXR0aW5ncy5maWxlbmFtZSgpO1xyXG4gICBzYXZlVG9EaXNrKGYsIHQpO1xyXG5cclxufVxyXG5cclxuIiwiIGltcG9ydCB7IGVzY2FwZVRhZ3MgLCB1bmVzY2FwZVRhZ3MgfSBmcm9tIFwiLi91dGlsXCJcclxuXHJcbmNvbnN0IFNUT1JFID0ge307XHJcbmNvbnN0IHByb3BzID0gW1xyXG4gICBcInRpdGxlXCIgLCBcclxuICAgXCJkZXNjcmlwdGlvblwiICwgXHJcbiAgIFwiaW1hZ2VcIiAsIFxyXG4gICBcImZpbGVuYW1lXCIgLCAvL2h0bWwgXHJcbiAgIFwiaGVhZEhUTUxcIiwgLy9odG1sXHJcbiAgIFwiYXV0aG9yXCIsXHJcbiAgIFwia2V5d29yZHNcIixcclxuICAgXCJhdXRvUnVuXCIsXHJcbiAgIFwiZWRpdG9yXCIsXHJcbiAgIFwid2ViVmlld2VkXCJcclxuICAgXVxyXG52YXIgY2FsbGJhY2sgO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZShzZXR0aW5nc19zcmMgLCBjYil7XHJcbi8vIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgc2V0dGluZ3Mgd3JhcHBlclwiICwgc2V0dGluZ3Nfc3JjKVxyXG4gIGlmKGNiKXtjYWxsYmFjaz1jYn1cclxuICBwcm9wcy5mb3JFYWNoKHA9PlNUT1JFW3BdPXNldHRpbmdzX3NyY1twXSB8fCBcIlwiKTtcclxuICByZXR1cm4gY3JlYXRlV3JhcHBlcigpO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVkKGssdil7XHJcbiAgaWYoY2FsbGJhY2spe2NhbGxiYWNrKGssdil9XHJcbiAgLy8gY29uc29sZS5sb2coXCJVcGRhdGVkIHNldHRpbmdcIiAsIGspXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGVzY2FwZWRDb3B5KCl7XHJcbiAgcmV0dXJuIHByb3BzLnJlZHVjZSggKGEsZSk9PnthW2VdPSggU1RPUkVbZV0gfHwgXCJcIiApIDsgcmV0dXJuIGF9ICAsIHt9KVxyXG4gIFxyXG59XHJcblxyXG5mdW5jdGlvbiB1bmVzY2FwZWRDb3B5KCl7XHJcbiAgcmV0dXJuIHByb3BzLnJlZHVjZSggKGEsZSk9PnthW2VdPXVuZXNjYXBlVGFncyggU1RPUkVbZV0gfHwgXCJcIiApIDsgcmV0dXJuIGF9ICAsIHt9KVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVXcmFwcGVyKCl7XHJcbiAgIGNvbnN0IHcgPSB7fTtcclxuICAgdy5saXN0UHJvcHMgPSAoKT0+IHByb3BzLnNsaWNlKDApO1xyXG4gICB3LmNvcHkgPSAoZXNjYXBlKT0+IGVzY2FwZSA/IGVzY2FwZWRDb3B5KCkgOiB1bmVzY2FwZWRDb3B5KCk7XHJcbiAgIHByb3BzLmZvckVhY2goIHA9PntcclxuICAgICAgd1twXSA9ICh2KT0+eyBpZih2PT09dW5kZWZpbmVkKXtyZXR1cm4gdW5lc2NhcGVUYWdzKCBTVE9SRVtwXSB8fCBcIlwiICl9IDsgIFxyXG4gICAgICBjb25zdCBldiA9IGVzY2FwZVRhZ3Modik7XHJcbiAgICAgIGNvbnNvbGUubG9nKFwiRVZcIiAsIHAgLCBldik7XHJcbiAgICAgIGlmKFNUT1JFW3BdPT09ZXYpe3JldHVybiB3fVxyXG4gICAgICBTVE9SRVtwXT1ldiA7IHVwZGF0ZWQocCx2KSA7IHJldHVybiB3IH1cclxuICAgfSApXHJcbiAgIHJldHVybiB3O1xyXG59XHJcblxyXG4iLCJpbXBvcnQge0NvbXBvbmVudCAsIGNyZWF0ZVJlZn0gZnJvbSBcInByZWFjdFwiO1xyXG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tIFwicHJlYWN0L2hvb2tzXCI7XHJcbmltcG9ydCB7aHRtbH0gZnJvbSBcImh0bS9wcmVhY3RcIjtcclxuaW1wb3J0IHsgSWYgfSBmcm9tIFwiLi9JZlwiO1xyXG5cclxuY29uc3QgdGFnc1RvUmVwbGFjZSA9IHtcclxuICAnJic6ICcmYW1wOycsXHJcbiAgJzwnOiAnJmx0OycsXHJcbiAgJz4nOiAnJmd0OydcclxufTtcclxuXHJcbmNvbnN0IHJlcGxhY2VUb1RhZ3MgPSB7XHJcbiAgJyZhbXA7JzonJicsXHJcbiAgJyZsdDsnOiAnPCcsXHJcbiAgJyZndDsnOiAnPidcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGVzY2FwZVRhZ3Mocyl7XHJcbiAgaWYodHlwZW9mKHMpIT09J3N0cmluZycpe3JldHVybiBzfTtcclxuICBjb25zdCByZXBsYWNlcj0odGFnKT0+e3JldHVybiB0YWdzVG9SZXBsYWNlW3RhZ118fHRhZ31cclxuICByZXR1cm4gcy5yZXBsYWNlKC9bJjw+XS9nICwgcmVwbGFjZXIpO1xyXG59XHJcbmV4cG9ydCBmdW5jdGlvbiB1bmVzY2FwZVRhZ3Mocyl7XHJcbiAgaWYodHlwZW9mKHMpIT09J3N0cmluZycpe3JldHVybiBzfTtcclxuICBjb25zdCByZXBsYWNlcj0odGFnKT0+e3JldHVybiByZXBsYWNlVG9UYWdzW3RhZ118fHRhZ31cclxuICByZXR1cm4gcy5yZXBsYWNlKC8mYW1wO3wmbHQ7fCZndDsvZyAsIHJlcGxhY2VyKTtcclxufVxyXG5cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBUaGVJbnB1dChwcm9wcyl7XHJcbiAgY29uc3QgaW5wID0gdXNlUmVmKG51bGwpO1xyXG4gIGNvbnN0IG9uQ2hhbmdlID0gKCk9Pntwcm9wcy5oYW5kbGVyKGlucC5jdXJyZW50LnZhbHVlKX07XHJcblxyXG4gIHJldHVybiBodG1sYDxkaXYgY2xhc3M9XCJUaGVJbnB1dFwiPlxyXG4gIDxsYWJlbCBjbGFzcz1cImxhYmVsXCIgZm9yPSR7cHJvcHMubmFtZSB8fCBcIlwiIH0+JHtwcm9wcy50aXRsZX08L2xhYmVsPlxyXG4gIDwke0lmfSBjb25kaXRpb249JHtwcm9wcy5hcmVhPT10cnVlfT5cclxuICA8dGV4dGFyZWEgcmVmPSR7aW5wfSBcclxuICBzdHlsZT1cIm1pbi1oZWlnaHQ6IDEyMHB4O3RyYW5zaXRpb246aGVpZ2h0IC41c1wiXHJcbiAgY2xhc3M9JHtcImlucHV0IGJpZ2lub3V0IGFyZWFcIitwcm9wcy5uYW1lfVxyXG4gIG5hbWU9JHtwcm9wcy5uYW1lIHx8IFwiXCJ9IFxyXG4gIG9uZm9jdXM9JHsoZSk9PntcclxuICAgICBjb25zdCBiaCA9IGUudGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcclxuICAgICBjb25zdCBzaCA9IGUudGFyZ2V0LnNjcm9sbEhlaWdodDtcclxuICAgICBpZihzaD5iaCl7XHJcbiAgICAgICBlLnRhcmdldC5zdHlsZS5oZWlnaHQ9KHNoKzE2KStcInB4XCJcclxuICAgICAgIH1cclxuICAgIH19XHJcbiAgb25ibHVyPSR7IChlKT0+ZS50YXJnZXQuc3R5bGUuaGVpZ2h0PVwiMTIwcHhcIiB9XHJcbiAgb25rZXl1cD0keyhlKT0+eyBcclxuICAgICBjb25zdCBiaCA9IGUudGFyZ2V0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpLmhlaWdodDtcclxuICAgICBjb25zdCBzaCA9IGUudGFyZ2V0LnNjcm9sbEhlaWdodDtcclxuICAgICBpZihzaD5iaCl7XHJcbiAgICAgICBlLnRhcmdldC5zdHlsZS5oZWlnaHQ9KHNoKzE2KStcInB4XCJcclxuICAgICB9XHJcbiAgICAgb25DaGFuZ2UoKVxyXG4gICAgfX1cclxuICBvbmNoYW5nZT0keyhlKT0+eyBvbkNoYW5nZSgpOyB9fSA+XHJcbiAgJHtwcm9wcy52YWx1ZSB8fCBcIlwifVxyXG4gIDwvdGV4dGFyZWE+XHJcbiAgPC8ke0lmfT5cclxuICA8JHtJZn0gY29uZGl0aW9uPSR7cHJvcHMuYXJlYT09ZmFsc2V9PlxyXG4gIDxpbnB1dCBjbGFzcz1cImlucHV0XCIgdHlwZT1cInRleHRcIiByZWY9JHtpbnB9IG5hbWU9JHtwcm9wcy5uYW1lIHx8IFwiXCJ9XHJcbiAgdmFsdWU9JHtwcm9wcy52YWx1ZSB8fCBcIlwifVxyXG4gIG9uY2hhbmdlPSR7b25DaGFuZ2V9XHJcbiAgPjwvaW5wdXQ+XHJcbiAgPC8ke0lmfT5cclxuICA8L2Rpdj5gXHJcblxyXG59XHJcblxyXG4iLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdGlkOiBtb2R1bGVJZCxcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdKG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuLy8gZXhwb3NlIHRoZSBtb2R1bGVzIG9iamVjdCAoX193ZWJwYWNrX21vZHVsZXNfXylcbl9fd2VicGFja19yZXF1aXJlX18ubSA9IF9fd2VicGFja19tb2R1bGVzX187XG5cbiIsIi8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSAobW9kdWxlKSA9PiB7XG5cdHZhciBnZXR0ZXIgPSBtb2R1bGUgJiYgbW9kdWxlLl9fZXNNb2R1bGUgP1xuXHRcdCgpID0+IChtb2R1bGVbJ2RlZmF1bHQnXSkgOlxuXHRcdCgpID0+IChtb2R1bGUpO1xuXHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCB7IGE6IGdldHRlciB9KTtcblx0cmV0dXJuIGdldHRlcjtcbn07IiwiLy8gZGVmaW5lIGdldHRlciBmdW5jdGlvbnMgZm9yIGhhcm1vbnkgZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5kID0gKGV4cG9ydHMsIGRlZmluaXRpb24pID0+IHtcblx0Zm9yKHZhciBrZXkgaW4gZGVmaW5pdGlvbikge1xuXHRcdGlmKF9fd2VicGFja19yZXF1aXJlX18ubyhkZWZpbml0aW9uLCBrZXkpICYmICFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywga2V5KSkge1xuXHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIGtleSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGRlZmluaXRpb25ba2V5XSB9KTtcblx0XHR9XG5cdH1cbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5nID0gKGZ1bmN0aW9uKCkge1xuXHRpZiAodHlwZW9mIGdsb2JhbFRoaXMgPT09ICdvYmplY3QnKSByZXR1cm4gZ2xvYmFsVGhpcztcblx0dHJ5IHtcblx0XHRyZXR1cm4gdGhpcyB8fCBuZXcgRnVuY3Rpb24oJ3JldHVybiB0aGlzJykoKTtcblx0fSBjYXRjaCAoZSkge1xuXHRcdGlmICh0eXBlb2Ygd2luZG93ID09PSAnb2JqZWN0JykgcmV0dXJuIHdpbmRvdztcblx0fVxufSkoKTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5iID0gZG9jdW1lbnQuYmFzZVVSSSB8fCBzZWxmLmxvY2F0aW9uLmhyZWY7XG5cbi8vIG9iamVjdCB0byBzdG9yZSBsb2FkZWQgYW5kIGxvYWRpbmcgY2h1bmtzXG4vLyB1bmRlZmluZWQgPSBjaHVuayBub3QgbG9hZGVkLCBudWxsID0gY2h1bmsgcHJlbG9hZGVkL3ByZWZldGNoZWRcbi8vIFtyZXNvbHZlLCByZWplY3QsIFByb21pc2VdID0gY2h1bmsgbG9hZGluZywgMCA9IGNodW5rIGxvYWRlZFxudmFyIGluc3RhbGxlZENodW5rcyA9IHtcblx0XCJmaWRkbGVyXCI6IDBcbn07XG5cbi8vIG5vIGNodW5rIG9uIGRlbWFuZCBsb2FkaW5nXG5cbi8vIG5vIHByZWZldGNoaW5nXG5cbi8vIG5vIHByZWxvYWRlZFxuXG4vLyBubyBITVJcblxuLy8gbm8gSE1SIG1hbmlmZXN0XG5cbi8vIG5vIG9uIGNodW5rcyBsb2FkZWRcblxuLy8gbm8ganNvbnAgZnVuY3Rpb24iLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm5jID0gdW5kZWZpbmVkOyIsImltcG9ydCB7aCAsIHJlbmRlciB9IGZyb20gXCJwcmVhY3RcIjtcclxuaW1wb3J0IHsgRmlkZGxlciB9IGZyb20gXCIuL0ZpZGRsZXJcIjtcclxuaW1wb3J0IHtlc2NhcGVUYWdzICwgdW5lc2NhcGVUYWdzfSBmcm9tIFwiLi91dGlsXCI7XHJcbmltcG9ydCB7IGNyZWF0ZSBhcyBjcmVhdGVTZXR0aW5ncyB9IGZyb20gXCIuL3NldHRpbmdzXCI7XHJcbmNvbnNvbGUubG9nKFwiTG9hZGluZyBlZGl0b3IsIHN0YWdlIDFcIik7XHJcblxyXG4vL0FDVElPTlNcclxuLy9yZW1vdmUgYWxsIGxpbmsgdGFnc1xyXG5jb25zdCBscyA9IGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvckFsbChcImxpbmtcIik7XHJcbmxzLmZvckVhY2goZT0+ZS5yZW1vdmUoKSk7XHJcblxyXG4vL1xyXG4vL3JlbW92ZSBjdXN0b20gSlNcclxuLy9zYXZlIGl0J3MgdmFsdWVcclxuY29uc3QgaiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3VzdG9tSlNcIik7XHJcbmNvbnN0IGpzID0gIGouaW5uZXJIVE1MLnRyaW0oKSA7XHJcbmoucmVtb3ZlKCk7XHJcbi8vcmVtb3ZlIGN1c3RvbSBDU1NcclxuLy9zYXZlIGl0J3MgdmFsdWVcclxuY29uc3QgYz0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjdXN0b21DU1NcIilcclxuY29uc3QgY3NzID0gYy5pbm5lckhUTUwudHJpbSgpO1xyXG5jLnJlbW92ZSgpO1xyXG4vL2xvYWQgaHRtbCBzb3VyY2VcclxuLy9zYXZlIGl0J3MgdmFsdWVcclxuY29uc3QgaHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImh0bWxTb3VyY2VcIik7XHJcbmNvbnN0IGh0bWw9dW5lc2NhcGVUYWdzKCBodC5pbm5lckhUTUwgKTtcclxuaHQucmVtb3ZlKCk7XHJcbmNvbnN0IHNldHRpbmdzID0gY3JlYXRlU2V0dGluZ3Mod2luZG93LnNldHRpbmdzIHx8IHt9KTtcclxuXHJcblxyXG4vL3JlbW92ZSBldmVyeXRoaW5nIGluc2lkZSBCT0RZXHJcbmRvY3VtZW50LmJvZHkuaW5uZXJIVE1MID0gXCI8IS0tZW1wdHktLT5cIlxyXG4vL2xvYWQgZWRpdG9yIFxyXG5cclxuY29uc3QgRWRpdG9yID0gaChcclxuICAgRmlkZGxlcixcclxuICAge2NzcyxqcyxodG1sLHNldHRpbmdzfVxyXG4pO1xyXG4vLyAgICAtLS0gcmVuZGVyIGl0IGluc2lkZSBib2R5XHJcbnJlbmRlcihFZGl0b3IsIGRvY3VtZW50LmJvZHkpXHJcbiJdLCJuYW1lcyI6W10sInNvdXJjZVJvb3QiOiIifQ==