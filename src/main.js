const items = [
  {name:'Bocabox salmón', description:'10 piezas, salmón, palta y queso crema · agrega salsa sin costo', price:'$12.900', category:'entradas'},
  {name:'Gyozas mixtas', description:'Pollo y verduras, 6 unidades · elige salsa ponzu o teriyaki', price:'$8.900', category:'entradas'},
  {name:'Roll Bocabará', description:'Camarón tempura, palta, salmón y salsa acevichada', price:'$13.900', category:'fondos'},
  {name:'Tartar de salmón', description:'Salmón fresco, palta, cebollín y chips de wantán', price:'$14.500', category:'fondos'},
  {name:'Ramen de la casa', description:'Caldo miso, cerdo, huevo y verduras · opción sin picante', price:'$12.900', category:'fondos'},
  {name:'Mojito Ramazzotti', description:'Ramazzotti, limón, menta y agua con gas · consulta modificaciones', price:'$7.500', category:'cocteles'}
];
const menuGrid = document.querySelector('#menu-grid');
const toast = document.querySelector('#toast');
let toastTimer;
function showToast(message){ toast.textContent=message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=window.setTimeout(()=>toast.classList.remove('show'),3200); }
function render(category='todos'){
  menuGrid.innerHTML = items.filter(item=>category==='todos'||item.category===category).map(item=>`<article class="menu-card"><div class="menu-card-content"><h3>${item.name}</h3><p>${item.description}</p><div class="menu-meta"><span>${item.price}</span><span class="status">Disponible</span></div></div></article>`).join('');
}
render();
document.querySelectorAll('.tab').forEach(tab=>tab.addEventListener('click',()=>{document.querySelector('.tab.active')?.classList.remove('active');tab.classList.add('active');render(tab.dataset.category)}));
function openWhatsApp(message){ window.open(`https://wa.me/56922334146?text=${encodeURIComponent(message)}`,'_blank','noopener,noreferrer'); }
function formatReservationDate(value){
  const parts=String(value||'').split('-');
  return parts.length===3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value||'');
}
document.querySelectorAll('[data-action="attention"]').forEach(button=>button.addEventListener('click',()=>openWhatsApp('Hola Oceanic Restobar, estoy en una mesa y necesito atención.')));
document.querySelector('#reservation-form').addEventListener('submit',(event)=>{event.preventDefault();const form=new FormData(event.currentTarget);const name=form.get('name');const date=formatReservationDate(form.get('date'));const people=form.get('people');openWhatsApp(`Hola Oceanic Restobar, soy ${name}. Me gustaría reservar una mesa para ${people} el día ${date}. ¿Me confirman disponibilidad?`);showToast('Abriendo WhatsApp para confirmar tu solicitud…');});
