;(function(root){
  function normalize(s){ return (s||'').toString().trim().toLowerCase(); }

  function filterColors(colors, q, family){
    const nq = normalize(q);
    return colors.filter(c=>{
      if(family && c.family !== family) return false;
      if(!nq) return true;
      return (c.name && c.name.toLowerCase().includes(nq)) || (c.hex && c.hex.toLowerCase().includes(nq)) || (c.rgb && c.rgb.toLowerCase().includes(nq));
    });
  }

  if(typeof module !== 'undefined' && module.exports) module.exports = { filterColors };
  else root.filterColors = filterColors;
})(typeof window !== 'undefined' ? window : global);
