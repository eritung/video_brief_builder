/* Video Brief Builder V1 - browser-only prototype */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const STORAGE_KEY = 'videoBriefBuilderV11Project';
  const PRESET_KEY = 'videoBriefBuilderV1Presets';

  const STATUS_META = {
    unchanged: { label: '未變更', cls: 'status-unchanged' },
    removed: { label: '移除', cls: 'status-removed' },
    added: { label: '疑似新增', cls: 'status-added' },
    moved: { label: '順序調換', cls: 'status-moved' },
    modified: { label: '文字修改', cls: 'status-modified' },
    moved_modified: { label: '調換＋文字修改', cls: 'status-moved_modified' },
    uncertain: { label: '需確認', cls: 'status-uncertain' },
  };

  const DEFAULT_PRESETS = [
    { id: uid(), cat: '畫面', label: 'ACAM', text: 'ACAM' },
    { id: uid(), cat: '畫面', label: 'BCAM', text: 'BCAM' },
    { id: uid(), cat: '素材', label: '影片素材', text: '加入影片素材' },
    { id: uid(), cat: '素材', label: '滿版視覺', text: '加入滿版視覺' },
    { id: uid(), cat: '素材', label: '螢幕錄影', text: '加入螢幕錄影' },
    { id: uid(), cat: '字幕', label: '一般字幕', text: '一般字幕' },
    { id: uid(), cat: '字幕', label: '超大字幕', text: '「關鍵字」→ 超大字幕' },
    { id: uid(), cat: '字幕', label: '加入字卡', text: '加入字卡「文字」' },
    { id: uid(), cat: '字幕', label: '逐項字卡', text: '逐項出現字卡：' },
    { id: uid(), cat: '字幕', label: '移除字幕', text: '移除一般字幕' },
    { id: uid(), cat: '畫面', label: '畫面放大', text: '畫面逐漸放大' },
    { id: uid(), cat: '畫面', label: '快速拉近', text: '快速拉近畫面進場' },
    { id: uid(), cat: '畫面', label: '漸層底', text: '加入漸層底' },
    { id: uid(), cat: '畫面', label: '模糊背景', text: '畫面模糊處理' },
    { id: uid(), cat: '音效', label: '重音', text: '加入「咚／叮」等重音音效' },
    { id: uid(), cat: '音效', label: '轉場音效', text: '加入轉場音效' },
    { id: uid(), cat: '音效', label: '換音樂', text: '從此處更換背景音樂' },
    { id: uid(), cat: '動畫', label: '淡入', text: '畫面淡入' },
    { id: uid(), cat: '動畫', label: '翻面', text: '圖卡翻面進場' },
    { id: uid(), cat: '動畫', label: '縮放進場', text: '從物件中央縮放進場' },
    { id: uid(), cat: '動畫', label: '閃白光', text: '加入閃白光轉場' },
    { id: uid(), cat: '動畫', label: '底片閃光', text: '加入底片閃光效果' },
    { id: uid(), cat: '剪輯', label: '剪停頓', text: '剪掉不必要的停頓' },
    { id: uid(), cat: '剪輯', label: '整體加速', text: '影片整體加快 1.25 倍' },
    { id: uid(), cat: '移除', label: '移除此段', text: '移除此段' },
    { id: uid(), cat: '移除', label: '移除指定字', text: '移除「指定文字」' },
    { id: uid(), cat: '剪輯', label: '移到前面', text: '將此片段移到前面' },
    { id: uid(), cat: '剪輯', label: '移到後面', text: '將此片段移到後面' },
  ];

  let presets = loadPresets();
  let state = loadProject() || newProject();
  let activeFilter = 'all';

  const els = {
    projectName: $('#projectName'), versionName: $('#versionName'), densitySelect: $('#densitySelect'), mergeSelect: $('#mergeSelect'),
    oldInput: $('#oldSubtitleInput'), newInput: $('#newSubtitleInput'), oldPaste: $('#oldPaste'), newPaste: $('#newPaste'),
    oldBadge: $('#oldFileBadge'), newBadge: $('#newFileBadge'), analyzeBtn: $('#analyzeBtn'), clearBtn: $('#clearBtn'),
    results: $('#resultsSection'), summaryChips: $('#summaryChips'), filterRow: $('#filterRow'), blocks: $('#blocksContainer'),
    changedOnly: $('#changedOnlyToggle'), autoReq: $('#autoReqToggle'), globalReqList: $('#globalReqList'), pageEstimate: $('#pageEstimate'),
    presetModal: $('#presetModal'), presetEditor: $('#presetEditor'), previewModal: $('#previewModal'), slidePreview: $('#slidePreview'),
    projectFileInput: $('#projectFileInput')
  };

  init();

  function init() {
    hydrateTopFields();
    bindFileInput(els.oldInput, 'old');
    bindFileInput(els.newInput, 'new');
    bindDropZone($('#oldDropZone'), 'old');
    bindDropZone($('#newDropZone'), 'new');
    bindEvents();
    const demoMode = new URLSearchParams(location.search).get('demo') === '1';
    if (demoMode && !state.blocks?.length) loadDemo();
    else if (state.blocks?.length) renderAll();
  }

  function bindEvents() {
    els.analyzeBtn.addEventListener('click', analyze);
    els.clearBtn.addEventListener('click', clearProject);
    $('#presetBtn').addEventListener('click', openPresetModal);
    $('#previewBtn').addEventListener('click', openPreviewModal);
    $('#exportPptxBtn').addEventListener('click', exportPptx);
    $('#exportPptxTopBtn').addEventListener('click', exportPptx);
    $('#exportProjectBtn').addEventListener('click', exportProject);
    $('#importProjectBtn').addEventListener('click', () => els.projectFileInput.click());
    $('#loadDemoBtn').addEventListener('click', loadDemo);
    els.projectFileInput.addEventListener('change', importProject);
    $('#addGlobalReqBtn').addEventListener('click', () => { state.globalRequirements.push(''); saveAndRenderGlobals(); });
    els.changedOnly.addEventListener('change', renderBlocks);
    els.autoReq.addEventListener('change', () => { state.autoRequirements = els.autoReq.checked; saveProject(); });
    els.projectName.addEventListener('input', syncProjectMeta);
    els.versionName.addEventListener('input', syncProjectMeta);
    els.densitySelect.addEventListener('change', () => { state.density = els.densitySelect.value; saveProject(); updatePageEstimate(); });
    els.mergeSelect.addEventListener('change', () => { state.mergeMode = els.mergeSelect.value; saveProject(); });
    $$('.modal [data-close-modal]').forEach(el => el.addEventListener('click', () => closeModal(el.dataset.closeModal)));
    $('#resetPresetsBtn').addEventListener('click', () => { presets = clone(DEFAULT_PRESETS); renderPresetEditor(); });
    $('#addPresetBtn').addEventListener('click', () => { presets.push({ id: uid(), cat: '其他', label: '新需求', text: '' }); renderPresetEditor(); });
    $('#savePresetsBtn').addEventListener('click', savePresetEditor);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal:not(.hidden)').forEach(m => m.classList.add('hidden')); });
  }

  function newProject() {
    return { version: 1.1, projectName: '影音需求', versionName: 'ACO', density: 'standard', mergeMode: 'standard', oldRaw: '', newRaw: '', oldName: '', newName: '', blocks: [], globalRequirements: [], autoRequirements: true, createdAt: Date.now(), updatedAt: Date.now() };
  }

  function hydrateTopFields() {
    els.projectName.value = state.projectName || '影音需求';
    els.versionName.value = state.versionName || 'ACO';
    els.densitySelect.value = state.density || 'standard';
    els.mergeSelect.value = state.mergeMode || 'standard';
    els.oldPaste.value = state.oldRaw || '';
    els.newPaste.value = state.newRaw || '';
    els.oldBadge.textContent = state.oldName || (state.oldRaw ? '已貼上字幕' : '尚未匯入');
    els.newBadge.textContent = state.newName || (state.newRaw ? '已貼上字幕' : '選填');
    els.autoReq.checked = state.autoRequirements !== false;
  }

  function bindFileInput(input, key) {
    input.addEventListener('change', async () => {
      const file = input.files?.[0]; if (!file) return;
      const text = await file.text();
      if (key === 'old') { state.oldRaw = text; state.oldName = file.name; els.oldPaste.value = text; els.oldBadge.textContent = file.name; }
      else { state.newRaw = text; state.newName = file.name; els.newPaste.value = text; els.newBadge.textContent = file.name; }
      saveProject();
    });
  }

  function bindDropZone(zone, key) {
    ['dragenter','dragover'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); zone.style.outline = '2px solid #7f9ff0'; }));
    ['dragleave','drop'].forEach(evt => zone.addEventListener(evt, e => { e.preventDefault(); zone.style.outline = ''; }));
    zone.addEventListener('drop', async e => {
      const file = e.dataTransfer.files?.[0]; if (!file) return;
      const text = await file.text();
      if (key === 'old') { state.oldRaw = text; state.oldName = file.name; els.oldPaste.value = text; els.oldBadge.textContent = file.name; }
      else { state.newRaw = text; state.newName = file.name; els.newPaste.value = text; els.newBadge.textContent = file.name; }
      saveProject();
    });
  }

  function syncProjectMeta() {
    state.projectName = els.projectName.value.trim() || '影音需求';
    state.versionName = els.versionName.value.trim();
    saveProject();
  }

  function analyze() {
    syncProjectMeta();
    state.oldRaw = els.oldPaste.value.trim();
    state.newRaw = els.newPaste.value.trim();
    state.mergeMode = els.mergeSelect.value;
    state.density = els.densitySelect.value;
    state.autoRequirements = els.autoReq.checked;
    if (!state.oldRaw && !state.newRaw) return alert('請至少匯入或貼上一份字幕。');

    const oldCues = parseSubtitle(state.oldRaw || state.newRaw);
    const newCues = state.newRaw ? parseSubtitle(state.newRaw) : [];
    if (!oldCues.length) return alert('沒有讀到時間碼。請確認字幕格式是否包含起訖時間。');
    // V1.1: 字幕 A 永遠是文字與分段的基準。字幕 B 只負責判斷片段是否保留、移除、調換或疑似新增。
    const oldBlocks = mergeCues(oldCues, state.mergeMode);

    if (state.newRaw && newCues.length) {
      state.blocks = compareAgainstCanonicalA(oldBlocks, newCues, state.autoRequirements);
    } else {
      state.blocks = oldBlocks.map((b, i) => makeEditorBlock({ ...b, newIndex: i, oldIndex: i, status: 'unchanged', similarity: 1, textSource:'A' }, false));
    }
    state.updatedAt = Date.now();
    saveProject();
    renderAll();
  }

  function parseSubtitle(raw) {
    const lines = raw.replace(/\r/g, '').split('\n');
    const cues = [];
    const timeRe = /^\s*((?:\d{1,2}:)?\d{1,2}:\d{1,2}(?:(?::\d{1,3})|(?:[,.]\d{1,3}))?)\s*(?:-->|-|–|—)\s*((?:\d{1,2}:)?\d{1,2}:\d{1,2}(?:(?::\d{1,3})|(?:[,.]\d{1,3}))?)\s*$/;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      const m = line.match(timeRe);
      if (!m) { i++; continue; }
      const startRaw = m[1], endRaw = m[2];
      i++;
      const textLines = [];
      while (i < lines.length) {
        const candidate = lines[i].trim();
        if (candidate.match(timeRe)) break;
        // SRT cue index: ignore a standalone number immediately before the next timecode.
        if (/^\d+$/.test(candidate) && ((lines[i+1] || '').trim().match(timeRe) || !textLines.length)) { i++; if (textLines.length) break; continue; }
        if (candidate) textLines.push(candidate.replace(/<[^>]+>/g, ''));
        i++;
      }
      const text = textLines.reduce((acc, line) => smartJoin(acc, line), '').replace(/[ \t]+/g, ' ').trim();
      if (text) cues.push({ id: uid(), startRaw, endRaw, start: timeToSeconds(startRaw), end: timeToSeconds(endRaw), text });
    }
    return cues;
  }

  function timeToSeconds(t) {
    const clean = t.replace(',', '.');
    if (clean.split(':').length === 4) {
      const [h,m,s,f] = clean.split(':').map(Number); return h*3600+m*60+s+(f||0)/30;
    }
    const p = clean.split(':').map(Number);
    if (p.length === 3) return p[0]*3600+p[1]*60+p[2];
    if (p.length === 2) return p[0]*60+p[1];
    return Number(clean)||0;
  }

  function mergeCues(cues, mode='standard') {
    // 字幕沒有標點時，不依原始分行硬切；改以句長、停頓與常見語意起始詞做近似分句。
    if (mode === 'original') return cues.map(cue => ({ id: uid(), start: cue.start, end: cue.end, startRaw: cue.startRaw, endRaw: cue.endRaw, text: cue.text, sourceCueIds:[cue.id] }));
    const cfg = mode === 'long' ? { target: 42, max: 64 } : { target: 30, max: 46 };
    const boundaryRe = /^(有些人|很多人|這類|常被|那可以|不要|可以先|如果|所以|但是|但|卻|現在|而且|三高|雖然|例如|因為|即使|仍有|慢性發炎|因此|想要|第一步|看看|先瞭解|再決定|接著|身體一定|我自己|曾經|現在都|從營養|一個一個|這幾年|其實|常常|最後|我希望|讓健康|只要|找到|健康永遠|除了一開始|不同毒型|光知道|不是|而是)/;
    const out = [];
    let cur = null;
    for (let i=0; i<cues.length; i++) {
      const cue = cues[i];
      if (!cur) { cur = { id: uid(), start: cue.start, end: cue.end, startRaw: cue.startRaw, endRaw: cue.endRaw, text: cue.text, sourceCueIds:[cue.id] }; continue; }
      const gap = Math.max(0, cue.start - cur.end);
      const punctuationEnd = /[。！？!?…]$/.test(cur.text.trim());
      const nextWouldExceed = cur.text.length + cue.text.length > cfg.max;
      const semanticBoundary = cur.text.length >= Math.max(14, cfg.target * .62) && boundaryRe.test(cue.text.trim());
      const breakNow = gap > 0.95 || punctuationEnd || nextWouldExceed || semanticBoundary || (cur.text.length >= cfg.target && gap > 0.08);
      if (breakNow) {
        out.push(cur);
        cur = { id: uid(), start: cue.start, end: cue.end, startRaw: cue.startRaw, endRaw: cue.endRaw, text: cue.text, sourceCueIds:[cue.id] };
      } else {
        cur.text = smartJoin(cur.text, cue.text);
        cur.end = cue.end; cur.endRaw = cue.endRaw; cur.sourceCueIds.push(cue.id);
      }
    }
    if (cur) out.push(cur);
    return out;
  }

  function smartJoin(a,b) {
    if (!a) return b; if (!b) return a;
    const aLast = a.slice(-1), bFirst = b.slice(0,1);
    const needsSpace = /[A-Za-z0-9]$/.test(aLast) && /^[A-Za-z0-9]/.test(bFirst);
    return a + (needsSpace ? ' ' : '') + b;
  }

  function compareAgainstCanonicalA(oldBlocks, newCues, autoReq=true) {
    // A 為 canonical：所有已匹配片段都顯示 A 的文字；B 只提供新版位置與「是否還存在」的訊號。
    const candidates = [];
    const maxWindow = 10;

    oldBlocks.forEach((ab, ai) => {
      const aNorm = norm(ab.text);
      const aLen = aNorm.length;
      if (!aLen) return;
      for (let start = 0; start < newCues.length; start++) {
        let text = '';
        for (let end = start; end < Math.min(newCues.length, start + maxWindow); end++) {
          text = smartJoin(text, newCues[end].text);
          const bNorm = norm(text);
          const bLen = bNorm.length;
          if (!bLen) continue;
          if (bLen < Math.max(3, aLen * .30)) continue;
          if (bLen > Math.max(aLen * 2.1, aLen + 28)) break;

          let score = textSimilarity(ab.text, text);
          const coverage = Math.min(aLen, bLen) / Math.max(1, Math.max(aLen, bLen));
          if (aNorm === bNorm) score = 1;
          else if ((aNorm.includes(bNorm) || bNorm.includes(aNorm)) && coverage >= .62) {
            score = Math.max(score, .68 + coverage * .28);
          }
          if (score >= .56) {
            candidates.push({
              ai, start, end, score, coverage, text,
              startRaw:newCues[start].startRaw, endRaw:newCues[end].endRaw,
              startSec:newCues[start].start, endSec:newCues[end].end
            });
          }
        }
      }
    });

    // 先取最可信的配對；同一段 B 不重複配給不同 A 區塊。
    candidates.sort((x,y) => {
      if (Math.abs(y.score - x.score) > .0001) return y.score - x.score;
      if (Math.abs(y.coverage - x.coverage) > .0001) return y.coverage - x.coverage;
      return (x.end-x.start) - (y.end-y.start);
    });
    const usedA = new Set();
    const usedB = new Set();
    const selected = [];
    for (const c of candidates) {
      if (usedA.has(c.ai)) continue;
      let overlaps = false;
      for (let j=c.start;j<=c.end;j++) if (usedB.has(j)) { overlaps=true; break; }
      if (overlaps) continue;
      usedA.add(c.ai);
      for (let j=c.start;j<=c.end;j++) usedB.add(j);
      selected.push(c);
    }

    // 依新版出現順序判斷哪些 A 區塊發生搬移。
    const byNewOrder = [...selected].sort((a,b)=>a.start-b.start || a.end-b.end);
    const lisPositions = new Set(longestIncreasingSubsequenceIndices(byNewOrder.map(m=>m.ai)));
    byNewOrder.forEach((m,pos)=>{m.moved=!lisPositions.has(pos);m.newRank=pos;});

    const timeline = [];
    byNewOrder.forEach(m => {
      const ab = oldBlocks[m.ai];
      const status = m.score < .70 ? 'uncertain' : (m.moved ? 'moved' : 'unchanged');
      timeline.push({
        order:m.startSec,
        block:makeEditorBlock({
          ...ab,
          text:ab.text,
          compareText:m.text,
          startRaw:m.startRaw,
          endRaw:m.endRaw,
          oldStartRaw:ab.startRaw,
          oldEndRaw:ab.endRaw,
          newIndex:m.newRank,
          oldIndex:m.ai,
          status,
          similarity:m.score,
          textSource:'A',
          timeSource:'B'
        }, autoReq)
      });
    });

    // B 中完全沒有被 A 配對到的連續片段，只標成「疑似新增」，不視為可信主文。
    let run = [];
    const flushRun = () => {
      if (!run.length) return;
      const merged = mergeCues(run, 'standard');
      merged.forEach(nb => {
        timeline.push({
          order:nb.start,
          block:makeEditorBlock({
            ...nb,
            text:nb.text,
            compareText:nb.text,
            newIndex:null,
            oldIndex:null,
            status:'added',
            similarity:0,
            textSource:'B',
            timeSource:'B'
          }, autoReq)
        });
      });
      run = [];
    };
    newCues.forEach((cue,i)=>{
      if (usedB.has(i)) flushRun();
      else run.push(cue);
    });
    flushRun();

    timeline.sort((a,b)=>a.order-b.order);
    // 重新給新版顯示序號，方便「舊版 # → 新版 #」說明。
    let rank = 0;
    timeline.forEach(item=>{
      if (item.block.status !== 'removed') item.block.newIndex = rank++;
      if (item.block.status === 'moved') {
        const autoMove = item.block.requirements.find(r=>r.auto && r.text.startsWith('順序調換｜'));
        if (autoMove) autoMove.text = `順序調換｜舊版 #${(item.block.oldIndex??0)+1} → 新版 #${(item.block.newIndex??0)+1}`;
      }
    });

    const output = timeline.map(x=>x.block);
    oldBlocks.forEach((ab, ai)=>{
      if (!usedA.has(ai)) {
        output.push(makeEditorBlock({
          ...ab,
          text:ab.text,
          compareText:'',
          newIndex:null,
          oldIndex:ai,
          status:'removed',
          similarity:0,
          textSource:'A',
          timeSource:'A'
        }, autoReq));
      }
    });
    return output;
  }

  function compareBlocks(oldBlocks, newBlocks, autoReq=true) {
    const oldUsed = new Set(), newUsed = new Set();
    const matches = [];

    // exact pass
    newBlocks.forEach((nb, ni) => {
      const n = norm(nb.text);
      let best = -1, bestDist = Infinity;
      oldBlocks.forEach((ob, oi) => {
        if (oldUsed.has(oi) || norm(ob.text) !== n) return;
        const dist = Math.abs((oi / Math.max(1, oldBlocks.length-1)) - (ni / Math.max(1, newBlocks.length-1)));
        if (dist < bestDist) { best = oi; bestDist = dist; }
      });
      if (best >= 0) { oldUsed.add(best); newUsed.add(ni); matches.push({ oi:best, ni, score:1 }); }
    });

    // fuzzy candidate pass
    const candidates = [];
    newBlocks.forEach((nb, ni) => {
      if (newUsed.has(ni)) return;
      oldBlocks.forEach((ob, oi) => {
        if (oldUsed.has(oi)) return;
        const lenRatio = Math.min(norm(nb.text).length, norm(ob.text).length) / Math.max(1, Math.max(norm(nb.text).length, norm(ob.text).length));
        if (lenRatio < .42) return;
        const score = textSimilarity(ob.text, nb.text);
        if (score >= .62) candidates.push({ oi, ni, score });
      });
    });
    candidates.sort((a,b) => b.score-a.score);
    for (const c of candidates) {
      if (oldUsed.has(c.oi) || newUsed.has(c.ni)) continue;
      oldUsed.add(c.oi); newUsed.add(c.ni); matches.push(c);
    }

    // moved = matched old-index sequence elements outside LIS
    const sorted = [...matches].sort((a,b)=>a.ni-b.ni);
    const lisPositions = new Set(longestIncreasingSubsequenceIndices(sorted.map(m=>m.oi)));
    sorted.forEach((m, pos)=>m.moved = !lisPositions.has(pos));

    const byNew = new Map(sorted.map(m => [m.ni,m]));
    const output = [];
    newBlocks.forEach((nb, ni) => {
      const m = byNew.get(ni);
      if (!m) {
        output.push(makeEditorBlock({ ...nb, newIndex:ni, oldIndex:null, status:'added', similarity:0 }, autoReq));
      } else {
        const ob = oldBlocks[m.oi];
        const modified = norm(ob.text) !== norm(nb.text);
        let status = 'unchanged';
        if (m.moved && modified) status='moved_modified'; else if (m.moved) status='moved'; else if (modified) status='modified';
        const block = makeEditorBlock({ ...nb, newIndex:ni, oldIndex:m.oi, status, similarity:m.score, oldText:ob.text, oldStartRaw:ob.startRaw, oldEndRaw:ob.endRaw }, autoReq);
        output.push(block);
      }
    });

    // removed blocks appended as a clear section; their old position/time remain explicit
    oldBlocks.forEach((ob, oi) => {
      if (!oldUsed.has(oi)) output.push(makeEditorBlock({ ...ob, newIndex:null, oldIndex:oi, status:'removed', similarity:0 }, autoReq));
    });
    return output;
  }

  function makeEditorBlock(data, autoReq=true) {
    const b = {
      id: uid(), status:data.status||'unchanged', similarity:data.similarity ?? 1,
      oldIndex:data.oldIndex ?? null, newIndex:data.newIndex ?? null,
      startRaw:data.startRaw||'', endRaw:data.endRaw||'', oldStartRaw:data.oldStartRaw||'', oldEndRaw:data.oldEndRaw||'',
      text:data.text||'', oldText:data.oldText||'', compareText:data.compareText||'', textSource:data.textSource||'A', timeSource:data.timeSource||'A', requirements:[], links:[], images:[], forceBreak:false
    };
    if (autoReq) b.requirements.push(...autoRequirementsFor(b));
    return b;
  }

  function autoRequirementsFor(b) {
    if (b.status === 'removed') return [{ id:uid(), cat:'移除', text:'移除此段', auto:true }];
    if (b.status === 'added') return [{ id:uid(), cat:'剪輯', text:'疑似新增片段｜請確認實際影片內容', auto:true }];
    if (b.status === 'moved') return [{ id:uid(), cat:'剪輯', text:`順序調換｜舊版 #${(b.oldIndex??0)+1} → 新版 #${(b.newIndex??0)+1}`, auto:true }];
    if (b.status === 'modified') return [{ id:uid(), cat:'剪輯', text:'文字／剪輯內容有調整，請以新版台詞為準', auto:true }];
    if (b.status === 'uncertain') return [{ id:uid(), cat:'剪輯', text:'新版轉錄與字幕 A 差異較大｜請確認實際影片內容', auto:true }];
    if (b.status === 'moved_modified') return [
      { id:uid(), cat:'剪輯', text:`順序調換｜舊版 #${(b.oldIndex??0)+1} → 新版 #${(b.newIndex??0)+1}`, auto:true },
      { id:uid(), cat:'剪輯', text:'文字／剪輯內容有調整，請以新版台詞為準', auto:true }
    ];
    return [];
  }

  function textSimilarity(a,b) {
    const x = norm(a), y = norm(b); if (!x || !y) return 0; if (x === y) return 1;
    const lev = 1 - levenshtein(x,y) / Math.max(x.length,y.length);
    const dice = diceCoefficient(x,y);
    return .64*lev + .36*dice;
  }
  function norm(s){ return String(s||'').toLowerCase().replace(/[\s\p{P}\p{S}]/gu,''); }
  function levenshtein(a,b){ const m=a.length,n=b.length; const prev=new Array(n+1),cur=new Array(n+1); for(let j=0;j<=n;j++)prev[j]=j; for(let i=1;i<=m;i++){cur[0]=i; for(let j=1;j<=n;j++){cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));} for(let j=0;j<=n;j++)prev[j]=cur[j];} return prev[n]; }
  function diceCoefficient(a,b){ if(a.length<2||b.length<2)return a===b?1:0; const map=new Map(); for(let i=0;i<a.length-1;i++){const g=a.slice(i,i+2);map.set(g,(map.get(g)||0)+1);} let hit=0; for(let i=0;i<b.length-1;i++){const g=b.slice(i,i+2),c=map.get(g)||0;if(c){hit++;map.set(g,c-1);}} return 2*hit/((a.length-1)+(b.length-1)); }
  function longestIncreasingSubsequenceIndices(arr){ const tails=[],tailsIdx=[],prev=new Array(arr.length).fill(-1); for(let i=0;i<arr.length;i++){let l=0,r=tails.length;while(l<r){const mid=(l+r)>>1;if(tails[mid]<arr[i])l=mid+1;else r=mid;} if(l>0)prev[i]=tailsIdx[l-1]; tails[l]=arr[i]; tailsIdx[l]=i;} const out=[]; let k=tailsIdx[tails.length-1]; while(k!=null&&k>=0){out.push(k);k=prev[k];} return out.reverse(); }

  function renderAll() {
    els.results.classList.remove('hidden');
    renderSummary(); renderGlobals(); renderBlocks(); updatePageEstimate();
  }

  function renderSummary() {
    const counts = Object.fromEntries(Object.keys(STATUS_META).map(k=>[k,0]));
    state.blocks.forEach(b=>counts[b.status]=(counts[b.status]||0)+1);
    const ordered = ['removed','added','moved','uncertain','unchanged'];
    els.summaryChips.innerHTML = ordered.map(k => `<div class="summary-chip"><strong>${counts[k]||0}</strong><span>${STATUS_META[k].label}</span></div>`).join('');
    els.filterRow.innerHTML = `<button class="filter-chip ${activeFilter==='all'?'active':''}" data-filter="all">全部</button>` + ordered.map(k=>`<button class="filter-chip ${activeFilter===k?'active':''}" data-filter="${k}">${STATUS_META[k].label}</button>`).join('');
    $$('.filter-chip', els.filterRow).forEach(btn=>btn.addEventListener('click',()=>{activeFilter=btn.dataset.filter;renderSummary();renderBlocks();}));
  }

  function renderGlobals() {
    els.globalReqList.innerHTML='';
    state.globalRequirements.forEach((text,i)=>{
      const row=document.createElement('div'); row.className='mini-item';
      row.innerHTML=`<input value="${escapeAttr(text)}" placeholder="例如：影片整體加快 1.4 倍"><button title="刪除">×</button>`;
      $('input',row).addEventListener('input',e=>{state.globalRequirements[i]=e.target.value;saveProject();updatePageEstimate();});
      $('button',row).addEventListener('click',()=>{state.globalRequirements.splice(i,1);saveAndRenderGlobals();});
      els.globalReqList.appendChild(row);
    });
  }

  function saveAndRenderGlobals(){saveProject();renderGlobals();updatePageEstimate();}

  function renderBlocks() {
    els.blocks.innerHTML='';
    const changedOnly=els.changedOnly.checked;
    state.blocks.forEach((b, idx) => {
      if (changedOnly && b.status==='unchanged') return;
      if (activeFilter!=='all' && b.status!==activeFilter) return;
      const node=$('#blockTemplate').content.firstElementChild.cloneNode(true);
      const meta=STATUS_META[b.status]||STATUS_META.unchanged;
      const pill=$('.status-pill',node); pill.textContent=meta.label; pill.className=`status-pill ${meta.cls}`;
      const parts=[]; if(b.oldIndex!=null)parts.push(`字幕 A #${b.oldIndex+1}`); if(b.newIndex!=null)parts.push(`新版位置 #${b.newIndex+1}`); if(b.similarity && b.status!=='unchanged')parts.push(`比對相似度 ${Math.round(b.similarity*100)}%`); if(b.textSource==='A')parts.push('文字以 A 為準');
      $('.position-meta',node).textContent=parts.join(' · ');
      const timeLabel=b.timeSource==='B'?'新版時間':'原始時間';
      $('.time-row',node).textContent=`${timeLabel}｜${b.startRaw||'—'} → ${b.endRaw||'—'}`;
      const ta=$('.script-text',node); ta.value=b.text; if(b.status==='removed')ta.classList.add('deleted');
      ta.addEventListener('input',e=>{b.text=e.target.value;saveProject();updatePageEstimate();});
      if(b.compareText && b.textSource==='A' && norm(b.compareText)!==norm(b.text) && (b.status==='uncertain' || b.similarity < .90)){ const wrap=$('.compare-text-wrap',node);wrap.classList.remove('hidden');$('.compare-text',wrap).textContent=b.compareText; }
      const force=$('.force-break',node);force.checked=!!b.forceBreak;force.addEventListener('change',e=>{b.forceBreak=e.target.checked;saveProject();updatePageEstimate();});
      $('.merge-prev',node).disabled = idx===0;
      $('.merge-next',node).disabled = idx===state.blocks.length-1;
      $('.merge-prev',node).addEventListener('click',()=>mergeEditorBlocks(idx-1,idx));
      $('.merge-next',node).addEventListener('click',()=>mergeEditorBlocks(idx,idx+1));
      $('.split-here',node).addEventListener('click',()=>splitEditorBlock(idx,ta.selectionStart));
      renderPresetChips(node,b,idx); renderRequirements(node,b); renderLinks(node,b); renderImages(node,b);
      $('.add-custom-req',node).addEventListener('click',()=>{const input=$('.custom-req-input',node);const v=input.value.trim();if(!v)return;b.requirements.push({id:uid(),cat:'其他',text:v});input.value='';saveProject();renderBlocks();});
      $('.custom-req-input',node).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('.add-custom-req',node).click();}});
      $('.add-link',node).addEventListener('click',()=>{const label=$('.link-label-input',node).value.trim()||'REF';const url=$('.link-url-input',node).value.trim();if(!url)return;b.links.push({id:uid(),label,url});saveProject();renderBlocks();});
      $('.image-input',node).addEventListener('change',async e=>{for(const file of [...e.target.files]){if(file.size>2.5*1024*1024){alert(`${file.name} 太大，V1 原型先限制單張 2.5MB。`);continue;}const data=await fileToDataURL(file);b.images.push({id:uid(),name:file.name,data});}saveProject();renderBlocks();});
      els.blocks.appendChild(node);
    });
    updatePageEstimate();
  }

  function mergeEditorBlocks(leftIndex, rightIndex) {
    if (leftIndex < 0 || rightIndex >= state.blocks.length || leftIndex >= rightIndex) return;
    const a = state.blocks[leftIndex], b = state.blocks[rightIndex];
    a.text = smartJoin(a.text, b.text);
    a.endRaw = b.endRaw || a.endRaw;
    a.requirements.push(...(b.requirements || []));
    a.links.push(...(b.links || []));
    a.images.push(...(b.images || []));
    a.forceBreak = a.forceBreak || b.forceBreak;
    if (a.status !== b.status) a.status = a.status === 'unchanged' ? b.status : a.status;
    state.blocks.splice(rightIndex, 1);
    saveProject(); renderAll();
  }

  function splitEditorBlock(index, cursor) {
    const b = state.blocks[index]; if (!b) return;
    const pos = Number(cursor);
    if (!Number.isFinite(pos) || pos <= 0 || pos >= b.text.length) return alert('請先把文字游標放在想拆分的位置，再按「從游標拆分」。');
    const left = b.text.slice(0,pos).trim(), right = b.text.slice(pos).trim();
    if (!left || !right) return;
    const startSec=timeToSeconds(b.startRaw), endSec=timeToSeconds(b.endRaw);
    const splitSec=startSec+(endSec-startSec)*(left.length/(left.length+right.length));
    const mid=formatLikeTime(b.startRaw,splitSec);
    b.text=left; b.endRaw=mid;
    const cloneBlock={...clone(b),id:uid(),text:right,startRaw:mid,endRaw:b.__originalEndRaw||state.blocks[index].__originalEndRaw||formatLikeTime(b.endRaw,endSec),requirements:[],links:[],images:[],forceBreak:false};
    cloneBlock.endRaw = formatLikeTime(b.startRaw,endSec);
    state.blocks.splice(index+1,0,cloneBlock);
    saveProject(); renderAll();
  }

  function formatLikeTime(example, seconds) {
    const ex=String(example||'00:00:00:00');
    const h=Math.floor(seconds/3600); seconds-=h*3600; const m=Math.floor(seconds/60); seconds-=m*60; const s=Math.floor(seconds); const frac=seconds-s;
    const pad=n=>String(n).padStart(2,'0');
    if (ex.includes(',')) return `${pad(h)}:${pad(m)}:${pad(s)},${String(Math.round(frac*1000)).padStart(3,'0')}`;
    if (ex.includes('.') && ex.split(':').length===3) return `${pad(h)}:${pad(m)}:${pad(s)}.${String(Math.round(frac*1000)).padStart(3,'0')}`;
    const f=Math.max(0,Math.min(29,Math.round(frac*30))); return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
  }

  function renderPresetChips(node,b) {
    const wrap=$('.preset-chips',node); wrap.innerHTML='';
    presets.forEach(p=>{const btn=document.createElement('button');btn.className='preset-chip';btn.textContent=p.label;btn.title=p.text;btn.addEventListener('click',()=>{b.requirements.push({id:uid(),cat:p.cat,text:p.text});saveProject();renderBlocks();});wrap.appendChild(btn);});
  }

  function renderRequirements(node,b) {
    const wrap=$('.requirement-list',node);wrap.innerHTML='';
    $('.auto-hint',node).textContent=b.requirements.some(r=>r.auto)?'含系統自動帶入':'';
    b.requirements.forEach((r,i)=>{const row=document.createElement('div');row.className='req-item';row.innerHTML=`<span class="req-cat cat-${escapeAttr(r.cat)}">${escapeHtml(r.cat)}</span><input value="${escapeAttr(r.text)}"><button class="remove-btn" title="刪除">×</button>`;$('input',row).addEventListener('input',e=>{r.text=e.target.value;saveProject();updatePageEstimate();});$('.remove-btn',row).addEventListener('click',()=>{b.requirements.splice(i,1);saveProject();renderBlocks();});wrap.appendChild(row);});
  }

  function renderLinks(node,b){const wrap=$('.link-list',node);wrap.innerHTML='';b.links.forEach((l,i)=>{const row=document.createElement('div');row.className='link-item';row.innerHTML=`<input class="ll" value="${escapeAttr(l.label)}"><input class="lu" value="${escapeAttr(l.url)}"><button class="remove-btn">×</button>`;$('.ll',row).addEventListener('input',e=>{l.label=e.target.value;saveProject();});$('.lu',row).addEventListener('input',e=>{l.url=e.target.value;saveProject();});$('.remove-btn',row).addEventListener('click',()=>{b.links.splice(i,1);saveProject();renderBlocks();});wrap.appendChild(row);});}
  function renderImages(node,b){const wrap=$('.image-list',node);wrap.innerHTML='';b.images.forEach((im,i)=>{const d=document.createElement('div');d.className='image-thumb';d.innerHTML=`<img src="${im.data}" alt="${escapeAttr(im.name||'REF')}"><button>×</button>`;$('button',d).addEventListener('click',()=>{b.images.splice(i,1);saveProject();renderBlocks();});wrap.appendChild(d);});}

  function getPages() {
    const cap = state.density==='compact'?10.6:state.density==='relaxed'?6.8:8.6;
    const pages=[]; let cur={blocks:[],units:0};
    const push=()=>{if(cur.blocks.length){pages.push(cur);cur={blocks:[],units:0};}};
    if(state.globalRequirements.some(Boolean)) pages.push({global:true,blocks:[],units:3});
    state.blocks.forEach(b=>{
      const units=estimateUnits(b);
      if(b.forceBreak) push();
      if(cur.blocks.length && cur.units+units>cap) push();
      cur.blocks.push(b);cur.units+=units;
    }); push(); return pages;
  }

  function estimateUnits(b){let u=.8;u+=Math.min(2.4,b.text.length/38*.75);u+=b.requirements.length*.52;u+=b.links.length*.28;if(b.images.length)u+=1.05+Math.min(1,b.images.length*.25);if(b.compareText&&b.textSource==='A'&&norm(b.compareText)!==norm(b.text)&&b.similarity<.90)u+=.55;return Math.max(1.35,u);}
  function updatePageEstimate(){if(!state.blocks.length){els.pageEstimate.textContent='尚未計算';return;}const pages=getPages();els.pageEstimate.innerHTML=`預估 <strong>${pages.length}</strong> 頁<br><span style="font-weight:400;color:#6f7a95">依「${state.density==='compact'?'緊湊':state.density==='relaxed'?'舒適':'標準'}」密度自動分頁</span>`;}

  function openPreviewModal(){renderSlidePreview();els.previewModal.classList.remove('hidden');}
  function renderSlidePreview(){const pages=getPages();els.slidePreview.innerHTML='';pages.forEach((p,i)=>{const card=document.createElement('div');card.className='slide-card';if(p.global){card.innerHTML=`<h4>/ ${escapeHtml(state.projectName)} - ${escapeHtml(state.versionName)}</h4><div class="slide-block"><strong>整支影片需求</strong><span>${state.globalRequirements.filter(Boolean).map(escapeHtml).join('／')}</span></div>`;}else{card.innerHTML=`<h4>/ ${escapeHtml(state.projectName)} - ${escapeHtml(state.versionName)} · P${i+1}</h4>`+p.blocks.map(b=>`<div class="slide-block ${b.status==='removed'?'red':''}"><strong>${STATUS_META[b.status].label} · ${escapeHtml(b.startRaw)}–${escapeHtml(b.endRaw)}</strong><span>${escapeHtml(b.text)}${b.requirements.length?'｜'+escapeHtml(b.requirements.map(r=>r.text).join('；')):''}</span></div>`).join('');}els.slidePreview.appendChild(card);});}

  async function exportPptx(){
    if(!state.blocks.length)return alert('請先解析字幕。');
    if(typeof JSZip==='undefined')return alert('PPTX 相依元件 JSZip 尚未載入，請重新整理頁面；若仍出現，請確認 vendor/jszip.min.js 與 index.html 位於同一份工具資料夾。');
    if(typeof PptxGenJS==='undefined')return alert('PPTX 元件尚未載入，請重新整理頁面；若仍出現，請確認 vendor/pptxgen.min.js 已完整放入工具資料夾。');
    const pptx=new PptxGenJS();pptx.layout='LAYOUT_WIDE';pptx.author='Video Brief Builder';pptx.subject='影音需求簡報';pptx.title=`${state.projectName} ${state.versionName}`;pptx.company='';pptx.lang='zh-TW';pptx.theme={headFontFace:'Noto Sans TC',bodyFontFace:'Noto Sans TC',lang:'zh-TW'};
    const C={blue:'2457DB',blue2:'1A46B8',navy:'12266F',navy2:'091544',bg:'F8F9FD',ink:'252B3A',text:'4E5870',muted:'8792AC',line:'D9E1F3',pale:'EAF0FF',red:'E9574F',green:'35A884',purple:'7B5BD6',orange:'DB9634'};
    const pages=getPages();
    // cover
    let s=pptx.addSlide();s.background={color:C.navy2};addMesh(s,pptx,C);s.addText(`/ ${state.projectName}`,{x:.78,y:2.55,w:8.9,h:.62,fontFace:'Noto Sans TC',fontSize:32,bold:true,color:'FFFFFF',margin:0});s.addText(state.versionName||'VIDEO BRIEF',{x:.82,y:3.32,w:6,h:.28,fontFace:'Noto Sans TC',fontSize:12,bold:true,color:'DCE6FF',charSpacing:1.2,margin:0});s.addText('字幕差異比對 × 影音需求',{x:.82,y:4.02,w:4.2,h:.27,fontFace:'Noto Sans TC',fontSize:11,color:'BFD0FF',margin:0});
    pages.forEach((p,pageIdx)=>{
      const sl=pptx.addSlide();sl.background={color:C.bg};addEdgeMesh(sl,pptx,C);addPptTitle(sl,C,`${state.projectName} - ${state.versionName}`);
      if(p.global){sl.addText('整支影片需求',{x:.72,y:1.35,w:2.2,h:.36,fontFace:'Noto Sans TC',fontSize:16,bold:true,color:C.ink,margin:0});let y=1.95;state.globalRequirements.filter(Boolean).forEach((r,i)=>{sl.addShape(pptx.ShapeType.roundRect,{x:.72,y,w:9.9,h:.68,rectRadius:.06,fill:{color:'FFFFFF'},line:{color:C.line}});sl.addText(`${i+1}. ${r}`,{x:.95,y:y+.2,w:9.35,h:.26,fontFace:'Noto Sans TC',fontSize:11,color:C.text,margin:0});y+=.82;});return;}
      const n=p.blocks.length;let y=1.18;const avail=5.7;const gap=.13;const heights=p.blocks.map(b=>Math.max(.9,estimateUnits(b)/p.units*(avail-gap*(n-1))));
      p.blocks.forEach((b,bi)=>{const h=Math.max(.85,heights[bi]);addPptBlock(sl,pptx,C,b,.72,y,10.45,h);y+=h+gap;});
    });
    const safe=(state.projectName||'影音需求').replace(/[\\/:*?"<>|]/g,'_');
    await pptx.writeFile({fileName:`${safe}_${state.versionName||''}_影音需求.pptx`});
  }

  function addPptTitle(sl,C,title){sl.addText('/ '+title,{x:.68,y:.42,w:9.8,h:.42,fontFace:'Noto Sans TC',fontSize:23,bold:true,color:C.blue,margin:0});sl.addText('AUTO VIDEO BRIEF',{x:10.5,y:.52,w:1.6,h:.18,fontFace:'Noto Sans TC',fontSize:7,color:C.muted,charSpacing:1.2,align:'right',margin:0});}
  function addPptBlock(sl,pptx,C,b,x,y,w,h){
    const red=b.status==='removed';sl.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:.05,fill:{color:'FFFFFF'},line:{color:C.line,width:.8}});sl.addShape(pptx.ShapeType.rect,{x,y:y+.14,w:.055,h:Math.max(.22,h-.28),fill:{color:red?C.red:C.blue},line:{color:red?C.red:C.blue}});
    const meta=STATUS_META[b.status]||STATUS_META.unchanged; const statusColor=b.status==='removed'?C.red:b.status==='added'?C.green:b.status.includes('moved')?C.purple:b.status==='modified'?C.orange:'7C879E';
    sl.addShape(pptx.ShapeType.roundRect,{x:x+.2,y:y+.16,w:.88,h:.25,rectRadius:.05,fill:{color:statusColor},line:{color:statusColor}});sl.addText(meta.label,{x:x+.2,y:y+.215,w:.88,h:.1,fontFace:'Noto Sans TC',fontSize:6.2,bold:true,color:'FFFFFF',align:'center',margin:0});
    sl.addText(`${b.startRaw} → ${b.endRaw}`,{x:x+1.22,y:y+.2,w:2.55,h:.13,fontFace:'Noto Sans TC',fontSize:7.2,bold:true,color:C.blue2,margin:0});
    const reqCount=b.requirements.length, linkCount=b.links.length, imgCount=b.images.length; const textH=Math.max(.27,Math.min(.62,h*.32));
    sl.addText(`「${b.text}」`,{x:x+.22,y:y+.5,w:imgCount?7.2:9.8,h:textH,fontFace:'Noto Sans TC',fontSize:h<1.15?9.2:10.4,bold:true,color:red?C.red:C.ink,margin:0.03,breakLine:false,strike:red});
    let ry=y+.5+textH+.08; const rw=imgCount?7.25:9.85; const lineH=.22;
    b.requirements.slice(0,6).forEach(r=>{sl.addText('• '+r.text,{x:x+.28,y:ry,w:rw,h:lineH,fontFace:'Noto Sans TC',fontSize:7.6,color:r.cat==='移除'?C.red:C.text,margin:0});ry+=lineH+.03;});
    b.links.slice(0,3).forEach(l=>{sl.addText([{text:'↗ '+(l.label||'REF'),options:{hyperlink:{url:l.url},color:C.blue2,underline:{color:C.blue2}}}],{x:x+.3,y:ry,w:rw,h:.18,fontFace:'Noto Sans TC',fontSize:7.2,margin:0});ry+=.21;});
    if(imgCount){const imgs=b.images.slice(0,2);const ix=x+7.72,iw=2.36,ih=Math.min(h-.35,1.5);imgs.forEach((im,j)=>{try{sl.addImage({data:im.data,x:ix,y:y+.45+j*(ih+.08),w:iw,h:ih});}catch(_){}});}
    if(reqCount>6||linkCount>3)sl.addText(`＋${Math.max(0,reqCount-6)+Math.max(0,linkCount-3)} 項未展開`,{x:x+w-1.6,y:y+h-.22,w:1.25,h:.12,fontFace:'Noto Sans TC',fontSize:6.2,color:C.muted,align:'right',margin:0});
  }
  function addMesh(sl,pptx,C){for(let i=0;i<18;i++){const y=1.0+i*.28;sl.addShape(pptx.ShapeType.arc,{x:6.1,y:y-1.1,w:7.8,h:2.35,adjustPoint:.25,rotate:8,line:{color:i%2?'5F83FF':'70D5FF',transparency:74,width:.7},fill:{color:C.navy2,transparency:100}});} }
  function addEdgeMesh(sl,pptx,C){sl.addShape(pptx.ShapeType.rect,{x:11.55,y:0,w:1.78,h:7.5,fill:{color:C.navy},line:{color:C.navy}});for(let i=0;i<14;i++){sl.addShape(pptx.ShapeType.arc,{x:11.25,y:.1+i*.48,w:2.35,h:1.25,rotate:15,line:{color:i%2?'5F83FF':'70D5FF',transparency:64,width:.7},fill:{color:C.navy,transparency:100}});}}

  function openPresetModal(){renderPresetEditor();els.presetModal.classList.remove('hidden');}
  function renderPresetEditor(){els.presetEditor.innerHTML='';presets.forEach((p,i)=>{const row=document.createElement('div');row.className='preset-row';row.innerHTML=`<select class="pcat">${['畫面','字幕','素材','音效','剪輯','移除','動畫','其他'].map(c=>`<option ${c===p.cat?'selected':''}>${c}</option>`).join('')}</select><input class="plabel" value="${escapeAttr(p.label)}"><input class="ptext" value="${escapeAttr(p.text)}"><button>×</button>`;$('.pcat',row).addEventListener('change',e=>p.cat=e.target.value);$('.plabel',row).addEventListener('input',e=>p.label=e.target.value);$('.ptext',row).addEventListener('input',e=>p.text=e.target.value);$('button',row).addEventListener('click',()=>{presets.splice(i,1);renderPresetEditor();});els.presetEditor.appendChild(row);});}
  function savePresetEditor(){localStorage.setItem(PRESET_KEY,JSON.stringify(presets));closeModal('presetModal');renderBlocks();}
  function loadPresets(){try{const raw=localStorage.getItem(PRESET_KEY);return raw?JSON.parse(raw):clone(DEFAULT_PRESETS);}catch(_){return clone(DEFAULT_PRESETS);}}

  function closeModal(id){$('#'+id)?.classList.add('hidden');}

  function exportProject(){syncProjectMeta();state.oldRaw=els.oldPaste.value;state.newRaw=els.newPaste.value;const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});downloadBlob(blob,`${safeName(state.projectName)}_${state.versionName||''}_project.json`);}
  function importProject(e){const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{state=JSON.parse(reader.result);hydrateTopFields();renderAll();saveProject();}catch(_){alert('專案 JSON 格式無法讀取。');}};reader.readAsText(file);e.target.value='';}
  function loadDemo(){
    const old=`00:00:00:00 - 00:00:03:00\n今天先介紹第一個重點\n\n00:00:03:00 - 00:00:06:00\n這一段我們之後會移除\n\n00:00:06:00 - 00:00:09:00\n接著談第二個重點\n\n00:00:09:00 - 00:00:12:00\n最後補充第三個重點`;
    const newer=`00:00:00:00 - 00:00:03:00\n今天先介紹第一個重點\n\n00:00:03:00 - 00:00:06:00\n最後補充第三個重點\n\n00:00:06:00 - 00:00:09:00\n接著談第二個重要觀念\n\n00:00:09:00 - 00:00:12:00\n這是重剪後新增的一句話`;
    els.oldPaste.value=old;els.newPaste.value=newer;state.oldName='demo_original.txt';state.newName='demo_recut.txt';els.oldBadge.textContent=state.oldName;els.newBadge.textContent=state.newName;analyze();
  }
  function clearProject(){if(!confirm('確定要清空目前專案嗎？'))return;state=newProject();localStorage.removeItem(STORAGE_KEY);hydrateTopFields();els.blocks.innerHTML='';els.results.classList.add('hidden');activeFilter='all';}

  function saveProject(){state.updatedAt=Date.now();try{const raw=JSON.stringify(state);if(raw.length<4_500_000)localStorage.setItem(STORAGE_KEY,raw);else{const light=clone(state);light.blocks?.forEach(b=>b.images=[]);localStorage.setItem(STORAGE_KEY,JSON.stringify(light));}}catch(e){console.warn('autosave skipped',e);}}
  function loadProject(){try{const raw=localStorage.getItem(STORAGE_KEY);return raw?JSON.parse(raw):null;}catch(_){return null;}}

  function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function uid(){return 'id_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function safeName(s){return String(s||'影音需求').replace(/[\\/:*?"<>|]/g,'_');}
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function escapeAttr(s){return escapeHtml(s).replace(/`/g,'&#96;');}
})();
