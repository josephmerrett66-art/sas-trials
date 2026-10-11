import {hydrationWord,energyWord} from './kit.js?v=1';

// Touch only: keyboard and Xbox players already have V, B and G. One button opens a small
// paper sheet with the bergen's contents and the actions that need a key elsewhere.
export class InventoryView {
 constructor(kit,{enabled,drink,eat,fill,register,near}){
  this.kit=kit;this.near=near;this.root=document.querySelector('#kit-menu');this.sheet=this.root.querySelector('#kit-sheet');this.toggleButton=this.root.querySelector('#kit-toggle');
  this.root.hidden=!enabled;this.rendered='';
  const act=fn=>()=>{fn();this.render();};
  this.toggleButton.onclick=()=>this.sheet.hidden?this.show():this.hide();
  this.root.querySelector('[data-kit="close"]').onclick=()=>this.hide();
  this.buttons={drink:this.root.querySelector('[data-kit="drink"]'),eat:this.root.querySelector('[data-kit="eat"]'),fill:this.root.querySelector('[data-kit="fill"]'),register:this.root.querySelector('[data-kit="register"]')};
  this.buttons.drink.onclick=act(drink);this.buttons.eat.onclick=act(eat);this.buttons.fill.onclick=act(fill);this.buttons.register.onclick=act(register);
 }
 get open(){return !this.root.hidden&&!this.sheet.hidden;}
 show(){this.sheet.hidden=false;this.toggleButton.setAttribute('aria-expanded','true');this.render();}
 hide(){this.sheet.hidden=true;this.toggleButton.setAttribute('aria-expanded','false');}
 // Called from the HUD tick; rewrites the sheet only when something it shows has changed.
 render(){
  if(!this.open)return;
  const kit=this.kit,{spring,post}=this.near();
  const state=`${kit.water.toFixed(1)}|${kit.rations}|${hydrationWord(kit.hydration)}|${energyWord(kit.energy)}|${kit.sick>0}|${!!spring}|${post?.code??''}|${kit.message}`;
  if(state===this.rendered)return;this.rendered=state;
  this.sheet.querySelector('#kit-contents').innerHTML=`<span>Water <b>${kit.water.toFixed(1)} L</b></span><span>Rations <b>${kit.rations}</b></span><span>Hydration <b>${hydrationWord(kit.hydration)}</b></span><span>Energy <b>${energyWord(kit.energy)}</b></span>${kit.sick>0?'<span><b>Unwell</b></span>':''}`;
  this.sheet.querySelector('#kit-message').textContent=kit.message;
  this.buttons.drink.disabled=kit.water<=.001;this.buttons.eat.disabled=kit.rations<=0;
  this.buttons.fill.disabled=!spring;this.buttons.fill.textContent=spring?'Fill at spring':'No spring here';
  this.buttons.register.hidden=!post;this.buttons.register.textContent=post?`Register post ${post.code}`:'';
 }
}
