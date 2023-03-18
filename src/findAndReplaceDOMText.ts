function findAndReplaceDOMText(node: any, options: any) {
  return new Finder(node, options);
}

class Finder {
  node: any;
  options: any;
  reverts: any;
  matches: any;
  doc: any;

  static readonly PORTION_MODE_RETAIN = 'retain';
  static readonly PORTION_MODE_FIRST = 'first';

  static readonly NON_PROSE_ELEMENTS = {
    br: 1, hr: 1,
    // Media / Source elements:
    script: 1, style: 1, img: 1, video: 1, audio: 1, canvas: 1, svg: 1, map: 1, object: 1,
    // Input elements
    input: 1, textarea: 1, select: 1, option: 1, optgroup: 1, button: 1
  };

  static readonly NON_CONTIGUOUS_PROSE_ELEMENTS = {

    // Elements that will not contain prose or block elements where we don't
    // want prose to be matches across element borders:

    // Block Elements
    address: 1, article: 1, aside: 1, blockquote: 1, dd: 1, div: 1,
    dl: 1, fieldset: 1, figcaption: 1, figure: 1, footer: 1, form: 1, h1: 1, h2: 1, h3: 1,
    h4: 1, h5: 1, h6: 1, header: 1, hgroup: 1, hr: 1, main: 1, nav: 1, noscript: 1, ol: 1,
    output: 1, p: 1, pre: 1, section: 1, ul: 1,
    // Other misc. elements that are not part of continuous inline prose:
    br: 1, li: 1, summary: 1, dt: 1, details: 1, rp: 1, rt: 1, rtc: 1,
    // Media / Source elements:
    script: 1, style: 1, img: 1, video: 1, audio: 1, canvas: 1, svg: 1, map: 1, object: 1,
    // Input elements
    input: 1, textarea: 1, select: 1, option: 1, optgroup: 1, button: 1,
    // Table related elements:
    table: 1, tbody: 1, thead: 1, th: 1, tr: 1, td: 1, caption: 1, col: 1, tfoot: 1, colgroup: 1

  };

  static readonly NON_INLINE_PROSE = function (el: any) {
    return Finder.NON_CONTIGUOUS_PROSE_ELEMENTS.hasOwnProperty(el.nodeName.toLowerCase());
  };

  // Presets accessed via `options.preset` when calling findAndReplaceDOMText():
  static readonly PRESETS: any = {
    prose: {
      forceContext: Finder.NON_INLINE_PROSE,
      filterElements: function (el: any) {
        return !Finder.NON_PROSE_ELEMENTS.hasOwnProperty(el.nodeName.toLowerCase());
      }
    }
  };

  constructor(node: any, options: any) {
    this.doc = document;
    const preset = options.preset && Finder.PRESETS[options.preset];
    options.portionMode = options.portionMode || Finder.PORTION_MODE_RETAIN;
    
		if (preset) {
			for (const i in preset) {
				if (preset.hasOwnProperty(i) && !options.hasOwnProperty(i)) {
					options[i] = preset[i];
				}
			}
		}
    this.node = node;
    this.options = options;
    this.prepMatch = options.prepMatch || this.prepMatch;
    this.reverts = [];
    this.matches = this.search();

    if (this.matches.length) {
      this.processMatches();
    }
  }

  search() {
    const matchAggregation = (textAggregation: any) => {
      for (let i = 0, l = textAggregation.length; i < l; ++i) {

        const text = textAggregation[i];
        if (typeof text !== 'string') {
          // Deal with nested contexts: (recursive)
          matchAggregation(text);
          continue;
        }

        if (regex.global) {
          while (match = regex.exec(text)) {
            matches.push(this.prepMatch(match, matchIndex++, offset));
          }
        } else {
          if (match = text.match(regex)) {
            matches.push(this.prepMatch(match, 0, offset));
          }
        }

        offset += text.length;
      }
    }

    let match;
    let matchIndex = 0;
    let offset = 0;
    let regex = this.options.find;
    const textAggregation = this.getAggregateText();
    const matches: any[] = [];

    regex = typeof regex === 'string' ? RegExp(this.escapeRegExp(regex), 'g') : regex;
    matchAggregation(textAggregation);

    return matches;
  }

  prepMatch(match: any, matchIndex: any, characterOffset: any) {
    if (!match[0]) {
      throw new Error('findAndReplaceDOMText cannot handle zero-length matches');
    }

    match.endIndex = characterOffset + match.index + match[0].length;
    match.startIndex = characterOffset + match.index;
    match.index = matchIndex;

    return match;
  }

  escapeRegExp(s: string) {
    return String(s).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
  }

