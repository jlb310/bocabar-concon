// Pantallas 1 (carta + reservas) y 3 (carta con pedidos desde la mesa). El modo viene de <body data-modo>.
import { leer, guardar, alCambiar, aplicarTema, fotoUrl, clp, esc, uid, ESTADOS, RESPUESTAS, ESTADOS_RESERVA, ZONAS, totalPedido, mesasLibres, hoyIso, enDias, PREF } from './store.js';

const MODO = document.body.dataset.modo; // 'carta' | 'pedidos'
const PIDE = MODO === 'pedidos';
const MESA = Number(new URLSearchParams(location.search).get('mesa')) || 4;
const pref = (k, d) => { try { return localStorage.getItem(PREF + k) ?? d; } catch { return d; } };
const setPref = (k, v) => { try { localStorage.setItem(PREF + k, v); } catch { /* nada */ } };

let local, categorias, productos;
let filtro = 'todos';
let etiquetaFiltro = '';
let busqueda = '';
let carro = PIDE ? JSON.parse(pref(`carro:${MESA}`, '[]')) : [];
let propina = { modo: 'sugerida', valor: 0 };

const app = document.getElementById('app');
const aviso = document.getElementById('aviso');
let avisoT;
function avisar(t) { aviso.textContent = t; aviso.classList.add('ver'); clearTimeout(avisoT); avisoT = setTimeout(() => aviso.classList.remove('ver'), 2800); }
const wa = (texto) => `https://wa.me/${esc(local.whatsapp)}?text=${encodeURIComponent(texto)}`;

const ETIQUETAS = [['veggie', '🌱 Veggie'], ['sin-arroz', '🍚 Sin arroz'], ['picante', '🌶 Picante']];

function cargar() {
  local = leer('local');
  categorias = leer('categorias');
  productos = leer('productos').filter((p) => p.estado !== 'oculto');
  aplicarTema(pref('tema', '') || local.tema);
}

const fotoDe = (p, w) => (p.foto ? `<img loading="lazy" src="${esc(fotoUrl(p.foto, w))}" alt="">` : `<span class="emoji">${esc(p.emoji || '🍽️')}</span>`);
const enCarro = (id) => carro.filter((c) => c.id === id).reduce((s, c) => s + c.cant, 0);
const agotado = (p) => p.estado === 'agotado';

function tarjeta(p) {
  const n = enCarro(p.id);
  const ag = agotado(p);
  return `
    <article class="prod${ag ? ' prod--agotado' : ''}" data-detalle="${esc(p.id)}" role="button" tabindex="0" aria-label="Ver ${esc(p.nombre)}${ag ? ', agotado hoy' : ''}">
      <div class="prod-foto">${fotoDe(p, 500)}${ag ? '<span class="sello">Agotado hoy</span>' : ''}</div>
      <div class="prod-texto">
        ${p.etiqueta ? `<span class="etiqueta">${esc(p.etiqueta)}</span>` : ''}
        <h3>${esc(p.nombre)}</h3>
        <p>${esc(p.desc)}</p>
        <div class="prod-pie"><span class="precio">${clp(p.precio)}</span>
          ${p.opciones?.length && !ag ? '<span class="personaliza" title="Puedes personalizarlo">✎</span>' : ''}
          ${PIDE && !ag ? (n ? `<span class="en-carro" aria-label="${n} en tu pedido">${n}</span>` : `<button class="mas" data-sumar="${esc(p.id)}" aria-label="Agregar ${esc(p.nombre)}">+</button>`) : ''}
        </div>
      </div>
    </article>`;
}

