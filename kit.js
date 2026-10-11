// Bergen packing and field condition. Pure state: no DOM or rendering, so it can be tested in node.
export const BASE_WEIGHT=6; // bergen, clothing, map, compass and torch
export const ITEMS=[
 {id:'water',name:'Water bottle (1 L, full)',note:'Drink on the move. Refill at springs and rivers.',weight:1.15,max:6,start:2},
 {id:'rations',name:'Ration pack',note:'Restores energy.',weight:.6,max:6,start:2},
 {id:'filter',name:'Water filter',note:'Spring water is safe to drink.',weight:.3,max:1,start:1},
 {id:'waterproof',name:'Waterproof jacket',note:'Rain no longer saps your energy.',weight:1.1,max:1,start:0},
 {id:'stove',name:'Stove and fuel',note:'Hot rations restore more energy.',weight:1.4,max:1,start:0}
];
export const LITRE=1,BOTTLE_EMPTY=.15,RATION_WEIGHT=.6;
const THIRST_SECONDS=14*60,HUNGER_SECONDS=28*60,WITHDRAW_SECONDS=60,SICK_SECONDS=180,DRINK=.5;
export const defaultLoadout=()=>Object.fromEntries(ITEMS.map(item=>[item.id,item.start]));
export function packWeight(loadout){return BASE_WEIGHT+ITEMS.reduce((sum,item)=>sum+item.weight*(loadout[item.id]??0),0);}
// Light loads walk at full pace; every kilogram past 8 kg costs about 3%, down to 60%.
export function loadPace(weight){return 1-Math.min(1,Math.max(0,(weight-8)/14))*.4;}
const conditionPace=value=>value>=30?1:.7+.3*value/30;
export const hydrationWord=v=>v>60?'Good':v>30?'Thirsty':v>0?'Parched':'Dehydrated';
export const energyWord=v=>v>60?'Good':v>30?'Hungry':v>0?'Weak':'Exhausted';

export class FieldKit {
 constructor(random=Math.random){this.random=random;this.loadout=defaultLoadout();this.reset();}
 reset(){this.packed=false;this.hydration=100;this.energy=100;this.water=0;this.untreated=0;this.rations=0;this.sick=0;this.empty=0;this.withdrawn=null;this.message='';this.time=0;}
 set(id,count){const item=ITEMS.find(i=>i.id===id);if(!item||this.packed)return;this.loadout[id]=Math.max(0,Math.min(item.max,Math.round(count)));}
 get bottles(){return this.loadout.water;}
 has(id){return (this.loadout[id]??0)>0;}
 pack(){this.packed=true;this.water=this.bottles*LITRE;this.untreated=0;this.rations=this.loadout.rations;this.message=`Packed ${this.weight.toFixed(1)} kg`;}
 // Live weight falls as water is drunk and rations are eaten.
 get weight(){if(!this.packed)return packWeight(this.loadout);return BASE_WEIGHT+this.bottles*BOTTLE_EMPTY+this.water+this.rations*RATION_WEIGHT+ITEMS.filter(i=>!['water','rations'].includes(i.id)).reduce((sum,i)=>sum+i.weight*this.loadout[i.id],0);}
 get pace(){return loadPace(this.weight)*Math.min(conditionPace(this.hydration),conditionPace(this.energy));}
 drink(){
  if(!this.packed||this.withdrawn)return false;
  if(this.water<=.001){this.message=this.bottles?'Bottles empty. Refill at a spring.':'No water carried.';return false;}
  const amount=Math.min(DRINK,this.water),fromUntreated=Math.min(amount,this.untreated);
  this.water-=amount;this.untreated-=fromUntreated;this.hydration=Math.min(100,this.hydration+60*amount);
  if(fromUntreated>0&&this.random()<.4){this.sick=SICK_SECONDS;this.message='Drank untreated water. Your stomach turns.';}
  else this.message=`Drank ${amount.toFixed(1)} L · ${this.water.toFixed(1)} L left`;
  return true;
 }
 eat(){
  if(!this.packed||this.withdrawn)return false;
  if(this.rations<=0){this.message='No rations left.';return false;}
  this.rations--;const hot=this.has('stove');this.energy=Math.min(100,this.energy+(hot?55:35));
  this.message=`${hot?'Hot ration':'Cold ration'} eaten · ${this.rations} left`;return true;
 }
 refill(){
  if(!this.packed||this.withdrawn)return false;
  if(!this.bottles){this.message='No bottles to fill. You drink from the spring.';this.hydration=Math.min(100,this.hydration+30);if(!this.has('filter')&&this.random()<.4)this.sick=SICK_SECONDS;return true;}
  const added=this.bottles*LITRE-this.water;if(added<=.001){this.message='Bottles already full.';return false;}
  this.water+=added;if(!this.has('filter'))this.untreated+=added;
  this.message=this.has('filter')?`Filtered ${added.toFixed(1)} L`:`Filled ${added.toFixed(1)} L of untreated water`;return true;
 }
 // effort: 0 standing, 1 walking, about 1.6 sprinting. climb: metres gained this step.
 step(dt,{effort=1,climb=0,rain=0}={}){
  if(!this.packed||this.withdrawn||dt<=0)return;
  this.time+=dt;this.sick=Math.max(0,this.sick-dt);
  const load=.85+this.weight/40,work=.35+.65*effort+Math.max(0,climb)/Math.max(dt,1e-6)*.25;
  this.hydration=Math.max(0,this.hydration-dt*100/THIRST_SECONDS*work*load*(this.sick>0?2:1));
  this.energy=Math.max(0,this.energy-dt*100/HUNGER_SECONDS*work*load*(1+(this.has('waterproof')?0:.5*rain)));
  if(this.hydration<=0||this.energy<=0){this.empty+=dt;if(this.empty>=WITHDRAW_SECONDS)this.withdrawn=this.hydration<=0?'Severe dehydration':'Exhaustion';}else this.empty=0;
 }
 // Short pencilled notes for the held chart. Words, not gauges: changes only on band shifts.
 get notes(){return `Pack ${Math.round(this.weight)} kg · ${this.water.toFixed(1)} L · ${this.rations} rations · Hydration ${hydrationWord(this.hydration)} · Energy ${energyWord(this.energy)}${this.sick>0?' · Unwell':''}`;}
 // 0 when fine, rising to 1 as either need runs out. Drives the screen-edge vignette.
 get strain(){return Math.max(0,1-Math.min(this.hydration,this.energy)/30);}
}
