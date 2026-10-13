import {hydrationWord,energyWord,warmthWord,fatigueWord,MAX_WOOD,MAX_TINDER,BASHA_BRANCHES} from './kit.js?v=orders-1';
import {BergenView} from './bergen-view.js?v=fire-1';

// What the backpack shows: each thing you carry with what you can do with it here and now.
// Pure data so it can be tested without a page. near: what is within reach of the player.
export function backpackRows(kit,near){
 const {water=false,post=null,fire=false,laid=false,spitOn=false,spitDone=false,potOn=false,potDone=false,shelter=false,canPitch=false,snare=null,tree=false,ground=false,rabbit=false,sleepable=false,wet=false}=near,rows=[];
 const row=(id,name,detail,actions)=>rows.push({id,name,detail,actions:actions.map(([act,label,enabled])=>({act,label,enabled:!!enabled}))});
 if(post)row('post',`Checkpoint ${post.code}`,'You are at the post.',[['register',`Register ${post.code}`,true]]);
 row('water','Water',kit.bottles?`${kit.water.toFixed(1)} of ${kit.bottles} L${kit.untreated>.001?` · ${kit.untreated.toFixed(1)} L untreated`:''}`:'No bottles',[['drink','Drink',kit.water>.001],['fill',water?'Fill':'No water near',water],...(kit.has('stove')?[potDone?['take-pot','Take boiled water',true]:['boil',potOn?'Boiling':fire?'Boil':'Boil at a fire',fire&&!potOn&&kit.untreated>.001]]:[])]);
 row('rations','Rations',`${kit.rations} pack${kit.rations===1?'':'s'}${kit.has('stove')?' · eaten hot':''}`,[['eat-ration','Eat',kit.rations>0]]);
 row('rabbit','Rabbit',`${kit.cooked} cooked · ${kit.raw} raw${spitOn?(spitDone?' · roast on the spit is done':' · one roasting on the spit'):''}`,[['eat-cooked','Eat cooked',kit.cooked>0],spitDone?['take','Take off spit',true]:['spit',fire?'Roast':'Roast at a fire',fire&&kit.raw>0&&!spitOn],['eat-raw','Eat raw',kit.raw>0]]);
 // A fire needs tinder, a branch for kindling and dead wood; it is built, then struck alight.
 row('wood','Fire and wood',`${kit.wood} of ${MAX_WOOD} bundles · ${kit.tinder} tinder · ${kit.branches} branch${kit.branches===1?'':'es'}${tree?' · dead wood here':''}`,[
  kit.has('hatchet')?['chop',tree?'Chop':'No dead wood near',tree&&kit.wood<MAX_WOOD]:['gather',tree?'Gather':'No dead wood near',tree&&kit.wood<MAX_WOOD],
  ['tinder',ground?'Pull grass':'No dry grass here',ground&&kit.tinder<MAX_TINDER],
  fire?['stoke','Add to fire',kit.wood>0]:laid?['strike','Strike steel',kit.has('firesteel')]:['light',wet?'Too wet here':'Build fire',!wet&&!kit.fireMissing.length]]);
 row('snares','Snare wire',`${kit.snares} left${snare?' · snare here':''}`,[['snare','Set snare',kit.snares>0&&!wet],['lift','Lift snare',!!snare]]);
 const sticks=`${kit.sticks} stick${kit.sticks===1?'':'s'} · ${kit.branches} branch${kit.branches===1?'':'es'}`;
 row('stick','Throwing stick',kit.sticks?`${sticks}${rabbit?' · a rabbit in front of you':''}`:kit.branches?`${sticks} · whittle one with your knife`:'Find a straight branch under the trees',[['whittle','Whittle',kit.branches>0],['throw','Throw',rabbit&&kit.sticks>0]]);
 // Sleep is only a full night under a basha; anywhere else it is short and broken.
 const warm=fire?'by the fire':kit.has('bedroll')?'in your bag':'needs a fire or a sleeping bag';
 row('sleep','Camp',`${shelter?'Under your basha':`No basha · ${kit.branches} of ${BASHA_BRANCHES} branches`} · ${sleepable?warm:'sleep after 19:30'}`,[['pitch',shelter?'Basha up':'Pitch basha',!shelter&&canPitch&&kit.branches>=BASHA_BRANCHES],['sleep',shelter?'Sleep':'Sleep rough',sleepable]]);
 return rows;
}
const GEAR=[['hatchet','hatchet'],['firesteel','fire steel'],['filter','water filter'],['stove','stove and mess tin'],['waterproof','waterproof'],['bedroll','sleeping bag']];