function render() {
  const q = busqueda.trim().toLowerCase();
  const coincide = (p) => (!q || `${p.nombre} ${p.desc} ${p.etiqueta}`.toLowerCase().includes(q)) && (!etiquetaFiltro || p.tags?.includes(etiquetaFiltro));
  const ordenar = (l) => [...l].sort((a, b) => agotado(a) - agotado(b));
  const destacados = productos.filter((p) => p.etiqueta && !agotado(p) && coincide(p));
  const grupos = [
    ...(filtro === 'todos' || filtro === 'destacados' ? [{ id: 'destacados', nombre: 'Lo más pedido', items: destacados }] : []),
    ...categorias.filter((c) => filtro === 'todos' || filtro === c.id).map((c) => ({ ...c, items: ordenar(productos.filter((p) => p.cat === c.id && coincide(p))) })),
  ].filter((g) => g.items.length);
  const redes = [['instagram', 'IG', 'Instagram'], ['facebook', 'f', 'Facebook'], ['whatsapp', 'WA', 'WhatsApp'], ['sitio', '↗', 'Sitio web']]
    .filter(([k]) => local[k]).map(([k, i, n]) => `<a class="red" href="${k === 'whatsapp' ? `https://wa.me/${esc(local.whatsapp)}` : esc(local[k])}" target="_blank" rel="noopener" aria-label="${n}">${i}</a>`).join('');
  const llamado = PIDE && leer('llamadas').some((l) => l.mesa === MESA && !l.atendida);
  const misPedidos = PIDE ? pedidosMesa() : [];
  const misConsultas = PIDE ? consultasMias() : [];
  const sinLeer = misConsultas.filter((c) => c.estado !== 'pendiente' && !c.leida).length;
  const misReservas = !PIDE ? reservasMias() : [];
  const cuenta = carro.reduce((s, c) => s + c.cant, 0);
  const agotados = productos.filter(agotado).length;

  document.body.classList.toggle('sin-carro', !cuenta);
  app.innerHTML = `
    <header class="top">
      <img class="logo" src="assets/logo-bocabar.png" alt="${esc(local.nombre)}" width="300" height="82">
      <span class="abierto" id="abierto"></span>
      <button class="icono" data-accion="info" aria-label="Información del local">i</button>
    </header>
    <section class="portada">
      <img src="assets/rolls.jpg" alt="">
      <div class="portada-texto">
        <span class="pill">${PIDE ? `Mesa ${MESA} · Pide desde aquí` : 'Carta digital'}</span>
        <h1>${esc(local.titulo)}</h1>
        <p>${esc(local.frase)}</p>
      </div>
    </section>
    ${PIDE ? `
      <div class="mesa">
        <div class="mesa-texto"><b>Estás en la mesa ${MESA}</b><small>Tu pedido llega directo a la barra.</small></div>
        <div class="mesa-botones">
          <button class="boton-chip" data-accion="consultar">💬 Preguntar</button>
          <button class="boton-chip${llamado ? ' llamado' : ''}" data-accion="mesero">${llamado ? '🔔 En camino' : '🔔 Garzón'}</button>
        </div>
      </div>` : `
      <div class="cta-reserva">
        <div><b>¿Vienes a BOCABAR?</b><small>Elige terraza, salón o barra y te guardamos la mesa.</small></div>
        <button class="boton-acento" data-accion="reservar">Reservar mesa</button>
      </div>`}
    <div class="acciones">${redes}<span class="espacio"></span>
      ${!PIDE && misReservas.length ? `<button class="chip-accion" data-accion="mis-reservas">📅 Mis reservas</button>` : ''}
      <button class="chip-accion" data-accion="tema">${document.documentElement.dataset.tema === 'claro' ? '☾ Noche' : '☀ Día'}</button>
    </div>
    <div class="pegajoso">
      <label class="buscar"><span aria-hidden="true">⌕</span><input type="search" id="buscar" placeholder="Buscar: salmón, sin arroz, mojito…" value="${esc(busqueda)}" aria-label="Buscar en la carta"></label>
      <div class="chips" aria-label="Categorías">
        <button class="chip${filtro === 'todos' ? ' activa' : ''}" data-filtro="todos">Todo</button>
        ${categorias.map((c) => `<button class="chip${filtro === c.id ? ' activa' : ''}" data-filtro="${esc(c.id)}">${esc(c.icono)} ${esc(c.nombre)}</button>`).join('')}
      </div>
      <div class="chips chips--tags" aria-label="Filtros">
        ${ETIQUETAS.map(([id, n]) => `<button class="tag${etiquetaFiltro === id ? ' activa' : ''}" data-tag="${id}" aria-pressed="${etiquetaFiltro === id}">${n}</button>`).join('')}
      </div>
    </div>
    ${agotados && filtro === 'todos' && !q && !etiquetaFiltro ? `<p class="aviso-agotados">Hoy ${agotados === 1 ? 'hay 1 producto agotado' : `hay ${agotados} productos agotados`}: los marcamos para que no te lleves sorpresas.</p>` : ''}
    ${grupos.length ? grupos.map((g) => `
      <section class="seccion">
        <div class="seccion-cab"><h2>${esc(g.nombre)}</h2><span>${g.items.length}</span></div>
        <div class="grilla">${g.items.map(tarjeta).join('')}</div>
      </section>`).join('') : '<p class="vacio">No encontramos productos con ese filtro. ¿Buscas algo especial? <button class="enlace" data-accion="consultar">Pregúntanos</button></p>'}
    <div class="ayuda-pie">
      <b>¿Tienes una duda o quieres un cambio?</b>
      <p>Te respondemos ${PIDE ? 'aquí mismo, desde la barra' : 'por WhatsApp'}. Si algo no se puede, te explicamos por qué y te damos una alternativa.</p>
      <button class="boton-linea" data-accion="consultar">💬 Hacer una consulta</button>
    </div>
    <p class="pie">${esc(local.direccion)} · ${esc(local.horario)}<br>Carta digital por <a href="https://spacehost.cl" target="_blank" rel="noopener">Spacehost</a></p>
    ${PIDE && (misPedidos.length || misConsultas.length) ? `<button class="boton-seguimiento" data-accion="seguimiento">🧾 Mis pedidos${sinLeer ? `<span class="punto">${sinLeer}</span>` : ''}</button>` : ''}
    ${PIDE ? `<div class="barra-carro${cuenta ? ' ver' : ''}"><span><span class="cuenta">${cuenta}</span>${clp(subtotal())}</span><button class="ir" data-accion="carro">Ver pedido</button></div>` : ''}
  `;
  pintarAbierto();
}

function pintarAbierto() {
  const el = document.getElementById('abierto');
  if (!el) return;
  const ahora = new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false });
  const abierto = ahora >= '12:30' && ahora < '23:30';
  el.className = `abierto${abierto ? ' si' : ''}`;
  el.textContent = abierto ? 'Abierto' : 'Cerrado';
}

