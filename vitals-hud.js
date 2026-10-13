// Four slim bars in the bottom-left corner: health, stamina, food and water.
// Updated at the HUD rate (10 Hz); a bar only touches the DOM when its value moves.
// The panel is always on screen while you play.
const BARS=[['health','Health'],['stamina','Stamina'],['food','Food'],['water','Water']];
export class VitalsHud {
 constructor(parent=document.body){
  this.root=document.createElement('div');this.root.id='vitals';this.root.setAttribute('aria-label','Condition');this.root.hidden=true;
  this.bars=BARS.map(([id,label])=>{const row=document.createElement('div');row.className='vital';row.dataset.vital=id;row.innerHTML=`<span>${label}</span><i><b></b></i>`;this.root.appendChild(row);return {id,row,fill:row.querySelector('b'),value:-1,low:null};});
  parent.appendChild(this.root);
 }
 update(show,kit,player){
  if(this.root.hidden===show)this.root.hidden=!show;if(!show)return;
  const values={health:kit.health,stamina:player.stamina,food:kit.energy,water:kit.hydration};
  for(const bar of this.bars){const v=Math.round(Math.max(0,Math.min(100,values[bar.id])));if(v===bar.value)continue;bar.value=v;bar.fill.style.transform=`scaleX(${v/100})`;const low=v<25||(bar.id==='stamina'&&player.winded);if(low!==bar.low){bar.low=low;bar.row.classList.toggle('low',low);}}
 }
}
