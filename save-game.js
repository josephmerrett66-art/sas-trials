// One saved run in the browser's local storage, so an exercise survives closing the tab.
// Pure snapshot/restore over the game objects; storage access is wrapped because private
// windows and blocked site data can refuse it.
export const SAVE_KEY='sas-trials-save',SAVE_VERSION=1;
const KIT_FIELDS=['hydration','energy','warmth','awake','wet','water','untreated','sick','empty','cold','withdrawn','message','time'];
const round=v=>typeof v==='number'?Math.round(v*1000)/1000:v;

export function snapshot({kit,player,clock,camp,exercise,gathered,obstacles,floor=null}){
 const index=new Map(obstacles.map((o,i)=>[o,i]));
 return {version:SAVE_VERSION,saved:Date.now(),
  kit:{...Object.fromEntries(KIT_FIELDS.map(k=>[k,round(kit[k])])),bergen:kit.bergen.save(),layout:kit.layout},
  player:{x:round(player.x),z:round(player.z),yaw:round(player.yaw),pitch:round(player.pitch),stamina:round(player.stamina)},
  clock:{hours:round(clock.hours)},
  camp:{fire:camp.fire?{x:camp.fire.x,z:camp.fire.z,fuel:round(camp.fire.fuel)}:null,snares:camp.snares.map(({x,z,set,catchAt,yaw})=>({x,z,set,catchAt:Number.isFinite(catchAt)?catchAt:null,yaw}))},
  exercise:{stage:exercise.stage,distance:round(exercise.distance),elevation:round(exercise.elevation)},
  gathered:[...gathered].map(o=>index.get(o)).filter(i=>i!==undefined),
  // Branches taken, your stick where it lies and any rabbit left on the ground. Optional: older saves have none.
  floor:floor?.save()??null};
}

// Restores a packed run in place. Returns false (changing nothing) for an unusable save.
export function restore(save,{kit,player,clock,camp,exercise,gathered,obstacles,floor=null,groundHeight}){
 if(!save||save.version!==SAVE_VERSION||!save.kit||!Array.isArray(save.kit.bergen))return false;
 kit.reset();kit.layout=save.kit.layout??save.kit.bergen;kit.bergen.load(save.kit.bergen);
 for(const k of KIT_FIELDS)if(k in save.kit)kit[k]=save.kit[k];kit.packed=true;
 player.reset();Object.assign(player,{x:save.player.x,z:save.player.z,yaw:save.player.yaw,pitch:save.player.pitch,stamina:save.player.stamina??100});player.y=groundHeight(player.x,player.z);
 clock.hours=save.clock.hours;
 camp.reset();if(save.camp.fire&&save.camp.fire.fuel>0)camp.light(save.camp.fire.x,save.camp.fire.z,save.camp.fire.fuel);
 for(const s of save.camp.snares)camp.snares.push({x:s.x,z:s.z,y:groundHeight(s.x,s.z),set:s.set,catchAt:s.catchAt??Infinity,yaw:s.yaw});camp.syncSnares(clock.hours);
 exercise.reset();exercise.stage=Math.min(save.exercise.stage,exercise.checkpoints.length);exercise.distance=save.exercise.distance;exercise.elevation=save.exercise.elevation;
 gathered.clear();for(const i of save.gathered)if(obstacles[i])gathered.add(obstacles[i]);
 floor?.load(save.floor);
 return true;
}

export function readSave(storage=globalThis.localStorage){try{const text=storage?.getItem(SAVE_KEY);return text?JSON.parse(text):null;}catch{return null;}}
export function writeSave(save,storage=globalThis.localStorage){try{storage?.setItem(SAVE_KEY,JSON.stringify(save));return true;}catch{return false;}}
export function clearSave(storage=globalThis.localStorage){try{storage?.removeItem(SAVE_KEY);}catch{}}
