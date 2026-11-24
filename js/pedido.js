/* Puente Laboral · pedir un servicio
   Dos caminos separados:
   - Al toque (mode 'ya'):    qué → dónde y cuánto. Alguien va ahora.
   - Programado (mode 'prog'): qué → qué día → dónde y cuánto. Con anticipación, una vez o repetido.
   Con ?w=Nombre el pedido va directo a un trabajador de confianza. */
(function(){
  const PL = window.PL;
  const TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
  const NOREP = ['eventos', 'mudanza'];

  PL.route('pedir', (view, args, qs) => {
    const svc = PL.svc(args[0]) || PL.svc('otro');
    const S = PL.S, re = qs.get('re') ? PL.order(qs.get('re')) : null;
    let fav = qs.get('w') ? PL.fav(qs.get('w')) : null;
    let mode = qs.get('m') || PL.mode || 'ya';
    if (mode === 'ya' && !PL.canNow(svc)) mode = 'prog';
    PL.mode = mode;
    const favsHere = S.favs.filter(f => PL.history(f.name).some(o => o.svc === svc.id));
    const lastPrice = name => { const h = PL.history(name).find(o => o.svc === svc.id); return h ? h.price : null; };
    const D = {
      tasks: re ? re.tasks.slice() : [], note: re ? re.note : (qs.get('d') || ''),
      people: re ? re.people : 1, hours: re ? re.hours : (svc.u === 'hora' ? 3 : 1),
      district: (re && re.district) || S.client.district || '', address: re ? re.address : '',
      when: mode === 'ya' ? {type: 'ahora'} : {type: 'fecha', date: '', time: ''},
      repeat: re && re.repeat ? re.repeat : 'no',
      price: (fav && lastPrice(fav.name)) || (re ? re.price : PL.mid(svc)), pay: re ? re.pay : 'efectivo', photo: null,
      direct: fav ? fav.name : null, fallback: true
    };
    const STEPS = mode === 'ya' ? [que, dondePrecio] : [que, cuando, dondePrecio];
    const TITLES = mode === 'ya' ? ['¿Qué <span class="k">necesitas?</span>', '¿Dónde y <span class="k">cuánto?</span>'] : ['¿Qué <span class="k">necesitas?</span>', '¿Qué <span class="k">día?</span>', '¿Dónde y <span class="k">cuánto?</span>'];
    let step = 0;

    view.innerHTML = `<div class="flow" id="flow"><div class="flow-map" id="fmap"><span class="map-chip" id="mchip">${PL.ic('pin')}<span></span></span></div>
      <section class="flow-panel"><div class="fp-h"><button class="ibtn" id="back" type="button" aria-label="Atrás">${PL.ic('back')}</button><h1 id="fh"></h1><div class="dots" aria-hidden="true">${STEPS.map(() => '<i></i>').join('')}</div></div>
      <div class="mode-bar ${mode}" id="mbar"></div>
      <div class="fp-b" id="fb"></div><div class="fp-f" id="ff"></div></section></div>`;
    const flow = PL.$('#flow', view), fb = PL.$('#fb', view), ff = PL.$('#ff', view);
    PL.map(PL.$('#fmap', view), {seed: D.district || 'lima', label: 'Mapa de tu zona'});

    const tot = () => D.price * D.people * (svc.u === 'hora' ? D.hours : 1);
    const nextBtn = () => `<button class="btn btn-t" id="next" type="button">Continuar<span class="arr">${PL.ic('arrow')}</span></button>`;
    const head = () => `<div class="svc-head"><span class="svc-ic">${PL.si(svc.i)}</span><div><b>${PL.esc(svc.n)}</b><span>${svc.other ? 'Cuéntanos qué necesitas' : `${PL.money(svc.min)} – ${PL.money(svc.max)} ${PL.unitText(svc.u)}`}</span></div><a class="btn btn-l btn-xs" href="#/">Cambiar</a></div>`;
    const directBox = () => {
      if (!D.direct) return '';
      const f = PL.fav(D.direct), n = PL.history(f.name).length;
      return `<div class="direct">${PL.avatar(f.name, f.color)}<div><b>Pedido directo a ${PL.esc(PL.short(f.name))}</b><span>${n ? `Te ayudó ${n} ${n === 1 ? 'vez' : 'veces'} · ` : ''}${PL.starsH(f.rating)}</span></div><span class="heart" aria-hidden="true">${PL.ic('heart')}</span></div>`;
    };
    const qty = (key, label, sub) => `<div class="qty"><div><b>${label}</b><span>${sub}</span></div><div class="stepper"><button type="button" data-q="${key}" data-d="-1" aria-label="Menos">${PL.ic('minus')}</button><output id="q-${key}">${D[key]}</output><button type="button" data-q="${key}" data-d="1" aria-label="Más">${PL.ic('plus')}</button></div></div>`;

    function drawBar(){
      const other = mode === 'ya' ? 'prog' : 'ya', canSwitch = step === 0 && (other === 'prog' || PL.canNow(svc));
      PL.$('#mbar', view).innerHTML = mode === 'ya'
        ? `${PL.ic('bolt')}<span><b>Al toque</b> · alguien va ahora</span>${canSwitch ? `<button type="button" data-sw="prog">Mejor otro día</button>` : ''}`
        : `${PL.ic('cal')}<span><b>Programado</b> · eliges día y hora</span>${canSwitch ? `<button type="button" data-sw="ya">Lo necesito ya</button>` : ''}`;
      const sw = PL.$('[data-sw]', view);
      if (sw) sw.onclick = () => { const p = new URLSearchParams(qs); p.set('m', sw.dataset.sw); PL.mode = sw.dataset.sw; PL.go(`#/pedir/${svc.id}?${p}`); };
    }

    /* ——— paso: qué ——— */
    function que(){
      fb.innerHTML = `${directBox()}${head()}
        ${svc.t.length ? `<p class="blk-t">¿Qué hay que hacer? <small>Elige una o más</small></p><div class="chips" id="tasks">${svc.t.map(t => `<button class="chip" type="button" aria-pressed="${D.tasks.includes(t)}">${PL.esc(t)}</button>`).join('')}</div>` : ''}
        <label class="field" style="margin-top:18px"><span>${svc.other ? 'Describe el trabajo' : 'Cuéntale más'} <em>${svc.other ? '' : '(opcional)'}</em></span><textarea class="in" id="note" maxlength="400" placeholder="${svc.other ? 'Ej.: necesito alguien que arregle mi bicicleta' : 'Detalles que ayuden a cotizar: medidas, marca, piso, horario…'}">${PL.esc(D.note)}</textarea></label>
        <label class="photo-add"><input type="file" accept="image/*" id="photo"><span class="ph">${D.photo ? `<img src="${D.photo}" alt="">` : PL.ic('cam')}</span><span>${D.photo ? 'Foto agregada · cambiar' : 'Agrega una foto <span class="muted">(opcional)</span>'}</span></label>
        ${svc.team ? qty('people', '¿Cuántas personas?', 'Para eventos y turnos') : ''}
        ${svc.u === 'hora' ? qty('hours', '¿Cuántas horas?', 'Pagas por hora') : ''}`;
      ff.innerHTML = nextBtn();
      const next = PL.$('#next', ff), note = PL.$('#note', fb);
      const sync = () => { next.disabled = !(svc.other ? D.note.trim().length > 3 : (D.tasks.length || D.note.trim().length > 3)); };
      const tl = PL.$('#tasks', fb);
      if (tl) tl.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; const t = b.textContent, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); D.tasks = on ? D.tasks.concat(t) : D.tasks.filter(x => x !== t); sync(); };
      note.oninput = () => { D.note = note.value; sync(); };
      PL.$('#photo', fb).onchange = e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { D.photo = r.result; que(); }; r.readAsDataURL(f); };
      fb.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { const k = b.dataset.q; D[k] = Math.max(1, Math.min(k === 'people' ? 30 : 12, D[k] + Number(b.dataset.d))); PL.$('#q-' + k, fb).textContent = D[k]; });
      next.onclick = () => go(step + 1);
      sync();
    }

    /* ——— paso: qué día (solo programado) ——— */
    function cuando(){
      const days = [];
      for (let i = 0; i < 21; i++) days.push(PL.isoDay(new Date(Date.now() + i * 864e5)));
      const canRep = !svc.other && !NOREP.includes(svc.c);
      fb.innerHTML = `<p class="blk-t">Día</p><div class="day-rail" id="days" role="group" aria-label="Elige el día">${days.map((iso, i) => { const [dw, dn, dm] = PL.fdate(iso + 'T12:00').split(' '); return `<button class="day" type="button" data-day="${iso}" aria-pressed="${D.when.date === iso}"><span>${i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : dw}</span><b>${dn}</b><span>${dm}</span></button>`; }).join('')}</div>
        <p class="blk-t">Hora de llegada</p><div class="times" id="times"></div>
        ${canRep ? `<p class="blk-t">¿Se repite? <small>Ideal para limpieza, cuidado y clases</small></p><div class="chips" id="rep">${Object.keys(PL.REPEAT).map(k => `<button class="chip" type="button" data-r="${k}" aria-pressed="${D.repeat === k}">${PL.REPEAT[k]}</button>`).join('')}</div>` : ''}
        <div class="when-sum" id="ws" hidden></div>`;
      ff.innerHTML = nextBtn();
      const next = PL.$('#next', ff);
      function drawTimes(){
        const isToday = D.when.date === days[0], h0 = new Date().getHours() + 2;
        PL.$('#times', fb).innerHTML = TIMES.map(t => { const off = isToday && Number(t.slice(0, 2)) < h0; return `<button class="chip" type="button" data-t="${t}" aria-pressed="${D.when.time === t}"${off ? ' disabled' : ''}>${PL.fhm(t).replace(':00', '')}</button>`; }).join('');
        if (isToday && D.when.time && Number(D.when.time.slice(0, 2)) < h0) D.when.time = '';
      }
      function sync(){
        next.disabled = !(D.when.date && D.when.time);
        const ws = PL.$('#ws', fb);
        ws.hidden = next.disabled;
        ws.innerHTML = `${PL.ic('cal')}<span><b>${PL.esc(PL.whenText(D.when))}</b>${D.repeat !== 'no' ? ' · ' + PL.REPEAT[D.repeat].toLowerCase() : ''}</span>`;
      }
      PL.$('#days', fb).onclick = e => { const b = e.target.closest('[data-day]'); if (!b) return; D.when.date = b.dataset.day; PL.$$('[data-day]', fb).forEach(x => x.setAttribute('aria-pressed', x === b)); drawTimes(); sync(); };
      PL.$('#times', fb).onclick = e => { const b = e.target.closest('[data-t]'); if (!b || b.disabled) return; D.when.time = b.dataset.t; PL.$$('[data-t]', fb).forEach(x => x.setAttribute('aria-pressed', x === b)); sync(); };
      const rep = PL.$('#rep', fb);
      if (rep) rep.onclick = e => { const b = e.target.closest('[data-r]'); if (!b) return; D.repeat = b.dataset.r; PL.$$('[data-r]', fb).forEach(x => x.setAttribute('aria-pressed', x === b)); sync(); };
      next.onclick = () => go(step + 1);
      drawTimes(); sync();
    }

    /* ——— paso: dónde y cuánto ——— */
    function dondePrecio(){
      const st = PL.step(svc), lo = Math.max(st, PL.snap(svc.min * .5, svc)), hi = svc.max * 2;
      const pos = v => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
      fb.innerHTML = `${favsHere.length && !fav ? `<p class="blk-t">¿A quién se lo pides?</p><div class="chips" id="who"><button class="chip" type="button" data-who="" aria-pressed="${!D.direct}">${PL.ic('users')}Recibir ofertas</button>${favsHere.map(f => `<button class="chip who" type="button" data-who="${PL.esc(f.name)}" aria-pressed="${D.direct === f.name}">${PL.avatar(f.name, f.color, 'xs')}${PL.esc(PL.short(f.name))}</button>`).join('')}</div>` : directBox()}
        <label class="check" id="fbk"${D.direct ? '' : ' hidden'}><input type="checkbox" id="fallback"${D.fallback ? ' checked' : ''}><span>Si no puede, que me lleguen ofertas de otros trabajadores.</span></label>
        <p class="blk-t">Distrito</p>
        <button class="in" type="button" id="dist" style="display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer">${PL.ic('pin')}<span style="flex:1">${PL.esc(D.district || 'Elige tu distrito')}</span>${PL.ic('chev')}</button>
        <label class="field" style="margin-top:14px"><span>Dirección o referencia <em>(solo la ve quien aceptes)</em></span><input class="in" id="addr" maxlength="140" autocomplete="street-address" placeholder="Ej.: Av. Benavides 1200, frente al parque" value="${PL.esc(D.address)}"></label>
        <p class="blk-t">¿Cuánto ofreces?</p>
        <div class="price"><div class="price-row"><button class="ibtn" type="button" id="pm" aria-label="Bajar ${st} soles">${PL.ic('minus')}</button><output class="price-val" id="pv" aria-live="polite"></output><button class="ibtn" type="button" id="pp" aria-label="Subir ${st} soles">${PL.ic('plus')}</button></div>
          <p class="price-unit">${svc.other ? 'por el trabajo' : PL.unitText(svc.u)}${D.people > 1 ? ' · por persona' : ''}</p>
          ${svc.other ? '' : `<div class="range" aria-hidden="true"><span class="ok" style="left:${pos(svc.min)}%;right:${100 - pos(svc.max)}%"></span><span class="mk" id="mk"></span></div><div class="range-l"><span>${PL.money(lo)}</span><span>Lo usual: ${PL.money(svc.min)} – ${PL.money(svc.max)}</span><span>${PL.money(hi)}</span></div>`}
          <p class="price-hint" id="ph"></p></div>
        <p class="blk-t">¿Cómo pagas? <small>Directo al trabajador, al terminar</small></p>
        <div class="methods" id="pay">${[['efectivo', 'Efectivo', '#D6F4E3', PL.ic('cash')], ['yape', 'Yape', '#D4CBFF', 'Y'], ['plin', 'Plin', '#B4EEE1', 'P']].map(m => `<button class="method" type="button" data-m="${m[0]}" aria-pressed="${D.pay === m[0]}"><span class="mi" style="background:${m[2]}">${m[3]}</span>${m[1]}</button>`).join('')}</div>
        <p class="blk-t">Tus datos</p>
        <div class="row2"><label class="field"><span>Nombre</span><input class="in" id="cn" autocomplete="given-name" maxlength="40" value="${PL.esc(S.client.name)}"></label><label class="field"><span>WhatsApp <em>(opcional)</em></span><input class="in" id="cp" type="tel" inputmode="numeric" autocomplete="tel" maxlength="9" placeholder="9XXXXXXXX" value="${PL.esc(S.client.phone)}"></label></div>
        <div class="sum"><dl class="dl"><dt>Servicio</dt><dd>${PL.esc(svc.n)}</dd>${D.tasks.length ? `<dt>Trabajo</dt><dd>${PL.esc(D.tasks.join(', '))}</dd>` : ''}<dt>Cuándo</dt><dd>${mode === 'ya' ? 'Al toque' : PL.esc(PL.whenText(D.when))}</dd>${D.repeat !== 'no' ? `<dt>Se repite</dt><dd>${PL.REPEAT[D.repeat]}</dd>` : ''}${D.people > 1 ? `<dt>Personas</dt><dd>${D.people}</dd>` : ''}${svc.u === 'hora' ? `<dt>Horas</dt><dd>${D.hours}</dd>` : ''}</dl></div>
        <a class="wa-alt" id="waAlt" target="_blank" rel="noopener" href="#">${PL.ic('wa')}<span><b>¿Lo necesitas de verdad?</b>Mientras lanzamos la app, te lo coordinamos por WhatsApp.</span></a>
        <p class="muted mono" style="margin-top:14px;text-align:center">Modo demo: las ofertas que verás son de ejemplo</p>`;
      ff.innerHTML = `<div class="tot"><b id="tt"></b><span>${D.people > 1 || svc.u === 'hora' ? 'total estimado' : 'tu oferta'}</span></div><button class="btn btn-a" id="go" type="button"></button>`;
      PL.$('#mchip span', view).textContent = D.district || 'Tu zona';
      function draw(){
        PL.$('#pv', fb).innerHTML = `<small>S/</small>${D.price}`;
        PL.$('#tt', ff).textContent = PL.money(tot());
        const mk = PL.$('#mk', fb); if (mk) mk.style.left = pos(D.price) + '%';
        const ph = PL.$('#ph', fb), m = PL.mid(svc);
        const [cls, txt] = D.direct ? ['ok', `Se lo enviamos primero a ${PL.short(D.direct)}`] : svc.other ? ['ok', 'Los trabajadores pueden aceptar tu precio o proponerte otro.'] :
          D.price < svc.min ? ['lo', 'Muy bajo: pocas personas aceptarán este precio.'] :
          D.price < m * .92 ? ['hi', 'Algo bajo: puede que tarden más en aceptar.'] :
          D.price <= svc.max ? ['ok', mode === 'ya' ? 'Buen precio: te llegarán ofertas rápido.' : 'Buen precio: te llegarán varias ofertas para ese día.'] : ['hi', 'Por encima de lo usual: te llegarán ofertas al toque.'];
        ph.className = 'price-hint ' + cls; ph.textContent = txt;
        PL.$('#pm', fb).disabled = D.price - st < lo;
        PL.$('#go', ff).textContent = D.direct ? `Enviar a ${PL.short(D.direct)}` : mode === 'ya' ? 'Pedir al toque' : 'Publicar pedido';
        PL.$('#fbk', fb).hidden = !D.direct;
        PL.$('#waAlt', fb).href = PL.wa(waText());
      }
      function waText(){
        return `*Pedido ${mode === 'ya' ? 'AL TOQUE' : 'programado'}*\nServicio: ${svc.n}\n${D.tasks.length ? 'Trabajo: ' + D.tasks.join(', ') + '\n' : ''}${D.note ? 'Detalle: ' + D.note + '\n' : ''}${D.people > 1 ? 'Personas: ' + D.people + '\n' : ''}${svc.u === 'hora' ? 'Horas: ' + D.hours + '\n' : ''}Distrito: ${D.district}\n${D.address ? 'Referencia: ' + D.address + '\n' : ''}Cuándo: ${mode === 'ya' ? 'Ahora' : PL.whenText(D.when)}${D.repeat !== 'no' ? ' (' + PL.REPEAT[D.repeat].toLowerCase() + ')' : ''}\n${D.direct ? 'Quiero que vaya: ' + D.direct + '\n' : ''}Ofrezco: ${PL.money(D.price)} ${svc.other ? '' : PL.unitText(svc.u)}\nPago: ${D.pay}\nNombre: ${PL.$('#cn', fb).value.trim()}`;
      }
      const who = PL.$('#who', fb);
      if (who) who.onclick = e => { const b = e.target.closest('[data-who]'); if (!b) return; D.direct = b.dataset.who || null; if (D.direct && lastPrice(D.direct)) D.price = lastPrice(D.direct); PL.$$('[data-who]', fb).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
      PL.$('#fallback', fb).onchange = e => { D.fallback = e.target.checked; };
      PL.$('#dist', fb).onclick = () => PL.pickDistrict(D.district, d => { D.district = d; PL.$('#dist span', fb).textContent = d; PL.$('#mchip span', view).textContent = d; draw(); });
      PL.$('#addr', fb).oninput = e => { D.address = e.target.value; };
      PL.$('#pm', fb).onclick = () => { D.price = Math.max(lo, D.price - st); draw(); };
      PL.$('#pp', fb).onclick = () => { D.price = Math.min(hi, D.price + st); draw(); };
      PL.$('#pay', fb).onclick = e => { const b = e.target.closest('[data-m]'); if (!b) return; D.pay = b.dataset.m; PL.$$('[data-m]', fb).forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
      PL.$('#cn', fb).oninput = draw;
      PL.$('#waAlt', fb).onclick = () => PL.toSheet({tipo: 'pedido', modo: mode === 'ya' ? 'al toque' : 'programado', servicio: svc.n, trabajo: D.tasks.join(', '), detalle: D.note, distrito: D.district, referencia: D.address, cuando: mode === 'ya' ? 'Ahora' : PL.whenText(D.when), repite: PL.REPEAT[D.repeat], directo: D.direct || '', precio: D.price, personas: D.people, pago: D.pay, nombre: PL.$('#cn', fb).value.trim(), wa: PL.$('#cp', fb).value.trim()});
      PL.$('#go', ff).onclick = () => {
        const cn = PL.$('#cn', fb), cp = PL.$('#cp', fb);
        if (!D.district) { PL.toast('Elige tu distrito'); PL.$('#dist', fb).focus(); return; }
        if (!cn.value.trim()) { cn.classList.add('err'); cn.focus(); PL.toast('Escribe tu nombre para que sepan a quién atienden'); return; }
        if (cp.value && !/^9\d{8}$/.test(cp.value.trim())) { cp.classList.add('err'); cp.focus(); PL.toast('El WhatsApp debe tener 9 dígitos y empezar con 9'); return; }
        S.client.name = cn.value.trim(); S.client.phone = cp.value.trim(); S.client.district = S.client.district || D.district;
        const o = {id: PL.uid(), mode, svc: svc.id, tasks: D.tasks, note: D.note.trim(), people: D.people, hours: D.hours, u: svc.u, district: D.district, address: D.address.trim(), when: Object.assign({}, D.when), repeat: mode === 'prog' ? D.repeat : 'no', direct: D.direct, fallback: D.fallback, price: D.price, pay: D.pay, status: 'buscando', createdAt: Date.now()};
        S.orders.push(o); PL.save();
        PL.go('#/pedido/' + o.id);
      };
      draw();
    }

    function go(n){
      step = n;
      PL.$('#fh', view).innerHTML = TITLES[n];
      PL.$$('.dots i', view).forEach((d, i) => d.classList.toggle('on', i <= n));
      flow.dataset.map = STEPS[n] === dondePrecio ? 'm' : 's';
      PL.$('#mchip span', view).textContent = D.district || 'Tu zona';
      drawBar();
      STEPS[n]();
      const panel = PL.$('.flow-panel', view); if (panel) panel.scrollTop = 0;
      if (n > 0) window.scrollTo(0, 0);
    }
    PL.$('#back', view).onclick = () => step > 0 ? go(step - 1) : history.length > 1 ? history.back() : PL.go('#/');
    go(0);
  }, {flow: true, tab: ''});
})();
