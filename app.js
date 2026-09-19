/* Video Brief Builder V1 - browser-only prototype */
(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const STORAGE_KEY = 'videoBriefBuilderV13Project';
  const LEGACY_STORAGE_KEYS = ['videoBriefBuilderV12Project','videoBriefBuilderV11Project'];
  const PRESET_KEY = 'videoBriefBuilderV1Presets';

  const STATUS_META = {
    unchanged: { label: '未變更', cls: 'status-unchanged' },
    removed: { label: '移除', cls: 'status-removed' },
    added: { label: '疑似新增', cls: 'status-added' },
    moved: { label: '順序調換', cls: 'status-moved' },
    modified: { label: '文字修改', cls: 'status-modified' },
    moved_modified: { label: '調換＋文字修改', cls: 'status-moved_modified' },
    uncertain: { label: '需確認', cls: 'status-uncertain' },
    manual: { label: '自訂頁', cls: 'status-manual' },
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
    projectFileInput: $('#projectFileInput'),
    segmentationReview: $('#segmentationReview'), segmentationList: $('#segmentationList'), segmentationCount: $('#segmentationCount')
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
    if (demoMode && !state.blocks?.length && !state.canonicalBlocks?.length) loadDemo();
    else if (state.stage === 'review' && state.canonicalBlocks?.length) renderSegmentationReview();
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
    $('#confirmSegmentsBtn').addEventListener('click', confirmSegmentation);
    $('#rebuildSegmentsBtn').addEventListener('click', analyze);
    $('#insertPageEndBtn').addEventListener('click', () => insertManualPage(state.blocks.length - 1));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') $$('.modal:not(.hidden)').forEach(m => m.classList.add('hidden')); });
  }

  function newProject() {
    return { version: 1.3, projectName: '影音需求', versionName: 'ACO', density: 'standard', mergeMode: 'standard', oldRaw: '', newRaw: '', oldName: '', newName: '', canonicalBlocks: [], blocks: [], stage: 'upload', globalRequirements: [], autoRequirements: true, createdAt: Date.now(), updatedAt: Date.now() };
  }


  function hydrateTopFields() {
    els.projectName.value = state.projectName || '影音需求';
    els.versionName.value = state.versionName || 'ACO';
    els.densitySelect.value = state.density || 'standard';
    els.mergeSelect.value = state.mergeMode || 'standard';
    els.oldPaste.value = state.oldRaw || '';
    els.newPaste.value = state.newRaw || '';
    els.oldBadge.textContent = state.oldName || (state.oldRaw ? '已貼上字幕' : '尚未匯入');
    els.newBadge.textContent = state.newName || (state.newRaw ? '已貼上字幕' : '必填');
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
    if (!state.oldRaw) return alert('請先匯入影音夥伴提供的字幕 A，作為文字校正基準。');
    if (!state.newRaw) return alert('請匯入重剪後的字幕 B。V1.3 會以 B 的時間軸、順序與分段作為簡報主結構。');

    const oldCues = parseSubtitle(state.oldRaw);
    const newCues = parseSubtitle(state.newRaw);
    if (!oldCues.length) return alert('字幕 A 沒有讀到時間碼。請確認格式是否包含起訖時間。');
    if (!newCues.length) return alert('字幕 B 沒有讀到時間碼。請確認格式是否包含起訖時間。');

    // V1.3: B 決定最終時間軸、順序與分段；A 只負責校正文字與後續差異判斷。
    const rawReviewBlocks = mergeCues(newCues, state.mergeMode).map((b,i)=>({
      ...b, reviewIndex:i, forceBreak:false, compareText:b.text, textSource:'B', timeSource:'B', correctedFromA:false
    }));
    state.canonicalBlocks = seedReviewTextFromA(rawReviewBlocks, oldCues);
    state.blocks = [];
    state.stage = 'review';
    state.updatedAt = Date.now();
    saveProject();
    renderSegmentationReview({scrollToStart:true});
  }


  function confirmSegmentation() {
    if (!state.canonicalBlocks?.length) return alert('請先整理重剪版字幕 B。');
    const oldCues = parseSubtitle(state.oldRaw || '');
    if (!oldCues.length) return alert('字幕 A 無法讀取，請重新匯入後再比對。');
    state.blocks = compareReviewedBToA(state.canonicalBlocks, oldCues, state.autoRequirements);
    state.blocks = sortBlocksChronologically(state.blocks);
    state.stage = 'edit';
    saveProject();
    renderAll();
    requestAnimationFrame(()=>document.querySelector('#resultsSection')?.scrollIntoView({behavior:'smooth', block:'start'}));
  }


  function renderSegmentationReview(options={}) {
    els.results.classList.add('hidden');
    els.segmentationReview.classList.remove('hidden');
    els.segmentationList.innerHTML = '';
    els.segmentationCount.textContent = `共 ${state.canonicalBlocks.length} 段`;
    state.canonicalBlocks.forEach((b, idx) => {
      const node = document.createElement('article');
      node.className = 'segment-item';
      node.dataset.segId = b.id;
      const corrected = b.correctedFromA ? `<span class="source-pill">A 已校正</span>` : (b.aPreview ? `<span class="source-pill warn">A 低信心匹配</span>` : `<span class="source-pill neutral">B 轉錄</span>`);
      node.innerHTML = `<div class="segment-meta"><span class="segment-index">${idx+1}</span><span>新版 B｜${escapeHtml(b.startRaw)} → ${escapeHtml(b.endRaw)}</span>${corrected}</div>
        <textarea class="segment-text" aria-label="第 ${idx+1} 段台詞">${escapeHtml(b.text)}</textarea>
        ${b.aPreview && !b.correctedFromA ? `<div class="segment-a-note"><strong>A 可能對應：</strong>${escapeHtml(b.aPreview)} <span>${Math.round((b.aMatchScore||0)*100)}%</span></div>` : ''}
        <div class="segment-tools">
          <div class="segment-tool-left"><button class="mini-tool seg-merge-prev">↑ 合併上一段</button><button class="mini-tool seg-merge-next">↓ 合併下一段</button></div>
          <label class="break-toggle"><input type="checkbox" class="seg-force-break" ${b.forceBreak?'checked':''}> 這句另起一頁</label>
        </div>`;
      const ta = $('.segment-text', node);
      ta.addEventListener('input', e => { b.text = e.target.value; b.manuallyEdited = true; saveProject(); });
      ta.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          b.forceBreak = !b.forceBreak;
          $('.seg-force-break', node).checked = b.forceBreak;
          saveProject();
          return;
        }
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          splitCanonicalBlock(idx, ta.selectionStart);
          return;
        }
        if (e.key === 'Backspace' && !e.shiftKey && !e.metaKey && !e.ctrlKey && ta.selectionStart === 0 && ta.selectionEnd === 0 && idx > 0) {
          e.preventDefault();
          mergeCanonicalBlocks(idx-1, idx, {focusMerged:true, caretAtJoin:true});
        }
      });
      $('.seg-merge-prev', node).disabled = idx === 0;
      $('.seg-merge-next', node).disabled = idx === state.canonicalBlocks.length - 1;
      $('.seg-merge-prev', node).addEventListener('click', () => mergeCanonicalBlocks(idx-1, idx, {focusMerged:true}));
      $('.seg-merge-next', node).addEventListener('click', () => mergeCanonicalBlocks(idx, idx+1, {focusMerged:true}));
      $('.seg-force-break', node).addEventListener('change', e => { b.forceBreak = e.target.checked; saveProject(); });
      els.segmentationList.appendChild(node);
    });

    requestAnimationFrame(()=>{
      if (options.anchor?.id) {
        const anchorEl = els.segmentationList.querySelector(`[data-seg-id="${cssEscape(options.anchor.id)}"]`);
        if (anchorEl) window.scrollBy(0, anchorEl.getBoundingClientRect().top - options.anchor.top);
      } else if (options.scrollToStart) {
        els.segmentationReview.scrollIntoView({behavior:'smooth', block:'start'});
      }
      if (options.focusId) {
        const focusNode = els.segmentationList.querySelector(`[data-seg-id="${cssEscape(options.focusId)}"]`);
        const focusTa = focusNode?.querySelector('.segment-text');
        if (focusTa) {
          focusTa.focus({preventScroll:true});
          const caret = Math.max(0, Math.min(Number.isFinite(options.caret) ? options.caret : focusTa.value.length, focusTa.value.length));
          focusTa.setSelectionRange(caret, caret);
        }
      }
    });
  }


  function mergeCanonicalBlocks(leftIndex, rightIndex, options={}) {
    if (leftIndex < 0 || rightIndex >= state.canonicalBlocks.length || leftIndex >= rightIndex) return;
    const a = state.canonicalBlocks[leftIndex], b = state.canonicalBlocks[rightIndex];
    const anchorEl = els.segmentationList.querySelector(`[data-seg-id="${cssEscape(a.id)}"]`);
    const anchor = anchorEl ? {id:a.id, top:anchorEl.getBoundingClientRect().top} : null;
    const joinPos = a.text.length;
    a.text = smartJoin(a.text, b.text);
    a.compareText = smartJoin(a.compareText || '', b.compareText || '');
    a.end = b.end; a.endRaw = b.endRaw;
    a.sourceCueIds = [...(a.sourceCueIds||[]), ...(b.sourceCueIds||[])];
    a.forceBreak = a.forceBreak || b.forceBreak;
    a.correctedFromA = a.correctedFromA && b.correctedFromA;
    a.aPreview = '';
    state.canonicalBlocks.splice(rightIndex, 1);
    state.canonicalBlocks.forEach((x,i)=>x.reviewIndex=i);
    saveProject();
    renderSegmentationReview({anchor, focusId:options.focusMerged ? a.id : null, caret:options.caretAtJoin ? joinPos : a.text.length});
  }


  function splitCanonicalBlock(index, cursor) {
    const b = state.canonicalBlocks[index]; if (!b) return;
    const pos = Number(cursor);
    if (!Number.isFinite(pos) || pos <= 0 || pos >= b.text.length) return;
    const left = b.text.slice(0,pos).trimEnd(), right = b.text.slice(pos).trimStart();
    if (!left || !right) return;
    const anchorEl = els.segmentationList.querySelector(`[data-seg-id="${cssEscape(b.id)}"]`);
    const anchor = anchorEl ? {id:b.id, top:anchorEl.getBoundingClientRect().top} : null;
    const startSec=timeToSeconds(b.startRaw), endSec=timeToSeconds(b.endRaw);
    const ratio=Math.max(.08,Math.min(.92,left.length/Math.max(1,left.length+right.length)));
    const splitSec=startSec+(endSec-startSec)*ratio;
    const mid=formatLikeTime(b.startRaw,splitSec);
    const originalEndRaw=b.endRaw, originalEnd=b.end;
    const rawParts=splitApproxText(b.compareText || b.text, ratio);
    b.text=left; b.compareText=rawParts[0]; b.endRaw=mid; b.end=splitSec; b.aPreview=''; b.manuallyEdited=true;
    const next={...clone(b), id:uid(), text:right, compareText:rawParts[1], startRaw:mid, start:splitSec, endRaw:originalEndRaw, end:originalEnd, forceBreak:false, aPreview:'', manuallyEdited:true};
    state.canonicalBlocks.splice(index+1,0,next);
    state.canonicalBlocks.forEach((x,i)=>x.reviewIndex=i);
    saveProject();
    renderSegmentationReview({anchor, focusId:next.id, caret:0});
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

  function seedReviewTextFromA(reviewBlocks, oldCues) {
    const {matches} = matchBBlocksToA(reviewBlocks, oldCues, .50);
    const byB = new Map(matches.map(m => [m.bi, m]));
    return reviewBlocks.map((b, bi) => {
      const m = byB.get(bi);
      const out = {...b, compareText:b.compareText || b.text, aPreview:'', aMatchScore:m?.score || 0, correctedFromA:false};
      // 只在高度可信時自動用 A 校正，避免 A/B 分段不同時把額外台詞硬塞進來。
      if (m && m.score >= .84) {
        out.text = m.aText;
        out.correctedFromA = true;
        out.aStartIndex = m.aStart;
        out.aEndIndex = m.aEnd;
      } else if (m && m.score >= .64) {
        out.aPreview = m.aText;
        out.aStartIndex = m.aStart;
        out.aEndIndex = m.aEnd;
      }
      return out;
    });
  }

  function matchBBlocksToA(bBlocks, aCues, minScore=.52) {
    const candidates = [];
    const maxWindow = 12;
    bBlocks.forEach((bb, bi) => {
      const bText = bb.text || bb.compareText || '';
      const bNorm = norm(bText);
      const bLen = bNorm.length;
      if (!bLen) return;
      for (let aStart=0; aStart<aCues.length; aStart++) {
        let aText = '';
        for (let aEnd=aStart; aEnd<Math.min(aCues.length, aStart+maxWindow); aEnd++) {
          aText = smartJoin(aText, aCues[aEnd].text);
          const aNorm = norm(aText), aLen = aNorm.length;
          if (!aLen) continue;
          if (aLen < Math.max(2, bLen*.28)) continue;
          if (aLen > Math.max(bLen*2.2, bLen+30)) break;
          let score = textSimilarity(bText, aText);
          const coverage = Math.min(aLen,bLen)/Math.max(1,Math.max(aLen,bLen));
          if (aNorm===bNorm) score=1;
          else if ((aNorm.includes(bNorm)||bNorm.includes(aNorm)) && coverage>=.58) score=Math.max(score,.66+coverage*.30);
          if (score>=minScore) candidates.push({bi,aStart,aEnd,score,coverage,aText,oldStartRaw:aCues[aStart].startRaw,oldEndRaw:aCues[aEnd].endRaw});
        }
      }
    });
    candidates.sort((x,y)=>{
      if (Math.abs(y.score-x.score)>.0001) return y.score-x.score;
      if (Math.abs(y.coverage-x.coverage)>.0001) return y.coverage-x.coverage;
      return (x.aEnd-x.aStart)-(y.aEnd-y.aStart);
    });
    const usedB=new Set(), usedA=new Set(), matches=[];
    for (const c of candidates) {
      if (usedB.has(c.bi)) continue;
      let overlap=false;
      for (let ai=c.aStart;ai<=c.aEnd;ai++) if(usedA.has(ai)){overlap=true;break;}
      if(overlap) continue;
      usedB.add(c.bi);
      for(let ai=c.aStart;ai<=c.aEnd;ai++) usedA.add(ai);
      matches.push(c);
    }
    return {matches,usedA};
  }

  function compareReviewedBToA(reviewBlocks, oldCues, autoReq=true) {
    const {matches,usedA} = matchBBlocksToA(reviewBlocks, oldCues, .52);
    const byB = new Map(matches.map(m=>[m.bi,m]));
    const matchedInBOrder = matches.slice().sort((a,b)=>a.bi-b.bi);
    const lisPositions = new Set(longestIncreasingSubsequenceIndices(matchedInBOrder.map(m=>m.aStart)));
    matchedInBOrder.forEach((m,pos)=>m.moved=!lisPositions.has(pos));

    const output=[];
    reviewBlocks.forEach((bb, bi)=>{
      const m=byB.get(bi);
      if(!m){
        output.push(makeEditorBlock({
          ...bb, text:bb.text, compareText:bb.compareText||bb.text, newIndex:bi, oldIndex:null, status:'added', similarity:0,
          textSource:'B', timeSource:'B', forceBreak:!!bb.forceBreak
        }, autoReq));
        return;
      }
      const status = m.score < .68 ? 'uncertain' : (m.moved ? 'moved' : 'unchanged');
      output.push(makeEditorBlock({
        ...bb,
        text:m.aText,
        compareText:bb.compareText||bb.text,
        startRaw:bb.startRaw,endRaw:bb.endRaw,
        oldStartRaw:m.oldStartRaw,oldEndRaw:m.oldEndRaw,
        newIndex:bi,oldIndex:m.aStart,status,similarity:m.score,
        textSource:'A',timeSource:'B',forceBreak:!!bb.forceBreak,
        aCueStart:m.aStart,aCueEnd:m.aEnd
      }, autoReq));
    });

    // A 中沒有出現在 B 的 cue，合併成「原版移除」區塊，並錨定在新版時間軸的相鄰位置。
    const runs=[]; let run=[]; let runStart=-1;
    const flush=()=>{if(!run.length)return; runs.push({cues:run,start:runStart,end:runStart+run.length-1}); run=[];runStart=-1;};
    oldCues.forEach((cue,ai)=>{
      if(usedA.has(ai)) flush();
      else { if(!run.length)runStart=ai; run.push(cue); }
    });
    flush();
    const matchWithTimes = matches.map(m=>({
      ...m,
      bStart:timeToSeconds(reviewBlocks[m.bi]?.startRaw||''),
      bEnd:timeToSeconds(reviewBlocks[m.bi]?.endRaw||reviewBlocks[m.bi]?.startRaw||'')
    }));
    runs.forEach(r=>{
      const merged=mergeCues(r.cues,'standard');
      let prev=null,next=null;
      matchWithTimes.forEach(m=>{
        if(m.aEnd<r.start && (!prev || m.aEnd>prev.aEnd)) prev=m;
        if(m.aStart>r.end && (!next || m.aStart<next.aStart)) next=m;
      });
      let baseAnchor;
      if(prev) baseAnchor=prev.bEnd+.0002;
      else if(next) baseAnchor=Math.max(0,next.bStart-.0002);
      else baseAnchor=Number.MAX_SAFE_INTEGER/1000;
      merged.forEach((ab,j)=>{
        output.push(makeEditorBlock({
          ...ab,text:ab.text,compareText:'',newIndex:null,oldIndex:r.start+j,status:'removed',similarity:0,
          textSource:'A',timeSource:'A',anchorTime:baseAnchor+j*.00001
        }, autoReq));
      });
    });

    const ordered = sortBlocksChronologically(output);
    let newRank=0;
    ordered.forEach(b=>{
      if(b.timeSource==='B' && b.type!=='manual') b.newIndex=newRank++;
      if(b.status==='moved'){
        const autoMove=b.requirements.find(r=>r.auto&&r.text.startsWith('順序調換｜'));
        if(autoMove) autoMove.text=`順序調換｜原始 A #${(b.oldIndex??0)+1} → 新版 B #${(b.newIndex??0)+1}`;
      }
    });
    return ordered;
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
      type:data.type||'script', text:data.text||'', oldText:data.oldText||'', compareText:data.compareText||'', textSource:data.textSource||'A', timeSource:data.timeSource||'A', requirements:[], links:[], images:[], forceBreak:!!data.forceBreak, anchorTime:Number.isFinite(data.anchorTime)?data.anchorTime:null
    };
    if (autoReq) b.requirements.push(...autoRequirementsFor(b));
    return b;
  }

  function autoRequirementsFor(b) {
    if (b.status === 'removed') return [{ id:uid(), cat:'移除', text:'移除此段', auto:true }];
    if (b.status === 'added') return [{ id:uid(), cat:'剪輯', text:'新版 B 疑似新增片段｜請確認實際影片內容', auto:true }];
    if (b.status === 'moved') return [{ id:uid(), cat:'剪輯', text:`順序調換｜原始 A #${(b.oldIndex??0)+1} → 新版 B #${(b.newIndex??0)+1}`, auto:true }];
    if (b.status === 'modified') return [{ id:uid(), cat:'剪輯', text:'文字／剪輯內容有調整｜文字請以字幕 A 校正後版本為準', auto:true }];
    if (b.status === 'uncertain') return [{ id:uid(), cat:'剪輯', text:'新版 B 轉錄與字幕 A 差異較大｜請確認實際影片內容', auto:true }];
    if (b.status === 'moved_modified') return [
      { id:uid(), cat:'剪輯', text:`順序調換｜原始 A #${(b.oldIndex??0)+1} → 新版 B #${(b.newIndex??0)+1}`, auto:true },
      { id:uid(), cat:'剪輯', text:'文字／剪輯內容有調整｜文字請以字幕 A 校正後版本為準', auto:true }
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

  function canonicalSortKey(b) {
    if (Number.isFinite(b.anchorTime)) return b.anchorTime;
    if (b.type === 'manual') return Number.MAX_SAFE_INTEGER - 10;
    if (b.timeSource === 'B' && b.startRaw) return timeToSeconds(b.startRaw);
    if (b.newIndex != null) return b.newIndex * 1000;
    // 原版被移除片段沒有 B 時間；若沒有 anchorTime 才退回 A 時間並排在後方。
    if (b.startRaw) return Number.MAX_SAFE_INTEGER - 100000 + timeToSeconds(b.startRaw);
    return Number.MAX_SAFE_INTEGER - 1;
  }


  function sortBlocksChronologically(blocks) {
    return [...(blocks||[])].map((b,i)=>({b,i,k:canonicalSortKey(b)})).sort((x,y)=>x.k-y.k || x.i-y.i).map(x=>x.b);
  }

  function insertManualPage(afterIndex) {
    const after = state.blocks[afterIndex];
    let anchor = after ? canonicalSortKey(after) + 0.00005 : 0;
    if (!after && state.blocks.length) anchor = canonicalSortKey(state.blocks[state.blocks.length-1]) + 0.00005;
    const b = makeEditorBlock({type:'manual', status:'manual', text:'', textSource:'A', timeSource:'manual', forceBreak:true, anchorTime:anchor}, false);
    b.requirements.push({id:uid(), cat:'其他', text:'新增頁面需求'});
    state.blocks.splice(Math.max(0, afterIndex+1), 0, b);
    state.blocks = sortBlocksChronologically(state.blocks);
    saveProject(); renderAll();
  }


  function renderAll() {
    state.stage = 'edit';
    els.segmentationReview.classList.add('hidden');
    els.results.classList.remove('hidden');
    renderSummary(); renderGlobals(); renderBlocks(); updatePageEstimate();
  }

  function renderSummary() {
    const counts = Object.fromEntries(Object.keys(STATUS_META).map(k=>[k,0]));
    state.blocks.forEach(b=>{ if(b.type!=='manual') counts[b.status]=(counts[b.status]||0)+1; });
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
      const parts=[];
      if(b.oldIndex!=null)parts.push(`原始 A #${b.oldIndex+1}`);
      if(b.newIndex!=null)parts.push(`新版 B #${b.newIndex+1}`);
      if(b.similarity && b.status!=='unchanged' && b.type!=='manual')parts.push(`比對相似度 ${Math.round(b.similarity*100)}%`);
      if(b.textSource==='A' && b.timeSource==='B')parts.push('文字用 A · 時間用 B');
      $('.position-meta',node).textContent=b.type==='manual'?'手動插入的獨立頁面':parts.join(' · ');
      const timeRow=$('.time-row',node);
      if(b.type==='manual') timeRow.textContent='獨立新增頁｜不綁時間碼';
      else if(b.timeSource==='B' && b.oldStartRaw) timeRow.textContent=`新版 B｜${b.startRaw||'—'} → ${b.endRaw||'—'}　／　原始 A｜${b.oldStartRaw} → ${b.oldEndRaw||'—'}`;
      else if(b.timeSource==='B') timeRow.textContent=`新版 B｜${b.startRaw||'—'} → ${b.endRaw||'—'}`;
      else timeRow.textContent=`原始 A｜${b.startRaw||'—'} → ${b.endRaw||'—'}（新版已移除）`;
      const ta=$('.script-text',node); ta.value=b.text; ta.placeholder=b.type==='manual'?'輸入這一頁要補充的說明／需求標題…':'台詞'; if(b.status==='removed')ta.classList.add('deleted');
      ta.addEventListener('input',e=>{b.text=e.target.value;saveProject();updatePageEstimate();});
      if(b.compareText && b.textSource==='A' && norm(b.compareText)!==norm(b.text) && (b.status==='uncertain' || b.similarity < .90)){ const wrap=$('.compare-text-wrap',node);wrap.classList.remove('hidden');$('.compare-text',wrap).textContent=b.compareText; }
      const force=$('.force-break',node);force.checked=!!b.forceBreak;force.addEventListener('change',e=>{b.forceBreak=e.target.checked;saveProject();updatePageEstimate();});
      if(b.type==='manual'){
        $('.merge-prev',node).classList.add('hidden'); $('.merge-next',node).classList.add('hidden'); $('.split-here',node).classList.add('hidden');
        force.checked=true; force.disabled=true; $('.break-toggle',node).title='自訂頁固定會另起一頁';
      } else {
        $('.merge-prev',node).disabled = idx===0 || state.blocks[idx-1]?.type==='manual';
        $('.merge-next',node).disabled = idx===state.blocks.length-1 || state.blocks[idx+1]?.type==='manual';
        $('.merge-prev',node).addEventListener('click',()=>mergeEditorBlocks(idx-1,idx));
        $('.merge-next',node).addEventListener('click',()=>mergeEditorBlocks(idx,idx+1));
        $('.split-here',node).addEventListener('click',()=>splitEditorBlock(idx,ta.selectionStart));
      }
      $('.insert-page-after',node).addEventListener('click',()=>insertManualPage(idx));
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
    if (a.type==='manual' || b.type==='manual') return;
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
    const b = state.blocks[index]; if (!b || b.type==='manual') return;
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
    const ordered = sortBlocksChronologically(state.blocks);
    ordered.forEach(b=>{
      if(b.type==='manual') { push(); pages.push({manual:true, blocks:[b], units:Math.max(4, estimateUnits(b))}); return; }
      const units=estimateUnits(b);
      if(b.forceBreak && cur.blocks.length) push();
      if(cur.blocks.length && cur.units+units>cap) push();
      cur.blocks.push(b);cur.units+=units;
    }); push(); return pages;
  }
  function estimateUnits(b){if(b.type==='manual'){let mu=2.0+Math.min(2.8,(b.text||'').length/34)+b.requirements.length*.55+b.links.length*.3+(b.images.length?1.2:0);return Math.max(3.6,mu);}let u=.8;u+=Math.min(2.4,b.text.length/38*.75);u+=b.requirements.length*.52;u+=b.links.length*.28;if(b.images.length)u+=1.05+Math.min(1,b.images.length*.25);if(b.compareText&&b.textSource==='A'&&norm(b.compareText)!==norm(b.text)&&b.similarity<.90)u+=.55;return Math.max(1.35,u);}
  function updatePageEstimate(){if(!state.blocks.length){els.pageEstimate.textContent='尚未計算';return;}const pages=getPages();els.pageEstimate.innerHTML=`預估 <strong>${pages.length}</strong> 頁<br><span style="font-weight:400;color:#6f7a95">依「${state.density==='compact'?'緊湊':state.density==='relaxed'?'舒適':'標準'}」密度自動分頁</span>`;}

  function openPreviewModal(){renderSlidePreview();els.previewModal.classList.remove('hidden');}
  function renderSlidePreview(){
    const pages=getPages();els.slidePreview.innerHTML='';
    pages.forEach((p,i)=>{
      const card=document.createElement('div');card.className='slide-card';
      if(p.global){card.innerHTML=`<h4>/ ${escapeHtml(state.projectName)} - ${escapeHtml(state.versionName)}</h4><div class="slide-block"><strong>整支影片需求</strong><span>${state.globalRequirements.filter(Boolean).map(escapeHtml).join('／')}</span></div>`;}
      else if(p.manual){const b=p.blocks[0];card.innerHTML=`<h4>/ ${escapeHtml(state.projectName)} - ${escapeHtml(state.versionName)} · 自訂新增頁</h4><div class="slide-block manual"><strong>自訂頁面</strong><span>${escapeHtml(b.text||'（尚未輸入說明）')}${b.requirements.length?'｜'+escapeHtml(b.requirements.map(r=>r.text).join('；')):''}</span></div>`;}
      else{card.innerHTML=`<h4>/ ${escapeHtml(state.projectName)} - ${escapeHtml(state.versionName)} · P${i+1}</h4>`+p.blocks.map(b=>{
        const timeLabel=b.timeSource==='B'?`B ${b.startRaw}–${b.endRaw}`:`A ${b.startRaw}–${b.endRaw}（移除）`;
        return `<div class="slide-block ${b.status==='removed'?'red':''}"><strong>${STATUS_META[b.status].label} · ${escapeHtml(timeLabel)}</strong><span>${escapeHtml(b.text)}${b.requirements.length?'｜'+escapeHtml(b.requirements.map(r=>r.text).join('；')):''}</span></div>`;
      }).join('');}
      els.slidePreview.appendChild(card);
    });
  }


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
      if(p.manual){addPptManualPage(sl,pptx,C,p.blocks[0]);return;}
      const n=p.blocks.length;let y=1.18;const avail=5.7;const gap=.13;const heights=p.blocks.map(b=>Math.max(.9,estimateUnits(b)/p.units*(avail-gap*(n-1))));
      p.blocks.forEach((b,bi)=>{const h=Math.max(.85,heights[bi]);addPptBlock(sl,pptx,C,b,.72,y,10.45,h);y+=h+gap;});
    });
    const safe=(state.projectName||'影音需求').replace(/[\\/:*?"<>|]/g,'_');
    await pptx.writeFile({fileName:`${safe}_${state.versionName||''}_影音需求.pptx`});
  }

  function addPptManualPage(sl,pptx,C,b){
    sl.addShape(pptx.ShapeType.roundRect,{x:.72,y:1.32,w:10.3,h:4.95,rectRadius:.05,fill:{color:'FFFFFF'},line:{color:C.line,width:.8}});
    sl.addShape(pptx.ShapeType.rect,{x:.72,y:1.5,w:.065,h:4.55,fill:{color:C.blue},line:{color:C.blue}});
    sl.addText('自訂新增頁',{x:.98,y:1.55,w:1.5,h:.28,fontFace:'Noto Sans TC',fontSize:11,bold:true,color:C.blue2,margin:0});
    sl.addText(b.text||'新增頁面需求',{x:.98,y:2.0,w:8.95,h:.75,fontFace:'Noto Sans TC',fontSize:20,bold:true,color:C.ink,margin:0.02});
    let y=3.0;
    (b.requirements||[]).forEach((r,i)=>{sl.addText('• '+r.text,{x:1.02,y,w:8.7,h:.3,fontFace:'Noto Sans TC',fontSize:10,color:r.cat==='移除'?C.red:C.text,margin:0});y+=.42;});
    (b.links||[]).slice(0,4).forEach(l=>{sl.addText([{text:'↗ '+(l.label||'REF'),options:{hyperlink:{url:l.url},color:C.blue2,underline:{color:C.blue2}}}],{x:1.02,y,w:8.7,h:.25,fontFace:'Noto Sans TC',fontSize:9,margin:0});y+=.34;});
    if((b.images||[]).length){try{sl.addImage({data:b.images[0].data,x:9.2,y:2.0,w:1.55,h:1.8});}catch(_){}}
  }

  function addPptTitle(sl,C,title){sl.addText('/ '+title,{x:.68,y:.42,w:9.8,h:.42,fontFace:'Noto Sans TC',fontSize:23,bold:true,color:C.blue,margin:0});sl.addText('AUTO VIDEO BRIEF',{x:10.5,y:.52,w:1.6,h:.18,fontFace:'Noto Sans TC',fontSize:7,color:C.muted,charSpacing:1.2,align:'right',margin:0});}
  function addPptBlock(sl,pptx,C,b,x,y,w,h){
    const red=b.status==='removed';sl.addShape(pptx.ShapeType.roundRect,{x,y,w,h,rectRadius:.05,fill:{color:'FFFFFF'},line:{color:C.line,width:.8}});sl.addShape(pptx.ShapeType.rect,{x,y:y+.14,w:.055,h:Math.max(.22,h-.28),fill:{color:red?C.red:C.blue},line:{color:red?C.red:C.blue}});
    const meta=STATUS_META[b.status]||STATUS_META.unchanged; const statusColor=b.status==='removed'?C.red:b.status==='added'?C.green:b.status.includes('moved')?C.purple:b.status==='modified'?C.orange:'7C879E';
    sl.addShape(pptx.ShapeType.roundRect,{x:x+.2,y:y+.16,w:.88,h:.25,rectRadius:.05,fill:{color:statusColor},line:{color:statusColor}});sl.addText(meta.label,{x:x+.2,y:y+.215,w:.88,h:.1,fontFace:'Noto Sans TC',fontSize:6.2,bold:true,color:'FFFFFF',align:'center',margin:0});
    const primaryTime=b.timeSource==='B'?`B  ${b.startRaw||'—'} → ${b.endRaw||'—'}`:`A  ${b.startRaw||'—'} → ${b.endRaw||'—'}（移除）`;
    sl.addText(primaryTime,{x:x+1.22,y:y+.19,w:3.4,h:.14,fontFace:'Noto Sans TC',fontSize:7.2,bold:true,color:C.blue2,margin:0});
    if(b.timeSource==='B'&&b.oldStartRaw){sl.addText(`A ${b.oldStartRaw} → ${b.oldEndRaw||'—'}`,{x:x+4.7,y:y+.2,w:2.6,h:.13,fontFace:'Noto Sans TC',fontSize:6.6,color:C.muted,margin:0});}
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

  function splitApproxText(text, ratio) {
    const src=String(text||''); if(!src)return ['',''];
    const pos=Math.max(1,Math.min(src.length-1,Math.round(src.length*ratio)));
    return [src.slice(0,pos).trimEnd(),src.slice(pos).trimStart()];
  }
  function cssEscape(value){
    if(window.CSS&&typeof window.CSS.escape==='function')return window.CSS.escape(String(value));
    return String(value).replace(/(["\\])/g,'\\$1');
  }

  function openPresetModal(){renderPresetEditor();els.presetModal.classList.remove('hidden');}
  function renderPresetEditor(){els.presetEditor.innerHTML='';presets.forEach((p,i)=>{const row=document.createElement('div');row.className='preset-row';row.innerHTML=`<select class="pcat">${['畫面','字幕','素材','音效','剪輯','移除','動畫','其他'].map(c=>`<option ${c===p.cat?'selected':''}>${c}</option>`).join('')}</select><input class="plabel" value="${escapeAttr(p.label)}"><input class="ptext" value="${escapeAttr(p.text)}"><button>×</button>`;$('.pcat',row).addEventListener('change',e=>p.cat=e.target.value);$('.plabel',row).addEventListener('input',e=>p.label=e.target.value);$('.ptext',row).addEventListener('input',e=>p.text=e.target.value);$('button',row).addEventListener('click',()=>{presets.splice(i,1);renderPresetEditor();});els.presetEditor.appendChild(row);});}
  function savePresetEditor(){localStorage.setItem(PRESET_KEY,JSON.stringify(presets));closeModal('presetModal');renderBlocks();}
  function loadPresets(){try{const raw=localStorage.getItem(PRESET_KEY);return raw?JSON.parse(raw):clone(DEFAULT_PRESETS);}catch(_){return clone(DEFAULT_PRESETS);}}

  function closeModal(id){$('#'+id)?.classList.add('hidden');}

  function exportProject(){syncProjectMeta();state.oldRaw=els.oldPaste.value;state.newRaw=els.newPaste.value;const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});downloadBlob(blob,`${safeName(state.projectName)}_${state.versionName||''}_project.json`);}
  function importProject(e){
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        state=migrateProject(JSON.parse(reader.result));
        hydrateTopFields();
        if(state.stage==='review'&&state.canonicalBlocks?.length)renderSegmentationReview();
        else if(state.blocks?.length)renderAll();
        else { els.results.classList.add('hidden'); els.segmentationReview.classList.add('hidden'); }
        saveProject();
      }catch(_){alert('專案 JSON 格式無法讀取。');}
    };
    reader.readAsText(file);e.target.value='';
  }
  function loadDemo(){
    const old=`00:00:00:00 - 00:00:03:00\n今天先介紹第一個重點\n\n00:00:03:00 - 00:00:06:00\n這一段我們之後會移除\n\n00:00:06:00 - 00:00:09:00\n接著談第二個重點\n\n00:00:09:00 - 00:00:12:00\n最後補充第三個重點`;
    const newer=`00:00:00:00 - 00:00:03:00\n今天先介紹第一個重點\n\n00:00:03:00 - 00:00:06:00\n最後補充第三個重點\n\n00:00:06:00 - 00:00:09:00\n接著談第二個重要觀念\n\n00:00:09:00 - 00:00:12:00\n這是重剪後新增的一句話`;
    els.oldPaste.value=old;els.newPaste.value=newer;state.oldName='demo_original.txt';state.newName='demo_recut.txt';els.oldBadge.textContent=state.oldName;els.newBadge.textContent=state.newName;analyze();
  }
  function clearProject(){if(!confirm('確定要清空目前專案嗎？'))return;state=newProject();localStorage.removeItem(STORAGE_KEY);hydrateTopFields();els.blocks.innerHTML='';els.results.classList.add('hidden');els.segmentationReview.classList.add('hidden');activeFilter='all';}

  function saveProject(){state.updatedAt=Date.now();try{const raw=JSON.stringify(state);if(raw.length<4_500_000)localStorage.setItem(STORAGE_KEY,raw);else{const light=clone(state);light.blocks?.forEach(b=>b.images=[]);localStorage.setItem(STORAGE_KEY,JSON.stringify(light));}}catch(e){console.warn('autosave skipped',e);}}
  function migrateProject(project){
    if(!project||typeof project!=='object')return null;
    if(Number(project.version||0)<1.3){
      return {...project,version:1.3,canonicalBlocks:[],blocks:[],stage:'upload'};
    }
    return project;
  }
  function loadProject(){try{let raw=localStorage.getItem(STORAGE_KEY);if(!raw){for(const key of LEGACY_STORAGE_KEYS){raw=localStorage.getItem(key);if(raw)break;}}return raw?migrateProject(JSON.parse(raw)):null;}catch(_){return null;}}

  function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});}
  function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function uid(){return 'id_'+Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);}
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function safeName(s){return String(s||'影音需求').replace(/[\\/:*?"<>|]/g,'_');}
  function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
  function escapeAttr(s){return escapeHtml(s).replace(/`/g,'&#96;');}
})();
