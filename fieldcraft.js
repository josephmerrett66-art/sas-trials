import {hydrationWord,energyWord,warmthWord,fatigueWord,MAX_WOOD,LITRE} from './kit.js?v=sticks-1';
// What the player is looking at and what G does to it, and the short inner-voice advice when a
// need gets worse. Pure: no DOM or rendering, so it can be tested in node.

// About 35° either side of straight ahead; anything closer than `close` counts whatever the facing.
export const LOOK_CONE=.82;
export function facing(player,x,z,reach,radius=0,close=1.1){
 const dx=x-player.x,dz=z-player.z,d=Math.hypot(dx,dz);
 if(d-radius>reach)return false;if(d-radius<close||d<1e-6)return true;
 return (dx*-Math.sin(player.yaw)+dz*-Math.cos(player.yaw))/d>=LOOK_CONE;
}
// Key names per input, for the look-at label.
export const KEYS={keyboard:{use:'G',hold:'hold G',fire:'F',sleep:'Z'},pad:{use:'X',hold:'hold X',fire:'RT',sleep:'LT'},touch:{use:'Tap',hold:'Tap',fire:null,sleep:null}};

// near: what is within reach, worked out by the game. Returns {act,label} for the first thing the
// player is looking at, in priority order, or null. act is what G (or a tap on touch) does.
export function lookTarget(player,kit,near,input='keyboard'){
 const keys=KEYS[input]??KEYS.keyboard,target=lookAt(player,kit,near,keys);
 // Carrying a branch but no throwing stick: whittling is always on offer, held on the same key.
 if(kit.branches>0&&kit.sticks===0&&target?.act!=='throw'){
  if(!target)return {act:'whittle',label:`Whittle a throwing stick from your branch · ${keys.use}`};
  if(input!=='touch'){target.label+=`   Whittle stick · ${keys.hold}`;target.whittle=true;}
 }
 return target;
}
function lookAt(player,kit,near,keys){
 const {post=null,postReached=false,snare=null,snareCaught=false,carcass=null,stick=null,fire=null,water=false,rabbit=null,warren=null,branch=null,tree=null,sleepable=false,reach={}}=near;
 const verb=(text,key)=>key?`${text} · ${key}`:text;
 if(post&&facing(player,post.x,post.z,reach.post??2.8))return postReached?{act:null,label:`Post ${post.code} · reached`}:{act:'register',label:verb(`Register post ${post.code}`,keys.use)};
 if(snare&&facing(player,snare.x,snare.z,reach.snare??2.2))return {act:'lift',label:verb(snareCaught?'Lift snare · rabbit caught':'Lift snare',keys.use)};
 if(carcass&&facing(player,carcass.x,carcass.z,reach.pick??2.2))return {act:'pickup-rabbit',label:verb('Pick up rabbit',keys.use)};
 if(stick&&facing(player,stick.x,stick.z,reach.pick??2.2))return {act:'pickup-stick',label:verb('Pick up your stick',keys.use)};
 if(fire&&facing(player,fire.x,fire.z,reach.fire??4)){
  // G (or a tap) does the first of these; the others keep their own keys.
  const parts=[],cook=kit.raw>0||(kit.untreated>.001&&kit.has('stove'));let act=null;
  if(kit.wood>0){act='stoke';parts.push(verb('Add wood',keys.use));}
  if(cook){act??='cook';parts.push(verb(kit.raw>0?'Cook rabbit':'Boil water',act==='cook'?keys.use:keys.fire));}
  if(sleepable&&keys.sleep)parts.push(verb('Sleep',keys.sleep));
  return {act,label:parts.length?`Campfire · ${parts.join('   ')}`:'Campfire · gather wood to keep it going'};
 }
 if(water){
  if(!kit.bottles)return {act:'fill',label:verb('Drink from the water',keys.use)};
  return kit.bottles*LITRE-kit.water>.001?{act:'fill',label:verb(kit.has('filter')?'Fill bottles':'Fill bottles · untreated',keys.use)}:{act:null,label:'Water · bottles full'};
 }
 // The hunting chain says its own next step: find a branch, whittle it, then throw.
 if(rabbit){
  if(kit.sticks>0)return {act:'throw',label:verb('Throw stick at rabbit',keys.hold)};
  return {act:null,label:kit.branches>0?'Rabbit · whittle your branch into a throwing stick first':'Rabbit · find a straight branch under the trees for a throwing stick'};
 }
 if(warren&&facing(player,warren.x,warren.z,reach.warren??3.5,1.5))return kit.snares>0?{act:'snare',label:verb('Rabbit runs · Set snare',keys.use)}:{act:null,label:'Rabbit runs · no snare wire left'};
 if(branch&&facing(player,branch.x,branch.z,reach.pick??2.2))return {act:'branch',label:verb('Pick up branch',keys.use)};
 if(tree&&facing(player,tree.x,tree.z,reach.tree??2.6,tree.radius??0))return kit.wood<MAX_WOOD?{act:'gather',label:verb('Gather dead wood',keys.use)}:{act:null,label:`Dead wood · carrying ${MAX_WOOD} bundles`};
 return null;
}

// Need bands, worst last. A band only counts as worse when it moves further down this list.
const BANDS={energy:['Good','Hungry','Weak','Exhausted'],hydration:['Good','Thirsty','Parched','Dehydrated'],warmth:['Warm','Cold','Shivering','Hypothermic'],fatigue:['Rested','Tired','Exhausted']};
export function needBands(kit,out={}){out.energy=energyWord(kit.energy);out.hydration=hydrationWord(kit.hydration);out.warmth=warmthWord(kit.warmth);out.fatigue=fatigueWord(kit.awake);return out;}
// One line of advice for the need that just got worse, or '' when nothing did. Says what to do
// next with what is actually in the bergen, so the next step is always clear.
const scratch={};
export function needAdvice(kit,previous){
 const now=needBands(kit,scratch);let worse=null;
 for(const need of ['hydration','warmth','energy','fatigue'])if(previous&&BANDS[need].indexOf(now[need])>BANDS[need].indexOf(previous[need])){worse=need;break;}
 if(!worse)return '';
 const band=now[worse],lead=band.toLowerCase();
 if(worse==='energy'){
  const food=kit.cooked>0?'Eat your cooked rabbit.':kit.raw>0?'Cook your rabbit at a fire before you eat it.':kit.rations>0?`Eat a ration, or keep it and hunt: rabbits graze at meadow edges, most at dawn and dusk.`:kit.sticks>0?`Creep up on a rabbit and throw your stick${kit.snares>0?', or set a snare on the runs by a warren':''}.`:kit.branches>0?'Whittle your branch into a throwing stick and hunt a rabbit.':'Find a straight branch under the trees, whittle a throwing stick and hunt a rabbit.';
  return band==='Hungry'?`Getting hungry. ${food}`:`You are ${lead} with hunger. ${food}`;
 }
 if(worse==='hydration'){const drink=kit.water>.001?'Drink from your bottle.':'Your bottles are empty. Springs are the blue dots on your map; rivers work too.';return band==='Thirsty'?`Thirsty. ${drink}`:`You are ${lead}. ${drink}`;}
 if(worse==='warmth'){const fire=kit.wood>=2&&kit.has('firesteel')?'Light a fire: you have the wood.':'A fire would help. Gather dead wood beside the big trees.';return band==='Cold'?`Getting cold. ${fire}`:`You are ${lead}. ${fire}`;}
 return band==='Tired'?'Tired. Make camp after dusk, by a fire or in your sleeping bag.':'Exhausted. You need to sleep tonight.';
}
