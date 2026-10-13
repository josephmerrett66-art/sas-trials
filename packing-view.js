import {ITEMS,BASE_WEIGHT,packWeight,loadPace,hydrationWord,energyWord,warmthWord,fatigueWord} from './kit.js?v=camp-1';
import {BergenView} from './bergen-view.js?v=fire-1';
import {SHAPES} from './bergen-grid.js?v=fire-1';

// Kit list before the exercise, condition notes on the pause menu, and the strain vignette.
export class PackingView {
 constructor(kit,{onStepOff,clock=null}){
  this.kit=kit;this.clock=clock;this.menu=document.querySelector('#menu');this.panel=document.querySelector('#packing');this.condition=document.querySelector('#condition');this.vignette=document.querySelector('#strain');this.lastStrain=-1;
  // The kit list is a tray beside the bergen: drag (or tap) an item into a space where it fits.
  const list=this.panel.querySelector('#kit-list');
  list.innerHTML=`<li class="fixed"><span><strong>Bergen, clothing, map, compass, torch, knife</strong><small>Always carried.</small></span><span class="kg">${BASE_WEIGHT.toFixed(1)} kg</span></li>`+ITEMS.map(item=>`<li data-item="${item.id}"><button type="button" class="tray-item" data-add="${item.id}" aria-label="Pack ${item.name}"><i class="shape" style="--w:${SHAPES[item.id][0]};--h:${SHAPES[item.id][1]}" data-kind="${item.id}"></i><span><strong>${item.name}</strong><small>${item.note}</small></span></button><span class="kg">${item.weight.toFixed(item.weight<1?2:1)} kg</span><span class="count"><output></output><button type="button" data-remove aria-label="Unpack one ${item.name}">−</button></span></li>`).join('');
  for(const button of list.querySelectorAll('[data-remove]'))button.onclick=()=>{const id=button.closest('li').dataset.item;kit.set(id,kit.loadout[id]-1);this.bergen.render();this.render();};
  this.bergen=new BergenView(this.panel.querySelector('#bergen-space'),kit.bergen,{tray:list,cell:matchMedia('(max-width:600px)').matches?36:42,canAdd:id=>kit.loadout[id]<ITEMS.find(i=>i.id===id).max,onChange:()=>this.render()});
  this.panel.querySelector('#step-off').onclick=()=>{this.hide();onStepOff();};
  this.panel.querySelector('#kit-back').onclick=()=>this.hide();
  this.render();
 }
 get open(){return !this.panel.hidden;}
 show(){this.menu.hidden=true;this.panel.hidden=false;this.bergen.render();this.render();}
 hide(){this.bergen.cancel();this.panel.hidden=true;this.menu.hidden=false;}
 render(){
  for(const li of this.panel.querySelectorAll('[data-item]')){const id=li.dataset.item,item=ITEMS.find(i=>i.id===id),n=this.kit.loadout[id];li.querySelector('output').value=item.max===1?(n?'Packed':'—'):`${n} / ${item.max}`;li.classList.toggle('left',!n);li.querySelector('[data-remove]').disabled=n<=0;li.querySelector('[data-add]').disabled=n>=item.max;}
  const free=this.kit.bergen.freeCells;this.panel.querySelector('#bergen-free').textContent=`${free} of ${this.kit.bergen.cols*this.kit.bergen.rows} spaces free${free<6?' · tight for wood and game':''}`;
  const weight=packWeight(this.kit.loadout),pace=loadPace(weight);
  this.panel.querySelector('#kit-weight').textContent=`${weight.toFixed(1)} kg`;
  this.panel.querySelector('#kit-pace').textContent=`${Math.round(pace*100)}% walking pace`;
  this.panel.querySelector('#kit-meter').style.setProperty('--load',Math.min(1,weight/22));
  this.panel.querySelector('#kit-verdict').textContent=pace>.95?'Light and quick. You will need to live off the land.':pace>.8?'A balanced load.':'Heavy. Safe, but every hill will cost you.';
 }
 // Paused: full condition report in the menu. Playing: only the edge vignette.
 update(active){
  const kit=this.kit;
  if(!active&&kit.packed){this.condition.hidden=false;this.condition.innerHTML=kit.withdrawn?`<strong>Medically withdrawn: ${kit.withdrawn}.</strong> Reset the exercise to repack and try again.`:`<span>Hydration <b>${hydrationWord(kit.hydration)}</b> ${Math.round(kit.hydration)}%</span><span>Energy <b>${energyWord(kit.energy)}</b> ${Math.round(kit.energy)}%</span><span>Warmth <b>${warmthWord(kit.warmth)}</b> ${Math.round(kit.warmth)}%</span><span>Sleep <b>${fatigueWord(kit.awake)}</b> · ${Math.round(kit.awake)} h awake</span>${this.clock?`<span><b>${this.clock.label}</b></span>`:''}<span>Water <b>${kit.water.toFixed(1)} L</b></span><span>Rations <b>${kit.rations}</b></span><span>Rabbit <b>${kit.cooked} cooked${kit.raw?`, ${kit.raw} raw`:''}</b></span><span>Wood <b>${kit.wood}</b></span><span>Pack <b>${kit.weight.toFixed(1)} kg</b> · ${Math.round(kit.pace*100)}% pace</span>${kit.sick>0?'<span><b>Unwell</b> from untreated water</span>':''}`;}
  else if(!kit.packed)this.condition.hidden=true;
  const strain=active?Math.round(kit.strain*20)/20:0;if(strain!==this.lastStrain){this.lastStrain=strain;this.vignette.style.opacity=String(strain*.85);}
 }
}
