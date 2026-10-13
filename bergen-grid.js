// The bergen as a physical space: a grid of cells, and every item a block that must fit.
// Pure state, testable in node. Sizes are cells wide × tall when not turned.
export const COLS=6,ROWS=7;
export const SHAPES={water:[1,2],rations:[2,1],filter:[1,1],waterproof:[3,2],stove:[2,2],firesteel:[1,1],bedroll:[2,4],snares:[1,1],wood:[1,3],raw:[2,1],cooked:[2,1],branch:[1,3],stick:[1,3],hatchet:[1,2],tinder:[1,1]};
export const LABELS={water:'Water',rations:'Ration',filter:'Filter',waterproof:'Jacket',stove:'Stove',firesteel:'Steel',bedroll:'Sleeping bag',snares:'Snare',wood:'Wood',raw:'Rabbit',cooked:'Cooked',branch:'Branch',stick:'Stick',hatchet:'Hatchet',tinder:'Tinder'};

export class BergenGrid {
 constructor(cols=COLS,rows=ROWS){this.cols=cols;this.rows=rows;this.items=[];this.next=1;}
 static size(id,turned){const [w,h]=SHAPES[id];return turned?[h,w]:[w,h];}
 size(item){return BergenGrid.size(item.id,item.turned);}
 // Whether a block of this item fits at x,y, ignoring one item (the one being moved).
 fits(id,x,y,turned=false,ignore=null){
  const [w,h]=BergenGrid.size(id,turned);
  if(x<0||y<0||x+w>this.cols||y+h>this.rows)return false;
  for(const o of this.items){if(o===ignore||o.uid===ignore)continue;const [ow,oh]=this.size(o);if(x<o.x+ow&&o.x<x+w&&y<o.y+oh&&o.y<y+h)return false;}
  return true;
 }
 place(id,x,y,turned=false){if(!this.fits(id,x,y,turned))return null;const item={uid:this.next++,id,x,y,turned};this.items.push(item);return item;}
 // First free spot, reading left to right, top to bottom, either way round.
 spot(id){for(const turned of SHAPES[id][0]===SHAPES[id][1]?[false]:[false,true])for(let y=0;y<this.rows;y++)for(let x=0;x<this.cols;x++)if(this.fits(id,x,y,turned))return {x,y,turned};return null;}
 autoPlace(id){const s=this.spot(id);return s?this.place(id,s.x,s.y,s.turned):null;}
 move(item,x,y,turned){if(!this.fits(item.id,x,y,turned,item))return false;Object.assign(item,{x,y,turned});return true;}
 remove(item){const i=this.items.indexOf(item);if(i>=0)this.items.splice(i,1);return i>=0;}
 // Takes out the most recently packed one of a kind.
 removeOne(id){for(let i=this.items.length-1;i>=0;i--)if(this.items[i].id===id){this.items.splice(i,1);return true;}return false;}
 count(id){let n=0;for(const o of this.items)if(o.id===id)n++;return n;}
 setCount(id,n){while(this.count(id)>n)this.removeOne(id);while(this.count(id)<n)if(!this.autoPlace(id))return false;return true;}
 // Changes the most recently packed one of a kind into another of the same shape.
 convertOne(from,to){for(let i=this.items.length-1;i>=0;i--)if(this.items[i].id===from){this.items[i].id=to;return true;}return false;}
 convert(from,to){let n=0;for(const o of this.items)if(o.id===from){o.id=to;n++;}return n;}
 // Whether all of these would fit at once without moving anything.
 roomFor(ids){const trial=this.copy();return ids.every(id=>trial.autoPlace(id));}
 get freeCells(){let used=0;for(const o of this.items){const [w,h]=this.size(o);used+=w*h;}return this.cols*this.rows-used;}
 save(){return this.items.map(({id,x,y,turned})=>({id,x,y,turned}));}
 load(saved){this.items=[];for(const s of saved)this.place(s.id,s.x,s.y,s.turned);}
 copy(){const g=new BergenGrid(this.cols,this.rows);g.load(this.save());return g;}
}
