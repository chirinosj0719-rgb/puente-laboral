/* Puente Laboral · un pedido en vivo: ofertas → en camino → trabajando → pago → calificación */
(function(){
  const PL = window.PL;
  const DUR = {en_camino: 26000, llego: 7000, trabajando: 15000};   // tiempos de la demo

  function set(o, status){ o.status = status; o.stageAt = Date.now(); PL.save(); PL.render(); }
  function shell(view, o, size, title, back = '#/pedidos'){
    view.innerHTML = `<div class="flow" data-map="${size}"><div class="flow-map" id="fmap"><span class="map-chip">${PL.ic('pin')}<span>${PL.esc(o.district)}</span></span></div>
      <section class="flow-panel"><div class="fp-h"><a class="ibtn" href="${back}" aria-label="Volver">${PL.ic('back')}</a><h1>${title}</h1></div><div class="fp-b" id="fb"></div><div class="fp-f" id="ff" hidden></div></section></div>`;
    return {map: PL.map(PL.$('#fmap', view), {seed: o.district, label: 'Mapa del pedido'}), fb: PL.$('#fb', view), ff: PL.$('#ff', view)};
  }
  const wName = o => PL.short(o.worker.name) + (o.people > 1 ? ' y equipo' : '');

  PL.route('pedido', (view, args) => {
    const o = PL.order(args[0]);
    if (!o) { PL.go('#/pedidos'); return; }
    ({buscando: o.direct ? direct : seek, programado: track, en_camino: track, llego: track, trabajando: track, pagar: pay, calificar: rate, terminado: receipt, cancelado: receipt})[o.status](view, o);
  }, {flow: true, tab: 'pedidos'});

  async function cancel(o){
    const ok = await PL.confirm({title: '¿Cancelar el pedido?', text: o.worker ? `${PL.short(o.worker.name)} ya aceptó. Si cancelas, se le avisa al toque.` : 'Dejarás de recibir ofertas.', ok: 'Sí, cancelar', cancel: 'Seguir', danger: true});
    if (ok) { set(o, 'cancelado'); PL.toast('Pedido cancelado'); }
  }

  /* ——— 1. buscando: llegan ofertas ——— */
  function seek(view, o){
    const svc = PL.svc(o.svc), st = PL.step(svc);
    const prog = o.mode === 'prog';
    const {map, fb, ff} = shell(view, o, 'm', prog ? 'Pedido <span class="k">publicado</span>' : 'Buscando<span class="k">…</span>');
    map.radar(true);
    const offTxt = () => `Ofreces ${PL.money(o.price)} ${svc.other ? '' : PL.unitText(svc.u)}${o.people > 1 ? ` · ${o.people} personas` : ''}`;
    fb.innerHTML = `<div class="seek"><span class="ld" aria-hidden="true"><i></i><i></i><i></i></span><div><b>${prog ? `${PL.esc(svc.n)} · ${PL.esc(PL.whenText(o.when))}` : `Buscando ${PL.esc(svc.n.toLowerCase())} en ${PL.esc(o.district)}`}</b><span id="offTxt">${offTxt()}</span></div></div>
      ${prog ? `<p class="muted" style="margin:-4px 0 14px;font-size:.92rem">Para otros días las ofertas llegan con calma y no vencen: compara y elige cuando quieras. Te avisamos si llega una nueva.</p>` : ''}
      <p class="eti" style="margin:4px 0 10px">Ofertas de ejemplo</p>
      <div class="offers" id="offers" aria-live="polite"></div>
      <div class="raise"><p><b>¿Quieres más ofertas?</b><br><span class="muted">Sube tu precio y llegan más rápido.</span></p><button class="btn btn-l btn-sm" type="button" data-r="${st}">+ S/ ${st}</button><button class="btn btn-l btn-sm" type="button" data-r="${st * 2}">+ S/ ${st * 2}</button></div>`;
    ff.hidden = false;
    ff.innerHTML = prog ? `<button class="btn btn-l" type="button" id="cx">Cancelar</button><a class="btn btn-t" href="#/pedidos?t=prox">Elegir más tarde</a>` : `<button class="btn btn-l" type="button" id="cx">Cancelar pedido</button>`;
    PL.$('#cx', ff).onclick = () => cancel(o);
    const box = PL.$('#offers', fb), used = [];
    let spawned = 0, live = 0;
    function want(){ const r = o.price / PL.mid(svc); return r < .75 ? 1 : r < .95 ? 3 : 4; }
    function spawn(){
      const m = PL.mid(svc), r = o.price / m, w = PL.fakeWorker(used); used.push(w.name);
      let price = o.price;
      if (r < .9) price = Math.max(o.price + st, PL.snap(m * PL.rnd(.95, 1.1), svc));
      else if (r < 1 ? Math.random() < .5 : Math.random() < .25) price = o.price + st * PL.ri(1, 2);
      const id = 'of' + (++spawned), same = price === o.price, team = o.people > 1;
      map.addPin(id, w);
      const el = document.createElement('article');
      el.className = 'offer rise' + (spawned === 1 ? ' best' : ''); el.dataset.id = id;
      el.innerHTML = `<div class="of-top">${PL.avatar(w.name, w.color)}<div class="of-who"><b>${PL.esc(PL.short(w.name))}${team ? ' y equipo' : ''}</b><div class="meta">${PL.starsH(w.rating)}<span>${w.jobs} trabajos</span><span>${w.km} km</span></div></div><div class="of-pr"><b>${PL.money(price)}</b><span class="${same ? 'same' : 'up'}">${same ? 'Tu precio' : 'Contraoferta'}</span></div></div>
        <div class="of-badges"><span class="pill v">${PL.ic('check')}DNI verificado</span>${w.bg ? `<span class="pill v">${PL.ic('shield')}Antecedentes OK</span>` : ''}${prog ? `<span class="pill o">${PL.ic('cal')}Disponible ${PL.esc(PL.dayName(o.when.date).toLowerCase())}</span>${o.repeat !== 'no' ? `<span class="pill o">Puede ${PL.esc(PL.REPEAT[o.repeat].toLowerCase())}</span>` : ''}` : `<span class="pill o">${PL.ic('clock')}Llega en ${w.eta} min</span>`}${team ? `<span class="pill o">${PL.ic('users')}Equipo de ${o.people}</span>` : ''}</div>
        <div class="of-acts"><button class="btn btn-l btn-sm" type="button" data-no>Rechazar</button><button class="btn btn-t btn-sm" type="button" data-ok>Aceptar ${PL.money(price)}</button></div>
        ${prog ? '' : '<i class="of-bar" aria-hidden="true"><i style="animation-duration:30s"></i></i>'}`;
      box.appendChild(el); live++;
      const kill = () => { if (!el.isConnected) return; el.remove(); map.removePin(id); live--; };
      if (!prog) PL.later(kill, 30000);
      el.querySelector('[data-no]').onclick = kill;
      el.querySelector('[data-ok]').onclick = () => {
        o.worker = w; o.price = price; o.pin = String(PL.ri(1000, 9999)); o.eta = w.eta; o.chat = [];
        o.wpos = null;
        PL.toast(`${PL.short(w.name)} aceptó tu pedido`);
        set(o, prog ? 'programado' : 'en_camino');
      };
    }
    PL.later(spawn, prog ? 2200 : 1600);
    PL.every(() => { if (live < want() && spawned < want() + 4) spawn(); }, prog ? 4200 : 3300);
    fb.querySelectorAll('[data-r]').forEach(b => b.onclick = () => {
      o.price += Number(b.dataset.r); PL.save();
      PL.$('#offTxt', fb).textContent = offTxt();
      PL.toast(`Subiste tu oferta a ${PL.money(o.price)}`);
      if (live < want() + 1) spawn();
    });
  }

  /* ——— 1b. pedido directo a un trabajador de confianza ——— */
  function direct(view, o){
    const svc = PL.svc(o.svc), f = PL.fav(o.direct) || {name: o.direct, color: '#FFD86B', rating: 4.8, jobs: 40, phone: '9** *** ***'};
    const n = PL.history(f.name).length, nm = PL.short(f.name);
    const {map, fb, ff} = shell(view, o, 'm', `Esperando a <span class="k">${PL.esc(nm)}</span>`);
    map.addPin('w', f);
    fb.innerHTML = `<div class="direct">${PL.avatar(f.name, f.color)}<div><b>${PL.esc(f.name)}</b><span>${n ? `Te ayudó ${n} ${n === 1 ? 'vez' : 'veces'} · ` : ''}${PL.starsH(f.rating)}</span></div><span class="heart" aria-hidden="true">${PL.ic('heart')}</span></div>
      <div class="seek" id="dst"><span class="ld" aria-hidden="true"><i></i><i></i><i></i></span><div><b>Le enviamos tu pedido</b><span>${PL.esc(svc.n)} · ${o.mode === 'ya' ? 'al toque' : PL.esc(PL.whenText(o.when))} · ${PL.money(o.price)}</span></div></div>
      <p class="muted" id="dnote">${o.fallback ? 'Si no puede, te mostramos ofertas de otros trabajadores.' : 'Si no puede, te avisamos para que elijas otra opción.'}</p>`;
    ff.hidden = false;
    ff.innerHTML = `<button class="btn btn-l" type="button" id="cx">Cancelar</button><button class="btn btn-t" type="button" id="others">Abrir a otros</button>`;
    const bind = () => { PL.$('#cx', ff).onclick = () => cancel(o); PL.$('#others', ff).onclick = () => { o.direct = null; set(o, 'buscando'); }; };
    bind();
    PL.later(() => {
      if (Math.random() < .85) {
        const w = Object.assign(PL.fakeWorker(), {name: f.name, color: f.color, rating: f.rating, jobs: f.jobs, phone: f.phone});
        Object.assign(o, {worker: w, pin: String(PL.ri(1000, 9999)), eta: w.eta, chat: [], wpos: null, wasDirect: true});
        PL.toast(`${nm} confirmó tu pedido`);
        set(o, o.mode === 'prog' ? 'programado' : 'en_camino');
      } else if (o.fallback) {
        o.direct = null; PL.toast(`${nm} no puede ese horario. Te mostramos otras ofertas.`, 3800); set(o, 'buscando');
      } else {
        PL.$('#dst', fb).outerHTML = `<p class="price-hint lo">${PL.esc(nm)} no puede en ese horario.</p>`;
        PL.$('#dnote', fb).textContent = 'Puedes abrir tu pedido a otros trabajadores o cancelarlo.';
        ff.innerHTML = `<button class="btn btn-l" type="button" id="cx">Cancelar</button><button class="btn btn-t" type="button" id="others">Recibir otras ofertas</button>`; bind();
      }
    }, 3000);
  }

  /* ——— 2. seguimiento ——— */
  function track(view, o){
    const svc = PL.svc(o.svc), w = o.worker, s = o.status;
    const T = {programado: 'Pedido <span class="k">programado</span>', en_camino: 'En <span class="k">camino</span>', llego: '¡<span class="k">Llegó!</span>', trabajando: 'Trabajando<span class="k">…</span>'};
    const {map, fb, ff} = shell(view, o, s === 'trabajando' || s === 'programado' ? 's' : 'l', T[s]);
    const pos = map.addPin('w', w, o.wpos || undefined);
    if (!o.wpos) { o.wpos = pos; PL.save(); }
    const idx = {programado: 0, en_camino: 1, llego: 2, trabajando: 3}[s];
    const head = {
      programado: `<h2>${PL.esc(wName(o))} va a ir</h2><div class="eta"><b>${(() => { const d = Math.round((new Date(o.when.date + 'T00:00') - new Date(PL.isoDay(new Date()) + 'T00:00')) / 864e5); return d <= 0 ? 'Hoy' : d === 1 ? 'Mañana' : 'En ' + d + ' días'; })()}</b><span>${PL.esc(PL.fhm(o.when.time))}</span></div>`,
      en_camino: `<h2>${PL.esc(wName(o))} viene a tu dirección</h2><div class="eta"><b id="eta">${o.eta} min</b><span>llegada aprox.</span></div>`,
      llego: `<h2>Dale tu código para empezar</h2>`,
      trabajando: `<h2>Empezó a las ${PL.ftime(o.stageAt)}</h2>`
    }[s];
    fb.innerHTML = `<div class="trk-h">${head}</div>
      ${s === 'programado' ? `<div class="when-sum">${PL.ic('cal')}<span><b>${PL.esc(PL.whenText(o.when))}</b>${o.repeat && o.repeat !== 'no' ? ' · ' + PL.REPEAT[o.repeat].toLowerCase() : ''}<br><span class="muted">Te recordamos un día antes.</span></span></div>` : ''}
      <ol class="trk-steps">${['Aceptado', 'En camino', 'Llegó', 'Trabajando'].map((t, i) => `<li class="${i < idx ? 'done' : i === idx ? 'now' : ''}">${t}</li>`).join('')}</ol>
      <div class="wk">${PL.avatar(w.name, w.color)}<div class="wk-i"><b>${PL.esc(PL.short(w.name))}${o.people > 1 ? ` <span class="pill o">+${o.people - 1}</span>` : ''}</b><div class="meta">${PL.starsH(w.rating)}<span>${w.jobs} trabajos</span><span>${PL.esc(svc.n)}</span></div></div>
        <div class="wk-acts"><button class="ibtn" type="button" id="chat" aria-label="Escribirle">${PL.ic('chat')}</button><button class="ibtn" type="button" id="call" aria-label="Llamarle">${PL.ic('phone')}</button></div></div>
      ${s !== 'trabajando' ? `<div class="pin"><p><b>Tu código de inicio</b>${s === 'llego' ? 'Díselo ahora: así confirma que es la persona correcta.' : 'Díselo solo cuando llegue a tu puerta.'}</p><div class="code" aria-label="Código ${o.pin.split('').join(' ')}">${o.pin.split('').map(d => `<span>${d}</span>`).join('')}</div></div>` : ''}
      <div class="sum"><dl class="dl"><dt>Precio</dt><dd>${PL.money(PL.total(o))}</dd><dt>Pago</dt><dd style="text-transform:capitalize">${PL.esc(o.pay)}</dd>${o.tasks.length ? `<dt>Trabajo</dt><dd>${PL.esc(o.tasks.join(', '))}</dd>` : ''}</dl></div>
      <div class="trk-acts"><button class="btn btn-l btn-sm" type="button" id="share">${PL.ic('share')}Compartir</button><button class="btn btn-r btn-sm" type="button" id="help">${PL.ic('alert')}Ayuda</button></div>
      ${s === 'programado' ? `<button class="btn btn-l btn-sm btn-full" type="button" id="resch" style="margin-top:8px">${PL.ic('cal')}Cambiar día u hora</button>` : ''}
      ${s === 'programado' || s === 'en_camino' ? `<button class="btn btn-g btn-sm btn-full" type="button" id="cx" style="margin-top:8px">Cancelar pedido</button>` : ''}
      <div class="demo-skip">Demo <button type="button" id="skip">${s === 'programado' ? 'Simular que llegó el día' : 'Avanzar'} ›</button></div>`;
    PL.$('#chat', fb).onclick = () => PL.chat(o);
    PL.$('#call', fb).onclick = () => PL.toast('En la demo no se hacen llamadas. Usa el chat.');
    PL.$('#share', fb).onclick = () => share(o);
    PL.$('#help', fb).onclick = () => help(o);
    const cx = PL.$('#cx', fb); if (cx) cx.onclick = () => cancel(o);
    const rs = PL.$('#resch', fb); if (rs) rs.onclick = () => resched(o);
    const NEXT = {programado: 'en_camino', en_camino: 'llego', llego: 'trabajando', trabajando: 'pagar'};
    PL.$('#skip', fb).onclick = () => advance(NEXT[s]);
    function advance(n){
      if (n === 'trabajando') PL.toast('Código correcto. ¡Empezó el trabajo!');
      if (n === 'pagar') PL.toast(`${PL.short(w.name)} terminó el trabajo`);
      if (n === 'llego') PL.toast(`${PL.short(w.name)} llegó a tu dirección`);
      set(o, n);
    }
    const el = Date.now() - (o.stageAt || Date.now());
    if (s === 'en_camino') {
      const etaEl = PL.$('#eta', fb);
      PL.loop(() => {
        const p = Math.min(1, (Date.now() - o.stageAt) / DUR.en_camino);
        map.move('w', p);
        etaEl.textContent = Math.max(1, Math.ceil(o.eta * (1 - p))) + ' min';
        if (p >= 1) { advance('llego'); return false; }
      });
    } else if (s === 'llego' || s === 'trabajando') {
      map.move('w', 1);
      PL.later(() => advance(NEXT[s]), Math.max(800, DUR[s] - el));
    }
  }

  function resched(o){
    const today = PL.isoDay(new Date());
    PL.sheet({title: 'Cambiar día u hora', body: `<div class="row2"><label class="field"><span>Día</span><input class="in" type="date" id="rd" min="${today}" value="${o.when.date}"></label><label class="field"><span>Hora</span><input class="in" type="time" id="rt" step="1800" value="${o.when.time}"></label></div><p class="muted">Le preguntamos a ${PL.esc(PL.short(o.worker.name))} si puede en el nuevo horario.</p>`,
      foot: `<button class="btn btn-l" type="button" data-close>Volver</button><button class="btn btn-t" type="button" id="rok">Proponer cambio</button>`,
      onOpen: sh => { sh.querySelector('#rok').onclick = () => {
        const d = sh.querySelector('#rd').value, t = sh.querySelector('#rt').value;
        if (!d || !t) { PL.toast('Elige día y hora'); return; }
        o.when = {type: 'fecha', date: d, time: t}; PL.save(); PL.closeSheet();
        PL.toast(`${PL.short(o.worker.name)} confirmó: ${PL.whenText(o.when)}`, 3400); PL.render();
      }; }});
  }

  function share(o){
    const svc = PL.svc(o.svc);
    const text = `Mi pedido en Puente Laboral: ${svc.n} con ${o.worker.name}, ${PL.whenText(o.when)} en ${o.district}.`;
    if (navigator.share) navigator.share({title: 'Mi pedido en Puente Laboral', text}).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => PL.toast('Copiado. Pégalo en el chat de tu familia.'), () => PL.toast(text, 5000));
    else PL.toast(text, 5000);
  }
  function help(o){
    const svc = PL.svc(o.svc);
    PL.sheet({title: '¿Necesitas ayuda?', body: `<div class="list">
      <a href="tel:105">${PL.ic('alert')}<span>Emergencia<span class="sub">Llamar a la Policía (105)</span></span>${PL.ic('chev', 'i chev')}</a>
      <a target="_blank" rel="noopener" href="${PL.wa(`Hola, necesito ayuda con mi pedido ${o.id}: ${svc.n} con ${o.worker ? o.worker.name : '-'} en ${o.district}.`)}">${PL.ic('wa')}<span>Escribir a Puente Laboral<span class="sub">Te respondemos por WhatsApp</span></span>${PL.ic('chev', 'i chev')}</a>
      <button type="button" id="hShare">${PL.ic('share')}<span>Compartir mi pedido<span class="sub">Que tu familia sepa quién va</span></span>${PL.ic('chev', 'i chev')}</button></div>`,
      onOpen: s => { s.querySelector('#hShare').onclick = () => share(o); }});
  }

  /* chat con respuestas de ejemplo */
  PL.chat = o => {
    const w = o.worker;
    if (!o.chat) o.chat = [];
    if (!o.chat.length) { o.chat.push({me: false, t: o.greet || `Hola, soy ${w.name.split(' ')[0]}. Ya vi tu pedido${o.status === 'en_camino' ? ', voy en camino' : ''}.`}); PL.save(); }
    PL.sheet({title: PL.esc(PL.short(w.name)), body: `<div class="chat" id="cl" aria-live="polite"></div><div class="quick" id="qk">${['¿Cuánto falta?', 'Te espero en la puerta', 'Toca el timbre', 'Trae tus herramientas'].map(q => `<button class="chip" type="button">${q}</button>`).join('')}</div><form class="chat-f" id="cf"><input class="in" id="ci" placeholder="Escribe un mensaje" autocomplete="off" aria-label="Mensaje"><button class="btn btn-t" type="submit" aria-label="Enviar">${PL.ic('arrow')}</button></form>`,
      onOpen: s => {
        const cl = s.querySelector('#cl'), ci = s.querySelector('#ci');
        const draw = () => { cl.innerHTML = o.chat.map(m => `<div class="msg ${m.me ? 'me' : 'it'}">${PL.esc(m.t)}</div>`).join(''); cl.scrollTop = cl.scrollHeight; };
        const send = t => {
          if (!t.trim()) return;
          o.chat.push({me: true, t: t.trim()}); PL.save(); draw();
          setTimeout(() => {
            const n = PL.norm(t), left = Math.max(2, Math.ceil(o.eta * .5));
            const r = /puedes|disponible|semana|manana|vienes|venir/.test(n) ? 'Sí, claro. Mándame el pedido por la app y lo confirmo.' : /falta|demora|cuanto/.test(n) ? `Llego en unos ${left} minutos.` : /herramienta/.test(n) ? 'Sí, llevo todo lo necesario.' : /timbre|puerta/.test(n) ? 'Perfecto, te aviso al llegar.' : PL.pick(['Entendido, gracias.', 'Listo, ahí nos vemos.', 'Perfecto.']);
            o.chat.push({me: false, t: r}); PL.save(); if (cl.isConnected) draw();
          }, 1300);
        };
        s.querySelector('#qk').onclick = e => { const b = e.target.closest('.chip'); if (b) send(b.textContent); };
        s.querySelector('#cf').onsubmit = e => { e.preventDefault(); send(ci.value); ci.value = ''; };
        draw();
      }});
  };

  /* ——— 3. pago directo ——— */
  function pay(view, o){
    const w = o.worker, base = PL.total(o);
    const {map, fb, ff} = shell(view, o, 's', `Paga a <span class="k">${PL.esc(PL.short(w.name))}</span>`);
    map.addPin('w', w, o.wpos || undefined); map.move('w', 1);
    let tip = 0, m = o.pay;
    const tips = base >= 200 ? [0, 10, 20, 30] : [0, 2, 5, 10];
    fb.innerHTML = `<div class="pay-tot"><b id="pt"></b><span>${PL.esc(PL.svc(o.svc).n)} · trabajo terminado</span></div>
      <p class="blk-t">Propina <small>opcional, va completa para ${PL.esc(w.name.split(' ')[0])}</small></p>
      <div class="chips" id="tips">${tips.map(t => `<button class="chip" type="button" data-t="${t}" aria-pressed="${t === 0}">${t ? '+ S/ ' + t : 'Sin propina'}</button>`).join('')}</div>
      <p class="blk-t">Método</p>
      <div class="methods" id="pm">${[['efectivo', 'Efectivo', '#D6F4E3', PL.ic('cash')], ['yape', 'Yape', '#D4CBFF', 'Y'], ['plin', 'Plin', '#B4EEE1', 'P']].map(x => `<button class="method" type="button" data-m="${x[0]}" aria-pressed="${m === x[0]}"><span class="mi" style="background:${x[2]}">${x[3]}</span>${x[1]}</button>`).join('')}</div>
      <div class="yape" id="how"></div>`;
    ff.hidden = false; ff.innerHTML = `<button class="btn btn-a" type="button" id="paid"></button>`;
    function draw(){
      const t = base + tip;
      PL.$('#pt', fb).textContent = PL.money(t);
      PL.$('#paid', ff).textContent = `Ya pagué ${PL.money(t)}`;
      PL.$('#how', fb).innerHTML = m === 'efectivo' ? `<span class="mi" style="background:#D6F4E3">${PL.ic('cash')}</span><div><b>Entrégale ${PL.money(t)} en efectivo</b><br><span class="muted">Pide que te dé vuelto si hace falta.</span></div>` :
        `<span class="mi" style="background:${m === 'yape' ? '#D4CBFF' : '#B4EEE1'}">${m === 'yape' ? 'Y' : 'P'}</span><div><b>${m === 'yape' ? 'Yapea' : 'Plinea'} ${PL.money(t)} a ${PL.esc(w.name)}</b><br><span class="muted mono">${w.phone} · número de ejemplo</span></div>`;
    }
    PL.$('#tips', fb).onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tip = Number(b.dataset.t); PL.$$('[data-t]', fb).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
    PL.$('#pm', fb).onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; m = b.dataset.m; PL.$$('[data-m]', fb).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
    PL.$('#paid', ff).onclick = () => { o.tip = tip; o.pay = m; o.paidAt = Date.now(); set(o, 'calificar'); };
    draw();
  }

  /* ——— 4. calificación ——— */
  function rate(view, o){
    const w = o.worker;
    const {map, fb, ff} = shell(view, o, 's', '¿Cómo te <span class="k">fue?</span>');
    map.addPin('w', w, o.wpos || undefined); map.move('w', 1);
    let stars = 0, tags = [];
    const GOOD = ['Puntual', 'Buen trabajo', 'Amable', 'Dejó todo limpio', 'Buen precio'], BAD = ['Llegó tarde', 'Trabajo incompleto', 'Mal trato', 'Cobró de más', 'Dejó desorden'];
    fb.innerHTML = `<div style="text-align:center">${PL.avatar(w.name, w.color, 'l').replace('class="av l"', 'class="av l" style="margin:0 auto 10px;background:' + w.color + '"')}<b style="font:800 1.3rem var(--f-t)">${PL.esc(w.name)}</b><p class="muted">${PL.esc(PL.svc(o.svc).n)} · ${PL.esc(PL.fdate(o.paidAt || Date.now()))}</p></div>
      <div class="rate" id="rs" role="group" aria-label="Calificación">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-s="${n}" aria-pressed="false" aria-label="${n} de 5"><svg viewBox="0 0 24 24" aria-hidden="true">${PL.UI.star}</svg></button>`).join('')}</div>
      <div class="chips" id="tg" style="justify-content:center"></div>
      <label class="field" style="margin-top:16px"><span>Comentario <em>(opcional)</em></span><textarea class="in" id="cm" maxlength="300" placeholder="Cuéntale a otros cómo fue"></textarea></label>
      ${PL.fav(w.name) ? `<p class="fav-check on">${PL.ic('heart')}<span>${PL.esc(w.name.split(' ')[0])} ya está en <b>Mis trabajadores</b></span></p>` : `<label class="fav-check" id="favc" hidden><input type="checkbox" id="favIn" checked><span>${PL.ic('heart')} Guardar a ${PL.esc(w.name.split(' ')[0])} en <b>Mis trabajadores</b> para volver a llamarle</span></label>`}`;
    ff.hidden = false; ff.innerHTML = `<button class="btn btn-l" type="button" id="skip">Ahora no</button><button class="btn btn-t" type="button" id="send" disabled>Enviar</button>`;
    function drawTags(){
      const l = stars >= 4 ? GOOD : stars ? BAD : [];
      tags = tags.filter(t => l.includes(t));
      PL.$('#tg', fb).innerHTML = l.map(t => `<button class="chip" type="button" aria-pressed="${tags.includes(t)}">${t}</button>`).join('');
    }
    PL.$('#rs', fb).onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; stars = Number(b.dataset.s); PL.$$('[data-s]', fb).forEach(x => x.setAttribute('aria-pressed', Number(x.dataset.s) <= stars)); PL.$('#send', ff).disabled = false; drawTags(); const fc = PL.$('#favc', fb); if (fc) fc.hidden = stars < 4; };
    PL.$('#tg', fb).onclick = e => { const b = e.target.closest('.chip'); if (!b) return; const t = b.textContent, on = !tags.includes(t); tags = on ? tags.concat(t) : tags.filter(x => x !== t); b.setAttribute('aria-pressed', on); };
    PL.$('#skip', ff).onclick = () => finish(o);
    PL.$('#send', ff).onclick = () => {
      o.rating = stars; o.tags = tags; o.comment = PL.$('#cm', fb).value.trim();
      const fi = PL.$('#favIn', fb);
      if (fi && stars >= 4 && fi.checked) PL.addFav(w);
      PL.toast(`¡Gracias! Tu calificación ayuda a ${w.name.split(' ')[0]} a conseguir más trabajo.`, 3600);
      finish(o);
    };
  }

  /* al terminar: si se repite, se crea el siguiente con la misma persona */
  function finish(o){
    o.status = 'terminado'; o.stageAt = Date.now();
    if (o.repeat && o.repeat !== 'no' && o.when && o.when.date && !o.nextId) {
      const d = new Date(o.when.date + 'T12:00'); d.setDate(d.getDate() + PL.REPEAT_DAYS[o.repeat]);
      const n = Object.assign({}, o, {id: PL.uid(), when: {type: 'fecha', date: PL.isoDay(d), time: o.when.time}, status: 'programado', createdAt: Date.now(), stageAt: Date.now(), pin: String(PL.ri(1000, 9999)), chat: [], wpos: null, tip: 0, rating: 0, tags: [], comment: '', paidAt: 0, nextId: null});
      o.nextId = n.id; PL.S.orders.push(n);
      PL.toast(`Listo. ${PL.short(o.worker.name)} vuelve el ${PL.whenText(n.when).toLowerCase()}`, 4200);
    }
    PL.save(); PL.render();
  }

  /* ——— 5. resumen ——— */
  function receipt(view, o){
    const svc = PL.svc(o.svc), done = o.status === 'terminado';
    const {map, fb} = shell(view, o, 's', done ? 'Pedido <span class="k">terminado</span>' : 'Pedido <span class="k">cancelado</span>');
    if (o.worker) { map.addPin('w', o.worker, o.wpos || undefined); if (done) map.move('w', 1); }
    fb.innerHTML = `${done ? `<div class="done-ic">${PL.ic('check')}</div>` : ''}
      <div class="sum" style="margin-top:0"><dl class="dl"><dt>Servicio</dt><dd>${PL.esc(svc.n)}</dd>${o.tasks.length ? `<dt>Trabajo</dt><dd>${PL.esc(o.tasks.join(', '))}</dd>` : ''}${o.worker ? `<dt>Trabajador</dt><dd>${PL.esc(o.worker.name)}${o.people > 1 ? ` y equipo (${o.people})` : ''}</dd>` : ''}<dt>Cuándo</dt><dd>${PL.esc(PL.whenText(o.when))}</dd><dt>Dónde</dt><dd>${PL.esc(o.district)}</dd><dt>Precio</dt><dd>${PL.money(PL.total(o))}</dd>${o.tip ? `<dt>Propina</dt><dd>${PL.money(o.tip)}</dd>` : ''}${done ? `<dt>Total</dt><dd>${PL.money(PL.total(o) + (o.tip || 0))}</dd><dt>Pago</dt><dd style="text-transform:capitalize">${PL.esc(o.pay)}</dd>` : ''}${o.rating ? `<dt>Tu nota</dt><dd>${PL.starsH(o.rating)}</dd>` : ''}</dl></div>
      ${o.nextId && PL.order(o.nextId) ? `<a class="when-sum" href="#/pedido/${o.nextId}" style="text-decoration:none;margin-top:12px">${PL.ic('cal')}<span><b>Próxima vez: ${PL.esc(PL.whenText(PL.order(o.nextId).when))}</b><br><span class="muted">${PL.REPEAT[o.repeat]} con ${PL.esc(PL.short(o.worker.name))}</span></span></a>` : ''}
      <div style="display:grid;gap:8px;margin-top:16px">
      ${done && o.worker ? `<button class="btn btn-a" type="button" id="rh">${PL.ic('heart')}Volver a contratar a ${PL.esc(PL.short(o.worker.name))}</button><button class="btn btn-l" type="button" id="favT">${PL.fav(o.worker.name) ? PL.ic('check') + 'En Mis trabajadores' : PL.ic('plus') + 'Guardar en Mis trabajadores'}</button><a class="btn btn-l" href="#/pedir/${svc.id}?re=${o.id}">Pedir a otra persona</a>` : `<a class="btn btn-a" href="#/pedir/${svc.id}?re=${o.id}">Volver a pedir<span class="arr">${PL.ic('arrow')}</span></a>`}
      <a class="btn btn-l" target="_blank" rel="noopener" href="${PL.wa(`Hola, quiero reportar un problema con mi pedido ${o.id}: ${svc.n}${o.worker ? ' con ' + o.worker.name : ''}.`)}">Reportar un problema</a>
      <a class="btn btn-g" href="#/">Ir al inicio</a></div>`;
    const rh = PL.$('#rh', fb); if (rh) rh.onclick = () => PL.rehire(o.worker, svc.id, o.id);
    const ft = PL.$('#favT', fb); if (ft) ft.onclick = () => { if (PL.fav(o.worker.name)) { PL.delFav(o.worker.name); PL.toast('Quitado de Mis trabajadores'); } else { PL.addFav(o.worker); PL.toast(`${PL.short(o.worker.name)} está en Mis trabajadores`); } PL.render(); };
  }
})();
