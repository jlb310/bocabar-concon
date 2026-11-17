// Pantalla 4: administrador de pedidos (pedidos por mesa, consultas, reservas, mesas por zona y garzones).
import { leer, guardar, alCambiar, clp, esc, uid, ESTADOS, RESPUESTAS, ESTADOS_RESERVA, ZONAS, totalPedido, irA, mesasLibres, hoyIso, enDias, PREF } from './store.js';
import { crearAdmin, modal, qrSvg, urlDe, toast } from './admin-base.js';

let filtroEstado = 'todos';
let filtroDia = 'hoy';
const colapsadas = new Set();
const borradores = {}; // respuesta en curso por consulta: { tipo, texto, precio }
const hora = (iso) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' });
const hace = (iso) => { const m = Math.round((Date.now() - new Date(iso)) / 60000); return m < 1 ? 'recién' : m < 60 ? `hace ${m} min` : `hace ${Math.floor(m / 60)} h`; };
const garzonDe = (mesa) => { const g = leer('mesas').find((m) => m.n === mesa)?.garzon; return leer('garzones').find((x) => x.id === g); };
const fechaCorta = (iso) => (iso === hoyIso() ? 'Hoy' : iso === enDias(1) ? 'Mañana' : new Date(`${iso}T12:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }));
const nombreProd = (id) => leer('productos').find((p) => p.id === id)?.nombre || '';

const admin = crearAdmin({
  plan: 'Plan pedidos',
  verCarta: 'pedidos',
  pestanas: [
    { id: 'pedidos', nombre: 'Pedidos', icono: '🛎' },
    { id: 'consultas', nombre: 'Consultas', icono: '💬' },
    { id: 'reservas', nombre: 'Reservas', icono: '📅' },
    { id: 'mesas', nombre: 'Mesas y QR', icono: '▦' },
    { id: 'garzones', nombre: 'Garzones', icono: '♟' },
  ],
  badges: () => ({
    pedidos: leer('pedidos').filter((p) => !p.cerrado && p.estado === 'pendiente').length + leer('llamadas').filter((l) => !l.atendida).length,
    consultas: leer('consultas').filter((c) => c.estado === 'pendiente').length,
    reservas: leer('reservas').filter((r) => r.estado === 'pendiente').length,
  }),
  pintar(id, el) { VISTAS[id](el); },
});

const VISTAS = {
  pedidos(el) {
    const abiertos = leer('pedidos').filter((p) => !p.cerrado);
    const llamadas = leer('llamadas').filter((l) => !l.atendida);
    const consultas = leer('consultas').filter((c) => c.estado === 'pendiente');
    const cuenta = (e) => abiertos.filter((p) => e === 'todos' || p.estado === e).length;
    const visibles = abiertos.filter((p) => filtroEstado === 'todos' || p.estado === filtroEstado);
    const mesas = [...new Set(visibles.map((p) => p.mesa))].sort((a, b) => a - b);

    el.innerHTML = `
      <div class="cab"><div><h1>Pedidos del local</h1><p>Agrupados por mesa y por persona, con los cambios que pidió cada uno.</p></div>
        <button class="boton boton--linea" data-probar>Hacer un pedido de prueba ↗</button></div>
      ${consultas.length ? `<button class="panel" data-tab-ir="consultas" style="text-align:left;border-color:#f3d48e;background:#fff8e8;display:flex;gap:12px;align-items:center;width:100%">
        <span style="font-size:24px">💬</span><span style="flex:1"><b>${consultas.length} ${consultas.length === 1 ? 'consulta espera' : 'consultas esperan'} respuesta</b><br><small style="color:var(--tenue)">${esc(consultas[0].texto)} · Mesa ${consultas[0].mesa}</small></span><b>Responder →</b></button>` : ''}
      ${llamadas.length ? `<div class="panel" style="border-color:#f0c2b9;background:#fff6f4">
        <h2>🔔 Llamadas al garzón</h2>
        <div class="lista" style="margin-top:6px">${llamadas.map((l) => `
          <div class="fila" style="grid-template-columns:1fr auto"><div><b>Mesa ${l.mesa}</b><small>${hace(l.hora)} · Atiende ${esc(garzonDe(l.mesa)?.nombre || 'sin asignar')}</small></div>
          <button class="boton boton--chico" data-atender="${esc(l.id)}">Atendida</button></div>`).join('')}</div>
      </div>` : ''}
      <div class="filtros">
        ${['todos', ...Object.keys(ESTADOS)].map((e) => `<button class="boton boton--chico ${filtroEstado === e ? '' : 'boton--linea'}" data-filtro="${e}">${e === 'todos' ? 'Todos' : `${ESTADOS[e].icono} ${ESTADOS[e].label}`} · ${cuenta(e)}</button>`).join('')}
      </div>
      <div style="display:grid;gap:14px">
        ${mesas.length ? mesas.map((n) => mesaHtml(n, visibles.filter((p) => p.mesa === n), abiertos.filter((p) => p.mesa === n))).join('') : '<div class="panel vacio">No hay pedidos con este filtro. Abre la pantalla 3 y haz uno.</div>'}
      </div>`;
  },

  consultas(el) {
    const todas = leer('consultas');
    const pendientes = todas.filter((c) => c.estado === 'pendiente').sort((a, b) => new Date(a.hora) - new Date(b.hora));
    const respondidas = todas.filter((c) => c.estado !== 'pendiente').sort((a, b) => new Date(b.hora) - new Date(a.hora));
    el.innerHTML = `
      <div class="cab"><div><h1>Consultas de las mesas</h1><p>Cuando un cliente pide un cambio o tiene una duda, llega aquí. Nunca un «no» seco: si no se puede, explica el motivo y ofrece una alternativa.</p></div>
        <button class="boton boton--linea" data-probar>Hacer una consulta de prueba ↗</button></div>
      ${pendientes.length ? pendientes.map(consultaPendiente).join('') : '<div class="panel vacio">No hay consultas por responder. 🙌</div>'}
      ${respondidas.length ? `<h2 style="margin-top:8px">Respondidas</h2>${respondidas.map(consultaRespondida).join('')}` : ''}`;
  },

  reservas(el) {
    const todas = leer('reservas').filter((r) => filtroDia === 'todas' || (filtroDia === 'hoy' ? r.fecha === hoyIso() : r.fecha === enDias(1)));
    const orden = (a, b) => (a.estado === 'pendiente' ? -1 : 0) - (b.estado === 'pendiente' ? -1 : 0) || a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora);
    const hoy = leer('reservas').filter((r) => r.fecha === hoyIso() && r.estado === 'confirmada');
    el.innerHTML = `
      <div class="cab"><div><h1>Reservas</h1><p>El cliente elige terraza, salón o barra al reservar. Tú asignas la mesa sabiendo qué pidió y cuáles mesas conviene evitar.</p></div>
        <button class="boton boton--linea" data-probar-reserva>Hacer una reserva de prueba ↗</button></div>
      <div class="numeros">
        <div class="numero"><b>${leer('reservas').filter((r) => r.estado === 'pendiente').length}</b><span>Por confirmar</span></div>
        <div class="numero"><b>${hoy.length}</b><span>Confirmadas hoy</span></div>
        <div class="numero"><b>${hoy.reduce((s, r) => s + r.personas, 0)}</b><span>Personas esperadas hoy</span></div>
      </div>
      <div class="filtros">${[['hoy', 'Hoy'], ['manana', 'Mañana'], ['todas', 'Todas']].map(([id, n]) => `<button class="boton boton--chico ${filtroDia === id ? '' : 'boton--linea'}" data-dia="${id}">${n}</button>`).join('')}</div>
      ${todas.length ? todas.sort(orden).map(reservaHtml).join('') : '<div class="panel vacio">No hay reservas para este día.</div>'}`;
  },

  mesas(el) {
    const mesas = leer('mesas');
    const garzones = leer('garzones');
    el.innerHTML = `
      <div class="cab"><div><h1>Mesas, zonas y QR</h1><p>Cada mesa tiene su QR, su zona y su capacidad. Anota lo que conviene saber antes de sentar a alguien (cocina, TV, escala): el sistema lo avisa al asignar reservas.</p></div>
        <div class="filtros"><button class="boton" data-agregar-mesa>+ Agregar mesa</button></div></div>
      ${Object.entries(ZONAS).filter(([z]) => z !== 'cualquiera').map(([z, info]) => `
        <h2>${info.icono} ${info.nombre} <small style="color:var(--tenue);font-weight:500">· ${mesas.filter((m) => m.zona === z).length} mesas</small></h2>
        <div class="qr-grilla">
          ${mesas.filter((m) => m.zona === z).map((m) => `
            <div class="qr-tarjeta">
              <h3>Mesa ${m.n}</h3>
              <small style="color:var(--tenue)">${m.cap} personas${m.nota ? ` · <span class="${m.molesta ? 'alerta-mesa' : ''}">${m.molesta ? '⚠ ' : ''}${esc(m.nota)}</span>` : ''}</small>
              <div class="qr">${qrSvg(urlDe(`pedidos.html?mesa=${m.n}`))}</div>
              <select data-garzon-mesa="${m.n}" aria-label="Garzón de la mesa ${m.n}">
                <option value="">Sin garzón</option>
                ${garzones.filter((g) => g.activo || g.id === m.garzon).map((g) => `<option value="${esc(g.id)}"${g.id === m.garzon ? ' selected' : ''}>${esc(g.nombre)}</option>`).join('')}
              </select>
              <div class="acciones"><button class="boton boton--chico boton--linea" data-editar-mesa="${m.n}">Editar</button><button class="boton boton--chico" data-abrir-mesa="${m.n}">Probar</button></div>
            </div>`).join('')}
        </div>`).join('')}`;
  },

  garzones(el) {
    const garzones = leer('garzones');
    const mesas = leer('mesas');
    el.innerHTML = `
      <div class="cab"><div><h1>Garzones</h1><p>El equipo que atiende las mesas. Cada mesa tiene un garzón a cargo y los avisos le llegan a él.</p></div>
        <button class="boton" data-nuevo-garzon>+ Nuevo garzón</button></div>
      <div class="panel"><div class="lista">
        ${garzones.map((g) => {
          const suyas = mesas.filter((m) => m.garzon === g.id).map((m) => m.n);
          return `<div class="fila">
            <div class="mini">🧑‍🍳</div>
            <div><b>${esc(g.nombre)}${g.activo ? '' : '<span class="oculto-tag">Inactivo</span>'}</b><small>${suyas.length ? `Mesas ${suyas.join(', ')}` : 'Sin mesas asignadas'}</small></div>
            <div class="fila-acciones">
              <label class="switch" title="${g.activo ? 'Activo' : 'Inactivo'}"><input type="checkbox" data-activo="${esc(g.id)}"${g.activo ? ' checked' : ''} aria-label="Garzón activo"><span></span></label>
              <button class="icono-b" data-editar-garzon="${esc(g.id)}" aria-label="Editar ${esc(g.nombre)}">✎</button>
            </div></div>`;
        }).join('')}
      </div></div>`;
  },
};

// ---------- Pedidos ----------
function mesaHtml(n, visibles, todos) {
  const g = garzonDe(n);
  const m = leer('mesas').find((x) => x.n === n);
  const total = todos.reduce((s, p) => s + totalPedido(p) + p.propina, 0);
  const pendientes = todos.filter((p) => p.estado === 'pendiente').length;
  const personas = [...new Set(visibles.map((p) => p.cliente))];
  const cerrada = colapsadas.has(n);
  return `
    <section class="panel" style="padding:0;overflow:hidden">
      <header style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;background:var(--marca);color:#fff;cursor:pointer" data-colapsar="${n}">
        <div style="flex:1;min-width:160px"><small style="color:var(--acento);font-weight:800;letter-spacing:.1em;font-size:11px">${m ? ZONAS[m.zona].nombre.toUpperCase() : 'MESA'}</small>
          <h2 style="font:800 22px/1 'Montserrat',sans-serif">Mesa ${n}</h2>
          <small style="color:#c9d3cc">${todos.length} ${todos.length === 1 ? 'pedido' : 'pedidos'} · ${[...new Set(todos.map((p) => p.cliente))].length} personas · Atiende ${esc(g?.nombre || 'sin asignar')}</small></div>
        ${pendientes ? `<span style="background:var(--acento);color:var(--sobre-acento);font-weight:800;font-size:12px;padding:5px 9px;border-radius:999px">⏳ ${pendientes} pendiente${pendientes > 1 ? 's' : ''}</span>` : ''}
        <b style="font-size:20px">${clp(total)}</b>
        <button class="boton boton--chico" style="background:#f4efe6;color:var(--marca)" data-cerrar-mesa="${n}">🔒 Cerrar mesa</button>
        <span aria-hidden="true">${cerrada ? '▸' : '▾'}</span>
      </header>
      ${cerrada ? '' : `<div style="padding:12px 16px 16px;display:grid;gap:14px">${personas.map((c) => personaHtml(c, visibles.filter((p) => p.cliente === c))).join('')}</div>`}
    </section>`;
}

function personaHtml(cliente, pedidos) {
  const total = pedidos.reduce((s, p) => s + totalPedido(p) + p.propina, 0);
  return `
    <div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:8px"><b style="font-size:16px">👤 ${esc(cliente)}</b><small style="color:var(--tenue)">Total con propina <b style="color:var(--texto)">${clp(total)}</b></small></div>
      <div style="display:grid;gap:10px">${pedidos.sort((a, b) => b.id - a.id).map(pedidoHtml).join('')}</div>
    </div>`;
}

function pedidoHtml(p) {
  const sub = totalPedido(p);
  const color = { pendiente: '#d9900f', confirmado: '#6a8f2f', preparacion: '#2f6f8c', entregado: '#2f8a57', cancelado: '#c2412d' }[p.estado];
  return `
    <article style="border:1px solid var(--linea);border-left:4px solid ${color};border-radius:12px;padding:12px 14px;display:grid;gap:8px;background:var(--panel2)">
      <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>Pedido ${p.id}</b><small style="color:var(--tenue)">${hora(p.hora)} · ${hace(p.hora)}</small></div>
      <div style="display:grid;gap:4px">${p.items.map((i) => `<div style="display:flex;justify-content:space-between;gap:8px"><span>${i.cant} × ${esc(i.nombre)}${i.mods?.length ? `<span class="mods">↳ ${i.mods.map(esc).join(' · ')}</span>` : ''}</span><span>${clp(i.precio * i.cant)}</span></div>`).join('')}</div>
      ${p.nota ? `<div style="background:#fff7de;border-radius:9px;padding:8px 10px;font-size:13.5px">✎ <b>Nota:</b> ${esc(p.nota)}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">
        <small style="color:var(--tenue)">Subtotal ${clp(sub)} · Propina ${clp(p.propina)} · <b style="color:var(--texto)">Total ${clp(sub + p.propina)}</b></small>
        <select data-estado="${p.id}" aria-label="Estado del pedido ${p.id}" style="min-height:38px;border-radius:9px;border:1px solid var(--linea);padding:0 10px;font-weight:700;background:var(--panel)">
          ${Object.entries(ESTADOS).map(([k, e]) => `<option value="${k}"${k === p.estado ? ' selected' : ''}>${e.icono} ${e.label}</option>`).join('')}
        </select>
      </div>
    </article>`;
}

// ---------- Consultas ----------
const RAPIDAS = {
  si: ['Sí, sin problema. Te lo preparamos así.', 'Sí, con un recargo por el cambio de ingrediente.'],
  alternativa: ['No lo tenemos así, pero te recomendamos', 'Hoy no hay ese ingrediente; podemos hacerlo con'],
  no: ['No podemos porque es una promoción cerrada.', 'No podemos: el ingrediente viene incorporado en la preparación.', 'Hoy no nos queda ese producto.'],
};

function consultaPendiente(c) {
  const b = borradores[c.id] || (borradores[c.id] = { tipo: 'si', texto: '', precio: leer('productos').find((p) => p.id === c.producto)?.precio || '' });
  const prod = nombreProd(c.producto);
  return `
    <article class="tarjeta tarjeta--pendiente" data-consulta="${esc(c.id)}">
      <div class="tarjeta-cab"><div><b>Mesa ${c.mesa} · ${esc(c.cliente)}</b><small>${hace(c.hora)}${prod ? ` · Sobre ${esc(prod)}` : ''} · Atiende ${esc(garzonDe(c.mesa)?.nombre || 'sin asignar')}</small></div><span class="chip-estado chip-estado--pendiente">⏳ Esperando respuesta</span></div>
      <p class="pregunta">${esc(c.texto)}</p>
      <div class="responder">
        <div class="tipo-resp" role="group" aria-label="Tipo de respuesta">
          ${['si', 'alternativa', 'no'].map((t) => `<button type="button" data-tipo="${t}" aria-pressed="${b.tipo === t}">${RESPUESTAS[t].icono} ${t === 'si' ? 'Sí se puede' : t === 'alternativa' ? 'Ofrecer otra opción' : 'No se puede'}</button>`).join('')}
        </div>
        <div class="rapidas">${RAPIDAS[b.tipo].map((r) => `<button type="button" data-rapida="${esc(r)}">${esc(r)}</button>`).join('')}</div>
        <label class="campo">${b.tipo === 'no' ? 'Explica el motivo (obligatorio)' : 'Respuesta para el cliente'}<textarea data-texto rows="2" placeholder="${b.tipo === 'no' ? 'Ej.: es una promoción cerrada y no admite cambios' : 'Ej.: sí, te lo preparamos con Ramazzotti'}">${esc(b.texto)}</textarea></label>
        ${b.tipo !== 'no' ? `<label class="campo" style="max-width:240px">Precio final <small>Si lo dejas, el cliente lo agrega a su pedido con un toque.</small><input data-precio type="number" min="0" step="50" inputmode="numeric" value="${esc(b.precio)}"></label>` : ''}
        <p class="consejo"><b>Tip:</b> ${b.tipo === 'no' ? 'un «no» con motivo y alternativa evita la mala reseña.' : 'el cliente ve la respuesta en su celular al instante.'}</p>
        <div><button class="boton boton--acento" data-responder="${esc(c.id)}">Enviar respuesta a la mesa ${c.mesa}</button></div>
      </div>
    </article>`;
}

function consultaRespondida(c) {
  const r = RESPUESTAS[c.estado];
  return `
    <article class="tarjeta">
      <div class="tarjeta-cab"><div><b>Mesa ${c.mesa} · ${esc(c.cliente)}</b><small>${hace(c.hora)}${nombreProd(c.producto) ? ` · ${esc(nombreProd(c.producto))}` : ''}</small></div>
        <span class="chip-estado chip-estado--${c.estado === 'no' ? 'no' : 'ok'}">${r.icono} ${r.label}</span></div>
      <p class="pregunta" style="font-size:14px">${esc(c.texto)}</p>
      <div class="respuesta"><b>Respuesta</b>${esc(c.respuesta)}${c.precio ? ` · ${clp(c.precio)}` : ''}${c.agregado ? ' · <span style="color:var(--ok);font-weight:700">✓ El cliente lo agregó a su pedido</span>' : ''}</div>
    </article>`;
}

function responder(id) {
  const b = borradores[id];
  const texto = (b.texto || '').trim();
  if (!texto) { toast('✋', 'Falta la respuesta', b.tipo === 'no' ? 'Si no se puede, explica el motivo: es lo que el cliente necesita saber.' : 'Escribe qué le dices al cliente.'); document.querySelector(`[data-consulta="${id}"] [data-texto]`)?.focus(); return; }
  guardar('consultas', leer('consultas').map((c) => (c.id === id ? { ...c, estado: b.tipo, respuesta: texto, precio: b.tipo === 'no' ? 0 : Number(b.precio) || 0, respondida: new Date().toISOString(), leida: false } : c)));
  delete borradores[id];
  admin.refrescar();
  toast('✓', 'Respuesta enviada', 'El cliente ya la ve en su celular.');
}

// ---------- Reservas ----------
const asignando = {}; // mesa elegida por reserva antes de confirmar
function reservaHtml(r) {
  const e = ESTADOS_RESERVA[r.estado];
  const mesas = leer('mesas');
  const m = mesas.find((x) => x.n === r.mesa);
  const libres = r.estado === 'pendiente' ? mesasLibres(r, r.id) : [];
  const libresIds = new Set(libres.map((x) => x.n));
  const sugerida = libres.find((x) => !x.molesta);
  const elegida = asignando[r.id] ?? sugerida?.n;
  const candidatas = mesas.filter((x) => (r.zona === 'cualquiera' || x.zona === r.zona) && x.cap >= r.personas);
  const otras = r.zona === 'cualquiera' ? [] : mesasLibres({ ...r, zona: 'cualquiera' }, r.id).filter((x) => x.zona !== r.zona);
  const chipClase = r.estado === 'pendiente' ? 'pendiente' : r.estado === 'confirmada' ? 'ok' : 'no';
  return `
    <article class="tarjeta${r.estado === 'pendiente' ? ' tarjeta--pendiente' : ''}">
      <div class="tarjeta-cab">
        <div><b style="font-size:16px">${esc(r.nombre)} · ${r.personas} ${r.personas === 1 ? 'persona' : 'personas'}</b>
          <small>${fechaCorta(r.fecha)} · ${r.hora} · ${esc(r.telefono)}${r.ocasion ? ` · 🎉 ${esc(r.ocasion)}` : ''}</small></div>
        <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="zona-tag">Pidió: ${ZONAS[r.zona].icono} ${ZONAS[r.zona].nombre}</span><span class="chip-estado chip-estado--${chipClase}">${e.icono} ${e.label}</span></div>
      </div>
      ${r.nota ? `<div class="respuesta" style="background:var(--panel2);border-color:var(--linea)"><b style="color:var(--tenue)">Nota del cliente</b>${esc(r.nota)}</div>` : ''}
      ${r.estado === 'confirmada' && m ? `<p>Mesa <b>${m.n}</b> · ${ZONAS[m.zona].nombre} · ${m.cap} personas${m.nota ? ` · <span class="${m.molesta ? 'alerta-mesa' : ''}">${esc(m.nota)}</span>` : ''}</p>` : ''}
      ${r.estado === 'rechazada' ? `<p style="color:var(--tenue)">Respuesta: ${esc(r.respuesta || '')}</p>` : ''}
      ${r.estado === 'pendiente' ? `
        <div class="mesas-zona">
          <small style="color:var(--tenue)">Elige la mesa. En verde la sugerida; con borde punteado, las que conviene evitar.</small>
          <div class="mesas-grilla">
            ${candidatas.map((x) => {
              const libre = libresIds.has(x.n);
              const cls = ['mesa-b', libre ? '' : 'ocupada', x.molesta ? 'molesta' : '', x.n === sugerida?.n ? 'sugerida' : ''].join(' ');
              return `<button type="button" class="${cls}" data-mesa-r="${esc(r.id)}:${x.n}" aria-pressed="${elegida === x.n}"${libre ? '' : ' disabled'}><b>Mesa ${x.n}</b><small>${x.cap} pers.${x.nota ? ` · ${x.molesta ? '⚠ ' : ''}${esc(x.nota)}` : ''}</small><small>${libre ? (x.n === sugerida?.n ? '★ Sugerida' : 'Libre') : 'Ocupada a esa hora'}</small></button>`;
            }).join('') || '<small>No hay mesas de ese tamaño en esta zona.</small>'}
          </div>
          ${!libres.length && otras.length ? `<small class="alerta-mesa">No quedan mesas en ${ZONAS[r.zona].nombre.toLowerCase()} a esa hora. Puedes ofrecerle: ${otras.map((x) => `mesa ${x.n} (${ZONAS[x.zona].nombre.toLowerCase()})`).join(', ')}.</small>` : ''}
          ${elegida && mesas.find((x) => x.n === elegida)?.molesta ? `<small class="alerta-mesa">⚠ La mesa ${elegida} está ${esc(mesas.find((x) => x.n === elegida).nota.toLowerCase())}. Si no hay otra, avísale al cliente antes de que llegue.</small>` : ''}
        </div>
        <div class="filtros">
          <button class="boton boton--acento" data-confirmar-r="${esc(r.id)}"${elegida ? '' : ' disabled'}>Confirmar${elegida ? ` mesa ${elegida}` : ''}</button>
          <button class="boton boton--linea" data-rechazar-r="${esc(r.id)}">Sin disponibilidad…</button>
          <a class="boton boton--linea" href="https://wa.me/${esc(r.telefono.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a>
        </div>` : ''}
    </article>`;
}

function confirmarReserva(id) {
  const r = leer('reservas').find((x) => x.id === id);
  const n = asignando[id] ?? mesasLibres(r, id).find((x) => !x.molesta)?.n;
  if (!n) return;
  guardar('reservas', leer('reservas').map((x) => (x.id === id ? { ...x, estado: 'confirmada', mesa: n } : x)));
  delete asignando[id];
  admin.refrescar();
  toast('📅', `Reserva confirmada · mesa ${n}`, `${esc(r.nombre)} ya lo ve en «Mis reservas».`);
}

function rechazarReserva(id) {
  const r = leer('reservas').find((x) => x.id === id);
  modal({
    titulo: 'Avisar que no hay disponibilidad',
    cuerpo: `<p style="color:var(--tenue)">${esc(r.nombre)} pidió ${ZONAS[r.zona].nombre.toLowerCase()} para ${r.personas}, ${fechaCorta(r.fecha).toLowerCase()} a las ${r.hora}. Dale una alternativa:</p>
      <label class="campo">Mensaje<textarea name="msg" required rows="3">A esa hora no nos quedan mesas en ${ZONAS[r.zona].nombre.toLowerCase()}. ¿Te acomoda a las ${String(Number(r.hora.slice(0, 2)) + 1).padStart(2, '0')}:00 o en otra zona?</textarea></label>`,
    guardar: 'Enviar',
    onGuardar(f) {
      guardar('reservas', leer('reservas').map((x) => (x.id === id ? { ...x, estado: 'rechazada', respuesta: f.get('msg').trim() } : x)));
      admin.refrescar();
    },
  });
}

// ---------- Formularios ----------
function formGarzon(id) {
  const g = leer('garzones').find((x) => x.id === id) || { nombre: '', activo: true };
  modal({
    titulo: id ? 'Editar garzón' : 'Nuevo garzón',
    cuerpo: `<label class="campo">Nombre<input name="nombre" value="${esc(g.nombre)}" required></label>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="activo"${g.activo ? ' checked' : ''}><span></span></span>Activo (puede tener mesas)</label>`,
    onGuardar(f) {
      const l = leer('garzones');
      const datos = { nombre: f.get('nombre').trim(), activo: f.get('activo') === 'on' };
      if (id) Object.assign(l.find((x) => x.id === id), datos); else l.push({ id: uid(), ...datos });
      guardar('garzones', l);
      admin.refrescar();
    },
  });
}

function formMesa(n) {
  const mesas = leer('mesas');
  const m = mesas.find((x) => x.n === n) || { n: Math.max(0, ...mesas.map((x) => x.n)) + 1, zona: 'salon', cap: 2, garzon: '', nota: '', molesta: false };
  modal({
    titulo: n ? `Mesa ${n}` : 'Nueva mesa',
    cuerpo: `<div class="form-2">
        <label class="campo">Zona<select name="zona">${Object.entries(ZONAS).filter(([z]) => z !== 'cualquiera').map(([z, i]) => `<option value="${z}"${z === m.zona ? ' selected' : ''}>${i.icono} ${i.nombre}</option>`).join('')}</select></label>
        <label class="campo">Capacidad<input name="cap" type="number" min="1" max="12" value="${m.cap}" required></label>
      </div>
      <label class="campo">Nota <small>Ej.: junto a la cocina, bajo la TV, junto a la ventana</small><input name="nota" value="${esc(m.nota)}"></label>
      <label class="campo" style="display:flex;align-items:center;gap:10px"><span class="switch"><input type="checkbox" name="molesta"${m.molesta ? ' checked' : ''}><span></span></span>Conviene evitarla (se ofrece al final y avisa al asignarla)</label>`,
    extra: n ? '<button type="button" class="boton boton--peligro" data-borrar style="margin-right:auto">Eliminar</button>' : '',
    onGuardar(f) {
      const l = leer('mesas');
      const datos = { zona: f.get('zona'), cap: Number(f.get('cap')) || 2, nota: f.get('nota').trim(), molesta: f.get('molesta') === 'on' };
      if (n) Object.assign(l.find((x) => x.n === n), datos); else l.push({ n: m.n, garzon: '', ...datos });
      guardar('mesas', l);
      admin.refrescar();
    },
  }).addEventListener('click', (e) => {
    if (e.target.closest('[data-borrar]') && confirm(`¿Eliminar la mesa ${n}?`)) {
      guardar('mesas', leer('mesas').filter((x) => x.n !== n));
      e.target.closest('dialog').close();
      admin.refrescar();
    }
  });
}

// ---------- Eventos ----------
document.addEventListener('click', (e) => {
  const t = e.target;
  if (t.closest('[data-probar]')) return irA('pedidos', { mesa: 4 });
  if (t.closest('[data-probar-reserva]')) return irA('carta');
  const ir = t.closest('[data-tab-ir]');
  if (ir) return admin.mostrar(ir.dataset.tabIr);
  const f = t.closest('[data-filtro]');
  if (f) { filtroEstado = f.dataset.filtro; return admin.refrescar(); }
  const dia = t.closest('[data-dia]');
  if (dia) { filtroDia = dia.dataset.dia; return admin.refrescar(); }
  const at = t.closest('[data-atender]');
  if (at) { guardar('llamadas', leer('llamadas').map((l) => (l.id === at.dataset.atender ? { ...l, atendida: true } : l))); return admin.refrescar(); }
  const cm = t.closest('[data-cerrar-mesa]');
  if (cm) {
    e.stopPropagation();
    const n = Number(cm.dataset.cerrarMesa);
    if (confirm(`¿Cerrar la mesa ${n}? Sus pedidos pasan al historial y la mesa queda libre.`)) {
      guardar('pedidos', leer('pedidos').map((p) => (p.mesa === n ? { ...p, cerrado: true } : p)));
      guardar('llamadas', leer('llamadas').map((l) => (l.mesa === n ? { ...l, atendida: true } : l)));
      admin.refrescar();
      toast('🔒', `Mesa ${n} cerrada`, 'Quedó libre para los próximos clientes.');
    }
    return;
  }
  const col = t.closest('[data-colapsar]');
  if (col && !t.closest('button')) { const n = Number(col.dataset.colapsar); colapsadas.has(n) ? colapsadas.delete(n) : colapsadas.add(n); return admin.refrescar(); }
  // Consultas
  const tarjeta = t.closest('[data-consulta]');
  if (tarjeta) {
    const id = tarjeta.dataset.consulta;
    const tipo = t.closest('[data-tipo]');
    if (tipo) { borradores[id].tipo = tipo.dataset.tipo; return admin.refrescar(); }
    const rap = t.closest('[data-rapida]');
    if (rap) { borradores[id].texto = rap.dataset.rapida + (borradores[id].tipo === 'alternativa' ? ' ' : ''); admin.refrescar(); const ta = document.querySelector(`[data-consulta="${id}"] [data-texto]`); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); return; }
    if (t.closest('[data-responder]')) return responder(id);
  }
  // Reservas
  const mr = t.closest('[data-mesa-r]');
  if (mr) { const [id, n] = mr.dataset.mesaR.split(':'); asignando[id] = Number(n); return admin.refrescar(); }
  const cr = t.closest('[data-confirmar-r]');
  if (cr) return confirmarReserva(cr.dataset.confirmarR);
  const rr = t.closest('[data-rechazar-r]');
  if (rr) return rechazarReserva(rr.dataset.rechazarR);
  // Mesas y garzones
  if (t.closest('[data-nuevo-garzon]')) return formGarzon();
  const eg = t.closest('[data-editar-garzon]');
  if (eg) return formGarzon(eg.dataset.editarGarzon);
  if (t.closest('[data-agregar-mesa]')) return formMesa();
  const em = t.closest('[data-editar-mesa]');
  if (em) return formMesa(Number(em.dataset.editarMesa));
  const am = t.closest('[data-abrir-mesa]');
  if (am) return irA('pedidos', { mesa: Number(am.dataset.abrirMesa) });
});
document.addEventListener('input', (e) => {
  const tarjeta = e.target.closest('[data-consulta]');
  if (!tarjeta) return;
  const b = borradores[tarjeta.dataset.consulta];
  if (e.target.matches('[data-texto]')) b.texto = e.target.value;
  if (e.target.matches('[data-precio]')) b.precio = e.target.value;
});
document.addEventListener('change', (e) => {
  const s = e.target.closest('[data-estado]');
  if (s) { guardar('pedidos', leer('pedidos').map((p) => (p.id === Number(s.dataset.estado) ? { ...p, estado: s.value } : p))); return admin.refrescar(); }
  const a = e.target.closest('[data-activo]');
  if (a) { guardar('garzones', leer('garzones').map((g) => (g.id === a.dataset.activo ? { ...g, activo: a.checked } : g))); return admin.refrescar(); }
  const gm = e.target.closest('[data-garzon-mesa]');
  if (gm) guardar('mesas', leer('mesas').map((m) => (m.n === Number(gm.dataset.garzonMesa) ? { ...m, garzon: gm.value } : m)));
});

// ---------- Avisos en vivo desde las pantallas 1 y 3 ----------
const ids = (clave, f = (x) => x.id) => new Set(leer(clave).map(f));
let conocidos = { pedidos: ids('pedidos'), llamadas: ids('llamadas'), consultas: ids('consultas'), reservas: ids('reservas') };
function avisarNuevos(clave) {
  for (const x of leer(clave)) {
    if (conocidos[clave]?.has(x.id)) continue;
    if (clave === 'pedidos') toast('🧾', `Nuevo pedido · Mesa ${x.mesa}`, `${esc(x.cliente)} · ${x.items.reduce((s, i) => s + i.cant, 0)} productos · ${clp(totalPedido(x) + x.propina)}`, () => admin.mostrar('pedidos'));
    if (clave === 'llamadas' && !x.atendida) toast('🔔', `Llamada al garzón · Mesa ${x.mesa}`, 'Toca para ver los pedidos.', () => admin.mostrar('pedidos'));
    if (clave === 'consultas') toast('💬', `Consulta · Mesa ${x.mesa}`, esc(x.texto), () => admin.mostrar('consultas'));
    if (clave === 'reservas') toast('📅', `Nueva reserva · ${esc(x.nombre)}`, `${x.personas} pers. · ${fechaCorta(x.fecha)} ${x.hora} · ${ZONAS[x.zona].nombre}`, () => admin.mostrar('reservas'));
  }
  if (clave in conocidos) conocidos[clave] = ids(clave);
}
alCambiar((clave) => {
  avisarNuevos(clave);
  // No interrumpir a quien está escribiendo una respuesta.
  const escribiendo = document.activeElement?.matches?.('[data-texto],[data-precio]');
  if (escribiendo) admin.pintarTabs(); else admin.refrescar();
});
// Lo que llegó mientras este administrador estaba cerrado también se avisa una vez.
(function avisosPendientes() {
  const K = PREF + 'vistos-admin';
  let vistos;
  try { vistos = new Set(JSON.parse(localStorage.getItem(K) || '[]')); } catch { vistos = new Set(); }
  for (const p of leer('pedidos')) if (!p.cerrado && p.estado === 'pendiente' && !vistos.has(`p${p.id}`)) toast('🧾', `Nuevo pedido · Mesa ${p.mesa}`, `${esc(p.cliente)} · ${clp(totalPedido(p) + p.propina)}`, () => admin.mostrar('pedidos'));
  for (const c of leer('consultas')) if (c.estado === 'pendiente' && !vistos.has(`c${c.id}`)) toast('💬', `Consulta · Mesa ${c.mesa}`, esc(c.texto), () => admin.mostrar('consultas'));
  for (const r of leer('reservas')) if (r.estado === 'pendiente' && !vistos.has(`r${r.id}`)) toast('📅', `Reserva por confirmar · ${esc(r.nombre)}`, `${r.personas} pers. · ${fechaCorta(r.fecha)} ${r.hora}`, () => admin.mostrar('reservas'));
  const todos = [...leer('pedidos').map((p) => `p${p.id}`), ...leer('consultas').map((c) => `c${c.id}`), ...leer('reservas').map((r) => `r${r.id}`)];
  try { localStorage.setItem(K, JSON.stringify(todos)); } catch { /* nada */ }
})();

setInterval(() => { if (admin.actual === 'pedidos' && !document.querySelector('dialog[open]') && document.activeElement?.tagName !== 'SELECT') admin.refrescar(); }, 30000);

admin.refrescar();