  processMatches() {
    const matches = this.matches;
    const node = this.node;
    const elementFilter = this.options.filterElements;

    let startPortion,
      endPortion,
      innerPortions = [],
      curNode = node,
      match = matches.shift(),
      atIndex = 0, // i.e. nodeAtIndex
      matchIndex = 0,
      portionIndex = 0,
      doAvoidNode,
      nodeStack = [node];

    out: while (true) {

      if (curNode.nodeType === Node.TEXT_NODE) {

        if (!endPortion && curNode.length + atIndex >= match.endIndex) {
          // We've found the ending
          // (Note that, in the case of a single portion, it'll be an
          // endPortion, not a startPortion.)
          endPortion = {
            node: curNode,
            index: portionIndex++,
            text: curNode.data.substring(match.startIndex - atIndex, match.endIndex - atIndex),

            // If it's the first match (atIndex==0) we should just return 0
            indexInMatch: atIndex === 0 ? 0 : atIndex - match.startIndex,

            indexInNode: match.startIndex - atIndex,
            endIndexInNode: match.endIndex - atIndex,
            isEnd: true
          };

        } else if (startPortion) {
          // Intersecting node
          innerPortions.push({
            node: curNode,
            index: portionIndex++,
            text: curNode.data,
            indexInMatch: atIndex - match.startIndex,
            indexInNode: 0 // always zero for inner-portions
          });
        }

        if (!startPortion && curNode.length + atIndex > match.startIndex) {
          // We've found the match start
          startPortion = {
            node: curNode,
            index: portionIndex++,
            indexInMatch: 0,
            indexInNode: match.startIndex - atIndex,
            endIndexInNode: match.endIndex - atIndex,
            text: curNode.data.substring(match.startIndex - atIndex, match.endIndex - atIndex)
          };
        }

        atIndex += curNode.data.length;

      }

      doAvoidNode = curNode.nodeType === Node.ELEMENT_NODE && elementFilter && !elementFilter(curNode);

      if (startPortion && endPortion) {
        curNode = this.replaceMatch(match, startPortion, innerPortions, endPortion);

        // processMatches has to return the node that replaced the endNode
        // and then we step back so we can continue from the end of the
        // match:

        atIndex -= (endPortion.node.data.length - endPortion.endIndexInNode);

        startPortion = null;
        endPortion = null;
        innerPortions = [];
        match = matches.shift();
        portionIndex = 0;
        matchIndex++;

        if (!match) {
          break; // no more matches
        }

      } else if (
        !doAvoidNode &&
        (curNode.firstChild || curNode.nextSibling)
      ) {
        // Move down or forward:
        if (curNode.firstChild) {
          nodeStack.push(curNode);
          curNode = curNode.firstChild;
        } else {
          curNode = curNode.nextSibling;
        }
        continue;
      }

      // Move forward or up:
      while (true) {
        if (curNode.nextSibling) {
          curNode = curNode.nextSibling;
          break;
        }
        curNode = nodeStack.pop();
        if (curNode === node) {
          break out;
        }
      }

    }

  }

  getAggregateText() {
    /**
     * Gets aggregate text of a node without resorting
     * to broken innerText/textContent
     */
    function getText(node: any) {
      if (node.nodeType === Node.TEXT_NODE) {
        return [node.data];
      }

      if (elementFilter && !elementFilter(node)) {
        return [];
      }

      const txt: any = [''];
      let i = 0;

      if (node = node.firstChild) {
        do {
          if (node.nodeType === Node.TEXT_NODE) {
            txt[i] += node.data;
            continue;
          }

          const innerText = getText(node);
          if (
            forceContext &&
            node.nodeType === Node.ELEMENT_NODE &&
            (forceContext === true || forceContext(node))
          ) {
            txt[++i] = innerText;
            txt[++i] = '';
          } else {
            if (typeof innerText[0] === 'string') {
              // Bridge nested text-node data so that they're
              // not considered their own contexts:
              // I.e. ['some', ['thing']] -> ['something']
              txt[i] += innerText.shift();
            }
            if (innerText.length) {
              txt[++i] = innerText;
              txt[++i] = '';
            }
          }
        } while (node = node.nextSibling);
      }

      return txt;
    }

    const elementFilter = this.options.filterElements;
    const forceContext = this.options.forceContext;
    return getText(this.node);
  }

