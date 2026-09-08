// RapidScan interactions — no frameworks, no emoji
(function(){
  // ticker 12-45ms
  const el = document.getElementById('decodeTicker');
  if(el){
    const vals = [22,18,31,15,27,35,19,24,12,28,33,21];
    let i=0;
    setInterval(()=>{
      i=(i+1)%vals.length;
      el.innerHTML = vals[i] + '<span class="unit">ms</span>';
    }, 900);
  }

  // copy button
  document.querySelectorAll('[data-copy]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const code = document.querySelector('.code-block pre code');
      if(!code) return;
      const text = code.innerText;
      try{ await navigator.clipboard.writeText(text); } catch(e){
        const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      const orig = btn.innerHTML;
      btn.textContent='Copied';
      setTimeout(()=> btn.innerHTML=orig, 1400);
    });
  });

  // mobile nav — robust, accessible, with backdrop + scroll lock (no focus jumps)
  const burger = document.querySelector('.nav-burger');
  const panel = document.getElementById('mobileNav');
  const backdrop = document.getElementById('mobileBackdrop');
  const closeBtn = document.querySelector('.mobile-close');
  function closePanelSilently(){
    if(!panel || !backdrop) return;
    panel.hidden=true;
    backdrop.hidden=true;
    document.body.style.overflow='';
    if(burger){
      burger.setAttribute('aria-expanded','false');
      burger.setAttribute('aria-label','Open menu');
      const m=burger.querySelector('.icon-menu'), c=burger.querySelector('.icon-close');
      if(m) m.style.display='block';
      if(c) c.style.display='none';
    }
  }
  if(burger && panel && backdrop){
    const iconMenu = burger.querySelector('.icon-menu');
    const iconClose = burger.querySelector('.icon-close');
    let open=false;
    function setOpen(v, opts){
      opts=opts||{};
      open=v;
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if(open){
        panel.hidden=false;
        backdrop.hidden=false;
        document.body.style.overflow='hidden';
        if(iconMenu) iconMenu.style.display='none';
        if(iconClose) iconClose.style.display='block';
      } else {
        panel.hidden=true;
        backdrop.hidden=true;
        document.body.style.overflow='';
        if(iconMenu) iconMenu.style.display='block';
        if(iconClose) iconClose.style.display='none';
        if(opts.focusBurger !== false){
          try{ burger.focus({preventScroll:true}); }catch(e){ burger.focus(); }
        }
      }
    }
    burger.addEventListener('click', ()=> setOpen(!open));
    if(closeBtn) closeBtn.addEventListener('click', ()=> setOpen(false));
    backdrop.addEventListener('click', ()=> setOpen(false));
    // link clicks: close silently WITHOUT refocus so anchor glide doesn't fight
    panel.querySelectorAll('a').forEach(a=> a.addEventListener('click', ()=>{
      open=false;
      closePanelSilently();
    }));
    document.addEventListener('keydown', e=>{
      if(e.key==='Escape' && open) setOpen(false);
    });
    window.addEventListener('resize', ()=>{
      if(window.innerWidth>960 && open) setOpen(false, {focusBurger:false});
    });
  }

  // subtle laser parallax (disabled on reduced motion)
  const laser = document.querySelector('.vf-laser');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(laser && !prefersReduced){
    let t=0;
    setInterval(()=>{
      t+=0.06;
      const y = Math.sin(t)*6;
      laser.style.transform = `translateY(${y}px)`;
    }, 32);
  }

  // smooth scroll — click glides, wheel = native + small extra coast (no hijack, no mid delay)
  if(!prefersReduced){
    let glideRaf=null, coastTimer=null, wheelAcc=0;
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    const maxScroll=()=>Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const easeOutCubic = t=> 1 - Math.pow(1-t,3);

    function glideTo(to, duration){
      if(glideRaf) cancelAnimationFrame(glideRaf);
      const from = window.scrollY;
      const dist = to - from;
      if(Math.abs(dist) < 1) return;
      const prev = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior='auto';
      let start=null;
      function step(ts){
        if(start===null) start=ts;
        const p=Math.min((ts-start)/duration,1);
        const e=easeOutCubic(p);
        window.scrollTo(0, Math.round(from + dist*e));
        if(p<1){
          glideRaf=requestAnimationFrame(step);
        } else {
          document.documentElement.style.scrollBehavior=prev;
          glideRaf=null;
        }
      }
      glideRaf=requestAnimationFrame(step);
    }

    // click → instant glide (no stop); unlocks menu first, measures on next frame
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
      a.addEventListener('click', e=>{
        const href=a.getAttribute('href');
        if(!href || href==='#' || href.length<2) return;
        const target=document.querySelector(href);
        if(!target) return;
        e.preventDefault();
        clearTimeout(coastTimer); wheelAcc=0;
        closePanelSilently();
        // wait a frame so body overflow unlock settles before measuring
        requestAnimationFrame(()=>{
          const headerOffset = window.innerWidth <= 960 ? 64 : 70;
          const top=Math.max(0, target.getBoundingClientRect().top + window.scrollY - headerOffset);
          history.pushState(null,'',href);
          glideTo(top, window.innerWidth <= 960 ? 560 : 680);
        });
      });
    });

    // wheel → native scroll stays instant, then a small smooth coast on top.
    // No preventDefault, so no mid-scroll delay — just a bit more glide.
    if(!isTouch){
      window.addEventListener('wheel', e=>{
        const over = e.target.closest && e.target.closest('.code-block pre, .bench-table-wrap, .arch-table-wrap, .stack-pills');
        if(over){
          const elx = over;
          const canX = elx.scrollWidth > elx.clientWidth;
          if(canX && Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.6) return;
          if(canX && Math.abs(e.deltaX) > 2) return;
        }
        let dy = e.deltaY;
        if(e.deltaMode===1) dy *= 16;
        else if(e.deltaMode===2) dy *= window.innerHeight * 0.9;
        if(Math.abs(dy) < 2) return;
        // user took over — cancel any coast in flight so main scroll stays live
        if(glideRaf){ cancelAnimationFrame(glideRaf); glideRaf=null; }
        wheelAcc += dy;
        clearTimeout(coastTimer);
        coastTimer = setTimeout(()=>{
          const dir = Math.sign(wheelAcc);
          const extra = clamp(Math.abs(wheelAcc) * 0.22, 20, 88) * dir;
          wheelAcc = 0;
          if(Math.abs(extra) < 5) return;
          const to = clamp(window.scrollY + extra, 0, maxScroll());
          glideTo(to, 210);
        }, 90);
      }, {passive:true});
    }
  }
})();