// ---------- Hojas ----------
function abrirHoja(html) {
  let d = document.getElementById('hoja');
  if (!d) { d = document.createElement('dialog'); d.id = 'hoja'; d.className = 'hoja'; document.body.append(d); }
  d.innerHTML = html;
  if (!d.open) d.showModal();
  d.onclick = null; d.oninput = null; d.onchange = null; d.onsubmit = null;
  return d;
}
const cerrarSi = (e, d) => { if (e.target === d || e.target.closest('[data-cerrar]')) { d.close(); return true; } return false; };
const CAB = (titulo) => `<div class="hoja-cab"><h2>${titulo}</h2><button class="cerrar" data-cerrar aria-label="Cerrar">×</button></div>`;

// ---------- Detalle de producto con opciones ----------
function detalle(id) {
  const p = productos.find((x) => x.id === id);
  if (!p) return;
  let cant = 1;
  // Selección: por grupo, el índice elegido (único) o un Set (múltiple). Los únicos parten en la primera opción.
  const sel = (p.opciones || []).map((g) => (g.multi ? new Set() : 0));
  const extra = () => (p.opciones || []).reduce((s, g, i) => s + (g.multi ? [...sel[i]].reduce((a, k) => a + g.items[k].p, 0) : g.items[sel[i]].p), 0);
  const mods = () => (p.opciones || []).flatMap((g, i) => (g.multi ? [...sel[i]].map((k) => g.items[k].n) : (g.items.length > 1 ? [g.items[sel[i]].n] : [])));
  const unitario = () => p.precio + extra();
  const ag = agotado(p);

  const pintar = () => {
    const d = abrirHoja(`
      <button class="cerrar cerrar--flotante" data-cerrar aria-label="Cerrar">×</button>
      <div class="hoja-cuerpo">
        <div class="detalle-foto">${fotoDe(p, 900)}</div>
        <div class="detalle-cuerpo">
          ${p.etiqueta ? `<span class="etiqueta">${esc(p.etiqueta)}</span>` : ''}
          <h2>${esc(p.nombre)}</h2>
          <p>${esc(p.desc)}</p>
          ${p.detalle ? `<p style="margin-top:8px">${esc(p.detalle)}</p>` : ''}
        </div>
        ${ag ? `<div class="explica explica--agotado"><b>Agotado hoy</b><span>${esc(p.motivoAgotado || 'No está disponible en este momento.')}</span></div>` : ''}
        ${!ag && p.cambios === false ? `<div class="explica"><b>Este producto no admite cambios</b><span>${esc(p.motivoCambios || '')}</span></div>` : ''}
        ${!ag && p.cambios !== false ? (p.opciones || []).map((g, i) => `
          <fieldset class="grupo">
            <legend>${esc(g.grupo)}<small>${g.multi ? 'Elige las que quieras' : 'Elige una'}</small></legend>
            ${g.items.map((o, k) => {
              const on = g.multi ? sel[i].has(k) : sel[i] === k;
              return `<button type="button" class="opcion${on ? ' on' : ''}" data-op="${i}:${k}" aria-pressed="${on}"><span class="marca-op ${g.multi ? 'cuadro' : 'radio'}"></span><span>${esc(o.n)}</span><b>${o.p ? (o.p > 0 ? '+' : '') + clp(o.p) : ''}</b></button>`;
            }).join('')}
          </fieldset>`).join('') : ''}
        ${!ag && p.cambios !== false ? `<button class="enlace enlace--consulta" data-consulta>¿Quieres otro cambio? ${PIDE ? 'Pregúntale a la barra' : 'Pregúntanos por WhatsApp'} →</button>` : ''}
        ${PIDE && !ag ? `
          <div class="fila-total"><span class="precio" style="font-size:22px">${clp(unitario())}</span>
            <span class="cantidad"><button data-cant="-1" aria-label="Quitar uno">−</button><span>${cant}</span><button data-cant="1" aria-label="Agregar uno">+</button></span>
          </div>
          <button class="boton-primario" data-agregar>Agregar · ${clp(unitario() * cant)}</button>`
        : `<div class="fila-total"><span class="precio" style="font-size:22px">${clp(unitario())}</span></div>
           <button class="boton-primario boton-primario--linea" data-cerrar>Volver a la carta</button>`}
      </div>`);
    d.onclick = (e) => {
      if (cerrarSi(e, d)) return;
      const op = e.target.closest('[data-op]');
      if (op) {
        const [i, k] = op.dataset.op.split(':').map(Number);
        if (p.opciones[i].multi) { sel[i].has(k) ? sel[i].delete(k) : sel[i].add(k); } else sel[i] = k;
        const y = d.scrollTop; pintar(); d.scrollTop = y; return;
      }
      const c = e.target.closest('[data-cant]');
      if (c) { cant = Math.max(1, cant + Number(c.dataset.cant)); const y = d.scrollTop; pintar(); d.scrollTop = y; return; }
      if (e.target.closest('[data-agregar]')) { sumar(p, cant, mods(), unitario()); d.close(); return; }
      if (e.target.closest('[data-consulta]')) consultar(p.id);
    };
  };
  pintar();
}

// ---------- Carrito ----------
const subtotal = () => carro.reduce((s, c) => s + c.precio * c.cant, 0);
const montoPropina = () => (propina.modo === 'sin' ? 0 : propina.modo === 'otro' ? Math.max(0, propina.valor) : Math.round(subtotal() * 0.1));
function guardarCarro() { setPref(`carro:${MESA}`, JSON.stringify(carro)); }

