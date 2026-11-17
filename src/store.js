// Datos de la demo, compartidos por las 4 pantallas.
// Todo vive en localStorage de quien prueba la demo: no hay servidor.
// Lo que se edita en un administrador aparece en la carta; los pedidos, las
// consultas y las reservas hechas desde la carta llegan al administrador.

const NS = 'bocabar-demo:v1:';
export const PREF = 'bocabar-demo:pref:';
export const clp = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(Number(n) || 0)).toLocaleString('es-CL');
export const uid = () => Math.random().toString(36).slice(2, 9);
export const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Fotos: propias de BOCABAR (assets/) o de Unsplash (solo el id).
export function fotoUrl(f, w = 600) {
  if (!f) return '';
  if (/^(https?:|assets\/)/.test(f)) return f;
  return `https://images.unsplash.com/photo-${f}?w=${w}&q=70&auto=format&fit=crop`;
}

const haceMin = (m) => new Date(Date.now() - m * 60000).toISOString();
const isoChile = (d) => d.toLocaleDateString('en-CA', { timeZone: 'America/Santiago' });
export const hoyIso = () => isoChile(new Date());
export const enDias = (n) => { const f = new Date(); f.setDate(f.getDate() + n); return isoChile(f); };

// Grupos de opciones reutilizables. Cada opción suma (o resta) al precio.
const SALSAS = { grupo: 'Salsas extra', multi: true, items: [{ n: 'Spring BOCABAR', p: 1000 }, { n: 'Spicy', p: 1000 }, { n: 'Unagui', p: 850 }, { n: 'Soya extra', p: 850 }, { n: 'Jengibre extra', p: 850 }] };
const AJUSTES_ROLL = { grupo: 'Ajustes sin costo', multi: true, items: [{ n: 'Sin queso crema', p: 0 }, { n: 'Sin ciboulette', p: 0 }, { n: 'Sin cebollín', p: 0 }, { n: 'Salsa aparte', p: 0 }] };
const AJUSTES_CEVICHE = { grupo: 'Ajustes sin costo', multi: true, items: [{ n: 'Sin cebolla morada', p: 0 }, { n: 'Sin picante', p: 0 }] };
const TABLA_NO = 'Las tablas son una promoción: no admiten cambios ni se acumulan con otros descuentos. Si necesitas algo distinto, arma tu pedido con los rolls por separado.';

