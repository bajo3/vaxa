/* VAXA — switcher 2 ejes desacoplados (acento + fondo) · demo */
(function(){
  var r=document.documentElement;
  var ACC=['emerald','ocean','copper','violet','teal','sky','amber','rose','crimson','slate'];
  var BG =['navy','verde','carbon','azul','negro','calido'];
  function setGroup(dataAttr, btnAttr, val, lsKey){
    r.setAttribute(dataAttr, val);
    document.querySelectorAll('#vaxa-palette-dock ['+btnAttr+']').forEach(function(b){
      b.classList.toggle('is-active', b.getAttribute(btnAttr)===val);
    });
    try{ localStorage.setItem(lsKey, val); }catch(e){}
  }
  var acc='emerald', bg='navy';
  try{ var a=localStorage.getItem('vaxaAccent'); if(ACC.indexOf(a)>=0) acc=a;
       var g=localStorage.getItem('vaxaBg'); if(BG.indexOf(g)>=0) bg=g; }catch(e){}
  setGroup('data-accent','data-acc',acc,'vaxaAccent');
  setGroup('data-bg','data-bg',bg,'vaxaBg');

  var dock=document.getElementById('vaxa-palette-dock');
  var toggle=document.getElementById('vpd-toggle');
  if(dock){
    var collapsed=false;
    try{ collapsed = localStorage.getItem('vaxaDockCollapsed')==='1'; }catch(e){}
    if(collapsed){
      dock.classList.add('is-collapsed');
      if(toggle) toggle.setAttribute('aria-expanded','false');
    }
  }

  document.addEventListener('click', function(e){
    if(!e.target.closest) return;
    if(dock){
      var hitToggle=e.target.closest('#vpd-toggle');
      var hitDock=e.target.closest('#vaxa-palette-dock');
      if(hitToggle || (hitDock && dock.classList.contains('is-collapsed'))){
        var nowCollapsed=dock.classList.toggle('is-collapsed');
        if(toggle) toggle.setAttribute('aria-expanded', String(!nowCollapsed));
        try{ localStorage.setItem('vaxaDockCollapsed', nowCollapsed?'1':'0'); }catch(e2){}
        return;
      }
    }
    var a=e.target.closest('#vaxa-palette-dock [data-acc]');
    if(a){ setGroup('data-accent','data-acc',a.getAttribute('data-acc'),'vaxaAccent'); return; }
    var g=e.target.closest('#vaxa-palette-dock [data-bg]');
    if(g){ setGroup('data-bg','data-bg',g.getAttribute('data-bg'),'vaxaBg'); }
  });
})();