function sumar(p, cant = 1, mods = [], precio = p.precio) {
  const key = `${p.id}|${mods.join('|')}`;
  const c = carro.find((x) => x.key === key);
  if (c) c.cant += cant; else carro.push({ key, id: p.id, nombre: p.nombre, precio, cant, mods });
  guardarCarro(); render(); avisar(`${cant} × ${p.nombre} agregado`);
}

function sumarRapido(id) {
  const p = productos.find((x) => x.id === id);
  // Si tiene opciones de elección única (envoltura, relleno…), mejor que el cliente las vea.
  if (p.opciones?.some((g) => !g.multi && g.items.length > 1)) return detalle(id);
  sumar(p);
}

function hojaCarro() {
  const cliente = pref('cliente', '');
  const d = abrirHoja(`
    ${CAB(`Tu pedido · mesa ${MESA}`)}
    <div class="hoja-cuerpo">
      <div>${carro.map((c, i) => `
        <div class="linea"><div><b>${esc(c.nombre)}</b>${c.mods?.length ? `<br><small class="mods">${c.mods.map(esc).join(' · ')}</small>` : ''}<br><small>${clp(c.precio)} c/u</small></div>
          <span class="cantidad"><button data-item="${i}" data-cant="-1" aria-label="Quitar uno">−</button><span>${c.cant}</span><button data-item="${i}" data-cant="1" aria-label="Agregar uno">+</button></span></div>`).join('')}</div>
      <label class="campo">Tu nombre<input id="cliente" value="${esc(cliente)}" autocomplete="given-name" placeholder="Para que sepamos de quién es" required></label>
      <label class="campo">Nota para la barra<textarea id="nota" rows="2" placeholder="Ej.: traer todo junto, es un cumpleaños">${esc(pref('nota', ''))}</textarea></label>
      <div class="campo">Propina
        <div class="propinas">
          <button data-propina="sugerida" class="${propina.modo === 'sugerida' ? 'activa' : ''}">10% · ${clp(Math.round(subtotal() * 0.1))}</button>
          <button data-propina="otro" class="${propina.modo === 'otro' ? 'activa' : ''}">Otro monto</button>
          <button data-propina="sin" class="${propina.modo === 'sin' ? 'activa' : ''}">Sin propina</button>
        </div>
        ${propina.modo === 'otro' ? `<input id="propina-otro" class="entrada" type="number" inputmode="numeric" min="0" step="500" value="${propina.valor || ''}" placeholder="Monto en pesos">` : ''}
      </div>
      <div class="totales">
        <div class="fila-total"><span>Subtotal</span><span>${clp(subtotal())}</span></div>
        <div class="fila-total"><span>Propina</span><span>${clp(montoPropina())}</span></div>
        <div class="fila-total total"><span>Total</span><span>${clp(subtotal() + montoPropina())}</span></div>
      </div>
      <button class="boton-primario" data-enviar>Enviar pedido</button>
      <p class="nota-envio">El pedido llega a la barra y queda pendiente hasta que lo confirmen.</p>
    </div>`);
  d.onclick = (e) => {
    if (cerrarSi(e, d)) return;
    const it = e.target.closest('[data-item]');
    if (it) {
      carro[Number(it.dataset.item)].cant += Number(it.dataset.cant);
      carro = carro.filter((x) => x.cant > 0);
      guardarCarro(); render();
      if (!carro.length) return d.close();
      return hojaCarro();
    }
    const pr = e.target.closest('[data-propina]');
    if (pr) { propina.modo = pr.dataset.propina; return hojaCarro(); }
    if (e.target.closest('[data-enviar]')) enviar(d);
  };
  d.oninput = (e) => {
    if (e.target.id === 'cliente') setPref('cliente', e.target.value);
    if (e.target.id === 'nota') setPref('nota', e.target.value);
    if (e.target.id === 'propina-otro') {
      propina.valor = Number(e.target.value) || 0;
      d.querySelector('.totales').children[1].lastElementChild.textContent = clp(montoPropina());
      d.querySelector('.totales .total').lastElementChild.textContent = clp(subtotal() + montoPropina());
    }
  };
}

function enviar(d) {
  const cliente = d.querySelector('#cliente').value.trim();
  if (!cliente) { d.querySelector('#cliente').focus(); return avisar('Escribe tu nombre para enviar el pedido'); }
  const pedidos = leer('pedidos');
  const id = Math.max(1040, ...pedidos.map((p) => p.id)) + 1;
  pedidos.push({ id, mesa: MESA, cliente, items: carro.map(({ id: pid, nombre, precio, cant, mods }) => ({ id: pid, nombre, precio, cant, mods })), nota: d.querySelector('#nota').value.trim(), propina: montoPropina(), estado: 'pendiente', hora: new Date().toISOString(), cerrado: false });
  guardar('pedidos', pedidos);
  carro = []; guardarCarro(); setPref('nota', ''); propina = { modo: 'sugerida', valor: 0 };
  render(); seguimiento();
  avisar(`Pedido ${id} enviado`);
}

// ---------- Consultas ----------
// Las consultas son de la mesa (como en la vida real: cualquiera en la mesa ve la respuesta).
function consultasMias() {
  return leer('consultas').filter((c) => c.mesa === MESA);
}

