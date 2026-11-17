// BOCABAR · carta digital, pedidos y reservas por WhatsApp.
const NEGOCIO = 'BOCABAR';
const WHATSAPP = '56922334146';
const HORARIO = { abre: '12:30', cierra: '23:30' };
const foto = (id, w = 700) => `https://images.unsplash.com/photo-${id}?w=${w}&q=70&auto=format&fit=crop`;

const PLATOS = [
  { nombre: 'Bocabox salmón', texto: '10 piezas de salmón, palta y queso crema. Agrega una salsa sin costo.', precio: 12900, cat: 'compartir', foto: '1563612116625-3012372fccce', etiqueta: 'Para dos' },
  { nombre: 'Gyozas mixtas', texto: 'Pollo y verduras, 6 unidades. Elige salsa ponzu o teriyaki.', precio: 8900, cat: 'compartir', foto: '1738681336104-608b4e7dc3b0' },
  { nombre: 'Roll Bocabará', texto: 'Camarón tempura, palta, salmón y salsa acevichada.', precio: 13900, cat: 'fondos', foto: '1730900737644-e146f78db8e7', etiqueta: 'De la casa' },
  { nombre: 'Tartar de salmón', texto: 'Salmón fresco, palta, cebollín y chips de wantán.', precio: 14500, cat: 'fondos', foto: '1779798457936-c931abff9023' },
  { nombre: 'Ramen de la casa', texto: 'Caldo miso, cerdo, huevo y verduras. Opción sin picante.', precio: 12900, cat: 'fondos', foto: '1612927601601-6638404737ce' },
  { nombre: 'Mojito Ramazzotti', texto: 'Ramazzotti, limón, menta y agua con gas.', precio: 7500, cat: 'barra', foto: '1772311698901-fe3fa07141be' },
];

const clp = (n) => '$' + n.toLocaleString('es-CL');
const aviso = document.getElementById('aviso');
let avisoTimer;
function avisar(msg) {
  aviso.textContent = msg;
  aviso.classList.add('ver');
  clearTimeout(avisoTimer);
  avisoTimer = setTimeout(() => aviso.classList.remove('ver'), 3200);
}
function whatsapp(msg) {
  window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
}

// Carta con pestañas
const contenedor = document.getElementById('platos');
function pintar(cat = 'todos') {
  contenedor.innerHTML = PLATOS.filter((p) => cat === 'todos' || p.cat === cat).map((p) => `
    <article class="plato">
      <div class="plato-foto"><img loading="lazy" src="${foto(p.foto)}" alt="">${p.etiqueta ? `<span>${p.etiqueta}</span>` : ''}</div>
      <div class="plato-texto">
        <div class="plato-cab"><h3>${p.nombre}</h3><b>${clp(p.precio)}</b></div>
        <p>${p.texto}</p>
        <button type="button" data-pedir="${p.nombre}">Pedir <span aria-hidden="true">→</span></button>
      </div>
    </article>`).join('');
}
pintar();
document.querySelectorAll('.pestana').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.pestana').forEach((x) => { x.classList.toggle('activa', x === b); x.setAttribute('aria-selected', x === b); });
  pintar(b.dataset.cat);
}));

document.addEventListener('click', (e) => {
  const pedir = e.target.closest('[data-pedir]');
  if (pedir) { whatsapp(`Hola ${NEGOCIO}, quiero pedir: ${pedir.dataset.pedir}.`); avisar('Abriendo WhatsApp con tu pedido…'); return; }
  if (e.target.closest('[data-accion="ayuda"]')) { whatsapp(`Hola ${NEGOCIO}, tengo una consulta sobre la carta.`); avisar('Abriendo WhatsApp…'); }
});

// Reserva
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
const campoFecha = document.querySelector('#form-reserva [name="fecha"]');
campoFecha.min = hoy;
campoFecha.value = hoy;
document.getElementById('form-reserva').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(e.currentTarget);
  const [a, m, d] = String(f.get('fecha')).split('-');
  whatsapp(`Hola ${NEGOCIO}, soy ${f.get('nombre')}. Quiero reservar una mesa para ${f.get('personas')} el ${d}/${m}/${a} a las ${f.get('hora')}. ¿Me confirman disponibilidad?`);
  avisar('Abriendo WhatsApp para confirmar tu reserva…');
});

// Abierto o cerrado, en hora de Chile
function estado() {
  const ahora = new Date().toLocaleTimeString('es-CL', { timeZone: 'America/Santiago', hour: '2-digit', minute: '2-digit', hour12: false });
  const abierto = ahora >= HORARIO.abre && ahora < HORARIO.cierra;
  document.querySelectorAll('[data-estado]').forEach((el) => {
    el.classList.toggle('abierto', abierto);
    el.querySelector('span').textContent = abierto ? `Abierto ahora · hasta las ${HORARIO.cierra}` : `Cerrado · abrimos a las ${HORARIO.abre}`;
  });
}
estado();
setInterval(estado, 60000);

// Navegación y apariciones
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('solida', scrollY > 40), { passive: true });
const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { x.target.classList.add('visible'); io.unobserve(x.target); } }), { rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('.revela').forEach((el) => io.observe(el));
