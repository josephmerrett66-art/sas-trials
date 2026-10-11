// Decoded once; each shot gets its own source so automatic fire can overlap.
export class WeaponSounds {
 constructor({knifeOnly=false}={}){
  this.buffers={};this.last={};this.active=new Set();
  const Context=globalThis.AudioContext||globalThis.webkitAudioContext;
  if(!Context){this.ready=Promise.resolve();return;}
  this.context=new Context();
  this.ready=Promise.all(Object.entries(SAMPLES).filter(([key])=>!knifeOnly||key.startsWith('knife')).map(async([key,paths])=>{
   this.buffers[key]=await Promise.all(paths.map(async path=>{
    const response=await fetch(path);if(!response.ok)throw new Error(`Weapon sound missing: ${path}`);
    return this.context.decodeAudioData(await response.arrayBuffer());
   }));
  }));
 }
 unlock(trusted=false){
  if(!this.context||this.context.state==='running'||(this.resumeRequested&&!trusted))return;
  this.resumeRequested=true;this.context.resume().then(()=>{this.resumeRequested=false;}).catch(()=>{this.resumeRequested=false;});
 }
 play(key,volume=.6){
  const samples=this.buffers[key];if(!samples?.length)return;
  if(this.context.state!=='running'){this.unlock();return;}
  let index=Math.floor(Math.random()*samples.length);
  if(index===this.last[key]&&samples.length>1)index=(index+1)%samples.length;
  this.last[key]=index;
  const source=this.context.createBufferSource(),gain=this.context.createGain();
  source.buffer=samples[index];gain.gain.value=volume;source.connect(gain);gain.connect(this.context.destination);
  this.active.add(source);source.onended=()=>{this.active.delete(source);source.disconnect();gain.disconnect();};source.start();
  return source;
 }
 stop(){for(const source of this.active)source.stop();this.active.clear();}
}
const SAMPLES={
 "glock": [
  "./assets/audio/weapons/glock-1.wav",
  "./assets/audio/weapons/glock-2.wav",
  "./assets/audio/weapons/glock-3.wav"
 ],
 "m416": [
  "./assets/audio/weapons/m416-1.wav",
  "./assets/audio/weapons/m416-2.wav",
  "./assets/audio/weapons/m416-3.wav"
 ],
 "awm": [
  "./assets/audio/weapons/awm-1.wav",
  "./assets/audio/weapons/awm-2.wav",
  "./assets/audio/weapons/awm-3.wav"
 ],
 "ammo": [
  "./assets/audio/weapons/ammo-1.wav",
  "./assets/audio/weapons/ammo-2.wav",
  "./assets/audio/weapons/ammo-3.wav"
 ],
 "knifeDraw": [
  "./assets/audio/weapons/knifeDraw-1.wav",
  "./assets/audio/weapons/knifeDraw-2.wav",
  "./assets/audio/weapons/knifeDraw-3.wav"
 ],
 "knifeHolster": [
  "./assets/audio/weapons/knifeHolster-1.wav",
  "./assets/audio/weapons/knifeHolster-2.wav",
  "./assets/audio/weapons/knifeHolster-3.wav"
 ],
 "impact": [
  "./assets/audio/weapons/impact-1.wav",
  "./assets/audio/weapons/impact-2.wav",
  "./assets/audio/weapons/impact-3.wav"
 ]
};