  replaceMatch(match: any, startPortion: any, innerPortions: any, endPortion: any) {
    const matchStartNode = startPortion.node;
    const matchEndNode = endPortion.node;
    let precedingTextNode: any;
    let followingTextNode: any;

    if (matchStartNode === matchEndNode) {
      const node = matchStartNode;
      if (startPortion.indexInNode > 0) {
        // Add `before` text node (before the match)
        precedingTextNode = this.doc.createTextNode(node.data.substring(0, startPortion.indexInNode));
        node.parentNode.insertBefore(precedingTextNode, node);
      }

      // Create the replacement node:
      const newNode = this.getPortionReplacementNode(
        endPortion,
        match
      );

      node.parentNode.insertBefore(newNode, node);

      if (endPortion.endIndexInNode < node.length) { // ?????
        // Add `after` text node (after the match)
        followingTextNode = this.doc.createTextNode(node.data.substring(endPortion.endIndexInNode));
        node.parentNode.insertBefore(followingTextNode, node);
      }

      node.parentNode.removeChild(node);

      this.reverts.push(function () {
        if (precedingTextNode === newNode.previousSibling) {
          precedingTextNode.parentNode.removeChild(precedingTextNode);
        }
        if (followingTextNode === newNode.nextSibling) {
          followingTextNode.parentNode.removeChild(followingTextNode);
        }
        newNode.parentNode.replaceChild(node, newNode);
      });

      return newNode;

    } else {
      // Replace matchStartNode -> [innerMatchNodes...] -> matchEndNode (in that order)
      precedingTextNode = this.doc.createTextNode(
        matchStartNode.data.substring(0, startPortion.indexInNode)
      );

      followingTextNode = this.doc.createTextNode(
        matchEndNode.data.substring(endPortion.endIndexInNode)
      );

      const firstNode = this.getPortionReplacementNode(
        startPortion,
        match
      );

      const innerNodes = [];
      for (let i = 0, l = innerPortions.length; i < l; ++i) {
        const portion = innerPortions[i];
        const innerNode = this.getPortionReplacementNode(
          portion,
          match
        );
        portion.node.parentNode.replaceChild(innerNode, portion.node);
        this.reverts.push((function (portion, innerNode) {
          return function () {
            innerNode.parentNode.replaceChild(portion.node, innerNode);
          };
        }(portion, innerNode)));
        innerNodes.push(innerNode);
      }

      const lastNode = this.getPortionReplacementNode(
        endPortion,
        match
      );

      matchStartNode.parentNode.insertBefore(precedingTextNode, matchStartNode);
      matchStartNode.parentNode.insertBefore(firstNode, matchStartNode);
      matchStartNode.parentNode.removeChild(matchStartNode);

      matchEndNode.parentNode.insertBefore(lastNode, matchEndNode);
      matchEndNode.parentNode.insertBefore(followingTextNode, matchEndNode);
      matchEndNode.parentNode.removeChild(matchEndNode);

      this.reverts.push(function () {
        precedingTextNode.parentNode.removeChild(precedingTextNode);
        firstNode.parentNode.replaceChild(matchStartNode, firstNode);
        followingTextNode.parentNode.removeChild(followingTextNode);
        lastNode.parentNode.replaceChild(matchEndNode, lastNode);
      });

      return lastNode;
    }
  }

  getPortionReplacementNode(portion: any, match: any) {
    let replacement = this.options.replace || '$&';
    let wrapper = this.options.wrap;
    const wrapperClass = this.options.wrapClass;

    if (wrapper && wrapper.nodeType) {
      // Wrapper has been provided as a stencil-node for us to clone:
      const clone = this.doc.createElement('div');
      clone.innerHTML = wrapper.outerHTML || new XMLSerializer().serializeToString(wrapper);
      wrapper = clone.firstChild;
    }

    if (typeof replacement == 'function') {
      replacement = replacement(portion, match);
      if (replacement && replacement.nodeType) {
        return replacement;
      }
      return this.doc.createTextNode(String(replacement));
    }

    const el = typeof wrapper == 'string' ? this.doc.createElement(wrapper) : wrapper;
    if (el && wrapperClass) {
      el.className = wrapperClass;
    }

    replacement = this.doc.createTextNode(
      this.prepareReplacementString(
        replacement, portion, match
      )
    );

    if (!replacement.data) {
      return replacement;
    }

    if (!el) {
      return replacement;
    }

    el.appendChild(replacement);

    return el;
  }

  prepareReplacementString(string: any, portion: any, match: any) {
    const portionMode = this.options.portionMode;
    if (
      portionMode === Finder.PORTION_MODE_FIRST &&
      portion.indexInMatch > 0
    ) {
      return '';
    }
    string = string.replace(/\$(\d+|&|`|')/g, function (t: any) {
      let replacement;
      switch (t) {
        case '&':
          replacement = match[0];
          break;
        case '`':
          replacement = match.input.substring(0, match.startIndex);
          break;
        case '\'':
          replacement = match.input.substring(match.endIndex);
          break;
        default:
          replacement = match[+t] || '';
      }
      return replacement;
    });

    if (portionMode === Finder.PORTION_MODE_FIRST) {
      return string;
    }

    if (portion.isEnd) {
      return string.substring(portion.indexInMatch);
    }

    return string.substring(portion.indexInMatch, portion.indexInMatch + portion.text.length);
  }

  revert() {
    // Reversion occurs backwards so as to avoid nodes subsequently
    // replaced during the matching phase (a forward process):
    for (let l = this.reverts.length; l--;) {
      this.reverts[l]();
    }
    this.reverts = [];
  }
}