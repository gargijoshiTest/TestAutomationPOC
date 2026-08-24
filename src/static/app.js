/* Color Palette Explorer — minimal static implementation
   - Fetch colors.v1.json
   - Client-side filtering with debounce
   - Keyboard navigation and accessible modal
*/
(function(){
  const listEl = document.getElementById('list');
  const searchInput = document.getElementById('search');
  const familySelect = document.getElementById('family');
  const emptyEl = document.getElementById('empty');
  const modal = document.getElementById('modal');
  const modalBody = document.getElementById('modalBody');
  const closeModal = document.getElementById('closeModal');

  let colors = [];
  let filtered = [];
  let activeIndex = -1;
  let lastFocused = null;
  let renderedCount = 0;
  const CHUNK_SIZE = 30;

  // Fallback dataset used when fetching colors.json fails (helps when opening file://)
  const FALLBACK_COLORS = [
    {"id":"c1","name":"Red","hex":"#FF0000","rgb":"rgb(255,0,0)","family":"Red"},
    {"id":"c4","name":"Orange","hex":"#FFA500","rgb":"rgb(255,165,0)","family":"Orange"},
    {"id":"c9","name":"Lime","hex":"#00FF00","rgb":"rgb(0,255,0)","family":"Green"},
    {"id":"c13","name":"DodgerBlue","hex":"#1E90FF","rgb":"rgb(30,144,255)","family":"Blue"},
    {"id":"c20","name":"Pink","hex":"#FFC0CB","rgb":"rgb(255,192,203)","family":"Red"}
  ];

  // Delegate clicks on the list to support clicks from any child element
  listEl.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('.card');
    if (card && card.dataset && typeof card.dataset.index !== 'undefined') {
      const idx = Number(card.dataset.index);
      if (!Number.isNaN(idx)) openDetails(idx);
    }
  });

  async function fetchColors(){
    try{
      const res = await fetch('colors.v1.json');
      if(!res.ok) throw new Error('Failed to load colors');
      const data = await res.json();
      colors = Array.isArray(data) ? data : [];
      filtered = colors;
      renderedCount = Math.min(CHUNK_SIZE, filtered.length);
      renderInitialChunks();
    }catch(err){
      console.warn('fetch colors failed, falling back to embedded dataset', err);
      // Load fallback so the UI remains functional when opening index.html via file://
      colors = FALLBACK_COLORS.slice();
      filtered = colors;
      renderedCount = Math.min(CHUNK_SIZE, filtered.length);
      document.getElementById('fallbackBanner').hidden = false;
      renderInitialChunks();
    }
  }

  function debounce(fn, ms){let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a), ms);};}

  function normalize(s){return (s||'').toString().trim().toLowerCase();}

  function applyFilters(){
    const q = normalize(searchInput.value);
    const fam = familySelect.value;
    filtered = colors.filter(c=>{
      if(fam && c.family !== fam) return false;
      if(!q) return true;
      return c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q) || (c.rgb && c.rgb.toLowerCase().includes(q));
    });
    activeIndex = filtered.length ? 0 : -1;
    render();
  }

  const debouncedFilter = debounce(applyFilters, 100);

  function clearList(){ listEl.innerHTML = ''; }

  function renderItem(c,i){
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('role','option');
    card.setAttribute('tabindex',0);
    card.dataset.index = i;

    const sw = document.createElement('div'); sw.className='swatch'; sw.style.background = c.hex; sw.setAttribute('aria-hidden','true');
    const body = document.createElement('div'); body.className='card-body';
    const name = document.createElement('div'); name.className='name'; name.textContent = c.name;
    const right = document.createElement('div');
    const hex = document.createElement('div'); hex.className='hex'; hex.textContent = c.hex;
    const copy = document.createElement('button'); copy.className='copy-btn'; copy.textContent='Copy'; copy.type='button'; copy.setAttribute('aria-label', `Copy ${c.hex}`);
    copy.addEventListener('click', (e)=>{ e.stopPropagation(); navigator.clipboard.writeText(c.hex).then(()=>{ copy.textContent='Copied'; announce(`Copied ${c.hex}`); setTimeout(()=>copy.textContent='Copy',900); }); });

    right.appendChild(hex); right.appendChild(copy);
    body.appendChild(name); body.appendChild(right);
    card.appendChild(sw); card.appendChild(body);

    // keyboard support
    card.addEventListener('keydown', (ev)=>{ if(ev.key === 'Enter') openDetails(i); });

    return card;
  }

  function renderInitialChunks(){
    clearList();
    if(filtered.length === 0){ emptyEl.hidden = false; listEl.setAttribute('aria-hidden','true'); return; }
    emptyEl.hidden = true; listEl.removeAttribute('aria-hidden');
    const toRender = Math.min(renderedCount, filtered.length);
    for(let i=0;i<toRender;i++){ listEl.appendChild(renderItem(filtered[i], i)); }
    observeLast();
    updateActive();
  }

  function appendNextChunk(){
    const start = listEl.querySelectorAll('.card').length;
    const end = Math.min(filtered.length, start + CHUNK_SIZE);
    for(let i=start;i<end;i++) listEl.appendChild(renderItem(filtered[i], i));
    observeLast();
  }

  function observeLast(){
    const items = listEl.querySelectorAll('.card');
    const last = items[items.length-1];
    if(!last) return;
    if(window._observer) window._observer.disconnect();
    window._observer = new IntersectionObserver(entries=>{
      entries.forEach(ent=>{ if(ent.isIntersecting){ appendNextChunk(); } });
    },{root:null,rootMargin:'200px'});
    window._observer.observe(last);
  }

  function updateActive(){
    const items = listEl.querySelectorAll('.card');
    items.forEach((it, idx)=>{
      if(idx === activeIndex){ it.classList.add('active'); it.setAttribute('aria-selected','true'); it.focus(); }
      else { it.classList.remove('active'); it.removeAttribute('aria-selected'); }
    });
  }

  function openDetails(i){
    const c = filtered[i];
    if(!c) return;
    lastFocused = document.activeElement;
    const hsl = rgbToHsl(hexToRgb(c.hex));
    const contrastWhite = contrastRatio(hexToRgb(c.hex), {r:255,g:255,b:255});
    const contrastBlack = contrastRatio(hexToRgb(c.hex), {r:0,g:0,b:0});

    // Build modal content safely without innerHTML
    modalBody.innerHTML = '';
    const title = document.createElement('h2'); title.textContent = c.name;
    const sw = document.createElement('div'); sw.style.height = '110px'; sw.style.borderRadius = '6px'; sw.style.background = c.hex; sw.style.margin = '8px 0'; sw.style.border = '1px solid #ddd';
    const pHex = document.createElement('p'); pHex.innerHTML = '<strong>HEX:</strong> '; const codeHex = document.createElement('code'); codeHex.textContent = c.hex; pHex.appendChild(codeHex);
    const pRgb = document.createElement('p'); pRgb.innerHTML = '<strong>RGB:</strong> '; const codeRgb = document.createElement('code'); codeRgb.textContent = c.rgb || jsonRgb(c.hex); pRgb.appendChild(codeRgb);
    const pHsl = document.createElement('p'); pHsl.innerHTML = '<strong>HSL:</strong> '; const codeHsl = document.createElement('code'); codeHsl.textContent = hsl ? Math.round(hsl.h)+','+Math.round(hsl.s)+'%,'+Math.round(hsl.l)+'%' : 'n/a'; pHsl.appendChild(codeHsl);
    const pCW = document.createElement('p'); pCW.innerHTML = '<strong>Contrast (vs white):</strong> ' + contrastWhite.toFixed(2) + ' — ' + (contrastWhite>=4.5? 'AA' : 'Fail');
    const pCB = document.createElement('p'); pCB.innerHTML = '<strong>Contrast (vs black):</strong> ' + contrastBlack.toFixed(2) + ' — ' + (contrastBlack>=4.5? 'AA' : 'Fail');
    const btnWrap = document.createElement('div'); btnWrap.style.marginTop = '8px';
    const copyBtn = document.createElement('button'); copyBtn.className = 'copy-btn'; copyBtn.id = 'copyHexModal'; copyBtn.textContent = 'Copy HEX';
    copyBtn.addEventListener('click', ()=>{ navigator.clipboard.writeText(c.hex).then(()=>announce(`Copied ${c.hex}`)); });
    btnWrap.appendChild(copyBtn);

    modalBody.appendChild(title);
    modalBody.appendChild(sw);
    modalBody.appendChild(pHex);
    modalBody.appendChild(pRgb);
    modalBody.appendChild(pHsl);
    modalBody.appendChild(pCW);
    modalBody.appendChild(pCB);
    modalBody.appendChild(btnWrap);

    modal.setAttribute('aria-hidden','false');
    modal.style.display = 'flex';
    closeModal.focus();
    trapFocus(modal);
  }

  function close(){
    modal.setAttribute('aria-hidden','true');
    modal.style.display = 'none';
    releaseFocusTrap();
    if(lastFocused) lastFocused.focus();
  }

  closeModal.addEventListener('click', close);
  // close when clicking backdrop
  modal.addEventListener('click', (e)=>{ if(e.target === modal) close(); });

  // keyboard navigation for list
  document.addEventListener('keydown', (ev)=>{
    if(document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
    if(ev.key === 'ArrowDown'){
      if(filtered.length===0) return;
      activeIndex = Math.min(filtered.length-1, activeIndex+1);
      updateActive(); ev.preventDefault();
    } else if(ev.key === 'ArrowUp'){
      if(filtered.length===0) return;
      activeIndex = Math.max(0, activeIndex-1);
      updateActive(); ev.preventDefault();
    } else if(ev.key === 'Enter'){
      if(activeIndex>=0) openDetails(activeIndex);
    } else if(ev.key === 'Escape'){
      if(modal.getAttribute('aria-hidden') === 'false') close();
    }
  });

  searchInput.addEventListener('input', debouncedFilter);
  familySelect.addEventListener('change', applyFilters);

  // simple focus trap
  let focusable = []; let trapHandler = null;
  function trapFocus(root){ focusable = Array.from(root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(el=>!el.hasAttribute('disabled')); trapHandler = (e)=>{ if(e.key==='Tab'){ const first = focusable[0]; const last = focusable[focusable.length-1]; if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus(); } else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus(); } } }; document.addEventListener('keydown', trapHandler); }
  function releaseFocusTrap(){ if(trapHandler) document.removeEventListener('keydown', trapHandler); trapHandler=null; }

  function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  function announce(text){
    const el = document.getElementById('announce');
    if(!el) return;
    el.textContent = text;
    // clear after brief moment so repeated announcements are announced
    setTimeout(()=>{ if(el.textContent === text) el.textContent = ''; }, 1200);
  }

  // helpers: hex->rgb, rgb->hsl, contrast ratio
  function hexToRgb(hex){ if(!hex) return null; const h = hex.replace('#',''); if(h.length===3){ return {r:parseInt(h[0]+h[0],16), g:parseInt(h[1]+h[1],16), b:parseInt(h[2]+h[2],16)}; } if(h.length===6){return {r:parseInt(h.slice(0,2),16), g:parseInt(h.slice(2,4),16), b:parseInt(h.slice(4,6),16)};} return null; }
  function jsonRgb(hex){ const t = hexToRgb(hex); return t?`rgb(${t.r},${t.g},${t.b})`:'rgb(0,0,0)'; }
  function rgbToHsl(rgb){ if(!rgb) return null; let r=rgb.r/255,g=rgb.g/255,b=rgb.b/255; const max=Math.max(r,g,b), min=Math.min(r,g,b); let h,s,l=(max+min)/2; if(max===min){h=s=0;} else{const d=max-min; s = l>0.5?d/(2-max-min):d/(max+min); switch(max){case r: h=(g-b)/d + (g<b?6:0); break; case g: h=(b-r)/d + 2; break; case b: h=(r-g)/d + 4; break;} h=h*60;} return {h:h, s: s*100, l: l*100}; }
  function luminance(rgb){ const a=[rgb.r,rgb.g,rgb.b].map(v=>{ v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4); }); return 0.2126*a[0]+0.7152*a[1]+0.0722*a[2]; }
  function contrastRatio(rgb1, rgb2){ const L1 = luminance(rgb1); const L2 = luminance(rgb2); const lighter = Math.max(L1,L2); const darker = Math.min(L1,L2); return (lighter+0.05)/(darker+0.05); }

  // startup
  fetchColors();

})();