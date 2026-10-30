/* Bubble CSS capture v2. Read before running in DevTools.
 * No network requests, text/attributes/cookies/storage reads, or permanent page edits.
 * A temporary panel and API are added. Do not bypass DevTools paste warnings.
 */
(() => {
  'use strict';
  const KEY = 'bubbleCssCaptureV2';
  if (KEY in window) throw new Error('Capture v2 is already open. Close its panel before reinstalling.');
  const LIMITS = Object.freeze({ nodes: 200, depth: 8, ancestors: 3, valueLength: 256 });
  const PROPERTIES = Object.freeze([
    'display', 'position', 'box-sizing', 'width', 'height', 'min-width', 'max-width',
    'min-height', 'max-height', 'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'word-spacing', 'white-space', 'word-break',
    'overflow-wrap', 'text-align', 'text-indent', 'text-transform', 'vertical-align',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'overflow-x', 'overflow-y', 'gap', 'row-gap', 'column-gap',
    'flex-direction', 'align-items', 'justify-content'
  ]);
  const TAGS = new Set(('a abbr article aside b blockquote br button caption code dd del details div dl dt em figcaption figure footer h1 h2 h3 h4 h5 h6 header hr i img input label li main mark nav ol p picture pre q s section small span strong sub summary sup table tbody td textarea th thead time tr u ul video').split(' '));
  const EXCLUDED = new Set(['script', 'style', 'noscript', 'template', 'iframe', 'object', 'embed', 'svg', 'canvas']);
  const samples = new Map();
  const roots = new Map();
  let disposed = false;
  let selection = null;
  let panelHost;
  const statuses = {};
  const uiAbort = new AbortController();
  const sources = new WeakMap();
  let nextSource = 1;
  function sourceRules(element) {
    const result = { candidates: [], unreadableSheets: 0, scannedRules: 0, truncated: false,
      note: 'Matching declaration candidates, NOT resolved cascade winners. Source URLs/selectors are intentionally omitted.' };
    const root = element.getRootNode();
    const shadowSheets = root.nodeType === 11 ? Array.from(root.querySelectorAll('style,link')).map(node => node.sheet).filter(Boolean) : [];
    const sheets = [...(root.styleSheets || []), ...shadowSheets, ...(root.adoptedStyleSheets || [])];
    const seen = new Set();
    function walk(sheet, prefix = '') {
      if (seen.has(sheet)) return;
      seen.add(sheet);
      if (!sources.has(sheet)) sources.set(sheet, 'sheet-' + nextSource++);
      const source = sources.get(sheet);
      let rules;
      try { rules = sheet.cssRules; } catch (_) { result.unreadableSheets++; return; }
      function scan(list, path, conditional = false) {
        for (let i = 0; i < list.length; i++) {
          if (result.scannedRules >= 5000 || result.candidates.length >= 100) { result.truncated = true; return; }
          result.scannedRules++;
          const rule = list[i];
          const position = path + i;
          if (rule.selectorText && rule.style) {
            let matches = false;
            try { matches = element.matches(rule.selectorText); } catch (_) {}
            if (matches) {
              const declarations = {};
              const importantProperties = [];
              for (const name of PROPERTIES) {
                const value = rule.style.getPropertyValue(name);
                if (!value) continue;
                if (rule.style.getPropertyPriority(name) === 'important') importantProperties.push(name);
                declarations[name] = value.length > 256 || /url\s*\(|https?:|data:|blob:/i.test(value) ? '[omitted]' : value;
              }
              if (Object.keys(declarations).length) result.candidates.push({ source, ruleIndexPath: position,
                sourceKind: sheet.ownerNode?.localName === 'style' ? 'inline-stylesheet' : 'external-or-constructed-stylesheet',
                conditionalContextUnresolved: conditional, stylesheetDisabled: !!sheet.disabled, declarations, importantProperties });
            }
          }
          if (rule.styleSheet) walk(rule.styleSheet);
          // Group/nesting conditions are NOT evaluated: candidates are explicitly non-authoritative.
          if (rule.cssRules) scan(rule.cssRules, position + '.', true);
        }
      }
      scan(rules, prefix);
    }
    for (const sheet of sheets) walk(sheet);
    return result;
  }
  function assertActive() {
    if (disposed) throw new Error('Capture has been cleaned up. Reinstall the script.');
  }
  function tagOf(element) {
    const tag = element.localName.toLowerCase();
    return TAGS.has(tag) ? tag : 'other-element';
  }
  function styleOf(element, flags) {
    const view = element.ownerDocument.defaultView;
    if (!view) throw new Error('The selected element has no active document window.');
    const computed = view.getComputedStyle(element);
    const result = {};
    for (const property of PROPERTIES) {
      const value = computed.getPropertyValue(property);
      if (value.length > LIMITS.valueLength || /url\s*\(|https?:|data:|blob:/i.test(value)) {
        result[property] = '[omitted]';
        flags.styleValuesOmitted = true;
      } else result[property] = value;
    }
    return result;
  }
  function capture(label, element) {
    assertActive();
    if (label !== 'normal' && label !== 'abnormal') throw new Error('Label must be normal or abnormal.');
    if (!element || element.nodeType !== 1 || typeof element.localName !== 'string') {
      throw new Error('Select a bubble element in Elements first, then pass $0.');
    }
    if (!element.isConnected) throw new Error('Selected element is detached. Select the current visible bubble.');
    if (['html', 'body', 'head'].includes(element.localName.toLowerCase()) || EXCLUDED.has(element.localName.toLowerCase())) {
      throw new Error('Select the message bubble content, not the entire page, frame, or embedded resource.');
    }
    const other = label === 'normal' ? 'abnormal' : 'normal';
    if (roots.get(other) === element) throw new Error('Choose a different bubble for the second sample.');
    const flags = { nodeLimitReached: false, depthLimitReached: false, styleValuesOmitted: false, shadowContentOmitted: false, excludedContentOmitted: false };
    let visited = 0;
    function visit(node, depth) {
      if (visited >= LIMITS.nodes) { flags.nodeLimitReached = true; return null; }
      visited += 1;
      // Do not read nodeValue, textContent, innerHTML, outerHTML or attributes.
      if (node.nodeType === 3) return { type: 'text-redacted' };
      if (node.nodeType !== 1) return { type: 'non-element-omitted' };
      if (EXCLUDED.has(node.localName.toLowerCase())) {
        flags.excludedContentOmitted = true;
        return { type: 'embedded-or-nonvisual-content-omitted' };
      }
      const item = { tag: tagOf(node), computed: styleOf(node, flags), children: [] };
      if (depth <= 2 && visited <= 12) item.cssCandidates = sourceRules(node);
      if (node.shadowRoot) flags.shadowContentOmitted = true;
      if (depth >= LIMITS.depth) {
        if (node.childNodes.length) flags.depthLimitReached = true;
        return item;
      }
      for (const child of node.childNodes) {
        if (visited >= LIMITS.nodes) { flags.nodeLimitReached = true; break; }
        item.children.push(visit(child, depth + 1));
      }
      return item;
    }
    const tree = visit(element, 0);
    const ancestors = [];
    let ancestor = element.parentElement;
    for (let i = 0; ancestor && i < LIMITS.ancestors; i += 1) {
      ancestors.push({ tag: tagOf(ancestor), computed: styleOf(ancestor, flags), cssCandidates: sourceRules(ancestor) });
      ancestor = ancestor.parentElement;
    }
    const root = element.getRootNode();
    const sample = {
      label, tree, ancestorsNearestFirst: ancestors, visitedNodes: visited,
      inShadowRoot: root.nodeType === 11 && !!root.host,
      inFrame: element.ownerDocument.defaultView !== element.ownerDocument.defaultView.top,
      flags
    };
    const replacesPreviousSample = samples.has(label);
    samples.set(label, sample);
    roots.set(label, element);
    return { captured: label, visitedNodes: visited, flags: { ...flags }, replacesPreviousSample };
  }
  function report() {
    assertActive();
    if (!samples.has('normal') || !samples.has('abnormal')) throw new Error('Capture both normal and abnormal bubbles before exporting.');
    return JSON.stringify({
      format: 'bubble-css-comparison', version: 2, limits: LIMITS,
      scope: 'Sanitized structural tree and allowlisted computed values, not raw HTML.',
      omissions: ['message text', 'all attributes including IDs/classes/URLs', 'source URLs and selectors', 'cookies and storage', 'pseudo-elements', 'frame and shadow descendants', 'fonts and assets'],
      limitations: ['Not a visual replay. No line count or text-length evidence.', 'CSSOM inaccessible sheets are not bypassed. Matching CSS candidates are not cascade winners; source URLs and selector identifiers are omitted.', 'CSS candidate coverage is bounded to shallow descendants and nearest ancestors. Conditional, scoped, nested and disabled stylesheet applicability is not resolved.', 'Computed values may change after capture. Capture both samples in the same state.', 'Closed shadow roots cannot be detected. Slot-distributed children are not traversed.', 'CSS values such as custom font names may identify the site. Review JSON before sharing.'],
      samples: [samples.get('normal'), samples.get('abnormal')]
    }, null, 2);
  }
  function download() {
    const json = report();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bubble-css-comparison.json';
    try { link.click(); } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    return 'Local JSON download requested. Check Downloads; browser policy may block it.';
  }
  const api = Object.freeze({
    capture, report, download,
    reset() { assertActive(); samples.clear(); roots.clear(); return 'Both samples cleared.'; },
    cleanup() {
      samples.clear(); roots.clear(); disposed = true; selection = null; uiAbort.abort(); panelHost?.remove();
      if (window[KEY] === api) delete window[KEY];
      return 'Capture API removed.';
    }
  });
  Object.defineProperty(window, KEY, { value: api, configurable: true, enumerable: false, writable: false });
  function instruction(text) { statuses.message.textContent = text; }
  function arm(label) {
    selection = label;
    instruction((label === 'normal' ? '정상' : '이상') + ' 메시지의 문장을 한 번 클릭하세요. Esc로 취소할 수 있어요.');
  }
  function stopSelection() { selection = null; instruction('선택을 취소했습니다. 다시 선택하거나 닫으세요.'); }
  function inPanel(event) { return event.composedPath().includes(panelHost); }
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'dblclick', 'click']) {
    window.addEventListener(type, event => {
      if (!selection || inPanel(event)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      if (type !== 'click') return;
      let element = event.composedPath().find(node => node?.nodeType === 1);
      if (!element) return;
      const paragraph = element.closest('p,li,blockquote,pre');
      if (paragraph) element = paragraph;
      try {
        const label = selection;
        const result = capture(label, element);
        selection = null;
        statuses[label].textContent = '선택 완료 (' + result.visitedNodes + '개 노드)';
        statuses.save.disabled = !(samples.has('normal') && samples.has('abnormal'));
        instruction('선택한 두 메시지가 맞는지 확인한 뒤 파일 저장을 누르세요.');
      } catch (_) { instruction('이 위치는 수집할 수 없어요. 메시지 본문의 다른 문장을 선택하세요.'); }
    }, { capture: true, signal: uiAbort.signal, passive: false });
  }
  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (selection) { event.preventDefault(); event.stopImmediatePropagation(); stopSelection(); }
    else api.cleanup();
  }, { capture: true, signal: uiAbort.signal });
  panelHost = document.createElement('div');
  Object.assign(panelHost.style, { position: 'fixed', left: '16px', top: '16px', zIndex: '2147483647' });
  const shadow = panelHost.attachShadow({ mode: 'closed' });
  const panel = document.createElement('section');
  Object.assign(panel.style, { width: '310px', padding: '16px', background: '#fff', color: '#17202a',
    border: '2px solid #536dfe', borderRadius: '10px', boxShadow: '0 6px 25px #0004', font: '14px/1.5 sans-serif' });
  const title = document.createElement('strong'); title.textContent = '메시지 줄간격 자료 수집'; panel.append(title);
  const help = document.createElement('p'); help.textContent = '정상 문장과 이상 문장을 하나씩 선택하세요. 대화 내용은 저장하지 않습니다.'; panel.append(help);
  function button(text, action) { const b = document.createElement('button'); b.textContent = text;
    Object.assign(b.style, { padding: '8px', margin: '4px', cursor: 'pointer', font: 'inherit' });
    b.addEventListener('click', action, { signal: uiAbort.signal }); panel.append(b); return b; }
  for (const label of ['normal', 'abnormal']) {
    button(label === 'normal' ? '1. 정상 문장 선택' : '2. 이상 문장 선택', () => arm(label));
    const status = document.createElement('small'); status.textContent = '아직 선택하지 않았어요';
    status.style.display = 'block'; panel.append(status); statuses[label] = status;
  }
  statuses.message = document.createElement('p'); panel.append(statuses.message);
  instruction('선택 중에는 페이지 버튼 작동을 잠시 막습니다.');
  statuses.save = button('3. JSON 파일 저장', () => {
    selection = null;
    try { download(); instruction('다운로드 폴더를 확인하세요. 공유 전 파일을 검토해주세요.'); }
    catch (_) { instruction('저장하지 못했습니다. 두 문장을 다시 선택하거나 담당자에게 알려주세요.'); }
  });
  statuses.save.disabled = true;
  button('닫기', () => api.cleanup());
  shadow.append(panel); document.documentElement.append(panelHost);
  return 'Capture panel ready. Choose normal and abnormal text, then save.';
})();