function semilla() {
  return {
    local: {
      nombre: 'BOCABAR',
      tipo: 'Café · Restobar · Sushi · Concón',
      direccion: 'Av. Concón Reñaca 262, Concón',
      horario: 'Todos los días · 12:30 a 23:30',
      telefono: '+56 32 363 8468',
      whatsapp: '56922334146',
      instagram: 'https://www.instagram.com/bocabar.cl/',
      facebook: 'https://www.facebook.com/Bocabar.cl/',
      sitio: 'https://bocabar-concon.vercel.app/landing/',
      titulo: 'Súmate al buen rollo',
      frase: 'Sushi fresco, coctelería de autor y el mejor ambiente de Concón.',
      tema: 'noche',
    },
    categorias: [
      { id: 'nikkei', nombre: 'Rolls Nikkei', icono: '🍣' },
      { id: 'mes', nombre: 'Rolls del mes', icono: '🌺' },
      { id: 'clasicos', nombre: 'Rolls clásicos', icono: '🥢' },
      { id: 'nigiri', nombre: 'Nigiri y sashimi', icono: '🐟' },
      { id: 'compartir', nombre: 'Para compartir', icono: '🥟' },
      { id: 'ceviches', nombre: 'Ceviches', icono: '🍋' },
      { id: 'tablas', nombre: 'Tablas', icono: '🍱' },
      { id: 'barra', nombre: 'Barra', icono: '🍹' },
    ],
    // estado: disponible | agotado (se ve con el motivo, pero no se pide) | oculto
    // cambios: false → la carta explica por qué no se puede modificar.
    productos: [
      { id: 'acevichado', nombre: 'Acevichado', precio: 12850, cat: 'nikkei', etiqueta: 'El favorito', tags: ['picante'], desc: 'Camarón tempura y palta, envuelto en panko con topping de ceviche en salsa acevichada.', foto: 'assets/acevichado.jpg', estado: 'disponible', cambios: true, opciones: [AJUSTES_ROLL, SALSAS] },
      { id: 'fuji', nombre: 'Fuji Rolls', precio: 12000, cat: 'nikkei', etiqueta: '', tags: [], desc: 'Salmón, queso crema y palta en panko, con topping de camarón tempura y salsa fuji.', foto: '1730900737644-e146f78db8e7', estado: 'disponible', cambios: true, opciones: [AJUSTES_ROLL, SALSAS] },
      { id: 'dinamita', nombre: 'Dinamita Rolls', precio: 11350, cat: 'nikkei', etiqueta: '', tags: ['picante'], desc: 'Camarón, queso crema y palta en nori furai, con topping de salsa dinamita.', foto: '', emoji: '🍣', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Picante', items: [{ n: 'Normal', p: 0 }, { n: 'Suave', p: 0 }, { n: 'Sin picante', p: 0 }] }, AJUSTES_ROLL, SALSAS] },
      { id: 'caribbean', nombre: 'Caribbean Rolls', precio: 11500, cat: 'nikkei', etiqueta: '', tags: [], desc: 'Salmón tempura, queso crema y palta, envuelto en plátano dulce.', foto: '', emoji: '🍌', estado: 'disponible', cambios: true, opciones: [AJUSTES_ROLL, SALSAS] },
      { id: 'tako-pilpil', nombre: 'Tako Pilpil', precio: 12850, cat: 'nikkei', etiqueta: '', tags: ['picante'], desc: 'Camarón, palta y cebollín en queso crema, con topping de pulpo al pilpil.', foto: '', emoji: '🐙', estado: 'disponible', cambios: true, opciones: [AJUSTES_ROLL, SALSAS] },
      { id: 'explosion', nombre: 'Explosión Tropical', precio: 12250, cat: 'mes', etiqueta: 'Roll del mes', tags: [], desc: 'Plátano dulce y queso crema en nori furai, cubierto de salmón y bañado en salsa Spring BOCABAR.', detalle: 'La Spring BOCABAR es una receta de la casa. Si no la conoces, pide una porción aparte para probarla.', foto: '1563612116625-3012372fccce', estado: 'disponible', cambios: true, opciones: [AJUSTES_ROLL, SALSAS] },
      { id: 'tuna-tartar', nombre: 'Tuna Tartar', precio: 12450, cat: 'mes', etiqueta: 'Nuevo', tags: [], desc: 'Camarón tempura y palta en nori furai, cubierto con tartar de atún, masago y cebollín.', foto: '1617196034796-73dfa7b1fd56', estado: 'disponible', cambios: true, opciones: [AJUSTES_ROLL, SALSAS] },
      { id: 'roll-salmon', nombre: 'Roll salmón y queso crema', precio: 7950, cat: 'clasicos', etiqueta: 'Elige la envoltura', tags: [], desc: '9 cortes. Salmón, queso crema y ciboulette, con la envoltura que prefieras.', foto: '', emoji: '🍣', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Envoltura', items: [{ n: 'Panko (furai)', p: 0 }, { n: 'Palta (avocado)', p: 500 }, { n: 'Salmón (sake)', p: 1800 }, { n: 'Sésamo (california)', p: 200 }] }, AJUSTES_ROLL, SALSAS] },
      { id: 'bocaveggie', nombre: 'Bocaveggie', precio: 7300, cat: 'clasicos', etiqueta: '', tags: ['veggie'], desc: 'Palmito, espárrago, palta, cebollín y pepino, envuelto en nori furai.', foto: '', emoji: '🥑', estado: 'disponible', cambios: true, opciones: [SALSAS] },
      { id: 'ebi-rolls', nombre: 'Ebi Rolls', precio: 10600, cat: 'clasicos', etiqueta: 'Sin arroz', tags: ['sin-arroz'], desc: 'Camarón tempura, queso crema, cebollín y palta, envuelto en salmón y palta, sin arroz.', foto: '', emoji: '🦐', estado: 'disponible', cambios: true, opciones: [AJUSTES_ROLL, SALSAS] },
      { id: 'nigiri-salmon', nombre: 'Nigiri de salmón', precio: 5250, cat: 'nigiri', etiqueta: '', tags: [], desc: 'Salmón fresco sobre arroz.', foto: '1617196034796-73dfa7b1fd56', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Cantidad', items: [{ n: '4 unidades', p: 0 }, { n: '8 unidades', p: 3400 }] }] },
      { id: 'nigiri-palta', nombre: 'Nigiri de palta', precio: 4200, cat: 'nigiri', etiqueta: '', tags: ['veggie'], desc: '4 unidades.', foto: '', emoji: '🥑', estado: 'agotado', motivoAgotado: 'Hoy no llegó palta en su punto. Te recomendamos el Bocaveggie.', cambios: true, opciones: [] },
      { id: 'sashimi', nombre: 'Sashimi de salmón', precio: 7750, cat: 'nigiri', etiqueta: '', tags: ['sin-arroz'], desc: 'Cortes de salmón fresco.', foto: '', emoji: '🐟', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Cantidad', items: [{ n: '6 cortes', p: 0 }, { n: '10 cortes', p: 4400 }] }] },
      { id: 'tabla-caliente', nombre: 'Tabla caliente', precio: 11200, cat: 'compartir', etiqueta: 'Para compartir', tags: [], desc: '15 piezas: gyosas, arrollados, empanadas, ebi panko y tequeños.', foto: '', emoji: '🥟', estado: 'disponible', cambios: true, opciones: [] },
      { id: 'gyosas', nombre: 'Gyosas', precio: 5100, cat: 'compartir', etiqueta: '', tags: [], desc: 'Gyosas fritas. Elige el relleno.', foto: '1738681336104-608b4e7dc3b0', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Relleno', items: [{ n: 'Mixtas', p: 0 }, { n: 'Camarón', p: 0 }, { n: 'Cerdo', p: 0 }, { n: 'Pollo', p: 0 }] }, { grupo: 'Cantidad', items: [{ n: '6 unidades', p: 0 }, { n: '10 unidades', p: 1900 }] }] },
      { id: 'tequenos', nombre: 'Tequeños', precio: 8400, cat: 'compartir', etiqueta: '', tags: ['veggie'], desc: '6 deditos de queso en masa crocante.', foto: '', emoji: '🧀', estado: 'disponible', cambios: true, opciones: [] },
      { id: 'carpacho-res', nombre: 'Carpacho de res', precio: 13900, cat: 'compartir', etiqueta: '', tags: [], desc: 'Finos cortes de carne, parmesano, pesto y tostadas.', foto: '', emoji: '🥩', estado: 'agotado', motivoAgotado: 'Se terminó por hoy. Vuelve a estar mañana.', cambios: true, opciones: [] },
      { id: 'ceviche-salmon', nombre: 'Ceviche de salmón', precio: 15300, cat: 'ceviches', etiqueta: 'De la casa', tags: [], desc: 'Salmón, limón de pica, pimentón rojo, ciboulette, cebolla morada y aderezo de la casa.', foto: 'assets/ceviches.jpg', estado: 'disponible', cambios: true, opciones: [AJUSTES_CEVICHE] },
      { id: 'ceviche-mixto', nombre: 'Ceviche mixto', precio: 13950, cat: 'ceviches', etiqueta: '', tags: [], desc: 'Salmón y camarón, limón de pica, pimentón, ciboulette y cebolla morada.', foto: '', emoji: '🍋', estado: 'disponible', cambios: true, opciones: [AJUSTES_CEVICHE] },
      { id: 'tabla-nikkei', nombre: 'Tabla Nikkei', precio: 36750, cat: 'tablas', etiqueta: 'Para 3 o 4', tags: [], desc: 'Acevichado, Fuji Rolls y Dinamita Rolls (9 cortes c/u) y 6 gyosas.', foto: '', emoji: '🍱', estado: 'disponible', cambios: false, motivoCambios: TABLA_NO, opciones: [] },
      { id: 'promo-2', nombre: 'Promo 2 · 36 piezas', precio: 25450, cat: 'tablas', etiqueta: '', tags: [], desc: '9 cortes de Hosomaki, Avocado, California y Furai.', foto: '', emoji: '🍱', estado: 'disponible', cambios: false, motivoCambios: TABLA_NO, opciones: [] },
      { id: 'tabla-veggie', nombre: 'Tabla vegetariana', precio: 24300, cat: 'tablas', etiqueta: '', tags: ['veggie'], desc: '9 cortes de Furai, California, Vegan Rolls y Veggie Rolls.', foto: '', emoji: '🥬', estado: 'disponible', cambios: false, motivoCambios: TABLA_NO, opciones: [] },
      { id: 'bocatonic', nombre: 'BocaTonic', precio: 7900, cat: 'barra', etiqueta: 'De autor', tags: [], desc: 'Gin, tónica y el toque de la casa.', foto: 'assets/bocatonic.jpg', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Tónica', items: [{ n: 'Tónica normal', p: 0 }, { n: 'Tónica zero', p: 0 }] }] },
      { id: 'mojito', nombre: 'Mojito', precio: 6900, cat: 'barra', etiqueta: '', tags: [], desc: 'Ron, limón, menta fresca y agua con gas.', foto: '1772311698901-fe3fa07141be', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Sabor', items: [{ n: 'Clásico', p: 0 }, { n: 'Frutilla', p: 800 }, { n: 'Maracuyá', p: 800 }] }, { grupo: 'Base', items: [{ n: 'Con ron', p: 0 }, { n: 'Sin alcohol', p: -2000 }] }] },
      { id: 'ramazzotti', nombre: 'Ramazzotti Spritz', precio: 7500, cat: 'barra', etiqueta: '', tags: [], desc: 'Ramazzotti, espumante y agua con gas.', foto: '', emoji: '🍸', estado: 'disponible', cambios: true, opciones: [] },
      { id: 'pisco-sour', nombre: 'Pisco sour', precio: 5900, cat: 'barra', etiqueta: '', tags: [], desc: 'Pisco, limón de pica y amargo de angostura.', foto: '', emoji: '🍋', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Tamaño', items: [{ n: 'Normal', p: 0 }, { n: 'Catedral', p: 2500 }] }] },
      { id: 'limonada', nombre: 'Limonada', precio: 3900, cat: 'barra', etiqueta: 'Sin alcohol', tags: ['veggie'], desc: 'Limón y hielo, con menta o jengibre.', foto: '', emoji: '🧃', estado: 'disponible', cambios: true, opciones: [{ grupo: 'Sabor', items: [{ n: 'Menta', p: 0 }, { n: 'Jengibre', p: 0 }, { n: 'Menta y jengibre', p: 0 }] }] },
    ],
    garzones: [
      { id: 'g1', nombre: 'María', activo: true },
      { id: 'g2', nombre: 'Priscila', activo: true },
      { id: 'g3', nombre: 'Tomás', activo: true },
    ],
    // nota: lo que conviene saber antes de sentar a alguien (cocina, escala, TV…).
    mesas: [
      { n: 1, zona: 'terraza', cap: 2, garzon: 'g1', nota: 'Bajo quitasol' },
      { n: 2, zona: 'terraza', cap: 2, garzon: 'g1', nota: 'Bajo quitasol' },
      { n: 3, zona: 'terraza', cap: 4, garzon: 'g1', nota: '' },
      { n: 4, zona: 'terraza', cap: 4, garzon: 'g1', nota: '' },
      { n: 5, zona: 'terraza', cap: 6, garzon: 'g2', nota: 'Mesa larga de madera' },
      { n: 6, zona: 'salon', cap: 2, garzon: 'g2', nota: 'Junto a la ventana' },
      { n: 7, zona: 'salon', cap: 2, garzon: 'g2', nota: 'Junto a la cocina', molesta: true },
      { n: 8, zona: 'salon', cap: 4, garzon: 'g2', nota: 'Bajo la TV', molesta: true },
      { n: 9, zona: 'salon', cap: 4, garzon: 'g3', nota: '' },
      { n: 10, zona: 'salon', cap: 2, garzon: 'g3', nota: 'Paso de la escala', molesta: true },
      { n: 11, zona: 'barra', cap: 2, garzon: 'g3', nota: 'Frente al bartender' },
      { n: 12, zona: 'barra', cap: 2, garzon: 'g3', nota: '' },
    ],
    pedidos: [
      { id: 1041, mesa: 3, cliente: 'Natalia', items: [{ id: 'acevichado', nombre: 'Acevichado', precio: 12850, cant: 1, mods: ['Salsa aparte'] }, { id: 'bocatonic', nombre: 'BocaTonic', precio: 7900, cant: 2, mods: ['Tónica zero'] }], nota: '', propina: 2865, estado: 'entregado', hora: haceMin(48), cerrado: false },
      { id: 1042, mesa: 3, cliente: 'Natalia', items: [{ id: 'gyosas', nombre: 'Gyosas', precio: 5100, cant: 1, mods: ['Camarón', '6 unidades'] }], nota: '', propina: 510, estado: 'preparacion', hora: haceMin(14), cerrado: false },
      { id: 1043, mesa: 5, cliente: 'Francisca', items: [{ id: 'tabla-nikkei', nombre: 'Tabla Nikkei', precio: 36750, cant: 1, mods: [] }, { id: 'pisco-sour', nombre: 'Pisco sour', precio: 5900, cant: 3, mods: ['Normal'] }], nota: 'Cumpleaños de Isidora 🎂', propina: 5445, estado: 'confirmado', hora: haceMin(8), cerrado: false },
    ],
    // Consultas desde la mesa: el cliente pregunta y el local responde con un sí, una alternativa o un no con motivo.
    consultas: [
      { id: 'c1', mesa: 4, cliente: 'Eyner', producto: 'mojito', texto: '¿Me pueden hacer el mojito con Ramazzotti en vez de ron?', estado: 'pendiente', respuesta: '', precio: 0, hora: haceMin(2), agregado: false },
      { id: 'c0', mesa: 3, cliente: 'Natalia', producto: 'acevichado', texto: '¿El acevichado se puede sin camarón? Soy alérgica.', estado: 'alternativa', respuesta: 'El camarón va dentro del roll y no lo podemos sacar. Te proponemos un roll salmón y queso crema con envoltura de palta, sin camarón.', precio: 8450, hora: haceMin(30), agregado: false },
    ],
    reservas: [
      { id: 'r1', nombre: 'Lisbeth Solano', telefono: '+56 9 8765 4321', fecha: hoyIso(), hora: '20:00', personas: 2, zona: 'terraza', ocasion: 'Aniversario', nota: 'Si se puede, lejos del paso.', estado: 'confirmada', mesa: 1, creada: haceMin(600) },
      { id: 'r2', nombre: 'Rodrigo Pérez', telefono: '+56 9 5555 1212', fecha: hoyIso(), hora: '21:00', personas: 4, zona: 'salon', ocasion: '', nota: '', estado: 'confirmada', mesa: 9, creada: haceMin(300) },
      { id: 'r3', nombre: 'Camila Rojas', telefono: '+56 9 7777 0001', fecha: hoyIso(), hora: '21:00', personas: 2, zona: 'barra', ocasion: 'Cita', nota: 'Nos gusta ver cómo preparan los tragos.', estado: 'pendiente', mesa: null, creada: haceMin(25) },
      { id: 'r4', nombre: 'Natalia Mendoza', telefono: '+56 9 4444 3333', fecha: enDias(1), hora: '13:00', personas: 6, zona: 'terraza', ocasion: 'Cumpleaños', nota: 'Llevamos torta.', estado: 'pendiente', mesa: null, creada: haceMin(90) },
    ],
    llamadas: [
      { id: 'l1', mesa: 8, hora: haceMin(1), atendida: false },
    ],
  };
}

export const ZONAS = {
  terraza: { nombre: 'Terraza', icono: '☀', texto: 'Al aire libre, con quitasoles.' },
  salon: { nombre: 'Salón', icono: '🌿', texto: 'Adentro, con música y luces.' },
  barra: { nombre: 'Barra', icono: '🍸', texto: 'Frente al bartender. Ideal para dos.' },
  cualquiera: { nombre: 'Sin preferencia', icono: '✓', texto: 'La mejor mesa libre a esa hora.' },
};

export const ESTADOS = {
  pendiente: { label: 'Pendiente', icono: '⏳', mensaje: 'Tu pedido llegó al local. Espera la confirmación.' },
  confirmado: { label: 'Confirmado', icono: '✅', mensaje: 'El local confirmó tu pedido.' },
  preparacion: { label: 'En preparación', icono: '👨‍🍳', mensaje: 'Tu pedido se está preparando.' },
  entregado: { label: 'Entregado', icono: '🍽️', mensaje: 'Tu pedido fue entregado. ¡Buen provecho!' },
  cancelado: { label: 'Cancelado', icono: '❌', mensaje: 'El pedido fue cancelado. Habla con el personal.' },
};

export const RESPUESTAS = {
  pendiente: { label: 'Esperando respuesta', icono: '⏳' },
  si: { label: 'Sí se puede', icono: '✅' },
  alternativa: { label: 'Te proponen otra opción', icono: '💡' },
  no: { label: 'No se puede', icono: '✋' },
};

export const ESTADOS_RESERVA = {
  pendiente: { label: 'Por confirmar', icono: '⏳' },
  confirmada: { label: 'Confirmada', icono: '✅' },
  rechazada: { label: 'Sin disponibilidad', icono: '✋' },
};

const CLAVES = Object.keys(semilla());

export function leer(clave) {
  try {
    const v = localStorage.getItem(NS + clave);
    if (v) return JSON.parse(v);
  } catch { /* sin almacenamiento: se usa la semilla */ }
  return semilla()[clave];
}

export function guardar(clave, valor) {
  try { localStorage.setItem(NS + clave, JSON.stringify(valor)); } catch { /* modo privado */ }
}

export function restablecer() {
  try {
    CLAVES.forEach((c) => localStorage.removeItem(NS + c));
    Object.keys(localStorage).filter((k) => k.startsWith(PREF)).forEach((k) => localStorage.removeItem(k));
  } catch { /* nada */ }
}

// Avisa cuando otra pantalla (otra pestaña o el otro iframe) cambia los datos.
export function alCambiar(fn) {
  addEventListener('storage', (e) => { if (e.key?.startsWith(NS)) fn(e.key.slice(NS.length)); });
}

// Tema elegido por el local (Personalizar) aplicado al <html>.
export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema || 'noche';
}

// Pide al menú DEMO que muestre otra pantalla (cuando la página está dentro del iframe).
export function irA(pantalla, extra = {}) {
  if (window.parent !== window) window.parent.postMessage({ demo: 'ir', pantalla, ...extra }, location.origin);
  else location.href = { carta: 'carta.html', 'admin-carta': 'admin-carta.html', pedidos: `pedidos.html${extra.mesa ? `?mesa=${extra.mesa}` : ''}`, 'admin-pedidos': 'admin-pedidos.html' }[pantalla];
}

export const totalPedido = (p) => p.items.reduce((s, i) => s + i.precio * i.cant, 0);

// Mesas libres para una reserva: misma fecha, ±2 h, tamaño adecuado (no sienta a 2 en una mesa de 6).
const minutos = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + b; };
export function mesasLibres({ fecha, hora, personas, zona }, ignorar) {
  const ocupadas = new Set(leer('reservas')
    .filter((r) => r.id !== ignorar && r.mesa && r.estado === 'confirmada' && r.fecha === fecha && Math.abs(minutos(r.hora) - minutos(hora)) < 120)
    .map((r) => r.mesa));
  return leer('mesas')
    .filter((m) => (!zona || zona === 'cualquiera' || m.zona === zona) && m.cap >= personas && m.cap <= Math.max(personas + 2, 2) && !ocupadas.has(m.n))
    .sort((a, b) => (a.molesta ? 1 : 0) - (b.molesta ? 1 : 0) || a.cap - b.cap);
}
