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
___CSS_LOADER_EXPORT___.push([module.id, ".CodeEditor {\n  position: absolute;\n  top: 0px;\n  width: 100%;\n  bottom: 0;\n  background-color: #1f1f1c;\n  color: silver;\n  font-family: monospace;\n  padding: 24px;\n  font-size: 16px;\n  line-height: 120%;\n}", "",{"version":3,"sources":["webpack://./src/codeeditor.scss"],"names":[],"mappings":"AAAA;EACE,kBAAA;EACA,QAAA;EACA,WAAA;EACA,SAAA;EACA,yBAAA;EACA,aAAA;EACA,sBAAA;EACA,aAAA;EACA,eAAA;EACA,iBAAA;AACF","sourcesContent":[".CodeEditor{\n  position: absolute;\n  top: 0px;\n  width: 100%;\n  bottom: 0;\n  background-color: #1f1f1c;\n  color: silver;\n  font-family: monospace;\n  padding: 24px;\n  font-size: 16px;\n  line-height: 120%;\n}\n"],"sourceRoot":""}]);
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
___CSS_LOADER_EXPORT___.push([module.id, "body, html {\n  padding: 0;\n  margin: 0;\n  min-width: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n  font-size: 16px;\n}\nbody *, html * {\n  box-sizing: border-box;\n}\n\n.Fiddler {\n  width: 100%;\n  height: 100vh;\n  background-color: silver;\n  display: flex;\n  flex-direction: column;\n}\n.Fiddler.settings #mainContainer {\n  display: none;\n}\n.Fiddler.main #settingsContainer {\n  display: none;\n}\n.Fiddler #mainContainer, .Fiddler #editors {\n  flex-grow: 1;\n}\n.Fiddler #mainContainer {\n  flex-direction: column;\n}\n.Fiddler #mainContainer iframe {\n  flex-grow: 1;\n  border: none;\n  height: 60%;\n}\n.Fiddler #settingsContainer {\n  padding: 16px;\n}\n\n#editors .editorContainer {\n  flex-grow: 1;\n  position: relative;\n}\n#editors .editorContainer h3 {\n  position: absolute;\n  color: white;\n  opacity: 0.3;\n  z-index: 10;\n  font-size: 13px;\n  font-weight: normal;\n  height: 24px;\n  margin: 0;\n  padding: 4px;\n  padding-left: 12px;\n  pointer-events: none;\n  user-select: none;\n  letter-spacing: 0.05em;\n}\n\n#toolbar {\n  width: 100%;\n  height: 64px;\n  background-color: #666;\n  color: white;\n  padding: 16px;\n  display: flex;\n  flex-direction: row;\n  justify-content: space-between;\n}\n#toolbar input[type=button] {\n  height: 32px;\n  padding-left: 16px;\n  padding-right: 16px;\n  border: none;\n  outline: none;\n  border-radius: 4px;\n}\n#toolbar input[type=button].modified {\n  background-color: orangered;\n}\n\n.settingsPanel {\n  display: flex;\n  flex-direction: row;\n  justify-content: stretch;\n}\n.settingsPanel * {\n  flex-grow: 0.75;\n}\n.settingsPanel .left {\n  padding-right: 16px;\n}\n.settingsPanel .right {\n  flex-grow: 1.5;\n  display: flex;\n  flex-direction: column;\n  justify-content: stretch;\n}\n.settingsPanel label {\n  display: block;\n  font-size: 13px;\n  padding: 6px 4px;\n  flex-grow: 0;\n}\n.settingsPanel input, .settingsPanel textarea {\n  width: 100%;\n  margin-bottom: 1rem;\n  font-size: inherit;\n  border: none;\n  padding: 8px;\n  resize: none;\n}\n.settingsPanel input:last-child, .settingsPanel textarea:last-child {\n  margin-bottom: 0;\n}\n.settingsPanel input, .settingsPanel textarea, .settingsPanel .CodeEditor {\n  border-radius: 4px;\n}\n.settingsPanel .CodeEditor {\n  padding: 8px;\n  height: auto;\n}\n@media (max-width: 1000px) {\n  .settingsPanel {\n    flex-direction: column;\n  }\n  .settingsPanel .left {\n    padding-right: 0;\n  }\n  .settingsPanel .right {\n    min-height: 300px;\n  }\n}\n\n.split {\n  display: flex;\n  flex-grow: 1;\n}\n.split.horizontal {\n  flex-direction: row;\n}\n\n.gutter {\n  background-color: #666;\n  background-repeat: no-repeat;\n  background-position: 50%;\n}\n\n.gutter.gutter-horizontal {\n  background-image: url(" + ___CSS_LOADER_URL_REPLACEMENT_0___ + ");\n  cursor: col-resize;\n}\n\n.gutter.gutter-vertical {\n  background-image: url(" + ___CSS_LOADER_URL_REPLACEMENT_1___ + ");\n  cursor: row-resize;\n}", "",{"version":3,"sources":["webpack://./src/fiddler.scss"],"names":[],"mappings":"AAAA;EACE,UAAA;EACA,SAAA;EACA,eAAA;EACA,yCAAA;EACA,eAAA;AACF;AAAE;EACE,sBAAA;AAEJ;;AAEA;EACE,WAAA;EACA,aAAA;EACA,wBAAA;EACA,aAAA;EACA,sBAAA;AACF;AAEI;EACE,aAAA;AAAN;AAKI;EACE,aAAA;AAHN;AAOE;EACE,YAAA;AALJ;AAQE;EACE,sBAAA;AANJ;AAOI;EACE,YAAA;EACA,YAAA;EACA,WAAA;AALN;AAQE;EACE,aAAA;AANJ;;AAYE;EACE,YAAA;EACA,kBAAA;AATJ;AAUI;EACE,kBAAA;EACA,YAAA;EACA,YAAA;EACA,WAAA;EACA,eAAA;EACA,mBAAA;EACA,YAAA;EACA,SAAA;EACA,YAAA;EACA,kBAAA;EACA,oBAAA;EACA,iBAAA;EACA,sBAAA;AARN;;AAcA;EACE,WAAA;EACA,YAAA;EACA,sBAAA;EACA,YAAA;EACA,aAAA;EACA,aAAA;EACA,mBAAA;EACA,8BAAA;AAXF;AAYE;EACE,YAAA;EACA,kBAAA;EACA,mBAAA;EACA,YAAA;EACA,aAAA;EACA,kBAAA;AAVJ;AAWI;EACE,2BAAA;AATN;;AAcA;EACI,aAAA;EACA,mBAAA;EACA,wBAAA;AAXJ;AAYI;EACE,eAAA;AAVN;AAYI;EACE,mBAAA;AAVN;AAYI;EACE,cAAA;EACA,aAAA;EACA,sBAAA;EACA,wBAAA;AAVN;AAYI;EACE,cAAA;EACA,eAAA;EACA,gBAAA;EACA,YAAA;AAVN;AAaI;EACE,WAAA;EACA,mBAAA;EACA,kBAAA;EACA,YAAA;EACA,YAAA;EACA,YAAA;AAXN;AAYM;EACE,gBAAA;AAVR;AAaI;EACE,kBAAA;AAXN;AAaI;EACE,YAAA;EACA,YAAA;AAXN;AAaI;EAzCJ;IA0CM,sBAAA;EAVJ;EAWI;IACE,gBAAA;EATN;EAWI;IACE,iBAAA;EATN;AACF;;AAaA;EACI,aAAA;EACA,YAAA;AAVJ;AAWI;EAEE,mBAAA;AAVN;;AAcA;EACI,sBAAA;EACA,4BAAA;EACA,wBAAA;AAXJ;;AAcA;EACI,yDAAA;EACA,kBAAA;AAXJ;;AAaA;EACI,yDAAA;EACA,kBAAA;AAVJ","sourcesContent":["body, html{\n  padding: 0;\n  margin: 0;\n  min-width: 100%;\n  font-family: Arial, Helvetica, sans-serif;\n  font-size: 16px;\n  *{\n    box-sizing: border-box;\n  }\n}\n\n.Fiddler{\n  width: 100%;\n  height: 100vh;\n  background-color: silver;\n  display: flex;\n  flex-direction: column;\n\n  &.settings{\n    #mainContainer{\n      display: none;\n    }\n  }\n\n  &.main{\n    #settingsContainer{\n      display: none;\n    }\n  }\n\n  #mainContainer , #editors{\n    flex-grow: 1;\n  }\n\n  #mainContainer{\n    flex-direction: column;\n    iframe{\n      flex-grow: 1;\n      border: none;\n      height: 60%;\n    }\n  }\n  #settingsContainer{\n    padding: 16px;\n  }\n\n}\n\n#editors{\n  .editorContainer{\n    flex-grow: 1;\n    position: relative;\n    h3{\n      position: absolute;\n      color: white;\n      opacity: .3;\n      z-index: 10;\n      font-size: 13px;\n      font-weight: normal;\n      height: 24px;\n      margin: 0;\n      padding: 4px;\n      padding-left: 12px;\n      pointer-events: none;\n      user-select: none;\n      letter-spacing: 0.05em;\n    }\n  }\n\n}\n\n#toolbar{\n  width: 100%;\n  height: 64px;\n  background-color: #666;\n  color: white;\n  padding: 16px;\n  display: flex;\n  flex-direction: row;\n  justify-content: space-between;\n  input[type=button]{\n    height: 32px;\n    padding-left: 16px;\n    padding-right: 16px;\n    border: none;\n    outline: none;\n    border-radius: 4px;\n    &.modified{\n      background-color: orangered;\n    }\n  }\n}\n\n.settingsPanel{\n    display: flex;\n    flex-direction: row;\n    justify-content: stretch;\n    *{\n      flex-grow: 0.75;\n    }\n    .left{\n      padding-right: 16px;\n    }\n    .right{\n      flex-grow: 1.5;\n      display: flex;\n      flex-direction: column;\n      justify-content: stretch;\n    }\n    label{\n      display: block;\n      font-size: 13px;\n      padding:  6px 4px;\n      flex-grow: 0;\n\n    }\n    input, textarea{\n      width: 100%;\n      margin-bottom: 1rem;\n      font-size: inherit;\n      border: none;\n      padding: 8px;\n      resize: none;\n      &:last-child{\n        margin-bottom: 0;\n      }\n    }\n    input, textarea, .CodeEditor{\n      border-radius: 4px;\n    }\n    .CodeEditor{\n      padding: 8px ;\n      height: auto;\n    }\n    @media(max-width: 1000px){\n      flex-direction: column;\n      .left{\n        padding-right: 0;\n      }\n      .right{\n        min-height: 300px;\n      }\n    }\n}\n\n.split {\n    display: flex;\n    flex-grow: 1;\n    &.horizontal//for horizontal  | | | |\n    {\n      flex-direction: row;\n    }\n}\n\n.gutter {\n    background-color: #666;\n    background-repeat: no-repeat;\n    background-position: 50%;\n}\n\n.gutter.gutter-horizontal {\n    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAeCAYAAADkftS9AAAAIklEQVQoU2M4c+bMfxAGAgYYmwGrIIiDjrELjpo5aiZeMwF+yNnOs5KSvgAAAABJRU5ErkJggg==');\n    cursor: col-resize;\n}\n.gutter.gutter-vertical {\n    background-image: url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAFAQMAAABo7865AAAABlBMVEVHcEzMzMzyAv2sAAAAAXRSTlMAQObYZgAAABBJREFUeF5jOAMEEAIEEFwAn3kMwcB6I2AAAAAASUVORK5CYII=');\n    cursor: row-resize;\n}\n"],"sourceRoot":""}]);
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
     onclick=${(e)=>{this.props.settings.autoRun(e.target.checked)}  }
     ></input><label>Auto run</label>
     </div>

     <div id="otherTools">
   <input type="button" 
   onclick=${()=>this.setState({showSettings: !this.state.showSettings})}
   value=${this.state.showSettings ? "Hide Settings" : "Page Settings"}></input>
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
     // console.log(name, v)  ; 
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
      const wn = self.window.name;
      if(window.location.hash=="#view"){
        return;
      }
      if(p=="file:" || window.location.hash=="#edit"){
          console.log("Loading editor...")
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxNQUFNO0FBQ047QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQSxpREFBaUQsc0JBQXNCO0FBQ3ZFOztBQUVBO0FBQ0E7QUFDQTtBQUNBLDhCQUE4QjtBQUM5QjtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQSw4QkFBOEI7O0FBRTlCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsVUFBVTtBQUNWO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBLFVBQVU7QUFDVjtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsaUNBQWlDOztBQUVqQzs7QUFFQSw4QkFBOEI7O0FBRTlCOztBQUVBLDBCQUEwQjs7QUFFMUI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxVQUFVO0FBQ1Y7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBLDhDQUE4QyxlQUFlO0FBQzdEO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsU0FBUzs7QUFFVDtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBLEtBQUs7O0FBRUw7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsY0FBYztBQUNkO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSzs7QUFFTDtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQSxjQUFjO0FBQ2Q7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxpQkFBaUI7QUFDakI7QUFDQSxTQUFTO0FBQ1Q7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7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QUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsV0FBVyxtREFBWTtBQUN2QjtBQUNBLGlCQUFpQixpREFBYyxzQkFBc0I7OztBQUdyRDtBQUNBO0FBQ0E7O0FBRUEsZUFBZSx5Q0FBQztBQUNoQixHQUFHLDZDQUFPO0FBQ1YsSUFBSTtBQUNKO0FBQ0E7QUFDQSw4Q0FBTSIsInNvdXJjZXMiOlsid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvY29kZWphci9jb2RlamFyLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvcHJpc21qcy90aGVtZXMvcHJpc20tZGFyay5jc3MiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9jb2RlZWRpdG9yLnNjc3MiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9maWRkbGVyLnNjc3MiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9hcGkuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9nZXRVcmwuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvaHRtL2Rpc3QvaHRtLm1vZHVsZS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL2h0bS9wcmVhY3QvaW5kZXgubW9kdWxlLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvcHJlYWN0L2Rpc3QvcHJlYWN0Lm1vZHVsZS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3ByZWFjdC9ob29rcy9kaXN0L2hvb2tzLm1vZHVsZS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3ByaXNtanMvcHJpc20uanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9zcGxpdC5qcy9kaXN0L3NwbGl0LmVzLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvcHJpc21qcy90aGVtZXMvcHJpc20tZGFyay5jc3M/MzVhMyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vc3JjL2NvZGVlZGl0b3Iuc2Nzcz81NmEyIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvZmlkZGxlci5zY3NzP2ExZDgiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zZXRBdHRyaWJ1dGVzV2l0aG91dEF0dHJpYnV0ZXMuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qcyIsIndlYnBhY2s6Ly9maWRkbGVyLy4vc3JjL0NvZGVFZGl0b3IuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9GaWRkbGVyLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvSWYuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy9maWxlb3BzLmpzIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvc2V0dGluZ3MuanMiLCJ3ZWJwYWNrOi8vZmlkZGxlci8uL3NyYy91dGlsLmpzIiwid2VicGFjazovL2ZpZGRsZXIvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vZmlkZGxlci93ZWJwYWNrL3J1bnRpbWUvY29tcGF0IGdldCBkZWZhdWx0IGV4cG9ydCIsIndlYnBhY2s6Ly9maWRkbGVyL3dlYnBhY2svcnVudGltZS9kZWZpbmUgcHJvcGVydHkgZ2V0dGVycyIsIndlYnBhY2s6Ly9maWRkbGVyL3dlYnBhY2svcnVudGltZS9nbG9iYWwiLCJ3ZWJwYWNrOi8vZmlkZGxlci93ZWJwYWNrL3J1bnRpbWUvaGFzT3duUHJvcGVydHkgc2hvcnRoYW5kIiwid2VicGFjazovL2ZpZGRsZXIvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9maWRkbGVyL3dlYnBhY2svcnVudGltZS9qc29ucCBjaHVuayBsb2FkaW5nIiwid2VicGFjazovL2ZpZGRsZXIvd2VicGFjay9ydW50aW1lL25vbmNlIiwid2VicGFjazovL2ZpZGRsZXIvLi9zcmMvaW5kZXguanMiXSwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZ2xvYmFsV2luZG93ID0gd2luZG93O1xuZXhwb3J0IGZ1bmN0aW9uIENvZGVKYXIoZWRpdG9yLCBoaWdobGlnaHQsIG9wdCA9IHt9KSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oeyB0YWI6ICdcXHQnLCBpbmRlbnRPbjogL1soe1xcW10kLywgbW92ZVRvTmV3TGluZTogL15bKX1cXF1dLywgc3BlbGxjaGVjazogZmFsc2UsIGNhdGNoVGFiOiB0cnVlLCBwcmVzZXJ2ZUlkZW50OiB0cnVlLCBhZGRDbG9zaW5nOiB0cnVlLCBoaXN0b3J5OiB0cnVlLCB3aW5kb3c6IGdsb2JhbFdpbmRvdyB9LCBvcHQpO1xuICAgIGNvbnN0IHdpbmRvdyA9IG9wdGlvbnMud2luZG93O1xuICAgIGNvbnN0IGRvY3VtZW50ID0gd2luZG93LmRvY3VtZW50O1xuICAgIGxldCBsaXN0ZW5lcnMgPSBbXTtcbiAgICBsZXQgaGlzdG9yeSA9IFtdO1xuICAgIGxldCBhdCA9IC0xO1xuICAgIGxldCBmb2N1cyA9IGZhbHNlO1xuICAgIGxldCBjYWxsYmFjaztcbiAgICBsZXQgcHJldjsgLy8gY29kZSBjb250ZW50IHByaW9yIGtleWRvd24gZXZlbnRcbiAgICBlZGl0b3Iuc2V0QXR0cmlidXRlKCdjb250ZW50ZWRpdGFibGUnLCAncGxhaW50ZXh0LW9ubHknKTtcbiAgICBlZGl0b3Iuc2V0QXR0cmlidXRlKCdzcGVsbGNoZWNrJywgb3B0aW9ucy5zcGVsbGNoZWNrID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG4gICAgZWRpdG9yLnN0eWxlLm91dGxpbmUgPSAnbm9uZSc7XG4gICAgZWRpdG9yLnN0eWxlLm92ZXJmbG93V3JhcCA9ICdicmVhay13b3JkJztcbiAgICBlZGl0b3Iuc3R5bGUub3ZlcmZsb3dZID0gJ2F1dG8nO1xuICAgIGVkaXRvci5zdHlsZS53aGl0ZVNwYWNlID0gJ3ByZS13cmFwJztcbiAgICBsZXQgaXNMZWdhY3kgPSBmYWxzZTsgLy8gdHJ1ZSBpZiBwbGFpbnRleHQtb25seSBpcyBub3Qgc3VwcG9ydGVkXG4gICAgaGlnaGxpZ2h0KGVkaXRvcik7XG4gICAgaWYgKGVkaXRvci5jb250ZW50RWRpdGFibGUgIT09ICdwbGFpbnRleHQtb25seScpXG4gICAgICAgIGlzTGVnYWN5ID0gdHJ1ZTtcbiAgICBpZiAoaXNMZWdhY3kpXG4gICAgICAgIGVkaXRvci5zZXRBdHRyaWJ1dGUoJ2NvbnRlbnRlZGl0YWJsZScsICd0cnVlJyk7XG4gICAgY29uc3QgZGVib3VuY2VIaWdobGlnaHQgPSBkZWJvdW5jZSgoKSA9PiB7XG4gICAgICAgIGNvbnN0IHBvcyA9IHNhdmUoKTtcbiAgICAgICAgaGlnaGxpZ2h0KGVkaXRvciwgcG9zKTtcbiAgICAgICAgcmVzdG9yZShwb3MpO1xuICAgIH0sIDMwKTtcbiAgICBsZXQgcmVjb3JkaW5nID0gZmFsc2U7XG4gICAgY29uc3Qgc2hvdWxkUmVjb3JkID0gKGV2ZW50KSA9PiB7XG4gICAgICAgIHJldHVybiAhaXNVbmRvKGV2ZW50KSAmJiAhaXNSZWRvKGV2ZW50KVxuICAgICAgICAgICAgJiYgZXZlbnQua2V5ICE9PSAnTWV0YSdcbiAgICAgICAgICAgICYmIGV2ZW50LmtleSAhPT0gJ0NvbnRyb2wnXG4gICAgICAgICAgICAmJiBldmVudC5rZXkgIT09ICdBbHQnXG4gICAgICAgICAgICAmJiAhZXZlbnQua2V5LnN0YXJ0c1dpdGgoJ0Fycm93Jyk7XG4gICAgfTtcbiAgICBjb25zdCBkZWJvdW5jZVJlY29yZEhpc3RvcnkgPSBkZWJvdW5jZSgoZXZlbnQpID0+IHtcbiAgICAgICAgaWYgKHNob3VsZFJlY29yZChldmVudCkpIHtcbiAgICAgICAgICAgIHJlY29yZEhpc3RvcnkoKTtcbiAgICAgICAgICAgIHJlY29yZGluZyA9IGZhbHNlO1xuICAgICAgICB9XG4gICAgfSwgMzAwKTtcbiAgICBjb25zdCBvbiA9ICh0eXBlLCBmbikgPT4ge1xuICAgICAgICBsaXN0ZW5lcnMucHVzaChbdHlwZSwgZm5dKTtcbiAgICAgICAgZWRpdG9yLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgZm4pO1xuICAgIH07XG4gICAgb24oJ2tleWRvd24nLCBldmVudCA9PiB7XG4gICAgICAgIGlmIChldmVudC5kZWZhdWx0UHJldmVudGVkKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBwcmV2ID0gdG9TdHJpbmcoKTtcbiAgICAgICAgaWYgKG9wdGlvbnMucHJlc2VydmVJZGVudClcbiAgICAgICAgICAgIGhhbmRsZU5ld0xpbmUoZXZlbnQpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBsZWdhY3lOZXdMaW5lRml4KGV2ZW50KTtcbiAgICAgICAgaWYgKG9wdGlvbnMuY2F0Y2hUYWIpXG4gICAgICAgICAgICBoYW5kbGVUYWJDaGFyYWN0ZXJzKGV2ZW50KTtcbiAgICAgICAgaWYgKG9wdGlvbnMuYWRkQ2xvc2luZylcbiAgICAgICAgICAgIGhhbmRsZVNlbGZDbG9zaW5nQ2hhcmFjdGVycyhldmVudCk7XG4gICAgICAgIGlmIChvcHRpb25zLmhpc3RvcnkpIHtcbiAgICAgICAgICAgIGhhbmRsZVVuZG9SZWRvKGV2ZW50KTtcbiAgICAgICAgICAgIGlmIChzaG91bGRSZWNvcmQoZXZlbnQpICYmICFyZWNvcmRpbmcpIHtcbiAgICAgICAgICAgICAgICByZWNvcmRIaXN0b3J5KCk7XG4gICAgICAgICAgICAgICAgcmVjb3JkaW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNMZWdhY3kpXG4gICAgICAgICAgICByZXN0b3JlKHNhdmUoKSk7XG4gICAgfSk7XG4gICAgb24oJ2tleXVwJywgZXZlbnQgPT4ge1xuICAgICAgICBpZiAoZXZlbnQuZGVmYXVsdFByZXZlbnRlZClcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgaWYgKGV2ZW50LmlzQ29tcG9zaW5nKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBpZiAocHJldiAhPT0gdG9TdHJpbmcoKSlcbiAgICAgICAgICAgIGRlYm91bmNlSGlnaGxpZ2h0KCk7XG4gICAgICAgIGRlYm91bmNlUmVjb3JkSGlzdG9yeShldmVudCk7XG4gICAgICAgIGlmIChjYWxsYmFjaylcbiAgICAgICAgICAgIGNhbGxiYWNrKHRvU3RyaW5nKCkpO1xuICAgIH0pO1xuICAgIG9uKCdmb2N1cycsIF9ldmVudCA9PiB7XG4gICAgICAgIGZvY3VzID0gdHJ1ZTtcbiAgICB9KTtcbiAgICBvbignYmx1cicsIF9ldmVudCA9PiB7XG4gICAgICAgIGZvY3VzID0gZmFsc2U7XG4gICAgfSk7XG4gICAgb24oJ3Bhc3RlJywgZXZlbnQgPT4ge1xuICAgICAgICByZWNvcmRIaXN0b3J5KCk7XG4gICAgICAgIGhhbmRsZVBhc3RlKGV2ZW50KTtcbiAgICAgICAgcmVjb3JkSGlzdG9yeSgpO1xuICAgICAgICBpZiAoY2FsbGJhY2spXG4gICAgICAgICAgICBjYWxsYmFjayh0b1N0cmluZygpKTtcbiAgICB9KTtcbiAgICBmdW5jdGlvbiBzYXZlKCkge1xuICAgICAgICBjb25zdCBzID0gZ2V0U2VsZWN0aW9uKCk7XG4gICAgICAgIGNvbnN0IHBvcyA9IHsgc3RhcnQ6IDAsIGVuZDogMCwgZGlyOiB1bmRlZmluZWQgfTtcbiAgICAgICAgbGV0IHsgYW5jaG9yTm9kZSwgYW5jaG9yT2Zmc2V0LCBmb2N1c05vZGUsIGZvY3VzT2Zmc2V0IH0gPSBzO1xuICAgICAgICBpZiAoIWFuY2hvck5vZGUgfHwgIWZvY3VzTm9kZSlcbiAgICAgICAgICAgIHRocm93ICdlcnJvcjEnO1xuICAgICAgICAvLyBTZWxlY3Rpb24gYW5jaG9yIGFuZCBmb2N1cyBhcmUgZXhwZWN0ZWQgdG8gYmUgdGV4dCBub2RlcyxcbiAgICAgICAgLy8gc28gbm9ybWFsaXplIHRoZW0uXG4gICAgICAgIGlmIChhbmNob3JOb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgICAgIGFuY2hvck5vZGUuaW5zZXJ0QmVmb3JlKG5vZGUsIGFuY2hvck5vZGUuY2hpbGROb2Rlc1thbmNob3JPZmZzZXRdKTtcbiAgICAgICAgICAgIGFuY2hvck5vZGUgPSBub2RlO1xuICAgICAgICAgICAgYW5jaG9yT2Zmc2V0ID0gMDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZm9jdXNOb2RlLm5vZGVUeXBlID09PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICAgICAgY29uc3Qgbm9kZSA9IGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCcnKTtcbiAgICAgICAgICAgIGZvY3VzTm9kZS5pbnNlcnRCZWZvcmUobm9kZSwgZm9jdXNOb2RlLmNoaWxkTm9kZXNbZm9jdXNPZmZzZXRdKTtcbiAgICAgICAgICAgIGZvY3VzTm9kZSA9IG5vZGU7XG4gICAgICAgICAgICBmb2N1c09mZnNldCA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgdmlzaXQoZWRpdG9yLCBlbCA9PiB7XG4gICAgICAgICAgICBpZiAoZWwgPT09IGFuY2hvck5vZGUgJiYgZWwgPT09IGZvY3VzTm9kZSkge1xuICAgICAgICAgICAgICAgIHBvcy5zdGFydCArPSBhbmNob3JPZmZzZXQ7XG4gICAgICAgICAgICAgICAgcG9zLmVuZCArPSBmb2N1c09mZnNldDtcbiAgICAgICAgICAgICAgICBwb3MuZGlyID0gYW5jaG9yT2Zmc2V0IDw9IGZvY3VzT2Zmc2V0ID8gJy0+JyA6ICc8LSc7XG4gICAgICAgICAgICAgICAgcmV0dXJuICdzdG9wJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlbCA9PT0gYW5jaG9yTm9kZSkge1xuICAgICAgICAgICAgICAgIHBvcy5zdGFydCArPSBhbmNob3JPZmZzZXQ7XG4gICAgICAgICAgICAgICAgaWYgKCFwb3MuZGlyKSB7XG4gICAgICAgICAgICAgICAgICAgIHBvcy5kaXIgPSAnLT4nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdzdG9wJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIGlmIChlbCA9PT0gZm9jdXNOb2RlKSB7XG4gICAgICAgICAgICAgICAgcG9zLmVuZCArPSBmb2N1c09mZnNldDtcbiAgICAgICAgICAgICAgICBpZiAoIXBvcy5kaXIpIHtcbiAgICAgICAgICAgICAgICAgICAgcG9zLmRpciA9ICc8LSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gJ3N0b3AnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChlbC5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUpIHtcbiAgICAgICAgICAgICAgICBpZiAocG9zLmRpciAhPSAnLT4nKVxuICAgICAgICAgICAgICAgICAgICBwb3Muc3RhcnQgKz0gZWwubm9kZVZhbHVlLmxlbmd0aDtcbiAgICAgICAgICAgICAgICBpZiAocG9zLmRpciAhPSAnPC0nKVxuICAgICAgICAgICAgICAgICAgICBwb3MuZW5kICs9IGVsLm5vZGVWYWx1ZS5sZW5ndGg7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBjb2xsYXBzZSBlbXB0eSB0ZXh0IG5vZGVzXG4gICAgICAgIGVkaXRvci5ub3JtYWxpemUoKTtcbiAgICAgICAgcmV0dXJuIHBvcztcbiAgICB9XG4gICAgZnVuY3Rpb24gcmVzdG9yZShwb3MpIHtcbiAgICAgICAgY29uc3QgcyA9IGdldFNlbGVjdGlvbigpO1xuICAgICAgICBsZXQgc3RhcnROb2RlLCBzdGFydE9mZnNldCA9IDA7XG4gICAgICAgIGxldCBlbmROb2RlLCBlbmRPZmZzZXQgPSAwO1xuICAgICAgICBpZiAoIXBvcy5kaXIpXG4gICAgICAgICAgICBwb3MuZGlyID0gJy0+JztcbiAgICAgICAgaWYgKHBvcy5zdGFydCA8IDApXG4gICAgICAgICAgICBwb3Muc3RhcnQgPSAwO1xuICAgICAgICBpZiAocG9zLmVuZCA8IDApXG4gICAgICAgICAgICBwb3MuZW5kID0gMDtcbiAgICAgICAgLy8gRmxpcCBzdGFydCBhbmQgZW5kIGlmIHRoZSBkaXJlY3Rpb24gcmV2ZXJzZWRcbiAgICAgICAgaWYgKHBvcy5kaXIgPT0gJzwtJykge1xuICAgICAgICAgICAgY29uc3QgeyBzdGFydCwgZW5kIH0gPSBwb3M7XG4gICAgICAgICAgICBwb3Muc3RhcnQgPSBlbmQ7XG4gICAgICAgICAgICBwb3MuZW5kID0gc3RhcnQ7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN1cnJlbnQgPSAwO1xuICAgICAgICB2aXNpdChlZGl0b3IsIGVsID0+IHtcbiAgICAgICAgICAgIGlmIChlbC5ub2RlVHlwZSAhPT0gTm9kZS5URVhUX05PREUpXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgY29uc3QgbGVuID0gKGVsLm5vZGVWYWx1ZSB8fCAnJykubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKGN1cnJlbnQgKyBsZW4gPiBwb3Muc3RhcnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIXN0YXJ0Tm9kZSkge1xuICAgICAgICAgICAgICAgICAgICBzdGFydE5vZGUgPSBlbDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRPZmZzZXQgPSBwb3Muc3RhcnQgLSBjdXJyZW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudCArIGxlbiA+IHBvcy5lbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgZW5kTm9kZSA9IGVsO1xuICAgICAgICAgICAgICAgICAgICBlbmRPZmZzZXQgPSBwb3MuZW5kIC0gY3VycmVudDtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuICdzdG9wJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjdXJyZW50ICs9IGxlbjtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc3RhcnROb2RlKVxuICAgICAgICAgICAgc3RhcnROb2RlID0gZWRpdG9yLCBzdGFydE9mZnNldCA9IGVkaXRvci5jaGlsZE5vZGVzLmxlbmd0aDtcbiAgICAgICAgaWYgKCFlbmROb2RlKVxuICAgICAgICAgICAgZW5kTm9kZSA9IGVkaXRvciwgZW5kT2Zmc2V0ID0gZWRpdG9yLmNoaWxkTm9kZXMubGVuZ3RoO1xuICAgICAgICAvLyBGbGlwIGJhY2sgdGhlIHNlbGVjdGlvblxuICAgICAgICBpZiAocG9zLmRpciA9PSAnPC0nKSB7XG4gICAgICAgICAgICBbc3RhcnROb2RlLCBzdGFydE9mZnNldCwgZW5kTm9kZSwgZW5kT2Zmc2V0XSA9IFtlbmROb2RlLCBlbmRPZmZzZXQsIHN0YXJ0Tm9kZSwgc3RhcnRPZmZzZXRdO1xuICAgICAgICB9XG4gICAgICAgIHMuc2V0QmFzZUFuZEV4dGVudChzdGFydE5vZGUsIHN0YXJ0T2Zmc2V0LCBlbmROb2RlLCBlbmRPZmZzZXQpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBiZWZvcmVDdXJzb3IoKSB7XG4gICAgICAgIGNvbnN0IHMgPSBnZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgY29uc3QgcjAgPSBzLmdldFJhbmdlQXQoMCk7XG4gICAgICAgIGNvbnN0IHIgPSBkb2N1bWVudC5jcmVhdGVSYW5nZSgpO1xuICAgICAgICByLnNlbGVjdE5vZGVDb250ZW50cyhlZGl0b3IpO1xuICAgICAgICByLnNldEVuZChyMC5zdGFydENvbnRhaW5lciwgcjAuc3RhcnRPZmZzZXQpO1xuICAgICAgICByZXR1cm4gci50b1N0cmluZygpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBhZnRlckN1cnNvcigpIHtcbiAgICAgICAgY29uc3QgcyA9IGdldFNlbGVjdGlvbigpO1xuICAgICAgICBjb25zdCByMCA9IHMuZ2V0UmFuZ2VBdCgwKTtcbiAgICAgICAgY29uc3QgciA9IGRvY3VtZW50LmNyZWF0ZVJhbmdlKCk7XG4gICAgICAgIHIuc2VsZWN0Tm9kZUNvbnRlbnRzKGVkaXRvcik7XG4gICAgICAgIHIuc2V0U3RhcnQocjAuZW5kQ29udGFpbmVyLCByMC5lbmRPZmZzZXQpO1xuICAgICAgICByZXR1cm4gci50b1N0cmluZygpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBoYW5kbGVOZXdMaW5lKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgIGNvbnN0IGJlZm9yZSA9IGJlZm9yZUN1cnNvcigpO1xuICAgICAgICAgICAgY29uc3QgYWZ0ZXIgPSBhZnRlckN1cnNvcigpO1xuICAgICAgICAgICAgbGV0IFtwYWRkaW5nXSA9IGZpbmRQYWRkaW5nKGJlZm9yZSk7XG4gICAgICAgICAgICBsZXQgbmV3TGluZVBhZGRpbmcgPSBwYWRkaW5nO1xuICAgICAgICAgICAgLy8gSWYgbGFzdCBzeW1ib2wgaXMgXCJ7XCIgaWRlbnQgbmV3IGxpbmVcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmluZGVudE9uLnRlc3QoYmVmb3JlKSkge1xuICAgICAgICAgICAgICAgIG5ld0xpbmVQYWRkaW5nICs9IG9wdGlvbnMudGFiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUHJlc2VydmUgcGFkZGluZ1xuICAgICAgICAgICAgaWYgKG5ld0xpbmVQYWRkaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICAgICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICAgICAgaW5zZXJ0KCdcXG4nICsgbmV3TGluZVBhZGRpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgbGVnYWN5TmV3TGluZUZpeChldmVudCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBQbGFjZSBhZGphY2VudCBcIn1cIiBvbiBuZXh0IGxpbmVcbiAgICAgICAgICAgIGlmIChuZXdMaW5lUGFkZGluZyAhPT0gcGFkZGluZyAmJiBvcHRpb25zLm1vdmVUb05ld0xpbmUudGVzdChhZnRlcikpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBwb3MgPSBzYXZlKCk7XG4gICAgICAgICAgICAgICAgaW5zZXJ0KCdcXG4nICsgcGFkZGluZyk7XG4gICAgICAgICAgICAgICAgcmVzdG9yZShwb3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGxlZ2FjeU5ld0xpbmVGaXgoZXZlbnQpIHtcbiAgICAgICAgLy8gRmlyZWZveCBkb2VzIG5vdCBzdXBwb3J0IHBsYWludGV4dC1vbmx5IG1vZGVcbiAgICAgICAgLy8gYW5kIHB1dHMgPGRpdj48YnI+PC9kaXY+IG9uIEVudGVyLiBMZXQncyBoZWxwLlxuICAgICAgICBpZiAoaXNMZWdhY3kgJiYgZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGlmIChhZnRlckN1cnNvcigpID09ICcnKSB7XG4gICAgICAgICAgICAgICAgaW5zZXJ0KCdcXG4gJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICAgICAgICAgIHBvcy5zdGFydCA9IC0tcG9zLmVuZDtcbiAgICAgICAgICAgICAgICByZXN0b3JlKHBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnNlcnQoJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIGhhbmRsZVNlbGZDbG9zaW5nQ2hhcmFjdGVycyhldmVudCkge1xuICAgICAgICBjb25zdCBvcGVuID0gYChbeydcImA7XG4gICAgICAgIGNvbnN0IGNsb3NlID0gYCldfSdcImA7XG4gICAgICAgIGNvbnN0IGNvZGVBZnRlciA9IGFmdGVyQ3Vyc29yKCk7XG4gICAgICAgIGNvbnN0IGNvZGVCZWZvcmUgPSBiZWZvcmVDdXJzb3IoKTtcbiAgICAgICAgY29uc3QgZXNjYXBlQ2hhcmFjdGVyID0gY29kZUJlZm9yZS5zdWJzdHIoY29kZUJlZm9yZS5sZW5ndGggLSAxKSA9PT0gJ1xcXFwnO1xuICAgICAgICBjb25zdCBjaGFyQWZ0ZXIgPSBjb2RlQWZ0ZXIuc3Vic3RyKDAsIDEpO1xuICAgICAgICBpZiAoY2xvc2UuaW5jbHVkZXMoZXZlbnQua2V5KSAmJiAhZXNjYXBlQ2hhcmFjdGVyICYmIGNoYXJBZnRlciA9PT0gZXZlbnQua2V5KSB7XG4gICAgICAgICAgICAvLyBXZSBhbHJlYWR5IGhhdmUgY2xvc2luZyBjaGFyIG5leHQgdG8gY3Vyc29yLlxuICAgICAgICAgICAgLy8gTW92ZSBvbmUgY2hhciB0byByaWdodC5cbiAgICAgICAgICAgIGNvbnN0IHBvcyA9IHNhdmUoKTtcbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgICAgIHBvcy5zdGFydCA9ICsrcG9zLmVuZDtcbiAgICAgICAgICAgIHJlc3RvcmUocG9zKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChvcGVuLmluY2x1ZGVzKGV2ZW50LmtleSlcbiAgICAgICAgICAgICYmICFlc2NhcGVDaGFyYWN0ZXJcbiAgICAgICAgICAgICYmIChgXCInYC5pbmNsdWRlcyhldmVudC5rZXkpIHx8IFsnJywgJyAnLCAnXFxuJ10uaW5jbHVkZXMoY2hhckFmdGVyKSkpIHtcbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgICAgIGNvbnN0IHBvcyA9IHNhdmUoKTtcbiAgICAgICAgICAgIGNvbnN0IHdyYXBUZXh0ID0gcG9zLnN0YXJ0ID09IHBvcy5lbmQgPyAnJyA6IGdldFNlbGVjdGlvbigpLnRvU3RyaW5nKCk7XG4gICAgICAgICAgICBjb25zdCB0ZXh0ID0gZXZlbnQua2V5ICsgd3JhcFRleHQgKyBjbG9zZVtvcGVuLmluZGV4T2YoZXZlbnQua2V5KV07XG4gICAgICAgICAgICBpbnNlcnQodGV4dCk7XG4gICAgICAgICAgICBwb3Muc3RhcnQrKztcbiAgICAgICAgICAgIHBvcy5lbmQrKztcbiAgICAgICAgICAgIHJlc3RvcmUocG9zKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBoYW5kbGVUYWJDaGFyYWN0ZXJzKGV2ZW50KSB7XG4gICAgICAgIGlmIChldmVudC5rZXkgPT09ICdUYWInKSB7XG4gICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICBpZiAoZXZlbnQuc2hpZnRLZXkpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBiZWZvcmUgPSBiZWZvcmVDdXJzb3IoKTtcbiAgICAgICAgICAgICAgICBsZXQgW3BhZGRpbmcsIHN0YXJ0LF0gPSBmaW5kUGFkZGluZyhiZWZvcmUpO1xuICAgICAgICAgICAgICAgIGlmIChwYWRkaW5nLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgZnVsbCBsZW5ndGggdGFiIG9yIGp1c3QgcmVtYWluaW5nIHBhZGRpbmdcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGVuID0gTWF0aC5taW4ob3B0aW9ucy50YWIubGVuZ3RoLCBwYWRkaW5nLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3RvcmUoeyBzdGFydCwgZW5kOiBzdGFydCArIGxlbiB9KTtcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZXhlY0NvbW1hbmQoJ2RlbGV0ZScpO1xuICAgICAgICAgICAgICAgICAgICBwb3Muc3RhcnQgLT0gbGVuO1xuICAgICAgICAgICAgICAgICAgICBwb3MuZW5kIC09IGxlbjtcbiAgICAgICAgICAgICAgICAgICAgcmVzdG9yZShwb3MpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgIGluc2VydChvcHRpb25zLnRhYik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgZnVuY3Rpb24gaGFuZGxlVW5kb1JlZG8oZXZlbnQpIHtcbiAgICAgICAgaWYgKGlzVW5kbyhldmVudCkpIHtcbiAgICAgICAgICAgIHByZXZlbnREZWZhdWx0KGV2ZW50KTtcbiAgICAgICAgICAgIGF0LS07XG4gICAgICAgICAgICBjb25zdCByZWNvcmQgPSBoaXN0b3J5W2F0XTtcbiAgICAgICAgICAgIGlmIChyZWNvcmQpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3IuaW5uZXJIVE1MID0gcmVjb3JkLmh0bWw7XG4gICAgICAgICAgICAgICAgcmVzdG9yZShyZWNvcmQucG9zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChhdCA8IDApXG4gICAgICAgICAgICAgICAgYXQgPSAwO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc1JlZG8oZXZlbnQpKSB7XG4gICAgICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgICAgICBhdCsrO1xuICAgICAgICAgICAgY29uc3QgcmVjb3JkID0gaGlzdG9yeVthdF07XG4gICAgICAgICAgICBpZiAocmVjb3JkKSB7XG4gICAgICAgICAgICAgICAgZWRpdG9yLmlubmVySFRNTCA9IHJlY29yZC5odG1sO1xuICAgICAgICAgICAgICAgIHJlc3RvcmUocmVjb3JkLnBvcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoYXQgPj0gaGlzdG9yeS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYXQtLTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiByZWNvcmRIaXN0b3J5KCkge1xuICAgICAgICBpZiAoIWZvY3VzKVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjb25zdCBodG1sID0gZWRpdG9yLmlubmVySFRNTDtcbiAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICBjb25zdCBsYXN0UmVjb3JkID0gaGlzdG9yeVthdF07XG4gICAgICAgIGlmIChsYXN0UmVjb3JkKSB7XG4gICAgICAgICAgICBpZiAobGFzdFJlY29yZC5odG1sID09PSBodG1sXG4gICAgICAgICAgICAgICAgJiYgbGFzdFJlY29yZC5wb3Muc3RhcnQgPT09IHBvcy5zdGFydFxuICAgICAgICAgICAgICAgICYmIGxhc3RSZWNvcmQucG9zLmVuZCA9PT0gcG9zLmVuZClcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgYXQrKztcbiAgICAgICAgaGlzdG9yeVthdF0gPSB7IGh0bWwsIHBvcyB9O1xuICAgICAgICBoaXN0b3J5LnNwbGljZShhdCArIDEpO1xuICAgICAgICBjb25zdCBtYXhIaXN0b3J5ID0gMzAwO1xuICAgICAgICBpZiAoYXQgPiBtYXhIaXN0b3J5KSB7XG4gICAgICAgICAgICBhdCA9IG1heEhpc3Rvcnk7XG4gICAgICAgICAgICBoaXN0b3J5LnNwbGljZSgwLCAxKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBoYW5kbGVQYXN0ZShldmVudCkge1xuICAgICAgICBwcmV2ZW50RGVmYXVsdChldmVudCk7XG4gICAgICAgIGNvbnN0IHRleHQgPSAoZXZlbnQub3JpZ2luYWxFdmVudCB8fCBldmVudClcbiAgICAgICAgICAgIC5jbGlwYm9hcmREYXRhXG4gICAgICAgICAgICAuZ2V0RGF0YSgndGV4dC9wbGFpbicpXG4gICAgICAgICAgICAucmVwbGFjZSgvXFxyL2csICcnKTtcbiAgICAgICAgY29uc3QgcG9zID0gc2F2ZSgpO1xuICAgICAgICBpbnNlcnQodGV4dCk7XG4gICAgICAgIGhpZ2hsaWdodChlZGl0b3IpO1xuICAgICAgICByZXN0b3JlKHtcbiAgICAgICAgICAgIHN0YXJ0OiBNYXRoLm1pbihwb3Muc3RhcnQsIHBvcy5lbmQpICsgdGV4dC5sZW5ndGgsXG4gICAgICAgICAgICBlbmQ6IE1hdGgubWluKHBvcy5zdGFydCwgcG9zLmVuZCkgKyB0ZXh0Lmxlbmd0aCxcbiAgICAgICAgICAgIGRpcjogJzwtJyxcbiAgICAgICAgfSk7XG4gICAgfVxuICAgIGZ1bmN0aW9uIHZpc2l0KGVkaXRvciwgdmlzaXRvcikge1xuICAgICAgICBjb25zdCBxdWV1ZSA9IFtdO1xuICAgICAgICBpZiAoZWRpdG9yLmZpcnN0Q2hpbGQpXG4gICAgICAgICAgICBxdWV1ZS5wdXNoKGVkaXRvci5maXJzdENoaWxkKTtcbiAgICAgICAgbGV0IGVsID0gcXVldWUucG9wKCk7XG4gICAgICAgIHdoaWxlIChlbCkge1xuICAgICAgICAgICAgaWYgKHZpc2l0b3IoZWwpID09PSAnc3RvcCcpXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBpZiAoZWwubmV4dFNpYmxpbmcpXG4gICAgICAgICAgICAgICAgcXVldWUucHVzaChlbC5uZXh0U2libGluZyk7XG4gICAgICAgICAgICBpZiAoZWwuZmlyc3RDaGlsZClcbiAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKGVsLmZpcnN0Q2hpbGQpO1xuICAgICAgICAgICAgZWwgPSBxdWV1ZS5wb3AoKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiBpc0N0cmwoZXZlbnQpIHtcbiAgICAgICAgcmV0dXJuIGV2ZW50Lm1ldGFLZXkgfHwgZXZlbnQuY3RybEtleTtcbiAgICB9XG4gICAgZnVuY3Rpb24gaXNVbmRvKGV2ZW50KSB7XG4gICAgICAgIHJldHVybiBpc0N0cmwoZXZlbnQpICYmICFldmVudC5zaGlmdEtleSAmJiBldmVudC5jb2RlID09PSAnS2V5Wic7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGlzUmVkbyhldmVudCkge1xuICAgICAgICByZXR1cm4gaXNDdHJsKGV2ZW50KSAmJiBldmVudC5zaGlmdEtleSAmJiBldmVudC5jb2RlID09PSAnS2V5Wic7XG4gICAgfVxuICAgIGZ1bmN0aW9uIGluc2VydCh0ZXh0KSB7XG4gICAgICAgIHRleHQgPSB0ZXh0XG4gICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMDM5OycpO1xuICAgICAgICBkb2N1bWVudC5leGVjQ29tbWFuZCgnaW5zZXJ0SFRNTCcsIGZhbHNlLCB0ZXh0KTtcbiAgICB9XG4gICAgZnVuY3Rpb24gZGVib3VuY2UoY2IsIHdhaXQpIHtcbiAgICAgICAgbGV0IHRpbWVvdXQgPSAwO1xuICAgICAgICByZXR1cm4gKC4uLmFyZ3MpID0+IHtcbiAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0KTtcbiAgICAgICAgICAgIHRpbWVvdXQgPSB3aW5kb3cuc2V0VGltZW91dCgoKSA9PiBjYiguLi5hcmdzKSwgd2FpdCk7XG4gICAgICAgIH07XG4gICAgfVxuICAgIGZ1bmN0aW9uIGZpbmRQYWRkaW5nKHRleHQpIHtcbiAgICAgICAgLy8gRmluZCBiZWdpbm5pbmcgb2YgcHJldmlvdXMgbGluZS5cbiAgICAgICAgbGV0IGkgPSB0ZXh0Lmxlbmd0aCAtIDE7XG4gICAgICAgIHdoaWxlIChpID49IDAgJiYgdGV4dFtpXSAhPT0gJ1xcbicpXG4gICAgICAgICAgICBpLS07XG4gICAgICAgIGkrKztcbiAgICAgICAgLy8gRmluZCBwYWRkaW5nIG9mIHRoZSBsaW5lLlxuICAgICAgICBsZXQgaiA9IGk7XG4gICAgICAgIHdoaWxlIChqIDwgdGV4dC5sZW5ndGggJiYgL1sgXFx0XS8udGVzdCh0ZXh0W2pdKSlcbiAgICAgICAgICAgIGorKztcbiAgICAgICAgcmV0dXJuIFt0ZXh0LnN1YnN0cmluZyhpLCBqKSB8fCAnJywgaSwgal07XG4gICAgfVxuICAgIGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgICAgICByZXR1cm4gZWRpdG9yLnRleHRDb250ZW50IHx8ICcnO1xuICAgIH1cbiAgICBmdW5jdGlvbiBwcmV2ZW50RGVmYXVsdChldmVudCkge1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiBnZXRTZWxlY3Rpb24oKSB7XG4gICAgICAgIHZhciBfYTtcbiAgICAgICAgaWYgKCgoX2EgPSBlZGl0b3IucGFyZW50Tm9kZSkgPT09IG51bGwgfHwgX2EgPT09IHZvaWQgMCA/IHZvaWQgMCA6IF9hLm5vZGVUeXBlKSA9PSBOb2RlLkRPQ1VNRU5UX0ZSQUdNRU5UX05PREUpIHtcbiAgICAgICAgICAgIHJldHVybiBlZGl0b3IucGFyZW50Tm9kZS5nZXRTZWxlY3Rpb24oKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gd2luZG93LmdldFNlbGVjdGlvbigpO1xuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICB1cGRhdGVPcHRpb25zKG5ld09wdGlvbnMpIHtcbiAgICAgICAgICAgIE9iamVjdC5hc3NpZ24ob3B0aW9ucywgbmV3T3B0aW9ucyk7XG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZUNvZGUoY29kZSkge1xuICAgICAgICAgICAgZWRpdG9yLnRleHRDb250ZW50ID0gY29kZTtcbiAgICAgICAgICAgIGhpZ2hsaWdodChlZGl0b3IpO1xuICAgICAgICB9LFxuICAgICAgICBvblVwZGF0ZShjYikge1xuICAgICAgICAgICAgY2FsbGJhY2sgPSBjYjtcbiAgICAgICAgfSxcbiAgICAgICAgdG9TdHJpbmcsXG4gICAgICAgIHNhdmUsXG4gICAgICAgIHJlc3RvcmUsXG4gICAgICAgIHJlY29yZEhpc3RvcnksXG4gICAgICAgIGRlc3Ryb3koKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBbdHlwZSwgZm5dIG9mIGxpc3RlbmVycykge1xuICAgICAgICAgICAgICAgIGVkaXRvci5yZW1vdmVFdmVudExpc3RlbmVyKHR5cGUsIGZuKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICB9O1xufVxuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL3NvdXJjZU1hcHMuanNcIjtcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18gZnJvbSBcIi4uLy4uL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiQGNoYXJzZXQgXFxcIlVURi04XFxcIjtcXG4vKipcXG4gKiBwcmlzbS5qcyBEYXJrIHRoZW1lIGZvciBKYXZhU2NyaXB0LCBDU1MgYW5kIEhUTUxcXG4gKiBCYXNlZCBvbiB0aGUgc2xpZGVzIG9mIHRoZSB0YWxrIOKAnC9SZWcoZXhwKXsyfWxhaW5lZC/igJ1cXG4gKiBAYXV0aG9yIExlYSBWZXJvdVxcbiAqL1xcbmNvZGVbY2xhc3MqPWxhbmd1YWdlLV0sXFxucHJlW2NsYXNzKj1sYW5ndWFnZS1dIHtcXG4gIGNvbG9yOiB3aGl0ZTtcXG4gIGJhY2tncm91bmQ6IG5vbmU7XFxuICB0ZXh0LXNoYWRvdzogMCAtMC4xZW0gMC4yZW0gYmxhY2s7XFxuICBmb250LWZhbWlseTogQ29uc29sYXMsIE1vbmFjbywgXFxcIkFuZGFsZSBNb25vXFxcIiwgXFxcIlVidW50dSBNb25vXFxcIiwgbW9ub3NwYWNlO1xcbiAgZm9udC1zaXplOiAxZW07XFxuICB0ZXh0LWFsaWduOiBsZWZ0O1xcbiAgd2hpdGUtc3BhY2U6IHByZTtcXG4gIHdvcmQtc3BhY2luZzogbm9ybWFsO1xcbiAgd29yZC1icmVhazogbm9ybWFsO1xcbiAgd29yZC13cmFwOiBub3JtYWw7XFxuICBsaW5lLWhlaWdodDogMS41O1xcbiAgLW1vei10YWItc2l6ZTogNDtcXG4gIC1vLXRhYi1zaXplOiA0O1xcbiAgdGFiLXNpemU6IDQ7XFxuICAtd2Via2l0LWh5cGhlbnM6IG5vbmU7XFxuICAtbW96LWh5cGhlbnM6IG5vbmU7XFxuICAtbXMtaHlwaGVuczogbm9uZTtcXG4gIGh5cGhlbnM6IG5vbmU7XFxufVxcblxcbkBtZWRpYSBwcmludCB7XFxuICBjb2RlW2NsYXNzKj1sYW5ndWFnZS1dLFxcbnByZVtjbGFzcyo9bGFuZ3VhZ2UtXSB7XFxuICAgIHRleHQtc2hhZG93OiBub25lO1xcbiAgfVxcbn1cXG5wcmVbY2xhc3MqPWxhbmd1YWdlLV0sXFxuOm5vdChwcmUpID4gY29kZVtjbGFzcyo9bGFuZ3VhZ2UtXSB7XFxuICBiYWNrZ3JvdW5kOiBoc2woMzBkZWcsIDIwJSwgMjUlKTtcXG59XFxuXFxuLyogQ29kZSBibG9ja3MgKi9cXG5wcmVbY2xhc3MqPWxhbmd1YWdlLV0ge1xcbiAgcGFkZGluZzogMWVtO1xcbiAgbWFyZ2luOiAwLjVlbSAwO1xcbiAgb3ZlcmZsb3c6IGF1dG87XFxuICBib3JkZXI6IDAuM2VtIHNvbGlkIGhzbCgzMGRlZywgMjAlLCA0MCUpO1xcbiAgYm9yZGVyLXJhZGl1czogMC41ZW07XFxuICBib3gtc2hhZG93OiAxcHggMXB4IDAuNWVtIGJsYWNrIGluc2V0O1xcbn1cXG5cXG4vKiBJbmxpbmUgY29kZSAqL1xcbjpub3QocHJlKSA+IGNvZGVbY2xhc3MqPWxhbmd1YWdlLV0ge1xcbiAgcGFkZGluZzogMC4xNWVtIDAuMmVtIDAuMDVlbTtcXG4gIGJvcmRlci1yYWRpdXM6IDAuM2VtO1xcbiAgYm9yZGVyOiAwLjEzZW0gc29saWQgaHNsKDMwZGVnLCAyMCUsIDQwJSk7XFxuICBib3gtc2hhZG93OiAxcHggMXB4IDAuM2VtIC0wLjFlbSBibGFjayBpbnNldDtcXG4gIHdoaXRlLXNwYWNlOiBub3JtYWw7XFxufVxcblxcbi50b2tlbi5jb21tZW50LFxcbi50b2tlbi5wcm9sb2csXFxuLnRva2VuLmRvY3R5cGUsXFxuLnRva2VuLmNkYXRhIHtcXG4gIGNvbG9yOiBoc2woMzBkZWcsIDIwJSwgNTAlKTtcXG59XFxuXFxuLnRva2VuLnB1bmN0dWF0aW9uIHtcXG4gIG9wYWNpdHk6IDAuNztcXG59XFxuXFxuLnRva2VuLm5hbWVzcGFjZSB7XFxuICBvcGFjaXR5OiAwLjc7XFxufVxcblxcbi50b2tlbi5wcm9wZXJ0eSxcXG4udG9rZW4udGFnLFxcbi50b2tlbi5ib29sZWFuLFxcbi50b2tlbi5udW1iZXIsXFxuLnRva2VuLmNvbnN0YW50LFxcbi50b2tlbi5zeW1ib2wge1xcbiAgY29sb3I6IGhzbCgzNTBkZWcsIDQwJSwgNzAlKTtcXG59XFxuXFxuLnRva2VuLnNlbGVjdG9yLFxcbi50b2tlbi5hdHRyLW5hbWUsXFxuLnRva2VuLnN0cmluZyxcXG4udG9rZW4uY2hhcixcXG4udG9rZW4uYnVpbHRpbixcXG4udG9rZW4uaW5zZXJ0ZWQge1xcbiAgY29sb3I6IGhzbCg3NWRlZywgNzAlLCA2MCUpO1xcbn1cXG5cXG4udG9rZW4ub3BlcmF0b3IsXFxuLnRva2VuLmVudGl0eSxcXG4udG9rZW4udXJsLFxcbi5sYW5ndWFnZS1jc3MgLnRva2VuLnN0cmluZyxcXG4uc3R5bGUgLnRva2VuLnN0cmluZyxcXG4udG9rZW4udmFyaWFibGUge1xcbiAgY29sb3I6IGhzbCg0MGRlZywgOTAlLCA2MCUpO1xcbn1cXG5cXG4udG9rZW4uYXRydWxlLFxcbi50b2tlbi5hdHRyLXZhbHVlLFxcbi50b2tlbi5rZXl3b3JkIHtcXG4gIGNvbG9yOiBoc2woMzUwZGVnLCA0MCUsIDcwJSk7XFxufVxcblxcbi50b2tlbi5yZWdleCxcXG4udG9rZW4uaW1wb3J0YW50IHtcXG4gIGNvbG9yOiAjZTkwO1xcbn1cXG5cXG4udG9rZW4uaW1wb3J0YW50LFxcbi50b2tlbi5ib2xkIHtcXG4gIGZvbnQtd2VpZ2h0OiBib2xkO1xcbn1cXG5cXG4udG9rZW4uaXRhbGljIHtcXG4gIGZvbnQtc3R5bGU6IGl0YWxpYztcXG59XFxuXFxuLnRva2VuLmVudGl0eSB7XFxuICBjdXJzb3I6IGhlbHA7XFxufVxcblxcbi50b2tlbi5kZWxldGVkIHtcXG4gIGNvbG9yOiByZWQ7XFxufVwiLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL25vZGVfbW9kdWxlcy9wcmlzbWpzL3RoZW1lcy9wcmlzbS1kYXJrLmNzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQSxnQkFBZ0I7QUFBaEI7Ozs7RUFBQTtBQU1BOztFQUVDLFlBQUE7RUFDQSxnQkFBQTtFQUNBLGlDQUFBO0VBQ0Esc0VBQUE7RUFDQSxjQUFBO0VBQ0EsZ0JBQUE7RUFDQSxnQkFBQTtFQUNBLG9CQUFBO0VBQ0Esa0JBQUE7RUFDQSxpQkFBQTtFQUNBLGdCQUFBO0VBRUEsZ0JBQUE7RUFDQSxjQUFBO0VBQ0EsV0FBQTtFQUVBLHFCQUFBO0VBQ0Esa0JBQUE7RUFDQSxpQkFBQTtFQUNBLGFBQUE7QUFERDs7QUFJQTtFQUNDOztJQUVDLGlCQUFBO0VBREE7QUFDRjtBQUlBOztFQUVDLGdDQUFBO0FBRkQ7O0FBS0EsZ0JBQUE7QUFDQTtFQUNDLFlBQUE7RUFDQSxlQUFBO0VBQ0EsY0FBQTtFQUNBLHdDQUFBO0VBQ0Esb0JBQUE7RUFDQSxxQ0FBQTtBQUZEOztBQUtBLGdCQUFBO0FBQ0E7RUFDQyw0QkFBQTtFQUNBLG9CQUFBO0VBQ0EseUNBQUE7RUFDQSw0Q0FBQTtFQUNBLG1CQUFBO0FBRkQ7O0FBS0E7Ozs7RUFJQywyQkFBQTtBQUZEOztBQUtBO0VBQ0MsWUFBQTtBQUZEOztBQUtBO0VBQ0MsWUFBQTtBQUZEOztBQUtBOzs7Ozs7RUFNQyw0QkFBQTtBQUZEOztBQUtBOzs7Ozs7RUFNQywyQkFBQTtBQUZEOztBQUtBOzs7Ozs7RUFNQywyQkFBQTtBQUZEOztBQUtBOzs7RUFHQyw0QkFBQTtBQUZEOztBQUtBOztFQUVDLFdBQUE7QUFGRDs7QUFLQTs7RUFFQyxpQkFBQTtBQUZEOztBQUlBO0VBQ0Msa0JBQUE7QUFERDs7QUFJQTtFQUNDLFlBQUE7QUFERDs7QUFJQTtFQUNDLFVBQUE7QUFERFwiLFwic291cmNlc0NvbnRlbnRcIjpbXCIvKipcXG4gKiBwcmlzbS5qcyBEYXJrIHRoZW1lIGZvciBKYXZhU2NyaXB0LCBDU1MgYW5kIEhUTUxcXG4gKiBCYXNlZCBvbiB0aGUgc2xpZGVzIG9mIHRoZSB0YWxrIOKAnC9SZWcoZXhwKXsyfWxhaW5lZC/igJ1cXG4gKiBAYXV0aG9yIExlYSBWZXJvdVxcbiAqL1xcblxcbmNvZGVbY2xhc3MqPVxcXCJsYW5ndWFnZS1cXFwiXSxcXG5wcmVbY2xhc3MqPVxcXCJsYW5ndWFnZS1cXFwiXSB7XFxuXFx0Y29sb3I6IHdoaXRlO1xcblxcdGJhY2tncm91bmQ6IG5vbmU7XFxuXFx0dGV4dC1zaGFkb3c6IDAgLS4xZW0gLjJlbSBibGFjaztcXG5cXHRmb250LWZhbWlseTogQ29uc29sYXMsIE1vbmFjbywgJ0FuZGFsZSBNb25vJywgJ1VidW50dSBNb25vJywgbW9ub3NwYWNlO1xcblxcdGZvbnQtc2l6ZTogMWVtO1xcblxcdHRleHQtYWxpZ246IGxlZnQ7XFxuXFx0d2hpdGUtc3BhY2U6IHByZTtcXG5cXHR3b3JkLXNwYWNpbmc6IG5vcm1hbDtcXG5cXHR3b3JkLWJyZWFrOiBub3JtYWw7XFxuXFx0d29yZC13cmFwOiBub3JtYWw7XFxuXFx0bGluZS1oZWlnaHQ6IDEuNTtcXG5cXG5cXHQtbW96LXRhYi1zaXplOiA0O1xcblxcdC1vLXRhYi1zaXplOiA0O1xcblxcdHRhYi1zaXplOiA0O1xcblxcblxcdC13ZWJraXQtaHlwaGVuczogbm9uZTtcXG5cXHQtbW96LWh5cGhlbnM6IG5vbmU7XFxuXFx0LW1zLWh5cGhlbnM6IG5vbmU7XFxuXFx0aHlwaGVuczogbm9uZTtcXG59XFxuXFxuQG1lZGlhIHByaW50IHtcXG5cXHRjb2RlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0sXFxuXFx0cHJlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0ge1xcblxcdFxcdHRleHQtc2hhZG93OiBub25lO1xcblxcdH1cXG59XFxuXFxucHJlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0sXFxuOm5vdChwcmUpID4gY29kZVtjbGFzcyo9XFxcImxhbmd1YWdlLVxcXCJdIHtcXG5cXHRiYWNrZ3JvdW5kOiBoc2woMzAsIDIwJSwgMjUlKTtcXG59XFxuXFxuLyogQ29kZSBibG9ja3MgKi9cXG5wcmVbY2xhc3MqPVxcXCJsYW5ndWFnZS1cXFwiXSB7XFxuXFx0cGFkZGluZzogMWVtO1xcblxcdG1hcmdpbjogLjVlbSAwO1xcblxcdG92ZXJmbG93OiBhdXRvO1xcblxcdGJvcmRlcjogLjNlbSBzb2xpZCBoc2woMzAsIDIwJSwgNDAlKTtcXG5cXHRib3JkZXItcmFkaXVzOiAuNWVtO1xcblxcdGJveC1zaGFkb3c6IDFweCAxcHggLjVlbSBibGFjayBpbnNldDtcXG59XFxuXFxuLyogSW5saW5lIGNvZGUgKi9cXG46bm90KHByZSkgPiBjb2RlW2NsYXNzKj1cXFwibGFuZ3VhZ2UtXFxcIl0ge1xcblxcdHBhZGRpbmc6IC4xNWVtIC4yZW0gLjA1ZW07XFxuXFx0Ym9yZGVyLXJhZGl1czogLjNlbTtcXG5cXHRib3JkZXI6IC4xM2VtIHNvbGlkIGhzbCgzMCwgMjAlLCA0MCUpO1xcblxcdGJveC1zaGFkb3c6IDFweCAxcHggLjNlbSAtLjFlbSBibGFjayBpbnNldDtcXG5cXHR3aGl0ZS1zcGFjZTogbm9ybWFsO1xcbn1cXG5cXG4udG9rZW4uY29tbWVudCxcXG4udG9rZW4ucHJvbG9nLFxcbi50b2tlbi5kb2N0eXBlLFxcbi50b2tlbi5jZGF0YSB7XFxuXFx0Y29sb3I6IGhzbCgzMCwgMjAlLCA1MCUpO1xcbn1cXG5cXG4udG9rZW4ucHVuY3R1YXRpb24ge1xcblxcdG9wYWNpdHk6IC43O1xcbn1cXG5cXG4udG9rZW4ubmFtZXNwYWNlIHtcXG5cXHRvcGFjaXR5OiAuNztcXG59XFxuXFxuLnRva2VuLnByb3BlcnR5LFxcbi50b2tlbi50YWcsXFxuLnRva2VuLmJvb2xlYW4sXFxuLnRva2VuLm51bWJlcixcXG4udG9rZW4uY29uc3RhbnQsXFxuLnRva2VuLnN5bWJvbCB7XFxuXFx0Y29sb3I6IGhzbCgzNTAsIDQwJSwgNzAlKTtcXG59XFxuXFxuLnRva2VuLnNlbGVjdG9yLFxcbi50b2tlbi5hdHRyLW5hbWUsXFxuLnRva2VuLnN0cmluZyxcXG4udG9rZW4uY2hhcixcXG4udG9rZW4uYnVpbHRpbixcXG4udG9rZW4uaW5zZXJ0ZWQge1xcblxcdGNvbG9yOiBoc2woNzUsIDcwJSwgNjAlKTtcXG59XFxuXFxuLnRva2VuLm9wZXJhdG9yLFxcbi50b2tlbi5lbnRpdHksXFxuLnRva2VuLnVybCxcXG4ubGFuZ3VhZ2UtY3NzIC50b2tlbi5zdHJpbmcsXFxuLnN0eWxlIC50b2tlbi5zdHJpbmcsXFxuLnRva2VuLnZhcmlhYmxlIHtcXG5cXHRjb2xvcjogaHNsKDQwLCA5MCUsIDYwJSk7XFxufVxcblxcbi50b2tlbi5hdHJ1bGUsXFxuLnRva2VuLmF0dHItdmFsdWUsXFxuLnRva2VuLmtleXdvcmQge1xcblxcdGNvbG9yOiBoc2woMzUwLCA0MCUsIDcwJSk7XFxufVxcblxcbi50b2tlbi5yZWdleCxcXG4udG9rZW4uaW1wb3J0YW50IHtcXG5cXHRjb2xvcjogI2U5MDtcXG59XFxuXFxuLnRva2VuLmltcG9ydGFudCxcXG4udG9rZW4uYm9sZCB7XFxuXFx0Zm9udC13ZWlnaHQ6IGJvbGQ7XFxufVxcbi50b2tlbi5pdGFsaWMge1xcblxcdGZvbnQtc3R5bGU6IGl0YWxpYztcXG59XFxuXFxuLnRva2VuLmVudGl0eSB7XFxuXFx0Y3Vyc29yOiBoZWxwO1xcbn1cXG5cXG4udG9rZW4uZGVsZXRlZCB7XFxuXFx0Y29sb3I6IHJlZDtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIi8vIEltcG9ydHNcbmltcG9ydCBfX19DU1NfTE9BREVSX0FQSV9TT1VSQ0VNQVBfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvc291cmNlTWFwcy5qc1wiO1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2FwaS5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfRVhQT1JUX19fID0gX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18pO1xuLy8gTW9kdWxlXG5fX19DU1NfTE9BREVSX0VYUE9SVF9fXy5wdXNoKFttb2R1bGUuaWQsIFwiLkNvZGVFZGl0b3Ige1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgdG9wOiAwcHg7XFxuICB3aWR0aDogMTAwJTtcXG4gIGJvdHRvbTogMDtcXG4gIGJhY2tncm91bmQtY29sb3I6ICMxZjFmMWM7XFxuICBjb2xvcjogc2lsdmVyO1xcbiAgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTtcXG4gIHBhZGRpbmc6IDI0cHg7XFxuICBmb250LXNpemU6IDE2cHg7XFxuICBsaW5lLWhlaWdodDogMTIwJTtcXG59XCIsIFwiXCIse1widmVyc2lvblwiOjMsXCJzb3VyY2VzXCI6W1wid2VicGFjazovLy4vc3JjL2NvZGVlZGl0b3Iuc2Nzc1wiXSxcIm5hbWVzXCI6W10sXCJtYXBwaW5nc1wiOlwiQUFBQTtFQUNFLGtCQUFBO0VBQ0EsUUFBQTtFQUNBLFdBQUE7RUFDQSxTQUFBO0VBQ0EseUJBQUE7RUFDQSxhQUFBO0VBQ0Esc0JBQUE7RUFDQSxhQUFBO0VBQ0EsZUFBQTtFQUNBLGlCQUFBO0FBQ0ZcIixcInNvdXJjZXNDb250ZW50XCI6W1wiLkNvZGVFZGl0b3J7XFxuICBwb3NpdGlvbjogYWJzb2x1dGU7XFxuICB0b3A6IDBweDtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgYm90dG9tOiAwO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzFmMWYxYztcXG4gIGNvbG9yOiBzaWx2ZXI7XFxuICBmb250LWZhbWlseTogbW9ub3NwYWNlO1xcbiAgcGFkZGluZzogMjRweDtcXG4gIGZvbnQtc2l6ZTogMTZweDtcXG4gIGxpbmUtaGVpZ2h0OiAxMjAlO1xcbn1cXG5cIl0sXCJzb3VyY2VSb290XCI6XCJcIn1dKTtcbi8vIEV4cG9ydHNcbmV4cG9ydCBkZWZhdWx0IF9fX0NTU19MT0FERVJfRVhQT1JUX19fO1xuIiwiLy8gSW1wb3J0c1xuaW1wb3J0IF9fX0NTU19MT0FERVJfQVBJX1NPVVJDRU1BUF9JTVBPUlRfX18gZnJvbSBcIi4uL25vZGVfbW9kdWxlcy9jc3MtbG9hZGVyL2Rpc3QvcnVudGltZS9zb3VyY2VNYXBzLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9BUElfSU1QT1JUX19fIGZyb20gXCIuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L3J1bnRpbWUvYXBpLmpzXCI7XG5pbXBvcnQgX19fQ1NTX0xPQURFUl9HRVRfVVJMX0lNUE9SVF9fXyBmcm9tIFwiLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9ydW50aW1lL2dldFVybC5qc1wiO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8wX19fID0gbmV3IFVSTChcImRhdGE6aW1hZ2UvcG5nO2Jhc2U2NCxpVkJPUncwS0dnb0FBQUFOU1VoRVVnQUFBQVVBQUFBZUNBWUFBQURrZnRTOUFBQUFJa2xFUVZRb1UyTTRjK2JNZnhBR0FnWVltd0dySUlpRGpyRUxqcG81YWlaZU13Rit5Tm5PczVLU3ZnQUFBQUJKUlU1RXJrSmdnZz09XCIsIGltcG9ydC5tZXRhLnVybCk7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzFfX18gPSBuZXcgVVJMKFwiZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCNEFBQUFGQVFNQUFBQm83ODY1QUFBQUJsQk1WRVZIY0V6TXpNenlBdjJzQUFBQUFYUlNUbE1BUU9iWVpnQUFBQkJKUkVGVWVGNWpPQU1FRUFJRUVGd0FuM2tNd2NCNkkyQUFBQUFBU1VWT1JLNUNZSUk9XCIsIGltcG9ydC5tZXRhLnVybCk7XG52YXIgX19fQ1NTX0xPQURFUl9FWFBPUlRfX18gPSBfX19DU1NfTE9BREVSX0FQSV9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9BUElfU09VUkNFTUFQX0lNUE9SVF9fXyk7XG52YXIgX19fQ1NTX0xPQURFUl9VUkxfUkVQTEFDRU1FTlRfMF9fXyA9IF9fX0NTU19MT0FERVJfR0VUX1VSTF9JTVBPUlRfX18oX19fQ1NTX0xPQURFUl9VUkxfSU1QT1JUXzBfX18pO1xudmFyIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzFfX18gPSBfX19DU1NfTE9BREVSX0dFVF9VUkxfSU1QT1JUX19fKF9fX0NTU19MT0FERVJfVVJMX0lNUE9SVF8xX19fKTtcbi8vIE1vZHVsZVxuX19fQ1NTX0xPQURFUl9FWFBPUlRfX18ucHVzaChbbW9kdWxlLmlkLCBcImJvZHksIGh0bWwge1xcbiAgcGFkZGluZzogMDtcXG4gIG1hcmdpbjogMDtcXG4gIG1pbi13aWR0aDogMTAwJTtcXG4gIGZvbnQtZmFtaWx5OiBBcmlhbCwgSGVsdmV0aWNhLCBzYW5zLXNlcmlmO1xcbiAgZm9udC1zaXplOiAxNnB4O1xcbn1cXG5ib2R5ICosIGh0bWwgKiB7XFxuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xcbn1cXG5cXG4uRmlkZGxlciB7XFxuICB3aWR0aDogMTAwJTtcXG4gIGhlaWdodDogMTAwdmg7XFxuICBiYWNrZ3JvdW5kLWNvbG9yOiBzaWx2ZXI7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG59XFxuLkZpZGRsZXIuc2V0dGluZ3MgI21haW5Db250YWluZXIge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuLkZpZGRsZXIubWFpbiAjc2V0dGluZ3NDb250YWluZXIge1xcbiAgZGlzcGxheTogbm9uZTtcXG59XFxuLkZpZGRsZXIgI21haW5Db250YWluZXIsIC5GaWRkbGVyICNlZGl0b3JzIHtcXG4gIGZsZXgtZ3JvdzogMTtcXG59XFxuLkZpZGRsZXIgI21haW5Db250YWluZXIge1xcbiAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG59XFxuLkZpZGRsZXIgI21haW5Db250YWluZXIgaWZyYW1lIHtcXG4gIGZsZXgtZ3JvdzogMTtcXG4gIGJvcmRlcjogbm9uZTtcXG4gIGhlaWdodDogNjAlO1xcbn1cXG4uRmlkZGxlciAjc2V0dGluZ3NDb250YWluZXIge1xcbiAgcGFkZGluZzogMTZweDtcXG59XFxuXFxuI2VkaXRvcnMgLmVkaXRvckNvbnRhaW5lciB7XFxuICBmbGV4LWdyb3c6IDE7XFxuICBwb3NpdGlvbjogcmVsYXRpdmU7XFxufVxcbiNlZGl0b3JzIC5lZGl0b3JDb250YWluZXIgaDMge1xcbiAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgY29sb3I6IHdoaXRlO1xcbiAgb3BhY2l0eTogMC4zO1xcbiAgei1pbmRleDogMTA7XFxuICBmb250LXNpemU6IDEzcHg7XFxuICBmb250LXdlaWdodDogbm9ybWFsO1xcbiAgaGVpZ2h0OiAyNHB4O1xcbiAgbWFyZ2luOiAwO1xcbiAgcGFkZGluZzogNHB4O1xcbiAgcGFkZGluZy1sZWZ0OiAxMnB4O1xcbiAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuICB1c2VyLXNlbGVjdDogbm9uZTtcXG4gIGxldHRlci1zcGFjaW5nOiAwLjA1ZW07XFxufVxcblxcbiN0b29sYmFyIHtcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiA2NHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzY2NjtcXG4gIGNvbG9yOiB3aGl0ZTtcXG4gIHBhZGRpbmc6IDE2cHg7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcXG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG59XFxuI3Rvb2xiYXIgaW5wdXRbdHlwZT1idXR0b25dIHtcXG4gIGhlaWdodDogMzJweDtcXG4gIHBhZGRpbmctbGVmdDogMTZweDtcXG4gIHBhZGRpbmctcmlnaHQ6IDE2cHg7XFxuICBib3JkZXI6IG5vbmU7XFxuICBvdXRsaW5lOiBub25lO1xcbiAgYm9yZGVyLXJhZGl1czogNHB4O1xcbn1cXG4jdG9vbGJhciBpbnB1dFt0eXBlPWJ1dHRvbl0ubW9kaWZpZWQge1xcbiAgYmFja2dyb3VuZC1jb2xvcjogb3JhbmdlcmVkO1xcbn1cXG5cXG4uc2V0dGluZ3NQYW5lbCB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcXG4gIGp1c3RpZnktY29udGVudDogc3RyZXRjaDtcXG59XFxuLnNldHRpbmdzUGFuZWwgKiB7XFxuICBmbGV4LWdyb3c6IDAuNzU7XFxufVxcbi5zZXR0aW5nc1BhbmVsIC5sZWZ0IHtcXG4gIHBhZGRpbmctcmlnaHQ6IDE2cHg7XFxufVxcbi5zZXR0aW5nc1BhbmVsIC5yaWdodCB7XFxuICBmbGV4LWdyb3c6IDEuNTtcXG4gIGRpc3BsYXk6IGZsZXg7XFxuICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xcbiAganVzdGlmeS1jb250ZW50OiBzdHJldGNoO1xcbn1cXG4uc2V0dGluZ3NQYW5lbCBsYWJlbCB7XFxuICBkaXNwbGF5OiBibG9jaztcXG4gIGZvbnQtc2l6ZTogMTNweDtcXG4gIHBhZGRpbmc6IDZweCA0cHg7XFxuICBmbGV4LWdyb3c6IDA7XFxufVxcbi5zZXR0aW5nc1BhbmVsIGlucHV0LCAuc2V0dGluZ3NQYW5lbCB0ZXh0YXJlYSB7XFxuICB3aWR0aDogMTAwJTtcXG4gIG1hcmdpbi1ib3R0b206IDFyZW07XFxuICBmb250LXNpemU6IGluaGVyaXQ7XFxuICBib3JkZXI6IG5vbmU7XFxuICBwYWRkaW5nOiA4cHg7XFxuICByZXNpemU6IG5vbmU7XFxufVxcbi5zZXR0aW5nc1BhbmVsIGlucHV0Omxhc3QtY2hpbGQsIC5zZXR0aW5nc1BhbmVsIHRleHRhcmVhOmxhc3QtY2hpbGQge1xcbiAgbWFyZ2luLWJvdHRvbTogMDtcXG59XFxuLnNldHRpbmdzUGFuZWwgaW5wdXQsIC5zZXR0aW5nc1BhbmVsIHRleHRhcmVhLCAuc2V0dGluZ3NQYW5lbCAuQ29kZUVkaXRvciB7XFxuICBib3JkZXItcmFkaXVzOiA0cHg7XFxufVxcbi5zZXR0aW5nc1BhbmVsIC5Db2RlRWRpdG9yIHtcXG4gIHBhZGRpbmc6IDhweDtcXG4gIGhlaWdodDogYXV0bztcXG59XFxuQG1lZGlhIChtYXgtd2lkdGg6IDEwMDBweCkge1xcbiAgLnNldHRpbmdzUGFuZWwge1xcbiAgICBmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xcbiAgfVxcbiAgLnNldHRpbmdzUGFuZWwgLmxlZnQge1xcbiAgICBwYWRkaW5nLXJpZ2h0OiAwO1xcbiAgfVxcbiAgLnNldHRpbmdzUGFuZWwgLnJpZ2h0IHtcXG4gICAgbWluLWhlaWdodDogMzAwcHg7XFxuICB9XFxufVxcblxcbi5zcGxpdCB7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1ncm93OiAxO1xcbn1cXG4uc3BsaXQuaG9yaXpvbnRhbCB7XFxuICBmbGV4LWRpcmVjdGlvbjogcm93O1xcbn1cXG5cXG4uZ3V0dGVyIHtcXG4gIGJhY2tncm91bmQtY29sb3I6ICM2NjY7XFxuICBiYWNrZ3JvdW5kLXJlcGVhdDogbm8tcmVwZWF0O1xcbiAgYmFja2dyb3VuZC1wb3NpdGlvbjogNTAlO1xcbn1cXG5cXG4uZ3V0dGVyLmd1dHRlci1ob3Jpem9udGFsIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IHVybChcIiArIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzBfX18gKyBcIik7XFxuICBjdXJzb3I6IGNvbC1yZXNpemU7XFxufVxcblxcbi5ndXR0ZXIuZ3V0dGVyLXZlcnRpY2FsIHtcXG4gIGJhY2tncm91bmQtaW1hZ2U6IHVybChcIiArIF9fX0NTU19MT0FERVJfVVJMX1JFUExBQ0VNRU5UXzFfX18gKyBcIik7XFxuICBjdXJzb3I6IHJvdy1yZXNpemU7XFxufVwiLCBcIlwiLHtcInZlcnNpb25cIjozLFwic291cmNlc1wiOltcIndlYnBhY2s6Ly8uL3NyYy9maWRkbGVyLnNjc3NcIl0sXCJuYW1lc1wiOltdLFwibWFwcGluZ3NcIjpcIkFBQUE7RUFDRSxVQUFBO0VBQ0EsU0FBQTtFQUNBLGVBQUE7RUFDQSx5Q0FBQTtFQUNBLGVBQUE7QUFDRjtBQUFFO0VBQ0Usc0JBQUE7QUFFSjs7QUFFQTtFQUNFLFdBQUE7RUFDQSxhQUFBO0VBQ0Esd0JBQUE7RUFDQSxhQUFBO0VBQ0Esc0JBQUE7QUFDRjtBQUVJO0VBQ0UsYUFBQTtBQUFOO0FBS0k7RUFDRSxhQUFBO0FBSE47QUFPRTtFQUNFLFlBQUE7QUFMSjtBQVFFO0VBQ0Usc0JBQUE7QUFOSjtBQU9JO0VBQ0UsWUFBQTtFQUNBLFlBQUE7RUFDQSxXQUFBO0FBTE47QUFRRTtFQUNFLGFBQUE7QUFOSjs7QUFZRTtFQUNFLFlBQUE7RUFDQSxrQkFBQTtBQVRKO0FBVUk7RUFDRSxrQkFBQTtFQUNBLFlBQUE7RUFDQSxZQUFBO0VBQ0EsV0FBQTtFQUNBLGVBQUE7RUFDQSxtQkFBQTtFQUNBLFlBQUE7RUFDQSxTQUFBO0VBQ0EsWUFBQTtFQUNBLGtCQUFBO0VBQ0Esb0JBQUE7RUFDQSxpQkFBQTtFQUNBLHNCQUFBO0FBUk47O0FBY0E7RUFDRSxXQUFBO0VBQ0EsWUFBQTtFQUNBLHNCQUFBO0VBQ0EsWUFBQTtFQUNBLGFBQUE7RUFDQSxhQUFBO0VBQ0EsbUJBQUE7RUFDQSw4QkFBQTtBQVhGO0FBWUU7RUFDRSxZQUFBO0VBQ0Esa0JBQUE7RUFDQSxtQkFBQTtFQUNBLFlBQUE7RUFDQSxhQUFBO0VBQ0Esa0JBQUE7QUFWSjtBQVdJO0VBQ0UsMkJBQUE7QUFUTjs7QUFjQTtFQUNJLGFBQUE7RUFDQSxtQkFBQTtFQUNBLHdCQUFBO0FBWEo7QUFZSTtFQUNFLGVBQUE7QUFWTjtBQVlJO0VBQ0UsbUJBQUE7QUFWTjtBQVlJO0VBQ0UsY0FBQTtFQUNBLGFBQUE7RUFDQSxzQkFBQTtFQUNBLHdCQUFBO0FBVk47QUFZSTtFQUNFLGNBQUE7RUFDQSxlQUFBO0VBQ0EsZ0JBQUE7RUFDQSxZQUFBO0FBVk47QUFhSTtFQUNFLFdBQUE7RUFDQSxtQkFBQTtFQUNBLGtCQUFBO0VBQ0EsWUFBQTtFQUNBLFlBQUE7RUFDQSxZQUFBO0FBWE47QUFZTTtFQUNFLGdCQUFBO0FBVlI7QUFhSTtFQUNFLGtCQUFBO0FBWE47QUFhSTtFQUNFLFlBQUE7RUFDQSxZQUFBO0FBWE47QUFhSTtFQXpDSjtJQTBDTSxzQkFBQTtFQVZKO0VBV0k7SUFDRSxnQkFBQTtFQVROO0VBV0k7SUFDRSxpQkFBQTtFQVROO0FBQ0Y7O0FBYUE7RUFDSSxhQUFBO0VBQ0EsWUFBQTtBQVZKO0FBV0k7RUFFRSxtQkFBQTtBQVZOOztBQWNBO0VBQ0ksc0JBQUE7RUFDQSw0QkFBQTtFQUNBLHdCQUFBO0FBWEo7O0FBY0E7RUFDSSx5REFBQTtFQUNBLGtCQUFBO0FBWEo7O0FBYUE7RUFDSSx5REFBQTtFQUNBLGtCQUFBO0FBVkpcIixcInNvdXJjZXNDb250ZW50XCI6W1wiYm9keSwgaHRtbHtcXG4gIHBhZGRpbmc6IDA7XFxuICBtYXJnaW46IDA7XFxuICBtaW4td2lkdGg6IDEwMCU7XFxuICBmb250LWZhbWlseTogQXJpYWwsIEhlbHZldGljYSwgc2Fucy1zZXJpZjtcXG4gIGZvbnQtc2l6ZTogMTZweDtcXG4gICp7XFxuICAgIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XFxuICB9XFxufVxcblxcbi5GaWRkbGVye1xcbiAgd2lkdGg6IDEwMCU7XFxuICBoZWlnaHQ6IDEwMHZoO1xcbiAgYmFja2dyb3VuZC1jb2xvcjogc2lsdmVyO1xcbiAgZGlzcGxheTogZmxleDtcXG4gIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuXFxuICAmLnNldHRpbmdze1xcbiAgICAjbWFpbkNvbnRhaW5lcntcXG4gICAgICBkaXNwbGF5OiBub25lO1xcbiAgICB9XFxuICB9XFxuXFxuICAmLm1haW57XFxuICAgICNzZXR0aW5nc0NvbnRhaW5lcntcXG4gICAgICBkaXNwbGF5OiBub25lO1xcbiAgICB9XFxuICB9XFxuXFxuICAjbWFpbkNvbnRhaW5lciAsICNlZGl0b3Jze1xcbiAgICBmbGV4LWdyb3c6IDE7XFxuICB9XFxuXFxuICAjbWFpbkNvbnRhaW5lcntcXG4gICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gICAgaWZyYW1le1xcbiAgICAgIGZsZXgtZ3JvdzogMTtcXG4gICAgICBib3JkZXI6IG5vbmU7XFxuICAgICAgaGVpZ2h0OiA2MCU7XFxuICAgIH1cXG4gIH1cXG4gICNzZXR0aW5nc0NvbnRhaW5lcntcXG4gICAgcGFkZGluZzogMTZweDtcXG4gIH1cXG5cXG59XFxuXFxuI2VkaXRvcnN7XFxuICAuZWRpdG9yQ29udGFpbmVye1xcbiAgICBmbGV4LWdyb3c6IDE7XFxuICAgIHBvc2l0aW9uOiByZWxhdGl2ZTtcXG4gICAgaDN7XFxuICAgICAgcG9zaXRpb246IGFic29sdXRlO1xcbiAgICAgIGNvbG9yOiB3aGl0ZTtcXG4gICAgICBvcGFjaXR5OiAuMztcXG4gICAgICB6LWluZGV4OiAxMDtcXG4gICAgICBmb250LXNpemU6IDEzcHg7XFxuICAgICAgZm9udC13ZWlnaHQ6IG5vcm1hbDtcXG4gICAgICBoZWlnaHQ6IDI0cHg7XFxuICAgICAgbWFyZ2luOiAwO1xcbiAgICAgIHBhZGRpbmc6IDRweDtcXG4gICAgICBwYWRkaW5nLWxlZnQ6IDEycHg7XFxuICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7XFxuICAgICAgdXNlci1zZWxlY3Q6IG5vbmU7XFxuICAgICAgbGV0dGVyLXNwYWNpbmc6IDAuMDVlbTtcXG4gICAgfVxcbiAgfVxcblxcbn1cXG5cXG4jdG9vbGJhcntcXG4gIHdpZHRoOiAxMDAlO1xcbiAgaGVpZ2h0OiA2NHB4O1xcbiAgYmFja2dyb3VuZC1jb2xvcjogIzY2NjtcXG4gIGNvbG9yOiB3aGl0ZTtcXG4gIHBhZGRpbmc6IDE2cHg7XFxuICBkaXNwbGF5OiBmbGV4O1xcbiAgZmxleC1kaXJlY3Rpb246IHJvdztcXG4gIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcXG4gIGlucHV0W3R5cGU9YnV0dG9uXXtcXG4gICAgaGVpZ2h0OiAzMnB4O1xcbiAgICBwYWRkaW5nLWxlZnQ6IDE2cHg7XFxuICAgIHBhZGRpbmctcmlnaHQ6IDE2cHg7XFxuICAgIGJvcmRlcjogbm9uZTtcXG4gICAgb3V0bGluZTogbm9uZTtcXG4gICAgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgICAmLm1vZGlmaWVke1xcbiAgICAgIGJhY2tncm91bmQtY29sb3I6IG9yYW5nZXJlZDtcXG4gICAgfVxcbiAgfVxcbn1cXG5cXG4uc2V0dGluZ3NQYW5lbHtcXG4gICAgZGlzcGxheTogZmxleDtcXG4gICAgZmxleC1kaXJlY3Rpb246IHJvdztcXG4gICAganVzdGlmeS1jb250ZW50OiBzdHJldGNoO1xcbiAgICAqe1xcbiAgICAgIGZsZXgtZ3JvdzogMC43NTtcXG4gICAgfVxcbiAgICAubGVmdHtcXG4gICAgICBwYWRkaW5nLXJpZ2h0OiAxNnB4O1xcbiAgICB9XFxuICAgIC5yaWdodHtcXG4gICAgICBmbGV4LWdyb3c6IDEuNTtcXG4gICAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XFxuICAgICAganVzdGlmeS1jb250ZW50OiBzdHJldGNoO1xcbiAgICB9XFxuICAgIGxhYmVse1xcbiAgICAgIGRpc3BsYXk6IGJsb2NrO1xcbiAgICAgIGZvbnQtc2l6ZTogMTNweDtcXG4gICAgICBwYWRkaW5nOiAgNnB4IDRweDtcXG4gICAgICBmbGV4LWdyb3c6IDA7XFxuXFxuICAgIH1cXG4gICAgaW5wdXQsIHRleHRhcmVhe1xcbiAgICAgIHdpZHRoOiAxMDAlO1xcbiAgICAgIG1hcmdpbi1ib3R0b206IDFyZW07XFxuICAgICAgZm9udC1zaXplOiBpbmhlcml0O1xcbiAgICAgIGJvcmRlcjogbm9uZTtcXG4gICAgICBwYWRkaW5nOiA4cHg7XFxuICAgICAgcmVzaXplOiBub25lO1xcbiAgICAgICY6bGFzdC1jaGlsZHtcXG4gICAgICAgIG1hcmdpbi1ib3R0b206IDA7XFxuICAgICAgfVxcbiAgICB9XFxuICAgIGlucHV0LCB0ZXh0YXJlYSwgLkNvZGVFZGl0b3J7XFxuICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgICB9XFxuICAgIC5Db2RlRWRpdG9ye1xcbiAgICAgIHBhZGRpbmc6IDhweCA7XFxuICAgICAgaGVpZ2h0OiBhdXRvO1xcbiAgICB9XFxuICAgIEBtZWRpYShtYXgtd2lkdGg6IDEwMDBweCl7XFxuICAgICAgZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcXG4gICAgICAubGVmdHtcXG4gICAgICAgIHBhZGRpbmctcmlnaHQ6IDA7XFxuICAgICAgfVxcbiAgICAgIC5yaWdodHtcXG4gICAgICAgIG1pbi1oZWlnaHQ6IDMwMHB4O1xcbiAgICAgIH1cXG4gICAgfVxcbn1cXG5cXG4uc3BsaXQge1xcbiAgICBkaXNwbGF5OiBmbGV4O1xcbiAgICBmbGV4LWdyb3c6IDE7XFxuICAgICYuaG9yaXpvbnRhbC8vZm9yIGhvcml6b250YWwgIHwgfCB8IHxcXG4gICAge1xcbiAgICAgIGZsZXgtZGlyZWN0aW9uOiByb3c7XFxuICAgIH1cXG59XFxuXFxuLmd1dHRlciB7XFxuICAgIGJhY2tncm91bmQtY29sb3I6ICM2NjY7XFxuICAgIGJhY2tncm91bmQtcmVwZWF0OiBuby1yZXBlYXQ7XFxuICAgIGJhY2tncm91bmQtcG9zaXRpb246IDUwJTtcXG59XFxuXFxuLmd1dHRlci5ndXR0ZXItaG9yaXpvbnRhbCB7XFxuICAgIGJhY2tncm91bmQtaW1hZ2U6IHVybCgnZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFBVUFBQUFlQ0FZQUFBRGtmdFM5QUFBQUlrbEVRVlFvVTJNNGMrYk1meEFHQWdZWW13R3JJSWlEanJFTGpwbzVhaVplTXdGK3lObk9zNUtTdmdBQUFBQkpSVTVFcmtKZ2dnPT0nKTtcXG4gICAgY3Vyc29yOiBjb2wtcmVzaXplO1xcbn1cXG4uZ3V0dGVyLmd1dHRlci12ZXJ0aWNhbCB7XFxuICAgIGJhY2tncm91bmQtaW1hZ2U6IHVybCgnZGF0YTppbWFnZS9wbmc7YmFzZTY0LGlWQk9SdzBLR2dvQUFBQU5TVWhFVWdBQUFCNEFBQUFGQVFNQUFBQm83ODY1QUFBQUJsQk1WRVZIY0V6TXpNenlBdjJzQUFBQUFYUlNUbE1BUU9iWVpnQUFBQkJKUkVGVWVGNWpPQU1FRUFJRUVGd0FuM2tNd2NCNkkyQUFBQUFBU1VWT1JLNUNZSUk9Jyk7XFxuICAgIGN1cnNvcjogcm93LXJlc2l6ZTtcXG59XFxuXCJdLFwic291cmNlUm9vdFwiOlwiXCJ9XSk7XG4vLyBFeHBvcnRzXG5leHBvcnQgZGVmYXVsdCBfX19DU1NfTE9BREVSX0VYUE9SVF9fXztcbiIsIlwidXNlIHN0cmljdFwiO1xuXG4vKlxuICBNSVQgTGljZW5zZSBodHRwOi8vd3d3Lm9wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL21pdC1saWNlbnNlLnBocFxuICBBdXRob3IgVG9iaWFzIEtvcHBlcnMgQHNva3JhXG4qL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoY3NzV2l0aE1hcHBpbmdUb1N0cmluZykge1xuICB2YXIgbGlzdCA9IFtdOyAvLyByZXR1cm4gdGhlIGxpc3Qgb2YgbW9kdWxlcyBhcyBjc3Mgc3RyaW5nXG5cbiAgbGlzdC50b1N0cmluZyA9IGZ1bmN0aW9uIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgdmFyIGNvbnRlbnQgPSBcIlwiO1xuICAgICAgdmFyIG5lZWRMYXllciA9IHR5cGVvZiBpdGVtWzVdICE9PSBcInVuZGVmaW5lZFwiO1xuXG4gICAgICBpZiAoaXRlbVs0XSkge1xuICAgICAgICBjb250ZW50ICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQoaXRlbVs0XSwgXCIpIHtcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChpdGVtWzJdKSB7XG4gICAgICAgIGNvbnRlbnQgKz0gXCJAbWVkaWEgXCIuY29uY2F0KGl0ZW1bMl0sIFwiIHtcIik7XG4gICAgICB9XG5cbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIkBsYXllclwiLmNvbmNhdChpdGVtWzVdLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQoaXRlbVs1XSkgOiBcIlwiLCBcIiB7XCIpO1xuICAgICAgfVxuXG4gICAgICBjb250ZW50ICs9IGNzc1dpdGhNYXBwaW5nVG9TdHJpbmcoaXRlbSk7XG5cbiAgICAgIGlmIChuZWVkTGF5ZXIpIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW1bMl0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cblxuICAgICAgaWYgKGl0ZW1bNF0pIHtcbiAgICAgICAgY29udGVudCArPSBcIn1cIjtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNvbnRlbnQ7XG4gICAgfSkuam9pbihcIlwiKTtcbiAgfTsgLy8gaW1wb3J0IGEgbGlzdCBvZiBtb2R1bGVzIGludG8gdGhlIGxpc3RcblxuXG4gIGxpc3QuaSA9IGZ1bmN0aW9uIGkobW9kdWxlcywgbWVkaWEsIGRlZHVwZSwgc3VwcG9ydHMsIGxheWVyKSB7XG4gICAgaWYgKHR5cGVvZiBtb2R1bGVzID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBtb2R1bGVzID0gW1tudWxsLCBtb2R1bGVzLCB1bmRlZmluZWRdXTtcbiAgICB9XG5cbiAgICB2YXIgYWxyZWFkeUltcG9ydGVkTW9kdWxlcyA9IHt9O1xuXG4gICAgaWYgKGRlZHVwZSkge1xuICAgICAgZm9yICh2YXIgayA9IDA7IGsgPCB0aGlzLmxlbmd0aDsgaysrKSB7XG4gICAgICAgIHZhciBpZCA9IHRoaXNba11bMF07XG5cbiAgICAgICAgaWYgKGlkICE9IG51bGwpIHtcbiAgICAgICAgICBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2lkXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBmb3IgKHZhciBfayA9IDA7IF9rIDwgbW9kdWxlcy5sZW5ndGg7IF9rKyspIHtcbiAgICAgIHZhciBpdGVtID0gW10uY29uY2F0KG1vZHVsZXNbX2tdKTtcblxuICAgICAgaWYgKGRlZHVwZSAmJiBhbHJlYWR5SW1wb3J0ZWRNb2R1bGVzW2l0ZW1bMF1dKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAodHlwZW9mIGxheWVyICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaXRlbVs1XSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgICAgICAgIGl0ZW1bNV0gPSBsYXllcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAbGF5ZXJcIi5jb25jYXQoaXRlbVs1XS5sZW5ndGggPiAwID8gXCIgXCIuY29uY2F0KGl0ZW1bNV0pIDogXCJcIiwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNV0gPSBsYXllcjtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAobWVkaWEpIHtcbiAgICAgICAgaWYgKCFpdGVtWzJdKSB7XG4gICAgICAgICAgaXRlbVsyXSA9IG1lZGlhO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGl0ZW1bMV0gPSBcIkBtZWRpYSBcIi5jb25jYXQoaXRlbVsyXSwgXCIge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bMl0gPSBtZWRpYTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoc3VwcG9ydHMpIHtcbiAgICAgICAgaWYgKCFpdGVtWzRdKSB7XG4gICAgICAgICAgaXRlbVs0XSA9IFwiXCIuY29uY2F0KHN1cHBvcnRzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVtWzFdID0gXCJAc3VwcG9ydHMgKFwiLmNvbmNhdChpdGVtWzRdLCBcIikge1wiKS5jb25jYXQoaXRlbVsxXSwgXCJ9XCIpO1xuICAgICAgICAgIGl0ZW1bNF0gPSBzdXBwb3J0cztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBsaXN0LnB1c2goaXRlbSk7XG4gICAgfVxuICB9O1xuXG4gIHJldHVybiBsaXN0O1xufTsiLCJcInVzZSBzdHJpY3RcIjtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAodXJsLCBvcHRpb25zKSB7XG4gIGlmICghb3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSB7fTtcbiAgfVxuXG4gIGlmICghdXJsKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuXG4gIHVybCA9IFN0cmluZyh1cmwuX19lc01vZHVsZSA/IHVybC5kZWZhdWx0IDogdXJsKTsgLy8gSWYgdXJsIGlzIGFscmVhZHkgd3JhcHBlZCBpbiBxdW90ZXMsIHJlbW92ZSB0aGVtXG5cbiAgaWYgKC9eWydcIl0uKlsnXCJdJC8udGVzdCh1cmwpKSB7XG4gICAgdXJsID0gdXJsLnNsaWNlKDEsIC0xKTtcbiAgfVxuXG4gIGlmIChvcHRpb25zLmhhc2gpIHtcbiAgICB1cmwgKz0gb3B0aW9ucy5oYXNoO1xuICB9IC8vIFNob3VsZCB1cmwgYmUgd3JhcHBlZD9cbiAgLy8gU2VlIGh0dHBzOi8vZHJhZnRzLmNzc3dnLm9yZy9jc3MtdmFsdWVzLTMvI3VybHNcblxuXG4gIGlmICgvW1wiJygpIFxcdFxcbl18KCUyMCkvLnRlc3QodXJsKSB8fCBvcHRpb25zLm5lZWRRdW90ZXMpIHtcbiAgICByZXR1cm4gXCJcXFwiXCIuY29uY2F0KHVybC5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykucmVwbGFjZSgvXFxuL2csIFwiXFxcXG5cIiksIFwiXFxcIlwiKTtcbiAgfVxuXG4gIHJldHVybiB1cmw7XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChpdGVtKSB7XG4gIHZhciBjb250ZW50ID0gaXRlbVsxXTtcbiAgdmFyIGNzc01hcHBpbmcgPSBpdGVtWzNdO1xuXG4gIGlmICghY3NzTWFwcGluZykge1xuICAgIHJldHVybiBjb250ZW50O1xuICB9XG5cbiAgaWYgKHR5cGVvZiBidG9hID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB2YXIgYmFzZTY0ID0gYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoY3NzTWFwcGluZykpKSk7XG4gICAgdmFyIGRhdGEgPSBcInNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ9dXRmLTg7YmFzZTY0LFwiLmNvbmNhdChiYXNlNjQpO1xuICAgIHZhciBzb3VyY2VNYXBwaW5nID0gXCIvKiMgXCIuY29uY2F0KGRhdGEsIFwiICovXCIpO1xuICAgIHZhciBzb3VyY2VVUkxzID0gY3NzTWFwcGluZy5zb3VyY2VzLm1hcChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICByZXR1cm4gXCIvKiMgc291cmNlVVJMPVwiLmNvbmNhdChjc3NNYXBwaW5nLnNvdXJjZVJvb3QgfHwgXCJcIikuY29uY2F0KHNvdXJjZSwgXCIgKi9cIik7XG4gICAgfSk7XG4gICAgcmV0dXJuIFtjb250ZW50XS5jb25jYXQoc291cmNlVVJMcykuY29uY2F0KFtzb3VyY2VNYXBwaW5nXSkuam9pbihcIlxcblwiKTtcbiAgfVxuXG4gIHJldHVybiBbY29udGVudF0uam9pbihcIlxcblwiKTtcbn07IiwidmFyIG49ZnVuY3Rpb24odCxzLHIsZSl7dmFyIHU7c1swXT0wO2Zvcih2YXIgaD0xO2g8cy5sZW5ndGg7aCsrKXt2YXIgcD1zW2grK10sYT1zW2hdPyhzWzBdfD1wPzE6MixyW3NbaCsrXV0pOnNbKytoXTszPT09cD9lWzBdPWE6ND09PXA/ZVsxXT1PYmplY3QuYXNzaWduKGVbMV18fHt9LGEpOjU9PT1wPyhlWzFdPWVbMV18fHt9KVtzWysraF1dPWE6Nj09PXA/ZVsxXVtzWysraF1dKz1hK1wiXCI6cD8odT10LmFwcGx5KGEsbih0LGEscixbXCJcIixudWxsXSkpLGUucHVzaCh1KSxhWzBdP3NbMF18PTI6KHNbaC0yXT0wLHNbaF09dSkpOmUucHVzaChhKX1yZXR1cm4gZX0sdD1uZXcgTWFwO2V4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uKHMpe3ZhciByPXQuZ2V0KHRoaXMpO3JldHVybiByfHwocj1uZXcgTWFwLHQuc2V0KHRoaXMscikpLChyPW4odGhpcyxyLmdldChzKXx8KHIuc2V0KHMscj1mdW5jdGlvbihuKXtmb3IodmFyIHQscyxyPTEsZT1cIlwiLHU9XCJcIixoPVswXSxwPWZ1bmN0aW9uKG4pezE9PT1yJiYobnx8KGU9ZS5yZXBsYWNlKC9eXFxzKlxcblxccyp8XFxzKlxcblxccyokL2csXCJcIikpKT9oLnB1c2goMCxuLGUpOjM9PT1yJiYobnx8ZSk/KGgucHVzaCgzLG4sZSkscj0yKToyPT09ciYmXCIuLi5cIj09PWUmJm4/aC5wdXNoKDQsbiwwKToyPT09ciYmZSYmIW4/aC5wdXNoKDUsMCwhMCxlKTpyPj01JiYoKGV8fCFuJiY1PT09cikmJihoLnB1c2gociwwLGUscykscj02KSxuJiYoaC5wdXNoKHIsbiwwLHMpLHI9NikpLGU9XCJcIn0sYT0wO2E8bi5sZW5ndGg7YSsrKXthJiYoMT09PXImJnAoKSxwKGEpKTtmb3IodmFyIGw9MDtsPG5bYV0ubGVuZ3RoO2wrKyl0PW5bYV1bbF0sMT09PXI/XCI8XCI9PT10PyhwKCksaD1baF0scj0zKTplKz10OjQ9PT1yP1wiLS1cIj09PWUmJlwiPlwiPT09dD8ocj0xLGU9XCJcIik6ZT10K2VbMF06dT90PT09dT91PVwiXCI6ZSs9dDonXCInPT09dHx8XCInXCI9PT10P3U9dDpcIj5cIj09PXQ/KHAoKSxyPTEpOnImJihcIj1cIj09PXQ/KHI9NSxzPWUsZT1cIlwiKTpcIi9cIj09PXQmJihyPDV8fFwiPlwiPT09blthXVtsKzFdKT8ocCgpLDM9PT1yJiYoaD1oWzBdKSxyPWgsKGg9aFswXSkucHVzaCgyLDAscikscj0wKTpcIiBcIj09PXR8fFwiXFx0XCI9PT10fHxcIlxcblwiPT09dHx8XCJcXHJcIj09PXQ/KHAoKSxyPTIpOmUrPXQpLDM9PT1yJiZcIiEtLVwiPT09ZSYmKHI9NCxoPWhbMF0pfXJldHVybiBwKCksaH0ocykpLHIpLGFyZ3VtZW50cyxbXSkpLmxlbmd0aD4xP3I6clswXX1cbiIsImltcG9ydHtoIGFzIHIsQ29tcG9uZW50IGFzIG8scmVuZGVyIGFzIHR9ZnJvbVwicHJlYWN0XCI7ZXhwb3J0e2gscmVuZGVyLENvbXBvbmVudH1mcm9tXCJwcmVhY3RcIjtpbXBvcnQgZSBmcm9tXCJodG1cIjt2YXIgbT1lLmJpbmQocik7ZXhwb3J0e20gYXMgaHRtbH07XG4iLCJ2YXIgbixsLHUsaSx0LG8scixmLGU9e30sYz1bXSxzPS9hY2l0fGV4KD86c3xnfG58cHwkKXxycGh8Z3JpZHxvd3N8bW5jfG50d3xpbmVbY2hdfHpvb3xeb3JkfGl0ZXJhL2k7ZnVuY3Rpb24gYShuLGwpe2Zvcih2YXIgdSBpbiBsKW5bdV09bFt1XTtyZXR1cm4gbn1mdW5jdGlvbiBoKG4pe3ZhciBsPW4ucGFyZW50Tm9kZTtsJiZsLnJlbW92ZUNoaWxkKG4pfWZ1bmN0aW9uIHYobCx1LGkpe3ZhciB0LG8scixmPXt9O2ZvcihyIGluIHUpXCJrZXlcIj09cj90PXVbcl06XCJyZWZcIj09cj9vPXVbcl06ZltyXT11W3JdO2lmKGFyZ3VtZW50cy5sZW5ndGg+MiYmKGYuY2hpbGRyZW49YXJndW1lbnRzLmxlbmd0aD4zP24uY2FsbChhcmd1bWVudHMsMik6aSksXCJmdW5jdGlvblwiPT10eXBlb2YgbCYmbnVsbCE9bC5kZWZhdWx0UHJvcHMpZm9yKHIgaW4gbC5kZWZhdWx0UHJvcHMpdm9pZCAwPT09ZltyXSYmKGZbcl09bC5kZWZhdWx0UHJvcHNbcl0pO3JldHVybiB5KGwsZix0LG8sbnVsbCl9ZnVuY3Rpb24geShuLGksdCxvLHIpe3ZhciBmPXt0eXBlOm4scHJvcHM6aSxrZXk6dCxyZWY6byxfX2s6bnVsbCxfXzpudWxsLF9fYjowLF9fZTpudWxsLF9fZDp2b2lkIDAsX19jOm51bGwsX19oOm51bGwsY29uc3RydWN0b3I6dm9pZCAwLF9fdjpudWxsPT1yPysrdTpyfTtyZXR1cm4gbnVsbD09ciYmbnVsbCE9bC52bm9kZSYmbC52bm9kZShmKSxmfWZ1bmN0aW9uIHAoKXtyZXR1cm57Y3VycmVudDpudWxsfX1mdW5jdGlvbiBkKG4pe3JldHVybiBuLmNoaWxkcmVufWZ1bmN0aW9uIF8obixsKXt0aGlzLnByb3BzPW4sdGhpcy5jb250ZXh0PWx9ZnVuY3Rpb24gayhuLGwpe2lmKG51bGw9PWwpcmV0dXJuIG4uX18/ayhuLl9fLG4uX18uX19rLmluZGV4T2YobikrMSk6bnVsbDtmb3IodmFyIHU7bDxuLl9fay5sZW5ndGg7bCsrKWlmKG51bGwhPSh1PW4uX19rW2xdKSYmbnVsbCE9dS5fX2UpcmV0dXJuIHUuX19lO3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIG4udHlwZT9rKG4pOm51bGx9ZnVuY3Rpb24gYihuKXt2YXIgbCx1O2lmKG51bGwhPShuPW4uX18pJiZudWxsIT1uLl9fYyl7Zm9yKG4uX19lPW4uX19jLmJhc2U9bnVsbCxsPTA7bDxuLl9fay5sZW5ndGg7bCsrKWlmKG51bGwhPSh1PW4uX19rW2xdKSYmbnVsbCE9dS5fX2Upe24uX19lPW4uX19jLmJhc2U9dS5fX2U7YnJlYWt9cmV0dXJuIGIobil9fWZ1bmN0aW9uIG0obil7KCFuLl9fZCYmKG4uX19kPSEwKSYmdC5wdXNoKG4pJiYhZy5fX3IrK3x8ciE9PWwuZGVib3VuY2VSZW5kZXJpbmcpJiYoKHI9bC5kZWJvdW5jZVJlbmRlcmluZyl8fG8pKGcpfWZ1bmN0aW9uIGcoKXtmb3IodmFyIG47Zy5fX3I9dC5sZW5ndGg7KW49dC5zb3J0KGZ1bmN0aW9uKG4sbCl7cmV0dXJuIG4uX192Ll9fYi1sLl9fdi5fX2J9KSx0PVtdLG4uc29tZShmdW5jdGlvbihuKXt2YXIgbCx1LGksdCxvLHI7bi5fX2QmJihvPSh0PShsPW4pLl9fdikuX19lLChyPWwuX19QKSYmKHU9W10sKGk9YSh7fSx0KSkuX192PXQuX192KzEsaihyLHQsaSxsLl9fbix2b2lkIDAhPT1yLm93bmVyU1ZHRWxlbWVudCxudWxsIT10Ll9faD9bb106bnVsbCx1LG51bGw9PW8/ayh0KTpvLHQuX19oKSx6KHUsdCksdC5fX2UhPW8mJmIodCkpKX0pfWZ1bmN0aW9uIHcobixsLHUsaSx0LG8scixmLHMsYSl7dmFyIGgsdixwLF8sYixtLGcsdz1pJiZpLl9fa3x8YyxBPXcubGVuZ3RoO2Zvcih1Ll9faz1bXSxoPTA7aDxsLmxlbmd0aDtoKyspaWYobnVsbCE9KF89dS5fX2tbaF09bnVsbD09KF89bFtoXSl8fFwiYm9vbGVhblwiPT10eXBlb2YgXz9udWxsOlwic3RyaW5nXCI9PXR5cGVvZiBffHxcIm51bWJlclwiPT10eXBlb2YgX3x8XCJiaWdpbnRcIj09dHlwZW9mIF8/eShudWxsLF8sbnVsbCxudWxsLF8pOkFycmF5LmlzQXJyYXkoXyk/eShkLHtjaGlsZHJlbjpffSxudWxsLG51bGwsbnVsbCk6Xy5fX2I+MD95KF8udHlwZSxfLnByb3BzLF8ua2V5LG51bGwsXy5fX3YpOl8pKXtpZihfLl9fPXUsXy5fX2I9dS5fX2IrMSxudWxsPT09KHA9d1toXSl8fHAmJl8ua2V5PT1wLmtleSYmXy50eXBlPT09cC50eXBlKXdbaF09dm9pZCAwO2Vsc2UgZm9yKHY9MDt2PEE7disrKXtpZigocD13W3ZdKSYmXy5rZXk9PXAua2V5JiZfLnR5cGU9PT1wLnR5cGUpe3dbdl09dm9pZCAwO2JyZWFrfXA9bnVsbH1qKG4sXyxwPXB8fGUsdCxvLHIsZixzLGEpLGI9Xy5fX2UsKHY9Xy5yZWYpJiZwLnJlZiE9diYmKGd8fChnPVtdKSxwLnJlZiYmZy5wdXNoKHAucmVmLG51bGwsXyksZy5wdXNoKHYsXy5fX2N8fGIsXykpLG51bGwhPWI/KG51bGw9PW0mJihtPWIpLFwiZnVuY3Rpb25cIj09dHlwZW9mIF8udHlwZSYmXy5fX2s9PT1wLl9faz9fLl9fZD1zPXgoXyxzLG4pOnM9UChuLF8scCx3LGIscyksXCJmdW5jdGlvblwiPT10eXBlb2YgdS50eXBlJiYodS5fX2Q9cykpOnMmJnAuX19lPT1zJiZzLnBhcmVudE5vZGUhPW4mJihzPWsocCkpfWZvcih1Ll9fZT1tLGg9QTtoLS07KW51bGwhPXdbaF0mJihcImZ1bmN0aW9uXCI9PXR5cGVvZiB1LnR5cGUmJm51bGwhPXdbaF0uX19lJiZ3W2hdLl9fZT09dS5fX2QmJih1Ll9fZD1rKGksaCsxKSksTih3W2hdLHdbaF0pKTtpZihnKWZvcihoPTA7aDxnLmxlbmd0aDtoKyspTShnW2hdLGdbKytoXSxnWysraF0pfWZ1bmN0aW9uIHgobixsLHUpe2Zvcih2YXIgaSx0PW4uX19rLG89MDt0JiZvPHQubGVuZ3RoO28rKykoaT10W29dKSYmKGkuX189bixsPVwiZnVuY3Rpb25cIj09dHlwZW9mIGkudHlwZT94KGksbCx1KTpQKHUsaSxpLHQsaS5fX2UsbCkpO3JldHVybiBsfWZ1bmN0aW9uIEEobixsKXtyZXR1cm4gbD1sfHxbXSxudWxsPT1ufHxcImJvb2xlYW5cIj09dHlwZW9mIG58fChBcnJheS5pc0FycmF5KG4pP24uc29tZShmdW5jdGlvbihuKXtBKG4sbCl9KTpsLnB1c2gobikpLGx9ZnVuY3Rpb24gUChuLGwsdSxpLHQsbyl7dmFyIHIsZixlO2lmKHZvaWQgMCE9PWwuX19kKXI9bC5fX2QsbC5fX2Q9dm9pZCAwO2Vsc2UgaWYobnVsbD09dXx8dCE9b3x8bnVsbD09dC5wYXJlbnROb2RlKW46aWYobnVsbD09b3x8by5wYXJlbnROb2RlIT09biluLmFwcGVuZENoaWxkKHQpLHI9bnVsbDtlbHNle2ZvcihmPW8sZT0wOyhmPWYubmV4dFNpYmxpbmcpJiZlPGkubGVuZ3RoO2UrPTIpaWYoZj09dClicmVhayBuO24uaW5zZXJ0QmVmb3JlKHQsbykscj1vfXJldHVybiB2b2lkIDAhPT1yP3I6dC5uZXh0U2libGluZ31mdW5jdGlvbiBDKG4sbCx1LGksdCl7dmFyIG87Zm9yKG8gaW4gdSlcImNoaWxkcmVuXCI9PT1vfHxcImtleVwiPT09b3x8byBpbiBsfHxIKG4sbyxudWxsLHVbb10saSk7Zm9yKG8gaW4gbCl0JiZcImZ1bmN0aW9uXCIhPXR5cGVvZiBsW29dfHxcImNoaWxkcmVuXCI9PT1vfHxcImtleVwiPT09b3x8XCJ2YWx1ZVwiPT09b3x8XCJjaGVja2VkXCI9PT1vfHx1W29dPT09bFtvXXx8SChuLG8sbFtvXSx1W29dLGkpfWZ1bmN0aW9uICQobixsLHUpe1wiLVwiPT09bFswXT9uLnNldFByb3BlcnR5KGwsdSk6bltsXT1udWxsPT11P1wiXCI6XCJudW1iZXJcIiE9dHlwZW9mIHV8fHMudGVzdChsKT91OnUrXCJweFwifWZ1bmN0aW9uIEgobixsLHUsaSx0KXt2YXIgbztuOmlmKFwic3R5bGVcIj09PWwpaWYoXCJzdHJpbmdcIj09dHlwZW9mIHUpbi5zdHlsZS5jc3NUZXh0PXU7ZWxzZXtpZihcInN0cmluZ1wiPT10eXBlb2YgaSYmKG4uc3R5bGUuY3NzVGV4dD1pPVwiXCIpLGkpZm9yKGwgaW4gaSl1JiZsIGluIHV8fCQobi5zdHlsZSxsLFwiXCIpO2lmKHUpZm9yKGwgaW4gdSlpJiZ1W2xdPT09aVtsXXx8JChuLnN0eWxlLGwsdVtsXSl9ZWxzZSBpZihcIm9cIj09PWxbMF0mJlwiblwiPT09bFsxXSlvPWwhPT0obD1sLnJlcGxhY2UoL0NhcHR1cmUkLyxcIlwiKSksbD1sLnRvTG93ZXJDYXNlKClpbiBuP2wudG9Mb3dlckNhc2UoKS5zbGljZSgyKTpsLnNsaWNlKDIpLG4ubHx8KG4ubD17fSksbi5sW2wrb109dSx1P2l8fG4uYWRkRXZlbnRMaXN0ZW5lcihsLG8/VDpJLG8pOm4ucmVtb3ZlRXZlbnRMaXN0ZW5lcihsLG8/VDpJLG8pO2Vsc2UgaWYoXCJkYW5nZXJvdXNseVNldElubmVySFRNTFwiIT09bCl7aWYodClsPWwucmVwbGFjZSgveGxpbmsoSHw6aCkvLFwiaFwiKS5yZXBsYWNlKC9zTmFtZSQvLFwic1wiKTtlbHNlIGlmKFwiaHJlZlwiIT09bCYmXCJsaXN0XCIhPT1sJiZcImZvcm1cIiE9PWwmJlwidGFiSW5kZXhcIiE9PWwmJlwiZG93bmxvYWRcIiE9PWwmJmwgaW4gbil0cnl7bltsXT1udWxsPT11P1wiXCI6dTticmVhayBufWNhdGNoKG4pe31cImZ1bmN0aW9uXCI9PXR5cGVvZiB1fHwobnVsbCE9dSYmKCExIT09dXx8XCJhXCI9PT1sWzBdJiZcInJcIj09PWxbMV0pP24uc2V0QXR0cmlidXRlKGwsdSk6bi5yZW1vdmVBdHRyaWJ1dGUobCkpfX1mdW5jdGlvbiBJKG4pe3RoaXMubFtuLnR5cGUrITFdKGwuZXZlbnQ/bC5ldmVudChuKTpuKX1mdW5jdGlvbiBUKG4pe3RoaXMubFtuLnR5cGUrITBdKGwuZXZlbnQ/bC5ldmVudChuKTpuKX1mdW5jdGlvbiBqKG4sdSxpLHQsbyxyLGYsZSxjKXt2YXIgcyxoLHYseSxwLGssYixtLGcseCxBLFAsQywkPXUudHlwZTtpZih2b2lkIDAhPT11LmNvbnN0cnVjdG9yKXJldHVybiBudWxsO251bGwhPWkuX19oJiYoYz1pLl9faCxlPXUuX19lPWkuX19lLHUuX19oPW51bGwscj1bZV0pLChzPWwuX19iKSYmcyh1KTt0cnl7bjppZihcImZ1bmN0aW9uXCI9PXR5cGVvZiAkKXtpZihtPXUucHJvcHMsZz0ocz0kLmNvbnRleHRUeXBlKSYmdFtzLl9fY10seD1zP2c/Zy5wcm9wcy52YWx1ZTpzLl9fOnQsaS5fX2M/Yj0oaD11Ll9fYz1pLl9fYykuX189aC5fX0U6KFwicHJvdG90eXBlXCJpbiAkJiYkLnByb3RvdHlwZS5yZW5kZXI/dS5fX2M9aD1uZXcgJChtLHgpOih1Ll9fYz1oPW5ldyBfKG0seCksaC5jb25zdHJ1Y3Rvcj0kLGgucmVuZGVyPU8pLGcmJmcuc3ViKGgpLGgucHJvcHM9bSxoLnN0YXRlfHwoaC5zdGF0ZT17fSksaC5jb250ZXh0PXgsaC5fX249dCx2PWguX19kPSEwLGguX19oPVtdKSxudWxsPT1oLl9fcyYmKGguX19zPWguc3RhdGUpLG51bGwhPSQuZ2V0RGVyaXZlZFN0YXRlRnJvbVByb3BzJiYoaC5fX3M9PWguc3RhdGUmJihoLl9fcz1hKHt9LGguX19zKSksYShoLl9fcywkLmdldERlcml2ZWRTdGF0ZUZyb21Qcm9wcyhtLGguX19zKSkpLHk9aC5wcm9wcyxwPWguc3RhdGUsdiludWxsPT0kLmdldERlcml2ZWRTdGF0ZUZyb21Qcm9wcyYmbnVsbCE9aC5jb21wb25lbnRXaWxsTW91bnQmJmguY29tcG9uZW50V2lsbE1vdW50KCksbnVsbCE9aC5jb21wb25lbnREaWRNb3VudCYmaC5fX2gucHVzaChoLmNvbXBvbmVudERpZE1vdW50KTtlbHNle2lmKG51bGw9PSQuZ2V0RGVyaXZlZFN0YXRlRnJvbVByb3BzJiZtIT09eSYmbnVsbCE9aC5jb21wb25lbnRXaWxsUmVjZWl2ZVByb3BzJiZoLmNvbXBvbmVudFdpbGxSZWNlaXZlUHJvcHMobSx4KSwhaC5fX2UmJm51bGwhPWguc2hvdWxkQ29tcG9uZW50VXBkYXRlJiYhMT09PWguc2hvdWxkQ29tcG9uZW50VXBkYXRlKG0saC5fX3MseCl8fHUuX192PT09aS5fX3Ype2gucHJvcHM9bSxoLnN0YXRlPWguX19zLHUuX192IT09aS5fX3YmJihoLl9fZD0hMSksaC5fX3Y9dSx1Ll9fZT1pLl9fZSx1Ll9faz1pLl9fayx1Ll9fay5mb3JFYWNoKGZ1bmN0aW9uKG4pe24mJihuLl9fPXUpfSksaC5fX2gubGVuZ3RoJiZmLnB1c2goaCk7YnJlYWsgbn1udWxsIT1oLmNvbXBvbmVudFdpbGxVcGRhdGUmJmguY29tcG9uZW50V2lsbFVwZGF0ZShtLGguX19zLHgpLG51bGwhPWguY29tcG9uZW50RGlkVXBkYXRlJiZoLl9faC5wdXNoKGZ1bmN0aW9uKCl7aC5jb21wb25lbnREaWRVcGRhdGUoeSxwLGspfSl9aWYoaC5jb250ZXh0PXgsaC5wcm9wcz1tLGguX192PXUsaC5fX1A9bixBPWwuX19yLFA9MCxcInByb3RvdHlwZVwiaW4gJCYmJC5wcm90b3R5cGUucmVuZGVyKWguc3RhdGU9aC5fX3MsaC5fX2Q9ITEsQSYmQSh1KSxzPWgucmVuZGVyKGgucHJvcHMsaC5zdGF0ZSxoLmNvbnRleHQpO2Vsc2UgZG97aC5fX2Q9ITEsQSYmQSh1KSxzPWgucmVuZGVyKGgucHJvcHMsaC5zdGF0ZSxoLmNvbnRleHQpLGguc3RhdGU9aC5fX3N9d2hpbGUoaC5fX2QmJisrUDwyNSk7aC5zdGF0ZT1oLl9fcyxudWxsIT1oLmdldENoaWxkQ29udGV4dCYmKHQ9YShhKHt9LHQpLGguZ2V0Q2hpbGRDb250ZXh0KCkpKSx2fHxudWxsPT1oLmdldFNuYXBzaG90QmVmb3JlVXBkYXRlfHwoaz1oLmdldFNuYXBzaG90QmVmb3JlVXBkYXRlKHkscCkpLEM9bnVsbCE9cyYmcy50eXBlPT09ZCYmbnVsbD09cy5rZXk/cy5wcm9wcy5jaGlsZHJlbjpzLHcobixBcnJheS5pc0FycmF5KEMpP0M6W0NdLHUsaSx0LG8scixmLGUsYyksaC5iYXNlPXUuX19lLHUuX19oPW51bGwsaC5fX2gubGVuZ3RoJiZmLnB1c2goaCksYiYmKGguX19FPWguX189bnVsbCksaC5fX2U9ITF9ZWxzZSBudWxsPT1yJiZ1Ll9fdj09PWkuX192Pyh1Ll9faz1pLl9fayx1Ll9fZT1pLl9fZSk6dS5fX2U9TChpLl9fZSx1LGksdCxvLHIsZixjKTsocz1sLmRpZmZlZCkmJnModSl9Y2F0Y2gobil7dS5fX3Y9bnVsbCwoY3x8bnVsbCE9cikmJih1Ll9fZT1lLHUuX19oPSEhYyxyW3IuaW5kZXhPZihlKV09bnVsbCksbC5fX2Uobix1LGkpfX1mdW5jdGlvbiB6KG4sdSl7bC5fX2MmJmwuX19jKHUsbiksbi5zb21lKGZ1bmN0aW9uKHUpe3RyeXtuPXUuX19oLHUuX19oPVtdLG4uc29tZShmdW5jdGlvbihuKXtuLmNhbGwodSl9KX1jYXRjaChuKXtsLl9fZShuLHUuX192KX19KX1mdW5jdGlvbiBMKGwsdSxpLHQsbyxyLGYsYyl7dmFyIHMsYSx2LHk9aS5wcm9wcyxwPXUucHJvcHMsZD11LnR5cGUsXz0wO2lmKFwic3ZnXCI9PT1kJiYobz0hMCksbnVsbCE9cilmb3IoO188ci5sZW5ndGg7XysrKWlmKChzPXJbX10pJiZcInNldEF0dHJpYnV0ZVwiaW4gcz09ISFkJiYoZD9zLmxvY2FsTmFtZT09PWQ6Mz09PXMubm9kZVR5cGUpKXtsPXMscltfXT1udWxsO2JyZWFrfWlmKG51bGw9PWwpe2lmKG51bGw9PT1kKXJldHVybiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShwKTtsPW8/ZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIixkKTpkb2N1bWVudC5jcmVhdGVFbGVtZW50KGQscC5pcyYmcCkscj1udWxsLGM9ITF9aWYobnVsbD09PWQpeT09PXB8fGMmJmwuZGF0YT09PXB8fChsLmRhdGE9cCk7ZWxzZXtpZihyPXImJm4uY2FsbChsLmNoaWxkTm9kZXMpLGE9KHk9aS5wcm9wc3x8ZSkuZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUwsdj1wLmRhbmdlcm91c2x5U2V0SW5uZXJIVE1MLCFjKXtpZihudWxsIT1yKWZvcih5PXt9LF89MDtfPGwuYXR0cmlidXRlcy5sZW5ndGg7XysrKXlbbC5hdHRyaWJ1dGVzW19dLm5hbWVdPWwuYXR0cmlidXRlc1tfXS52YWx1ZTsodnx8YSkmJih2JiYoYSYmdi5fX2h0bWw9PWEuX19odG1sfHx2Ll9faHRtbD09PWwuaW5uZXJIVE1MKXx8KGwuaW5uZXJIVE1MPXYmJnYuX19odG1sfHxcIlwiKSl9aWYoQyhsLHAseSxvLGMpLHYpdS5fX2s9W107ZWxzZSBpZihfPXUucHJvcHMuY2hpbGRyZW4sdyhsLEFycmF5LmlzQXJyYXkoXyk/XzpbX10sdSxpLHQsbyYmXCJmb3JlaWduT2JqZWN0XCIhPT1kLHIsZixyP3JbMF06aS5fX2smJmsoaSwwKSxjKSxudWxsIT1yKWZvcihfPXIubGVuZ3RoO18tLTspbnVsbCE9cltfXSYmaChyW19dKTtjfHwoXCJ2YWx1ZVwiaW4gcCYmdm9pZCAwIT09KF89cC52YWx1ZSkmJihfIT09bC52YWx1ZXx8XCJwcm9ncmVzc1wiPT09ZCYmIV98fFwib3B0aW9uXCI9PT1kJiZfIT09eS52YWx1ZSkmJkgobCxcInZhbHVlXCIsXyx5LnZhbHVlLCExKSxcImNoZWNrZWRcImluIHAmJnZvaWQgMCE9PShfPXAuY2hlY2tlZCkmJl8hPT1sLmNoZWNrZWQmJkgobCxcImNoZWNrZWRcIixfLHkuY2hlY2tlZCwhMSkpfXJldHVybiBsfWZ1bmN0aW9uIE0obix1LGkpe3RyeXtcImZ1bmN0aW9uXCI9PXR5cGVvZiBuP24odSk6bi5jdXJyZW50PXV9Y2F0Y2gobil7bC5fX2UobixpKX19ZnVuY3Rpb24gTihuLHUsaSl7dmFyIHQsbztpZihsLnVubW91bnQmJmwudW5tb3VudChuKSwodD1uLnJlZikmJih0LmN1cnJlbnQmJnQuY3VycmVudCE9PW4uX19lfHxNKHQsbnVsbCx1KSksbnVsbCE9KHQ9bi5fX2MpKXtpZih0LmNvbXBvbmVudFdpbGxVbm1vdW50KXRyeXt0LmNvbXBvbmVudFdpbGxVbm1vdW50KCl9Y2F0Y2gobil7bC5fX2Uobix1KX10LmJhc2U9dC5fX1A9bnVsbH1pZih0PW4uX19rKWZvcihvPTA7bzx0Lmxlbmd0aDtvKyspdFtvXSYmTih0W29dLHUsXCJmdW5jdGlvblwiIT10eXBlb2Ygbi50eXBlKTtpfHxudWxsPT1uLl9fZXx8aChuLl9fZSksbi5fX2U9bi5fX2Q9dm9pZCAwfWZ1bmN0aW9uIE8obixsLHUpe3JldHVybiB0aGlzLmNvbnN0cnVjdG9yKG4sdSl9ZnVuY3Rpb24gUyh1LGksdCl7dmFyIG8scixmO2wuX18mJmwuX18odSxpKSxyPShvPVwiZnVuY3Rpb25cIj09dHlwZW9mIHQpP251bGw6dCYmdC5fX2t8fGkuX19rLGY9W10saihpLHU9KCFvJiZ0fHxpKS5fX2s9dihkLG51bGwsW3VdKSxyfHxlLGUsdm9pZCAwIT09aS5vd25lclNWR0VsZW1lbnQsIW8mJnQ/W3RdOnI/bnVsbDppLmZpcnN0Q2hpbGQ/bi5jYWxsKGkuY2hpbGROb2Rlcyk6bnVsbCxmLCFvJiZ0P3Q6cj9yLl9fZTppLmZpcnN0Q2hpbGQsbykseihmLHUpfWZ1bmN0aW9uIHEobixsKXtTKG4sbCxxKX1mdW5jdGlvbiBCKGwsdSxpKXt2YXIgdCxvLHIsZj1hKHt9LGwucHJvcHMpO2ZvcihyIGluIHUpXCJrZXlcIj09cj90PXVbcl06XCJyZWZcIj09cj9vPXVbcl06ZltyXT11W3JdO3JldHVybiBhcmd1bWVudHMubGVuZ3RoPjImJihmLmNoaWxkcmVuPWFyZ3VtZW50cy5sZW5ndGg+Mz9uLmNhbGwoYXJndW1lbnRzLDIpOmkpLHkobC50eXBlLGYsdHx8bC5rZXksb3x8bC5yZWYsbnVsbCl9ZnVuY3Rpb24gRChuLGwpe3ZhciB1PXtfX2M6bD1cIl9fY0NcIitmKyssX186bixDb25zdW1lcjpmdW5jdGlvbihuLGwpe3JldHVybiBuLmNoaWxkcmVuKGwpfSxQcm92aWRlcjpmdW5jdGlvbihuKXt2YXIgdSxpO3JldHVybiB0aGlzLmdldENoaWxkQ29udGV4dHx8KHU9W10sKGk9e30pW2xdPXRoaXMsdGhpcy5nZXRDaGlsZENvbnRleHQ9ZnVuY3Rpb24oKXtyZXR1cm4gaX0sdGhpcy5zaG91bGRDb21wb25lbnRVcGRhdGU9ZnVuY3Rpb24obil7dGhpcy5wcm9wcy52YWx1ZSE9PW4udmFsdWUmJnUuc29tZShtKX0sdGhpcy5zdWI9ZnVuY3Rpb24obil7dS5wdXNoKG4pO3ZhciBsPW4uY29tcG9uZW50V2lsbFVubW91bnQ7bi5jb21wb25lbnRXaWxsVW5tb3VudD1mdW5jdGlvbigpe3Uuc3BsaWNlKHUuaW5kZXhPZihuKSwxKSxsJiZsLmNhbGwobil9fSksbi5jaGlsZHJlbn19O3JldHVybiB1LlByb3ZpZGVyLl9fPXUuQ29uc3VtZXIuY29udGV4dFR5cGU9dX1uPWMuc2xpY2UsbD17X19lOmZ1bmN0aW9uKG4sbCx1LGkpe2Zvcih2YXIgdCxvLHI7bD1sLl9fOylpZigodD1sLl9fYykmJiF0Ll9fKXRyeXtpZigobz10LmNvbnN0cnVjdG9yKSYmbnVsbCE9by5nZXREZXJpdmVkU3RhdGVGcm9tRXJyb3ImJih0LnNldFN0YXRlKG8uZ2V0RGVyaXZlZFN0YXRlRnJvbUVycm9yKG4pKSxyPXQuX19kKSxudWxsIT10LmNvbXBvbmVudERpZENhdGNoJiYodC5jb21wb25lbnREaWRDYXRjaChuLGl8fHt9KSxyPXQuX19kKSxyKXJldHVybiB0Ll9fRT10fWNhdGNoKGwpe249bH10aHJvdyBufX0sdT0wLGk9ZnVuY3Rpb24obil7cmV0dXJuIG51bGwhPW4mJnZvaWQgMD09PW4uY29uc3RydWN0b3J9LF8ucHJvdG90eXBlLnNldFN0YXRlPWZ1bmN0aW9uKG4sbCl7dmFyIHU7dT1udWxsIT10aGlzLl9fcyYmdGhpcy5fX3MhPT10aGlzLnN0YXRlP3RoaXMuX19zOnRoaXMuX19zPWEoe30sdGhpcy5zdGF0ZSksXCJmdW5jdGlvblwiPT10eXBlb2YgbiYmKG49bihhKHt9LHUpLHRoaXMucHJvcHMpKSxuJiZhKHUsbiksbnVsbCE9biYmdGhpcy5fX3YmJihsJiZ0aGlzLl9faC5wdXNoKGwpLG0odGhpcykpfSxfLnByb3RvdHlwZS5mb3JjZVVwZGF0ZT1mdW5jdGlvbihuKXt0aGlzLl9fdiYmKHRoaXMuX19lPSEwLG4mJnRoaXMuX19oLnB1c2gobiksbSh0aGlzKSl9LF8ucHJvdG90eXBlLnJlbmRlcj1kLHQ9W10sbz1cImZ1bmN0aW9uXCI9PXR5cGVvZiBQcm9taXNlP1Byb21pc2UucHJvdG90eXBlLnRoZW4uYmluZChQcm9taXNlLnJlc29sdmUoKSk6c2V0VGltZW91dCxnLl9fcj0wLGY9MDtleHBvcnR7UyBhcyByZW5kZXIscSBhcyBoeWRyYXRlLHYgYXMgY3JlYXRlRWxlbWVudCx2IGFzIGgsZCBhcyBGcmFnbWVudCxwIGFzIGNyZWF0ZVJlZixpIGFzIGlzVmFsaWRFbGVtZW50LF8gYXMgQ29tcG9uZW50LEIgYXMgY2xvbmVFbGVtZW50LEQgYXMgY3JlYXRlQ29udGV4dCxBIGFzIHRvQ2hpbGRBcnJheSxsIGFzIG9wdGlvbnN9O1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9cHJlYWN0Lm1vZHVsZS5qcy5tYXBcbiIsImltcG9ydHtvcHRpb25zIGFzIG59ZnJvbVwicHJlYWN0XCI7dmFyIHQsdSxyLG8saT0wLGM9W10sZj1bXSxlPW4uX19iLGE9bi5fX3Isdj1uLmRpZmZlZCxsPW4uX19jLG09bi51bm1vdW50O2Z1bmN0aW9uIHAodCxyKXtuLl9faCYmbi5fX2godSx0LGl8fHIpLGk9MDt2YXIgbz11Ll9fSHx8KHUuX19IPXtfXzpbXSxfX2g6W119KTtyZXR1cm4gdD49by5fXy5sZW5ndGgmJm8uX18ucHVzaCh7X19WOmZ9KSxvLl9fW3RdfWZ1bmN0aW9uIHkobil7cmV0dXJuIGk9MSxkKHosbil9ZnVuY3Rpb24gZChuLHIsbyl7dmFyIGk9cCh0KyssMik7cmV0dXJuIGkudD1uLGkuX19jfHwoaS5fXz1bbz9vKHIpOnoodm9pZCAwLHIpLGZ1bmN0aW9uKG4pe3ZhciB0PWkudChpLl9fWzBdLG4pO2kuX19bMF0hPT10JiYoaS5fXz1bdCxpLl9fWzFdXSxpLl9fYy5zZXRTdGF0ZSh7fSkpfV0saS5fX2M9dSksaS5fX31mdW5jdGlvbiBfKHIsbyl7dmFyIGk9cCh0KyssMyk7IW4uX19zJiZ3KGkuX19ILG8pJiYoaS5fXz1yLGkudT1vLHUuX19ILl9faC5wdXNoKGkpKX1mdW5jdGlvbiBoKHIsbyl7dmFyIGk9cCh0KyssNCk7IW4uX19zJiZ3KGkuX19ILG8pJiYoaS5fXz1yLGkudT1vLHUuX19oLnB1c2goaSkpfWZ1bmN0aW9uIHMobil7cmV0dXJuIGk9NSxGKGZ1bmN0aW9uKCl7cmV0dXJue2N1cnJlbnQ6bn19LFtdKX1mdW5jdGlvbiBBKG4sdCx1KXtpPTYsaChmdW5jdGlvbigpe3JldHVyblwiZnVuY3Rpb25cIj09dHlwZW9mIG4/KG4odCgpKSxmdW5jdGlvbigpe3JldHVybiBuKG51bGwpfSk6bj8obi5jdXJyZW50PXQoKSxmdW5jdGlvbigpe3JldHVybiBuLmN1cnJlbnQ9bnVsbH0pOnZvaWQgMH0sbnVsbD09dT91OnUuY29uY2F0KG4pKX1mdW5jdGlvbiBGKG4sdSl7dmFyIHI9cCh0KyssNyk7cmV0dXJuIHcoci5fX0gsdSk/KHIuX19WPW4oKSxyLnU9dSxyLl9faD1uLHIuX19WKTpyLl9ffWZ1bmN0aW9uIFQobix0KXtyZXR1cm4gaT04LEYoZnVuY3Rpb24oKXtyZXR1cm4gbn0sdCl9ZnVuY3Rpb24gcShuKXt2YXIgcj11LmNvbnRleHRbbi5fX2NdLG89cCh0KyssOSk7cmV0dXJuIG8uYz1uLHI/KG51bGw9PW8uX18mJihvLl9fPSEwLHIuc3ViKHUpKSxyLnByb3BzLnZhbHVlKTpuLl9ffWZ1bmN0aW9uIHgodCx1KXtuLnVzZURlYnVnVmFsdWUmJm4udXNlRGVidWdWYWx1ZSh1P3UodCk6dCl9ZnVuY3Rpb24gVihuKXt2YXIgcj1wKHQrKywxMCksbz15KCk7cmV0dXJuIHIuX189bix1LmNvbXBvbmVudERpZENhdGNofHwodS5jb21wb25lbnREaWRDYXRjaD1mdW5jdGlvbihuKXtyLl9fJiZyLl9fKG4pLG9bMV0obil9KSxbb1swXSxmdW5jdGlvbigpe29bMV0odm9pZCAwKX1dfWZ1bmN0aW9uIGIoKXtmb3IodmFyIHQ7dD1jLnNoaWZ0KCk7KWlmKHQuX19QKXRyeXt0Ll9fSC5fX2guZm9yRWFjaChqKSx0Ll9fSC5fX2guZm9yRWFjaChrKSx0Ll9fSC5fX2g9W119Y2F0Y2godSl7dC5fX0guX19oPVtdLG4uX19lKHUsdC5fX3YpfX1uLl9fYj1mdW5jdGlvbihuKXt1PW51bGwsZSYmZShuKX0sbi5fX3I9ZnVuY3Rpb24obil7YSYmYShuKSx0PTA7dmFyIG89KHU9bi5fX2MpLl9fSDtvJiYocj09PXU/KG8uX19oPVtdLHUuX19oPVtdLG8uX18uZm9yRWFjaChmdW5jdGlvbihuKXtuLl9fVj1mLG4udT12b2lkIDB9KSk6KG8uX19oLmZvckVhY2goaiksby5fX2guZm9yRWFjaChrKSxvLl9faD1bXSkpLHI9dX0sbi5kaWZmZWQ9ZnVuY3Rpb24odCl7diYmdih0KTt2YXIgaT10Ll9fYztpJiZpLl9fSCYmKGkuX19ILl9faC5sZW5ndGgmJigxIT09Yy5wdXNoKGkpJiZvPT09bi5yZXF1ZXN0QW5pbWF0aW9uRnJhbWV8fCgobz1uLnJlcXVlc3RBbmltYXRpb25GcmFtZSl8fGZ1bmN0aW9uKG4pe3ZhciB0LHU9ZnVuY3Rpb24oKXtjbGVhclRpbWVvdXQociksZyYmY2FuY2VsQW5pbWF0aW9uRnJhbWUodCksc2V0VGltZW91dChuKX0scj1zZXRUaW1lb3V0KHUsMTAwKTtnJiYodD1yZXF1ZXN0QW5pbWF0aW9uRnJhbWUodSkpfSkoYikpLGkuX19ILl9fLmZvckVhY2goZnVuY3Rpb24obil7bi51JiYobi5fX0g9bi51KSxuLl9fViE9PWYmJihuLl9fPW4uX19WKSxuLnU9dm9pZCAwLG4uX19WPWZ9KSkscj11PW51bGx9LG4uX19jPWZ1bmN0aW9uKHQsdSl7dS5zb21lKGZ1bmN0aW9uKHQpe3RyeXt0Ll9faC5mb3JFYWNoKGopLHQuX19oPXQuX19oLmZpbHRlcihmdW5jdGlvbihuKXtyZXR1cm4hbi5fX3x8ayhuKX0pfWNhdGNoKHIpe3Uuc29tZShmdW5jdGlvbihuKXtuLl9faCYmKG4uX19oPVtdKX0pLHU9W10sbi5fX2Uocix0Ll9fdil9fSksbCYmbCh0LHUpfSxuLnVubW91bnQ9ZnVuY3Rpb24odCl7bSYmbSh0KTt2YXIgdSxyPXQuX19jO3ImJnIuX19IJiYoci5fX0guX18uZm9yRWFjaChmdW5jdGlvbihuKXt0cnl7aihuKX1jYXRjaChuKXt1PW59fSksdSYmbi5fX2UodSxyLl9fdikpfTt2YXIgZz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWU7ZnVuY3Rpb24gaihuKXt2YXIgdD11LHI9bi5fX2M7XCJmdW5jdGlvblwiPT10eXBlb2YgciYmKG4uX19jPXZvaWQgMCxyKCkpLHU9dH1mdW5jdGlvbiBrKG4pe3ZhciB0PXU7bi5fX2M9bi5fXygpLHU9dH1mdW5jdGlvbiB3KG4sdCl7cmV0dXJuIW58fG4ubGVuZ3RoIT09dC5sZW5ndGh8fHQuc29tZShmdW5jdGlvbih0LHUpe3JldHVybiB0IT09blt1XX0pfWZ1bmN0aW9uIHoobix0KXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiB0P3Qobik6dH1leHBvcnR7eSBhcyB1c2VTdGF0ZSxkIGFzIHVzZVJlZHVjZXIsXyBhcyB1c2VFZmZlY3QsaCBhcyB1c2VMYXlvdXRFZmZlY3QscyBhcyB1c2VSZWYsQSBhcyB1c2VJbXBlcmF0aXZlSGFuZGxlLEYgYXMgdXNlTWVtbyxUIGFzIHVzZUNhbGxiYWNrLHEgYXMgdXNlQ29udGV4dCx4IGFzIHVzZURlYnVnVmFsdWUsViBhcyB1c2VFcnJvckJvdW5kYXJ5fTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWhvb2tzLm1vZHVsZS5qcy5tYXBcbiIsIlxuLyogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBCZWdpbiBwcmlzbS1jb3JlLmpzXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXG5cbi8vLyA8cmVmZXJlbmNlIGxpYj1cIldlYldvcmtlclwiLz5cblxudmFyIF9zZWxmID0gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuXHQ/IHdpbmRvdyAgIC8vIGlmIGluIGJyb3dzZXJcblx0OiAoXG5cdFx0KHR5cGVvZiBXb3JrZXJHbG9iYWxTY29wZSAhPT0gJ3VuZGVmaW5lZCcgJiYgc2VsZiBpbnN0YW5jZW9mIFdvcmtlckdsb2JhbFNjb3BlKVxuXHRcdFx0PyBzZWxmIC8vIGlmIGluIHdvcmtlclxuXHRcdFx0OiB7fSAgIC8vIGlmIGluIG5vZGUganNcblx0KTtcblxuLyoqXG4gKiBQcmlzbTogTGlnaHR3ZWlnaHQsIHJvYnVzdCwgZWxlZ2FudCBzeW50YXggaGlnaGxpZ2h0aW5nXG4gKlxuICogQGxpY2Vuc2UgTUlUIDxodHRwczovL29wZW5zb3VyY2Uub3JnL2xpY2Vuc2VzL01JVD5cbiAqIEBhdXRob3IgTGVhIFZlcm91IDxodHRwczovL2xlYS52ZXJvdS5tZT5cbiAqIEBuYW1lc3BhY2VcbiAqIEBwdWJsaWNcbiAqL1xudmFyIFByaXNtID0gKGZ1bmN0aW9uIChfc2VsZikge1xuXG5cdC8vIFByaXZhdGUgaGVscGVyIHZhcnNcblx0dmFyIGxhbmcgPSAvKD86XnxcXHMpbGFuZyg/OnVhZ2UpPy0oW1xcdy1dKykoPz1cXHN8JCkvaTtcblx0dmFyIHVuaXF1ZUlkID0gMDtcblxuXHQvLyBUaGUgZ3JhbW1hciBvYmplY3QgZm9yIHBsYWludGV4dFxuXHR2YXIgcGxhaW5UZXh0R3JhbW1hciA9IHt9O1xuXG5cblx0dmFyIF8gPSB7XG5cdFx0LyoqXG5cdFx0ICogQnkgZGVmYXVsdCwgUHJpc20gd2lsbCBhdHRlbXB0IHRvIGhpZ2hsaWdodCBhbGwgY29kZSBlbGVtZW50cyAoYnkgY2FsbGluZyB7QGxpbmsgUHJpc20uaGlnaGxpZ2h0QWxsfSkgb24gdGhlXG5cdFx0ICogY3VycmVudCBwYWdlIGFmdGVyIHRoZSBwYWdlIGZpbmlzaGVkIGxvYWRpbmcuIFRoaXMgbWlnaHQgYmUgYSBwcm9ibGVtIGlmIGUuZy4geW91IHdhbnRlZCB0byBhc3luY2hyb25vdXNseSBsb2FkXG5cdFx0ICogYWRkaXRpb25hbCBsYW5ndWFnZXMgb3IgcGx1Z2lucyB5b3Vyc2VsZi5cblx0XHQgKlxuXHRcdCAqIEJ5IHNldHRpbmcgdGhpcyB2YWx1ZSB0byBgdHJ1ZWAsIFByaXNtIHdpbGwgbm90IGF1dG9tYXRpY2FsbHkgaGlnaGxpZ2h0IGFsbCBjb2RlIGVsZW1lbnRzIG9uIHRoZSBwYWdlLlxuXHRcdCAqXG5cdFx0ICogWW91IG9idmlvdXNseSBoYXZlIHRvIGNoYW5nZSB0aGlzIHZhbHVlIGJlZm9yZSB0aGUgYXV0b21hdGljIGhpZ2hsaWdodGluZyBzdGFydGVkLiBUbyBkbyB0aGlzLCB5b3UgY2FuIGFkZCBhblxuXHRcdCAqIGVtcHR5IFByaXNtIG9iamVjdCBpbnRvIHRoZSBnbG9iYWwgc2NvcGUgYmVmb3JlIGxvYWRpbmcgdGhlIFByaXNtIHNjcmlwdCBsaWtlIHRoaXM6XG5cdFx0ICpcblx0XHQgKiBgYGBqc1xuXHRcdCAqIHdpbmRvdy5QcmlzbSA9IHdpbmRvdy5QcmlzbSB8fCB7fTtcblx0XHQgKiBQcmlzbS5tYW51YWwgPSB0cnVlO1xuXHRcdCAqIC8vIGFkZCBhIG5ldyA8c2NyaXB0PiB0byBsb2FkIFByaXNtJ3Mgc2NyaXB0XG5cdFx0ICogYGBgXG5cdFx0ICpcblx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdCAqIEB0eXBlIHtib29sZWFufVxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHRtYW51YWw6IF9zZWxmLlByaXNtICYmIF9zZWxmLlByaXNtLm1hbnVhbCxcblx0XHQvKipcblx0XHQgKiBCeSBkZWZhdWx0LCBpZiBQcmlzbSBpcyBpbiBhIHdlYiB3b3JrZXIsIGl0IGFzc3VtZXMgdGhhdCBpdCBpcyBpbiBhIHdvcmtlciBpdCBjcmVhdGVkIGl0c2VsZiwgc28gaXQgdXNlc1xuXHRcdCAqIGBhZGRFdmVudExpc3RlbmVyYCB0byBjb21tdW5pY2F0ZSB3aXRoIGl0cyBwYXJlbnQgaW5zdGFuY2UuIEhvd2V2ZXIsIGlmIHlvdSdyZSB1c2luZyBQcmlzbSBtYW51YWxseSBpbiB5b3VyXG5cdFx0ICogb3duIHdvcmtlciwgeW91IGRvbid0IHdhbnQgaXQgdG8gZG8gdGhpcy5cblx0XHQgKlxuXHRcdCAqIEJ5IHNldHRpbmcgdGhpcyB2YWx1ZSB0byBgdHJ1ZWAsIFByaXNtIHdpbGwgbm90IGFkZCBpdHMgb3duIGxpc3RlbmVycyB0byB0aGUgd29ya2VyLlxuXHRcdCAqXG5cdFx0ICogWW91IG9idmlvdXNseSBoYXZlIHRvIGNoYW5nZSB0aGlzIHZhbHVlIGJlZm9yZSBQcmlzbSBleGVjdXRlcy4gVG8gZG8gdGhpcywgeW91IGNhbiBhZGQgYW5cblx0XHQgKiBlbXB0eSBQcmlzbSBvYmplY3QgaW50byB0aGUgZ2xvYmFsIHNjb3BlIGJlZm9yZSBsb2FkaW5nIHRoZSBQcmlzbSBzY3JpcHQgbGlrZSB0aGlzOlxuXHRcdCAqXG5cdFx0ICogYGBganNcblx0XHQgKiB3aW5kb3cuUHJpc20gPSB3aW5kb3cuUHJpc20gfHwge307XG5cdFx0ICogUHJpc20uZGlzYWJsZVdvcmtlck1lc3NhZ2VIYW5kbGVyID0gdHJ1ZTtcblx0XHQgKiAvLyBMb2FkIFByaXNtJ3Mgc2NyaXB0XG5cdFx0ICogYGBgXG5cdFx0ICpcblx0XHQgKiBAZGVmYXVsdCBmYWxzZVxuXHRcdCAqIEB0eXBlIHtib29sZWFufVxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHRkaXNhYmxlV29ya2VyTWVzc2FnZUhhbmRsZXI6IF9zZWxmLlByaXNtICYmIF9zZWxmLlByaXNtLmRpc2FibGVXb3JrZXJNZXNzYWdlSGFuZGxlcixcblxuXHRcdC8qKlxuXHRcdCAqIEEgbmFtZXNwYWNlIGZvciB1dGlsaXR5IG1ldGhvZHMuXG5cdFx0ICpcblx0XHQgKiBBbGwgZnVuY3Rpb24gaW4gdGhpcyBuYW1lc3BhY2UgdGhhdCBhcmUgbm90IGV4cGxpY2l0bHkgbWFya2VkIGFzIF9wdWJsaWNfIGFyZSBmb3IgX19pbnRlcm5hbCB1c2Ugb25seV9fIGFuZCBtYXlcblx0XHQgKiBjaGFuZ2Ugb3IgZGlzYXBwZWFyIGF0IGFueSB0aW1lLlxuXHRcdCAqXG5cdFx0ICogQG5hbWVzcGFjZVxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqL1xuXHRcdHV0aWw6IHtcblx0XHRcdGVuY29kZTogZnVuY3Rpb24gZW5jb2RlKHRva2Vucykge1xuXHRcdFx0XHRpZiAodG9rZW5zIGluc3RhbmNlb2YgVG9rZW4pIHtcblx0XHRcdFx0XHRyZXR1cm4gbmV3IFRva2VuKHRva2Vucy50eXBlLCBlbmNvZGUodG9rZW5zLmNvbnRlbnQpLCB0b2tlbnMuYWxpYXMpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodG9rZW5zKSkge1xuXHRcdFx0XHRcdHJldHVybiB0b2tlbnMubWFwKGVuY29kZSk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0cmV0dXJuIHRva2Vucy5yZXBsYWNlKC8mL2csICcmYW1wOycpLnJlcGxhY2UoLzwvZywgJyZsdDsnKS5yZXBsYWNlKC9cXHUwMGEwL2csICcgJyk7XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyB0aGUgbmFtZSBvZiB0aGUgdHlwZSBvZiB0aGUgZ2l2ZW4gdmFsdWUuXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHthbnl9IG9cblx0XHRcdCAqIEByZXR1cm5zIHtzdHJpbmd9XG5cdFx0XHQgKiBAZXhhbXBsZVxuXHRcdFx0ICogdHlwZShudWxsKSAgICAgID09PSAnTnVsbCdcblx0XHRcdCAqIHR5cGUodW5kZWZpbmVkKSA9PT0gJ1VuZGVmaW5lZCdcblx0XHRcdCAqIHR5cGUoMTIzKSAgICAgICA9PT0gJ051bWJlcidcblx0XHRcdCAqIHR5cGUoJ2ZvbycpICAgICA9PT0gJ1N0cmluZydcblx0XHRcdCAqIHR5cGUodHJ1ZSkgICAgICA9PT0gJ0Jvb2xlYW4nXG5cdFx0XHQgKiB0eXBlKFsxLCAyXSkgICAgPT09ICdBcnJheSdcblx0XHRcdCAqIHR5cGUoe30pICAgICAgICA9PT0gJ09iamVjdCdcblx0XHRcdCAqIHR5cGUoU3RyaW5nKSAgICA9PT0gJ0Z1bmN0aW9uJ1xuXHRcdFx0ICogdHlwZSgvYWJjKy8pICAgID09PSAnUmVnRXhwJ1xuXHRcdFx0ICovXG5cdFx0XHR0eXBlOiBmdW5jdGlvbiAobykge1xuXHRcdFx0XHRyZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG8pLnNsaWNlKDgsIC0xKTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogUmV0dXJucyBhIHVuaXF1ZSBudW1iZXIgZm9yIHRoZSBnaXZlbiBvYmplY3QuIExhdGVyIGNhbGxzIHdpbGwgc3RpbGwgcmV0dXJuIHRoZSBzYW1lIG51bWJlci5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge09iamVjdH0gb2JqXG5cdFx0XHQgKiBAcmV0dXJucyB7bnVtYmVyfVxuXHRcdFx0ICovXG5cdFx0XHRvYmpJZDogZnVuY3Rpb24gKG9iaikge1xuXHRcdFx0XHRpZiAoIW9ialsnX19pZCddKSB7XG5cdFx0XHRcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG9iaiwgJ19faWQnLCB7IHZhbHVlOiArK3VuaXF1ZUlkIH0pO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiBvYmpbJ19faWQnXTtcblx0XHRcdH0sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ3JlYXRlcyBhIGRlZXAgY2xvbmUgb2YgdGhlIGdpdmVuIG9iamVjdC5cblx0XHRcdCAqXG5cdFx0XHQgKiBUaGUgbWFpbiBpbnRlbmRlZCB1c2Ugb2YgdGhpcyBmdW5jdGlvbiBpcyB0byBjbG9uZSBsYW5ndWFnZSBkZWZpbml0aW9ucy5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge1R9IG9cblx0XHRcdCAqIEBwYXJhbSB7UmVjb3JkPG51bWJlciwgYW55Pn0gW3Zpc2l0ZWRdXG5cdFx0XHQgKiBAcmV0dXJucyB7VH1cblx0XHRcdCAqIEB0ZW1wbGF0ZSBUXG5cdFx0XHQgKi9cblx0XHRcdGNsb25lOiBmdW5jdGlvbiBkZWVwQ2xvbmUobywgdmlzaXRlZCkge1xuXHRcdFx0XHR2aXNpdGVkID0gdmlzaXRlZCB8fCB7fTtcblxuXHRcdFx0XHR2YXIgY2xvbmU7IHZhciBpZDtcblx0XHRcdFx0c3dpdGNoIChfLnV0aWwudHlwZShvKSkge1xuXHRcdFx0XHRcdGNhc2UgJ09iamVjdCc6XG5cdFx0XHRcdFx0XHRpZCA9IF8udXRpbC5vYmpJZChvKTtcblx0XHRcdFx0XHRcdGlmICh2aXNpdGVkW2lkXSkge1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdmlzaXRlZFtpZF07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjbG9uZSA9IC8qKiBAdHlwZSB7UmVjb3JkPHN0cmluZywgYW55Pn0gKi8gKHt9KTtcblx0XHRcdFx0XHRcdHZpc2l0ZWRbaWRdID0gY2xvbmU7XG5cblx0XHRcdFx0XHRcdGZvciAodmFyIGtleSBpbiBvKSB7XG5cdFx0XHRcdFx0XHRcdGlmIChvLmhhc093blByb3BlcnR5KGtleSkpIHtcblx0XHRcdFx0XHRcdFx0XHRjbG9uZVtrZXldID0gZGVlcENsb25lKG9ba2V5XSwgdmlzaXRlZCk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmV0dXJuIC8qKiBAdHlwZSB7YW55fSAqLyAoY2xvbmUpO1xuXG5cdFx0XHRcdFx0Y2FzZSAnQXJyYXknOlxuXHRcdFx0XHRcdFx0aWQgPSBfLnV0aWwub2JqSWQobyk7XG5cdFx0XHRcdFx0XHRpZiAodmlzaXRlZFtpZF0pIHtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHZpc2l0ZWRbaWRdO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y2xvbmUgPSBbXTtcblx0XHRcdFx0XHRcdHZpc2l0ZWRbaWRdID0gY2xvbmU7XG5cblx0XHRcdFx0XHRcdCgvKiogQHR5cGUge0FycmF5fSAqLygvKiogQHR5cGUge2FueX0gKi8obykpKS5mb3JFYWNoKGZ1bmN0aW9uICh2LCBpKSB7XG5cdFx0XHRcdFx0XHRcdGNsb25lW2ldID0gZGVlcENsb25lKHYsIHZpc2l0ZWQpO1xuXHRcdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHRcdHJldHVybiAvKiogQHR5cGUge2FueX0gKi8gKGNsb25lKTtcblxuXHRcdFx0XHRcdGRlZmF1bHQ6XG5cdFx0XHRcdFx0XHRyZXR1cm4gbztcblx0XHRcdFx0fVxuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIHRoZSBQcmlzbSBsYW5ndWFnZSBvZiB0aGUgZ2l2ZW4gZWxlbWVudCBzZXQgYnkgYSBgbGFuZ3VhZ2UteHh4eGAgb3IgYGxhbmcteHh4eGAgY2xhc3MuXG5cdFx0XHQgKlxuXHRcdFx0ICogSWYgbm8gbGFuZ3VhZ2UgaXMgc2V0IGZvciB0aGUgZWxlbWVudCBvciB0aGUgZWxlbWVudCBpcyBgbnVsbGAgb3IgYHVuZGVmaW5lZGAsIGBub25lYCB3aWxsIGJlIHJldHVybmVkLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudFxuXHRcdFx0ICogQHJldHVybnMge3N0cmluZ31cblx0XHRcdCAqL1xuXHRcdFx0Z2V0TGFuZ3VhZ2U6IGZ1bmN0aW9uIChlbGVtZW50KSB7XG5cdFx0XHRcdHdoaWxlIChlbGVtZW50KSB7XG5cdFx0XHRcdFx0dmFyIG0gPSBsYW5nLmV4ZWMoZWxlbWVudC5jbGFzc05hbWUpO1xuXHRcdFx0XHRcdGlmIChtKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbVsxXS50b0xvd2VyQ2FzZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiAnbm9uZSc7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFNldHMgdGhlIFByaXNtIGBsYW5ndWFnZS14eHh4YCBjbGFzcyBvZiB0aGUgZ2l2ZW4gZWxlbWVudC5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBsYW5ndWFnZVxuXHRcdFx0ICogQHJldHVybnMge3ZvaWR9XG5cdFx0XHQgKi9cblx0XHRcdHNldExhbmd1YWdlOiBmdW5jdGlvbiAoZWxlbWVudCwgbGFuZ3VhZ2UpIHtcblx0XHRcdFx0Ly8gcmVtb3ZlIGFsbCBgbGFuZ3VhZ2UteHh4eGAgY2xhc3Nlc1xuXHRcdFx0XHQvLyAodGhpcyBtaWdodCBsZWF2ZSBiZWhpbmQgYSBsZWFkaW5nIHNwYWNlKVxuXHRcdFx0XHRlbGVtZW50LmNsYXNzTmFtZSA9IGVsZW1lbnQuY2xhc3NOYW1lLnJlcGxhY2UoUmVnRXhwKGxhbmcsICdnaScpLCAnJyk7XG5cblx0XHRcdFx0Ly8gYWRkIHRoZSBuZXcgYGxhbmd1YWdlLXh4eHhgIGNsYXNzXG5cdFx0XHRcdC8vICh1c2luZyBgY2xhc3NMaXN0YCB3aWxsIGF1dG9tYXRpY2FsbHkgY2xlYW4gdXAgc3BhY2VzIGZvciB1cylcblx0XHRcdFx0ZWxlbWVudC5jbGFzc0xpc3QuYWRkKCdsYW5ndWFnZS0nICsgbGFuZ3VhZ2UpO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSZXR1cm5zIHRoZSBzY3JpcHQgZWxlbWVudCB0aGF0IGlzIGN1cnJlbnRseSBleGVjdXRpbmcuXG5cdFx0XHQgKlxuXHRcdFx0ICogVGhpcyBkb2VzIF9fbm90X18gd29yayBmb3IgbGluZSBzY3JpcHQgZWxlbWVudC5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcmV0dXJucyB7SFRNTFNjcmlwdEVsZW1lbnQgfCBudWxsfVxuXHRcdFx0ICovXG5cdFx0XHRjdXJyZW50U2NyaXB0OiBmdW5jdGlvbiAoKSB7XG5cdFx0XHRcdGlmICh0eXBlb2YgZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG51bGw7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCdjdXJyZW50U2NyaXB0JyBpbiBkb2N1bWVudCAmJiAxIDwgMiAvKiBoYWNrIHRvIHRyaXAgVFMnIGZsb3cgYW5hbHlzaXMgKi8pIHtcblx0XHRcdFx0XHRyZXR1cm4gLyoqIEB0eXBlIHthbnl9ICovIChkb2N1bWVudC5jdXJyZW50U2NyaXB0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIElFMTEgd29ya2Fyb3VuZFxuXHRcdFx0XHQvLyB3ZSdsbCBnZXQgdGhlIHNyYyBvZiB0aGUgY3VycmVudCBzY3JpcHQgYnkgcGFyc2luZyBJRTExJ3MgZXJyb3Igc3RhY2sgdHJhY2Vcblx0XHRcdFx0Ly8gdGhpcyB3aWxsIG5vdCB3b3JrIGZvciBpbmxpbmUgc2NyaXB0c1xuXG5cdFx0XHRcdHRyeSB7XG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCk7XG5cdFx0XHRcdH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdC8vIEdldCBmaWxlIHNyYyB1cmwgZnJvbSBzdGFjay4gU3BlY2lmaWNhbGx5IHdvcmtzIHdpdGggdGhlIGZvcm1hdCBvZiBzdGFjayB0cmFjZXMgaW4gSUUuXG5cdFx0XHRcdFx0Ly8gQSBzdGFjayB3aWxsIGxvb2sgbGlrZSB0aGlzOlxuXHRcdFx0XHRcdC8vXG5cdFx0XHRcdFx0Ly8gRXJyb3Jcblx0XHRcdFx0XHQvLyAgICBhdCBfLnV0aWwuY3VycmVudFNjcmlwdCAoaHR0cDovL2xvY2FsaG9zdC9jb21wb25lbnRzL3ByaXNtLWNvcmUuanM6MTE5OjUpXG5cdFx0XHRcdFx0Ly8gICAgYXQgR2xvYmFsIGNvZGUgKGh0dHA6Ly9sb2NhbGhvc3QvY29tcG9uZW50cy9wcmlzbS1jb3JlLmpzOjYwNjoxKVxuXG5cdFx0XHRcdFx0dmFyIHNyYyA9ICgvYXQgW14oXFxyXFxuXSpcXCgoLiopOlteOl0rOlteOl0rXFwpJC9pLmV4ZWMoZXJyLnN0YWNrKSB8fCBbXSlbMV07XG5cdFx0XHRcdFx0aWYgKHNyYykge1xuXHRcdFx0XHRcdFx0dmFyIHNjcmlwdHMgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5VGFnTmFtZSgnc2NyaXB0Jyk7XG5cdFx0XHRcdFx0XHRmb3IgKHZhciBpIGluIHNjcmlwdHMpIHtcblx0XHRcdFx0XHRcdFx0aWYgKHNjcmlwdHNbaV0uc3JjID09IHNyYykge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiBzY3JpcHRzW2ldO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHJldHVybiBudWxsO1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIFJldHVybnMgd2hldGhlciBhIGdpdmVuIGNsYXNzIGlzIGFjdGl2ZSBmb3IgYGVsZW1lbnRgLlxuXHRcdFx0ICpcblx0XHRcdCAqIFRoZSBjbGFzcyBjYW4gYmUgYWN0aXZhdGVkIGlmIGBlbGVtZW50YCBvciBvbmUgb2YgaXRzIGFuY2VzdG9ycyBoYXMgdGhlIGdpdmVuIGNsYXNzIGFuZCBpdCBjYW4gYmUgZGVhY3RpdmF0ZWRcblx0XHRcdCAqIGlmIGBlbGVtZW50YCBvciBvbmUgb2YgaXRzIGFuY2VzdG9ycyBoYXMgdGhlIG5lZ2F0ZWQgdmVyc2lvbiBvZiB0aGUgZ2l2ZW4gY2xhc3MuIFRoZSBfbmVnYXRlZCB2ZXJzaW9uXyBvZiB0aGVcblx0XHRcdCAqIGdpdmVuIGNsYXNzIGlzIGp1c3QgdGhlIGdpdmVuIGNsYXNzIHdpdGggYSBgbm8tYCBwcmVmaXguXG5cdFx0XHQgKlxuXHRcdFx0ICogV2hldGhlciB0aGUgY2xhc3MgaXMgYWN0aXZlIGlzIGRldGVybWluZWQgYnkgdGhlIGNsb3Nlc3QgYW5jZXN0b3Igb2YgYGVsZW1lbnRgICh3aGVyZSBgZWxlbWVudGAgaXRzZWxmIGlzXG5cdFx0XHQgKiBjbG9zZXN0IGFuY2VzdG9yKSB0aGF0IGhhcyB0aGUgZ2l2ZW4gY2xhc3Mgb3IgdGhlIG5lZ2F0ZWQgdmVyc2lvbiBvZiBpdC4gSWYgbmVpdGhlciBgZWxlbWVudGAgbm9yIGFueSBvZiBpdHNcblx0XHRcdCAqIGFuY2VzdG9ycyBoYXZlIHRoZSBnaXZlbiBjbGFzcyBvciB0aGUgbmVnYXRlZCB2ZXJzaW9uIG9mIGl0LCB0aGVuIHRoZSBkZWZhdWx0IGFjdGl2YXRpb24gd2lsbCBiZSByZXR1cm5lZC5cblx0XHRcdCAqXG5cdFx0XHQgKiBJbiB0aGUgcGFyYWRveGljYWwgc2l0dWF0aW9uIHdoZXJlIHRoZSBjbG9zZXN0IGFuY2VzdG9yIGNvbnRhaW5zIF9fYm90aF9fIHRoZSBnaXZlbiBjbGFzcyBhbmQgdGhlIG5lZ2F0ZWRcblx0XHRcdCAqIHZlcnNpb24gb2YgaXQsIHRoZSBjbGFzcyBpcyBjb25zaWRlcmVkIGFjdGl2ZS5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnRcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBjbGFzc05hbWVcblx0XHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW2RlZmF1bHRBY3RpdmF0aW9uPWZhbHNlXVxuXHRcdFx0ICogQHJldHVybnMge2Jvb2xlYW59XG5cdFx0XHQgKi9cblx0XHRcdGlzQWN0aXZlOiBmdW5jdGlvbiAoZWxlbWVudCwgY2xhc3NOYW1lLCBkZWZhdWx0QWN0aXZhdGlvbikge1xuXHRcdFx0XHR2YXIgbm8gPSAnbm8tJyArIGNsYXNzTmFtZTtcblxuXHRcdFx0XHR3aGlsZSAoZWxlbWVudCkge1xuXHRcdFx0XHRcdHZhciBjbGFzc0xpc3QgPSBlbGVtZW50LmNsYXNzTGlzdDtcblx0XHRcdFx0XHRpZiAoY2xhc3NMaXN0LmNvbnRhaW5zKGNsYXNzTmFtZSkpIHtcblx0XHRcdFx0XHRcdHJldHVybiB0cnVlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoY2xhc3NMaXN0LmNvbnRhaW5zKG5vKSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRlbGVtZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuXHRcdFx0XHR9XG5cdFx0XHRcdHJldHVybiAhIWRlZmF1bHRBY3RpdmF0aW9uO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBUaGlzIG5hbWVzcGFjZSBjb250YWlucyBhbGwgY3VycmVudGx5IGxvYWRlZCBsYW5ndWFnZXMgYW5kIHRoZSBzb21lIGhlbHBlciBmdW5jdGlvbnMgdG8gY3JlYXRlIGFuZCBtb2RpZnkgbGFuZ3VhZ2VzLlxuXHRcdCAqXG5cdFx0ICogQG5hbWVzcGFjZVxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHRsYW5ndWFnZXM6IHtcblx0XHRcdC8qKlxuXHRcdFx0ICogVGhlIGdyYW1tYXIgZm9yIHBsYWluLCB1bmZvcm1hdHRlZCB0ZXh0LlxuXHRcdFx0ICovXG5cdFx0XHRwbGFpbjogcGxhaW5UZXh0R3JhbW1hcixcblx0XHRcdHBsYWludGV4dDogcGxhaW5UZXh0R3JhbW1hcixcblx0XHRcdHRleHQ6IHBsYWluVGV4dEdyYW1tYXIsXG5cdFx0XHR0eHQ6IHBsYWluVGV4dEdyYW1tYXIsXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQ3JlYXRlcyBhIGRlZXAgY29weSBvZiB0aGUgbGFuZ3VhZ2Ugd2l0aCB0aGUgZ2l2ZW4gaWQgYW5kIGFwcGVuZHMgdGhlIGdpdmVuIHRva2Vucy5cblx0XHRcdCAqXG5cdFx0XHQgKiBJZiBhIHRva2VuIGluIGByZWRlZmAgYWxzbyBhcHBlYXJzIGluIHRoZSBjb3BpZWQgbGFuZ3VhZ2UsIHRoZW4gdGhlIGV4aXN0aW5nIHRva2VuIGluIHRoZSBjb3BpZWQgbGFuZ3VhZ2Vcblx0XHRcdCAqIHdpbGwgYmUgb3ZlcndyaXR0ZW4gYXQgaXRzIG9yaWdpbmFsIHBvc2l0aW9uLlxuXHRcdFx0ICpcblx0XHRcdCAqICMjIEJlc3QgcHJhY3RpY2VzXG5cdFx0XHQgKlxuXHRcdFx0ICogU2luY2UgdGhlIHBvc2l0aW9uIG9mIG92ZXJ3cml0aW5nIHRva2VucyAodG9rZW4gaW4gYHJlZGVmYCB0aGF0IG92ZXJ3cml0ZSB0b2tlbnMgaW4gdGhlIGNvcGllZCBsYW5ndWFnZSlcblx0XHRcdCAqIGRvZXNuJ3QgbWF0dGVyLCB0aGV5IGNhbiB0ZWNobmljYWxseSBiZSBpbiBhbnkgb3JkZXIuIEhvd2V2ZXIsIHRoaXMgY2FuIGJlIGNvbmZ1c2luZyB0byBvdGhlcnMgdGhhdCB0cnlpbmcgdG9cblx0XHRcdCAqIHVuZGVyc3RhbmQgdGhlIGxhbmd1YWdlIGRlZmluaXRpb24gYmVjYXVzZSwgbm9ybWFsbHksIHRoZSBvcmRlciBvZiB0b2tlbnMgbWF0dGVycyBpbiBQcmlzbSBncmFtbWFycy5cblx0XHRcdCAqXG5cdFx0XHQgKiBUaGVyZWZvcmUsIGl0IGlzIGVuY291cmFnZWQgdG8gb3JkZXIgb3ZlcndyaXRpbmcgdG9rZW5zIGFjY29yZGluZyB0byB0aGUgcG9zaXRpb25zIG9mIHRoZSBvdmVyd3JpdHRlbiB0b2tlbnMuXG5cdFx0XHQgKiBGdXJ0aGVybW9yZSwgYWxsIG5vbi1vdmVyd3JpdGluZyB0b2tlbnMgc2hvdWxkIGJlIHBsYWNlZCBhZnRlciB0aGUgb3ZlcndyaXRpbmcgb25lcy5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIGlkIG9mIHRoZSBsYW5ndWFnZSB0byBleHRlbmQuIFRoaXMgaGFzIHRvIGJlIGEga2V5IGluIGBQcmlzbS5sYW5ndWFnZXNgLlxuXHRcdFx0ICogQHBhcmFtIHtHcmFtbWFyfSByZWRlZiBUaGUgbmV3IHRva2VucyB0byBhcHBlbmQuXG5cdFx0XHQgKiBAcmV0dXJucyB7R3JhbW1hcn0gVGhlIG5ldyBsYW5ndWFnZSBjcmVhdGVkLlxuXHRcdFx0ICogQHB1YmxpY1xuXHRcdFx0ICogQGV4YW1wbGVcblx0XHRcdCAqIFByaXNtLmxhbmd1YWdlc1snY3NzLXdpdGgtY29sb3JzJ10gPSBQcmlzbS5sYW5ndWFnZXMuZXh0ZW5kKCdjc3MnLCB7XG5cdFx0XHQgKiAgICAgLy8gUHJpc20ubGFuZ3VhZ2VzLmNzcyBhbHJlYWR5IGhhcyBhICdjb21tZW50JyB0b2tlbiwgc28gdGhpcyB0b2tlbiB3aWxsIG92ZXJ3cml0ZSBDU1MnICdjb21tZW50JyB0b2tlblxuXHRcdFx0ICogICAgIC8vIGF0IGl0cyBvcmlnaW5hbCBwb3NpdGlvblxuXHRcdFx0ICogICAgICdjb21tZW50JzogeyAuLi4gfSxcblx0XHRcdCAqICAgICAvLyBDU1MgZG9lc24ndCBoYXZlIGEgJ2NvbG9yJyB0b2tlbiwgc28gdGhpcyB0b2tlbiB3aWxsIGJlIGFwcGVuZGVkXG5cdFx0XHQgKiAgICAgJ2NvbG9yJzogL1xcYig/OnJlZHxncmVlbnxibHVlKVxcYi9cblx0XHRcdCAqIH0pO1xuXHRcdFx0ICovXG5cdFx0XHRleHRlbmQ6IGZ1bmN0aW9uIChpZCwgcmVkZWYpIHtcblx0XHRcdFx0dmFyIGxhbmcgPSBfLnV0aWwuY2xvbmUoXy5sYW5ndWFnZXNbaWRdKTtcblxuXHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gcmVkZWYpIHtcblx0XHRcdFx0XHRsYW5nW2tleV0gPSByZWRlZltrZXldO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGxhbmc7XG5cdFx0XHR9LFxuXG5cdFx0XHQvKipcblx0XHRcdCAqIEluc2VydHMgdG9rZW5zIF9iZWZvcmVfIGFub3RoZXIgdG9rZW4gaW4gYSBsYW5ndWFnZSBkZWZpbml0aW9uIG9yIGFueSBvdGhlciBncmFtbWFyLlxuXHRcdFx0ICpcblx0XHRcdCAqICMjIFVzYWdlXG5cdFx0XHQgKlxuXHRcdFx0ICogVGhpcyBoZWxwZXIgbWV0aG9kIG1ha2VzIGl0IGVhc3kgdG8gbW9kaWZ5IGV4aXN0aW5nIGxhbmd1YWdlcy4gRm9yIGV4YW1wbGUsIHRoZSBDU1MgbGFuZ3VhZ2UgZGVmaW5pdGlvblxuXHRcdFx0ICogbm90IG9ubHkgZGVmaW5lcyBDU1MgaGlnaGxpZ2h0aW5nIGZvciBDU1MgZG9jdW1lbnRzLCBidXQgYWxzbyBuZWVkcyB0byBkZWZpbmUgaGlnaGxpZ2h0aW5nIGZvciBDU1MgZW1iZWRkZWRcblx0XHRcdCAqIGluIEhUTUwgdGhyb3VnaCBgPHN0eWxlPmAgZWxlbWVudHMuIFRvIGRvIHRoaXMsIGl0IG5lZWRzIHRvIG1vZGlmeSBgUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cGAgYW5kIGFkZCB0aGVcblx0XHRcdCAqIGFwcHJvcHJpYXRlIHRva2Vucy4gSG93ZXZlciwgYFByaXNtLmxhbmd1YWdlcy5tYXJrdXBgIGlzIGEgcmVndWxhciBKYXZhU2NyaXB0IG9iamVjdCBsaXRlcmFsLCBzbyBpZiB5b3UgZG9cblx0XHRcdCAqIHRoaXM6XG5cdFx0XHQgKlxuXHRcdFx0ICogYGBganNcblx0XHRcdCAqIFByaXNtLmxhbmd1YWdlcy5tYXJrdXAuc3R5bGUgPSB7XG5cdFx0XHQgKiAgICAgLy8gdG9rZW5cblx0XHRcdCAqIH07XG5cdFx0XHQgKiBgYGBcblx0XHRcdCAqXG5cdFx0XHQgKiB0aGVuIHRoZSBgc3R5bGVgIHRva2VuIHdpbGwgYmUgYWRkZWQgKGFuZCBwcm9jZXNzZWQpIGF0IHRoZSBlbmQuIGBpbnNlcnRCZWZvcmVgIGFsbG93cyB5b3UgdG8gaW5zZXJ0IHRva2Vuc1xuXHRcdFx0ICogYmVmb3JlIGV4aXN0aW5nIHRva2Vucy4gRm9yIHRoZSBDU1MgZXhhbXBsZSBhYm92ZSwgeW91IHdvdWxkIHVzZSBpdCBsaWtlIHRoaXM6XG5cdFx0XHQgKlxuXHRcdFx0ICogYGBganNcblx0XHRcdCAqIFByaXNtLmxhbmd1YWdlcy5pbnNlcnRCZWZvcmUoJ21hcmt1cCcsICdjZGF0YScsIHtcblx0XHRcdCAqICAgICAnc3R5bGUnOiB7XG5cdFx0XHQgKiAgICAgICAgIC8vIHRva2VuXG5cdFx0XHQgKiAgICAgfVxuXHRcdFx0ICogfSk7XG5cdFx0XHQgKiBgYGBcblx0XHRcdCAqXG5cdFx0XHQgKiAjIyBTcGVjaWFsIGNhc2VzXG5cdFx0XHQgKlxuXHRcdFx0ICogSWYgdGhlIGdyYW1tYXJzIG9mIGBpbnNpZGVgIGFuZCBgaW5zZXJ0YCBoYXZlIHRva2VucyB3aXRoIHRoZSBzYW1lIG5hbWUsIHRoZSB0b2tlbnMgaW4gYGluc2lkZWAncyBncmFtbWFyXG5cdFx0XHQgKiB3aWxsIGJlIGlnbm9yZWQuXG5cdFx0XHQgKlxuXHRcdFx0ICogVGhpcyBiZWhhdmlvciBjYW4gYmUgdXNlZCB0byBpbnNlcnQgdG9rZW5zIGFmdGVyIGBiZWZvcmVgOlxuXHRcdFx0ICpcblx0XHRcdCAqIGBgYGpzXG5cdFx0XHQgKiBQcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdtYXJrdXAnLCAnY29tbWVudCcsIHtcblx0XHRcdCAqICAgICAnY29tbWVudCc6IFByaXNtLmxhbmd1YWdlcy5tYXJrdXAuY29tbWVudCxcblx0XHRcdCAqICAgICAvLyB0b2tlbnMgYWZ0ZXIgJ2NvbW1lbnQnXG5cdFx0XHQgKiB9KTtcblx0XHRcdCAqIGBgYFxuXHRcdFx0ICpcblx0XHRcdCAqICMjIExpbWl0YXRpb25zXG5cdFx0XHQgKlxuXHRcdFx0ICogVGhlIG1haW4gcHJvYmxlbSBgaW5zZXJ0QmVmb3JlYCBoYXMgdG8gc29sdmUgaXMgaXRlcmF0aW9uIG9yZGVyLiBTaW5jZSBFUzIwMTUsIHRoZSBpdGVyYXRpb24gb3JkZXIgZm9yIG9iamVjdFxuXHRcdFx0ICogcHJvcGVydGllcyBpcyBndWFyYW50ZWVkIHRvIGJlIHRoZSBpbnNlcnRpb24gb3JkZXIgKGV4Y2VwdCBmb3IgaW50ZWdlciBrZXlzKSBidXQgc29tZSBicm93c2VycyBiZWhhdmVcblx0XHRcdCAqIGRpZmZlcmVudGx5IHdoZW4ga2V5cyBhcmUgZGVsZXRlZCBhbmQgcmUtaW5zZXJ0ZWQuIFNvIGBpbnNlcnRCZWZvcmVgIGNhbid0IGJlIGltcGxlbWVudGVkIGJ5IHRlbXBvcmFyaWx5XG5cdFx0XHQgKiBkZWxldGluZyBwcm9wZXJ0aWVzIHdoaWNoIGlzIG5lY2Vzc2FyeSB0byBpbnNlcnQgYXQgYXJiaXRyYXJ5IHBvc2l0aW9ucy5cblx0XHRcdCAqXG5cdFx0XHQgKiBUbyBzb2x2ZSB0aGlzIHByb2JsZW0sIGBpbnNlcnRCZWZvcmVgIGRvZXNuJ3QgYWN0dWFsbHkgaW5zZXJ0IHRoZSBnaXZlbiB0b2tlbnMgaW50byB0aGUgdGFyZ2V0IG9iamVjdC5cblx0XHRcdCAqIEluc3RlYWQsIGl0IHdpbGwgY3JlYXRlIGEgbmV3IG9iamVjdCBhbmQgcmVwbGFjZSBhbGwgcmVmZXJlbmNlcyB0byB0aGUgdGFyZ2V0IG9iamVjdCB3aXRoIHRoZSBuZXcgb25lLiBUaGlzXG5cdFx0XHQgKiBjYW4gYmUgZG9uZSB3aXRob3V0IHRlbXBvcmFyaWx5IGRlbGV0aW5nIHByb3BlcnRpZXMsIHNvIHRoZSBpdGVyYXRpb24gb3JkZXIgaXMgd2VsbC1kZWZpbmVkLlxuXHRcdFx0ICpcblx0XHRcdCAqIEhvd2V2ZXIsIG9ubHkgcmVmZXJlbmNlcyB0aGF0IGNhbiBiZSByZWFjaGVkIGZyb20gYFByaXNtLmxhbmd1YWdlc2Agb3IgYGluc2VydGAgd2lsbCBiZSByZXBsYWNlZC4gSS5lLiBpZlxuXHRcdFx0ICogeW91IGhvbGQgdGhlIHRhcmdldCBvYmplY3QgaW4gYSB2YXJpYWJsZSwgdGhlbiB0aGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlIHdpbGwgbm90IGNoYW5nZS5cblx0XHRcdCAqXG5cdFx0XHQgKiBgYGBqc1xuXHRcdFx0ICogdmFyIG9sZE1hcmt1cCA9IFByaXNtLmxhbmd1YWdlcy5tYXJrdXA7XG5cdFx0XHQgKiB2YXIgbmV3TWFya3VwID0gUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnbWFya3VwJywgJ2NvbW1lbnQnLCB7IC4uLiB9KTtcblx0XHRcdCAqXG5cdFx0XHQgKiBhc3NlcnQob2xkTWFya3VwICE9PSBQcmlzbS5sYW5ndWFnZXMubWFya3VwKTtcblx0XHRcdCAqIGFzc2VydChuZXdNYXJrdXAgPT09IFByaXNtLmxhbmd1YWdlcy5tYXJrdXApO1xuXHRcdFx0ICogYGBgXG5cdFx0XHQgKlxuXHRcdFx0ICogQHBhcmFtIHtzdHJpbmd9IGluc2lkZSBUaGUgcHJvcGVydHkgb2YgYHJvb3RgIChlLmcuIGEgbGFuZ3VhZ2UgaWQgaW4gYFByaXNtLmxhbmd1YWdlc2ApIHRoYXQgY29udGFpbnMgdGhlXG5cdFx0XHQgKiBvYmplY3QgdG8gYmUgbW9kaWZpZWQuXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gYmVmb3JlIFRoZSBrZXkgdG8gaW5zZXJ0IGJlZm9yZS5cblx0XHRcdCAqIEBwYXJhbSB7R3JhbW1hcn0gaW5zZXJ0IEFuIG9iamVjdCBjb250YWluaW5nIHRoZSBrZXktdmFsdWUgcGFpcnMgdG8gYmUgaW5zZXJ0ZWQuXG5cdFx0XHQgKiBAcGFyYW0ge09iamVjdDxzdHJpbmcsIGFueT59IFtyb290XSBUaGUgb2JqZWN0IGNvbnRhaW5pbmcgYGluc2lkZWAsIGkuZS4gdGhlIG9iamVjdCB0aGF0IGNvbnRhaW5zIHRoZVxuXHRcdFx0ICogb2JqZWN0IHRvIGJlIG1vZGlmaWVkLlxuXHRcdFx0ICpcblx0XHRcdCAqIERlZmF1bHRzIHRvIGBQcmlzbS5sYW5ndWFnZXNgLlxuXHRcdFx0ICogQHJldHVybnMge0dyYW1tYXJ9IFRoZSBuZXcgZ3JhbW1hciBvYmplY3QuXG5cdFx0XHQgKiBAcHVibGljXG5cdFx0XHQgKi9cblx0XHRcdGluc2VydEJlZm9yZTogZnVuY3Rpb24gKGluc2lkZSwgYmVmb3JlLCBpbnNlcnQsIHJvb3QpIHtcblx0XHRcdFx0cm9vdCA9IHJvb3QgfHwgLyoqIEB0eXBlIHthbnl9ICovIChfLmxhbmd1YWdlcyk7XG5cdFx0XHRcdHZhciBncmFtbWFyID0gcm9vdFtpbnNpZGVdO1xuXHRcdFx0XHQvKiogQHR5cGUge0dyYW1tYXJ9ICovXG5cdFx0XHRcdHZhciByZXQgPSB7fTtcblxuXHRcdFx0XHRmb3IgKHZhciB0b2tlbiBpbiBncmFtbWFyKSB7XG5cdFx0XHRcdFx0aWYgKGdyYW1tYXIuaGFzT3duUHJvcGVydHkodG9rZW4pKSB7XG5cblx0XHRcdFx0XHRcdGlmICh0b2tlbiA9PSBiZWZvcmUpIHtcblx0XHRcdFx0XHRcdFx0Zm9yICh2YXIgbmV3VG9rZW4gaW4gaW5zZXJ0KSB7XG5cdFx0XHRcdFx0XHRcdFx0aWYgKGluc2VydC5oYXNPd25Qcm9wZXJ0eShuZXdUb2tlbikpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHJldFtuZXdUb2tlbl0gPSBpbnNlcnRbbmV3VG9rZW5dO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQvLyBEbyBub3QgaW5zZXJ0IHRva2VuIHdoaWNoIGFsc28gb2NjdXIgaW4gaW5zZXJ0LiBTZWUgIzE1MjVcblx0XHRcdFx0XHRcdGlmICghaW5zZXJ0Lmhhc093blByb3BlcnR5KHRva2VuKSkge1xuXHRcdFx0XHRcdFx0XHRyZXRbdG9rZW5dID0gZ3JhbW1hclt0b2tlbl07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIG9sZCA9IHJvb3RbaW5zaWRlXTtcblx0XHRcdFx0cm9vdFtpbnNpZGVdID0gcmV0O1xuXG5cdFx0XHRcdC8vIFVwZGF0ZSByZWZlcmVuY2VzIGluIG90aGVyIGxhbmd1YWdlIGRlZmluaXRpb25zXG5cdFx0XHRcdF8ubGFuZ3VhZ2VzLkRGUyhfLmxhbmd1YWdlcywgZnVuY3Rpb24gKGtleSwgdmFsdWUpIHtcblx0XHRcdFx0XHRpZiAodmFsdWUgPT09IG9sZCAmJiBrZXkgIT0gaW5zaWRlKSB7XG5cdFx0XHRcdFx0XHR0aGlzW2tleV0gPSByZXQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblxuXHRcdFx0XHRyZXR1cm4gcmV0O1xuXHRcdFx0fSxcblxuXHRcdFx0Ly8gVHJhdmVyc2UgYSBsYW5ndWFnZSBkZWZpbml0aW9uIHdpdGggRGVwdGggRmlyc3QgU2VhcmNoXG5cdFx0XHRERlM6IGZ1bmN0aW9uIERGUyhvLCBjYWxsYmFjaywgdHlwZSwgdmlzaXRlZCkge1xuXHRcdFx0XHR2aXNpdGVkID0gdmlzaXRlZCB8fCB7fTtcblxuXHRcdFx0XHR2YXIgb2JqSWQgPSBfLnV0aWwub2JqSWQ7XG5cblx0XHRcdFx0Zm9yICh2YXIgaSBpbiBvKSB7XG5cdFx0XHRcdFx0aWYgKG8uaGFzT3duUHJvcGVydHkoaSkpIHtcblx0XHRcdFx0XHRcdGNhbGxiYWNrLmNhbGwobywgaSwgb1tpXSwgdHlwZSB8fCBpKTtcblxuXHRcdFx0XHRcdFx0dmFyIHByb3BlcnR5ID0gb1tpXTtcblx0XHRcdFx0XHRcdHZhciBwcm9wZXJ0eVR5cGUgPSBfLnV0aWwudHlwZShwcm9wZXJ0eSk7XG5cblx0XHRcdFx0XHRcdGlmIChwcm9wZXJ0eVR5cGUgPT09ICdPYmplY3QnICYmICF2aXNpdGVkW29iaklkKHByb3BlcnR5KV0pIHtcblx0XHRcdFx0XHRcdFx0dmlzaXRlZFtvYmpJZChwcm9wZXJ0eSldID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0REZTKHByb3BlcnR5LCBjYWxsYmFjaywgbnVsbCwgdmlzaXRlZCk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKHByb3BlcnR5VHlwZSA9PT0gJ0FycmF5JyAmJiAhdmlzaXRlZFtvYmpJZChwcm9wZXJ0eSldKSB7XG5cdFx0XHRcdFx0XHRcdHZpc2l0ZWRbb2JqSWQocHJvcGVydHkpXSA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdERGUyhwcm9wZXJ0eSwgY2FsbGJhY2ssIGksIHZpc2l0ZWQpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRwbHVnaW5zOiB7fSxcblxuXHRcdC8qKlxuXHRcdCAqIFRoaXMgaXMgdGhlIG1vc3QgaGlnaC1sZXZlbCBmdW5jdGlvbiBpbiBQcmlzbeKAmXMgQVBJLlxuXHRcdCAqIEl0IGZldGNoZXMgYWxsIHRoZSBlbGVtZW50cyB0aGF0IGhhdmUgYSBgLmxhbmd1YWdlLXh4eHhgIGNsYXNzIGFuZCB0aGVuIGNhbGxzIHtAbGluayBQcmlzbS5oaWdobGlnaHRFbGVtZW50fSBvblxuXHRcdCAqIGVhY2ggb25lIG9mIHRoZW0uXG5cdFx0ICpcblx0XHQgKiBUaGlzIGlzIGVxdWl2YWxlbnQgdG8gYFByaXNtLmhpZ2hsaWdodEFsbFVuZGVyKGRvY3VtZW50LCBhc3luYywgY2FsbGJhY2spYC5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FzeW5jPWZhbHNlXSBTYW1lIGFzIGluIHtAbGluayBQcmlzbS5oaWdobGlnaHRBbGxVbmRlcn0uXG5cdFx0ICogQHBhcmFtIHtIaWdobGlnaHRDYWxsYmFja30gW2NhbGxiYWNrXSBTYW1lIGFzIGluIHtAbGluayBQcmlzbS5oaWdobGlnaHRBbGxVbmRlcn0uXG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdGhpZ2hsaWdodEFsbDogZnVuY3Rpb24gKGFzeW5jLCBjYWxsYmFjaykge1xuXHRcdFx0Xy5oaWdobGlnaHRBbGxVbmRlcihkb2N1bWVudCwgYXN5bmMsIGNhbGxiYWNrKTtcblx0XHR9LFxuXG5cdFx0LyoqXG5cdFx0ICogRmV0Y2hlcyBhbGwgdGhlIGRlc2NlbmRhbnRzIG9mIGBjb250YWluZXJgIHRoYXQgaGF2ZSBhIGAubGFuZ3VhZ2UteHh4eGAgY2xhc3MgYW5kIHRoZW4gY2FsbHNcblx0XHQgKiB7QGxpbmsgUHJpc20uaGlnaGxpZ2h0RWxlbWVudH0gb24gZWFjaCBvbmUgb2YgdGhlbS5cblx0XHQgKlxuXHRcdCAqIFRoZSBmb2xsb3dpbmcgaG9va3Mgd2lsbCBiZSBydW46XG5cdFx0ICogMS4gYGJlZm9yZS1oaWdobGlnaHRhbGxgXG5cdFx0ICogMi4gYGJlZm9yZS1hbGwtZWxlbWVudHMtaGlnaGxpZ2h0YFxuXHRcdCAqIDMuIEFsbCBob29rcyBvZiB7QGxpbmsgUHJpc20uaGlnaGxpZ2h0RWxlbWVudH0gZm9yIGVhY2ggZWxlbWVudC5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7UGFyZW50Tm9kZX0gY29udGFpbmVyIFRoZSByb290IGVsZW1lbnQsIHdob3NlIGRlc2NlbmRhbnRzIHRoYXQgaGF2ZSBhIGAubGFuZ3VhZ2UteHh4eGAgY2xhc3Mgd2lsbCBiZSBoaWdobGlnaHRlZC5cblx0XHQgKiBAcGFyYW0ge2Jvb2xlYW59IFthc3luYz1mYWxzZV0gV2hldGhlciBlYWNoIGVsZW1lbnQgaXMgdG8gYmUgaGlnaGxpZ2h0ZWQgYXN5bmNocm9ub3VzbHkgdXNpbmcgV2ViIFdvcmtlcnMuXG5cdFx0ICogQHBhcmFtIHtIaWdobGlnaHRDYWxsYmFja30gW2NhbGxiYWNrXSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBiZSBpbnZva2VkIG9uIGVhY2ggZWxlbWVudCBhZnRlciBpdHMgaGlnaGxpZ2h0aW5nIGlzIGRvbmUuXG5cdFx0ICogQG1lbWJlcm9mIFByaXNtXG5cdFx0ICogQHB1YmxpY1xuXHRcdCAqL1xuXHRcdGhpZ2hsaWdodEFsbFVuZGVyOiBmdW5jdGlvbiAoY29udGFpbmVyLCBhc3luYywgY2FsbGJhY2spIHtcblx0XHRcdHZhciBlbnYgPSB7XG5cdFx0XHRcdGNhbGxiYWNrOiBjYWxsYmFjayxcblx0XHRcdFx0Y29udGFpbmVyOiBjb250YWluZXIsXG5cdFx0XHRcdHNlbGVjdG9yOiAnY29kZVtjbGFzcyo9XCJsYW5ndWFnZS1cIl0sIFtjbGFzcyo9XCJsYW5ndWFnZS1cIl0gY29kZSwgY29kZVtjbGFzcyo9XCJsYW5nLVwiXSwgW2NsYXNzKj1cImxhbmctXCJdIGNvZGUnXG5cdFx0XHR9O1xuXG5cdFx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLWhpZ2hsaWdodGFsbCcsIGVudik7XG5cblx0XHRcdGVudi5lbGVtZW50cyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5hcHBseShlbnYuY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoZW52LnNlbGVjdG9yKSk7XG5cblx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtYWxsLWVsZW1lbnRzLWhpZ2hsaWdodCcsIGVudik7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwLCBlbGVtZW50OyAoZWxlbWVudCA9IGVudi5lbGVtZW50c1tpKytdKTspIHtcblx0XHRcdFx0Xy5oaWdobGlnaHRFbGVtZW50KGVsZW1lbnQsIGFzeW5jID09PSB0cnVlLCBlbnYuY2FsbGJhY2spO1xuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHQvKipcblx0XHQgKiBIaWdobGlnaHRzIHRoZSBjb2RlIGluc2lkZSBhIHNpbmdsZSBlbGVtZW50LlxuXHRcdCAqXG5cdFx0ICogVGhlIGZvbGxvd2luZyBob29rcyB3aWxsIGJlIHJ1bjpcblx0XHQgKiAxLiBgYmVmb3JlLXNhbml0eS1jaGVja2Bcblx0XHQgKiAyLiBgYmVmb3JlLWhpZ2hsaWdodGBcblx0XHQgKiAzLiBBbGwgaG9va3Mgb2Yge0BsaW5rIFByaXNtLmhpZ2hsaWdodH0uIFRoZXNlIGhvb2tzIHdpbGwgYmUgcnVuIGJ5IGFuIGFzeW5jaHJvbm91cyB3b3JrZXIgaWYgYGFzeW5jYCBpcyBgdHJ1ZWAuXG5cdFx0ICogNC4gYGJlZm9yZS1pbnNlcnRgXG5cdFx0ICogNS4gYGFmdGVyLWhpZ2hsaWdodGBcblx0XHQgKiA2LiBgY29tcGxldGVgXG5cdFx0ICpcblx0XHQgKiBTb21lIHRoZSBhYm92ZSBob29rcyB3aWxsIGJlIHNraXBwZWQgaWYgdGhlIGVsZW1lbnQgZG9lc24ndCBjb250YWluIGFueSB0ZXh0IG9yIHRoZXJlIGlzIG5vIGdyYW1tYXIgbG9hZGVkIGZvclxuXHRcdCAqIHRoZSBlbGVtZW50J3MgbGFuZ3VhZ2UuXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgY29udGFpbmluZyB0aGUgY29kZS5cblx0XHQgKiBJdCBtdXN0IGhhdmUgYSBjbGFzcyBvZiBgbGFuZ3VhZ2UteHh4eGAgdG8gYmUgcHJvY2Vzc2VkLCB3aGVyZSBgeHh4eGAgaXMgYSB2YWxpZCBsYW5ndWFnZSBpZGVudGlmaWVyLlxuXHRcdCAqIEBwYXJhbSB7Ym9vbGVhbn0gW2FzeW5jPWZhbHNlXSBXaGV0aGVyIHRoZSBlbGVtZW50IGlzIHRvIGJlIGhpZ2hsaWdodGVkIGFzeW5jaHJvbm91c2x5IHVzaW5nIFdlYiBXb3JrZXJzXG5cdFx0ICogdG8gaW1wcm92ZSBwZXJmb3JtYW5jZSBhbmQgYXZvaWQgYmxvY2tpbmcgdGhlIFVJIHdoZW4gaGlnaGxpZ2h0aW5nIHZlcnkgbGFyZ2UgY2h1bmtzIG9mIGNvZGUuIFRoaXMgb3B0aW9uIGlzXG5cdFx0ICogW2Rpc2FibGVkIGJ5IGRlZmF1bHRdKGh0dHBzOi8vcHJpc21qcy5jb20vZmFxLmh0bWwjd2h5LWlzLWFzeW5jaHJvbm91cy1oaWdobGlnaHRpbmctZGlzYWJsZWQtYnktZGVmYXVsdCkuXG5cdFx0ICpcblx0XHQgKiBOb3RlOiBBbGwgbGFuZ3VhZ2UgZGVmaW5pdGlvbnMgcmVxdWlyZWQgdG8gaGlnaGxpZ2h0IHRoZSBjb2RlIG11c3QgYmUgaW5jbHVkZWQgaW4gdGhlIG1haW4gYHByaXNtLmpzYCBmaWxlIGZvclxuXHRcdCAqIGFzeW5jaHJvbm91cyBoaWdobGlnaHRpbmcgdG8gd29yay4gWW91IGNhbiBidWlsZCB5b3VyIG93biBidW5kbGUgb24gdGhlXG5cdFx0ICogW0Rvd25sb2FkIHBhZ2VdKGh0dHBzOi8vcHJpc21qcy5jb20vZG93bmxvYWQuaHRtbCkuXG5cdFx0ICogQHBhcmFtIHtIaWdobGlnaHRDYWxsYmFja30gW2NhbGxiYWNrXSBBbiBvcHRpb25hbCBjYWxsYmFjayB0byBiZSBpbnZva2VkIGFmdGVyIHRoZSBoaWdobGlnaHRpbmcgaXMgZG9uZS5cblx0XHQgKiBNb3N0bHkgdXNlZnVsIHdoZW4gYGFzeW5jYCBpcyBgdHJ1ZWAsIHNpbmNlIGluIHRoYXQgY2FzZSwgdGhlIGhpZ2hsaWdodGluZyBpcyBkb25lIGFzeW5jaHJvbm91c2x5LlxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHRoaWdobGlnaHRFbGVtZW50OiBmdW5jdGlvbiAoZWxlbWVudCwgYXN5bmMsIGNhbGxiYWNrKSB7XG5cdFx0XHQvLyBGaW5kIGxhbmd1YWdlXG5cdFx0XHR2YXIgbGFuZ3VhZ2UgPSBfLnV0aWwuZ2V0TGFuZ3VhZ2UoZWxlbWVudCk7XG5cdFx0XHR2YXIgZ3JhbW1hciA9IF8ubGFuZ3VhZ2VzW2xhbmd1YWdlXTtcblxuXHRcdFx0Ly8gU2V0IGxhbmd1YWdlIG9uIHRoZSBlbGVtZW50LCBpZiBub3QgcHJlc2VudFxuXHRcdFx0Xy51dGlsLnNldExhbmd1YWdlKGVsZW1lbnQsIGxhbmd1YWdlKTtcblxuXHRcdFx0Ly8gU2V0IGxhbmd1YWdlIG9uIHRoZSBwYXJlbnQsIGZvciBzdHlsaW5nXG5cdFx0XHR2YXIgcGFyZW50ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuXHRcdFx0aWYgKHBhcmVudCAmJiBwYXJlbnQubm9kZU5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3ByZScpIHtcblx0XHRcdFx0Xy51dGlsLnNldExhbmd1YWdlKHBhcmVudCwgbGFuZ3VhZ2UpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgY29kZSA9IGVsZW1lbnQudGV4dENvbnRlbnQ7XG5cblx0XHRcdHZhciBlbnYgPSB7XG5cdFx0XHRcdGVsZW1lbnQ6IGVsZW1lbnQsXG5cdFx0XHRcdGxhbmd1YWdlOiBsYW5ndWFnZSxcblx0XHRcdFx0Z3JhbW1hcjogZ3JhbW1hcixcblx0XHRcdFx0Y29kZTogY29kZVxuXHRcdFx0fTtcblxuXHRcdFx0ZnVuY3Rpb24gaW5zZXJ0SGlnaGxpZ2h0ZWRDb2RlKGhpZ2hsaWdodGVkQ29kZSkge1xuXHRcdFx0XHRlbnYuaGlnaGxpZ2h0ZWRDb2RlID0gaGlnaGxpZ2h0ZWRDb2RlO1xuXG5cdFx0XHRcdF8uaG9va3MucnVuKCdiZWZvcmUtaW5zZXJ0JywgZW52KTtcblxuXHRcdFx0XHRlbnYuZWxlbWVudC5pbm5lckhUTUwgPSBlbnYuaGlnaGxpZ2h0ZWRDb2RlO1xuXG5cdFx0XHRcdF8uaG9va3MucnVuKCdhZnRlci1oaWdobGlnaHQnLCBlbnYpO1xuXHRcdFx0XHRfLmhvb2tzLnJ1bignY29tcGxldGUnLCBlbnYpO1xuXHRcdFx0XHRjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKGVudi5lbGVtZW50KTtcblx0XHRcdH1cblxuXHRcdFx0Xy5ob29rcy5ydW4oJ2JlZm9yZS1zYW5pdHktY2hlY2snLCBlbnYpO1xuXG5cdFx0XHQvLyBwbHVnaW5zIG1heSBjaGFuZ2UvYWRkIHRoZSBwYXJlbnQvZWxlbWVudFxuXHRcdFx0cGFyZW50ID0gZW52LmVsZW1lbnQucGFyZW50RWxlbWVudDtcblx0XHRcdGlmIChwYXJlbnQgJiYgcGFyZW50Lm5vZGVOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdwcmUnICYmICFwYXJlbnQuaGFzQXR0cmlidXRlKCd0YWJpbmRleCcpKSB7XG5cdFx0XHRcdHBhcmVudC5zZXRBdHRyaWJ1dGUoJ3RhYmluZGV4JywgJzAnKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFlbnYuY29kZSkge1xuXHRcdFx0XHRfLmhvb2tzLnJ1bignY29tcGxldGUnLCBlbnYpO1xuXHRcdFx0XHRjYWxsYmFjayAmJiBjYWxsYmFjay5jYWxsKGVudi5lbGVtZW50KTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLWhpZ2hsaWdodCcsIGVudik7XG5cblx0XHRcdGlmICghZW52LmdyYW1tYXIpIHtcblx0XHRcdFx0aW5zZXJ0SGlnaGxpZ2h0ZWRDb2RlKF8udXRpbC5lbmNvZGUoZW52LmNvZGUpKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoYXN5bmMgJiYgX3NlbGYuV29ya2VyKSB7XG5cdFx0XHRcdHZhciB3b3JrZXIgPSBuZXcgV29ya2VyKF8uZmlsZW5hbWUpO1xuXG5cdFx0XHRcdHdvcmtlci5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZXZ0KSB7XG5cdFx0XHRcdFx0aW5zZXJ0SGlnaGxpZ2h0ZWRDb2RlKGV2dC5kYXRhKTtcblx0XHRcdFx0fTtcblxuXHRcdFx0XHR3b3JrZXIucG9zdE1lc3NhZ2UoSlNPTi5zdHJpbmdpZnkoe1xuXHRcdFx0XHRcdGxhbmd1YWdlOiBlbnYubGFuZ3VhZ2UsXG5cdFx0XHRcdFx0Y29kZTogZW52LmNvZGUsXG5cdFx0XHRcdFx0aW1tZWRpYXRlQ2xvc2U6IHRydWVcblx0XHRcdFx0fSkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0aW5zZXJ0SGlnaGxpZ2h0ZWRDb2RlKF8uaGlnaGxpZ2h0KGVudi5jb2RlLCBlbnYuZ3JhbW1hciwgZW52Lmxhbmd1YWdlKSk7XG5cdFx0XHR9XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIExvdy1sZXZlbCBmdW5jdGlvbiwgb25seSB1c2UgaWYgeW91IGtub3cgd2hhdCB5b3XigJlyZSBkb2luZy4gSXQgYWNjZXB0cyBhIHN0cmluZyBvZiB0ZXh0IGFzIGlucHV0XG5cdFx0ICogYW5kIHRoZSBsYW5ndWFnZSBkZWZpbml0aW9ucyB0byB1c2UsIGFuZCByZXR1cm5zIGEgc3RyaW5nIHdpdGggdGhlIEhUTUwgcHJvZHVjZWQuXG5cdFx0ICpcblx0XHQgKiBUaGUgZm9sbG93aW5nIGhvb2tzIHdpbGwgYmUgcnVuOlxuXHRcdCAqIDEuIGBiZWZvcmUtdG9rZW5pemVgXG5cdFx0ICogMi4gYGFmdGVyLXRva2VuaXplYFxuXHRcdCAqIDMuIGB3cmFwYDogT24gZWFjaCB7QGxpbmsgVG9rZW59LlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtzdHJpbmd9IHRleHQgQSBzdHJpbmcgd2l0aCB0aGUgY29kZSB0byBiZSBoaWdobGlnaHRlZC5cblx0XHQgKiBAcGFyYW0ge0dyYW1tYXJ9IGdyYW1tYXIgQW4gb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHRva2VucyB0byB1c2UuXG5cdFx0ICpcblx0XHQgKiBVc3VhbGx5IGEgbGFuZ3VhZ2UgZGVmaW5pdGlvbiBsaWtlIGBQcmlzbS5sYW5ndWFnZXMubWFya3VwYC5cblx0XHQgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ3VhZ2UgVGhlIG5hbWUgb2YgdGhlIGxhbmd1YWdlIGRlZmluaXRpb24gcGFzc2VkIHRvIGBncmFtbWFyYC5cblx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgaGlnaGxpZ2h0ZWQgSFRNTC5cblx0XHQgKiBAbWVtYmVyb2YgUHJpc21cblx0XHQgKiBAcHVibGljXG5cdFx0ICogQGV4YW1wbGVcblx0XHQgKiBQcmlzbS5oaWdobGlnaHQoJ3ZhciBmb28gPSB0cnVlOycsIFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0LCAnamF2YXNjcmlwdCcpO1xuXHRcdCAqL1xuXHRcdGhpZ2hsaWdodDogZnVuY3Rpb24gKHRleHQsIGdyYW1tYXIsIGxhbmd1YWdlKSB7XG5cdFx0XHR2YXIgZW52ID0ge1xuXHRcdFx0XHRjb2RlOiB0ZXh0LFxuXHRcdFx0XHRncmFtbWFyOiBncmFtbWFyLFxuXHRcdFx0XHRsYW5ndWFnZTogbGFuZ3VhZ2Vcblx0XHRcdH07XG5cdFx0XHRfLmhvb2tzLnJ1bignYmVmb3JlLXRva2VuaXplJywgZW52KTtcblx0XHRcdGlmICghZW52LmdyYW1tYXIpIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdUaGUgbGFuZ3VhZ2UgXCInICsgZW52Lmxhbmd1YWdlICsgJ1wiIGhhcyBubyBncmFtbWFyLicpO1xuXHRcdFx0fVxuXHRcdFx0ZW52LnRva2VucyA9IF8udG9rZW5pemUoZW52LmNvZGUsIGVudi5ncmFtbWFyKTtcblx0XHRcdF8uaG9va3MucnVuKCdhZnRlci10b2tlbml6ZScsIGVudik7XG5cdFx0XHRyZXR1cm4gVG9rZW4uc3RyaW5naWZ5KF8udXRpbC5lbmNvZGUoZW52LnRva2VucyksIGVudi5sYW5ndWFnZSk7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIFRoaXMgaXMgdGhlIGhlYXJ0IG9mIFByaXNtLCBhbmQgdGhlIG1vc3QgbG93LWxldmVsIGZ1bmN0aW9uIHlvdSBjYW4gdXNlLiBJdCBhY2NlcHRzIGEgc3RyaW5nIG9mIHRleHQgYXMgaW5wdXRcblx0XHQgKiBhbmQgdGhlIGxhbmd1YWdlIGRlZmluaXRpb25zIHRvIHVzZSwgYW5kIHJldHVybnMgYW4gYXJyYXkgd2l0aCB0aGUgdG9rZW5pemVkIGNvZGUuXG5cdFx0ICpcblx0XHQgKiBXaGVuIHRoZSBsYW5ndWFnZSBkZWZpbml0aW9uIGluY2x1ZGVzIG5lc3RlZCB0b2tlbnMsIHRoZSBmdW5jdGlvbiBpcyBjYWxsZWQgcmVjdXJzaXZlbHkgb24gZWFjaCBvZiB0aGVzZSB0b2tlbnMuXG5cdFx0ICpcblx0XHQgKiBUaGlzIG1ldGhvZCBjb3VsZCBiZSB1c2VmdWwgaW4gb3RoZXIgY29udGV4dHMgYXMgd2VsbCwgYXMgYSB2ZXJ5IGNydWRlIHBhcnNlci5cblx0XHQgKlxuXHRcdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IEEgc3RyaW5nIHdpdGggdGhlIGNvZGUgdG8gYmUgaGlnaGxpZ2h0ZWQuXG5cdFx0ICogQHBhcmFtIHtHcmFtbWFyfSBncmFtbWFyIEFuIG9iamVjdCBjb250YWluaW5nIHRoZSB0b2tlbnMgdG8gdXNlLlxuXHRcdCAqXG5cdFx0ICogVXN1YWxseSBhIGxhbmd1YWdlIGRlZmluaXRpb24gbGlrZSBgUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cGAuXG5cdFx0ICogQHJldHVybnMge1Rva2VuU3RyZWFtfSBBbiBhcnJheSBvZiBzdHJpbmdzIGFuZCB0b2tlbnMsIGEgdG9rZW4gc3RyZWFtLlxuXHRcdCAqIEBtZW1iZXJvZiBQcmlzbVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKiBAZXhhbXBsZVxuXHRcdCAqIGxldCBjb2RlID0gYHZhciBmb28gPSAwO2A7XG5cdFx0ICogbGV0IHRva2VucyA9IFByaXNtLnRva2VuaXplKGNvZGUsIFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0KTtcblx0XHQgKiB0b2tlbnMuZm9yRWFjaCh0b2tlbiA9PiB7XG5cdFx0ICogICAgIGlmICh0b2tlbiBpbnN0YW5jZW9mIFByaXNtLlRva2VuICYmIHRva2VuLnR5cGUgPT09ICdudW1iZXInKSB7XG5cdFx0ICogICAgICAgICBjb25zb2xlLmxvZyhgRm91bmQgbnVtZXJpYyBsaXRlcmFsOiAke3Rva2VuLmNvbnRlbnR9YCk7XG5cdFx0ICogICAgIH1cblx0XHQgKiB9KTtcblx0XHQgKi9cblx0XHR0b2tlbml6ZTogZnVuY3Rpb24gKHRleHQsIGdyYW1tYXIpIHtcblx0XHRcdHZhciByZXN0ID0gZ3JhbW1hci5yZXN0O1xuXHRcdFx0aWYgKHJlc3QpIHtcblx0XHRcdFx0Zm9yICh2YXIgdG9rZW4gaW4gcmVzdCkge1xuXHRcdFx0XHRcdGdyYW1tYXJbdG9rZW5dID0gcmVzdFt0b2tlbl07XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRkZWxldGUgZ3JhbW1hci5yZXN0O1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgdG9rZW5MaXN0ID0gbmV3IExpbmtlZExpc3QoKTtcblx0XHRcdGFkZEFmdGVyKHRva2VuTGlzdCwgdG9rZW5MaXN0LmhlYWQsIHRleHQpO1xuXG5cdFx0XHRtYXRjaEdyYW1tYXIodGV4dCwgdG9rZW5MaXN0LCBncmFtbWFyLCB0b2tlbkxpc3QuaGVhZCwgMCk7XG5cblx0XHRcdHJldHVybiB0b0FycmF5KHRva2VuTGlzdCk7XG5cdFx0fSxcblxuXHRcdC8qKlxuXHRcdCAqIEBuYW1lc3BhY2Vcblx0XHQgKiBAbWVtYmVyb2YgUHJpc21cblx0XHQgKiBAcHVibGljXG5cdFx0ICovXG5cdFx0aG9va3M6IHtcblx0XHRcdGFsbDoge30sXG5cblx0XHRcdC8qKlxuXHRcdFx0ICogQWRkcyB0aGUgZ2l2ZW4gY2FsbGJhY2sgdG8gdGhlIGxpc3Qgb2YgY2FsbGJhY2tzIGZvciB0aGUgZ2l2ZW4gaG9vay5cblx0XHRcdCAqXG5cdFx0XHQgKiBUaGUgY2FsbGJhY2sgd2lsbCBiZSBpbnZva2VkIHdoZW4gdGhlIGhvb2sgaXQgaXMgcmVnaXN0ZXJlZCBmb3IgaXMgcnVuLlxuXHRcdFx0ICogSG9va3MgYXJlIHVzdWFsbHkgZGlyZWN0bHkgcnVuIGJ5IGEgaGlnaGxpZ2h0IGZ1bmN0aW9uIGJ1dCB5b3UgY2FuIGFsc28gcnVuIGhvb2tzIHlvdXJzZWxmLlxuXHRcdFx0ICpcblx0XHRcdCAqIE9uZSBjYWxsYmFjayBmdW5jdGlvbiBjYW4gYmUgcmVnaXN0ZXJlZCB0byBtdWx0aXBsZSBob29rcyBhbmQgdGhlIHNhbWUgaG9vayBtdWx0aXBsZSB0aW1lcy5cblx0XHRcdCAqXG5cdFx0XHQgKiBAcGFyYW0ge3N0cmluZ30gbmFtZSBUaGUgbmFtZSBvZiB0aGUgaG9vay5cblx0XHRcdCAqIEBwYXJhbSB7SG9va0NhbGxiYWNrfSBjYWxsYmFjayBUaGUgY2FsbGJhY2sgZnVuY3Rpb24gd2hpY2ggaXMgZ2l2ZW4gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuXHRcdFx0ICogQHB1YmxpY1xuXHRcdFx0ICovXG5cdFx0XHRhZGQ6IGZ1bmN0aW9uIChuYW1lLCBjYWxsYmFjaykge1xuXHRcdFx0XHR2YXIgaG9va3MgPSBfLmhvb2tzLmFsbDtcblxuXHRcdFx0XHRob29rc1tuYW1lXSA9IGhvb2tzW25hbWVdIHx8IFtdO1xuXG5cdFx0XHRcdGhvb2tzW25hbWVdLnB1c2goY2FsbGJhY2spO1xuXHRcdFx0fSxcblxuXHRcdFx0LyoqXG5cdFx0XHQgKiBSdW5zIGEgaG9vayBpbnZva2luZyBhbGwgcmVnaXN0ZXJlZCBjYWxsYmFja3Mgd2l0aCB0aGUgZ2l2ZW4gZW52aXJvbm1lbnQgdmFyaWFibGVzLlxuXHRcdFx0ICpcblx0XHRcdCAqIENhbGxiYWNrcyB3aWxsIGJlIGludm9rZWQgc3luY2hyb25vdXNseSBhbmQgaW4gdGhlIG9yZGVyIGluIHdoaWNoIHRoZXkgd2VyZSByZWdpc3RlcmVkLlxuXHRcdFx0ICpcblx0XHRcdCAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBob29rLlxuXHRcdFx0ICogQHBhcmFtIHtPYmplY3Q8c3RyaW5nLCBhbnk+fSBlbnYgVGhlIGVudmlyb25tZW50IHZhcmlhYmxlcyBvZiB0aGUgaG9vayBwYXNzZWQgdG8gYWxsIGNhbGxiYWNrcyByZWdpc3RlcmVkLlxuXHRcdFx0ICogQHB1YmxpY1xuXHRcdFx0ICovXG5cdFx0XHRydW46IGZ1bmN0aW9uIChuYW1lLCBlbnYpIHtcblx0XHRcdFx0dmFyIGNhbGxiYWNrcyA9IF8uaG9va3MuYWxsW25hbWVdO1xuXG5cdFx0XHRcdGlmICghY2FsbGJhY2tzIHx8ICFjYWxsYmFja3MubGVuZ3RoKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIGNhbGxiYWNrOyAoY2FsbGJhY2sgPSBjYWxsYmFja3NbaSsrXSk7KSB7XG5cdFx0XHRcdFx0Y2FsbGJhY2soZW52KTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0sXG5cblx0XHRUb2tlbjogVG9rZW5cblx0fTtcblx0X3NlbGYuUHJpc20gPSBfO1xuXG5cblx0Ly8gVHlwZXNjcmlwdCBub3RlOlxuXHQvLyBUaGUgZm9sbG93aW5nIGNhbiBiZSB1c2VkIHRvIGltcG9ydCB0aGUgVG9rZW4gdHlwZSBpbiBKU0RvYzpcblx0Ly9cblx0Ly8gICBAdHlwZWRlZiB7SW5zdGFuY2VUeXBlPGltcG9ydChcIi4vcHJpc20tY29yZVwiKVtcIlRva2VuXCJdPn0gVG9rZW5cblxuXHQvKipcblx0ICogQ3JlYXRlcyBhIG5ldyB0b2tlbi5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgU2VlIHtAbGluayBUb2tlbiN0eXBlIHR5cGV9XG5cdCAqIEBwYXJhbSB7c3RyaW5nIHwgVG9rZW5TdHJlYW19IGNvbnRlbnQgU2VlIHtAbGluayBUb2tlbiNjb250ZW50IGNvbnRlbnR9XG5cdCAqIEBwYXJhbSB7c3RyaW5nfHN0cmluZ1tdfSBbYWxpYXNdIFRoZSBhbGlhcyhlcykgb2YgdGhlIHRva2VuLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gW21hdGNoZWRTdHI9XCJcIl0gQSBjb3B5IG9mIHRoZSBmdWxsIHN0cmluZyB0aGlzIHRva2VuIHdhcyBjcmVhdGVkIGZyb20uXG5cdCAqIEBjbGFzc1xuXHQgKiBAZ2xvYmFsXG5cdCAqIEBwdWJsaWNcblx0ICovXG5cdGZ1bmN0aW9uIFRva2VuKHR5cGUsIGNvbnRlbnQsIGFsaWFzLCBtYXRjaGVkU3RyKSB7XG5cdFx0LyoqXG5cdFx0ICogVGhlIHR5cGUgb2YgdGhlIHRva2VuLlxuXHRcdCAqXG5cdFx0ICogVGhpcyBpcyB1c3VhbGx5IHRoZSBrZXkgb2YgYSBwYXR0ZXJuIGluIGEge0BsaW5rIEdyYW1tYXJ9LlxuXHRcdCAqXG5cdFx0ICogQHR5cGUge3N0cmluZ31cblx0XHQgKiBAc2VlIEdyYW1tYXJUb2tlblxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHR0aGlzLnR5cGUgPSB0eXBlO1xuXHRcdC8qKlxuXHRcdCAqIFRoZSBzdHJpbmdzIG9yIHRva2VucyBjb250YWluZWQgYnkgdGhpcyB0b2tlbi5cblx0XHQgKlxuXHRcdCAqIFRoaXMgd2lsbCBiZSBhIHRva2VuIHN0cmVhbSBpZiB0aGUgcGF0dGVybiBtYXRjaGVkIGFsc28gZGVmaW5lZCBhbiBgaW5zaWRlYCBncmFtbWFyLlxuXHRcdCAqXG5cdFx0ICogQHR5cGUge3N0cmluZyB8IFRva2VuU3RyZWFtfVxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHR0aGlzLmNvbnRlbnQgPSBjb250ZW50O1xuXHRcdC8qKlxuXHRcdCAqIFRoZSBhbGlhcyhlcykgb2YgdGhlIHRva2VuLlxuXHRcdCAqXG5cdFx0ICogQHR5cGUge3N0cmluZ3xzdHJpbmdbXX1cblx0XHQgKiBAc2VlIEdyYW1tYXJUb2tlblxuXHRcdCAqIEBwdWJsaWNcblx0XHQgKi9cblx0XHR0aGlzLmFsaWFzID0gYWxpYXM7XG5cdFx0Ly8gQ29weSBvZiB0aGUgZnVsbCBzdHJpbmcgdGhpcyB0b2tlbiB3YXMgY3JlYXRlZCBmcm9tXG5cdFx0dGhpcy5sZW5ndGggPSAobWF0Y2hlZFN0ciB8fCAnJykubGVuZ3RoIHwgMDtcblx0fVxuXG5cdC8qKlxuXHQgKiBBIHRva2VuIHN0cmVhbSBpcyBhbiBhcnJheSBvZiBzdHJpbmdzIGFuZCB7QGxpbmsgVG9rZW4gVG9rZW59IG9iamVjdHMuXG5cdCAqXG5cdCAqIFRva2VuIHN0cmVhbXMgaGF2ZSB0byBmdWxmaWxsIGEgZmV3IHByb3BlcnRpZXMgdGhhdCBhcmUgYXNzdW1lZCBieSBtb3N0IGZ1bmN0aW9ucyAobW9zdGx5IGludGVybmFsIG9uZXMpIHRoYXQgcHJvY2Vzc1xuXHQgKiB0aGVtLlxuXHQgKlxuXHQgKiAxLiBObyBhZGphY2VudCBzdHJpbmdzLlxuXHQgKiAyLiBObyBlbXB0eSBzdHJpbmdzLlxuXHQgKlxuXHQgKiAgICBUaGUgb25seSBleGNlcHRpb24gaGVyZSBpcyB0aGUgdG9rZW4gc3RyZWFtIHRoYXQgb25seSBjb250YWlucyB0aGUgZW1wdHkgc3RyaW5nIGFuZCBub3RoaW5nIGVsc2UuXG5cdCAqXG5cdCAqIEB0eXBlZGVmIHtBcnJheTxzdHJpbmcgfCBUb2tlbj59IFRva2VuU3RyZWFtXG5cdCAqIEBnbG9iYWxcblx0ICogQHB1YmxpY1xuXHQgKi9cblxuXHQvKipcblx0ICogQ29udmVydHMgdGhlIGdpdmVuIHRva2VuIG9yIHRva2VuIHN0cmVhbSB0byBhbiBIVE1MIHJlcHJlc2VudGF0aW9uLlxuXHQgKlxuXHQgKiBUaGUgZm9sbG93aW5nIGhvb2tzIHdpbGwgYmUgcnVuOlxuXHQgKiAxLiBgd3JhcGA6IE9uIGVhY2gge0BsaW5rIFRva2VufS5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmcgfCBUb2tlbiB8IFRva2VuU3RyZWFtfSBvIFRoZSB0b2tlbiBvciB0b2tlbiBzdHJlYW0gdG8gYmUgY29udmVydGVkLlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gbGFuZ3VhZ2UgVGhlIG5hbWUgb2YgY3VycmVudCBsYW5ndWFnZS5cblx0ICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgcmVwcmVzZW50YXRpb24gb2YgdGhlIHRva2VuIG9yIHRva2VuIHN0cmVhbS5cblx0ICogQG1lbWJlcm9mIFRva2VuXG5cdCAqIEBzdGF0aWNcblx0ICovXG5cdFRva2VuLnN0cmluZ2lmeSA9IGZ1bmN0aW9uIHN0cmluZ2lmeShvLCBsYW5ndWFnZSkge1xuXHRcdGlmICh0eXBlb2YgbyA9PSAnc3RyaW5nJykge1xuXHRcdFx0cmV0dXJuIG87XG5cdFx0fVxuXHRcdGlmIChBcnJheS5pc0FycmF5KG8pKSB7XG5cdFx0XHR2YXIgcyA9ICcnO1xuXHRcdFx0by5mb3JFYWNoKGZ1bmN0aW9uIChlKSB7XG5cdFx0XHRcdHMgKz0gc3RyaW5naWZ5KGUsIGxhbmd1YWdlKTtcblx0XHRcdH0pO1xuXHRcdFx0cmV0dXJuIHM7XG5cdFx0fVxuXG5cdFx0dmFyIGVudiA9IHtcblx0XHRcdHR5cGU6IG8udHlwZSxcblx0XHRcdGNvbnRlbnQ6IHN0cmluZ2lmeShvLmNvbnRlbnQsIGxhbmd1YWdlKSxcblx0XHRcdHRhZzogJ3NwYW4nLFxuXHRcdFx0Y2xhc3NlczogWyd0b2tlbicsIG8udHlwZV0sXG5cdFx0XHRhdHRyaWJ1dGVzOiB7fSxcblx0XHRcdGxhbmd1YWdlOiBsYW5ndWFnZVxuXHRcdH07XG5cblx0XHR2YXIgYWxpYXNlcyA9IG8uYWxpYXM7XG5cdFx0aWYgKGFsaWFzZXMpIHtcblx0XHRcdGlmIChBcnJheS5pc0FycmF5KGFsaWFzZXMpKSB7XG5cdFx0XHRcdEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGVudi5jbGFzc2VzLCBhbGlhc2VzKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGVudi5jbGFzc2VzLnB1c2goYWxpYXNlcyk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Xy5ob29rcy5ydW4oJ3dyYXAnLCBlbnYpO1xuXG5cdFx0dmFyIGF0dHJpYnV0ZXMgPSAnJztcblx0XHRmb3IgKHZhciBuYW1lIGluIGVudi5hdHRyaWJ1dGVzKSB7XG5cdFx0XHRhdHRyaWJ1dGVzICs9ICcgJyArIG5hbWUgKyAnPVwiJyArIChlbnYuYXR0cmlidXRlc1tuYW1lXSB8fCAnJykucmVwbGFjZSgvXCIvZywgJyZxdW90OycpICsgJ1wiJztcblx0XHR9XG5cblx0XHRyZXR1cm4gJzwnICsgZW52LnRhZyArICcgY2xhc3M9XCInICsgZW52LmNsYXNzZXMuam9pbignICcpICsgJ1wiJyArIGF0dHJpYnV0ZXMgKyAnPicgKyBlbnYuY29udGVudCArICc8LycgKyBlbnYudGFnICsgJz4nO1xuXHR9O1xuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge1JlZ0V4cH0gcGF0dGVyblxuXHQgKiBAcGFyYW0ge251bWJlcn0gcG9zXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG5cdCAqIEBwYXJhbSB7Ym9vbGVhbn0gbG9va2JlaGluZFxuXHQgKiBAcmV0dXJucyB7UmVnRXhwRXhlY0FycmF5IHwgbnVsbH1cblx0ICovXG5cdGZ1bmN0aW9uIG1hdGNoUGF0dGVybihwYXR0ZXJuLCBwb3MsIHRleHQsIGxvb2tiZWhpbmQpIHtcblx0XHRwYXR0ZXJuLmxhc3RJbmRleCA9IHBvcztcblx0XHR2YXIgbWF0Y2ggPSBwYXR0ZXJuLmV4ZWModGV4dCk7XG5cdFx0aWYgKG1hdGNoICYmIGxvb2tiZWhpbmQgJiYgbWF0Y2hbMV0pIHtcblx0XHRcdC8vIGNoYW5nZSB0aGUgbWF0Y2ggdG8gcmVtb3ZlIHRoZSB0ZXh0IG1hdGNoZWQgYnkgdGhlIFByaXNtIGxvb2tiZWhpbmQgZ3JvdXBcblx0XHRcdHZhciBsb29rYmVoaW5kTGVuZ3RoID0gbWF0Y2hbMV0ubGVuZ3RoO1xuXHRcdFx0bWF0Y2guaW5kZXggKz0gbG9va2JlaGluZExlbmd0aDtcblx0XHRcdG1hdGNoWzBdID0gbWF0Y2hbMF0uc2xpY2UobG9va2JlaGluZExlbmd0aCk7XG5cdFx0fVxuXHRcdHJldHVybiBtYXRjaDtcblx0fVxuXG5cdC8qKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuXHQgKiBAcGFyYW0ge0xpbmtlZExpc3Q8c3RyaW5nIHwgVG9rZW4+fSB0b2tlbkxpc3Rcblx0ICogQHBhcmFtIHthbnl9IGdyYW1tYXJcblx0ICogQHBhcmFtIHtMaW5rZWRMaXN0Tm9kZTxzdHJpbmcgfCBUb2tlbj59IHN0YXJ0Tm9kZVxuXHQgKiBAcGFyYW0ge251bWJlcn0gc3RhcnRQb3Ncblx0ICogQHBhcmFtIHtSZW1hdGNoT3B0aW9uc30gW3JlbWF0Y2hdXG5cdCAqIEByZXR1cm5zIHt2b2lkfVxuXHQgKiBAcHJpdmF0ZVxuXHQgKlxuXHQgKiBAdHlwZWRlZiBSZW1hdGNoT3B0aW9uc1xuXHQgKiBAcHJvcGVydHkge3N0cmluZ30gY2F1c2Vcblx0ICogQHByb3BlcnR5IHtudW1iZXJ9IHJlYWNoXG5cdCAqL1xuXHRmdW5jdGlvbiBtYXRjaEdyYW1tYXIodGV4dCwgdG9rZW5MaXN0LCBncmFtbWFyLCBzdGFydE5vZGUsIHN0YXJ0UG9zLCByZW1hdGNoKSB7XG5cdFx0Zm9yICh2YXIgdG9rZW4gaW4gZ3JhbW1hcikge1xuXHRcdFx0aWYgKCFncmFtbWFyLmhhc093blByb3BlcnR5KHRva2VuKSB8fCAhZ3JhbW1hclt0b2tlbl0pIHtcblx0XHRcdFx0Y29udGludWU7XG5cdFx0XHR9XG5cblx0XHRcdHZhciBwYXR0ZXJucyA9IGdyYW1tYXJbdG9rZW5dO1xuXHRcdFx0cGF0dGVybnMgPSBBcnJheS5pc0FycmF5KHBhdHRlcm5zKSA/IHBhdHRlcm5zIDogW3BhdHRlcm5zXTtcblxuXHRcdFx0Zm9yICh2YXIgaiA9IDA7IGogPCBwYXR0ZXJucy5sZW5ndGg7ICsraikge1xuXHRcdFx0XHRpZiAocmVtYXRjaCAmJiByZW1hdGNoLmNhdXNlID09IHRva2VuICsgJywnICsgaikge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBwYXR0ZXJuT2JqID0gcGF0dGVybnNbal07XG5cdFx0XHRcdHZhciBpbnNpZGUgPSBwYXR0ZXJuT2JqLmluc2lkZTtcblx0XHRcdFx0dmFyIGxvb2tiZWhpbmQgPSAhIXBhdHRlcm5PYmoubG9va2JlaGluZDtcblx0XHRcdFx0dmFyIGdyZWVkeSA9ICEhcGF0dGVybk9iai5ncmVlZHk7XG5cdFx0XHRcdHZhciBhbGlhcyA9IHBhdHRlcm5PYmouYWxpYXM7XG5cblx0XHRcdFx0aWYgKGdyZWVkeSAmJiAhcGF0dGVybk9iai5wYXR0ZXJuLmdsb2JhbCkge1xuXHRcdFx0XHRcdC8vIFdpdGhvdXQgdGhlIGdsb2JhbCBmbGFnLCBsYXN0SW5kZXggd29uJ3Qgd29ya1xuXHRcdFx0XHRcdHZhciBmbGFncyA9IHBhdHRlcm5PYmoucGF0dGVybi50b1N0cmluZygpLm1hdGNoKC9baW1zdXldKiQvKVswXTtcblx0XHRcdFx0XHRwYXR0ZXJuT2JqLnBhdHRlcm4gPSBSZWdFeHAocGF0dGVybk9iai5wYXR0ZXJuLnNvdXJjZSwgZmxhZ3MgKyAnZycpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0LyoqIEB0eXBlIHtSZWdFeHB9ICovXG5cdFx0XHRcdHZhciBwYXR0ZXJuID0gcGF0dGVybk9iai5wYXR0ZXJuIHx8IHBhdHRlcm5PYmo7XG5cblx0XHRcdFx0Zm9yICggLy8gaXRlcmF0ZSB0aGUgdG9rZW4gbGlzdCBhbmQga2VlcCB0cmFjayBvZiB0aGUgY3VycmVudCB0b2tlbi9zdHJpbmcgcG9zaXRpb25cblx0XHRcdFx0XHR2YXIgY3VycmVudE5vZGUgPSBzdGFydE5vZGUubmV4dCwgcG9zID0gc3RhcnRQb3M7XG5cdFx0XHRcdFx0Y3VycmVudE5vZGUgIT09IHRva2VuTGlzdC50YWlsO1xuXHRcdFx0XHRcdHBvcyArPSBjdXJyZW50Tm9kZS52YWx1ZS5sZW5ndGgsIGN1cnJlbnROb2RlID0gY3VycmVudE5vZGUubmV4dFxuXHRcdFx0XHQpIHtcblxuXHRcdFx0XHRcdGlmIChyZW1hdGNoICYmIHBvcyA+PSByZW1hdGNoLnJlYWNoKSB7XG5cdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR2YXIgc3RyID0gY3VycmVudE5vZGUudmFsdWU7XG5cblx0XHRcdFx0XHRpZiAodG9rZW5MaXN0Lmxlbmd0aCA+IHRleHQubGVuZ3RoKSB7XG5cdFx0XHRcdFx0XHQvLyBTb21ldGhpbmcgd2VudCB0ZXJyaWJseSB3cm9uZywgQUJPUlQsIEFCT1JUIVxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChzdHIgaW5zdGFuY2VvZiBUb2tlbikge1xuXHRcdFx0XHRcdFx0Y29udGludWU7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFyIHJlbW92ZUNvdW50ID0gMTsgLy8gdGhpcyBpcyB0aGUgdG8gcGFyYW1ldGVyIG9mIHJlbW92ZUJldHdlZW5cblx0XHRcdFx0XHR2YXIgbWF0Y2g7XG5cblx0XHRcdFx0XHRpZiAoZ3JlZWR5KSB7XG5cdFx0XHRcdFx0XHRtYXRjaCA9IG1hdGNoUGF0dGVybihwYXR0ZXJuLCBwb3MsIHRleHQsIGxvb2tiZWhpbmQpO1xuXHRcdFx0XHRcdFx0aWYgKCFtYXRjaCB8fCBtYXRjaC5pbmRleCA+PSB0ZXh0Lmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0XHRicmVhaztcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dmFyIGZyb20gPSBtYXRjaC5pbmRleDtcblx0XHRcdFx0XHRcdHZhciB0byA9IG1hdGNoLmluZGV4ICsgbWF0Y2hbMF0ubGVuZ3RoO1xuXHRcdFx0XHRcdFx0dmFyIHAgPSBwb3M7XG5cblx0XHRcdFx0XHRcdC8vIGZpbmQgdGhlIG5vZGUgdGhhdCBjb250YWlucyB0aGUgbWF0Y2hcblx0XHRcdFx0XHRcdHAgKz0gY3VycmVudE5vZGUudmFsdWUubGVuZ3RoO1xuXHRcdFx0XHRcdFx0d2hpbGUgKGZyb20gPj0gcCkge1xuXHRcdFx0XHRcdFx0XHRjdXJyZW50Tm9kZSA9IGN1cnJlbnROb2RlLm5leHQ7XG5cdFx0XHRcdFx0XHRcdHAgKz0gY3VycmVudE5vZGUudmFsdWUubGVuZ3RoO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Ly8gYWRqdXN0IHBvcyAoYW5kIHApXG5cdFx0XHRcdFx0XHRwIC09IGN1cnJlbnROb2RlLnZhbHVlLmxlbmd0aDtcblx0XHRcdFx0XHRcdHBvcyA9IHA7XG5cblx0XHRcdFx0XHRcdC8vIHRoZSBjdXJyZW50IG5vZGUgaXMgYSBUb2tlbiwgdGhlbiB0aGUgbWF0Y2ggc3RhcnRzIGluc2lkZSBhbm90aGVyIFRva2VuLCB3aGljaCBpcyBpbnZhbGlkXG5cdFx0XHRcdFx0XHRpZiAoY3VycmVudE5vZGUudmFsdWUgaW5zdGFuY2VvZiBUb2tlbikge1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0Ly8gZmluZCB0aGUgbGFzdCBub2RlIHdoaWNoIGlzIGFmZmVjdGVkIGJ5IHRoaXMgbWF0Y2hcblx0XHRcdFx0XHRcdGZvciAoXG5cdFx0XHRcdFx0XHRcdHZhciBrID0gY3VycmVudE5vZGU7XG5cdFx0XHRcdFx0XHRcdGsgIT09IHRva2VuTGlzdC50YWlsICYmIChwIDwgdG8gfHwgdHlwZW9mIGsudmFsdWUgPT09ICdzdHJpbmcnKTtcblx0XHRcdFx0XHRcdFx0ayA9IGsubmV4dFxuXHRcdFx0XHRcdFx0KSB7XG5cdFx0XHRcdFx0XHRcdHJlbW92ZUNvdW50Kys7XG5cdFx0XHRcdFx0XHRcdHAgKz0gay52YWx1ZS5sZW5ndGg7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZW1vdmVDb3VudC0tO1xuXG5cdFx0XHRcdFx0XHQvLyByZXBsYWNlIHdpdGggdGhlIG5ldyBtYXRjaFxuXHRcdFx0XHRcdFx0c3RyID0gdGV4dC5zbGljZShwb3MsIHApO1xuXHRcdFx0XHRcdFx0bWF0Y2guaW5kZXggLT0gcG9zO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRtYXRjaCA9IG1hdGNoUGF0dGVybihwYXR0ZXJuLCAwLCBzdHIsIGxvb2tiZWhpbmQpO1xuXHRcdFx0XHRcdFx0aWYgKCFtYXRjaCkge1xuXHRcdFx0XHRcdFx0XHRjb250aW51ZTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcmVkZWNsYXJlXG5cdFx0XHRcdFx0dmFyIGZyb20gPSBtYXRjaC5pbmRleDtcblx0XHRcdFx0XHR2YXIgbWF0Y2hTdHIgPSBtYXRjaFswXTtcblx0XHRcdFx0XHR2YXIgYmVmb3JlID0gc3RyLnNsaWNlKDAsIGZyb20pO1xuXHRcdFx0XHRcdHZhciBhZnRlciA9IHN0ci5zbGljZShmcm9tICsgbWF0Y2hTdHIubGVuZ3RoKTtcblxuXHRcdFx0XHRcdHZhciByZWFjaCA9IHBvcyArIHN0ci5sZW5ndGg7XG5cdFx0XHRcdFx0aWYgKHJlbWF0Y2ggJiYgcmVhY2ggPiByZW1hdGNoLnJlYWNoKSB7XG5cdFx0XHRcdFx0XHRyZW1hdGNoLnJlYWNoID0gcmVhY2g7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFyIHJlbW92ZUZyb20gPSBjdXJyZW50Tm9kZS5wcmV2O1xuXG5cdFx0XHRcdFx0aWYgKGJlZm9yZSkge1xuXHRcdFx0XHRcdFx0cmVtb3ZlRnJvbSA9IGFkZEFmdGVyKHRva2VuTGlzdCwgcmVtb3ZlRnJvbSwgYmVmb3JlKTtcblx0XHRcdFx0XHRcdHBvcyArPSBiZWZvcmUubGVuZ3RoO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHJlbW92ZVJhbmdlKHRva2VuTGlzdCwgcmVtb3ZlRnJvbSwgcmVtb3ZlQ291bnQpO1xuXG5cdFx0XHRcdFx0dmFyIHdyYXBwZWQgPSBuZXcgVG9rZW4odG9rZW4sIGluc2lkZSA/IF8udG9rZW5pemUobWF0Y2hTdHIsIGluc2lkZSkgOiBtYXRjaFN0ciwgYWxpYXMsIG1hdGNoU3RyKTtcblx0XHRcdFx0XHRjdXJyZW50Tm9kZSA9IGFkZEFmdGVyKHRva2VuTGlzdCwgcmVtb3ZlRnJvbSwgd3JhcHBlZCk7XG5cblx0XHRcdFx0XHRpZiAoYWZ0ZXIpIHtcblx0XHRcdFx0XHRcdGFkZEFmdGVyKHRva2VuTGlzdCwgY3VycmVudE5vZGUsIGFmdGVyKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAocmVtb3ZlQ291bnQgPiAxKSB7XG5cdFx0XHRcdFx0XHQvLyBhdCBsZWFzdCBvbmUgVG9rZW4gb2JqZWN0IHdhcyByZW1vdmVkLCBzbyB3ZSBoYXZlIHRvIGRvIHNvbWUgcmVtYXRjaGluZ1xuXHRcdFx0XHRcdFx0Ly8gdGhpcyBjYW4gb25seSBoYXBwZW4gaWYgdGhlIGN1cnJlbnQgcGF0dGVybiBpcyBncmVlZHlcblxuXHRcdFx0XHRcdFx0LyoqIEB0eXBlIHtSZW1hdGNoT3B0aW9uc30gKi9cblx0XHRcdFx0XHRcdHZhciBuZXN0ZWRSZW1hdGNoID0ge1xuXHRcdFx0XHRcdFx0XHRjYXVzZTogdG9rZW4gKyAnLCcgKyBqLFxuXHRcdFx0XHRcdFx0XHRyZWFjaDogcmVhY2hcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0XHRtYXRjaEdyYW1tYXIodGV4dCwgdG9rZW5MaXN0LCBncmFtbWFyLCBjdXJyZW50Tm9kZS5wcmV2LCBwb3MsIG5lc3RlZFJlbWF0Y2gpO1xuXG5cdFx0XHRcdFx0XHQvLyB0aGUgcmVhY2ggbWlnaHQgaGF2ZSBiZWVuIGV4dGVuZGVkIGJlY2F1c2Ugb2YgdGhlIHJlbWF0Y2hpbmdcblx0XHRcdFx0XHRcdGlmIChyZW1hdGNoICYmIG5lc3RlZFJlbWF0Y2gucmVhY2ggPiByZW1hdGNoLnJlYWNoKSB7XG5cdFx0XHRcdFx0XHRcdHJlbWF0Y2gucmVhY2ggPSBuZXN0ZWRSZW1hdGNoLnJlYWNoO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdC8qKlxuXHQgKiBAdHlwZWRlZiBMaW5rZWRMaXN0Tm9kZVxuXHQgKiBAcHJvcGVydHkge1R9IHZhbHVlXG5cdCAqIEBwcm9wZXJ0eSB7TGlua2VkTGlzdE5vZGU8VD4gfCBudWxsfSBwcmV2IFRoZSBwcmV2aW91cyBub2RlLlxuXHQgKiBAcHJvcGVydHkge0xpbmtlZExpc3ROb2RlPFQ+IHwgbnVsbH0gbmV4dCBUaGUgbmV4dCBub2RlLlxuXHQgKiBAdGVtcGxhdGUgVFxuXHQgKiBAcHJpdmF0ZVxuXHQgKi9cblxuXHQvKipcblx0ICogQHRlbXBsYXRlIFRcblx0ICogQHByaXZhdGVcblx0ICovXG5cdGZ1bmN0aW9uIExpbmtlZExpc3QoKSB7XG5cdFx0LyoqIEB0eXBlIHtMaW5rZWRMaXN0Tm9kZTxUPn0gKi9cblx0XHR2YXIgaGVhZCA9IHsgdmFsdWU6IG51bGwsIHByZXY6IG51bGwsIG5leHQ6IG51bGwgfTtcblx0XHQvKiogQHR5cGUge0xpbmtlZExpc3ROb2RlPFQ+fSAqL1xuXHRcdHZhciB0YWlsID0geyB2YWx1ZTogbnVsbCwgcHJldjogaGVhZCwgbmV4dDogbnVsbCB9O1xuXHRcdGhlYWQubmV4dCA9IHRhaWw7XG5cblx0XHQvKiogQHR5cGUge0xpbmtlZExpc3ROb2RlPFQ+fSAqL1xuXHRcdHRoaXMuaGVhZCA9IGhlYWQ7XG5cdFx0LyoqIEB0eXBlIHtMaW5rZWRMaXN0Tm9kZTxUPn0gKi9cblx0XHR0aGlzLnRhaWwgPSB0YWlsO1xuXHRcdHRoaXMubGVuZ3RoID0gMDtcblx0fVxuXG5cdC8qKlxuXHQgKiBBZGRzIGEgbmV3IG5vZGUgd2l0aCB0aGUgZ2l2ZW4gdmFsdWUgdG8gdGhlIGxpc3QuXG5cdCAqXG5cdCAqIEBwYXJhbSB7TGlua2VkTGlzdDxUPn0gbGlzdFxuXHQgKiBAcGFyYW0ge0xpbmtlZExpc3ROb2RlPFQ+fSBub2RlXG5cdCAqIEBwYXJhbSB7VH0gdmFsdWVcblx0ICogQHJldHVybnMge0xpbmtlZExpc3ROb2RlPFQ+fSBUaGUgYWRkZWQgbm9kZS5cblx0ICogQHRlbXBsYXRlIFRcblx0ICovXG5cdGZ1bmN0aW9uIGFkZEFmdGVyKGxpc3QsIG5vZGUsIHZhbHVlKSB7XG5cdFx0Ly8gYXNzdW1lcyB0aGF0IG5vZGUgIT0gbGlzdC50YWlsICYmIHZhbHVlcy5sZW5ndGggPj0gMFxuXHRcdHZhciBuZXh0ID0gbm9kZS5uZXh0O1xuXG5cdFx0dmFyIG5ld05vZGUgPSB7IHZhbHVlOiB2YWx1ZSwgcHJldjogbm9kZSwgbmV4dDogbmV4dCB9O1xuXHRcdG5vZGUubmV4dCA9IG5ld05vZGU7XG5cdFx0bmV4dC5wcmV2ID0gbmV3Tm9kZTtcblx0XHRsaXN0Lmxlbmd0aCsrO1xuXG5cdFx0cmV0dXJuIG5ld05vZGU7XG5cdH1cblx0LyoqXG5cdCAqIFJlbW92ZXMgYGNvdW50YCBub2RlcyBhZnRlciB0aGUgZ2l2ZW4gbm9kZS4gVGhlIGdpdmVuIG5vZGUgd2lsbCBub3QgYmUgcmVtb3ZlZC5cblx0ICpcblx0ICogQHBhcmFtIHtMaW5rZWRMaXN0PFQ+fSBsaXN0XG5cdCAqIEBwYXJhbSB7TGlua2VkTGlzdE5vZGU8VD59IG5vZGVcblx0ICogQHBhcmFtIHtudW1iZXJ9IGNvdW50XG5cdCAqIEB0ZW1wbGF0ZSBUXG5cdCAqL1xuXHRmdW5jdGlvbiByZW1vdmVSYW5nZShsaXN0LCBub2RlLCBjb3VudCkge1xuXHRcdHZhciBuZXh0ID0gbm9kZS5uZXh0O1xuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgY291bnQgJiYgbmV4dCAhPT0gbGlzdC50YWlsOyBpKyspIHtcblx0XHRcdG5leHQgPSBuZXh0Lm5leHQ7XG5cdFx0fVxuXHRcdG5vZGUubmV4dCA9IG5leHQ7XG5cdFx0bmV4dC5wcmV2ID0gbm9kZTtcblx0XHRsaXN0Lmxlbmd0aCAtPSBpO1xuXHR9XG5cdC8qKlxuXHQgKiBAcGFyYW0ge0xpbmtlZExpc3Q8VD59IGxpc3Rcblx0ICogQHJldHVybnMge1RbXX1cblx0ICogQHRlbXBsYXRlIFRcblx0ICovXG5cdGZ1bmN0aW9uIHRvQXJyYXkobGlzdCkge1xuXHRcdHZhciBhcnJheSA9IFtdO1xuXHRcdHZhciBub2RlID0gbGlzdC5oZWFkLm5leHQ7XG5cdFx0d2hpbGUgKG5vZGUgIT09IGxpc3QudGFpbCkge1xuXHRcdFx0YXJyYXkucHVzaChub2RlLnZhbHVlKTtcblx0XHRcdG5vZGUgPSBub2RlLm5leHQ7XG5cdFx0fVxuXHRcdHJldHVybiBhcnJheTtcblx0fVxuXG5cblx0aWYgKCFfc2VsZi5kb2N1bWVudCkge1xuXHRcdGlmICghX3NlbGYuYWRkRXZlbnRMaXN0ZW5lcikge1xuXHRcdFx0Ly8gaW4gTm9kZS5qc1xuXHRcdFx0cmV0dXJuIF87XG5cdFx0fVxuXG5cdFx0aWYgKCFfLmRpc2FibGVXb3JrZXJNZXNzYWdlSGFuZGxlcikge1xuXHRcdFx0Ly8gSW4gd29ya2VyXG5cdFx0XHRfc2VsZi5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZnVuY3Rpb24gKGV2dCkge1xuXHRcdFx0XHR2YXIgbWVzc2FnZSA9IEpTT04ucGFyc2UoZXZ0LmRhdGEpO1xuXHRcdFx0XHR2YXIgbGFuZyA9IG1lc3NhZ2UubGFuZ3VhZ2U7XG5cdFx0XHRcdHZhciBjb2RlID0gbWVzc2FnZS5jb2RlO1xuXHRcdFx0XHR2YXIgaW1tZWRpYXRlQ2xvc2UgPSBtZXNzYWdlLmltbWVkaWF0ZUNsb3NlO1xuXG5cdFx0XHRcdF9zZWxmLnBvc3RNZXNzYWdlKF8uaGlnaGxpZ2h0KGNvZGUsIF8ubGFuZ3VhZ2VzW2xhbmddLCBsYW5nKSk7XG5cdFx0XHRcdGlmIChpbW1lZGlhdGVDbG9zZSkge1xuXHRcdFx0XHRcdF9zZWxmLmNsb3NlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0sIGZhbHNlKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gXztcblx0fVxuXG5cdC8vIEdldCBjdXJyZW50IHNjcmlwdCBhbmQgaGlnaGxpZ2h0XG5cdHZhciBzY3JpcHQgPSBfLnV0aWwuY3VycmVudFNjcmlwdCgpO1xuXG5cdGlmIChzY3JpcHQpIHtcblx0XHRfLmZpbGVuYW1lID0gc2NyaXB0LnNyYztcblxuXHRcdGlmIChzY3JpcHQuaGFzQXR0cmlidXRlKCdkYXRhLW1hbnVhbCcpKSB7XG5cdFx0XHRfLm1hbnVhbCA9IHRydWU7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gaGlnaGxpZ2h0QXV0b21hdGljYWxseUNhbGxiYWNrKCkge1xuXHRcdGlmICghXy5tYW51YWwpIHtcblx0XHRcdF8uaGlnaGxpZ2h0QWxsKCk7XG5cdFx0fVxuXHR9XG5cblx0aWYgKCFfLm1hbnVhbCkge1xuXHRcdC8vIElmIHRoZSBkb2N1bWVudCBzdGF0ZSBpcyBcImxvYWRpbmdcIiwgdGhlbiB3ZSdsbCB1c2UgRE9NQ29udGVudExvYWRlZC5cblx0XHQvLyBJZiB0aGUgZG9jdW1lbnQgc3RhdGUgaXMgXCJpbnRlcmFjdGl2ZVwiIGFuZCB0aGUgcHJpc20uanMgc2NyaXB0IGlzIGRlZmVycmVkLCB0aGVuIHdlJ2xsIGFsc28gdXNlIHRoZVxuXHRcdC8vIERPTUNvbnRlbnRMb2FkZWQgZXZlbnQgYmVjYXVzZSB0aGVyZSBtaWdodCBiZSBzb21lIHBsdWdpbnMgb3IgbGFuZ3VhZ2VzIHdoaWNoIGhhdmUgYWxzbyBiZWVuIGRlZmVycmVkIGFuZCB0aGV5XG5cdFx0Ly8gbWlnaHQgdGFrZSBsb25nZXIgb25lIGFuaW1hdGlvbiBmcmFtZSB0byBleGVjdXRlIHdoaWNoIGNhbiBjcmVhdGUgYSByYWNlIGNvbmRpdGlvbiB3aGVyZSBvbmx5IHNvbWUgcGx1Z2lucyBoYXZlXG5cdFx0Ly8gYmVlbiBsb2FkZWQgd2hlbiBQcmlzbS5oaWdobGlnaHRBbGwoKSBpcyBleGVjdXRlZCwgZGVwZW5kaW5nIG9uIGhvdyBmYXN0IHJlc291cmNlcyBhcmUgbG9hZGVkLlxuXHRcdC8vIFNlZSBodHRwczovL2dpdGh1Yi5jb20vUHJpc21KUy9wcmlzbS9pc3N1ZXMvMjEwMlxuXHRcdHZhciByZWFkeVN0YXRlID0gZG9jdW1lbnQucmVhZHlTdGF0ZTtcblx0XHRpZiAocmVhZHlTdGF0ZSA9PT0gJ2xvYWRpbmcnIHx8IHJlYWR5U3RhdGUgPT09ICdpbnRlcmFjdGl2ZScgJiYgc2NyaXB0ICYmIHNjcmlwdC5kZWZlcikge1xuXHRcdFx0ZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignRE9NQ29udGVudExvYWRlZCcsIGhpZ2hsaWdodEF1dG9tYXRpY2FsbHlDYWxsYmFjayk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlmICh3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKSB7XG5cdFx0XHRcdHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoaGlnaGxpZ2h0QXV0b21hdGljYWxseUNhbGxiYWNrKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHdpbmRvdy5zZXRUaW1lb3V0KGhpZ2hsaWdodEF1dG9tYXRpY2FsbHlDYWxsYmFjaywgMTYpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBfO1xuXG59KF9zZWxmKSk7XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykge1xuXHRtb2R1bGUuZXhwb3J0cyA9IFByaXNtO1xufVxuXG4vLyBoYWNrIGZvciBjb21wb25lbnRzIHRvIHdvcmsgY29ycmVjdGx5IGluIG5vZGUuanNcbmlmICh0eXBlb2YgZ2xvYmFsICE9PSAndW5kZWZpbmVkJykge1xuXHRnbG9iYWwuUHJpc20gPSBQcmlzbTtcbn1cblxuLy8gc29tZSBhZGRpdGlvbmFsIGRvY3VtZW50YXRpb24vdHlwZXNcblxuLyoqXG4gKiBUaGUgZXhwYW5zaW9uIG9mIGEgc2ltcGxlIGBSZWdFeHBgIGxpdGVyYWwgdG8gc3VwcG9ydCBhZGRpdGlvbmFsIHByb3BlcnRpZXMuXG4gKlxuICogQHR5cGVkZWYgR3JhbW1hclRva2VuXG4gKiBAcHJvcGVydHkge1JlZ0V4cH0gcGF0dGVybiBUaGUgcmVndWxhciBleHByZXNzaW9uIG9mIHRoZSB0b2tlbi5cbiAqIEBwcm9wZXJ0eSB7Ym9vbGVhbn0gW2xvb2tiZWhpbmQ9ZmFsc2VdIElmIGB0cnVlYCwgdGhlbiB0aGUgZmlyc3QgY2FwdHVyaW5nIGdyb3VwIG9mIGBwYXR0ZXJuYCB3aWxsIChlZmZlY3RpdmVseSlcbiAqIGJlaGF2ZSBhcyBhIGxvb2tiZWhpbmQgZ3JvdXAgbWVhbmluZyB0aGF0IHRoZSBjYXB0dXJlZCB0ZXh0IHdpbGwgbm90IGJlIHBhcnQgb2YgdGhlIG1hdGNoZWQgdGV4dCBvZiB0aGUgbmV3IHRva2VuLlxuICogQHByb3BlcnR5IHtib29sZWFufSBbZ3JlZWR5PWZhbHNlXSBXaGV0aGVyIHRoZSB0b2tlbiBpcyBncmVlZHkuXG4gKiBAcHJvcGVydHkge3N0cmluZ3xzdHJpbmdbXX0gW2FsaWFzXSBBbiBvcHRpb25hbCBhbGlhcyBvciBsaXN0IG9mIGFsaWFzZXMuXG4gKiBAcHJvcGVydHkge0dyYW1tYXJ9IFtpbnNpZGVdIFRoZSBuZXN0ZWQgZ3JhbW1hciBvZiB0aGlzIHRva2VuLlxuICpcbiAqIFRoZSBgaW5zaWRlYCBncmFtbWFyIHdpbGwgYmUgdXNlZCB0byB0b2tlbml6ZSB0aGUgdGV4dCB2YWx1ZSBvZiBlYWNoIHRva2VuIG9mIHRoaXMga2luZC5cbiAqXG4gKiBUaGlzIGNhbiBiZSB1c2VkIHRvIG1ha2UgbmVzdGVkIGFuZCBldmVuIHJlY3Vyc2l2ZSBsYW5ndWFnZSBkZWZpbml0aW9ucy5cbiAqXG4gKiBOb3RlOiBUaGlzIGNhbiBjYXVzZSBpbmZpbml0ZSByZWN1cnNpb24uIEJlIGNhcmVmdWwgd2hlbiB5b3UgZW1iZWQgZGlmZmVyZW50IGxhbmd1YWdlcyBvciBldmVuIHRoZSBzYW1lIGxhbmd1YWdlIGludG9cbiAqIGVhY2ggYW5vdGhlci5cbiAqIEBnbG9iYWxcbiAqIEBwdWJsaWNcbiAqL1xuXG4vKipcbiAqIEB0eXBlZGVmIEdyYW1tYXJcbiAqIEB0eXBlIHtPYmplY3Q8c3RyaW5nLCBSZWdFeHAgfCBHcmFtbWFyVG9rZW4gfCBBcnJheTxSZWdFeHAgfCBHcmFtbWFyVG9rZW4+Pn1cbiAqIEBwcm9wZXJ0eSB7R3JhbW1hcn0gW3Jlc3RdIEFuIG9wdGlvbmFsIGdyYW1tYXIgb2JqZWN0IHRoYXQgd2lsbCBiZSBhcHBlbmRlZCB0byB0aGlzIGdyYW1tYXIuXG4gKiBAZ2xvYmFsXG4gKiBAcHVibGljXG4gKi9cblxuLyoqXG4gKiBBIGZ1bmN0aW9uIHdoaWNoIHdpbGwgaW52b2tlZCBhZnRlciBhbiBlbGVtZW50IHdhcyBzdWNjZXNzZnVsbHkgaGlnaGxpZ2h0ZWQuXG4gKlxuICogQGNhbGxiYWNrIEhpZ2hsaWdodENhbGxiYWNrXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgc3VjY2Vzc2Z1bGx5IGhpZ2hsaWdodGVkLlxuICogQHJldHVybnMge3ZvaWR9XG4gKiBAZ2xvYmFsXG4gKiBAcHVibGljXG4gKi9cblxuLyoqXG4gKiBAY2FsbGJhY2sgSG9va0NhbGxiYWNrXG4gKiBAcGFyYW0ge09iamVjdDxzdHJpbmcsIGFueT59IGVudiBUaGUgZW52aXJvbm1lbnQgdmFyaWFibGVzIG9mIHRoZSBob29rLlxuICogQHJldHVybnMge3ZvaWR9XG4gKiBAZ2xvYmFsXG4gKiBAcHVibGljXG4gKi9cblxuXG4vKiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG4gICAgIEJlZ2luIHByaXNtLW1hcmt1cC5qc1xuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuXG5QcmlzbS5sYW5ndWFnZXMubWFya3VwID0ge1xuXHQnY29tbWVudCc6IHtcblx0XHRwYXR0ZXJuOiAvPCEtLSg/Oig/ITwhLS0pW1xcc1xcU10pKj8tLT4vLFxuXHRcdGdyZWVkeTogdHJ1ZVxuXHR9LFxuXHQncHJvbG9nJzoge1xuXHRcdHBhdHRlcm46IC88XFw/W1xcc1xcU10rP1xcPz4vLFxuXHRcdGdyZWVkeTogdHJ1ZVxuXHR9LFxuXHQnZG9jdHlwZSc6IHtcblx0XHQvLyBodHRwczovL3d3dy53My5vcmcvVFIveG1sLyNOVC1kb2N0eXBlZGVjbFxuXHRcdHBhdHRlcm46IC88IURPQ1RZUEUoPzpbXj5cIidbXFxdXXxcIlteXCJdKlwifCdbXiddKicpKyg/OlxcWyg/OltePFwiJ1xcXV18XCJbXlwiXSpcInwnW14nXSonfDwoPyEhLS0pfDwhLS0oPzpbXi1dfC0oPyEtPikpKi0tPikqXFxdXFxzKik/Pi9pLFxuXHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdpbnRlcm5hbC1zdWJzZXQnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC8oXlteXFxbXSpcXFspW1xcc1xcU10rKD89XFxdPiQpLyxcblx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdFx0Z3JlZWR5OiB0cnVlLFxuXHRcdFx0XHRpbnNpZGU6IG51bGwgLy8gc2VlIGJlbG93XG5cdFx0XHR9LFxuXHRcdFx0J3N0cmluZyc6IHtcblx0XHRcdFx0cGF0dGVybjogL1wiW15cIl0qXCJ8J1teJ10qJy8sXG5cdFx0XHRcdGdyZWVkeTogdHJ1ZVxuXHRcdFx0fSxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9ePCF8PiR8W1tcXF1dLyxcblx0XHRcdCdkb2N0eXBlLXRhZyc6IC9eRE9DVFlQRS9pLFxuXHRcdFx0J25hbWUnOiAvW15cXHM8PidcIl0rL1xuXHRcdH1cblx0fSxcblx0J2NkYXRhJzoge1xuXHRcdHBhdHRlcm46IC88IVxcW0NEQVRBXFxbW1xcc1xcU10qP1xcXVxcXT4vaSxcblx0XHRncmVlZHk6IHRydWVcblx0fSxcblx0J3RhZyc6IHtcblx0XHRwYXR0ZXJuOiAvPFxcLz8oPyFcXGQpW15cXHM+XFwvPSQ8JV0rKD86XFxzKD86XFxzKlteXFxzPlxcLz1dKyg/Olxccyo9XFxzKig/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXlxccydcIj49XSsoPz1bXFxzPl0pKXwoPz1bXFxzLz5dKSkpKyk/XFxzKlxcLz8+Lyxcblx0XHRncmVlZHk6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQndGFnJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXjxcXC8/W15cXHM+XFwvXSsvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQncHVuY3R1YXRpb24nOiAvXjxcXC8/Lyxcblx0XHRcdFx0XHQnbmFtZXNwYWNlJzogL15bXlxccz5cXC86XSs6L1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3NwZWNpYWwtYXR0cic6IFtdLFxuXHRcdFx0J2F0dHItdmFsdWUnOiB7XG5cdFx0XHRcdHBhdHRlcm46IC89XFxzKig/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXlxccydcIj49XSspLyxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J3B1bmN0dWF0aW9uJzogW1xuXHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRwYXR0ZXJuOiAvXj0vLFxuXHRcdFx0XHRcdFx0XHRhbGlhczogJ2F0dHItZXF1YWxzJ1xuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdC9cInwnL1xuXHRcdFx0XHRcdF1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9cXC8/Pi8sXG5cdFx0XHQnYXR0ci1uYW1lJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvW15cXHM+XFwvXSsvLFxuXHRcdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0XHQnbmFtZXNwYWNlJzogL15bXlxccz5cXC86XSs6L1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHR9XG5cdH0sXG5cdCdlbnRpdHknOiBbXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyZbXFxkYS16XXsxLDh9Oy9pLFxuXHRcdFx0YWxpYXM6ICduYW1lZC1lbnRpdHknXG5cdFx0fSxcblx0XHQvJiN4P1tcXGRhLWZdezEsOH07L2lcblx0XVxufTtcblxuUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFsndGFnJ10uaW5zaWRlWydhdHRyLXZhbHVlJ10uaW5zaWRlWydlbnRpdHknXSA9XG5cdFByaXNtLmxhbmd1YWdlcy5tYXJrdXBbJ2VudGl0eSddO1xuUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cFsnZG9jdHlwZSddLmluc2lkZVsnaW50ZXJuYWwtc3Vic2V0J10uaW5zaWRlID0gUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cDtcblxuLy8gUGx1Z2luIHRvIG1ha2UgZW50aXR5IHRpdGxlIHNob3cgdGhlIHJlYWwgZW50aXR5LCBpZGVhIGJ5IFJvbWFuIEtvbWFyb3ZcblByaXNtLmhvb2tzLmFkZCgnd3JhcCcsIGZ1bmN0aW9uIChlbnYpIHtcblxuXHRpZiAoZW52LnR5cGUgPT09ICdlbnRpdHknKSB7XG5cdFx0ZW52LmF0dHJpYnV0ZXNbJ3RpdGxlJ10gPSBlbnYuY29udGVudC5yZXBsYWNlKC8mYW1wOy8sICcmJyk7XG5cdH1cbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcsICdhZGRJbmxpbmVkJywge1xuXHQvKipcblx0ICogQWRkcyBhbiBpbmxpbmVkIGxhbmd1YWdlIHRvIG1hcmt1cC5cblx0ICpcblx0ICogQW4gZXhhbXBsZSBvZiBhbiBpbmxpbmVkIGxhbmd1YWdlIGlzIENTUyB3aXRoIGA8c3R5bGU+YCB0YWdzLlxuXHQgKlxuXHQgKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUaGUgbmFtZSBvZiB0aGUgdGFnIHRoYXQgY29udGFpbnMgdGhlIGlubGluZWQgbGFuZ3VhZ2UuIFRoaXMgbmFtZSB3aWxsIGJlIHRyZWF0ZWQgYXNcblx0ICogY2FzZSBpbnNlbnNpdGl2ZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGxhbmcgVGhlIGxhbmd1YWdlIGtleS5cblx0ICogQGV4YW1wbGVcblx0ICogYWRkSW5saW5lZCgnc3R5bGUnLCAnY3NzJyk7XG5cdCAqL1xuXHR2YWx1ZTogZnVuY3Rpb24gYWRkSW5saW5lZCh0YWdOYW1lLCBsYW5nKSB7XG5cdFx0dmFyIGluY2x1ZGVkQ2RhdGFJbnNpZGUgPSB7fTtcblx0XHRpbmNsdWRlZENkYXRhSW5zaWRlWydsYW5ndWFnZS0nICsgbGFuZ10gPSB7XG5cdFx0XHRwYXR0ZXJuOiAvKF48IVxcW0NEQVRBXFxbKVtcXHNcXFNdKz8oPz1cXF1cXF0+JCkvaSxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlc1tsYW5nXVxuXHRcdH07XG5cdFx0aW5jbHVkZWRDZGF0YUluc2lkZVsnY2RhdGEnXSA9IC9ePCFcXFtDREFUQVxcW3xcXF1cXF0+JC9pO1xuXG5cdFx0dmFyIGluc2lkZSA9IHtcblx0XHRcdCdpbmNsdWRlZC1jZGF0YSc6IHtcblx0XHRcdFx0cGF0dGVybjogLzwhXFxbQ0RBVEFcXFtbXFxzXFxTXSo/XFxdXFxdPi9pLFxuXHRcdFx0XHRpbnNpZGU6IGluY2x1ZGVkQ2RhdGFJbnNpZGVcblx0XHRcdH1cblx0XHR9O1xuXHRcdGluc2lkZVsnbGFuZ3VhZ2UtJyArIGxhbmddID0ge1xuXHRcdFx0cGF0dGVybjogL1tcXHNcXFNdKy8sXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlc1tsYW5nXVxuXHRcdH07XG5cblx0XHR2YXIgZGVmID0ge307XG5cdFx0ZGVmW3RhZ05hbWVdID0ge1xuXHRcdFx0cGF0dGVybjogUmVnRXhwKC8oPF9fW14+XSo+KSg/OjwhXFxbQ0RBVEFcXFsoPzpbXlxcXV18XFxdKD8hXFxdPikpKlxcXVxcXT58KD8hPCFcXFtDREFUQVxcWylbXFxzXFxTXSkqPyg/PTxcXC9fXz4pLy5zb3VyY2UucmVwbGFjZSgvX18vZywgZnVuY3Rpb24gKCkgeyByZXR1cm4gdGFnTmFtZTsgfSksICdpJyksXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0Z3JlZWR5OiB0cnVlLFxuXHRcdFx0aW5zaWRlOiBpbnNpZGVcblx0XHR9O1xuXG5cdFx0UHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnbWFya3VwJywgJ2NkYXRhJywgZGVmKTtcblx0fVxufSk7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cC50YWcsICdhZGRBdHRyaWJ1dGUnLCB7XG5cdC8qKlxuXHQgKiBBZGRzIGFuIHBhdHRlcm4gdG8gaGlnaGxpZ2h0IGxhbmd1YWdlcyBlbWJlZGRlZCBpbiBIVE1MIGF0dHJpYnV0ZXMuXG5cdCAqXG5cdCAqIEFuIGV4YW1wbGUgb2YgYW4gaW5saW5lZCBsYW5ndWFnZSBpcyBDU1Mgd2l0aCBgc3R5bGVgIGF0dHJpYnV0ZXMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nfSBhdHRyTmFtZSBUaGUgbmFtZSBvZiB0aGUgdGFnIHRoYXQgY29udGFpbnMgdGhlIGlubGluZWQgbGFuZ3VhZ2UuIFRoaXMgbmFtZSB3aWxsIGJlIHRyZWF0ZWQgYXNcblx0ICogY2FzZSBpbnNlbnNpdGl2ZS5cblx0ICogQHBhcmFtIHtzdHJpbmd9IGxhbmcgVGhlIGxhbmd1YWdlIGtleS5cblx0ICogQGV4YW1wbGVcblx0ICogYWRkQXR0cmlidXRlKCdzdHlsZScsICdjc3MnKTtcblx0ICovXG5cdHZhbHVlOiBmdW5jdGlvbiAoYXR0ck5hbWUsIGxhbmcpIHtcblx0XHRQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5pbnNpZGVbJ3NwZWNpYWwtYXR0ciddLnB1c2goe1xuXHRcdFx0cGF0dGVybjogUmVnRXhwKFxuXHRcdFx0XHQvKF58W1wiJ1xcc10pLy5zb3VyY2UgKyAnKD86JyArIGF0dHJOYW1lICsgJyknICsgL1xccyo9XFxzKig/OlwiW15cIl0qXCJ8J1teJ10qJ3xbXlxccydcIj49XSsoPz1bXFxzPl0pKS8uc291cmNlLFxuXHRcdFx0XHQnaSdcblx0XHRcdCksXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdCdhdHRyLW5hbWUnOiAvXlteXFxzPV0rLyxcblx0XHRcdFx0J2F0dHItdmFsdWUnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogLz1bXFxzXFxTXSsvLFxuXHRcdFx0XHRcdGluc2lkZToge1xuXHRcdFx0XHRcdFx0J3ZhbHVlJzoge1xuXHRcdFx0XHRcdFx0XHRwYXR0ZXJuOiAvKF49XFxzKihbXCInXXwoPyFbXCInXSkpKVxcU1tcXHNcXFNdKig/PVxcMiQpLyxcblx0XHRcdFx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdFx0XHRcdFx0YWxpYXM6IFtsYW5nLCAnbGFuZ3VhZ2UtJyArIGxhbmddLFxuXHRcdFx0XHRcdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlc1tsYW5nXVxuXHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdCdwdW5jdHVhdGlvbic6IFtcblx0XHRcdFx0XHRcdFx0e1xuXHRcdFx0XHRcdFx0XHRcdHBhdHRlcm46IC9ePS8sXG5cdFx0XHRcdFx0XHRcdFx0YWxpYXM6ICdhdHRyLWVxdWFscydcblx0XHRcdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRcdFx0L1wifCcvXG5cdFx0XHRcdFx0XHRdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH1cbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaHRtbCA9IFByaXNtLmxhbmd1YWdlcy5tYXJrdXA7XG5QcmlzbS5sYW5ndWFnZXMubWF0aG1sID0gUHJpc20ubGFuZ3VhZ2VzLm1hcmt1cDtcblByaXNtLmxhbmd1YWdlcy5zdmcgPSBQcmlzbS5sYW5ndWFnZXMubWFya3VwO1xuXG5QcmlzbS5sYW5ndWFnZXMueG1sID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnbWFya3VwJywge30pO1xuUHJpc20ubGFuZ3VhZ2VzLnNzbWwgPSBQcmlzbS5sYW5ndWFnZXMueG1sO1xuUHJpc20ubGFuZ3VhZ2VzLmF0b20gPSBQcmlzbS5sYW5ndWFnZXMueG1sO1xuUHJpc20ubGFuZ3VhZ2VzLnJzcyA9IFByaXNtLmxhbmd1YWdlcy54bWw7XG5cblxuLyogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBCZWdpbiBwcmlzbS1jc3MuanNcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cblxuKGZ1bmN0aW9uIChQcmlzbSkge1xuXG5cdHZhciBzdHJpbmcgPSAvKD86XCIoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXxbXlwiXFxcXFxcclxcbl0pKlwifCcoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXxbXidcXFxcXFxyXFxuXSkqJykvO1xuXG5cdFByaXNtLmxhbmd1YWdlcy5jc3MgPSB7XG5cdFx0J2NvbW1lbnQnOiAvXFwvXFwqW1xcc1xcU10qP1xcKlxcLy8sXG5cdFx0J2F0cnVsZSc6IHtcblx0XHRcdHBhdHRlcm46IC9AW1xcdy1dKD86W147e1xcc118XFxzKyg/IVtcXHN7XSkpKig/Ojt8KD89XFxzKlxceykpLyxcblx0XHRcdGluc2lkZToge1xuXHRcdFx0XHQncnVsZSc6IC9eQFtcXHctXSsvLFxuXHRcdFx0XHQnc2VsZWN0b3ItZnVuY3Rpb24tYXJndW1lbnQnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogLyhcXGJzZWxlY3RvclxccypcXChcXHMqKD8hW1xccyldKSkoPzpbXigpXFxzXXxcXHMrKD8hW1xccyldKXxcXCgoPzpbXigpXXxcXChbXigpXSpcXCkpKlxcKSkrKD89XFxzKlxcKSkvLFxuXHRcdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRcdFx0YWxpYXM6ICdzZWxlY3Rvcidcblx0XHRcdFx0fSxcblx0XHRcdFx0J2tleXdvcmQnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogLyhefFteXFx3LV0pKD86YW5kfG5vdHxvbmx5fG9yKSg/IVtcXHctXSkvLFxuXHRcdFx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBTZWUgcmVzdCBiZWxvd1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0J3VybCc6IHtcblx0XHRcdC8vIGh0dHBzOi8vZHJhZnRzLmNzc3dnLm9yZy9jc3MtdmFsdWVzLTMvI3VybHNcblx0XHRcdHBhdHRlcm46IFJlZ0V4cCgnXFxcXGJ1cmxcXFxcKCg/OicgKyBzdHJpbmcuc291cmNlICsgJ3wnICsgLyg/OlteXFxcXFxcclxcbigpXCInXXxcXFxcW1xcc1xcU10pKi8uc291cmNlICsgJylcXFxcKScsICdpJyksXG5cdFx0XHRncmVlZHk6IHRydWUsXG5cdFx0XHRpbnNpZGU6IHtcblx0XHRcdFx0J2Z1bmN0aW9uJzogL151cmwvaSxcblx0XHRcdFx0J3B1bmN0dWF0aW9uJzogL15cXCh8XFwpJC8sXG5cdFx0XHRcdCdzdHJpbmcnOiB7XG5cdFx0XHRcdFx0cGF0dGVybjogUmVnRXhwKCdeJyArIHN0cmluZy5zb3VyY2UgKyAnJCcpLFxuXHRcdFx0XHRcdGFsaWFzOiAndXJsJ1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSxcblx0XHQnc2VsZWN0b3InOiB7XG5cdFx0XHRwYXR0ZXJuOiBSZWdFeHAoJyhefFt7fVxcXFxzXSlbXnt9XFxcXHNdKD86W157fTtcIlxcJ1xcXFxzXXxcXFxccysoPyFbXFxcXHN7XSl8JyArIHN0cmluZy5zb3VyY2UgKyAnKSooPz1cXFxccypcXFxceyknKSxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9LFxuXHRcdCdzdHJpbmcnOiB7XG5cdFx0XHRwYXR0ZXJuOiBzdHJpbmcsXG5cdFx0XHRncmVlZHk6IHRydWVcblx0XHR9LFxuXHRcdCdwcm9wZXJ0eSc6IHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXi1cXHdcXHhBMC1cXHVGRkZGXSkoPyFcXHMpWy1fYS16XFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWy1cXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKjopL2ksXG5cdFx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdFx0fSxcblx0XHQnaW1wb3J0YW50JzogLyFpbXBvcnRhbnRcXGIvaSxcblx0XHQnZnVuY3Rpb24nOiB7XG5cdFx0XHRwYXR0ZXJuOiAvKF58W14tYS16MC05XSlbLWEtejAtOV0rKD89XFwoKS9pLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH0sXG5cdFx0J3B1bmN0dWF0aW9uJzogL1soKXt9OzosXS9cblx0fTtcblxuXHRQcmlzbS5sYW5ndWFnZXMuY3NzWydhdHJ1bGUnXS5pbnNpZGUucmVzdCA9IFByaXNtLmxhbmd1YWdlcy5jc3M7XG5cblx0dmFyIG1hcmt1cCA9IFByaXNtLmxhbmd1YWdlcy5tYXJrdXA7XG5cdGlmIChtYXJrdXApIHtcblx0XHRtYXJrdXAudGFnLmFkZElubGluZWQoJ3N0eWxlJywgJ2NzcycpO1xuXHRcdG1hcmt1cC50YWcuYWRkQXR0cmlidXRlKCdzdHlsZScsICdjc3MnKTtcblx0fVxuXG59KFByaXNtKSk7XG5cblxuLyogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBCZWdpbiBwcmlzbS1jbGlrZS5qc1xuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuXG5QcmlzbS5sYW5ndWFnZXMuY2xpa2UgPSB7XG5cdCdjb21tZW50JzogW1xuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXlxcXFxdKVxcL1xcKltcXHNcXFNdKj8oPzpcXCpcXC98JCkvLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdGdyZWVkeTogdHJ1ZVxuXHRcdH0sXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLyhefFteXFxcXDpdKVxcL1xcLy4qLyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRncmVlZHk6IHRydWVcblx0XHR9XG5cdF0sXG5cdCdzdHJpbmcnOiB7XG5cdFx0cGF0dGVybjogLyhbXCInXSkoPzpcXFxcKD86XFxyXFxufFtcXHNcXFNdKXwoPyFcXDEpW15cXFxcXFxyXFxuXSkqXFwxLyxcblx0XHRncmVlZHk6IHRydWVcblx0fSxcblx0J2NsYXNzLW5hbWUnOiB7XG5cdFx0cGF0dGVybjogLyhcXGIoPzpjbGFzc3xleHRlbmRzfGltcGxlbWVudHN8aW5zdGFuY2VvZnxpbnRlcmZhY2V8bmV3fHRyYWl0KVxccyt8XFxiY2F0Y2hcXHMrXFwoKVtcXHcuXFxcXF0rL2ksXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRpbnNpZGU6IHtcblx0XHRcdCdwdW5jdHVhdGlvbic6IC9bLlxcXFxdL1xuXHRcdH1cblx0fSxcblx0J2tleXdvcmQnOiAvXFxiKD86YnJlYWt8Y2F0Y2h8Y29udGludWV8ZG98ZWxzZXxmaW5hbGx5fGZvcnxmdW5jdGlvbnxpZnxpbnxpbnN0YW5jZW9mfG5ld3xudWxsfHJldHVybnx0aHJvd3x0cnl8d2hpbGUpXFxiLyxcblx0J2Jvb2xlYW4nOiAvXFxiKD86ZmFsc2V8dHJ1ZSlcXGIvLFxuXHQnZnVuY3Rpb24nOiAvXFxiXFx3Kyg/PVxcKCkvLFxuXHQnbnVtYmVyJzogL1xcYjB4W1xcZGEtZl0rXFxifCg/OlxcYlxcZCsoPzpcXC5cXGQqKT98XFxCXFwuXFxkKykoPzplWystXT9cXGQrKT8vaSxcblx0J29wZXJhdG9yJzogL1s8Pl09P3xbIT1dPT89P3wtLT98XFwrXFwrP3wmJj98XFx8XFx8P3xbPyovfl4lXS8sXG5cdCdwdW5jdHVhdGlvbic6IC9be31bXFxdOygpLC46XS9cbn07XG5cblxuLyogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBCZWdpbiBwcmlzbS1qYXZhc2NyaXB0LmpzXG4qKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXG5cblByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0ID0gUHJpc20ubGFuZ3VhZ2VzLmV4dGVuZCgnY2xpa2UnLCB7XG5cdCdjbGFzcy1uYW1lJzogW1xuXHRcdFByaXNtLmxhbmd1YWdlcy5jbGlrZVsnY2xhc3MtbmFtZSddLFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXiRcXHdcXHhBMC1cXHVGRkZGXSkoPyFcXHMpW18kQS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFwuKD86Y29uc3RydWN0b3J8cHJvdG90eXBlKSkvLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZVxuXHRcdH1cblx0XSxcblx0J2tleXdvcmQnOiBbXG5cdFx0e1xuXHRcdFx0cGF0dGVybjogLygoPzpefFxcfSlcXHMqKWNhdGNoXFxiLyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oXnxbXi5dfFxcLlxcLlxcLlxccyopXFxiKD86YXN8YXNzZXJ0KD89XFxzKlxceyl8YXN5bmMoPz1cXHMqKD86ZnVuY3Rpb25cXGJ8XFwofFskXFx3XFx4QTAtXFx1RkZGRl18JCkpfGF3YWl0fGJyZWFrfGNhc2V8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVidWdnZXJ8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxlbnVtfGV4cG9ydHxleHRlbmRzfGZpbmFsbHkoPz1cXHMqKD86XFx7fCQpKXxmb3J8ZnJvbSg/PVxccyooPzpbJ1wiXXwkKSl8ZnVuY3Rpb258KD86Z2V0fHNldCkoPz1cXHMqKD86WyNcXFskXFx3XFx4QTAtXFx1RkZGRl18JCkpfGlmfGltcGxlbWVudHN8aW1wb3J0fGlufGluc3RhbmNlb2Z8aW50ZXJmYWNlfGxldHxuZXd8bnVsbHxvZnxwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZXR1cm58c3RhdGljfHN1cGVyfHN3aXRjaHx0aGlzfHRocm93fHRyeXx0eXBlb2Z8dW5kZWZpbmVkfHZhcnx2b2lkfHdoaWxlfHdpdGh8eWllbGQpXFxiLyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWVcblx0XHR9LFxuXHRdLFxuXHQvLyBBbGxvdyBmb3IgYWxsIG5vbi1BU0NJSSBjaGFyYWN0ZXJzIChTZWUgaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMjAwODQ0NClcblx0J2Z1bmN0aW9uJzogLyM/KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccyooPzpcXC5cXHMqKD86YXBwbHl8YmluZHxjYWxsKVxccyopP1xcKCkvLFxuXHQnbnVtYmVyJzoge1xuXHRcdHBhdHRlcm46IFJlZ0V4cChcblx0XHRcdC8oXnxbXlxcdyRdKS8uc291cmNlICtcblx0XHRcdCcoPzonICtcblx0XHRcdChcblx0XHRcdFx0Ly8gY29uc3RhbnRcblx0XHRcdFx0L05hTnxJbmZpbml0eS8uc291cmNlICtcblx0XHRcdFx0J3wnICtcblx0XHRcdFx0Ly8gYmluYXJ5IGludGVnZXJcblx0XHRcdFx0LzBbYkJdWzAxXSsoPzpfWzAxXSspKm4/Ly5zb3VyY2UgK1xuXHRcdFx0XHQnfCcgK1xuXHRcdFx0XHQvLyBvY3RhbCBpbnRlZ2VyXG5cdFx0XHRcdC8wW29PXVswLTddKyg/Ol9bMC03XSspKm4/Ly5zb3VyY2UgK1xuXHRcdFx0XHQnfCcgK1xuXHRcdFx0XHQvLyBoZXhhZGVjaW1hbCBpbnRlZ2VyXG5cdFx0XHRcdC8wW3hYXVtcXGRBLUZhLWZdKyg/Ol9bXFxkQS1GYS1mXSspKm4/Ly5zb3VyY2UgK1xuXHRcdFx0XHQnfCcgK1xuXHRcdFx0XHQvLyBkZWNpbWFsIGJpZ2ludFxuXHRcdFx0XHQvXFxkKyg/Ol9cXGQrKSpuLy5zb3VyY2UgK1xuXHRcdFx0XHQnfCcgK1xuXHRcdFx0XHQvLyBkZWNpbWFsIG51bWJlciAoaW50ZWdlciBvciBmbG9hdCkgYnV0IG5vIGJpZ2ludFxuXHRcdFx0XHQvKD86XFxkKyg/Ol9cXGQrKSooPzpcXC4oPzpcXGQrKD86X1xcZCspKik/KT98XFwuXFxkKyg/Ol9cXGQrKSopKD86W0VlXVsrLV0/XFxkKyg/Ol9cXGQrKSopPy8uc291cmNlXG5cdFx0XHQpICtcblx0XHRcdCcpJyArXG5cdFx0XHQvKD8hW1xcdyRdKS8uc291cmNlXG5cdFx0KSxcblx0XHRsb29rYmVoaW5kOiB0cnVlXG5cdH0sXG5cdCdvcGVyYXRvcic6IC8tLXxcXCtcXCt8XFwqXFwqPT98PT58JiY9P3xcXHxcXHw9P3xbIT1dPT18PDw9P3w+Pj4/PT98Wy0rKi8lJnxeIT08Pl09P3xcXC57M318XFw/XFw/PT98XFw/XFwuP3xbfjpdL1xufSk7XG5cblByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0WydjbGFzcy1uYW1lJ11bMF0ucGF0dGVybiA9IC8oXFxiKD86Y2xhc3N8ZXh0ZW5kc3xpbXBsZW1lbnRzfGluc3RhbmNlb2Z8aW50ZXJmYWNlfG5ldylcXHMrKVtcXHcuXFxcXF0rLztcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnamF2YXNjcmlwdCcsICdrZXl3b3JkJywge1xuXHQncmVnZXgnOiB7XG5cdFx0cGF0dGVybjogUmVnRXhwKFxuXHRcdFx0Ly8gbG9va2JlaGluZFxuXHRcdFx0Ly8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIHJlZ2V4cC9uby1kdXBlLWNoYXJhY3RlcnMtY2hhcmFjdGVyLWNsYXNzXG5cdFx0XHQvKCg/Ol58W14kXFx3XFx4QTAtXFx1RkZGRi5cIidcXF0pXFxzXXxcXGIoPzpyZXR1cm58eWllbGQpKVxccyopLy5zb3VyY2UgK1xuXHRcdFx0Ly8gUmVnZXggcGF0dGVybjpcblx0XHRcdC8vIFRoZXJlIGFyZSAyIHJlZ2V4IHBhdHRlcm5zIGhlcmUuIFRoZSBSZWdFeHAgc2V0IG5vdGF0aW9uIHByb3Bvc2FsIGFkZGVkIHN1cHBvcnQgZm9yIG5lc3RlZCBjaGFyYWN0ZXJcblx0XHRcdC8vIGNsYXNzZXMgaWYgdGhlIGB2YCBmbGFnIGlzIHByZXNlbnQuIFVuZm9ydHVuYXRlbHksIG5lc3RlZCBDQ3MgYXJlIGJvdGggY29udGV4dC1mcmVlIGFuZCBpbmNvbXBhdGlibGVcblx0XHRcdC8vIHdpdGggdGhlIG9ubHkgc3ludGF4LCBzbyB3ZSBoYXZlIHRvIGRlZmluZSAyIGRpZmZlcmVudCByZWdleCBwYXR0ZXJucy5cblx0XHRcdC9cXC8vLnNvdXJjZSArXG5cdFx0XHQnKD86JyArXG5cdFx0XHQvKD86XFxbKD86W15cXF1cXFxcXFxyXFxuXXxcXFxcLikqXFxdfFxcXFwufFteL1xcXFxcXFtcXHJcXG5dKStcXC9bZGdpbXl1c117MCw3fS8uc291cmNlICtcblx0XHRcdCd8JyArXG5cdFx0XHQvLyBgdmAgZmxhZyBzeW50YXguIFRoaXMgc3VwcG9ydHMgMyBsZXZlbHMgb2YgbmVzdGVkIGNoYXJhY3RlciBjbGFzc2VzLlxuXHRcdFx0Lyg/OlxcWyg/OlteW1xcXVxcXFxcXHJcXG5dfFxcXFwufFxcWyg/OlteW1xcXVxcXFxcXHJcXG5dfFxcXFwufFxcWyg/OlteW1xcXVxcXFxcXHJcXG5dfFxcXFwuKSpcXF0pKlxcXSkqXFxdfFxcXFwufFteL1xcXFxcXFtcXHJcXG5dKStcXC9bZGdpbXl1c117MCw3fXZbZGdpbXl1c117MCw3fS8uc291cmNlICtcblx0XHRcdCcpJyArXG5cdFx0XHQvLyBsb29rYWhlYWRcblx0XHRcdC8oPz0oPzpcXHN8XFwvXFwqKD86W14qXXxcXCooPyFcXC8pKSpcXCpcXC8pKig/OiR8W1xcclxcbiwuOzp9KVxcXV18XFwvXFwvKSkvLnNvdXJjZVxuXHRcdCksXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRncmVlZHk6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQncmVnZXgtc291cmNlJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvXihcXC8pW1xcc1xcU10rKD89XFwvW2Etel0qJCkvLFxuXHRcdFx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdFx0XHRhbGlhczogJ2xhbmd1YWdlLXJlZ2V4Jyxcblx0XHRcdFx0aW5zaWRlOiBQcmlzbS5sYW5ndWFnZXMucmVnZXhcblx0XHRcdH0sXG5cdFx0XHQncmVnZXgtZGVsaW1pdGVyJzogL15cXC98XFwvJC8sXG5cdFx0XHQncmVnZXgtZmxhZ3MnOiAvXlthLXpdKyQvLFxuXHRcdH1cblx0fSxcblx0Ly8gVGhpcyBtdXN0IGJlIGRlY2xhcmVkIGJlZm9yZSBrZXl3b3JkIGJlY2F1c2Ugd2UgdXNlIFwiZnVuY3Rpb25cIiBpbnNpZGUgdGhlIGxvb2stZm9yd2FyZFxuXHQnZnVuY3Rpb24tdmFyaWFibGUnOiB7XG5cdFx0cGF0dGVybjogLyM/KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccypbPTpdXFxzKig/OmFzeW5jXFxzKik/KD86XFxiZnVuY3Rpb25cXGJ8KD86XFwoKD86W14oKV18XFwoW14oKV0qXFwpKSpcXCl8KD8hXFxzKVtfJGEtekEtWlxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKilcXHMqPT4pKS8sXG5cdFx0YWxpYXM6ICdmdW5jdGlvbidcblx0fSxcblx0J3BhcmFtZXRlcic6IFtcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKGZ1bmN0aW9uKD86XFxzKyg/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSopP1xccypcXChcXHMqKSg/IVxccykoPzpbXigpXFxzXXxcXHMrKD8hW1xccyldKXxcXChbXigpXSpcXCkpKyg/PVxccypcXCkpLyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0XG5cdFx0fSxcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKF58W14kXFx3XFx4QTAtXFx1RkZGRl0pKD8hXFxzKVtfJGEtelxceEEwLVxcdUZGRkZdKD86KD8hXFxzKVskXFx3XFx4QTAtXFx1RkZGRl0pKig/PVxccyo9PikvaSxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0XG5cdFx0fSxcblx0XHR7XG5cdFx0XHRwYXR0ZXJuOiAvKFxcKFxccyopKD8hXFxzKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKFteKCldKlxcKSkrKD89XFxzKlxcKVxccyo9PikvLFxuXHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdGluc2lkZTogUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHRcblx0XHR9LFxuXHRcdHtcblx0XHRcdHBhdHRlcm46IC8oKD86XFxifFxcc3xeKSg/ISg/OmFzfGFzeW5jfGF3YWl0fGJyZWFrfGNhc2V8Y2F0Y2h8Y2xhc3N8Y29uc3R8Y29udGludWV8ZGVidWdnZXJ8ZGVmYXVsdHxkZWxldGV8ZG98ZWxzZXxlbnVtfGV4cG9ydHxleHRlbmRzfGZpbmFsbHl8Zm9yfGZyb218ZnVuY3Rpb258Z2V0fGlmfGltcGxlbWVudHN8aW1wb3J0fGlufGluc3RhbmNlb2Z8aW50ZXJmYWNlfGxldHxuZXd8bnVsbHxvZnxwYWNrYWdlfHByaXZhdGV8cHJvdGVjdGVkfHB1YmxpY3xyZXR1cm58c2V0fHN0YXRpY3xzdXBlcnxzd2l0Y2h8dGhpc3x0aHJvd3x0cnl8dHlwZW9mfHVuZGVmaW5lZHx2YXJ8dm9pZHx3aGlsZXx3aXRofHlpZWxkKSg/IVskXFx3XFx4QTAtXFx1RkZGRl0pKSg/Oig/IVxccylbXyRhLXpBLVpcXHhBMC1cXHVGRkZGXSg/Oig/IVxccylbJFxcd1xceEEwLVxcdUZGRkZdKSpcXHMqKVxcKFxccyp8XFxdXFxzKlxcKFxccyopKD8hXFxzKSg/OlteKClcXHNdfFxccysoPyFbXFxzKV0pfFxcKFteKCldKlxcKSkrKD89XFxzKlxcKVxccypcXHspLyxcblx0XHRcdGxvb2tiZWhpbmQ6IHRydWUsXG5cdFx0XHRpbnNpZGU6IFByaXNtLmxhbmd1YWdlcy5qYXZhc2NyaXB0XG5cdFx0fVxuXHRdLFxuXHQnY29uc3RhbnQnOiAvXFxiW0EtWl0oPzpbQS1aX118XFxkeD8pKlxcYi9cbn0pO1xuXG5QcmlzbS5sYW5ndWFnZXMuaW5zZXJ0QmVmb3JlKCdqYXZhc2NyaXB0JywgJ3N0cmluZycsIHtcblx0J2hhc2hiYW5nJzoge1xuXHRcdHBhdHRlcm46IC9eIyEuKi8sXG5cdFx0Z3JlZWR5OiB0cnVlLFxuXHRcdGFsaWFzOiAnY29tbWVudCdcblx0fSxcblx0J3RlbXBsYXRlLXN0cmluZyc6IHtcblx0XHRwYXR0ZXJuOiAvYCg/OlxcXFxbXFxzXFxTXXxcXCRcXHsoPzpbXnt9XXxcXHsoPzpbXnt9XXxcXHtbXn1dKlxcfSkqXFx9KStcXH18KD8hXFwkXFx7KVteXFxcXGBdKSpgLyxcblx0XHRncmVlZHk6IHRydWUsXG5cdFx0aW5zaWRlOiB7XG5cdFx0XHQndGVtcGxhdGUtcHVuY3R1YXRpb24nOiB7XG5cdFx0XHRcdHBhdHRlcm46IC9eYHxgJC8sXG5cdFx0XHRcdGFsaWFzOiAnc3RyaW5nJ1xuXHRcdFx0fSxcblx0XHRcdCdpbnRlcnBvbGF0aW9uJzoge1xuXHRcdFx0XHRwYXR0ZXJuOiAvKCg/Ol58W15cXFxcXSkoPzpcXFxcezJ9KSopXFwkXFx7KD86W157fV18XFx7KD86W157fV18XFx7W159XSpcXH0pKlxcfSkrXFx9Lyxcblx0XHRcdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRcdFx0aW5zaWRlOiB7XG5cdFx0XHRcdFx0J2ludGVycG9sYXRpb24tcHVuY3R1YXRpb24nOiB7XG5cdFx0XHRcdFx0XHRwYXR0ZXJuOiAvXlxcJFxce3xcXH0kLyxcblx0XHRcdFx0XHRcdGFsaWFzOiAncHVuY3R1YXRpb24nXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRyZXN0OiBQcmlzbS5sYW5ndWFnZXMuamF2YXNjcmlwdFxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0J3N0cmluZyc6IC9bXFxzXFxTXSsvXG5cdFx0fVxuXHR9LFxuXHQnc3RyaW5nLXByb3BlcnR5Jzoge1xuXHRcdHBhdHRlcm46IC8oKD86XnxbLHtdKVsgXFx0XSopKFtcIiddKSg/OlxcXFwoPzpcXHJcXG58W1xcc1xcU10pfCg/IVxcMilbXlxcXFxcXHJcXG5dKSpcXDIoPz1cXHMqOikvbSxcblx0XHRsb29rYmVoaW5kOiB0cnVlLFxuXHRcdGdyZWVkeTogdHJ1ZSxcblx0XHRhbGlhczogJ3Byb3BlcnR5J1xuXHR9XG59KTtcblxuUHJpc20ubGFuZ3VhZ2VzLmluc2VydEJlZm9yZSgnamF2YXNjcmlwdCcsICdvcGVyYXRvcicsIHtcblx0J2xpdGVyYWwtcHJvcGVydHknOiB7XG5cdFx0cGF0dGVybjogLygoPzpefFsse10pWyBcXHRdKikoPyFcXHMpW18kYS16QS1aXFx4QTAtXFx1RkZGRl0oPzooPyFcXHMpWyRcXHdcXHhBMC1cXHVGRkZGXSkqKD89XFxzKjopL20sXG5cdFx0bG9va2JlaGluZDogdHJ1ZSxcblx0XHRhbGlhczogJ3Byb3BlcnR5J1xuXHR9LFxufSk7XG5cbmlmIChQcmlzbS5sYW5ndWFnZXMubWFya3VwKSB7XG5cdFByaXNtLmxhbmd1YWdlcy5tYXJrdXAudGFnLmFkZElubGluZWQoJ3NjcmlwdCcsICdqYXZhc2NyaXB0Jyk7XG5cblx0Ly8gYWRkIGF0dHJpYnV0ZSBzdXBwb3J0IGZvciBhbGwgRE9NIGV2ZW50cy5cblx0Ly8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvRXZlbnRzI1N0YW5kYXJkX2V2ZW50c1xuXHRQcmlzbS5sYW5ndWFnZXMubWFya3VwLnRhZy5hZGRBdHRyaWJ1dGUoXG5cdFx0L29uKD86YWJvcnR8Ymx1cnxjaGFuZ2V8Y2xpY2t8Y29tcG9zaXRpb24oPzplbmR8c3RhcnR8dXBkYXRlKXxkYmxjbGlja3xlcnJvcnxmb2N1cyg/OmlufG91dCk/fGtleSg/OmRvd258dXApfGxvYWR8bW91c2UoPzpkb3dufGVudGVyfGxlYXZlfG1vdmV8b3V0fG92ZXJ8dXApfHJlc2V0fHJlc2l6ZXxzY3JvbGx8c2VsZWN0fHNsb3RjaGFuZ2V8c3VibWl0fHVubG9hZHx3aGVlbCkvLnNvdXJjZSxcblx0XHQnamF2YXNjcmlwdCdcblx0KTtcbn1cblxuUHJpc20ubGFuZ3VhZ2VzLmpzID0gUHJpc20ubGFuZ3VhZ2VzLmphdmFzY3JpcHQ7XG5cblxuLyogKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuICAgICBCZWdpbiBwcmlzbS1maWxlLWhpZ2hsaWdodC5qc1xuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiAqL1xuXG4oZnVuY3Rpb24gKCkge1xuXG5cdGlmICh0eXBlb2YgUHJpc20gPT09ICd1bmRlZmluZWQnIHx8IHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHQvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvRWxlbWVudC9tYXRjaGVzI1BvbHlmaWxsXG5cdGlmICghRWxlbWVudC5wcm90b3R5cGUubWF0Y2hlcykge1xuXHRcdEVsZW1lbnQucHJvdG90eXBlLm1hdGNoZXMgPSBFbGVtZW50LnByb3RvdHlwZS5tc01hdGNoZXNTZWxlY3RvciB8fCBFbGVtZW50LnByb3RvdHlwZS53ZWJraXRNYXRjaGVzU2VsZWN0b3I7XG5cdH1cblxuXHR2YXIgTE9BRElOR19NRVNTQUdFID0gJ0xvYWRpbmfigKYnO1xuXHR2YXIgRkFJTFVSRV9NRVNTQUdFID0gZnVuY3Rpb24gKHN0YXR1cywgbWVzc2FnZSkge1xuXHRcdHJldHVybiAn4pyWIEVycm9yICcgKyBzdGF0dXMgKyAnIHdoaWxlIGZldGNoaW5nIGZpbGU6ICcgKyBtZXNzYWdlO1xuXHR9O1xuXHR2YXIgRkFJTFVSRV9FTVBUWV9NRVNTQUdFID0gJ+KcliBFcnJvcjogRmlsZSBkb2VzIG5vdCBleGlzdCBvciBpcyBlbXB0eSc7XG5cblx0dmFyIEVYVEVOU0lPTlMgPSB7XG5cdFx0J2pzJzogJ2phdmFzY3JpcHQnLFxuXHRcdCdweSc6ICdweXRob24nLFxuXHRcdCdyYic6ICdydWJ5Jyxcblx0XHQncHMxJzogJ3Bvd2Vyc2hlbGwnLFxuXHRcdCdwc20xJzogJ3Bvd2Vyc2hlbGwnLFxuXHRcdCdzaCc6ICdiYXNoJyxcblx0XHQnYmF0JzogJ2JhdGNoJyxcblx0XHQnaCc6ICdjJyxcblx0XHQndGV4JzogJ2xhdGV4J1xuXHR9O1xuXG5cdHZhciBTVEFUVVNfQVRUUiA9ICdkYXRhLXNyYy1zdGF0dXMnO1xuXHR2YXIgU1RBVFVTX0xPQURJTkcgPSAnbG9hZGluZyc7XG5cdHZhciBTVEFUVVNfTE9BREVEID0gJ2xvYWRlZCc7XG5cdHZhciBTVEFUVVNfRkFJTEVEID0gJ2ZhaWxlZCc7XG5cblx0dmFyIFNFTEVDVE9SID0gJ3ByZVtkYXRhLXNyY106bm90KFsnICsgU1RBVFVTX0FUVFIgKyAnPVwiJyArIFNUQVRVU19MT0FERUQgKyAnXCJdKSdcblx0XHQrICc6bm90KFsnICsgU1RBVFVTX0FUVFIgKyAnPVwiJyArIFNUQVRVU19MT0FESU5HICsgJ1wiXSknO1xuXG5cdC8qKlxuXHQgKiBMb2FkcyB0aGUgZ2l2ZW4gZmlsZS5cblx0ICpcblx0ICogQHBhcmFtIHtzdHJpbmd9IHNyYyBUaGUgVVJMIG9yIHBhdGggb2YgdGhlIHNvdXJjZSBmaWxlIHRvIGxvYWQuXG5cdCAqIEBwYXJhbSB7KHJlc3VsdDogc3RyaW5nKSA9PiB2b2lkfSBzdWNjZXNzXG5cdCAqIEBwYXJhbSB7KHJlYXNvbjogc3RyaW5nKSA9PiB2b2lkfSBlcnJvclxuXHQgKi9cblx0ZnVuY3Rpb24gbG9hZEZpbGUoc3JjLCBzdWNjZXNzLCBlcnJvcikge1xuXHRcdHZhciB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblx0XHR4aHIub3BlbignR0VUJywgc3JjLCB0cnVlKTtcblx0XHR4aHIub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0aWYgKHhoci5yZWFkeVN0YXRlID09IDQpIHtcblx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPCA0MDAgJiYgeGhyLnJlc3BvbnNlVGV4dCkge1xuXHRcdFx0XHRcdHN1Y2Nlc3MoeGhyLnJlc3BvbnNlVGV4dCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0aWYgKHhoci5zdGF0dXMgPj0gNDAwKSB7XG5cdFx0XHRcdFx0XHRlcnJvcihGQUlMVVJFX01FU1NBR0UoeGhyLnN0YXR1cywgeGhyLnN0YXR1c1RleHQpKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0ZXJyb3IoRkFJTFVSRV9FTVBUWV9NRVNTQUdFKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHRcdHhoci5zZW5kKG51bGwpO1xuXHR9XG5cblx0LyoqXG5cdCAqIFBhcnNlcyB0aGUgZ2l2ZW4gcmFuZ2UuXG5cdCAqXG5cdCAqIFRoaXMgcmV0dXJucyBhIHJhbmdlIHdpdGggaW5jbHVzaXZlIGVuZHMuXG5cdCAqXG5cdCAqIEBwYXJhbSB7c3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZH0gcmFuZ2Vcblx0ICogQHJldHVybnMge1tudW1iZXIsIG51bWJlciB8IHVuZGVmaW5lZF0gfCB1bmRlZmluZWR9XG5cdCAqL1xuXHRmdW5jdGlvbiBwYXJzZVJhbmdlKHJhbmdlKSB7XG5cdFx0dmFyIG0gPSAvXlxccyooXFxkKylcXHMqKD86KCwpXFxzKig/OihcXGQrKVxccyopPyk/JC8uZXhlYyhyYW5nZSB8fCAnJyk7XG5cdFx0aWYgKG0pIHtcblx0XHRcdHZhciBzdGFydCA9IE51bWJlcihtWzFdKTtcblx0XHRcdHZhciBjb21tYSA9IG1bMl07XG5cdFx0XHR2YXIgZW5kID0gbVszXTtcblxuXHRcdFx0aWYgKCFjb21tYSkge1xuXHRcdFx0XHRyZXR1cm4gW3N0YXJ0LCBzdGFydF07XG5cdFx0XHR9XG5cdFx0XHRpZiAoIWVuZCkge1xuXHRcdFx0XHRyZXR1cm4gW3N0YXJ0LCB1bmRlZmluZWRdO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIFtzdGFydCwgTnVtYmVyKGVuZCldO1xuXHRcdH1cblx0XHRyZXR1cm4gdW5kZWZpbmVkO1xuXHR9XG5cblx0UHJpc20uaG9va3MuYWRkKCdiZWZvcmUtaGlnaGxpZ2h0YWxsJywgZnVuY3Rpb24gKGVudikge1xuXHRcdGVudi5zZWxlY3RvciArPSAnLCAnICsgU0VMRUNUT1I7XG5cdH0pO1xuXG5cdFByaXNtLmhvb2tzLmFkZCgnYmVmb3JlLXNhbml0eS1jaGVjaycsIGZ1bmN0aW9uIChlbnYpIHtcblx0XHR2YXIgcHJlID0gLyoqIEB0eXBlIHtIVE1MUHJlRWxlbWVudH0gKi8gKGVudi5lbGVtZW50KTtcblx0XHRpZiAocHJlLm1hdGNoZXMoU0VMRUNUT1IpKSB7XG5cdFx0XHRlbnYuY29kZSA9ICcnOyAvLyBmYXN0LXBhdGggdGhlIHdob2xlIHRoaW5nIGFuZCBnbyB0byBjb21wbGV0ZVxuXG5cdFx0XHRwcmUuc2V0QXR0cmlidXRlKFNUQVRVU19BVFRSLCBTVEFUVVNfTE9BRElORyk7IC8vIG1hcmsgYXMgbG9hZGluZ1xuXG5cdFx0XHQvLyBhZGQgY29kZSBlbGVtZW50IHdpdGggbG9hZGluZyBtZXNzYWdlXG5cdFx0XHR2YXIgY29kZSA9IHByZS5hcHBlbmRDaGlsZChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdDT0RFJykpO1xuXHRcdFx0Y29kZS50ZXh0Q29udGVudCA9IExPQURJTkdfTUVTU0FHRTtcblxuXHRcdFx0dmFyIHNyYyA9IHByZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJyk7XG5cblx0XHRcdHZhciBsYW5ndWFnZSA9IGVudi5sYW5ndWFnZTtcblx0XHRcdGlmIChsYW5ndWFnZSA9PT0gJ25vbmUnKSB7XG5cdFx0XHRcdC8vIHRoZSBsYW5ndWFnZSBtaWdodCBiZSAnbm9uZScgYmVjYXVzZSB0aGVyZSBpcyBubyBsYW5ndWFnZSBzZXQ7XG5cdFx0XHRcdC8vIGluIHRoaXMgY2FzZSwgd2Ugd2FudCB0byB1c2UgdGhlIGV4dGVuc2lvbiBhcyB0aGUgbGFuZ3VhZ2Vcblx0XHRcdFx0dmFyIGV4dGVuc2lvbiA9ICgvXFwuKFxcdyspJC8uZXhlYyhzcmMpIHx8IFssICdub25lJ10pWzFdO1xuXHRcdFx0XHRsYW5ndWFnZSA9IEVYVEVOU0lPTlNbZXh0ZW5zaW9uXSB8fCBleHRlbnNpb247XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNldCBsYW5ndWFnZSBjbGFzc2VzXG5cdFx0XHRQcmlzbS51dGlsLnNldExhbmd1YWdlKGNvZGUsIGxhbmd1YWdlKTtcblx0XHRcdFByaXNtLnV0aWwuc2V0TGFuZ3VhZ2UocHJlLCBsYW5ndWFnZSk7XG5cblx0XHRcdC8vIHByZWxvYWQgdGhlIGxhbmd1YWdlXG5cdFx0XHR2YXIgYXV0b2xvYWRlciA9IFByaXNtLnBsdWdpbnMuYXV0b2xvYWRlcjtcblx0XHRcdGlmIChhdXRvbG9hZGVyKSB7XG5cdFx0XHRcdGF1dG9sb2FkZXIubG9hZExhbmd1YWdlcyhsYW5ndWFnZSk7XG5cdFx0XHR9XG5cblx0XHRcdC8vIGxvYWQgZmlsZVxuXHRcdFx0bG9hZEZpbGUoXG5cdFx0XHRcdHNyYyxcblx0XHRcdFx0ZnVuY3Rpb24gKHRleHQpIHtcblx0XHRcdFx0XHQvLyBtYXJrIGFzIGxvYWRlZFxuXHRcdFx0XHRcdHByZS5zZXRBdHRyaWJ1dGUoU1RBVFVTX0FUVFIsIFNUQVRVU19MT0FERUQpO1xuXG5cdFx0XHRcdFx0Ly8gaGFuZGxlIGRhdGEtcmFuZ2Vcblx0XHRcdFx0XHR2YXIgcmFuZ2UgPSBwYXJzZVJhbmdlKHByZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtcmFuZ2UnKSk7XG5cdFx0XHRcdFx0aWYgKHJhbmdlKSB7XG5cdFx0XHRcdFx0XHR2YXIgbGluZXMgPSB0ZXh0LnNwbGl0KC9cXHJcXG4/fFxcbi9nKTtcblxuXHRcdFx0XHRcdFx0Ly8gdGhlIHJhbmdlIGlzIG9uZS1iYXNlZCBhbmQgaW5jbHVzaXZlIG9uIGJvdGggZW5kc1xuXHRcdFx0XHRcdFx0dmFyIHN0YXJ0ID0gcmFuZ2VbMF07XG5cdFx0XHRcdFx0XHR2YXIgZW5kID0gcmFuZ2VbMV0gPT0gbnVsbCA/IGxpbmVzLmxlbmd0aCA6IHJhbmdlWzFdO1xuXG5cdFx0XHRcdFx0XHRpZiAoc3RhcnQgPCAwKSB7IHN0YXJ0ICs9IGxpbmVzLmxlbmd0aDsgfVxuXHRcdFx0XHRcdFx0c3RhcnQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbihzdGFydCAtIDEsIGxpbmVzLmxlbmd0aCkpO1xuXHRcdFx0XHRcdFx0aWYgKGVuZCA8IDApIHsgZW5kICs9IGxpbmVzLmxlbmd0aDsgfVxuXHRcdFx0XHRcdFx0ZW5kID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oZW5kLCBsaW5lcy5sZW5ndGgpKTtcblxuXHRcdFx0XHRcdFx0dGV4dCA9IGxpbmVzLnNsaWNlKHN0YXJ0LCBlbmQpLmpvaW4oJ1xcbicpO1xuXG5cdFx0XHRcdFx0XHQvLyBhZGQgZGF0YS1zdGFydCBmb3IgbGluZSBudW1iZXJzXG5cdFx0XHRcdFx0XHRpZiAoIXByZS5oYXNBdHRyaWJ1dGUoJ2RhdGEtc3RhcnQnKSkge1xuXHRcdFx0XHRcdFx0XHRwcmUuc2V0QXR0cmlidXRlKCdkYXRhLXN0YXJ0JywgU3RyaW5nKHN0YXJ0ICsgMSkpO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIGhpZ2hsaWdodCBjb2RlXG5cdFx0XHRcdFx0Y29kZS50ZXh0Q29udGVudCA9IHRleHQ7XG5cdFx0XHRcdFx0UHJpc20uaGlnaGxpZ2h0RWxlbWVudChjb2RlKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0ZnVuY3Rpb24gKGVycm9yKSB7XG5cdFx0XHRcdFx0Ly8gbWFyayBhcyBmYWlsZWRcblx0XHRcdFx0XHRwcmUuc2V0QXR0cmlidXRlKFNUQVRVU19BVFRSLCBTVEFUVVNfRkFJTEVEKTtcblxuXHRcdFx0XHRcdGNvZGUudGV4dENvbnRlbnQgPSBlcnJvcjtcblx0XHRcdFx0fVxuXHRcdFx0KTtcblx0XHR9XG5cdH0pO1xuXG5cdFByaXNtLnBsdWdpbnMuZmlsZUhpZ2hsaWdodCA9IHtcblx0XHQvKipcblx0XHQgKiBFeGVjdXRlcyB0aGUgRmlsZSBIaWdobGlnaHQgcGx1Z2luIGZvciBhbGwgbWF0Y2hpbmcgYHByZWAgZWxlbWVudHMgdW5kZXIgdGhlIGdpdmVuIGNvbnRhaW5lci5cblx0XHQgKlxuXHRcdCAqIE5vdGU6IEVsZW1lbnRzIHdoaWNoIGFyZSBhbHJlYWR5IGxvYWRlZCBvciBjdXJyZW50bHkgbG9hZGluZyB3aWxsIG5vdCBiZSB0b3VjaGVkIGJ5IHRoaXMgbWV0aG9kLlxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHtQYXJlbnROb2RlfSBbY29udGFpbmVyPWRvY3VtZW50XVxuXHRcdCAqL1xuXHRcdGhpZ2hsaWdodDogZnVuY3Rpb24gaGlnaGxpZ2h0KGNvbnRhaW5lcikge1xuXHRcdFx0dmFyIGVsZW1lbnRzID0gKGNvbnRhaW5lciB8fCBkb2N1bWVudCkucXVlcnlTZWxlY3RvckFsbChTRUxFQ1RPUik7XG5cblx0XHRcdGZvciAodmFyIGkgPSAwLCBlbGVtZW50OyAoZWxlbWVudCA9IGVsZW1lbnRzW2krK10pOykge1xuXHRcdFx0XHRQcmlzbS5oaWdobGlnaHRFbGVtZW50KGVsZW1lbnQpO1xuXHRcdFx0fVxuXHRcdH1cblx0fTtcblxuXHR2YXIgbG9nZ2VkID0gZmFsc2U7XG5cdC8qKiBAZGVwcmVjYXRlZCBVc2UgYFByaXNtLnBsdWdpbnMuZmlsZUhpZ2hsaWdodC5oaWdobGlnaHRgIGluc3RlYWQuICovXG5cdFByaXNtLmZpbGVIaWdobGlnaHQgPSBmdW5jdGlvbiAoKSB7XG5cdFx0aWYgKCFsb2dnZWQpIHtcblx0XHRcdGNvbnNvbGUud2FybignUHJpc20uZmlsZUhpZ2hsaWdodCBpcyBkZXByZWNhdGVkLiBVc2UgYFByaXNtLnBsdWdpbnMuZmlsZUhpZ2hsaWdodC5oaWdobGlnaHRgIGluc3RlYWQuJyk7XG5cdFx0XHRsb2dnZWQgPSB0cnVlO1xuXHRcdH1cblx0XHRQcmlzbS5wbHVnaW5zLmZpbGVIaWdobGlnaHQuaGlnaGxpZ2h0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG5cdH07XG5cbn0oKSk7XG4iLCIvLyBUaGUgcHJvZ3JhbW1pbmcgZ29hbHMgb2YgU3BsaXQuanMgYXJlIHRvIGRlbGl2ZXIgcmVhZGFibGUsIHVuZGVyc3RhbmRhYmxlIGFuZFxuLy8gbWFpbnRhaW5hYmxlIGNvZGUsIHdoaWxlIGF0IHRoZSBzYW1lIHRpbWUgbWFudWFsbHkgb3B0aW1pemluZyBmb3IgdGlueSBtaW5pZmllZCBmaWxlIHNpemUsXG4vLyBicm93c2VyIGNvbXBhdGliaWxpdHkgd2l0aG91dCBhZGRpdGlvbmFsIHJlcXVpcmVtZW50c1xuLy8gYW5kIHZlcnkgZmV3IGFzc3VtcHRpb25zIGFib3V0IHRoZSB1c2VyJ3MgcGFnZSBsYXlvdXQuXG52YXIgZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgPyB3aW5kb3cgOiBudWxsO1xudmFyIHNzciA9IGdsb2JhbCA9PT0gbnVsbDtcbnZhciBkb2N1bWVudCA9ICFzc3IgPyBnbG9iYWwuZG9jdW1lbnQgOiB1bmRlZmluZWQ7XG5cbi8vIFNhdmUgYSBjb3VwbGUgbG9uZyBmdW5jdGlvbiBuYW1lcyB0aGF0IGFyZSB1c2VkIGZyZXF1ZW50bHkuXG4vLyBUaGlzIG9wdGltaXphdGlvbiBzYXZlcyBhcm91bmQgNDAwIGJ5dGVzLlxudmFyIGFkZEV2ZW50TGlzdGVuZXIgPSAnYWRkRXZlbnRMaXN0ZW5lcic7XG52YXIgcmVtb3ZlRXZlbnRMaXN0ZW5lciA9ICdyZW1vdmVFdmVudExpc3RlbmVyJztcbnZhciBnZXRCb3VuZGluZ0NsaWVudFJlY3QgPSAnZ2V0Qm91bmRpbmdDbGllbnRSZWN0JztcbnZhciBndXR0ZXJTdGFydERyYWdnaW5nID0gJ19hJztcbnZhciBhR3V0dGVyU2l6ZSA9ICdfYic7XG52YXIgYkd1dHRlclNpemUgPSAnX2MnO1xudmFyIEhPUklaT05UQUwgPSAnaG9yaXpvbnRhbCc7XG52YXIgTk9PUCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIGZhbHNlOyB9O1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gZGV0ZXJtaW5lcyB3aGljaCBwcmVmaXhlcyBvZiBDU1MgY2FsYyB3ZSBuZWVkLlxuLy8gV2Ugb25seSBuZWVkIHRvIGRvIHRoaXMgb25jZSBvbiBzdGFydHVwLCB3aGVuIHRoaXMgYW5vbnltb3VzIGZ1bmN0aW9uIGlzIGNhbGxlZC5cbi8vXG4vLyBUZXN0cyAtd2Via2l0LCAtbW96IGFuZCAtbyBwcmVmaXhlcy4gTW9kaWZpZWQgZnJvbSBTdGFja092ZXJmbG93OlxuLy8gaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xNjYyNTE0MC9qcy1mZWF0dXJlLWRldGVjdGlvbi10by1kZXRlY3QtdGhlLXVzYWdlLW9mLXdlYmtpdC1jYWxjLW92ZXItY2FsYy8xNjYyNTE2NyMxNjYyNTE2N1xudmFyIGNhbGMgPSBzc3JcbiAgICA/ICdjYWxjJ1xuICAgIDogKChbJycsICctd2Via2l0LScsICctbW96LScsICctby0nXVxuICAgICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKHByZWZpeCkge1xuICAgICAgICAgICAgICB2YXIgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgICAgZWwuc3R5bGUuY3NzVGV4dCA9IFwid2lkdGg6XCIgKyBwcmVmaXggKyBcImNhbGMoOXB4KVwiO1xuXG4gICAgICAgICAgICAgIHJldHVybiAhIWVsLnN0eWxlLmxlbmd0aFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnNoaWZ0KCkpICsgXCJjYWxjXCIpO1xuXG4vLyBIZWxwZXIgZnVuY3Rpb24gY2hlY2tzIGlmIGl0cyBhcmd1bWVudCBpcyBhIHN0cmluZy1saWtlIHR5cGVcbnZhciBpc1N0cmluZyA9IGZ1bmN0aW9uICh2KSB7IHJldHVybiB0eXBlb2YgdiA9PT0gJ3N0cmluZycgfHwgdiBpbnN0YW5jZW9mIFN0cmluZzsgfTtcblxuLy8gSGVscGVyIGZ1bmN0aW9uIGFsbG93cyBlbGVtZW50cyBhbmQgc3RyaW5nIHNlbGVjdG9ycyB0byBiZSB1c2VkXG4vLyBpbnRlcmNoYW5nZWFibHkuIEluIGVpdGhlciBjYXNlIGFuIGVsZW1lbnQgaXMgcmV0dXJuZWQuIFRoaXMgYWxsb3dzIHVzIHRvXG4vLyBkbyBgU3BsaXQoW2VsZW0xLCBlbGVtMl0pYCBhcyB3ZWxsIGFzIGBTcGxpdChbJyNpZDEnLCAnI2lkMiddKWAuXG52YXIgZWxlbWVudE9yU2VsZWN0b3IgPSBmdW5jdGlvbiAoZWwpIHtcbiAgICBpZiAoaXNTdHJpbmcoZWwpKSB7XG4gICAgICAgIHZhciBlbGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGVsKTtcbiAgICAgICAgaWYgKCFlbGUpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigoXCJTZWxlY3RvciBcIiArIGVsICsgXCIgZGlkIG5vdCBtYXRjaCBhIERPTSBlbGVtZW50XCIpKVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlbGVcbiAgICB9XG5cbiAgICByZXR1cm4gZWxcbn07XG5cbi8vIEhlbHBlciBmdW5jdGlvbiBnZXRzIGEgcHJvcGVydHkgZnJvbSB0aGUgcHJvcGVydGllcyBvYmplY3QsIHdpdGggYSBkZWZhdWx0IGZhbGxiYWNrXG52YXIgZ2V0T3B0aW9uID0gZnVuY3Rpb24gKG9wdGlvbnMsIHByb3BOYW1lLCBkZWYpIHtcbiAgICB2YXIgdmFsdWUgPSBvcHRpb25zW3Byb3BOYW1lXTtcbiAgICBpZiAodmFsdWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gdmFsdWVcbiAgICB9XG4gICAgcmV0dXJuIGRlZlxufTtcblxudmFyIGdldEd1dHRlclNpemUgPSBmdW5jdGlvbiAoZ3V0dGVyU2l6ZSwgaXNGaXJzdCwgaXNMYXN0LCBndXR0ZXJBbGlnbikge1xuICAgIGlmIChpc0ZpcnN0KSB7XG4gICAgICAgIGlmIChndXR0ZXJBbGlnbiA9PT0gJ2VuZCcpIHtcbiAgICAgICAgICAgIHJldHVybiAwXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGd1dHRlckFsaWduID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgcmV0dXJuIGd1dHRlclNpemUgLyAyXG4gICAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzTGFzdCkge1xuICAgICAgICBpZiAoZ3V0dGVyQWxpZ24gPT09ICdzdGFydCcpIHtcbiAgICAgICAgICAgIHJldHVybiAwXG4gICAgICAgIH1cbiAgICAgICAgaWYgKGd1dHRlckFsaWduID09PSAnY2VudGVyJykge1xuICAgICAgICAgICAgcmV0dXJuIGd1dHRlclNpemUgLyAyXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZ3V0dGVyU2l6ZVxufTtcblxuLy8gRGVmYXVsdCBvcHRpb25zXG52YXIgZGVmYXVsdEd1dHRlckZuID0gZnVuY3Rpb24gKGksIGd1dHRlckRpcmVjdGlvbikge1xuICAgIHZhciBndXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBndXQuY2xhc3NOYW1lID0gXCJndXR0ZXIgZ3V0dGVyLVwiICsgZ3V0dGVyRGlyZWN0aW9uO1xuICAgIHJldHVybiBndXRcbn07XG5cbnZhciBkZWZhdWx0RWxlbWVudFN0eWxlRm4gPSBmdW5jdGlvbiAoZGltLCBzaXplLCBndXRTaXplKSB7XG4gICAgdmFyIHN0eWxlID0ge307XG5cbiAgICBpZiAoIWlzU3RyaW5nKHNpemUpKSB7XG4gICAgICAgIHN0eWxlW2RpbV0gPSBjYWxjICsgXCIoXCIgKyBzaXplICsgXCIlIC0gXCIgKyBndXRTaXplICsgXCJweClcIjtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzdHlsZVtkaW1dID0gc2l6ZTtcbiAgICB9XG5cbiAgICByZXR1cm4gc3R5bGVcbn07XG5cbnZhciBkZWZhdWx0R3V0dGVyU3R5bGVGbiA9IGZ1bmN0aW9uIChkaW0sIGd1dFNpemUpIHtcbiAgICB2YXIgb2JqO1xuXG4gICAgcmV0dXJuICgoIG9iaiA9IHt9LCBvYmpbZGltXSA9IChndXRTaXplICsgXCJweFwiKSwgb2JqICkpO1xufTtcblxuLy8gVGhlIG1haW4gZnVuY3Rpb24gdG8gaW5pdGlhbGl6ZSBhIHNwbGl0LiBTcGxpdC5qcyB0aGlua3MgYWJvdXQgZWFjaCBwYWlyXG4vLyBvZiBlbGVtZW50cyBhcyBhbiBpbmRlcGVuZGFudCBwYWlyLiBEcmFnZ2luZyB0aGUgZ3V0dGVyIGJldHdlZW4gdHdvIGVsZW1lbnRzXG4vLyBvbmx5IGNoYW5nZXMgdGhlIGRpbWVuc2lvbnMgb2YgZWxlbWVudHMgaW4gdGhhdCBwYWlyLiBUaGlzIGlzIGtleSB0byB1bmRlcnN0YW5kaW5nXG4vLyBob3cgdGhlIGZvbGxvd2luZyBmdW5jdGlvbnMgb3BlcmF0ZSwgc2luY2UgZWFjaCBmdW5jdGlvbiBpcyBib3VuZCB0byBhIHBhaXIuXG4vL1xuLy8gQSBwYWlyIG9iamVjdCBpcyBzaGFwZWQgbGlrZSB0aGlzOlxuLy9cbi8vIHtcbi8vICAgICBhOiBET00gZWxlbWVudCxcbi8vICAgICBiOiBET00gZWxlbWVudCxcbi8vICAgICBhTWluOiBOdW1iZXIsXG4vLyAgICAgYk1pbjogTnVtYmVyLFxuLy8gICAgIGRyYWdnaW5nOiBCb29sZWFuLFxuLy8gICAgIHBhcmVudDogRE9NIGVsZW1lbnQsXG4vLyAgICAgZGlyZWN0aW9uOiAnaG9yaXpvbnRhbCcgfCAndmVydGljYWwnXG4vLyB9XG4vL1xuLy8gVGhlIGJhc2ljIHNlcXVlbmNlOlxuLy9cbi8vIDEuIFNldCBkZWZhdWx0cyB0byBzb21ldGhpbmcgc2FuZS4gYG9wdGlvbnNgIGRvZXNuJ3QgaGF2ZSB0byBiZSBwYXNzZWQgYXQgYWxsLlxuLy8gMi4gSW5pdGlhbGl6ZSBhIGJ1bmNoIG9mIHN0cmluZ3MgYmFzZWQgb24gdGhlIGRpcmVjdGlvbiB3ZSdyZSBzcGxpdHRpbmcuXG4vLyAgICBBIGxvdCBvZiB0aGUgYmVoYXZpb3IgaW4gdGhlIHJlc3Qgb2YgdGhlIGxpYnJhcnkgaXMgcGFyYW1hdGl6ZWQgZG93biB0b1xuLy8gICAgcmVseSBvbiBDU1Mgc3RyaW5ncyBhbmQgY2xhc3Nlcy5cbi8vIDMuIERlZmluZSB0aGUgZHJhZ2dpbmcgaGVscGVyIGZ1bmN0aW9ucywgYW5kIGEgZmV3IGhlbHBlcnMgdG8gZ28gd2l0aCB0aGVtLlxuLy8gNC4gTG9vcCB0aHJvdWdoIHRoZSBlbGVtZW50cyB3aGlsZSBwYWlyaW5nIHRoZW0gb2ZmLiBFdmVyeSBwYWlyIGdldHMgYW5cbi8vICAgIGBwYWlyYCBvYmplY3QgYW5kIGEgZ3V0dGVyLlxuLy8gNS4gQWN0dWFsbHkgc2l6ZSB0aGUgcGFpciBlbGVtZW50cywgaW5zZXJ0IGd1dHRlcnMgYW5kIGF0dGFjaCBldmVudCBsaXN0ZW5lcnMuXG52YXIgU3BsaXQgPSBmdW5jdGlvbiAoaWRzT3B0aW9uLCBvcHRpb25zKSB7XG4gICAgaWYgKCBvcHRpb25zID09PSB2b2lkIDAgKSBvcHRpb25zID0ge307XG5cbiAgICBpZiAoc3NyKSB7IHJldHVybiB7fSB9XG5cbiAgICB2YXIgaWRzID0gaWRzT3B0aW9uO1xuICAgIHZhciBkaW1lbnNpb247XG4gICAgdmFyIGNsaWVudEF4aXM7XG4gICAgdmFyIHBvc2l0aW9uO1xuICAgIHZhciBwb3NpdGlvbkVuZDtcbiAgICB2YXIgY2xpZW50U2l6ZTtcbiAgICB2YXIgZWxlbWVudHM7XG5cbiAgICAvLyBBbGxvdyBIVE1MQ29sbGVjdGlvbiB0byBiZSB1c2VkIGFzIGFuIGFyZ3VtZW50IHdoZW4gc3VwcG9ydGVkXG4gICAgaWYgKEFycmF5LmZyb20pIHtcbiAgICAgICAgaWRzID0gQXJyYXkuZnJvbShpZHMpO1xuICAgIH1cblxuICAgIC8vIEFsbCBET00gZWxlbWVudHMgaW4gdGhlIHNwbGl0IHNob3VsZCBoYXZlIGEgY29tbW9uIHBhcmVudC4gV2UgY2FuIGdyYWJcbiAgICAvLyB0aGUgZmlyc3QgZWxlbWVudHMgcGFyZW50IGFuZCBob3BlIHVzZXJzIHJlYWQgdGhlIGRvY3MgYmVjYXVzZSB0aGVcbiAgICAvLyBiZWhhdmlvciB3aWxsIGJlIHdoYWNreSBvdGhlcndpc2UuXG4gICAgdmFyIGZpcnN0RWxlbWVudCA9IGVsZW1lbnRPclNlbGVjdG9yKGlkc1swXSk7XG4gICAgdmFyIHBhcmVudCA9IGZpcnN0RWxlbWVudC5wYXJlbnROb2RlO1xuICAgIHZhciBwYXJlbnRTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUgPyBnZXRDb21wdXRlZFN0eWxlKHBhcmVudCkgOiBudWxsO1xuICAgIHZhciBwYXJlbnRGbGV4RGlyZWN0aW9uID0gcGFyZW50U3R5bGUgPyBwYXJlbnRTdHlsZS5mbGV4RGlyZWN0aW9uIDogbnVsbDtcblxuICAgIC8vIFNldCBkZWZhdWx0IG9wdGlvbnMuc2l6ZXMgdG8gZXF1YWwgcGVyY2VudGFnZXMgb2YgdGhlIHBhcmVudCBlbGVtZW50LlxuICAgIHZhciBzaXplcyA9IGdldE9wdGlvbihvcHRpb25zLCAnc2l6ZXMnKSB8fCBpZHMubWFwKGZ1bmN0aW9uICgpIHsgcmV0dXJuIDEwMCAvIGlkcy5sZW5ndGg7IH0pO1xuXG4gICAgLy8gU3RhbmRhcmRpemUgbWluU2l6ZSBhbmQgbWF4U2l6ZSB0byBhbiBhcnJheSBpZiBpdCBpc24ndCBhbHJlYWR5LlxuICAgIC8vIFRoaXMgYWxsb3dzIG1pblNpemUgYW5kIG1heFNpemUgdG8gYmUgcGFzc2VkIGFzIGEgbnVtYmVyLlxuICAgIHZhciBtaW5TaXplID0gZ2V0T3B0aW9uKG9wdGlvbnMsICdtaW5TaXplJywgMTAwKTtcbiAgICB2YXIgbWluU2l6ZXMgPSBBcnJheS5pc0FycmF5KG1pblNpemUpID8gbWluU2l6ZSA6IGlkcy5tYXAoZnVuY3Rpb24gKCkgeyByZXR1cm4gbWluU2l6ZTsgfSk7XG4gICAgdmFyIG1heFNpemUgPSBnZXRPcHRpb24ob3B0aW9ucywgJ21heFNpemUnLCBJbmZpbml0eSk7XG4gICAgdmFyIG1heFNpemVzID0gQXJyYXkuaXNBcnJheShtYXhTaXplKSA/IG1heFNpemUgOiBpZHMubWFwKGZ1bmN0aW9uICgpIHsgcmV0dXJuIG1heFNpemU7IH0pO1xuXG4gICAgLy8gR2V0IG90aGVyIG9wdGlvbnNcbiAgICB2YXIgZXhwYW5kVG9NaW4gPSBnZXRPcHRpb24ob3B0aW9ucywgJ2V4cGFuZFRvTWluJywgZmFsc2UpO1xuICAgIHZhciBndXR0ZXJTaXplID0gZ2V0T3B0aW9uKG9wdGlvbnMsICdndXR0ZXJTaXplJywgMTApO1xuICAgIHZhciBndXR0ZXJBbGlnbiA9IGdldE9wdGlvbihvcHRpb25zLCAnZ3V0dGVyQWxpZ24nLCAnY2VudGVyJyk7XG4gICAgdmFyIHNuYXBPZmZzZXQgPSBnZXRPcHRpb24ob3B0aW9ucywgJ3NuYXBPZmZzZXQnLCAzMCk7XG4gICAgdmFyIHNuYXBPZmZzZXRzID0gQXJyYXkuaXNBcnJheShzbmFwT2Zmc2V0KSA/IHNuYXBPZmZzZXQgOiBpZHMubWFwKGZ1bmN0aW9uICgpIHsgcmV0dXJuIHNuYXBPZmZzZXQ7IH0pO1xuICAgIHZhciBkcmFnSW50ZXJ2YWwgPSBnZXRPcHRpb24ob3B0aW9ucywgJ2RyYWdJbnRlcnZhbCcsIDEpO1xuICAgIHZhciBkaXJlY3Rpb24gPSBnZXRPcHRpb24ob3B0aW9ucywgJ2RpcmVjdGlvbicsIEhPUklaT05UQUwpO1xuICAgIHZhciBjdXJzb3IgPSBnZXRPcHRpb24oXG4gICAgICAgIG9wdGlvbnMsXG4gICAgICAgICdjdXJzb3InLFxuICAgICAgICBkaXJlY3Rpb24gPT09IEhPUklaT05UQUwgPyAnY29sLXJlc2l6ZScgOiAncm93LXJlc2l6ZSdcbiAgICApO1xuICAgIHZhciBndXR0ZXIgPSBnZXRPcHRpb24ob3B0aW9ucywgJ2d1dHRlcicsIGRlZmF1bHRHdXR0ZXJGbik7XG4gICAgdmFyIGVsZW1lbnRTdHlsZSA9IGdldE9wdGlvbihcbiAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgJ2VsZW1lbnRTdHlsZScsXG4gICAgICAgIGRlZmF1bHRFbGVtZW50U3R5bGVGblxuICAgICk7XG4gICAgdmFyIGd1dHRlclN0eWxlID0gZ2V0T3B0aW9uKG9wdGlvbnMsICdndXR0ZXJTdHlsZScsIGRlZmF1bHRHdXR0ZXJTdHlsZUZuKTtcblxuICAgIC8vIDIuIEluaXRpYWxpemUgYSBidW5jaCBvZiBzdHJpbmdzIGJhc2VkIG9uIHRoZSBkaXJlY3Rpb24gd2UncmUgc3BsaXR0aW5nLlxuICAgIC8vIEEgbG90IG9mIHRoZSBiZWhhdmlvciBpbiB0aGUgcmVzdCBvZiB0aGUgbGlicmFyeSBpcyBwYXJhbWF0aXplZCBkb3duIHRvXG4gICAgLy8gcmVseSBvbiBDU1Mgc3RyaW5ncyBhbmQgY2xhc3Nlcy5cbiAgICBpZiAoZGlyZWN0aW9uID09PSBIT1JJWk9OVEFMKSB7XG4gICAgICAgIGRpbWVuc2lvbiA9ICd3aWR0aCc7XG4gICAgICAgIGNsaWVudEF4aXMgPSAnY2xpZW50WCc7XG4gICAgICAgIHBvc2l0aW9uID0gJ2xlZnQnO1xuICAgICAgICBwb3NpdGlvbkVuZCA9ICdyaWdodCc7XG4gICAgICAgIGNsaWVudFNpemUgPSAnY2xpZW50V2lkdGgnO1xuICAgIH0gZWxzZSBpZiAoZGlyZWN0aW9uID09PSAndmVydGljYWwnKSB7XG4gICAgICAgIGRpbWVuc2lvbiA9ICdoZWlnaHQnO1xuICAgICAgICBjbGllbnRBeGlzID0gJ2NsaWVudFknO1xuICAgICAgICBwb3NpdGlvbiA9ICd0b3AnO1xuICAgICAgICBwb3NpdGlvbkVuZCA9ICdib3R0b20nO1xuICAgICAgICBjbGllbnRTaXplID0gJ2NsaWVudEhlaWdodCc7XG4gICAgfVxuXG4gICAgLy8gMy4gRGVmaW5lIHRoZSBkcmFnZ2luZyBoZWxwZXIgZnVuY3Rpb25zLCBhbmQgYSBmZXcgaGVscGVycyB0byBnbyB3aXRoIHRoZW0uXG4gICAgLy8gRWFjaCBoZWxwZXIgaXMgYm91bmQgdG8gYSBwYWlyIG9iamVjdCB0aGF0IGNvbnRhaW5zIGl0cyBtZXRhZGF0YS4gVGhpc1xuICAgIC8vIGFsc28gbWFrZXMgaXQgZWFzeSB0byBzdG9yZSByZWZlcmVuY2VzIHRvIGxpc3RlbmVycyB0aGF0IHRoYXQgd2lsbCBiZVxuICAgIC8vIGFkZGVkIGFuZCByZW1vdmVkLlxuICAgIC8vXG4gICAgLy8gRXZlbiB0aG91Z2ggdGhlcmUgYXJlIG5vIG90aGVyIGZ1bmN0aW9ucyBjb250YWluZWQgaW4gdGhlbSwgYWxpYXNpbmdcbiAgICAvLyB0aGlzIHRvIHNlbGYgc2F2ZXMgNTAgYnl0ZXMgb3Igc28gc2luY2UgaXQncyB1c2VkIHNvIGZyZXF1ZW50bHkuXG4gICAgLy9cbiAgICAvLyBUaGUgcGFpciBvYmplY3Qgc2F2ZXMgbWV0YWRhdGEgbGlrZSBkcmFnZ2luZyBzdGF0ZSwgcG9zaXRpb24gYW5kXG4gICAgLy8gZXZlbnQgbGlzdGVuZXIgcmVmZXJlbmNlcy5cblxuICAgIGZ1bmN0aW9uIHNldEVsZW1lbnRTaXplKGVsLCBzaXplLCBndXRTaXplLCBpKSB7XG4gICAgICAgIC8vIFNwbGl0LmpzIGFsbG93cyBzZXR0aW5nIHNpemVzIHZpYSBudW1iZXJzIChpZGVhbGx5KSwgb3IgaWYgeW91IG11c3QsXG4gICAgICAgIC8vIGJ5IHN0cmluZywgbGlrZSAnMzAwcHgnLiBUaGlzIGlzIGxlc3MgdGhhbiBpZGVhbCwgYmVjYXVzZSBpdCBicmVha3NcbiAgICAgICAgLy8gdGhlIGZsdWlkIGxheW91dCB0aGF0IGBjYWxjKCUgLSBweClgIHByb3ZpZGVzLiBZb3UncmUgb24geW91ciBvd24gaWYgeW91IGRvIHRoYXQsXG4gICAgICAgIC8vIG1ha2Ugc3VyZSB5b3UgY2FsY3VsYXRlIHRoZSBndXR0ZXIgc2l6ZSBieSBoYW5kLlxuICAgICAgICB2YXIgc3R5bGUgPSBlbGVtZW50U3R5bGUoZGltZW5zaW9uLCBzaXplLCBndXRTaXplLCBpKTtcblxuICAgICAgICBPYmplY3Qua2V5cyhzdHlsZSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gICAgICAgICAgICBlbC5zdHlsZVtwcm9wXSA9IHN0eWxlW3Byb3BdO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzZXRHdXR0ZXJTaXplKGd1dHRlckVsZW1lbnQsIGd1dFNpemUsIGkpIHtcbiAgICAgICAgdmFyIHN0eWxlID0gZ3V0dGVyU3R5bGUoZGltZW5zaW9uLCBndXRTaXplLCBpKTtcblxuICAgICAgICBPYmplY3Qua2V5cyhzdHlsZSkuZm9yRWFjaChmdW5jdGlvbiAocHJvcCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLXBhcmFtLXJlYXNzaWduXG4gICAgICAgICAgICBndXR0ZXJFbGVtZW50LnN0eWxlW3Byb3BdID0gc3R5bGVbcHJvcF07XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNpemVzKCkge1xuICAgICAgICByZXR1cm4gZWxlbWVudHMubWFwKGZ1bmN0aW9uIChlbGVtZW50KSB7IHJldHVybiBlbGVtZW50LnNpemU7IH0pXG4gICAgfVxuXG4gICAgLy8gU3VwcG9ydHMgdG91Y2ggZXZlbnRzLCBidXQgbm90IG11bHRpdG91Y2gsIHNvIG9ubHkgdGhlIGZpcnN0XG4gICAgLy8gZmluZ2VyIGB0b3VjaGVzWzBdYCBpcyBjb3VudGVkLlxuICAgIGZ1bmN0aW9uIGdldE1vdXNlUG9zaXRpb24oZSkge1xuICAgICAgICBpZiAoJ3RvdWNoZXMnIGluIGUpIHsgcmV0dXJuIGUudG91Y2hlc1swXVtjbGllbnRBeGlzXSB9XG4gICAgICAgIHJldHVybiBlW2NsaWVudEF4aXNdXG4gICAgfVxuXG4gICAgLy8gQWN0dWFsbHkgYWRqdXN0IHRoZSBzaXplIG9mIGVsZW1lbnRzIGBhYCBhbmQgYGJgIHRvIGBvZmZzZXRgIHdoaWxlIGRyYWdnaW5nLlxuICAgIC8vIGNhbGMgaXMgdXNlZCB0byBhbGxvdyBjYWxjKHBlcmNlbnRhZ2UgKyBndXR0ZXJweCkgb24gdGhlIHdob2xlIHNwbGl0IGluc3RhbmNlLFxuICAgIC8vIHdoaWNoIGFsbG93cyB0aGUgdmlld3BvcnQgdG8gYmUgcmVzaXplZCB3aXRob3V0IGFkZGl0aW9uYWwgbG9naWMuXG4gICAgLy8gRWxlbWVudCBhJ3Mgc2l6ZSBpcyB0aGUgc2FtZSBhcyBvZmZzZXQuIGIncyBzaXplIGlzIHRvdGFsIHNpemUgLSBhIHNpemUuXG4gICAgLy8gQm90aCBzaXplcyBhcmUgY2FsY3VsYXRlZCBmcm9tIHRoZSBpbml0aWFsIHBhcmVudCBwZXJjZW50YWdlLFxuICAgIC8vIHRoZW4gdGhlIGd1dHRlciBzaXplIGlzIHN1YnRyYWN0ZWQuXG4gICAgZnVuY3Rpb24gYWRqdXN0KG9mZnNldCkge1xuICAgICAgICB2YXIgYSA9IGVsZW1lbnRzW3RoaXMuYV07XG4gICAgICAgIHZhciBiID0gZWxlbWVudHNbdGhpcy5iXTtcbiAgICAgICAgdmFyIHBlcmNlbnRhZ2UgPSBhLnNpemUgKyBiLnNpemU7XG5cbiAgICAgICAgYS5zaXplID0gKG9mZnNldCAvIHRoaXMuc2l6ZSkgKiBwZXJjZW50YWdlO1xuICAgICAgICBiLnNpemUgPSBwZXJjZW50YWdlIC0gKG9mZnNldCAvIHRoaXMuc2l6ZSkgKiBwZXJjZW50YWdlO1xuXG4gICAgICAgIHNldEVsZW1lbnRTaXplKGEuZWxlbWVudCwgYS5zaXplLCB0aGlzW2FHdXR0ZXJTaXplXSwgYS5pKTtcbiAgICAgICAgc2V0RWxlbWVudFNpemUoYi5lbGVtZW50LCBiLnNpemUsIHRoaXNbYkd1dHRlclNpemVdLCBiLmkpO1xuICAgIH1cblxuICAgIC8vIGRyYWcsIHdoZXJlIGFsbCB0aGUgbWFnaWMgaGFwcGVucy4gVGhlIGxvZ2ljIGlzIHJlYWxseSBxdWl0ZSBzaW1wbGU6XG4gICAgLy9cbiAgICAvLyAxLiBJZ25vcmUgaWYgdGhlIHBhaXIgaXMgbm90IGRyYWdnaW5nLlxuICAgIC8vIDIuIEdldCB0aGUgb2Zmc2V0IG9mIHRoZSBldmVudC5cbiAgICAvLyAzLiBTbmFwIG9mZnNldCB0byBtaW4gaWYgd2l0aGluIHNuYXBwYWJsZSByYW5nZSAod2l0aGluIG1pbiArIHNuYXBPZmZzZXQpLlxuICAgIC8vIDQuIEFjdHVhbGx5IGFkanVzdCBlYWNoIGVsZW1lbnQgaW4gdGhlIHBhaXIgdG8gb2Zmc2V0LlxuICAgIC8vXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gfCAgICB8IDwtIGEubWluU2l6ZSAgICAgICAgICAgICAgIHx8ICAgICAgICAgICAgICBiLm1pblNpemUgLT4gfCAgICB8XG4gICAgLy8gfCAgICB8ICB8IDwtIHRoaXMuc25hcE9mZnNldCAgICAgIHx8ICAgICB0aGlzLnNuYXBPZmZzZXQgLT4gfCAgfCAgICB8XG4gICAgLy8gfCAgICB8ICB8ICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICAgICAgICAgICAgICAgICAgICAgICAgfCAgfCAgICB8XG4gICAgLy8gfCAgICB8ICB8ICAgICAgICAgICAgICAgICAgICAgICAgIHx8ICAgICAgICAgICAgICAgICAgICAgICAgfCAgfCAgICB8XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gfCA8LSB0aGlzLnN0YXJ0ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2l6ZSAtPiB8XG4gICAgZnVuY3Rpb24gZHJhZyhlKSB7XG4gICAgICAgIHZhciBvZmZzZXQ7XG4gICAgICAgIHZhciBhID0gZWxlbWVudHNbdGhpcy5hXTtcbiAgICAgICAgdmFyIGIgPSBlbGVtZW50c1t0aGlzLmJdO1xuXG4gICAgICAgIGlmICghdGhpcy5kcmFnZ2luZykgeyByZXR1cm4gfVxuXG4gICAgICAgIC8vIEdldCB0aGUgb2Zmc2V0IG9mIHRoZSBldmVudCBmcm9tIHRoZSBmaXJzdCBzaWRlIG9mIHRoZVxuICAgICAgICAvLyBwYWlyIGB0aGlzLnN0YXJ0YC4gVGhlbiBvZmZzZXQgYnkgdGhlIGluaXRpYWwgcG9zaXRpb24gb2YgdGhlXG4gICAgICAgIC8vIG1vdXNlIGNvbXBhcmVkIHRvIHRoZSBndXR0ZXIgc2l6ZS5cbiAgICAgICAgb2Zmc2V0ID1cbiAgICAgICAgICAgIGdldE1vdXNlUG9zaXRpb24oZSkgLVxuICAgICAgICAgICAgdGhpcy5zdGFydCArXG4gICAgICAgICAgICAodGhpc1thR3V0dGVyU2l6ZV0gLSB0aGlzLmRyYWdPZmZzZXQpO1xuXG4gICAgICAgIGlmIChkcmFnSW50ZXJ2YWwgPiAxKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSBNYXRoLnJvdW5kKG9mZnNldCAvIGRyYWdJbnRlcnZhbCkgKiBkcmFnSW50ZXJ2YWw7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJZiB3aXRoaW4gc25hcE9mZnNldCBvZiBtaW4gb3IgbWF4LCBzZXQgb2Zmc2V0IHRvIG1pbiBvciBtYXguXG4gICAgICAgIC8vIHNuYXBPZmZzZXQgYnVmZmVycyBhLm1pblNpemUgYW5kIGIubWluU2l6ZSwgc28gbG9naWMgaXMgb3Bwb3NpdGUgZm9yIGJvdGguXG4gICAgICAgIC8vIEluY2x1ZGUgdGhlIGFwcHJvcHJpYXRlIGd1dHRlciBzaXplcyB0byBwcmV2ZW50IG92ZXJmbG93cy5cbiAgICAgICAgaWYgKG9mZnNldCA8PSBhLm1pblNpemUgKyBhLnNuYXBPZmZzZXQgKyB0aGlzW2FHdXR0ZXJTaXplXSkge1xuICAgICAgICAgICAgb2Zmc2V0ID0gYS5taW5TaXplICsgdGhpc1thR3V0dGVyU2l6ZV07XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICBvZmZzZXQgPj1cbiAgICAgICAgICAgIHRoaXMuc2l6ZSAtIChiLm1pblNpemUgKyBiLnNuYXBPZmZzZXQgKyB0aGlzW2JHdXR0ZXJTaXplXSlcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSB0aGlzLnNpemUgLSAoYi5taW5TaXplICsgdGhpc1tiR3V0dGVyU2l6ZV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG9mZnNldCA+PSBhLm1heFNpemUgLSBhLnNuYXBPZmZzZXQgKyB0aGlzW2FHdXR0ZXJTaXplXSkge1xuICAgICAgICAgICAgb2Zmc2V0ID0gYS5tYXhTaXplICsgdGhpc1thR3V0dGVyU2l6ZV07XG4gICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICBvZmZzZXQgPD1cbiAgICAgICAgICAgIHRoaXMuc2l6ZSAtIChiLm1heFNpemUgLSBiLnNuYXBPZmZzZXQgKyB0aGlzW2JHdXR0ZXJTaXplXSlcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBvZmZzZXQgPSB0aGlzLnNpemUgLSAoYi5tYXhTaXplICsgdGhpc1tiR3V0dGVyU2l6ZV0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWN0dWFsbHkgYWRqdXN0IHRoZSBzaXplLlxuICAgICAgICBhZGp1c3QuY2FsbCh0aGlzLCBvZmZzZXQpO1xuXG4gICAgICAgIC8vIENhbGwgdGhlIGRyYWcgY2FsbGJhY2sgY29udGlub3VzbHkuIERvbid0IGRvIGFueXRoaW5nIHRvbyBpbnRlbnNpdmVcbiAgICAgICAgLy8gaW4gdGhpcyBjYWxsYmFjay5cbiAgICAgICAgZ2V0T3B0aW9uKG9wdGlvbnMsICdvbkRyYWcnLCBOT09QKShnZXRTaXplcygpKTtcbiAgICB9XG5cbiAgICAvLyBDYWNoZSBzb21lIGltcG9ydGFudCBzaXplcyB3aGVuIGRyYWcgc3RhcnRzLCBzbyB3ZSBkb24ndCBoYXZlIHRvIGRvIHRoYXRcbiAgICAvLyBjb250aW5vdXNseTpcbiAgICAvL1xuICAgIC8vIGBzaXplYDogVGhlIHRvdGFsIHNpemUgb2YgdGhlIHBhaXIuIEZpcnN0ICsgc2Vjb25kICsgZmlyc3QgZ3V0dGVyICsgc2Vjb25kIGd1dHRlci5cbiAgICAvLyBgc3RhcnRgOiBUaGUgbGVhZGluZyBzaWRlIG9mIHRoZSBmaXJzdCBlbGVtZW50LlxuICAgIC8vXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gfCAgICAgIGFHdXR0ZXJTaXplIC0+IHx8fCAgICAgICAgICAgICAgICAgICAgICB8XG4gICAgLy8gfCAgICAgICAgICAgICAgICAgICAgIHx8fCAgICAgICAgICAgICAgICAgICAgICB8XG4gICAgLy8gfCAgICAgICAgICAgICAgICAgICAgIHx8fCAgICAgICAgICAgICAgICAgICAgICB8XG4gICAgLy8gfCAgICAgICAgICAgICAgICAgICAgIHx8fCA8LSBiR3V0dGVyU2l6ZSAgICAgICB8XG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgLy8gfCA8LSBzdGFydCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZSAtPiB8XG4gICAgZnVuY3Rpb24gY2FsY3VsYXRlU2l6ZXMoKSB7XG4gICAgICAgIC8vIEZpZ3VyZSBvdXQgdGhlIHBhcmVudCBzaXplIG1pbnVzIHBhZGRpbmcuXG4gICAgICAgIHZhciBhID0gZWxlbWVudHNbdGhpcy5hXS5lbGVtZW50O1xuICAgICAgICB2YXIgYiA9IGVsZW1lbnRzW3RoaXMuYl0uZWxlbWVudDtcblxuICAgICAgICB2YXIgYUJvdW5kcyA9IGFbZ2V0Qm91bmRpbmdDbGllbnRSZWN0XSgpO1xuICAgICAgICB2YXIgYkJvdW5kcyA9IGJbZ2V0Qm91bmRpbmdDbGllbnRSZWN0XSgpO1xuXG4gICAgICAgIHRoaXMuc2l6ZSA9XG4gICAgICAgICAgICBhQm91bmRzW2RpbWVuc2lvbl0gK1xuICAgICAgICAgICAgYkJvdW5kc1tkaW1lbnNpb25dICtcbiAgICAgICAgICAgIHRoaXNbYUd1dHRlclNpemVdICtcbiAgICAgICAgICAgIHRoaXNbYkd1dHRlclNpemVdO1xuICAgICAgICB0aGlzLnN0YXJ0ID0gYUJvdW5kc1twb3NpdGlvbl07XG4gICAgICAgIHRoaXMuZW5kID0gYUJvdW5kc1twb3NpdGlvbkVuZF07XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5uZXJTaXplKGVsZW1lbnQpIHtcbiAgICAgICAgLy8gUmV0dXJuIG5vdGhpbmcgaWYgZ2V0Q29tcHV0ZWRTdHlsZSBpcyBub3Qgc3VwcG9ydGVkICg8IElFOSlcbiAgICAgICAgLy8gT3IgaWYgcGFyZW50IGVsZW1lbnQgaGFzIG5vIGxheW91dCB5ZXRcbiAgICAgICAgaWYgKCFnZXRDb21wdXRlZFN0eWxlKSB7IHJldHVybiBudWxsIH1cblxuICAgICAgICB2YXIgY29tcHV0ZWRTdHlsZSA9IGdldENvbXB1dGVkU3R5bGUoZWxlbWVudCk7XG5cbiAgICAgICAgaWYgKCFjb21wdXRlZFN0eWxlKSB7IHJldHVybiBudWxsIH1cblxuICAgICAgICB2YXIgc2l6ZSA9IGVsZW1lbnRbY2xpZW50U2l6ZV07XG5cbiAgICAgICAgaWYgKHNpemUgPT09IDApIHsgcmV0dXJuIG51bGwgfVxuXG4gICAgICAgIGlmIChkaXJlY3Rpb24gPT09IEhPUklaT05UQUwpIHtcbiAgICAgICAgICAgIHNpemUgLT1cbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGNvbXB1dGVkU3R5bGUucGFkZGluZ0xlZnQpICtcbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGNvbXB1dGVkU3R5bGUucGFkZGluZ1JpZ2h0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNpemUgLT1cbiAgICAgICAgICAgICAgICBwYXJzZUZsb2F0KGNvbXB1dGVkU3R5bGUucGFkZGluZ1RvcCkgK1xuICAgICAgICAgICAgICAgIHBhcnNlRmxvYXQoY29tcHV0ZWRTdHlsZS5wYWRkaW5nQm90dG9tKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBzaXplXG4gICAgfVxuXG4gICAgLy8gV2hlbiBzcGVjaWZ5aW5nIHBlcmNlbnRhZ2Ugc2l6ZXMgdGhhdCBhcmUgbGVzcyB0aGFuIHRoZSBjb21wdXRlZFxuICAgIC8vIHNpemUgb2YgdGhlIGVsZW1lbnQgbWludXMgdGhlIGd1dHRlciwgdGhlIGxlc3NlciBwZXJjZW50YWdlcyBtdXN0IGJlIGluY3JlYXNlZFxuICAgIC8vIChhbmQgZGVjcmVhc2VkIGZyb20gdGhlIG90aGVyIGVsZW1lbnRzKSB0byBtYWtlIHNwYWNlIGZvciB0aGUgcGl4ZWxzXG4gICAgLy8gc3VidHJhY3RlZCBieSB0aGUgZ3V0dGVycy5cbiAgICBmdW5jdGlvbiB0cmltVG9NaW4oc2l6ZXNUb1RyaW0pIHtcbiAgICAgICAgLy8gVHJ5IHRvIGdldCBpbm5lciBzaXplIG9mIHBhcmVudCBlbGVtZW50LlxuICAgICAgICAvLyBJZiBpdCdzIG5vIHN1cHBvcnRlZCwgcmV0dXJuIG9yaWdpbmFsIHNpemVzLlxuICAgICAgICB2YXIgcGFyZW50U2l6ZSA9IGlubmVyU2l6ZShwYXJlbnQpO1xuICAgICAgICBpZiAocGFyZW50U2l6ZSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIHNpemVzVG9UcmltXG4gICAgICAgIH1cblxuICAgICAgICBpZiAobWluU2l6ZXMucmVkdWNlKGZ1bmN0aW9uIChhLCBiKSB7IHJldHVybiBhICsgYjsgfSwgMCkgPiBwYXJlbnRTaXplKSB7XG4gICAgICAgICAgICByZXR1cm4gc2l6ZXNUb1RyaW1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEtlZXAgdHJhY2sgb2YgdGhlIGV4Y2VzcyBwaXhlbHMsIHRoZSBhbW91bnQgb2YgcGl4ZWxzIG92ZXIgdGhlIGRlc2lyZWQgcGVyY2VudGFnZVxuICAgICAgICAvLyBBbHNvIGtlZXAgdHJhY2sgb2YgdGhlIGVsZW1lbnRzIHdpdGggcGl4ZWxzIHRvIHNwYXJlLCB0byBkZWNyZWFzZSBhZnRlciBpZiBuZWVkZWRcbiAgICAgICAgdmFyIGV4Y2Vzc1BpeGVscyA9IDA7XG4gICAgICAgIHZhciB0b1NwYXJlID0gW107XG5cbiAgICAgICAgdmFyIHBpeGVsU2l6ZXMgPSBzaXplc1RvVHJpbS5tYXAoZnVuY3Rpb24gKHNpemUsIGkpIHtcbiAgICAgICAgICAgIC8vIENvbnZlcnQgcmVxdWVzdGVkIHBlcmNlbnRhZ2VzIHRvIHBpeGVsIHNpemVzXG4gICAgICAgICAgICB2YXIgcGl4ZWxTaXplID0gKHBhcmVudFNpemUgKiBzaXplKSAvIDEwMDtcbiAgICAgICAgICAgIHZhciBlbGVtZW50R3V0dGVyU2l6ZSA9IGdldEd1dHRlclNpemUoXG4gICAgICAgICAgICAgICAgZ3V0dGVyU2l6ZSxcbiAgICAgICAgICAgICAgICBpID09PSAwLFxuICAgICAgICAgICAgICAgIGkgPT09IHNpemVzVG9UcmltLmxlbmd0aCAtIDEsXG4gICAgICAgICAgICAgICAgZ3V0dGVyQWxpZ25cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICB2YXIgZWxlbWVudE1pblNpemUgPSBtaW5TaXplc1tpXSArIGVsZW1lbnRHdXR0ZXJTaXplO1xuXG4gICAgICAgICAgICAvLyBJZiBlbGVtZW50IGlzIHRvbyBzbWFsLCBpbmNyZWFzZSBleGNlc3MgcGl4ZWxzIGJ5IHRoZSBkaWZmZXJlbmNlXG4gICAgICAgICAgICAvLyBhbmQgbWFyayB0aGF0IGl0IGhhcyBubyBwaXhlbHMgdG8gc3BhcmVcbiAgICAgICAgICAgIGlmIChwaXhlbFNpemUgPCBlbGVtZW50TWluU2l6ZSkge1xuICAgICAgICAgICAgICAgIGV4Y2Vzc1BpeGVscyArPSBlbGVtZW50TWluU2l6ZSAtIHBpeGVsU2l6ZTtcbiAgICAgICAgICAgICAgICB0b1NwYXJlLnB1c2goMCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnRNaW5TaXplXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIE90aGVyd2lzZSwgbWFyayB0aGUgcGl4ZWxzIGl0IGhhcyB0byBzcGFyZSBhbmQgcmV0dXJuIGl0J3Mgb3JpZ2luYWwgc2l6ZVxuICAgICAgICAgICAgdG9TcGFyZS5wdXNoKHBpeGVsU2l6ZSAtIGVsZW1lbnRNaW5TaXplKTtcbiAgICAgICAgICAgIHJldHVybiBwaXhlbFNpemVcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSWYgbm90aGluZyB3YXMgYWRqdXN0ZWQsIHJldHVybiB0aGUgb3JpZ2luYWwgc2l6ZXNcbiAgICAgICAgaWYgKGV4Y2Vzc1BpeGVscyA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHNpemVzVG9UcmltXG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcGl4ZWxTaXplcy5tYXAoZnVuY3Rpb24gKHBpeGVsU2l6ZSwgaSkge1xuICAgICAgICAgICAgdmFyIG5ld1BpeGVsU2l6ZSA9IHBpeGVsU2l6ZTtcblxuICAgICAgICAgICAgLy8gV2hpbGUgdGhlcmUncyBzdGlsbCBwaXhlbHMgdG8gdGFrZSwgYW5kIHRoZXJlJ3MgZW5vdWdoIHBpeGVscyB0byBzcGFyZSxcbiAgICAgICAgICAgIC8vIHRha2UgYXMgbWFueSBhcyBwb3NzaWJsZSB1cCB0byB0aGUgdG90YWwgZXhjZXNzIHBpeGVsc1xuICAgICAgICAgICAgaWYgKGV4Y2Vzc1BpeGVscyA+IDAgJiYgdG9TcGFyZVtpXSAtIGV4Y2Vzc1BpeGVscyA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFrZW5QaXhlbHMgPSBNYXRoLm1pbihcbiAgICAgICAgICAgICAgICAgICAgZXhjZXNzUGl4ZWxzLFxuICAgICAgICAgICAgICAgICAgICB0b1NwYXJlW2ldIC0gZXhjZXNzUGl4ZWxzXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIFN1YnRyYWN0IHRoZSBhbW91bnQgdGFrZW4gZm9yIHRoZSBuZXh0IGl0ZXJhdGlvblxuICAgICAgICAgICAgICAgIGV4Y2Vzc1BpeGVscyAtPSB0YWtlblBpeGVscztcbiAgICAgICAgICAgICAgICBuZXdQaXhlbFNpemUgPSBwaXhlbFNpemUgLSB0YWtlblBpeGVscztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gUmV0dXJuIHRoZSBwaXhlbCBzaXplIGFkanVzdGVkIGFzIGEgcGVyY2VudGFnZVxuICAgICAgICAgICAgcmV0dXJuIChuZXdQaXhlbFNpemUgLyBwYXJlbnRTaXplKSAqIDEwMFxuICAgICAgICB9KVxuICAgIH1cblxuICAgIC8vIHN0b3BEcmFnZ2luZyBpcyB2ZXJ5IHNpbWlsYXIgdG8gc3RhcnREcmFnZ2luZyBpbiByZXZlcnNlLlxuICAgIGZ1bmN0aW9uIHN0b3BEcmFnZ2luZygpIHtcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgICAgICB2YXIgYSA9IGVsZW1lbnRzW3NlbGYuYV0uZWxlbWVudDtcbiAgICAgICAgdmFyIGIgPSBlbGVtZW50c1tzZWxmLmJdLmVsZW1lbnQ7XG5cbiAgICAgICAgaWYgKHNlbGYuZHJhZ2dpbmcpIHtcbiAgICAgICAgICAgIGdldE9wdGlvbihvcHRpb25zLCAnb25EcmFnRW5kJywgTk9PUCkoZ2V0U2l6ZXMoKSk7XG4gICAgICAgIH1cblxuICAgICAgICBzZWxmLmRyYWdnaW5nID0gZmFsc2U7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRoZSBzdG9yZWQgZXZlbnQgbGlzdGVuZXJzLiBUaGlzIGlzIHdoeSB3ZSBzdG9yZSB0aGVtLlxuICAgICAgICBnbG9iYWxbcmVtb3ZlRXZlbnRMaXN0ZW5lcl0oJ21vdXNldXAnLCBzZWxmLnN0b3ApO1xuICAgICAgICBnbG9iYWxbcmVtb3ZlRXZlbnRMaXN0ZW5lcl0oJ3RvdWNoZW5kJywgc2VsZi5zdG9wKTtcbiAgICAgICAgZ2xvYmFsW3JlbW92ZUV2ZW50TGlzdGVuZXJdKCd0b3VjaGNhbmNlbCcsIHNlbGYuc3RvcCk7XG4gICAgICAgIGdsb2JhbFtyZW1vdmVFdmVudExpc3RlbmVyXSgnbW91c2Vtb3ZlJywgc2VsZi5tb3ZlKTtcbiAgICAgICAgZ2xvYmFsW3JlbW92ZUV2ZW50TGlzdGVuZXJdKCd0b3VjaG1vdmUnLCBzZWxmLm1vdmUpO1xuXG4gICAgICAgIC8vIENsZWFyIGJvdW5kIGZ1bmN0aW9uIHJlZmVyZW5jZXNcbiAgICAgICAgc2VsZi5zdG9wID0gbnVsbDtcbiAgICAgICAgc2VsZi5tb3ZlID0gbnVsbDtcblxuICAgICAgICBhW3JlbW92ZUV2ZW50TGlzdGVuZXJdKCdzZWxlY3RzdGFydCcsIE5PT1ApO1xuICAgICAgICBhW3JlbW92ZUV2ZW50TGlzdGVuZXJdKCdkcmFnc3RhcnQnLCBOT09QKTtcbiAgICAgICAgYltyZW1vdmVFdmVudExpc3RlbmVyXSgnc2VsZWN0c3RhcnQnLCBOT09QKTtcbiAgICAgICAgYltyZW1vdmVFdmVudExpc3RlbmVyXSgnZHJhZ3N0YXJ0JywgTk9PUCk7XG5cbiAgICAgICAgYS5zdHlsZS51c2VyU2VsZWN0ID0gJyc7XG4gICAgICAgIGEuc3R5bGUud2Via2l0VXNlclNlbGVjdCA9ICcnO1xuICAgICAgICBhLnN0eWxlLk1velVzZXJTZWxlY3QgPSAnJztcbiAgICAgICAgYS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJyc7XG5cbiAgICAgICAgYi5zdHlsZS51c2VyU2VsZWN0ID0gJyc7XG4gICAgICAgIGIuc3R5bGUud2Via2l0VXNlclNlbGVjdCA9ICcnO1xuICAgICAgICBiLnN0eWxlLk1velVzZXJTZWxlY3QgPSAnJztcbiAgICAgICAgYi5zdHlsZS5wb2ludGVyRXZlbnRzID0gJyc7XG5cbiAgICAgICAgc2VsZi5ndXR0ZXIuc3R5bGUuY3Vyc29yID0gJyc7XG4gICAgICAgIHNlbGYucGFyZW50LnN0eWxlLmN1cnNvciA9ICcnO1xuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLmN1cnNvciA9ICcnO1xuICAgIH1cblxuICAgIC8vIHN0YXJ0RHJhZ2dpbmcgY2FsbHMgYGNhbGN1bGF0ZVNpemVzYCB0byBzdG9yZSB0aGUgaW5pdGFsIHNpemUgaW4gdGhlIHBhaXIgb2JqZWN0LlxuICAgIC8vIEl0IGFsc28gYWRkcyBldmVudCBsaXN0ZW5lcnMgZm9yIG1vdXNlL3RvdWNoIGV2ZW50cyxcbiAgICAvLyBhbmQgcHJldmVudHMgc2VsZWN0aW9uIHdoaWxlIGRyYWdnaW5nIHNvIGF2b2lkIHRoZSBzZWxlY3RpbmcgdGV4dC5cbiAgICBmdW5jdGlvbiBzdGFydERyYWdnaW5nKGUpIHtcbiAgICAgICAgLy8gUmlnaHQtY2xpY2tpbmcgY2FuJ3Qgc3RhcnQgZHJhZ2dpbmcuXG4gICAgICAgIGlmICgnYnV0dG9uJyBpbiBlICYmIGUuYnV0dG9uICE9PSAwKSB7XG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFsaWFzIGZyZXF1ZW50bHkgdXNlZCB2YXJpYWJsZXMgdG8gc2F2ZSBzcGFjZS4gMjAwIGJ5dGVzLlxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgICAgIHZhciBhID0gZWxlbWVudHNbc2VsZi5hXS5lbGVtZW50O1xuICAgICAgICB2YXIgYiA9IGVsZW1lbnRzW3NlbGYuYl0uZWxlbWVudDtcblxuICAgICAgICAvLyBDYWxsIHRoZSBvbkRyYWdTdGFydCBjYWxsYmFjay5cbiAgICAgICAgaWYgKCFzZWxmLmRyYWdnaW5nKSB7XG4gICAgICAgICAgICBnZXRPcHRpb24ob3B0aW9ucywgJ29uRHJhZ1N0YXJ0JywgTk9PUCkoZ2V0U2l6ZXMoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEb24ndCBhY3R1YWxseSBkcmFnIHRoZSBlbGVtZW50LiBXZSBlbXVsYXRlIHRoYXQgaW4gdGhlIGRyYWcgZnVuY3Rpb24uXG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAvLyBTZXQgdGhlIGRyYWdnaW5nIHByb3BlcnR5IG9mIHRoZSBwYWlyIG9iamVjdC5cbiAgICAgICAgc2VsZi5kcmFnZ2luZyA9IHRydWU7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHR3byBldmVudCBsaXN0ZW5lcnMgYm91bmQgdG8gdGhlIHNhbWUgcGFpciBvYmplY3QgYW5kIHN0b3JlXG4gICAgICAgIC8vIHRoZW0gaW4gdGhlIHBhaXIgb2JqZWN0LlxuICAgICAgICBzZWxmLm1vdmUgPSBkcmFnLmJpbmQoc2VsZik7XG4gICAgICAgIHNlbGYuc3RvcCA9IHN0b3BEcmFnZ2luZy5iaW5kKHNlbGYpO1xuXG4gICAgICAgIC8vIEFsbCB0aGUgYmluZGluZy4gYHdpbmRvd2AgZ2V0cyB0aGUgc3RvcCBldmVudHMgaW4gY2FzZSB3ZSBkcmFnIG91dCBvZiB0aGUgZWxlbWVudHMuXG4gICAgICAgIGdsb2JhbFthZGRFdmVudExpc3RlbmVyXSgnbW91c2V1cCcsIHNlbGYuc3RvcCk7XG4gICAgICAgIGdsb2JhbFthZGRFdmVudExpc3RlbmVyXSgndG91Y2hlbmQnLCBzZWxmLnN0b3ApO1xuICAgICAgICBnbG9iYWxbYWRkRXZlbnRMaXN0ZW5lcl0oJ3RvdWNoY2FuY2VsJywgc2VsZi5zdG9wKTtcbiAgICAgICAgZ2xvYmFsW2FkZEV2ZW50TGlzdGVuZXJdKCdtb3VzZW1vdmUnLCBzZWxmLm1vdmUpO1xuICAgICAgICBnbG9iYWxbYWRkRXZlbnRMaXN0ZW5lcl0oJ3RvdWNobW92ZScsIHNlbGYubW92ZSk7XG5cbiAgICAgICAgLy8gRGlzYWJsZSBzZWxlY3Rpb24uIERpc2FibGUhXG4gICAgICAgIGFbYWRkRXZlbnRMaXN0ZW5lcl0oJ3NlbGVjdHN0YXJ0JywgTk9PUCk7XG4gICAgICAgIGFbYWRkRXZlbnRMaXN0ZW5lcl0oJ2RyYWdzdGFydCcsIE5PT1ApO1xuICAgICAgICBiW2FkZEV2ZW50TGlzdGVuZXJdKCdzZWxlY3RzdGFydCcsIE5PT1ApO1xuICAgICAgICBiW2FkZEV2ZW50TGlzdGVuZXJdKCdkcmFnc3RhcnQnLCBOT09QKTtcblxuICAgICAgICBhLnN0eWxlLnVzZXJTZWxlY3QgPSAnbm9uZSc7XG4gICAgICAgIGEuc3R5bGUud2Via2l0VXNlclNlbGVjdCA9ICdub25lJztcbiAgICAgICAgYS5zdHlsZS5Nb3pVc2VyU2VsZWN0ID0gJ25vbmUnO1xuICAgICAgICBhLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnbm9uZSc7XG5cbiAgICAgICAgYi5zdHlsZS51c2VyU2VsZWN0ID0gJ25vbmUnO1xuICAgICAgICBiLnN0eWxlLndlYmtpdFVzZXJTZWxlY3QgPSAnbm9uZSc7XG4gICAgICAgIGIuc3R5bGUuTW96VXNlclNlbGVjdCA9ICdub25lJztcbiAgICAgICAgYi5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xuXG4gICAgICAgIC8vIFNldCB0aGUgY3Vyc29yIGF0IG11bHRpcGxlIGxldmVsc1xuICAgICAgICBzZWxmLmd1dHRlci5zdHlsZS5jdXJzb3IgPSBjdXJzb3I7XG4gICAgICAgIHNlbGYucGFyZW50LnN0eWxlLmN1cnNvciA9IGN1cnNvcjtcbiAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5jdXJzb3IgPSBjdXJzb3I7XG5cbiAgICAgICAgLy8gQ2FjaGUgdGhlIGluaXRpYWwgc2l6ZXMgb2YgdGhlIHBhaXIuXG4gICAgICAgIGNhbGN1bGF0ZVNpemVzLmNhbGwoc2VsZik7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBwb3NpdGlvbiBvZiB0aGUgbW91c2UgY29tcGFyZWQgdG8gdGhlIGd1dHRlclxuICAgICAgICBzZWxmLmRyYWdPZmZzZXQgPSBnZXRNb3VzZVBvc2l0aW9uKGUpIC0gc2VsZi5lbmQ7XG4gICAgfVxuXG4gICAgLy8gYWRqdXN0IHNpemVzIHRvIGVuc3VyZSBwZXJjZW50YWdlIGlzIHdpdGhpbiBtaW4gc2l6ZSBhbmQgZ3V0dGVyLlxuICAgIHNpemVzID0gdHJpbVRvTWluKHNpemVzKTtcblxuICAgIC8vIDUuIENyZWF0ZSBwYWlyIGFuZCBlbGVtZW50IG9iamVjdHMuIEVhY2ggcGFpciBoYXMgYW4gaW5kZXggcmVmZXJlbmNlIHRvXG4gICAgLy8gZWxlbWVudHMgYGFgIGFuZCBgYmAgb2YgdGhlIHBhaXIgKGZpcnN0IGFuZCBzZWNvbmQgZWxlbWVudHMpLlxuICAgIC8vIExvb3AgdGhyb3VnaCB0aGUgZWxlbWVudHMgd2hpbGUgcGFpcmluZyB0aGVtIG9mZi4gRXZlcnkgcGFpciBnZXRzIGFcbiAgICAvLyBgcGFpcmAgb2JqZWN0IGFuZCBhIGd1dHRlci5cbiAgICAvL1xuICAgIC8vIEJhc2ljIGxvZ2ljOlxuICAgIC8vXG4gICAgLy8gLSBTdGFydGluZyB3aXRoIHRoZSBzZWNvbmQgZWxlbWVudCBgaSA+IDBgLCBjcmVhdGUgYHBhaXJgIG9iamVjdHMgd2l0aFxuICAgIC8vICAgYGEgPSBpIC0gMWAgYW5kIGBiID0gaWBcbiAgICAvLyAtIFNldCBndXR0ZXIgc2l6ZXMgYmFzZWQgb24gdGhlIF9wYWlyXyBiZWluZyBmaXJzdC9sYXN0LiBUaGUgZmlyc3QgYW5kIGxhc3RcbiAgICAvLyAgIHBhaXIgaGF2ZSBndXR0ZXJTaXplIC8gMiwgc2luY2UgdGhleSBvbmx5IGhhdmUgb25lIGhhbGYgZ3V0dGVyLCBhbmQgbm90IHR3by5cbiAgICAvLyAtIENyZWF0ZSBndXR0ZXIgZWxlbWVudHMgYW5kIGFkZCBldmVudCBsaXN0ZW5lcnMuXG4gICAgLy8gLSBTZXQgdGhlIHNpemUgb2YgdGhlIGVsZW1lbnRzLCBtaW51cyB0aGUgZ3V0dGVyIHNpemVzLlxuICAgIC8vXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAvLyB8ICAgICBpPTAgICAgIHwgICAgICAgICBpPTEgICAgICAgICB8ICAgICAgICBpPTIgICAgICAgfCAgICAgIGk9MyAgICAgfFxuICAgIC8vIHwgICAgICAgICAgICAgfCAgICAgICAgICAgICAgICAgICAgIHwgICAgICAgICAgICAgICAgICB8ICAgICAgICAgICAgICB8XG4gICAgLy8gfCAgICAgICAgICAgcGFpciAwICAgICAgICAgICAgICAgIHBhaXIgMSAgICAgICAgICAgICBwYWlyIDIgICAgICAgICAgIHxcbiAgICAvLyB8ICAgICAgICAgICAgIHwgICAgICAgICAgICAgICAgICAgICB8ICAgICAgICAgICAgICAgICAgfCAgICAgICAgICAgICAgfFxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgdmFyIHBhaXJzID0gW107XG4gICAgZWxlbWVudHMgPSBpZHMubWFwKGZ1bmN0aW9uIChpZCwgaSkge1xuICAgICAgICAvLyBDcmVhdGUgdGhlIGVsZW1lbnQgb2JqZWN0LlxuICAgICAgICB2YXIgZWxlbWVudCA9IHtcbiAgICAgICAgICAgIGVsZW1lbnQ6IGVsZW1lbnRPclNlbGVjdG9yKGlkKSxcbiAgICAgICAgICAgIHNpemU6IHNpemVzW2ldLFxuICAgICAgICAgICAgbWluU2l6ZTogbWluU2l6ZXNbaV0sXG4gICAgICAgICAgICBtYXhTaXplOiBtYXhTaXplc1tpXSxcbiAgICAgICAgICAgIHNuYXBPZmZzZXQ6IHNuYXBPZmZzZXRzW2ldLFxuICAgICAgICAgICAgaTogaSxcbiAgICAgICAgfTtcblxuICAgICAgICB2YXIgcGFpcjtcblxuICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgIC8vIENyZWF0ZSB0aGUgcGFpciBvYmplY3Qgd2l0aCBpdHMgbWV0YWRhdGEuXG4gICAgICAgICAgICBwYWlyID0ge1xuICAgICAgICAgICAgICAgIGE6IGkgLSAxLFxuICAgICAgICAgICAgICAgIGI6IGksXG4gICAgICAgICAgICAgICAgZHJhZ2dpbmc6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogZGlyZWN0aW9uLFxuICAgICAgICAgICAgICAgIHBhcmVudDogcGFyZW50LFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcGFpclthR3V0dGVyU2l6ZV0gPSBnZXRHdXR0ZXJTaXplKFxuICAgICAgICAgICAgICAgIGd1dHRlclNpemUsXG4gICAgICAgICAgICAgICAgaSAtIDEgPT09IDAsXG4gICAgICAgICAgICAgICAgZmFsc2UsXG4gICAgICAgICAgICAgICAgZ3V0dGVyQWxpZ25cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBwYWlyW2JHdXR0ZXJTaXplXSA9IGdldEd1dHRlclNpemUoXG4gICAgICAgICAgICAgICAgZ3V0dGVyU2l6ZSxcbiAgICAgICAgICAgICAgICBmYWxzZSxcbiAgICAgICAgICAgICAgICBpID09PSBpZHMubGVuZ3RoIC0gMSxcbiAgICAgICAgICAgICAgICBndXR0ZXJBbGlnblxuICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgLy8gaWYgdGhlIHBhcmVudCBoYXMgYSByZXZlcnNlIGZsZXgtZGlyZWN0aW9uLCBzd2l0Y2ggdGhlIHBhaXIgZWxlbWVudHMuXG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgICAgcGFyZW50RmxleERpcmVjdGlvbiA9PT0gJ3Jvdy1yZXZlcnNlJyB8fFxuICAgICAgICAgICAgICAgIHBhcmVudEZsZXhEaXJlY3Rpb24gPT09ICdjb2x1bW4tcmV2ZXJzZSdcbiAgICAgICAgICAgICkge1xuICAgICAgICAgICAgICAgIHZhciB0ZW1wID0gcGFpci5hO1xuICAgICAgICAgICAgICAgIHBhaXIuYSA9IHBhaXIuYjtcbiAgICAgICAgICAgICAgICBwYWlyLmIgPSB0ZW1wO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIHRoZSBzaXplIG9mIHRoZSBjdXJyZW50IGVsZW1lbnQuIElFOCBpcyBzdXBwb3J0ZWQgYnlcbiAgICAgICAgLy8gc3RhdGljbHkgYXNzaWduaW5nIHNpemVzIHdpdGhvdXQgZHJhZ2dhYmxlIGd1dHRlcnMuIEFzc2lnbnMgYSBzdHJpbmdcbiAgICAgICAgLy8gdG8gYHNpemVgLlxuICAgICAgICAvL1xuICAgICAgICAvLyBDcmVhdGUgZ3V0dGVyIGVsZW1lbnRzIGZvciBlYWNoIHBhaXIuXG4gICAgICAgIGlmIChpID4gMCkge1xuICAgICAgICAgICAgdmFyIGd1dHRlckVsZW1lbnQgPSBndXR0ZXIoaSwgZGlyZWN0aW9uLCBlbGVtZW50LmVsZW1lbnQpO1xuICAgICAgICAgICAgc2V0R3V0dGVyU2l6ZShndXR0ZXJFbGVtZW50LCBndXR0ZXJTaXplLCBpKTtcblxuICAgICAgICAgICAgLy8gU2F2ZSBib3VuZCBldmVudCBsaXN0ZW5lciBmb3IgcmVtb3ZhbCBsYXRlclxuICAgICAgICAgICAgcGFpcltndXR0ZXJTdGFydERyYWdnaW5nXSA9IHN0YXJ0RHJhZ2dpbmcuYmluZChwYWlyKTtcblxuICAgICAgICAgICAgLy8gQXR0YWNoIGJvdW5kIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgICAgICBndXR0ZXJFbGVtZW50W2FkZEV2ZW50TGlzdGVuZXJdKFxuICAgICAgICAgICAgICAgICdtb3VzZWRvd24nLFxuICAgICAgICAgICAgICAgIHBhaXJbZ3V0dGVyU3RhcnREcmFnZ2luZ11cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBndXR0ZXJFbGVtZW50W2FkZEV2ZW50TGlzdGVuZXJdKFxuICAgICAgICAgICAgICAgICd0b3VjaHN0YXJ0JyxcbiAgICAgICAgICAgICAgICBwYWlyW2d1dHRlclN0YXJ0RHJhZ2dpbmddXG4gICAgICAgICAgICApO1xuXG4gICAgICAgICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKGd1dHRlckVsZW1lbnQsIGVsZW1lbnQuZWxlbWVudCk7XG5cbiAgICAgICAgICAgIHBhaXIuZ3V0dGVyID0gZ3V0dGVyRWxlbWVudDtcbiAgICAgICAgfVxuXG4gICAgICAgIHNldEVsZW1lbnRTaXplKFxuICAgICAgICAgICAgZWxlbWVudC5lbGVtZW50LFxuICAgICAgICAgICAgZWxlbWVudC5zaXplLFxuICAgICAgICAgICAgZ2V0R3V0dGVyU2l6ZShcbiAgICAgICAgICAgICAgICBndXR0ZXJTaXplLFxuICAgICAgICAgICAgICAgIGkgPT09IDAsXG4gICAgICAgICAgICAgICAgaSA9PT0gaWRzLmxlbmd0aCAtIDEsXG4gICAgICAgICAgICAgICAgZ3V0dGVyQWxpZ25cbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBpXG4gICAgICAgICk7XG5cbiAgICAgICAgLy8gQWZ0ZXIgdGhlIGZpcnN0IGl0ZXJhdGlvbiwgYW5kIHdlIGhhdmUgYSBwYWlyIG9iamVjdCwgYXBwZW5kIGl0IHRvIHRoZVxuICAgICAgICAvLyBsaXN0IG9mIHBhaXJzLlxuICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgIHBhaXJzLnB1c2gocGFpcik7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gZWxlbWVudFxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gYWRqdXN0VG9NaW4oZWxlbWVudCkge1xuICAgICAgICB2YXIgaXNMYXN0ID0gZWxlbWVudC5pID09PSBwYWlycy5sZW5ndGg7XG4gICAgICAgIHZhciBwYWlyID0gaXNMYXN0ID8gcGFpcnNbZWxlbWVudC5pIC0gMV0gOiBwYWlyc1tlbGVtZW50LmldO1xuXG4gICAgICAgIGNhbGN1bGF0ZVNpemVzLmNhbGwocGFpcik7XG5cbiAgICAgICAgdmFyIHNpemUgPSBpc0xhc3RcbiAgICAgICAgICAgID8gcGFpci5zaXplIC0gZWxlbWVudC5taW5TaXplIC0gcGFpcltiR3V0dGVyU2l6ZV1cbiAgICAgICAgICAgIDogZWxlbWVudC5taW5TaXplICsgcGFpclthR3V0dGVyU2l6ZV07XG5cbiAgICAgICAgYWRqdXN0LmNhbGwocGFpciwgc2l6ZSk7XG4gICAgfVxuXG4gICAgZWxlbWVudHMuZm9yRWFjaChmdW5jdGlvbiAoZWxlbWVudCkge1xuICAgICAgICB2YXIgY29tcHV0ZWRTaXplID0gZWxlbWVudC5lbGVtZW50W2dldEJvdW5kaW5nQ2xpZW50UmVjdF0oKVtkaW1lbnNpb25dO1xuXG4gICAgICAgIGlmIChjb21wdXRlZFNpemUgPCBlbGVtZW50Lm1pblNpemUpIHtcbiAgICAgICAgICAgIGlmIChleHBhbmRUb01pbikge1xuICAgICAgICAgICAgICAgIGFkanVzdFRvTWluKGVsZW1lbnQpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tcGFyYW0tcmVhc3NpZ25cbiAgICAgICAgICAgICAgICBlbGVtZW50Lm1pblNpemUgPSBjb21wdXRlZFNpemU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIHNldFNpemVzKG5ld1NpemVzKSB7XG4gICAgICAgIHZhciB0cmltbWVkID0gdHJpbVRvTWluKG5ld1NpemVzKTtcbiAgICAgICAgdHJpbW1lZC5mb3JFYWNoKGZ1bmN0aW9uIChuZXdTaXplLCBpKSB7XG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcbiAgICAgICAgICAgICAgICB2YXIgcGFpciA9IHBhaXJzW2kgLSAxXTtcblxuICAgICAgICAgICAgICAgIHZhciBhID0gZWxlbWVudHNbcGFpci5hXTtcbiAgICAgICAgICAgICAgICB2YXIgYiA9IGVsZW1lbnRzW3BhaXIuYl07XG5cbiAgICAgICAgICAgICAgICBhLnNpemUgPSB0cmltbWVkW2kgLSAxXTtcbiAgICAgICAgICAgICAgICBiLnNpemUgPSBuZXdTaXplO1xuXG4gICAgICAgICAgICAgICAgc2V0RWxlbWVudFNpemUoYS5lbGVtZW50LCBhLnNpemUsIHBhaXJbYUd1dHRlclNpemVdLCBhLmkpO1xuICAgICAgICAgICAgICAgIHNldEVsZW1lbnRTaXplKGIuZWxlbWVudCwgYi5zaXplLCBwYWlyW2JHdXR0ZXJTaXplXSwgYi5pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGVzdHJveShwcmVzZXJ2ZVN0eWxlcywgcHJlc2VydmVHdXR0ZXIpIHtcbiAgICAgICAgcGFpcnMuZm9yRWFjaChmdW5jdGlvbiAocGFpcikge1xuICAgICAgICAgICAgaWYgKHByZXNlcnZlR3V0dGVyICE9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgcGFpci5wYXJlbnQucmVtb3ZlQ2hpbGQocGFpci5ndXR0ZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBwYWlyLmd1dHRlcltyZW1vdmVFdmVudExpc3RlbmVyXShcbiAgICAgICAgICAgICAgICAgICAgJ21vdXNlZG93bicsXG4gICAgICAgICAgICAgICAgICAgIHBhaXJbZ3V0dGVyU3RhcnREcmFnZ2luZ11cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHBhaXIuZ3V0dGVyW3JlbW92ZUV2ZW50TGlzdGVuZXJdKFxuICAgICAgICAgICAgICAgICAgICAndG91Y2hzdGFydCcsXG4gICAgICAgICAgICAgICAgICAgIHBhaXJbZ3V0dGVyU3RhcnREcmFnZ2luZ11cbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocHJlc2VydmVTdHlsZXMgIT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICB2YXIgc3R5bGUgPSBlbGVtZW50U3R5bGUoXG4gICAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbixcbiAgICAgICAgICAgICAgICAgICAgcGFpci5hLnNpemUsXG4gICAgICAgICAgICAgICAgICAgIHBhaXJbYUd1dHRlclNpemVdXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzKHN0eWxlKS5mb3JFYWNoKGZ1bmN0aW9uIChwcm9wKSB7XG4gICAgICAgICAgICAgICAgICAgIGVsZW1lbnRzW3BhaXIuYV0uZWxlbWVudC5zdHlsZVtwcm9wXSA9ICcnO1xuICAgICAgICAgICAgICAgICAgICBlbGVtZW50c1twYWlyLmJdLmVsZW1lbnQuc3R5bGVbcHJvcF0gPSAnJztcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgc2V0U2l6ZXM6IHNldFNpemVzLFxuICAgICAgICBnZXRTaXplczogZ2V0U2l6ZXMsXG4gICAgICAgIGNvbGxhcHNlOiBmdW5jdGlvbiBjb2xsYXBzZShpKSB7XG4gICAgICAgICAgICBhZGp1c3RUb01pbihlbGVtZW50c1tpXSk7XG4gICAgICAgIH0sXG4gICAgICAgIGRlc3Ryb3k6IGRlc3Ryb3ksXG4gICAgICAgIHBhcmVudDogcGFyZW50LFxuICAgICAgICBwYWlyczogcGFpcnMsXG4gICAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgU3BsaXQ7XG4iLCJcbiAgICAgIGltcG9ydCBBUEkgZnJvbSBcIiEuLi8uLi9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uLy4uL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uLy4uL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0QnlTZWxlY3Rvci5qc1wiO1xuICAgICAgaW1wb3J0IHNldEF0dHJpYnV0ZXMgZnJvbSBcIiEuLi8uLi9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uLy4uL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uLy4uL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVUYWdUcmFuc2Zvcm0uanNcIjtcbiAgICAgIGltcG9ydCBjb250ZW50LCAqIGFzIG5hbWVkRXhwb3J0IGZyb20gXCIhIS4uLy4uL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi4vLi4vc2Fzcy1sb2FkZXIvZGlzdC9janMuanMhLi9wcmlzbS1kYXJrLmNzc1wiO1xuICAgICAgXG4gICAgICBcblxudmFyIG9wdGlvbnMgPSB7fTtcblxub3B0aW9ucy5zdHlsZVRhZ1RyYW5zZm9ybSA9IHN0eWxlVGFnVHJhbnNmb3JtRm47XG5vcHRpb25zLnNldEF0dHJpYnV0ZXMgPSBzZXRBdHRyaWJ1dGVzO1xuXG4gICAgICBvcHRpb25zLmluc2VydCA9IGluc2VydEZuLmJpbmQobnVsbCwgXCJoZWFkXCIpO1xuICAgIFxub3B0aW9ucy5kb21BUEkgPSBkb21BUEk7XG5vcHRpb25zLmluc2VydFN0eWxlRWxlbWVudCA9IGluc2VydFN0eWxlRWxlbWVudDtcblxudmFyIHVwZGF0ZSA9IEFQSShjb250ZW50LCBvcHRpb25zKTtcblxuXG5cbmV4cG9ydCAqIGZyb20gXCIhIS4uLy4uL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi4vLi4vc2Fzcy1sb2FkZXIvZGlzdC9janMuanMhLi9wcmlzbS1kYXJrLmNzc1wiO1xuICAgICAgIGV4cG9ydCBkZWZhdWx0IGNvbnRlbnQgJiYgY29udGVudC5sb2NhbHMgPyBjb250ZW50LmxvY2FscyA6IHVuZGVmaW5lZDtcbiIsIlxuICAgICAgaW1wb3J0IEFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luamVjdFN0eWxlc0ludG9TdHlsZVRhZy5qc1wiO1xuICAgICAgaW1wb3J0IGRvbUFQSSBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlRG9tQVBJLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0Rm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9pbnNlcnRCeVNlbGVjdG9yLmpzXCI7XG4gICAgICBpbXBvcnQgc2V0QXR0cmlidXRlcyBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3NldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlcy5qc1wiO1xuICAgICAgaW1wb3J0IGluc2VydFN0eWxlRWxlbWVudCBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydFN0eWxlRWxlbWVudC5qc1wiO1xuICAgICAgaW1wb3J0IHN0eWxlVGFnVHJhbnNmb3JtRm4gZnJvbSBcIiEuLi9ub2RlX21vZHVsZXMvc3R5bGUtbG9hZGVyL2Rpc3QvcnVudGltZS9zdHlsZVRhZ1RyYW5zZm9ybS5qc1wiO1xuICAgICAgaW1wb3J0IGNvbnRlbnQsICogYXMgbmFtZWRFeHBvcnQgZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi4vbm9kZV9tb2R1bGVzL3Nhc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vY29kZWVkaXRvci5zY3NzXCI7XG4gICAgICBcbiAgICAgIFxuXG52YXIgb3B0aW9ucyA9IHt9O1xuXG5vcHRpb25zLnN0eWxlVGFnVHJhbnNmb3JtID0gc3R5bGVUYWdUcmFuc2Zvcm1Gbjtcbm9wdGlvbnMuc2V0QXR0cmlidXRlcyA9IHNldEF0dHJpYnV0ZXM7XG5cbiAgICAgIG9wdGlvbnMuaW5zZXJ0ID0gaW5zZXJ0Rm4uYmluZChudWxsLCBcImhlYWRcIik7XG4gICAgXG5vcHRpb25zLmRvbUFQSSA9IGRvbUFQSTtcbm9wdGlvbnMuaW5zZXJ0U3R5bGVFbGVtZW50ID0gaW5zZXJ0U3R5bGVFbGVtZW50O1xuXG52YXIgdXBkYXRlID0gQVBJKGNvbnRlbnQsIG9wdGlvbnMpO1xuXG5cblxuZXhwb3J0ICogZnJvbSBcIiEhLi4vbm9kZV9tb2R1bGVzL2Nzcy1sb2FkZXIvZGlzdC9janMuanMhLi4vbm9kZV9tb2R1bGVzL3Nhc3MtbG9hZGVyL2Rpc3QvY2pzLmpzIS4vY29kZWVkaXRvci5zY3NzXCI7XG4gICAgICAgZXhwb3J0IGRlZmF1bHQgY29udGVudCAmJiBjb250ZW50LmxvY2FscyA/IGNvbnRlbnQubG9jYWxzIDogdW5kZWZpbmVkO1xuIiwiXG4gICAgICBpbXBvcnQgQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5qZWN0U3R5bGVzSW50b1N0eWxlVGFnLmpzXCI7XG4gICAgICBpbXBvcnQgZG9tQVBJIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc3R5bGVEb21BUEkuanNcIjtcbiAgICAgIGltcG9ydCBpbnNlcnRGbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL2luc2VydEJ5U2VsZWN0b3IuanNcIjtcbiAgICAgIGltcG9ydCBzZXRBdHRyaWJ1dGVzIGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzLmpzXCI7XG4gICAgICBpbXBvcnQgaW5zZXJ0U3R5bGVFbGVtZW50IGZyb20gXCIhLi4vbm9kZV9tb2R1bGVzL3N0eWxlLWxvYWRlci9kaXN0L3J1bnRpbWUvaW5zZXJ0U3R5bGVFbGVtZW50LmpzXCI7XG4gICAgICBpbXBvcnQgc3R5bGVUYWdUcmFuc2Zvcm1GbiBmcm9tIFwiIS4uL25vZGVfbW9kdWxlcy9zdHlsZS1sb2FkZXIvZGlzdC9ydW50aW1lL3N0eWxlVGFnVHJhbnNmb3JtLmpzXCI7XG4gICAgICBpbXBvcnQgY29udGVudCwgKiBhcyBuYW1lZEV4cG9ydCBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuLi9ub2RlX21vZHVsZXMvc2Fzcy1sb2FkZXIvZGlzdC9janMuanMhLi9maWRkbGVyLnNjc3NcIjtcbiAgICAgIFxuICAgICAgXG5cbnZhciBvcHRpb25zID0ge307XG5cbm9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0gPSBzdHlsZVRhZ1RyYW5zZm9ybUZuO1xub3B0aW9ucy5zZXRBdHRyaWJ1dGVzID0gc2V0QXR0cmlidXRlcztcblxuICAgICAgb3B0aW9ucy5pbnNlcnQgPSBpbnNlcnRGbi5iaW5kKG51bGwsIFwiaGVhZFwiKTtcbiAgICBcbm9wdGlvbnMuZG9tQVBJID0gZG9tQVBJO1xub3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7XG5cbnZhciB1cGRhdGUgPSBBUEkoY29udGVudCwgb3B0aW9ucyk7XG5cblxuXG5leHBvcnQgKiBmcm9tIFwiISEuLi9ub2RlX21vZHVsZXMvY3NzLWxvYWRlci9kaXN0L2Nqcy5qcyEuLi9ub2RlX21vZHVsZXMvc2Fzcy1sb2FkZXIvZGlzdC9janMuanMhLi9maWRkbGVyLnNjc3NcIjtcbiAgICAgICBleHBvcnQgZGVmYXVsdCBjb250ZW50ICYmIGNvbnRlbnQubG9jYWxzID8gY29udGVudC5sb2NhbHMgOiB1bmRlZmluZWQ7XG4iLCJcInVzZSBzdHJpY3RcIjtcblxudmFyIHN0eWxlc0luRE9NID0gW107XG5cbmZ1bmN0aW9uIGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpIHtcbiAgdmFyIHJlc3VsdCA9IC0xO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgc3R5bGVzSW5ET00ubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3R5bGVzSW5ET01baV0uaWRlbnRpZmllciA9PT0gaWRlbnRpZmllcikge1xuICAgICAgcmVzdWx0ID0gaTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59XG5cbmZ1bmN0aW9uIG1vZHVsZXNUb0RvbShsaXN0LCBvcHRpb25zKSB7XG4gIHZhciBpZENvdW50TWFwID0ge307XG4gIHZhciBpZGVudGlmaWVycyA9IFtdO1xuXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdC5sZW5ndGg7IGkrKykge1xuICAgIHZhciBpdGVtID0gbGlzdFtpXTtcbiAgICB2YXIgaWQgPSBvcHRpb25zLmJhc2UgPyBpdGVtWzBdICsgb3B0aW9ucy5iYXNlIDogaXRlbVswXTtcbiAgICB2YXIgY291bnQgPSBpZENvdW50TWFwW2lkXSB8fCAwO1xuICAgIHZhciBpZGVudGlmaWVyID0gXCJcIi5jb25jYXQoaWQsIFwiIFwiKS5jb25jYXQoY291bnQpO1xuICAgIGlkQ291bnRNYXBbaWRdID0gY291bnQgKyAxO1xuICAgIHZhciBpbmRleEJ5SWRlbnRpZmllciA9IGdldEluZGV4QnlJZGVudGlmaWVyKGlkZW50aWZpZXIpO1xuICAgIHZhciBvYmogPSB7XG4gICAgICBjc3M6IGl0ZW1bMV0sXG4gICAgICBtZWRpYTogaXRlbVsyXSxcbiAgICAgIHNvdXJjZU1hcDogaXRlbVszXSxcbiAgICAgIHN1cHBvcnRzOiBpdGVtWzRdLFxuICAgICAgbGF5ZXI6IGl0ZW1bNV1cbiAgICB9O1xuXG4gICAgaWYgKGluZGV4QnlJZGVudGlmaWVyICE9PSAtMSkge1xuICAgICAgc3R5bGVzSW5ET01baW5kZXhCeUlkZW50aWZpZXJdLnJlZmVyZW5jZXMrKztcbiAgICAgIHN0eWxlc0luRE9NW2luZGV4QnlJZGVudGlmaWVyXS51cGRhdGVyKG9iaik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciB1cGRhdGVyID0gYWRkRWxlbWVudFN0eWxlKG9iaiwgb3B0aW9ucyk7XG4gICAgICBvcHRpb25zLmJ5SW5kZXggPSBpO1xuICAgICAgc3R5bGVzSW5ET00uc3BsaWNlKGksIDAsIHtcbiAgICAgICAgaWRlbnRpZmllcjogaWRlbnRpZmllcixcbiAgICAgICAgdXBkYXRlcjogdXBkYXRlcixcbiAgICAgICAgcmVmZXJlbmNlczogMVxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgaWRlbnRpZmllcnMucHVzaChpZGVudGlmaWVyKTtcbiAgfVxuXG4gIHJldHVybiBpZGVudGlmaWVycztcbn1cblxuZnVuY3Rpb24gYWRkRWxlbWVudFN0eWxlKG9iaiwgb3B0aW9ucykge1xuICB2YXIgYXBpID0gb3B0aW9ucy5kb21BUEkob3B0aW9ucyk7XG4gIGFwaS51cGRhdGUob2JqKTtcblxuICB2YXIgdXBkYXRlciA9IGZ1bmN0aW9uIHVwZGF0ZXIobmV3T2JqKSB7XG4gICAgaWYgKG5ld09iaikge1xuICAgICAgaWYgKG5ld09iai5jc3MgPT09IG9iai5jc3MgJiYgbmV3T2JqLm1lZGlhID09PSBvYmoubWVkaWEgJiYgbmV3T2JqLnNvdXJjZU1hcCA9PT0gb2JqLnNvdXJjZU1hcCAmJiBuZXdPYmouc3VwcG9ydHMgPT09IG9iai5zdXBwb3J0cyAmJiBuZXdPYmoubGF5ZXIgPT09IG9iai5sYXllcikge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGFwaS51cGRhdGUob2JqID0gbmV3T2JqKTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBpLnJlbW92ZSgpO1xuICAgIH1cbiAgfTtcblxuICByZXR1cm4gdXBkYXRlcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAobGlzdCwgb3B0aW9ucykge1xuICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgbGlzdCA9IGxpc3QgfHwgW107XG4gIHZhciBsYXN0SWRlbnRpZmllcnMgPSBtb2R1bGVzVG9Eb20obGlzdCwgb3B0aW9ucyk7XG4gIHJldHVybiBmdW5jdGlvbiB1cGRhdGUobmV3TGlzdCkge1xuICAgIG5ld0xpc3QgPSBuZXdMaXN0IHx8IFtdO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsYXN0SWRlbnRpZmllcnMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBpZGVudGlmaWVyID0gbGFzdElkZW50aWZpZXJzW2ldO1xuICAgICAgdmFyIGluZGV4ID0gZ2V0SW5kZXhCeUlkZW50aWZpZXIoaWRlbnRpZmllcik7XG4gICAgICBzdHlsZXNJbkRPTVtpbmRleF0ucmVmZXJlbmNlcy0tO1xuICAgIH1cblxuICAgIHZhciBuZXdMYXN0SWRlbnRpZmllcnMgPSBtb2R1bGVzVG9Eb20obmV3TGlzdCwgb3B0aW9ucyk7XG5cbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgbGFzdElkZW50aWZpZXJzLmxlbmd0aDsgX2krKykge1xuICAgICAgdmFyIF9pZGVudGlmaWVyID0gbGFzdElkZW50aWZpZXJzW19pXTtcblxuICAgICAgdmFyIF9pbmRleCA9IGdldEluZGV4QnlJZGVudGlmaWVyKF9pZGVudGlmaWVyKTtcblxuICAgICAgaWYgKHN0eWxlc0luRE9NW19pbmRleF0ucmVmZXJlbmNlcyA9PT0gMCkge1xuICAgICAgICBzdHlsZXNJbkRPTVtfaW5kZXhdLnVwZGF0ZXIoKTtcblxuICAgICAgICBzdHlsZXNJbkRPTS5zcGxpY2UoX2luZGV4LCAxKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBsYXN0SWRlbnRpZmllcnMgPSBuZXdMYXN0SWRlbnRpZmllcnM7XG4gIH07XG59OyIsIlwidXNlIHN0cmljdFwiO1xuXG52YXIgbWVtbyA9IHt9O1xuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5cbmZ1bmN0aW9uIGdldFRhcmdldCh0YXJnZXQpIHtcbiAgaWYgKHR5cGVvZiBtZW1vW3RhcmdldF0gPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICB2YXIgc3R5bGVUYXJnZXQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKHRhcmdldCk7IC8vIFNwZWNpYWwgY2FzZSB0byByZXR1cm4gaGVhZCBvZiBpZnJhbWUgaW5zdGVhZCBvZiBpZnJhbWUgaXRzZWxmXG5cbiAgICBpZiAod2luZG93LkhUTUxJRnJhbWVFbGVtZW50ICYmIHN0eWxlVGFyZ2V0IGluc3RhbmNlb2Ygd2luZG93LkhUTUxJRnJhbWVFbGVtZW50KSB7XG4gICAgICB0cnkge1xuICAgICAgICAvLyBUaGlzIHdpbGwgdGhyb3cgYW4gZXhjZXB0aW9uIGlmIGFjY2VzcyB0byBpZnJhbWUgaXMgYmxvY2tlZFxuICAgICAgICAvLyBkdWUgdG8gY3Jvc3Mtb3JpZ2luIHJlc3RyaWN0aW9uc1xuICAgICAgICBzdHlsZVRhcmdldCA9IHN0eWxlVGFyZ2V0LmNvbnRlbnREb2N1bWVudC5oZWFkO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBpc3RhbmJ1bCBpZ25vcmUgbmV4dFxuICAgICAgICBzdHlsZVRhcmdldCA9IG51bGw7XG4gICAgICB9XG4gICAgfVxuXG4gICAgbWVtb1t0YXJnZXRdID0gc3R5bGVUYXJnZXQ7XG4gIH1cblxuICByZXR1cm4gbWVtb1t0YXJnZXRdO1xufVxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5cblxuZnVuY3Rpb24gaW5zZXJ0QnlTZWxlY3RvcihpbnNlcnQsIHN0eWxlKSB7XG4gIHZhciB0YXJnZXQgPSBnZXRUYXJnZXQoaW5zZXJ0KTtcblxuICBpZiAoIXRhcmdldCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkNvdWxkbid0IGZpbmQgYSBzdHlsZSB0YXJnZXQuIFRoaXMgcHJvYmFibHkgbWVhbnMgdGhhdCB0aGUgdmFsdWUgZm9yIHRoZSAnaW5zZXJ0JyBwYXJhbWV0ZXIgaXMgaW52YWxpZC5cIik7XG4gIH1cblxuICB0YXJnZXQuYXBwZW5kQ2hpbGQoc3R5bGUpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGluc2VydEJ5U2VsZWN0b3I7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gaW5zZXJ0U3R5bGVFbGVtZW50KG9wdGlvbnMpIHtcbiAgdmFyIGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gIG9wdGlvbnMuc2V0QXR0cmlidXRlcyhlbGVtZW50LCBvcHRpb25zLmF0dHJpYnV0ZXMpO1xuICBvcHRpb25zLmluc2VydChlbGVtZW50LCBvcHRpb25zLm9wdGlvbnMpO1xuICByZXR1cm4gZWxlbWVudDtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBpbnNlcnRTdHlsZUVsZW1lbnQ7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc2V0QXR0cmlidXRlc1dpdGhvdXRBdHRyaWJ1dGVzKHN0eWxlRWxlbWVudCkge1xuICB2YXIgbm9uY2UgPSB0eXBlb2YgX193ZWJwYWNrX25vbmNlX18gIT09IFwidW5kZWZpbmVkXCIgPyBfX3dlYnBhY2tfbm9uY2VfXyA6IG51bGw7XG5cbiAgaWYgKG5vbmNlKSB7XG4gICAgc3R5bGVFbGVtZW50LnNldEF0dHJpYnV0ZShcIm5vbmNlXCIsIG5vbmNlKTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHNldEF0dHJpYnV0ZXNXaXRob3V0QXR0cmlidXRlczsiLCJcInVzZSBzdHJpY3RcIjtcblxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgICovXG5mdW5jdGlvbiBhcHBseShzdHlsZUVsZW1lbnQsIG9wdGlvbnMsIG9iaikge1xuICB2YXIgY3NzID0gXCJcIjtcblxuICBpZiAob2JqLnN1cHBvcnRzKSB7XG4gICAgY3NzICs9IFwiQHN1cHBvcnRzIChcIi5jb25jYXQob2JqLnN1cHBvcnRzLCBcIikge1wiKTtcbiAgfVxuXG4gIGlmIChvYmoubWVkaWEpIHtcbiAgICBjc3MgKz0gXCJAbWVkaWEgXCIuY29uY2F0KG9iai5tZWRpYSwgXCIge1wiKTtcbiAgfVxuXG4gIHZhciBuZWVkTGF5ZXIgPSB0eXBlb2Ygb2JqLmxheWVyICE9PSBcInVuZGVmaW5lZFwiO1xuXG4gIGlmIChuZWVkTGF5ZXIpIHtcbiAgICBjc3MgKz0gXCJAbGF5ZXJcIi5jb25jYXQob2JqLmxheWVyLmxlbmd0aCA+IDAgPyBcIiBcIi5jb25jYXQob2JqLmxheWVyKSA6IFwiXCIsIFwiIHtcIik7XG4gIH1cblxuICBjc3MgKz0gb2JqLmNzcztcblxuICBpZiAobmVlZExheWVyKSB7XG4gICAgY3NzICs9IFwifVwiO1xuICB9XG5cbiAgaWYgKG9iai5tZWRpYSkge1xuICAgIGNzcyArPSBcIn1cIjtcbiAgfVxuXG4gIGlmIChvYmouc3VwcG9ydHMpIHtcbiAgICBjc3MgKz0gXCJ9XCI7XG4gIH1cblxuICB2YXIgc291cmNlTWFwID0gb2JqLnNvdXJjZU1hcDtcblxuICBpZiAoc291cmNlTWFwICYmIHR5cGVvZiBidG9hICE9PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgY3NzICs9IFwiXFxuLyojIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCxcIi5jb25jYXQoYnRvYSh1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoSlNPTi5zdHJpbmdpZnkoc291cmNlTWFwKSkpKSwgXCIgKi9cIik7XG4gIH0gLy8gRm9yIG9sZCBJRVxuXG4gIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAgKi9cblxuXG4gIG9wdGlvbnMuc3R5bGVUYWdUcmFuc2Zvcm0oY3NzLCBzdHlsZUVsZW1lbnQsIG9wdGlvbnMub3B0aW9ucyk7XG59XG5cbmZ1bmN0aW9uIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpIHtcbiAgLy8gaXN0YW5idWwgaWdub3JlIGlmXG4gIGlmIChzdHlsZUVsZW1lbnQucGFyZW50Tm9kZSA9PT0gbnVsbCkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIHN0eWxlRWxlbWVudC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHN0eWxlRWxlbWVudCk7XG59XG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAgKi9cblxuXG5mdW5jdGlvbiBkb21BUEkob3B0aW9ucykge1xuICB2YXIgc3R5bGVFbGVtZW50ID0gb3B0aW9ucy5pbnNlcnRTdHlsZUVsZW1lbnQob3B0aW9ucyk7XG4gIHJldHVybiB7XG4gICAgdXBkYXRlOiBmdW5jdGlvbiB1cGRhdGUob2JqKSB7XG4gICAgICBhcHBseShzdHlsZUVsZW1lbnQsIG9wdGlvbnMsIG9iaik7XG4gICAgfSxcbiAgICByZW1vdmU6IGZ1bmN0aW9uIHJlbW92ZSgpIHtcbiAgICAgIHJlbW92ZVN0eWxlRWxlbWVudChzdHlsZUVsZW1lbnQpO1xuICAgIH1cbiAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBkb21BUEk7IiwiXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICAqL1xuZnVuY3Rpb24gc3R5bGVUYWdUcmFuc2Zvcm0oY3NzLCBzdHlsZUVsZW1lbnQpIHtcbiAgaWYgKHN0eWxlRWxlbWVudC5zdHlsZVNoZWV0KSB7XG4gICAgc3R5bGVFbGVtZW50LnN0eWxlU2hlZXQuY3NzVGV4dCA9IGNzcztcbiAgfSBlbHNlIHtcbiAgICB3aGlsZSAoc3R5bGVFbGVtZW50LmZpcnN0Q2hpbGQpIHtcbiAgICAgIHN0eWxlRWxlbWVudC5yZW1vdmVDaGlsZChzdHlsZUVsZW1lbnQuZmlyc3RDaGlsZCk7XG4gICAgfVxuXG4gICAgc3R5bGVFbGVtZW50LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKGNzcykpO1xuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3R5bGVUYWdUcmFuc2Zvcm07IiwiaW1wb3J0IHtDb21wb25lbnQgLCBjcmVhdGVSZWZ9IGZyb20gXCJwcmVhY3RcIjtcbmltcG9ydCB7IHVzZVJlZiB9IGZyb20gXCJwcmVhY3QvaG9va3NcIjtcbmltcG9ydCB7aHRtbH0gZnJvbSBcImh0bS9wcmVhY3RcIjtcbmltcG9ydCB7Q29kZUphcn0gZnJvbSBcImNvZGVqYXJcIjtcbmltcG9ydCBQcmlzbSBmcm9tICdwcmlzbWpzJztcbnJlcXVpcmUoXCJwcmlzbWpzL3RoZW1lcy9wcmlzbS1kYXJrLmNzc1wiKTtcbnJlcXVpcmUoXCIuL2NvZGVlZGl0b3Iuc2Nzc1wiKTtcblxuXG5leHBvcnQgY2xhc3MgQ29kZUVkaXRvciBleHRlbmRzIENvbXBvbmVudHtcbiAgY29uc3RydWN0b3IocHJvcHMpe1xuICAgIHN1cGVyKHByb3BzKTtcbiAgICB0aGlzLmNvbnRhaW5lciA9IGNyZWF0ZVJlZigpO1xuICB9XG5cbiAgY29tcG9uZW50RGlkTW91bnQoKXtcbiAgICB0aGlzLmVkaXRvciA9IENvZGVKYXIodGhpcy5jb250YWluZXIuY3VycmVudCAsIFxuICAgIGU9PlByaXNtLmhpZ2hsaWdodEVsZW1lbnQoZSkgLCB7dGFiOiAnICAnfSk7XG4gICAgLy9cbiAgICB0aGlzLmVkaXRvci51cGRhdGVDb2RlKHRoaXMucHJvcHMudmFsdWUgfHwgXCJcIik7XG4gICAgdGhpcy5lZGl0b3Iub25VcGRhdGUoZT0+dGhpcy5wcm9wcy5oYW5kbGVyKGUpKTtcbiAgfVxuXG4gIHJlbmRlcigpe1xuXG4gICAgcmV0dXJuIGh0bWxgPGRpdiBjbGFzcz1cIkNvZGVFZGl0b3IgbGFuZ3VhZ2UtJHt0aGlzLnByb3BzLmxhbmcgfHwgJ25vbmUnfVwiIHJlZj0ke3RoaXMuY29udGFpbmVyfT5cbiAgICAgIFxuICAgIDwvZGl2PmBcbiAgfVxufVxuXG4iLCJpbXBvcnQgeyBDb21wb25lbnQgLCBjcmVhdGVSZWYgfSBmcm9tIFwicHJlYWN0XCI7XG5pbXBvcnQgeyB1c2VSZWYgfSBmcm9tIFwicHJlYWN0L2hvb2tzXCI7XG5pbXBvcnQgeyBodG1sIH0gZnJvbSBcImh0bS9wcmVhY3RcIjtcbmltcG9ydCBTcGxpdCBmcm9tIFwic3BsaXQuanNcIjtcbmltcG9ydCB7IENvZGVFZGl0b3IgfSBmcm9tIFwiLi9Db2RlRWRpdG9yXCI7XG5pbXBvcnQgeyBUaGVJbnB1dCB9IGZyb20gXCIuL3V0aWxcIjtcbmltcG9ydCB7IHNhdmVGaWxlIH0gZnJvbSBcIi4vZmlsZW9wc1wiO1xucmVxdWlyZShcIi4vZmlkZGxlci5zY3NzXCIpXG5cblxuZXhwb3J0IGNsYXNzIEZpZGRsZXIgZXh0ZW5kcyBDb21wb25lbnR7XG4gIGNvbnN0cnVjdG9yKHByb3BzKXtcbiAgICBzdXBlcihwcm9wcyk7XG4gICAgY29uc29sZS5sb2coXCJQcm9wc1wiICwgcHJvcHMpO1xuICAgIHRoaXMubWFpbkNvbnRhaW5lciA9IGNyZWF0ZVJlZigpO1xuICAgIHRoaXMuZWRpdG9ycyA9IGNyZWF0ZVJlZigpO1xuICAgIHRoaXMucHJldmlldyA9IGNyZWF0ZVJlZigpO1xuICAgIHRoaXMuY3NzRWRpdG9yID0gY3JlYXRlUmVmKCk7XG4gICAgdGhpcy5qc0VkaXRvciA9IGNyZWF0ZVJlZigpO1xuICAgIHRoaXMuaHRtbEVkaXRvciA9IGNyZWF0ZVJlZigpO1xuICAgIHRoaXMubW9kaWZpZWQgPSBmYWxzZTtcbiAgICB0aGlzLnN0YXRlID0geyBcbiAgICAgIGh0bWw6IHByb3BzLmh0bWwgfHwgXCJcIixcbiAgICAgIGpzOiBwcm9wcy5qcyB8fCBcIlwiLFxuICAgICAgY3NzOiBwcm9wcy5jc3MgfHwgXCJcIixcbiAgICAgIHNldHRpbmdzOiBwcm9wcy5zZXR0aW5ncyxcbiAgICAgIG1vZGlmaWVkOiBmYWxzZSxcbiAgICAgIHNob3dTZXR0aW5nczogZmFsc2UsXG4gICAgICBmaWxlbmFtZTogcHJvcHMuc2V0dGluZ3MuZmlsZW5hbWUoKSxcbiAgICAgIHRpdGxlOiBwcm9wcy5zZXR0aW5ncy50aXRsZSgpLFxuICAgICAgZGVzY3JpcHRpb246IHByb3BzLnNldHRpbmdzLmRlc2NyaXB0aW9uKCksXG4gICAgICBoZWFkSFRNTDogcHJvcHMuc2V0dGluZ3MuaGVhZEhUTUwoKSxcblxuICAgIH1cbiAgICB0aGlzLnJlbmRlclByZXZpZXcgPSB0aGlzLnJlbmRlclByZXZpZXcuYmluZCh0aGlzKTtcbiAgICBcbiAgfVxuICByZW5kZXIoKXtcbiAgICBcbiAgICAgcmV0dXJuIGh0bWxgPGRpdlxuICAgICBjbGFzcz0ke3RoaXMuc3RhdGUuc2hvd1NldHRpbmdzID8gXCJGaWRkbGVyIHNldHRpbmdzXCIgOiBcIkZpZGRsZXIgbWFpblwifT5cbiAgICAgPGRpdiBpZD1cInRvb2xiYXJcIj5cblxuICAgICA8ZGl2IGlkPVwiaW1tZWRpYXRlVG9vbHNcIj5cbiAgICAgPGlucHV0IHR5cGU9XCJidXR0b25cIiB2YWx1ZT1cIlNhdmVcIiBcbiAgICAgb25jbGljaz0keygpPT57IFxuICAgICBzYXZlRmlsZSh0aGlzLnByb3BzLnNldHRpbmdzICwgdGhpcy5zdGF0ZS5odG1sICwgdGhpcy5zdGF0ZS5jc3MgLCB0aGlzLnN0YXRlLmpzICkgO1xuICAgICAvLyB0aGlzLnNldFN0YXRlKHttb2RpZmllZDogZmFsc2V9KVxuICAgICB9fVxuICAgICBjbGFzcz0ke3RoaXMuc3RhdGUubW9kaWZpZWQgPyBcIm1vZGlmaWVkXCIgOiBcInJlZ3VsYXJcIn1cbiAgICAgc3R5bGU9JHt7bWFyZ2luUmlnaHQ6IFwiMTZweFwifX0+PC9pbnB1dD5cbiAgICAgPGlucHV0IHR5cGU9XCJidXR0b25cIlxuICAgICBzdHlsZT0ke3ttYXJnaW5SaWdodDogXCIxNnB4XCJ9fVxuICAgICB2YWx1ZT1cIlJ1blwiXG4gICAgIG9uY2xpY2s9JHt0aGlzLnJlbmRlclByZXZpZXd9XG4gICAgID48L2lucHV0PlxuICAgICA8aW5wdXQgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgY2hlY2tlZD0ke3RoaXMucHJvcHMuc2V0dGluZ3MuYXV0b1J1bigpfVxuICAgICBvbmNsaWNrPSR7KGUpPT57dGhpcy5wcm9wcy5zZXR0aW5ncy5hdXRvUnVuKGUudGFyZ2V0LmNoZWNrZWQpfSAgfVxuICAgICA+PC9pbnB1dD48bGFiZWw+QXV0byBydW48L2xhYmVsPlxuICAgICA8L2Rpdj5cblxuICAgICA8ZGl2IGlkPVwib3RoZXJUb29sc1wiPlxuICAgPGlucHV0IHR5cGU9XCJidXR0b25cIiBcbiAgIG9uY2xpY2s9JHsoKT0+dGhpcy5zZXRTdGF0ZSh7c2hvd1NldHRpbmdzOiAhdGhpcy5zdGF0ZS5zaG93U2V0dGluZ3N9KX1cbiAgIHZhbHVlPSR7dGhpcy5zdGF0ZS5zaG93U2V0dGluZ3MgPyBcIkhpZGUgU2V0dGluZ3NcIiA6IFwiUGFnZSBTZXR0aW5nc1wifT48L2lucHV0PlxuICAgICA8L2Rpdj5cblxuICAgICA8L2Rpdj5cblxuICAgICA8ZGl2IGNsYXNzPVwic3BsaXQgdmVydGljYWxcIiBpZD1cIm1haW5Db250YWluZXJcIiByZWY9JHt0aGlzLm1haW5Db250YWluZXJ9PlxuICAgICAgICAgXG4gICAgICAgICAgPGRpdiBjbGFzcz1cInNwbGl0IGhvcml6b250YWxcIiBpZD1cImVkaXRvcnNcIiByZWY9JHt0aGlzLmVkaXRvcnN9PlxuICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJlZGl0b3JDb250YWluZXJcIiBpZD1cImNzc1wiIHJlZj0ke3RoaXMuY3NzRWRpdG9yfT5cbiAgICAgICAgICAgICAgIDxoMz5DU1M8L2gzPlxuICAgICAgICAgICAgICAgPCR7Q29kZUVkaXRvcn0gXG4gICAgICAgICAgICAgICB2YWx1ZT0ke3RoaXMuc3RhdGUuY3NzfVxuICAgICAgICAgICAgICAgaGFuZGxlcj0ke3RoaXMubWFrZUhhbmRsZXIoJ2NzcycpfVxuICAgICAgICAgICAgICAgbGFuZz1cImNzc1wiIC8+XG4gICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgPGRpdiBjbGFzcz1cImVkaXRvckNvbnRhaW5lclwiIGlkPVwiaHRtbFwiIHJlZj0ke3RoaXMuaHRtbEVkaXRvcn0+XG5cbiAgICAgICAgICAgICAgIDxoMz5IVE1MPC9oMz5cbiAgICAgICAgICAgICAgIDwke0NvZGVFZGl0b3J9IFxuICAgICAgICAgICAgICAgdmFsdWU9JHt0aGlzLnN0YXRlLmh0bWx9XG4gICAgICAgICAgICAgICBoYW5kbGVyPSR7dGhpcy5tYWtlSGFuZGxlcignaHRtbCcpfVxuICAgICAgICAgICAgICAgbGFuZz1cImh0bWxcIiAvPlxuICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJlZGl0b3JDb250YWluZXJcIiBpZD1cImpzXCIgcmVmPSR7dGhpcy5qc0VkaXRvcn0+XG4gICAgICAgICAgICAgICA8aDM+SmF2YSBTY3JpcHQ8L2gzPlxuICAgICAgICAgICAgICAgPCR7Q29kZUVkaXRvcn0gXG4gICAgICAgICAgICAgICB2YWx1ZT0ke3RoaXMuc3RhdGUuanN9XG4gICAgICAgICAgICAgICBoYW5kbGVyPSR7dGhpcy5tYWtlSGFuZGxlcignanMnKX1cbiAgICAgICAgICAgICAgIGxhbmc9XCJqc1wiIC8+XG4gICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPC9kaXY+XG5cbiAgICAgICAgICA8aWZyYW1lIHJlZj0ke3RoaXMucHJldmlld30+PC9pZnJhbWU+XG5cbiAgICAgPC9kaXY+XG4gICAgIDxkaXYgaWQ9XCJzZXR0aW5nc0NvbnRhaW5lclwiPlxuICAgICA8aDI+U2V0dGluZ3M8L2gyPlxuICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNldHRpbmdzUGFuZWxcIj5cbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJsZWZ0XCI+XG4gICAgICAgICAgICAgICA8JHtUaGVJbnB1dH0gYXJlYT0ke2ZhbHNlfSBuYW1lPVwiZmlsZW5hbWVcIiB0aXRsZT1cIkZpbGUgbmFtZVwiXG4gICAgICAgICAgICAgICB2YWx1ZT0ke3RoaXMuc3RhdGUuZmlsZW5hbWV9XG4gICAgICAgICAgICAgICBoYW5kbGVyPSR7dGhpcy5tYWtlSGFuZGxlcihcImZpbGVuYW1lXCIpfVxuICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgIDwke1RoZUlucHV0fSBhcmVhPSR7ZmFsc2V9IG5hbWU9XCJ0aXRsZVwiIHRpdGxlPVwiUGFnZSB0aXRsZVwiXG4gICAgICAgICAgICAgICB2YWx1ZT0ke3RoaXMuc3RhdGUudGl0bGV9XG4gICAgICAgICAgICAgICBoYW5kbGVyPSR7dGhpcy5tYWtlSGFuZGxlcihcInRpdGxlXCIpfVxuICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgICAgIDwke1RoZUlucHV0fSBhcmVhPSR7dHJ1ZX0gbmFtZT1cImRlc2NyaXB0aW9uXCIgXG4gICAgICAgICAgICAgICB0aXRsZT1cIlBhZ2UgZGVzY3JpcHRpb25cIlxuICAgICAgICAgICAgICAgdmFsdWU9JHt0aGlzLnN0YXRlLmRlc2NyaXB0aW9ufVxuICAgICAgICAgICAgICAgaGFuZGxlcj0ke3RoaXMubWFrZUhhbmRsZXIoXCJkZXNjcmlwdGlvblwiKX1cbiAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJyaWdodFwiIHN0eWxlPSR7e3Bvc2l0aW9uOlwicmVsYXRpdmVcIn19PlxuICAgICAgICAgICAgICAgPGxhYmVsPkhlYWQgSFRNTDwvbGFiZWw+XG4gICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiZWRpdG9yXCIgc3R5bGU9JHt7cG9zaXRpb246XCJyZWxhdGl2ZVwiLCBmbGV4R3JvdzogMX19PlxuICAgICAgICAgICAgICAgPCR7Q29kZUVkaXRvcn0gdmFsdWU9JHt0aGlzLnN0YXRlLmhlYWRIVE1MfSBcbiAgICAgICAgICAgICAgIGhhbmRsZXI9JHt0aGlzLm1ha2VIYW5kbGVyKFwiaGVhZEhUTUxcIil9XG4gICAgICAgICAgICAgICBsYW5nPVwiaHRtbFwiIC8+XG4gICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgIDwvZGl2PlxuXG4gICAgIDwvZGl2PmBcbiAgfVxuICBtYWtlSGFuZGxlcihuYW1lLCBpbml0VmFsdWUpe1xuICAgICBcbiAgICAgY29uc3QgZiA9ICh2KT0+IHsgXG4gICAgIC8vIGNvbnNvbGUubG9nKG5hbWUsIHYpICA7IFxuICAgICBjb25zdCBjID0ge30gO1xuICAgICBjW1wibW9kaWZpZWRcIl0gPSB0cnVlO1xuXG4gICAgIGNbbmFtZV09diA7XG4gICAgIHRoaXMuc2V0U3RhdGUoYykgfSA7XG5cbiAgICAgZi5iaW5kKHRoaXMpO1xuICAgICByZXR1cm4gZjtcblxuICB9XG4gIGNvbXBvbmVudERpZFVwZGF0ZSgpe1xuICAgIHRoaXMubW9kaWZpZWQgPSB0cnVlO1xuICAgIGlmKHRoaXMucHJvcHMuc2V0dGluZ3MuYXV0b1J1bigpKVxuICAgIHtcbiAgICAgIHRoaXMucmVuZGVyUHJldmlldygpO1xuICAgIH1cbiAgICB0aGlzLnByb3BzLnNldHRpbmdzLnRpdGxlKHRoaXMucHJvcHMudGl0bGUgfHwgXCJcIilcbiAgICAuZmlsZW5hbWUodGhpcy5zdGF0ZS5maWxlbmFtZSlcbiAgICBcbiAgfVxuICBjb21wb25lbnREaWRNb3VudCgpe1xuICAgIFNwbGl0KCBbIHRoaXMuY3NzRWRpdG9yLmN1cnJlbnQgLCB0aGlzLmh0bWxFZGl0b3IuY3VycmVudCAsIHRoaXMuanNFZGl0b3IuY3VycmVudCBdICk7XG4gICAgU3BsaXQoIFt0aGlzLmVkaXRvcnMuY3VycmVudCAsIHRoaXMucHJldmlldy5jdXJyZW50XSAsIHtkaXJlY3Rpb246ICd2ZXJ0aWNhbCcgLCBzaXplczogWzMwLDcwXX0gKTtcbiAgICB0aGlzLnJlbmRlclByZXZpZXcoKTtcbiAgfVxuICByZW5kZXJQcmV2aWV3KCl7XG4gICAgIHRoaXMucHJldmlldy5jdXJyZW50LnNyY2RvYyA9IGA8aHRtbD48aGVhZD4ke3RoaXMucHJvcHMuc2V0dGluZ3MuaGVhZEhUTUwoKX1cbiAgICAgPHN0eWxlPiR7dGhpcy5zdGF0ZS5jc3MgfHwgXCJcIn08L3N0eWxlPlxuICAgICA8c2NyaXB0PiR7dGhpcy5zdGF0ZS5qcyB8fCBcIlwifTwvc2NyaXB0PlxuICAgICA8L2hlYWQ+PGJvZHk+JHt0aGlzLnN0YXRlLmh0bWwgfHwgXCJcIn08L2JvZHk+PC9odG1sPmBcbiAgfVxufVxuIiwiaW1wb3J0IHsgIENvbXBvbmVudH0gZnJvbSAncHJlYWN0JztcblxuZXhwb3J0IGNsYXNzIElmIGV4dGVuZHMgQ29tcG9uZW50e1xuICBjb25zdHJ1Y3Rvcihwcm9wcyl7XG4gICAgc3VwZXIocHJvcHMpXG4gIH1cblxuICByZW5kZXIoKXtcbiAgICAvLyBjb25zb2xlLmxvZyhcIklGXCIgLCB0aGlzLnByb3BzLmNvbmRpdGlvbilcbiAgICBpZih0aGlzLnByb3BzLmNvbmRpdGlvbil7XG4gICAgICByZXR1cm4gdGhpcy5wcm9wcy5jaGlsZHJlblxuICAgIH1lbHNle1xuICAgIHJldHVybiBcIlwiXG4gICAgfVxuICB9XG59XG5cbiIsImltcG9ydCB7IGVzY2FwZVRhZ3MgfSBmcm9tIFwiLi91dGlsXCI7XG5cbmV4cG9ydCBmdW5jdGlvbiB0b0hUTUwoXG4gICBzZXR0aW5ncyxcbiAgIGh0bWwsXG4gICBjc3MsXG4gICBqc1xuKXtcbiAgY29uc3QgdHBsID0gYFxuPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuICA8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cbiAgPHRpdGxlPiR7c2V0dGluZ3MudGl0bGUoKX08L3RpdGxlPlxuICA8bWV0YSBuYW1lPVwiZGVzY3JpcHRpb25cIiBjb250ZW50PVwiJHtzZXR0aW5ncy5kZXNjcmlwdGlvbigpfVwiPlxuICAke3NldHRpbmdzLmhlYWRIVE1MKCl9XG4gIDxzY3JpcHQ+XG4gIHdpbmRvdy5zZXR0aW5ncyA9ICR7SlNPTi5zdHJpbmdpZnkoc2V0dGluZ3MuY29weSh0cnVlKSAsIG51bGwgLCAyKX1cbiAgPC9zY3JpcHQ+XG4gIDxzY3JpcHQ+XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiaGFzaGNoYW5nZVwiICwgKCk9Pmhpc3RvcnkuZ28oMCkpO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcbiAgXCJET01Db250ZW50TG9hZGVkXCIgLCBcbiAgZnVuY3Rpb24oKXtcbiAgICAgIGNvbnN0IHAgPSB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2w7XG4gICAgICBjb25zdCB3biA9IHNlbGYud2luZG93Lm5hbWU7XG4gICAgICBpZih3aW5kb3cubG9jYXRpb24uaGFzaD09XCIjdmlld1wiKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYocD09XCJmaWxlOlwiIHx8IHdpbmRvdy5sb2NhdGlvbi5oYXNoPT1cIiNlZGl0XCIpe1xuICAgICAgICAgIGNvbnNvbGUubG9nKFwiTG9hZGluZyBlZGl0b3IuLi5cIilcbiAgICAgICAgICBjb25zdCBzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKTtcbiAgICAgICAgICBzLnNyYyA9ICBcIiR7c2V0dGluZ3MuZWRpdG9yKCkgfHwgJ2ZpZGRsZXIuanMnfVwiXG4gICAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzKTtcbiAgICAgIH1cblxuICAgICAgfSlcbiAgPC9zY3JpcHQ+XG4gIDxzY3JpcHQgaWQ9XCJjdXN0b21KU1wiPiR7anN9PC9zY3JpcHQ+XG4gIDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MS4wXCI+XG48c3R5bGUgaWQ9XCJjdXN0b21DU1NcIj5cbiR7Y3NzfVxuPC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuJHtodG1sfVxuIDxzY3JpcHQgaWQ9XCJodG1sU291cmNlXCIgdHlwZT1cInRleHQvaHRtbFwiPiR7ZXNjYXBlVGFncyggaHRtbCApfTwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPlxuYDtcbnJldHVybiB0cGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlVG9EaXNrKG5hbWUsY29udGVudCl7XG4gIHZhciBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICBlbGVtZW50LnNldEF0dHJpYnV0ZSgnaHJlZicsICdkYXRhOnRleHQvcGxhaW47Y2hhcnNldD11dGYtOCwnICsgZW5jb2RlVVJJQ29tcG9uZW50KGNvbnRlbnQpKTtcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoJ2Rvd25sb2FkJywgbmFtZSk7XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG4gIGVsZW1lbnQuY2xpY2soKTtcbiAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChlbGVtZW50KTtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUZpbGUoc2V0dGluZ3MsIGh0bWwsIGNzcyAsIGpzKXtcbiAgIGNvbnNvbGUuaW5mbyhcIlNhdmluZy4uLlwiKVxuICAgY29uc3QgdCA9IHRvSFRNTChzZXR0aW5ncywgaHRtbCwgY3NzLCBqcyk7XG4gICBjb25zdCBmID0gc2V0dGluZ3MuZmlsZW5hbWUoKTtcbiAgIHNhdmVUb0Rpc2soZiwgdCk7XG5cbn1cblxuIiwiIGltcG9ydCB7IGVzY2FwZVRhZ3MgLCB1bmVzY2FwZVRhZ3MgfSBmcm9tIFwiLi91dGlsXCJcblxuY29uc3QgU1RPUkUgPSB7fTtcbmNvbnN0IHByb3BzID0gW1xuICAgXCJ0aXRsZVwiICwgXG4gICBcImRlc2NyaXB0aW9uXCIgLCBcbiAgIFwiaW1hZ2VcIiAsIFxuICAgXCJmaWxlbmFtZVwiICwgLy9odG1sIFxuICAgXCJoZWFkSFRNTFwiLCAvL2h0bWxcbiAgIFwiYXV0aG9yXCIsXG4gICBcImtleXdvcmRzXCIsXG4gICBcImF1dG9SdW5cIixcbiAgIFwiZWRpdG9yXCIsXG4gICBdXG52YXIgY2FsbGJhY2sgO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlKHNldHRpbmdzX3NyYyAsIGNiKXtcbi8vIGNvbnNvbGUubG9nKFwiQ3JlYXRpbmcgc2V0dGluZ3Mgd3JhcHBlclwiICwgc2V0dGluZ3Nfc3JjKVxuICBpZihjYil7Y2FsbGJhY2s9Y2J9XG4gIHByb3BzLmZvckVhY2gocD0+U1RPUkVbcF09c2V0dGluZ3Nfc3JjW3BdIHx8IFwiXCIpO1xuICByZXR1cm4gY3JlYXRlV3JhcHBlcigpO1xufVxuXG5mdW5jdGlvbiB1cGRhdGVkKGssdil7XG4gIGlmKGNhbGxiYWNrKXtjYWxsYmFjayhrLHYpfVxuICAvLyBjb25zb2xlLmxvZyhcIlVwZGF0ZWQgc2V0dGluZ1wiICwgaylcbn1cblxuZnVuY3Rpb24gZXNjYXBlZENvcHkoKXtcbiAgcmV0dXJuIHByb3BzLnJlZHVjZSggKGEsZSk9PnthW2VdPSggU1RPUkVbZV0gfHwgXCJcIiApIDsgcmV0dXJuIGF9ICAsIHt9KVxuICBcbn1cblxuZnVuY3Rpb24gdW5lc2NhcGVkQ29weSgpe1xuICByZXR1cm4gcHJvcHMucmVkdWNlKCAoYSxlKT0+e2FbZV09dW5lc2NhcGVUYWdzKCBTVE9SRVtlXSB8fCBcIlwiICkgOyByZXR1cm4gYX0gICwge30pXG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdyYXBwZXIoKXtcbiAgIGNvbnN0IHcgPSB7fTtcbiAgIHcubGlzdFByb3BzID0gKCk9PiBwcm9wcy5zbGljZSgwKTtcbiAgIHcuY29weSA9IChlc2NhcGUpPT4gZXNjYXBlID8gZXNjYXBlZENvcHkoKSA6IHVuZXNjYXBlZENvcHkoKTtcbiAgIHByb3BzLmZvckVhY2goIHA9PntcbiAgICAgIHdbcF0gPSAodik9PnsgaWYodj09PXVuZGVmaW5lZCl7cmV0dXJuIHVuZXNjYXBlVGFncyggU1RPUkVbcF0gfHwgXCJcIiApfSA7ICBcbiAgICAgIGNvbnN0IGV2ID0gZXNjYXBlVGFncyh2KTtcbiAgICAgIGlmKFNUT1JFW3BdPT09ZXYpe3JldHVybiB3fVxuICAgICAgU1RPUkVbcF09ZXYgOyB1cGRhdGVkKHAsdikgOyByZXR1cm4gdyB9XG4gICB9IClcbiAgIHJldHVybiB3O1xufVxuXG4iLCJpbXBvcnQge0NvbXBvbmVudCAsIGNyZWF0ZVJlZn0gZnJvbSBcInByZWFjdFwiO1xuaW1wb3J0IHsgdXNlUmVmIH0gZnJvbSBcInByZWFjdC9ob29rc1wiO1xuaW1wb3J0IHtodG1sfSBmcm9tIFwiaHRtL3ByZWFjdFwiO1xuaW1wb3J0IHsgSWYgfSBmcm9tIFwiLi9JZlwiO1xuXG5jb25zdCB0YWdzVG9SZXBsYWNlID0ge1xuICAnJic6ICcmYW1wOycsXG4gICc8JzogJyZsdDsnLFxuICAnPic6ICcmZ3Q7J1xufTtcblxuY29uc3QgcmVwbGFjZVRvVGFncyA9IHtcbiAgJyZhbXA7JzonJicsXG4gICcmbHQ7JzogJzwnLFxuICAnJmd0Oyc6ICc+J1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXNjYXBlVGFncyhzKXtcbiAgaWYodHlwZW9mKHMpIT09J3N0cmluZycpe3JldHVybiBzfTtcbiAgY29uc3QgcmVwbGFjZXI9KHRhZyk9PntyZXR1cm4gdGFnc1RvUmVwbGFjZVt0YWddfHx0YWd9XG4gIHJldHVybiBzLnJlcGxhY2UoL1smPD5dL2cgLCByZXBsYWNlcik7XG59XG5leHBvcnQgZnVuY3Rpb24gdW5lc2NhcGVUYWdzKHMpe1xuICBpZih0eXBlb2YocykhPT0nc3RyaW5nJyl7cmV0dXJuIHN9O1xuICBjb25zdCByZXBsYWNlcj0odGFnKT0+e3JldHVybiByZXBsYWNlVG9UYWdzW3RhZ118fHRhZ31cbiAgcmV0dXJuIHMucmVwbGFjZSgvJmFtcDt8Jmx0O3wmZ3Q7L2cgLCByZXBsYWNlcik7XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIFRoZUlucHV0KHByb3BzKXtcbiAgY29uc3QgaW5wID0gdXNlUmVmKG51bGwpO1xuICBjb25zdCBvbkNoYW5nZSA9ICgpPT57cHJvcHMuaGFuZGxlcihpbnAuY3VycmVudC52YWx1ZSl9O1xuXG4gIHJldHVybiBodG1sYDxkaXYgY2xhc3M9XCJUaGVJbnB1dFwiPlxuICA8bGFiZWwgY2xhc3M9XCJsYWJlbFwiIGZvcj0ke3Byb3BzLm5hbWUgfHwgXCJcIiB9PiR7cHJvcHMudGl0bGV9PC9sYWJlbD5cbiAgPCR7SWZ9IGNvbmRpdGlvbj0ke3Byb3BzLmFyZWE9PXRydWV9PlxuICA8dGV4dGFyZWEgcmVmPSR7aW5wfSBcbiAgc3R5bGU9XCJtaW4taGVpZ2h0OiAxMjBweDt0cmFuc2l0aW9uOmhlaWdodCAuNXNcIlxuICBjbGFzcz0ke1wiaW5wdXQgYmlnaW5vdXQgYXJlYVwiK3Byb3BzLm5hbWV9XG4gIG5hbWU9JHtwcm9wcy5uYW1lIHx8IFwiXCJ9IFxuICBvbmZvY3VzPSR7KGUpPT57XG4gICAgIGNvbnN0IGJoID0gZS50YXJnZXQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkuaGVpZ2h0O1xuICAgICBjb25zdCBzaCA9IGUudGFyZ2V0LnNjcm9sbEhlaWdodDtcbiAgICAgaWYoc2g+Ymgpe1xuICAgICAgIGUudGFyZ2V0LnN0eWxlLmhlaWdodD0oc2grMTYpK1wicHhcIlxuICAgICAgIH1cbiAgICB9fVxuICBvbmJsdXI9JHsgKGUpPT5lLnRhcmdldC5zdHlsZS5oZWlnaHQ9XCIxMjBweFwiIH1cbiAgb25rZXl1cD0keyhlKT0+eyBcbiAgICAgY29uc3QgYmggPSBlLnRhcmdldC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5oZWlnaHQ7XG4gICAgIGNvbnN0IHNoID0gZS50YXJnZXQuc2Nyb2xsSGVpZ2h0O1xuICAgICBpZihzaD5iaCl7XG4gICAgICAgZS50YXJnZXQuc3R5bGUuaGVpZ2h0PShzaCsxNikrXCJweFwiXG4gICAgIH1cbiAgICAgb25DaGFuZ2UoKVxuICAgIH19XG4gIG9uY2hhbmdlPSR7KGUpPT57IG9uQ2hhbmdlKCk7IH19ID5cbiAgJHtwcm9wcy52YWx1ZSB8fCBcIlwifVxuICA8L3RleHRhcmVhPlxuICA8LyR7SWZ9PlxuICA8JHtJZn0gY29uZGl0aW9uPSR7cHJvcHMuYXJlYT09ZmFsc2V9PlxuICA8aW5wdXQgY2xhc3M9XCJpbnB1dFwiIHR5cGU9XCJ0ZXh0XCIgcmVmPSR7aW5wfSBuYW1lPSR7cHJvcHMubmFtZSB8fCBcIlwifVxuICB2YWx1ZT0ke3Byb3BzLnZhbHVlIHx8IFwiXCJ9XG4gIG9uY2hhbmdlPSR7b25DaGFuZ2V9XG4gID48L2lucHV0PlxuICA8LyR7SWZ9PlxuICA8L2Rpdj5gXG5cbn1cblxuIiwiLy8gVGhlIG1vZHVsZSBjYWNoZVxudmFyIF9fd2VicGFja19tb2R1bGVfY2FjaGVfXyA9IHt9O1xuXG4vLyBUaGUgcmVxdWlyZSBmdW5jdGlvblxuZnVuY3Rpb24gX193ZWJwYWNrX3JlcXVpcmVfXyhtb2R1bGVJZCkge1xuXHQvLyBDaGVjayBpZiBtb2R1bGUgaXMgaW4gY2FjaGVcblx0dmFyIGNhY2hlZE1vZHVsZSA9IF9fd2VicGFja19tb2R1bGVfY2FjaGVfX1ttb2R1bGVJZF07XG5cdGlmIChjYWNoZWRNb2R1bGUgIT09IHVuZGVmaW5lZCkge1xuXHRcdHJldHVybiBjYWNoZWRNb2R1bGUuZXhwb3J0cztcblx0fVxuXHQvLyBDcmVhdGUgYSBuZXcgbW9kdWxlIChhbmQgcHV0IGl0IGludG8gdGhlIGNhY2hlKVxuXHR2YXIgbW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXSA9IHtcblx0XHRpZDogbW9kdWxlSWQsXG5cdFx0Ly8gbm8gbW9kdWxlLmxvYWRlZCBuZWVkZWRcblx0XHRleHBvcnRzOiB7fVxuXHR9O1xuXG5cdC8vIEV4ZWN1dGUgdGhlIG1vZHVsZSBmdW5jdGlvblxuXHRfX3dlYnBhY2tfbW9kdWxlc19fW21vZHVsZUlkXShtb2R1bGUsIG1vZHVsZS5leHBvcnRzLCBfX3dlYnBhY2tfcmVxdWlyZV9fKTtcblxuXHQvLyBSZXR1cm4gdGhlIGV4cG9ydHMgb2YgdGhlIG1vZHVsZVxuXHRyZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG59XG5cbi8vIGV4cG9zZSB0aGUgbW9kdWxlcyBvYmplY3QgKF9fd2VicGFja19tb2R1bGVzX18pXG5fX3dlYnBhY2tfcmVxdWlyZV9fLm0gPSBfX3dlYnBhY2tfbW9kdWxlc19fO1xuXG4iLCIvLyBnZXREZWZhdWx0RXhwb3J0IGZ1bmN0aW9uIGZvciBjb21wYXRpYmlsaXR5IHdpdGggbm9uLWhhcm1vbnkgbW9kdWxlc1xuX193ZWJwYWNrX3JlcXVpcmVfXy5uID0gKG1vZHVsZSkgPT4ge1xuXHR2YXIgZ2V0dGVyID0gbW9kdWxlICYmIG1vZHVsZS5fX2VzTW9kdWxlID9cblx0XHQoKSA9PiAobW9kdWxlWydkZWZhdWx0J10pIDpcblx0XHQoKSA9PiAobW9kdWxlKTtcblx0X193ZWJwYWNrX3JlcXVpcmVfXy5kKGdldHRlciwgeyBhOiBnZXR0ZXIgfSk7XG5cdHJldHVybiBnZXR0ZXI7XG59OyIsIi8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb25zIGZvciBoYXJtb255IGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uZCA9IChleHBvcnRzLCBkZWZpbml0aW9uKSA9PiB7XG5cdGZvcih2YXIga2V5IGluIGRlZmluaXRpb24pIHtcblx0XHRpZihfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZGVmaW5pdGlvbiwga2V5KSAmJiAhX193ZWJwYWNrX3JlcXVpcmVfXy5vKGV4cG9ydHMsIGtleSkpIHtcblx0XHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBrZXksIHsgZW51bWVyYWJsZTogdHJ1ZSwgZ2V0OiBkZWZpbml0aW9uW2tleV0gfSk7XG5cdFx0fVxuXHR9XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18uZyA9IChmdW5jdGlvbigpIHtcblx0aWYgKHR5cGVvZiBnbG9iYWxUaGlzID09PSAnb2JqZWN0JykgcmV0dXJuIGdsb2JhbFRoaXM7XG5cdHRyeSB7XG5cdFx0cmV0dXJuIHRoaXMgfHwgbmV3IEZ1bmN0aW9uKCdyZXR1cm4gdGhpcycpKCk7XG5cdH0gY2F0Y2ggKGUpIHtcblx0XHRpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ29iamVjdCcpIHJldHVybiB3aW5kb3c7XG5cdH1cbn0pKCk7IiwiX193ZWJwYWNrX3JlcXVpcmVfXy5vID0gKG9iaiwgcHJvcCkgPT4gKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIHByb3ApKSIsIi8vIGRlZmluZSBfX2VzTW9kdWxlIG9uIGV4cG9ydHNcbl9fd2VicGFja19yZXF1aXJlX18uciA9IChleHBvcnRzKSA9PiB7XG5cdGlmKHR5cGVvZiBTeW1ib2wgIT09ICd1bmRlZmluZWQnICYmIFN5bWJvbC50b1N0cmluZ1RhZykge1xuXHRcdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBTeW1ib2wudG9TdHJpbmdUYWcsIHsgdmFsdWU6ICdNb2R1bGUnIH0pO1xuXHR9XG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG59OyIsIl9fd2VicGFja19yZXF1aXJlX18uYiA9IGRvY3VtZW50LmJhc2VVUkkgfHwgc2VsZi5sb2NhdGlvbi5ocmVmO1xuXG4vLyBvYmplY3QgdG8gc3RvcmUgbG9hZGVkIGFuZCBsb2FkaW5nIGNodW5rc1xuLy8gdW5kZWZpbmVkID0gY2h1bmsgbm90IGxvYWRlZCwgbnVsbCA9IGNodW5rIHByZWxvYWRlZC9wcmVmZXRjaGVkXG4vLyBbcmVzb2x2ZSwgcmVqZWN0LCBQcm9taXNlXSA9IGNodW5rIGxvYWRpbmcsIDAgPSBjaHVuayBsb2FkZWRcbnZhciBpbnN0YWxsZWRDaHVua3MgPSB7XG5cdFwiZmlkZGxlclwiOiAwXG59O1xuXG4vLyBubyBjaHVuayBvbiBkZW1hbmQgbG9hZGluZ1xuXG4vLyBubyBwcmVmZXRjaGluZ1xuXG4vLyBubyBwcmVsb2FkZWRcblxuLy8gbm8gSE1SXG5cbi8vIG5vIEhNUiBtYW5pZmVzdFxuXG4vLyBubyBvbiBjaHVua3MgbG9hZGVkXG5cbi8vIG5vIGpzb25wIGZ1bmN0aW9uIiwiX193ZWJwYWNrX3JlcXVpcmVfXy5uYyA9IHVuZGVmaW5lZDsiLCJpbXBvcnQge2ggLCByZW5kZXIgfSBmcm9tIFwicHJlYWN0XCI7XG5pbXBvcnQgeyBGaWRkbGVyIH0gZnJvbSBcIi4vRmlkZGxlclwiO1xuaW1wb3J0IHtlc2NhcGVUYWdzICwgdW5lc2NhcGVUYWdzfSBmcm9tIFwiLi91dGlsXCI7XG5pbXBvcnQgeyBjcmVhdGUgYXMgY3JlYXRlU2V0dGluZ3MgfSBmcm9tIFwiLi9zZXR0aW5nc1wiO1xuY29uc29sZS5sb2coXCJMb2FkaW5nIGVkaXRvciwgc3RhZ2UgMVwiKTtcblxuLy9BQ1RJT05TXG4vL3JlbW92ZSBhbGwgbGluayB0YWdzXG5jb25zdCBscyA9IGRvY3VtZW50LmhlYWQucXVlcnlTZWxlY3RvckFsbChcImxpbmtcIik7XG5scy5mb3JFYWNoKGU9PmUucmVtb3ZlKCkpO1xuXG4vL1xuLy9yZW1vdmUgY3VzdG9tIEpTXG4vL3NhdmUgaXQncyB2YWx1ZVxuY29uc3QgaiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY3VzdG9tSlNcIik7XG5jb25zdCBqcyA9ICBqLmlubmVySFRNTC50cmltKCkgO1xuai5yZW1vdmUoKTtcbi8vcmVtb3ZlIGN1c3RvbSBDU1Ncbi8vc2F2ZSBpdCdzIHZhbHVlXG5jb25zdCBjPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImN1c3RvbUNTU1wiKVxuY29uc3QgY3NzID0gYy5pbm5lckhUTUwudHJpbSgpO1xuYy5yZW1vdmUoKTtcbi8vbG9hZCBodG1sIHNvdXJjZVxuLy9zYXZlIGl0J3MgdmFsdWVcbmNvbnN0IGh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJodG1sU291cmNlXCIpO1xuY29uc3QgaHRtbD11bmVzY2FwZVRhZ3MoIGh0LmlubmVySFRNTCApO1xuaHQucmVtb3ZlKCk7XG5jb25zdCBzZXR0aW5ncyA9IGNyZWF0ZVNldHRpbmdzKHdpbmRvdy5zZXR0aW5ncyB8fCB7fSk7XG5cblxuLy9yZW1vdmUgZXZlcnl0aGluZyBpbnNpZGUgQk9EWVxuZG9jdW1lbnQuYm9keS5pbm5lckhUTUwgPSBcIjwhLS1lbXB0eS0tPlwiXG4vL2xvYWQgZWRpdG9yIFxuXG5jb25zdCBFZGl0b3IgPSBoKFxuICAgRmlkZGxlcixcbiAgIHtjc3MsanMsaHRtbCxzZXR0aW5nc31cbik7XG4vLyAgICAtLS0gcmVuZGVyIGl0IGluc2lkZSBib2R5XG5yZW5kZXIoRWRpdG9yLCBkb2N1bWVudC5ib2R5KVxuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9