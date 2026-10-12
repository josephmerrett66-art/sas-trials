import {hydrationWord,energyWord,warmthWord,fatigueWord} from './kit.js?v=camp-1';

// Touch only: keyboard and Xbox players already have V, B and G. One button opens a small
// paper sheet with the bergen's contents and the actions that need a key elsewhere.
export class InventoryView {
 constructor(kit,{enabled,drink,eat,fill,register,near,wood=()=>{},fire=()=>{},sleep=()=>{},snare=()=>{}}){
  this.kit=kit;this.near=near;this.root=document.querySelector('#kit-menu');this.sheet=this.root.querySelector('#kit-sheet');this.toggleButton=this.root.querySelector('#kit-toggle');
  this.root.hidden=!enabled;this.rendered='';
  const act=fn=>()=>{fn();this.render();};
  this.toggleButton.onclick=()=>this.sheet.hidden?this.show():this.hide();
  this.root.querySelector('[data-kit="close"]').onclick=()=>this.hide();
  const actions={drink,eat,fill,register,wood,fire,sleep,snare};this.buttons={};
  for(const [name,fn] of Object.entries(actions)){const button=this.root.querySelector(`[data-kit="${name}"]`);if(!button)continue;this.buttons[name]=button;button.onclick=act(fn);}
 }
 get open(){return !this.root.hidden&&!this.sheet.hidden;}
 show(){this.sheet.hidden=false;this.toggleButton.setAttribute('aria-expanded','true');this.render();}
 hide(){this.sheet.hidden=true;this.toggleButton.setAttribute('aria-expanded','false');}
 // Called from the HUD tick; rewrites the sheet only when something it shows has changed.
 render(){
  if(!this.open)return;
  const kit=this.kit,{spring,post,fire=false,snare=null,tree=false,rabbit=false,sleepable=false}=this.near();
  const state=`${kit.water.toFixed(1)}|${kit.rations}|${kit.cooked}|${kit.raw}|${kit.wood}|${kit.snares}|${hydrationWord(kit.hydration)}|${energyWord(kit.energy)}|${warmthWord(kit.warmth)}|${fatigueWord(kit.awake)}|${kit.sick>0}|${!!spring}|${post?.code??''}|${fire}|${!!snare}|${tree}|${rabbit}|${sleepable}|${kit.message}`;
  if(state===this.rendered)return;this.rendered=state;
  this.sheet.querySelector('#kit-contents').innerHTML=`<span>Water <b>${kit.water.toFixed(1)} L</b></span><span>Rations <b>${kit.rations}</b></span><span>Hydration <b>${hydrationWord(kit.hydration)}</b></span><span>Energy <b>${energyWord(kit.energy)}</b></span><span>Warmth <b>${warmthWord(kit.warmth)}</b></span><span>Sleep <b>${fatigueWord(kit.awake)}</b></span><span>Wood <b>${kit.wood}</b></span><span>Rabbit <b>${kit.cooked} cooked${kit.raw?`, ${kit.raw} raw`:''}</b></span><span>Snares <b>${kit.snares}</b></span>${kit.sick>0?'<span><b>Unwell</b></span>':''}`;
  this.sheet.querySelector('#kit-message').textContent=kit.message;
  this.buttons.drink.disabled=kit.water<=.001;this.buttons.eat.disabled=kit.rations<=0&&kit.cooked<=0&&kit.raw<=0;
  this.buttons.fill.disabled=!spring;this.buttons.fill.textContent=spring?'Fill bottles':'No water here';
  const b=this.buttons;
  if(b.wood){b.wood.disabled=!(tree||rabbit||snare||(fire&&kit.wood>0));b.wood.textContent=snare?'Lift snare':rabbit?'Throw stick':fire&&kit.wood>0?'Add wood':'Gather wood';}
  if(b.fire){b.fire.textContent=fire?'Cook':'Light fire';b.fire.disabled=!fire&&(kit.wood<2||!kit.has('firesteel'));}
  if(b.snare)b.snare.disabled=kit.snares<=0;if(b.sleep)b.sleep.disabled=!sleepable;
  this.buttons.register.hidden=!post;this.buttons.register.textContent=post?`Register post ${post.code}`:'';
 }
}