function consultar(productoId = '') {
  const p = productos.find((x) => x.id === productoId);
  const cliente = pref('cliente', '');
  const d = abrirHoja(`
    ${CAB(PIDE ? 'Pregúntale a la barra' : 'Haz tu consulta')}
    <form class="hoja-cuerpo" id="form-consulta">
      <p class="intro">${PIDE ? `Escribe lo que necesitas. La barra te responde aquí mismo, normalmente en menos de 5 minutos. Si no se puede, te explicamos por qué y te proponemos algo.` : 'Te respondemos por WhatsApp. Si algo no se puede, te explicamos por qué y te damos una alternativa.'}</p>
      <label class="campo">Sobre qué producto<select id="c-producto" class="entrada">
        <option value="">Una consulta general</option>
        ${productos.map((x) => `<option value="${esc(x.id)}"${x.id === productoId ? ' selected' : ''}>${esc(x.nombre)}</option>`).join('')}
      </select></label>
      <label class="campo">Tu consulta<textarea id="c-texto" rows="3" required placeholder="${p ? `Ej.: ¿El ${esc(p.nombre)} se puede ${p.cat === 'barra' ? 'con otro licor' : 'sin queso crema'}?` : 'Ej.: ¿Tienen opciones sin gluten?'}"></textarea></label>
      <div class="sugerencias">${['¿Se puede con otro licor?', '¿Tiene algún alérgeno?', '¿Se puede sin arroz?', '¿Cuánto demora?'].map((s) => `<button type="button" class="tag" data-sug="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      ${PIDE ? `<label class="campo">Tu nombre<input id="c-cliente" class="entrada" value="${esc(cliente)}" required autocomplete="given-name"></label>` : ''}
      <button class="boton-primario">${PIDE ? 'Enviar a la barra' : 'Abrir WhatsApp'}</button>
    </form>`);
  d.onclick = (e) => {
    if (cerrarSi(e, d)) return;
    const s = e.target.closest('[data-sug]');
    if (s) { const t = d.querySelector('#c-texto'); t.value = s.dataset.sug; t.focus(); }
  };
  d.onsubmit = (e) => {
    e.preventDefault();
    const texto = d.querySelector('#c-texto').value.trim();
    const prod = d.querySelector('#c-producto').value;
    if (!texto) return;
    if (!PIDE) {
      const nombre = productos.find((x) => x.id === prod)?.nombre;
      window.open(wa(`Hola ${local.nombre}, tengo una consulta${nombre ? ` sobre ${nombre}` : ''}: ${texto}`), '_blank', 'noopener');
      d.close(); return avisar('Abriendo WhatsApp…');
    }
    const nombre = d.querySelector('#c-cliente').value.trim();
    if (!nombre) return d.querySelector('#c-cliente').focus();
    setPref('cliente', nombre);
    const id = uid();
    guardar('consultas', [...leer('consultas'), { id, mesa: MESA, cliente: nombre, producto: prod, texto, estado: 'pendiente', respuesta: '', precio: 0, hora: new Date().toISOString(), agregado: false }]);
    render(); seguimiento();
    avisar('Consulta enviada a la barra');
  };
}

// ---------- Seguimiento: pedidos y consultas de esta mesa ----------
function pedidosMesa() {
  const cliente = pref('cliente', '');
  return leer('pedidos').filter((p) => p.mesa === MESA && !p.cerrado && (!cliente || p.cliente === cliente)).sort((a, b) => b.id - a.id);
}

const ORDEN = ['pendiente', 'confirmado', 'preparacion', 'entregado'];
function seguimiento() {
  const lista = pedidosMesa();
  const consultas = consultasMias().reverse();
  // Al abrir, las respuestas quedan como leídas.
  if (consultas.some((c) => c.estado !== 'pendiente' && !c.leida)) {
    guardar('consultas', leer('consultas').map((c) => (consultas.some((m) => m.id === c.id) && c.estado !== 'pendiente' ? { ...c, leida: true } : c)));
  }
  const d = abrirHoja(`
    ${CAB('Mis pedidos y consultas')}
    <div class="hoja-cuerpo" id="seguimiento">
      ${consultas.map((c) => {
        const r = RESPUESTAS[c.estado];
        const p = productos.find((x) => x.id === c.producto);
        return `<div class="seguimiento consulta consulta--${c.estado}">
          <div class="seguimiento-cab"><b>💬 Tu consulta</b><span class="estado estado--${c.estado === 'no' ? 'cancelado' : c.estado === 'pendiente' ? 'pendiente' : 'entregado'}">${r.icono} ${r.label}</span></div>
          <p class="burbuja yo">${esc(c.texto)}${p ? `<small>Sobre: ${esc(p.nombre)}</small>` : ''}</p>
          ${c.estado === 'pendiente' ? '<p class="escribiendo">La barra está revisando tu consulta…</p>' : `<p class="burbuja barra">${esc(c.respuesta)}${c.precio ? `<small>Precio: ${clp(c.precio)}</small>` : ''}</p>`}
          ${(c.estado === 'si' || c.estado === 'alternativa') && c.precio && !c.agregado ? `<button class="boton-primario" data-agregar-consulta="${esc(c.id)}">Agregar al pedido · ${clp(c.precio)}</button>` : ''}
          ${c.agregado ? '<small class="ok">✓ Agregado a tu pedido</small>' : ''}
        </div>`;
      }).join('')}
      ${lista.map((p) => {
        const e = ESTADOS[p.estado];
        const paso = ORDEN.indexOf(p.estado);
        return `<div class="seguimiento">
          <div class="seguimiento-cab"><b>Pedido ${p.id}</b><span class="estado estado--${p.estado}">${e.icono} ${e.label}</span></div>
          ${p.estado !== 'cancelado' ? `<div class="pasos">${ORDEN.map((_, i) => `<i class="${i <= paso ? 'hecho' : ''}"></i>`).join('')}</div>` : ''}
          <small class="tenue">${e.mensaje}</small>
          <small>${p.items.map((i) => `${i.cant} × ${esc(i.nombre)}${i.mods?.length ? ` (${i.mods.map(esc).join(', ')})` : ''}`).join(' · ')}</small>
          <div class="fila-total"><small class="tenue">Total con propina</small><b>${clp(totalPedido(p) + p.propina)}</b></div>
        </div>`;
      }).join('')}
      ${!lista.length && !consultas.length ? '<p class="vacio">Todavía no envías pedidos ni consultas desde esta mesa.</p>' : ''}
      <p class="nota-envio">Esta pantalla se actualiza sola cuando la barra responde o cambia el estado.</p>
    </div>`);
  d.onclick = (e) => {
    if (cerrarSi(e, d)) return;
    const ac = e.target.closest('[data-agregar-consulta]');
    if (ac) {
      const c = leer('consultas').find((x) => x.id === ac.dataset.agregarConsulta);
      const base = productos.find((x) => x.id === c.producto);
      const key = `consulta|${c.id}`;
      if (!carro.some((x) => x.key === key)) carro.push({ key, id: c.producto || 'especial', nombre: `${base ? base.nombre : 'Pedido especial'} (a tu manera)`, precio: c.precio, cant: 1, mods: ['Acordado con la barra', c.texto] });
      guardarCarro();
      guardar('consultas', leer('consultas').map((x) => (x.id === c.id ? { ...x, agregado: true } : x)));
      render(); d.close(); avisar('Agregado. Revisa tu pedido y envíalo.');
    }
  };
  render();
}

// ---------- Llamar al garzón ----------
function llamarGarzon() {
  const llamadas = leer('llamadas');
  if (llamadas.some((l) => l.mesa === MESA && !l.atendida)) return avisar('Ya avisamos, viene en camino');
  if (!confirm(`¿Llamar al garzón a la mesa ${MESA}?`)) return;
  llamadas.push({ id: uid(), mesa: MESA, hora: new Date().toISOString(), atendida: false });
  guardar('llamadas', llamadas);
  render(); avisar('Listo, avisamos al garzón');
}

// ---------- Reservas (pantalla 1) ----------
function reservasMias() {
  const ids = JSON.parse(pref('reservas', '[]'));
  return leer('reservas').filter((r) => ids.includes(r.id));
}

const HORAS = ['13:00', '14:00', '15:00', '19:00', '20:00', '21:00', '22:00'];
function reservar() {
  const f = { fecha: hoyIso(), hora: '20:00', personas: 2, zona: '', ocasion: '', nombre: pref('r-nombre', ''), telefono: pref('r-telefono', ''), nota: '' };
  const dias = Array.from({ length: 10 }, (_, i) => enDias(i));
  const etiquetaDia = (iso, i) => (i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : new Date(`${iso}T12:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric' }));

  const pintar = () => {
    const libres = Object.fromEntries(Object.keys(ZONAS).map((z) => [z, mesasLibres({ ...f, zona: z }).length]));
    if (f.zona && !libres[f.zona]) f.zona = '';
    const d = abrirHoja(`
      ${CAB('Reserva tu mesa')}
      <form class="hoja-cuerpo" id="form-reserva">
        <div class="detalle-foto foto-reserva"><img src="assets/terraza.jpg" alt="Terraza de BOCABAR con quitasoles"></div>
        <div class="campo">¿Qué día?<div class="carrusel">${dias.map((iso, i) => `<button type="button" class="dia${f.fecha === iso ? ' on' : ''}" data-fecha="${iso}">${etiquetaDia(iso, i)}</button>`).join('')}</div></div>
        <div class="campo">¿A qué hora?<div class="carrusel">${HORAS.map((h) => `<button type="button" class="dia${f.hora === h ? ' on' : ''}" data-hora="${h}">${h}</button>`).join('')}</div></div>
        <div class="campo fila-total">¿Cuántos son?<span class="cantidad"><button type="button" data-personas="-1" aria-label="Menos">−</button><span>${f.personas}</span><button type="button" data-personas="1" aria-label="Más">+</button></span></div>
        <div class="campo">¿Dónde prefieres sentarte?
          <div class="zonas">${Object.entries(ZONAS).map(([id, z]) => {
            const n = libres[id];
            return `<button type="button" class="zona${f.zona === id ? ' on' : ''}" data-zona="${id}"${n ? '' : ' disabled'}>
              <span class="zona-ico">${z.icono}</span><b>${z.nombre}</b><small>${z.texto}</small>
              <em>${n ? (id === 'cualquiera' ? `${n} mesas libres` : `${n} ${n === 1 ? 'mesa libre' : 'mesas libres'}`) : 'Completo a esa hora'}</em></button>`;
          }).join('')}</div>
          ${f.personas >= 7 ? '<small class="tenue">Para grupos de 7 o más, escríbenos y juntamos mesas.</small>' : ''}
        </div>
        <label class="campo">¿Celebran algo? <select id="r-ocasion" class="entrada">${['', 'Cumpleaños', 'Aniversario', 'Cita', 'Reunión de trabajo', 'Despedida'].map((o) => `<option${o === f.ocasion ? ' selected' : ''} value="${o}">${o || 'Nada en especial'}</option>`).join('')}</select></label>
        <label class="campo">Nombre<input id="r-nombre" class="entrada" value="${esc(f.nombre)}" required autocomplete="name"></label>
        <label class="campo">WhatsApp<input id="r-telefono" class="entrada" value="${esc(f.telefono)}" required inputmode="tel" autocomplete="tel" placeholder="+56 9 …"></label>
        <label class="campo">¿Algo que debamos saber?<textarea id="r-nota" rows="2" placeholder="Ej.: lejos de la TV, silla para bebé, alergias">${esc(f.nota)}</textarea></label>
        <button class="boton-primario"${f.zona ? '' : ' disabled'}>${f.zona ? `Solicitar mesa · ${ZONAS[f.zona].nombre}` : 'Elige dónde sentarte'}</button>
        <p class="nota-envio">Te confirmamos la mesa por WhatsApp. Ves el estado en «Mis reservas».</p>
      </form>`);
    d.onclick = (e) => {
      if (cerrarSi(e, d)) return;
      const t = e.target.closest('[data-fecha],[data-hora],[data-personas],[data-zona]');
      if (!t) return;
      if (t.dataset.fecha) f.fecha = t.dataset.fecha;
      if (t.dataset.hora) f.hora = t.dataset.hora;
      if (t.dataset.personas) f.personas = Math.min(10, Math.max(1, f.personas + Number(t.dataset.personas)));
      if (t.dataset.zona) f.zona = t.dataset.zona;
      const y = d.scrollTop; pintar(); document.getElementById('hoja').scrollTop = y;
    };
    d.oninput = (e) => {
      const k = { 'r-nombre': 'nombre', 'r-telefono': 'telefono', 'r-nota': 'nota', 'r-ocasion': 'ocasion' }[e.target.id];
      if (k) f[k] = e.target.value;
    };
    d.onchange = d.oninput;
    d.onsubmit = (e) => {
      e.preventDefault();
      if (!f.zona) return;
      if (!f.nombre.trim() || !f.telefono.trim()) return avisar('Completa tu nombre y WhatsApp');
      setPref('r-nombre', f.nombre); setPref('r-telefono', f.telefono);
      const r = { id: uid(), nombre: f.nombre.trim(), telefono: f.telefono.trim(), fecha: f.fecha, hora: f.hora, personas: f.personas, zona: f.zona, ocasion: f.ocasion, nota: f.nota.trim(), estado: 'pendiente', mesa: null, creada: new Date().toISOString() };
      guardar('reservas', [...leer('reservas'), r]);
      setPref('reservas', JSON.stringify([...JSON.parse(pref('reservas', '[]')), r.id]));
      render(); reservaEnviada(r);
    };
  };
  pintar();
}

const fechaLarga = (iso) => new Date(`${iso}T12:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

function reservaEnviada(r) {
  const texto = `Hola ${local.nombre}, soy ${r.nombre}. Pedí una mesa para ${r.personas} el ${fechaLarga(r.fecha)} a las ${r.hora}, en ${ZONAS[r.zona].nombre.toLowerCase()}${r.ocasion ? ` (${r.ocasion.toLowerCase()})` : ''}.${r.nota ? ` Nota: ${r.nota}` : ''}`;
  const d = abrirHoja(`
    ${CAB('Solicitud enviada')}
    <div class="hoja-cuerpo">
      <div class="listo"><span>✓</span><h3>¡Te esperamos, ${esc(r.nombre.split(' ')[0])}!</h3>
        <p>${r.personas} ${r.personas === 1 ? 'persona' : 'personas'} · ${fechaLarga(r.fecha)} · ${r.hora}<br>${ZONAS[r.zona].icono} ${ZONAS[r.zona].nombre}</p></div>
      <p class="intro">La reserva ya está en el panel de BOCABAR. Cuando te asignen la mesa, lo verás en «Mis reservas» y te llegará la confirmación por WhatsApp.</p>
      <a class="boton-primario" href="${wa(texto)}" target="_blank" rel="noopener">Escribir también por WhatsApp</a>
      <button class="boton-primario boton-primario--linea" data-mis>Ver mis reservas</button>
    </div>`);
  d.onclick = (e) => { if (cerrarSi(e, d)) return; if (e.target.closest('[data-mis]')) misReservas(); };
}

function misReservas() {
  const lista = reservasMias().reverse();
  const mesas = leer('mesas');
  const d = abrirHoja(`
    ${CAB('Mis reservas')}
    <div class="hoja-cuerpo" id="mis-reservas">
      ${lista.length ? lista.map((r) => {
        const e = ESTADOS_RESERVA[r.estado];
        const m = mesas.find((x) => x.n === r.mesa);
        return `<div class="seguimiento">
          <div class="seguimiento-cab"><b>${fechaLarga(r.fecha)} · ${r.hora}</b><span class="estado estado--${r.estado === 'confirmada' ? 'entregado' : r.estado === 'rechazada' ? 'cancelado' : 'pendiente'}">${e.icono} ${e.label}</span></div>
          <small>${r.personas} ${r.personas === 1 ? 'persona' : 'personas'} · Pediste ${ZONAS[r.zona].nombre.toLowerCase()}</small>
          ${r.estado === 'confirmada' && m ? `<p class="burbuja barra">Tu mesa: <b>mesa ${m.n}, ${ZONAS[m.zona].nombre.toLowerCase()}</b>${m.nota && !m.molesta ? ` · ${esc(m.nota.toLowerCase())}` : ''}.${r.respuesta ? ` ${esc(r.respuesta)}` : ''}</p>` : ''}
          ${r.estado === 'rechazada' ? `<p class="burbuja barra">${esc(r.respuesta || 'No nos quedan mesas a esa hora.')}</p>` : ''}
          ${r.estado === 'pendiente' ? '<small class="tenue">BOCABAR está revisando la mejor mesa para ustedes.</small>' : ''}
        </div>`;
      }).join('') : '<p class="vacio">Aún no tienes reservas.</p>'}
      <button class="boton-primario boton-primario--linea" data-otra>Hacer otra reserva</button>
    </div>`);
  d.onclick = (e) => { if (cerrarSi(e, d)) return; if (e.target.closest('[data-otra]')) reservar(); };
}

// ---------- Información del local ----------
function info() {
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(local.direccion)}`;
  const d = abrirHoja(`
    ${CAB(esc(local.nombre))}
    <div class="hoja-cuerpo"><div class="info-lista">
      <div><span>📍</span><p><small>Dirección</small>${esc(local.direccion)}<br><a href="${maps}" target="_blank" rel="noopener">Abrir en Google Maps ↗</a></p></div>
      <div><span>🕐</span><p><small>Horario</small>${esc(local.horario)}</p></div>
      ${local.telefono ? `<div><span>☎</span><p><small>Teléfono</small><a href="tel:${esc(local.telefono.replace(/\s/g, ''))}">${esc(local.telefono)}</a></p></div>` : ''}
      ${local.whatsapp ? `<div><span>💬</span><p><small>WhatsApp</small><a href="https://wa.me/${esc(local.whatsapp)}" target="_blank" rel="noopener">Escríbenos</a></p></div>` : ''}
    </div></div>`);
  d.onclick = (e) => cerrarSi(e, d);
}

// ---------- Eventos ----------
app.addEventListener('click', (e) => {
  const sumarB = e.target.closest('[data-sumar]');
  if (sumarB) { e.stopPropagation(); return sumarRapido(sumarB.dataset.sumar); }
  const f = e.target.closest('[data-filtro]');
  if (f) { filtro = f.dataset.filtro; return render(); }
  const tg = e.target.closest('[data-tag]');
  if (tg) { etiquetaFiltro = etiquetaFiltro === tg.dataset.tag ? '' : tg.dataset.tag; return render(); }
  const a = e.target.closest('[data-accion]')?.dataset.accion;
  if (a === 'info') return info();
  if (a === 'tema') { setPref('tema', document.documentElement.dataset.tema === 'claro' ? 'noche' : 'claro'); cargar(); return render(); }
  if (a === 'carro') return hojaCarro();
  if (a === 'mesero') return llamarGarzon();
  if (a === 'seguimiento') return seguimiento();
  if (a === 'consultar') return consultar();
  if (a === 'reservar') return reservar();
  if (a === 'mis-reservas') return misReservas();
  const det = e.target.closest('[data-detalle]');
  if (det) detalle(det.dataset.detalle);
});
app.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.matches('[data-detalle]')) detalle(e.target.dataset.detalle); });
app.addEventListener('input', (e) => {
  if (e.target.id !== 'buscar') return;
  busqueda = e.target.value;
  const pos = e.target.selectionStart;
  render();
  const b = document.getElementById('buscar'); b.focus(); b.setSelectionRange(pos, pos);
});

