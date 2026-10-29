// Shared field filler. ?blank=1 empties every [data-f] slot (base template export).
// Otherwise ?<field>=value fills text; fields listed in data-html accept limited HTML (<em>).
// Image slots: [data-img="qr"] get src from ?qr= (data: URI or relative path). Sets window.__ready when done.
(function(){
  const p=new URLSearchParams(location.search), blank=p.get('blank')==='1';
  if(blank) document.body.classList.add('blank');
  document.querySelectorAll('[data-f]').forEach(el=>{
    const k=el.dataset.f;
    if(blank){el.textContent='';return;}
    if(p.has(k)){ if(el.hasAttribute('data-html')) el.innerHTML=p.get(k).replace(/<(?!\/?em>)[^>]*>/g,''); else el.textContent=p.get(k); }
  });
  document.querySelectorAll('[data-img]').forEach(el=>{
    const k=el.dataset.img;
    if(blank){el.removeAttribute('src');el.style.visibility='hidden';return;}
    if(p.has(k)) el.src=p.get(k);
  });
  if(p.get('photo')){const e=document.getElementById('photo'); if(e){e.textContent='';e.style.border='none';e.style.backgroundImage=`url('${p.get('photo')}')`;}}
  if(blank){const e=document.getElementById('photo'); if(e) e.textContent='';}
  window.__ready=true;
})();
