import {BergenGrid} from './bergen-grid.js?v=sticks-1';
// Bergen packing and field condition. Pure state: no DOM or rendering, so it can be tested in node.
export const BASE_WEIGHT=6; // bergen, clothing, map, compass, torch and knife
export const ITEMS=[
 {id:'water',name:'Water bottle (1 L, full)',note:'Drink on the move. Refill at springs and rivers.',weight:1.15,max:6,start:2},
 {id:'rations',name:'Ration pack',note:'Restores energy. Hunt to make them last.',weight:.6,max:6,start:1},
 {id:'filter',name:'Water filter',note:'Spring water is safe to drink.',weight:.3,max:1,start:1},
 {id:'waterproof',name:'Waterproof jacket',note:'Rain no longer saps your energy.',weight:1.1,max:1,start:0},
 {id:'stove',name:'Stove and mess tin',note:'Hot rations restore more energy. Boil water at a fire.',weight:1.4,max:1,start:0},
 {id:'firesteel',name:'Fire steel',note:'Light a fire from gathered wood.',weight:.1,max:1,start:1},
 {id:'bedroll',name:'Sleeping bag and bivvy',note:'Sleep warm without a fire.',weight:1.8,max:1,start:0},
 {id:'snares',name:'Snare wire',note:'Set a snare and come back for a rabbit.',weight:.1,max:4,start:2}
];
export const LITRE=1,BOTTLE_EMPTY=.15,RATION_WEIGHT=.6,WOOD_WEIGHT=.8,MEAT_WEIGHT=.5,MAX_WOOD=5,BRANCH_WEIGHT=.35;
// Hours of burn per bundle of firewood, and how long a fire may be stocked for.
export const BURN_PER_WOOD=1.5,MAX_FUEL=8;
const THIRST_SECONDS=14*60,HUNGER_SECONDS=20*60,WITHDRAW_SECONDS=60,SICK_SECONDS=180,DRINK=.5;
export const defaultLoadout=()=>Object.fromEntries(ITEMS.map(item=>[item.id,item.start]));
export function packWeight(loadout){return BASE_WEIGHT+ITEMS.reduce((sum,item)=>sum+item.weight*(loadout[item.id]??0),0);}
// Light loads walk at full pace; every kilogram past 8 kg costs about 3%, down to 60%.
export function loadPace(weight){return 1-Math.min(1,Math.max(0,(weight-8)/14))*.4;}
const conditionPace=value=>value>=30?1:.7+.3*value/30;
export const hydrationWord=v=>v>60?'Good':v>30?'Thirsty':v>0?'Parched':'Dehydrated';
export const energyWord=v=>v>60?'Good':v>30?'Hungry':v>0?'Weak':'Exhausted';
export const warmthWord=v=>v>60?'Warm':v>30?'Cold':v>0?'Shivering':'Hypothermic';
// Fatigue counts hours awake: fine for a long day, then tired, then unable to go on.
export const TIRED_HOURS=16,SPENT_HOURS=26;
export const fatigueWord=h=>h<TIRED_HOURS?'Rested':h<21?'Tired':'Exhausted';
const fatiguePace=h=>h<TIRED_HOURS?1:1-.35*Math.min(1,(h-TIRED_HOURS)/(SPENT_HOURS-TIRED_HOURS));

