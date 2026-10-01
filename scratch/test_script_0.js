(function(){
        var d=document,o=d.createElement('div');
        o.id='mentra-page-transition-overlay';
        o.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(248,250,252,0.6);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);opacity:1;transition:opacity .22s ease-out;pointer-events:none;';
        d.documentElement.appendChild(o);
        function fadeOut(){if(o){o.style.opacity='0';setTimeout(function(){o.style.pointerEvents='none';},280);}}
        if(d.readyState==='loading'){d.addEventListener('DOMContentLoaded',fadeOut);}else{fadeOut();}
        window.addEventListener('pageshow',function(){if(o){o.style.opacity='0';o.style.pointerEvents='none';}});
    })();