// One backpack for every input: Tab or I on a keyboard, right stick click on Xbox, or the BAG
// button on screen. Rebuilt only when what it shows changes; arrow keys or the D-pad move
// between actions and Enter, Space or A uses one.
export class InventoryView {
 constructor(kit,{enabled,near,actions={},onClose=()=>{}}){
  this.kit=kit;this.near=near;this.actions=actions;this.onClose=onClose;
  this.root=document.querySelector('#kit-menu');this.sheet=this.root.querySelector('#kit-sheet');this.toggleButton=this.root.querySelector('#kit-toggle');this.body=this.sheet.querySelector('#kit-contents');this.messageLine=this.sheet.querySelector('#kit-message');
  this.root.hidden=false;this.toggleButton.hidden=false;this.toggleButton.innerHTML=enabled?'BAG':'BAG <kbd>Tab</kbd>';this.toggleButton.title='Open your bergen (Tab or I)';this.rendered='';
  this.toggleButton.onclick=()=>this.open?this.close():this.show();
  this.sheet.querySelector('[data-kit="close"]').onclick=()=>this.close();
  // The bergen itself sits at the top: rearrange it to make room for wood and game.
  this.bergenView=typeof document.createElement==='function'?new BergenView(this.sheet.querySelector('#kit-bergen'),kit.bergen,{cell:enabled?30:32,onChange:()=>{this.rendered='';this.render();}}):null;this.layoutKey='';
  this.body.onclick=e=>{const button=e.target.closest?.('button[data-act]');if(button&&!button.disabled)this.use(button.dataset.act);};
 }
 get open(){return !this.sheet.hidden;}
 show(){this.sheet.hidden=false;this.toggleButton.setAttribute('aria-expanded','true');this.rendered='';this.render();this.focusFirst();}
 hide(){this.bergenView?.cancel();if(this.sheet.hidden)return;this.sheet.hidden=true;this.toggleButton.setAttribute('aria-expanded','false');}
 close(){if(!this.open)return;this.hide();this.onClose();}
 use(act){const fn=this.actions[act];if(!fn)return;fn();this.render();}
 // Called from the HUD tick; rewrites the sheet only when something it shows has changed.
 render(){
  if(!this.open)return;
  if(this.bergenView&&!this.bergenView.hand){const key=this.kit.bergen.items.map(o=>`${o.uid}${o.id}${o.x}${o.y}${o.turned}`).join();if(key!==this.layoutKey){this.layoutKey=key;this.bergenView.render();}}
  const kit=this.kit,rows=backpackRows(kit,this.near()),gear=GEAR.filter(([id])=>kit.has(id)).map(([,name])=>name);
  const condition=[['Hydration',hydrationWord(kit.hydration)],['Energy',energyWord(kit.energy)],['Warmth',warmthWord(kit.warmth)],['Sleep',fatigueWord(kit.awake)]];
  const html=`<p class="kit-condition">${condition.map(([k,v])=>`<span>${k} <b>${v}</b></span>`).join('')}${kit.sick>0?'<span><b>Unwell</b></span>':''}</p>`+
   rows.map(r=>`<div class="kit-row"><div><strong>${r.name}</strong><small>${r.detail}</small></div><div class="kit-acts">${r.actions.map(a=>`<button type="button" data-act="${a.act}"${a.enabled?'':' disabled'}>${a.label}</button>`).join('')}</div></div>`).join('')+
   `<p class="kit-gear">${gear.length?`Also carrying ${gear.join(', ')}`:'No other gear'} · ${kit.weight.toFixed(1)} kg</p>`;
  if(html!==this.rendered){const focused=document.activeElement?.dataset?.act;this.rendered=html;this.body.innerHTML=html;if(focused)this.focus(focused);}
  if(this.messageLine.textContent!==kit.message)this.messageLine.textContent=kit.message;
 }
 buttons(){return [...this.body.querySelectorAll('button[data-act]:not(:disabled)')];}
 focus(act){const b=this.body.querySelector(`button[data-act="${act}"]:not(:disabled)`)??this.buttons()[0];b?.focus({preventScroll:false});}
 focusFirst(){this.buttons()[0]?.focus();}
 // Step through usable actions in reading order.
 move(step){const list=this.buttons();if(!list.length)return;const i=list.indexOf(document.activeElement);list[(i+step+list.length)%list.length].focus();}
 activate(){const b=document.activeElement;if(b?.dataset?.act&&!b.disabled)this.use(b.dataset.act);}
}
