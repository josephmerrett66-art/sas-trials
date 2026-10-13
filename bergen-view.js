import {BergenGrid,LABELS} from './bergen-grid.js?v=sticks-1';

// Draws the bergen grid and lets you move blocks around it.
// Mouse or touch: drag a block (or tap it, then tap where it goes). R, right click or the
// Turn button turns the block in hand. Keyboard: Enter picks up, arrows move, Enter drops.
// With a tray (packing), blocks come from the tray and dropping one outside unpacks it.
// Without one (on the move), you can only rearrange.
export class BergenView {
 constructor(container,grid,{tray=null,cell=40,canAdd=()=>true,onChange=()=>{}}={}){
  this.grid=grid;this.tray=tray;this.cell=cell;this.canAdd=canAdd;this.onChange=onChange;this.hand=null;
  this.root=document.createElement('div');this.root.className='bergen';this.root.style.setProperty('--cell',`${cell}px`);
  this.board=document.createElement('div');this.board.className='bergen-board';this.board.style.width=`${grid.cols*cell}px`;this.board.style.height=`${grid.rows*cell}px`;this.board.setAttribute('role','grid');this.board.tabIndex=0;this.board.setAttribute('aria-label',`Bergen, ${grid.cols} by ${grid.rows}`);
  this.ghost=document.createElement('div');this.ghost.className='bergen-item ghost';this.ghost.hidden=true;
  this.tools=document.createElement('div');this.tools.className='bergen-tools';this.tools.innerHTML='<button type="button" data-turn>Turn · R</button><span></span>';
  this.status=this.tools.querySelector('span');this.tools.querySelector('[data-turn]').onclick=()=>this.turn();
  this.root.append(this.board,this.tools);this.board.append(this.ghost);container.append(this.root);
  this.board.addEventListener('contextmenu',e=>{if(this.hand){e.preventDefault();this.turn();}});
  this.board.addEventListener('pointerdown',e=>this.down(e));
  window.addEventListener('pointermove',e=>this.moveTo(e));window.addEventListener('pointerup',e=>this.up(e));
  // Holding a block after a tap: tapping anywhere else puts it back (or unpacks it).
  window.addEventListener('pointerdown',e=>{const h=this.hand;if(!h||h.drag||h.keyboard||this.root.contains(e.target)||this.tray?.contains(e.target))return;h.outside=true;this.drop();},true);
  this.root.addEventListener('keydown',e=>this.key(e));
  if(tray)for(const button of tray.querySelectorAll('[data-add]'))button.addEventListener('pointerdown',e=>{if(e.button)return;e.preventDefault();this.take(button.dataset.add,e);});
  if(tray)for(const button of tray.querySelectorAll('[data-add]'))button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.take(button.dataset.add,null);}});
  this.render();
 }
 // Pick up a new item from the tray.
 take(id,e){if(this.hand||!this.canAdd(id))return;const spot=this.grid.spot(id)??{x:0,y:0,turned:false};this.hand={id,item:null,x:spot.x,y:spot.y,turned:spot.turned,from:null,grab:{x:.5,y:.5},drag:!!e,start:e?{x:e.clientX,y:e.clientY}:null,moved:false,keyboard:!e};if(e)this.follow(e.clientX,e.clientY);this.render();if(!e)this.board.focus();}
 down(e){
  if(e.button===2)return;
  const target=e.target.closest('.bergen-item:not(.ghost)');
  if(this.hand){e.preventDefault();this.follow(e.clientX,e.clientY);this.hand.drag=true;this.hand.start={x:e.clientX,y:e.clientY};this.hand.moved=true;return;}
  if(!target)return;e.preventDefault();
  const item=this.grid.items.find(o=>o.uid===Number(target.dataset.uid)),r=target.getBoundingClientRect();
  this.hand={id:item.id,item,x:item.x,y:item.y,turned:item.turned,from:{x:item.x,y:item.y,turned:item.turned},grab:{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height},drag:true,start:{x:e.clientX,y:e.clientY},moved:false};
  this.render();
 }
 // Cell under the block's top-left corner, keeping the point you grabbed under the pointer.
 follow(px,py){const h=this.hand,b=this.board.getBoundingClientRect(),[w,hh]=BergenGrid.size(h.id,h.turned);h.x=Math.round((px-b.left)/this.cell-h.grab.x*w);h.y=Math.round((py-b.top)/this.cell-h.grab.y*hh);h.outside=px<b.left-this.cell*.5||px>b.right+this.cell*.5||py<b.top-this.cell*.5||py>b.bottom+this.cell*.5;h.px=px;h.py=py;}
 moveTo(e){const h=this.hand;if(!h||h.keyboard)return;if(h.drag&&h.start&&Math.hypot(e.clientX-h.start.x,e.clientY-h.start.y)>6)h.moved=true;this.follow(e.clientX,e.clientY);this.render();}
 up(e){
  const h=this.hand;if(!h||h.keyboard||!h.drag)return;h.drag=false;
  // A tap without moving keeps the block in hand; tap again where it should go.
  if(!h.moved)return this.render();
  this.drop();
 }
 drop(){
  const h=this.hand;if(!h)return;
  if(h.outside&&this.tray&&h.item){this.grid.remove(h.item);this.done('Unpacked');return;}
  if(h.outside&&!h.item){this.done();return;}
  if(this.grid.fits(h.id,h.x,h.y,h.turned,h.item)){if(h.item)this.grid.move(h.item,h.x,h.y,h.turned);else this.grid.place(h.id,h.x,h.y,h.turned);this.done();return;}
  // Does not fit there: it goes back where it was (or back to the tray).
  this.done(h.item?'No room there':'No room there');
 }
 done(message=''){this.hand=null;this.status.textContent=message;this.render();this.onChange();}
 cancel(){if(this.hand){this.hand=null;this.render();}}
 turn(){const h=this.hand;if(!h)return;h.turned=!h.turned;if(h.px!==undefined&&!h.keyboard)this.follow(h.px,h.py);this.render();}
 key(e){
  const h=this.hand;
  if(e.key==='r'||e.key==='R'){if(h){e.preventDefault();this.turn();}return;}
  if(!h){if((e.key==='Enter'||e.key===' ')&&e.target.dataset?.uid){e.preventDefault();const item=this.grid.items.find(o=>o.uid===Number(e.target.dataset.uid));this.hand={id:item.id,item,x:item.x,y:item.y,turned:item.turned,keyboard:true,grab:{x:0,y:0}};this.render();this.board.focus();}return;}
  if(!h.keyboard)return;
  const step={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
  if(step){e.preventDefault();e.stopPropagation();h.x=Math.max(0,Math.min(this.grid.cols-1,h.x+step[0]));h.y=Math.max(0,Math.min(this.grid.rows-1,h.y+step[1]));this.render();return;}
  if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();h.outside=false;this.drop();return;}
  if(e.key==='Escape'||e.key==='Backspace'||e.key==='Delete'){e.preventDefault();e.stopPropagation();if(this.tray&&h.item&&e.key!=='Escape'){this.grid.remove(h.item);this.done('Unpacked');}else this.done();}
 }
 block(el,id,x,y,turned){const [w,h]=BergenGrid.size(id,turned);el.style.transform=`translate(${x*this.cell}px,${y*this.cell}px)`;el.style.width=`${w*this.cell-4}px`;el.style.height=`${h*this.cell-4}px`;el.dataset.kind=id;el.classList.toggle('tall',h>w);}
 render(){
  const h=this.hand,existing=new Map([...this.board.querySelectorAll('.bergen-item:not(.ghost)')].map(el=>[Number(el.dataset.uid),el]));
  for(const item of this.grid.items){let el=existing.get(item.uid);existing.delete(item.uid);
   if(!el){el=document.createElement('div');el.className='bergen-item';el.dataset.uid=item.uid;el.tabIndex=0;el.setAttribute('role','gridcell');this.board.append(el);}
   el.textContent=LABELS[item.id];el.setAttribute('aria-label',`${LABELS[item.id]}, column ${item.x+1}, row ${item.y+1}`);this.block(el,item.id,item.x,item.y,item.turned);el.classList.toggle('lifted',h?.item===item);}
  for(const el of existing.values())el.remove();
  this.ghost.hidden=!h||(h.outside&&!h.keyboard);
  if(h){this.block(this.ghost,h.id,h.x,h.y,h.turned);this.ghost.textContent=LABELS[h.id];const ok=this.grid.fits(h.id,h.x,h.y,h.turned,h.item);this.ghost.classList.toggle('blocked',!ok);this.status.textContent=h.outside?(this.tray&&h.item?'Let go to unpack':'Let go to put it back'):ok?'Drop to pack it here':'No room there';}
  this.tools.querySelector('[data-turn]').disabled=!h;
  this.root.classList.toggle('holding',!!h);
 }
}
