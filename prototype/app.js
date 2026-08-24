/* Minimal prototype app.js
   Features:
   - Fetch colors.json
   - Client-side filter with debounce
   - Keyboard navigation (arrow keys) and Enter to open details
   - Accessible modal with focus return
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

  function fetchColors(){
    return fetch('colors.v1.json').then(r=>r.json()).then(data=>{colors = data; filtered = data; render();});
  }

  function debounce(fn, ms){let t; return (...a)=>{clearTimeout(t); t=setTimeout(()=>fn(...a), ms);};}

  function normalize(s){return (s||'').toString().trim().toLowerCase();}

  function applyFilters(){
    const q = normalize(searchInput.value);
    const fam = familySelect.value;
    filtered = colors.filter(c=>{
      if(fam && c.family !== fam) return false;
      if(!q) return true;
      return c.name.toLowerCase().includes(q) || c.hex.toLowerCase().includes(q) || c.rgb.toLowerCase().includes(q);
    });
    activeIndex = filtered.length ? 0 : -1;
    render();
  }

  const debouncedFilter = debounce(applyFilters, 100);

  function render(){
    listEl.innerHTML = '';
    if(filtered.length === 0){ emptyEl.hidden = false; listEl.setAttribute('aria-hidden','true'); return; }
    emptyEl.hidden = true; listEl.removeAttribute('aria-hidden');
    filtered.forEach((c,i)=>{
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
      const copy = document.createElement('button'); copy.className='copy-btn'; copy.textContent='Copy'; copy.type='button';
      copy.addEventListener('click', (e)=>{ e.stopPropagation(); navigator.clipboard.writeText(c.hex).then(()=>copy.textContent='Copied'); setTimeout(()=>copy.textContent='Copy',900); });

      right.appendChild(hex); right.appendChild(copy);
      body.appendChild(name); body.appendChild(right);
      card.appendChild(sw); card.appendChild(body);

      card.addEventListener('click', ()=>openDetails(i));
      card.addEventListener('keydown', (ev)=>{
        if(ev.key === 'Enter') openDetails(i);
      });

      listEl.appendChild(card);
    });
    updateActive();
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
    modalBody.innerHTML = `
      <h2>${escapeHtml(c.name)}</h2>
      <div style="height:110px;border-radius:6px;background:${c.hex};margin:8px 0;border:1px solid #ddd"></div>
      <p><strong>HEX:</strong> <code>${c.hex}</code></p>
      <p><strong>RGB:</strong> <code>${c.rgb}</code></p>
      <p><strong>Family:</strong> ${escapeHtml(c.family)}</p>
      <div style="margin-top:8px"><button id="copyHexModal" class="copy-btn">Copy HEX</button></div>
    `;
    modal.setAttribute('aria-hidden','false');
    modal.style.display = 'flex';
    modal.querySelector('#copyHexModal').addEventListener('click', ()=>{ navigator.clipboard.writeText(c.hex); });
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

  // keyboard navigation for list
  document.addEventListener('keydown', (ev)=>{
    if(document.activeElement && document.activeElement.tagName === 'INPUT') return;
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

  function escapeHtml(s){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  // startup
  fetchColors();

})();