export class FieldKit {
 // Everything carried lives in the bergen grid: the packing list is just what fits in it.
 constructor(random=Math.random){this.random=random;this.bergen=new BergenGrid();this.layout=null;for(const [id,n] of Object.entries(defaultLoadout()))this.bergen.setCount(id,n);this.reset();}
 // A new attempt repacks the bergen exactly as it was last packed.
 reset(){if(this.layout)this.bergen.load(this.layout);this.packed=false;this.hydration=100;this.energy=100;this.warmth=100;this.awake=2;this.wet=0;this.wood=0;this.raw=0;this.cooked=0;this.water=0;this.untreated=0;this.sick=0;this.empty=0;this.cold=0;this.withdrawn=null;this.message='';this.time=0;}
 get loadout(){return Object.fromEntries(ITEMS.map(i=>[i.id,this.bergen.count(i.id)]));}
 // Adds or removes items at the first free spot. False when there is no room for more.
 set(id,count){const item=ITEMS.find(i=>i.id===id);if(!item||this.packed)return false;return this.bergen.setCount(id,Math.max(0,Math.min(item.max,Math.round(count))));}
 // Food, wood and snares carried are the blocks in the bergen.
 get rations(){return this.bergen.count('rations');}set rations(n){this.bergen.setCount('rations',n);}
 get snares(){return this.bergen.count('snares');}set snares(n){this.bergen.setCount('snares',n);}
 get wood(){return this.bergen.count('wood');}set wood(n){this.bergen.setCount('wood',n);}
 get raw(){return this.bergen.count('raw');}set raw(n){this.bergen.setCount('raw',n);}
 get cooked(){return this.bergen.count('cooked');}set cooked(n){this.bergen.setCount('cooked',n);}
 get branches(){return this.bergen.count('branch');}set branches(n){this.bergen.setCount('branch',n);}
 get sticks(){return this.bergen.count('stick');}set sticks(n){this.bergen.setCount('stick',n);}
 roomFor(ids){return this.bergen.roomFor(ids);}
 get bottles(){return this.loadout.water;}
 has(id){return (this.loadout[id]??0)>0;}
 pack(){this.layout=this.bergen.save();this.packed=true;this.water=this.bottles*LITRE;this.untreated=0;this.message=`Packed ${this.weight.toFixed(1)} kg`;}
 // Live weight falls as water is drunk and rations are eaten.
 get weight(){if(!this.packed)return packWeight(this.loadout);return BASE_WEIGHT+this.bottles*BOTTLE_EMPTY+this.water+this.rations*RATION_WEIGHT+this.wood*WOOD_WEIGHT+(this.raw+this.cooked)*MEAT_WEIGHT+(this.branches+this.sticks)*BRANCH_WEIGHT+ITEMS.filter(i=>!['water','rations'].includes(i.id)).reduce((sum,i)=>sum+i.weight*this.loadout[i.id],0);}
 get pace(){return loadPace(this.weight)*Math.min(conditionPace(this.hydration),conditionPace(this.energy),conditionPace(this.warmth))*fatiguePace(this.awake);}
 drink(){
  if(!this.packed||this.withdrawn)return false;
  if(this.water<=.001){this.message=this.bottles?'Bottles empty. Refill at a spring.':'No water carried.';return false;}
  const amount=Math.min(DRINK,this.water),fromUntreated=Math.min(amount,this.untreated);
  this.water-=amount;this.untreated-=fromUntreated;this.hydration=Math.min(100,this.hydration+60*amount);
  if(fromUntreated>0&&this.random()<.4){this.sick=SICK_SECONDS;this.message='Drank untreated water. Your stomach turns.';}
  else this.message=`Drank ${amount.toFixed(1)} L · ${this.water.toFixed(1)} L left`;
  return true;
 }
 // Cooked meat first, then rations, and raw meat only when nothing else is left.
 // Without a choice: cooked rabbit, then rations, then raw meat. The backpack can pick one.
 eat(kind=null){
  if(!this.packed||this.withdrawn)return false;
  if(kind==='raw'&&this.raw<=0){this.message='No raw meat.';return false;}
  const rawOnly=kind==='raw'||(this.cooked<=0&&this.rations<=0);
  if(kind==='ration'&&this.rations<=0){this.message='No rations left.';return false;}
  if(kind==='cooked'&&this.cooked<=0){this.message='No cooked meat.';return false;}
  if(!rawOnly&&this.cooked>0&&kind!=='ration'){this.cooked--;this.energy=Math.min(100,this.energy+45);this.warmth=Math.min(100,this.warmth+10);this.message=`Ate cooked rabbit · ${this.cooked} left`;return true;}
  if(rawOnly&&this.raw>0){this.raw--;this.energy=Math.min(100,this.energy+15);if(this.random()<.5){this.sick=SICK_SECONDS;this.message='Ate raw rabbit. Your stomach turns.';}else this.message='Ate raw rabbit. Cook it next time.';return true;}
  if(this.rations<=0){this.message='No food left.';return false;}
  this.rations--;const hot=this.has('stove');this.energy=Math.min(100,this.energy+(hot?45:30));
  this.message=`${hot?'Hot ration':'Cold ration'} eaten · ${this.rations} left`;return true;
 }
 refill(){
  if(!this.packed||this.withdrawn)return false;
  if(!this.bottles){this.message='No bottles to fill. You drink from the spring.';this.hydration=Math.min(100,this.hydration+30);if(!this.has('filter')&&this.random()<.4)this.sick=SICK_SECONDS;return true;}
  const added=this.bottles*LITRE-this.water;if(added<=.001){this.message='Bottles already full.';return false;}
  this.water+=added;if(!this.has('filter'))this.untreated+=added;
  this.message=this.has('filter')?`Filtered ${added.toFixed(1)} L`:`Filled ${added.toFixed(1)} L of untreated water`;return true;
 }
 // Fieldcraft. Each returns true when it did something; the message says what happened.
 gatherWood(){
  if(!this.packed||this.withdrawn)return false;
  if(this.wood>=MAX_WOOD){this.message=`Carrying all the wood you can (${MAX_WOOD} bundles).`;return false;}
  if(!this.bergen.autoPlace('wood')){this.message='No room in your bergen for wood. Rearrange it, or burn or eat something.';return false;}this.message=`Gathered dead wood · ${this.wood} bundle${this.wood>1?'s':''}`;return true;
 }
 // Returns the hours of fuel for a new fire, or 0 when it cannot be lit.
 lightFire(){
  if(!this.packed||this.withdrawn)return 0;
  if(!this.has('firesteel')){this.message='No fire steel to light a fire.';return 0;}
  if(this.wood<2){this.message=`Need 2 bundles of wood to light a fire (carrying ${this.wood}).`;return 0;}
  this.wood-=2;this.message='Fire lit. Stand close to warm up.';return 2*BURN_PER_WOOD;
 }
 // Adds a bundle to a fire with `fuel` hours left; returns the new fuel or the old one.
 stokeFire(fuel){
  if(!this.packed||this.withdrawn||this.wood<=0){this.message='No wood to add.';return fuel;}
  if(fuel>=MAX_FUEL-.5){this.message='The fire is well stocked.';return fuel;}
  this.wood--;this.message='Added wood to the fire.';return Math.min(MAX_FUEL,fuel+BURN_PER_WOOD);
 }
 // At a fire: cook any rabbit and, with a mess tin, boil untreated water safe.
 cook(){
  if(!this.packed||this.withdrawn)return false;
  const boil=this.untreated>.001&&this.has('stove'),done=[];
  if(this.raw>0){done.push(`cooked ${this.raw} rabbit`);this.bergen.convert('raw','cooked');}
  if(boil){done.push(`boiled ${this.untreated.toFixed(1)} L`);this.untreated=0;}
  if(!done.length){this.message=this.untreated>.001?'Nothing to cook. A mess tin would let you boil water.':'Nothing to cook.';return false;}
  this.message=`At the fire: ${done.join(', ')}.`;return true;
 }
 setSnare(){
  if(!this.packed||this.withdrawn)return false;
  if(this.snares<=0){this.message='No snare wire left.';return false;}
  this.snares--;this.message='Snare set on a run. Come back in a few hours.';return true;
 }
 // Checking a snare always recovers the wire; it may hold a rabbit.
 recoverSnare(caught){this.bergen.autoPlace('snares');if(caught)this.bergen.autoPlace('raw');this.message=caught?'A rabbit in the snare. Cook it at a fire.':'Nothing yet. Snare lifted.';}
 catchRabbit(){this.bergen.autoPlace('raw');this.message='Your throwing stick drops a rabbit. Cook it at a fire.';}
 // The hunting chain: pick up a fallen branch, whittle it with your knife, throw it, fetch it.
 takeBranch(){
  if(!this.packed||this.withdrawn)return false;
  if(!this.bergen.autoPlace('branch')){this.message='No room in your bergen for a branch. Rearrange it (Tab) first.';return false;}
  this.message=this.sticks?'Picked up a dry branch. It will burn.':'Picked up a straight branch. Whittle it into a throwing stick.';return true;
 }
 whittle(){
  if(!this.packed||this.withdrawn)return false;
  if(!this.bergen.convertOne('branch','stick')){this.message='No branch to whittle. Look under the trees.';return false;}
  this.message='Whittled a throwing stick. Creep up on a rabbit, then hold to aim.';return true;
 }
 // A thrown stick leaves the bergen until you pick it up again.
 throwStick(){if(!this.packed||this.withdrawn||!this.bergen.removeOne('stick'))return false;return true;}
 pickUpStick(){if(!this.packed||this.withdrawn)return false;if(!this.bergen.autoPlace('stick')){this.message='No room in your bergen for the stick. Rearrange it (Tab) first.';return false;}this.message='Got your throwing stick back.';return true;}
 pickUpRabbit(){if(!this.packed||this.withdrawn)return false;if(!this.bergen.autoPlace('raw')){this.message='No room in your bergen for the rabbit. Rearrange it (Tab) or eat something first.';return false;}this.message='Rabbit in the bergen. Cook it at a fire before you eat it.';return true;}
 // Sleep through the night. Returns the hours actually slept (a fire that dies, or no
 // shelter, wakes you early). fire: hours of fuel left; rain: 0..1.
 sleep(hours,{fire=0,rain=0}={}){
  if(!this.packed||this.withdrawn||hours<=0)return 0;
  const bag=this.has('bedroll');
  if(fire<=0&&!bag){this.message='Too cold to sleep. Light a fire or carry a sleeping bag.';return 0;}
  let slept=0;const step=1/12;
  while(slept<hours-1e-9){
   const h=Math.min(step,hours-slept),warm=fire-slept>0;
   const loss=warm?-20:(bag?3:9)+rain*(bag?2:8)*(this.has('waterproof')?.5:1);
   this.warmth=Math.max(0,Math.min(100,this.warmth-loss*h));
   this.hydration=Math.max(0,this.hydration-2.5*h);this.energy=Math.max(0,this.energy-1*h);this.wet=Math.max(0,this.wet-h);
   slept+=h;if(this.warmth<=15)break;
  }
  if(slept>hours-1e-6)slept=hours;
  this.awake=slept>=5?0:Math.max(0,this.awake-slept*3);this.sick=0;
  const burnedOut=fire>0&&fire<slept;
  this.message=this.warmth<=15?'Woke shivering. Get warm.':slept>=5?(burnedOut&&!bag?'Slept, but the fire died in the night. You wake cold.':'Slept through the night.'):'A short, broken sleep.';
  return slept;
 }
 // effort: 0 standing, 1 walking, about 1.6 sprinting. climb: metres gained this step.
 // hours: game time passed; dark 0..1; fire: standing at a lit fire; soaked: waded in.
 step(dt,{effort=1,climb=0,rain=0,hours=dt/60,dark=0,sun=0,fire=false,soaked=false}={}){
  if(!this.packed||this.withdrawn||dt<=0)return;
  this.time+=dt;this.sick=Math.max(0,this.sick-dt);this.awake+=hours;
  if(soaked)this.wet=1.5;else this.wet=Math.max(0,this.wet-hours);
  // Warmth per hour: night and rain chill you, wet clothes worse; sun and work warm you.
  const exposed=9*dark+rain*8*(this.has('waterproof')?.4:1)+(this.wet>0?10:0),gain=fire?40:6*sun*(this.wet>0?0:1)+3*Math.min(1,effort)*dark;
  this.warmth=Math.max(0,Math.min(100,this.warmth+(gain-exposed)*hours));
  const load=.85+this.weight/40,work=.35+.65*effort+Math.max(0,climb)/Math.max(dt,1e-6)*.25;
  this.hydration=Math.max(0,this.hydration-dt*100/THIRST_SECONDS*work*load*(this.sick>0?2:1));
  this.energy=Math.max(0,this.energy-dt*100/HUNGER_SECONDS*work*load*(1+(this.has('waterproof')?0:.5*rain)));
  if(this.hydration<=0||this.energy<=0){this.empty+=dt;if(this.empty>=WITHDRAW_SECONDS)this.withdrawn=this.hydration<=0?'Severe dehydration':'Exhaustion';}else this.empty=0;
  if(this.warmth<=0){this.cold+=dt;if(this.cold>=WITHDRAW_SECONDS)this.withdrawn='Hypothermia';}else this.cold=0;
  if(this.awake>=SPENT_HOURS&&!this.withdrawn)this.withdrawn='Exhaustion: no sleep';
 }
 // Short pencilled notes for the held chart. Words, not gauges: changes only on band shifts.
 get notes(){const food=this.rations+this.cooked,state=[hydrationWord(this.hydration),energyWord(this.energy),warmthWord(this.warmth),fatigueWord(this.awake)].filter(w=>!['Good','Warm','Rested'].includes(w));if(this.sick>0)state.push('Unwell');return `${Math.round(this.weight)} kg · ${this.water.toFixed(1)} L · Food ${food}${this.raw?` +${this.raw} raw`:''} · Wood ${this.wood} · Snares ${this.snares} · ${state.length?state.join(' · '):'All good'}`;}
 // 0 when fine, rising to 1 as either need runs out. Drives the screen-edge vignette.
 // Overall condition for the HUD: full until water, food, warmth or sleep runs low.
 get health(){return Math.round(100*(1-Math.min(1,this.strain)));}
 get strain(){return Math.max(0,1-Math.min(this.hydration,this.energy,this.warmth)/30,(this.awake-21)/5);}
}
