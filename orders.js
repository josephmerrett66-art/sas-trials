// The DS's survival orders: what the assignment asks of you beyond the posts, and the record
// read out at the debrief. Days one and two follow the course: rations are issued for the first
// leg and taken back at post C; after that you camp by dark with a fire, a basha and a cooked
// meal; the last leg checks you arrive at each post with safe water. Missing a task is a warning
// in the debrief, never a failure. Pure: no DOM or rendering, so it can be tested in node.
export const RATION_POST='C',CAMP_POSTS=['D','E'],WATER_POSTS=['F','G','H'],CAMP_HOUR=21.5,CAMP_REACH=10,SAFE_LITRES=1;

export class Orders {
 constructor(){this.reset();}
 reset(){this.rationsTaken=null;this.campDue=null;this.camp=null;this.campMissing=[];this.ateCooked=false;this.water={};}
 // The order in force once `stage` posts are registered (codes A, B, C...).
 order(stage,total=8){
  if(stage>=total)return 'Exercise complete. The DS debrief:';
  if(stage<3)return 'Reach posts A to C. Rations are issued for today only: the DS takes what is left at C.';
  if(stage<5)return 'Reach D and E. Make camp by dark: a lit fire, a basha, and a cooked meal.';
  return `Reach ${WATER_POSTS.slice(0,-1).join(', ')} and ${WATER_POSTS.at(-1)}. Arrive at each with at least a litre of safe water.`;
 }
 // Called as a post is registered. Applies the DS's checks and returns the line to say, or ''.
 register(code,kit,hours){
  if(code===RATION_POST&&this.rationsTaken===null){
   const n=kit.rations;kit.rations=0;this.rationsTaken=n;
   // Camp is due at dark on this day, or the next one if it is already evening.
   const day=Math.floor(hours/24)*24;this.campDue=day+CAMP_HOUR+(hours%24>=19?24:0);
   return `${n?`The DS takes your ${n===1?'last ration':`${n} rations`}.`:'The DS checks your bergen: no rations left.'} From here you live off the land. Next: ${this.order(3)}`;
  }
  if(WATER_POSTS.includes(code)&&!(code in this.water)){
   const safe=Math.max(0,kit.water-kit.untreated);this.water[code]=safe>=SAFE_LITRES-1e-6;
   return this.water[code]?`The DS checks your water: ${safe.toFixed(1)} L safe. Good.`:`The DS checks your water: ${safe.toFixed(1)} L safe. Not enough. Fill, filter or boil before the next post.`;
  }
  return '';
 }
 // What you ate counts towards camp: a cooked meal after the rations are gone.
 ate(kind){if(kind==='cooked'&&this.rationsTaken!==null)this.ateCooked=true;}
 // At the camp deadline: a lit fire and a basha close together, you at them, and a cooked meal.
 // Returns the DS's verdict once, when it is due; otherwise ''.
 step(hours,{camp,player,kit}){
  if(this.campDue===null||this.camp!==null||hours<this.campDue)return '';
  const missing=[],fire=camp.lit?camp.fire:null,shelter=camp.shelter;
  if(!fire)missing.push('a lit fire');
  if(!shelter)missing.push('a basha');
  else if(fire&&Math.hypot(fire.x-shelter.x,fire.z-shelter.z)>CAMP_REACH)missing.push('your fire beside your basha');
  if((fire||shelter)&&!(fire&&Math.hypot(player.x-fire.x,player.z-fire.z)<CAMP_REACH)&&!(shelter&&Math.hypot(player.x-shelter.x,player.z-shelter.z)<CAMP_REACH))missing.push('you at your camp');
  if(!this.ateCooked&&!(kit.cooked>0))missing.push('a cooked meal');
  this.camp=!missing.length;this.campMissing=missing;
  return this.camp?'The DS walks through your camp at dark: fire, basha and a cooked meal. Noted.':`The DS walks through at dark. Missing: ${missing.join(', ')}. That goes in your report.`;
 }
 // One line per survival order for the debrief, warnings rather than a pass or fail.
 debrief(){
  const lines=[];
  lines.push(this.rationsTaken===null?'Rations: not yet handed in at C.':`Rations: ${this.rationsTaken?`${this.rationsTaken} handed in at C`:'none left to hand in at C'}. You lived off the land after that.`);
  lines.push(this.camp===null?'Camp by dark: not yet due.':this.camp?'Camp by dark: fire, basha and a cooked meal. Good.':`Camp by dark: warning. Missing ${this.campMissing.join(', ')}.`);
  const checked=WATER_POSTS.filter(c=>c in this.water),good=checked.filter(c=>this.water[c]);
  lines.push(!checked.length?'Water: not yet checked.':good.length===checked.length?`Water: a litre of safe water at ${good.join(', ')}. Good.`:`Water: warning. Short of safe water at ${checked.filter(c=>!this.water[c]).join(', ')}.`);
  return lines;
 }
 save(){return {rationsTaken:this.rationsTaken,campDue:this.campDue,camp:this.camp,campMissing:this.campMissing,ateCooked:this.ateCooked,water:{...this.water}};}
 load(saved){this.reset();if(!saved)return;for(const k of ['rationsTaken','campDue','camp','ateCooked'])if(k in saved)this[k]=saved[k];this.campMissing=[...(saved.campMissing??[])];Object.assign(this.water,saved.water??{});}
}