// Cambios hechos en el administrador (otra pantalla) se ven al tiro.
let respondidas = new Set(consultasMias().filter((c) => c.estado !== 'pendiente').map((c) => c.id));
let confirmadas = new Set(reservasMias().filter((r) => r.estado !== 'pendiente').map((r) => r.id));
alCambiar((clave) => {
  cargar();
  carro = carro.filter((c) => c.key?.startsWith('consulta|') || productos.some((p) => p.id === c.id && !agotado(p)));
  const hoja = document.getElementById('hoja');
  if (PIDE && clave === 'consultas') {
    const nuevas = consultasMias().filter((c) => c.estado !== 'pendiente' && !respondidas.has(c.id));
    if (nuevas.length) avisar('💬 La barra respondió tu consulta');
    respondidas = new Set(consultasMias().filter((c) => c.estado !== 'pendiente').map((c) => c.id));
  }
  if (!PIDE && clave === 'reservas') {
    const nuevas = reservasMias().filter((r) => r.estado !== 'pendiente' && !confirmadas.has(r.id));
    if (nuevas.length) avisar(nuevas[0].estado === 'confirmada' ? '📅 ¡Tu reserva está confirmada!' : '📅 BOCABAR respondió tu reserva');
    confirmadas = new Set(reservasMias().filter((r) => r.estado !== 'pendiente').map((r) => r.id));
    if (hoja?.open && hoja.querySelector('#mis-reservas')) misReservas();
  }
  if (PIDE && (clave === 'pedidos' || clave === 'consultas') && hoja?.open && hoja.querySelector('#seguimiento')) seguimiento();
  render();
});
setInterval(pintarAbierto, 60000);

cargar();
render();
