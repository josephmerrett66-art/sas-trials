const ASSETS=['forest','storm','footsteps','wolf'];
// A minimum quiet period plus an exponential wait avoids a repeating howl interval.
export function wolfDelay(first=false,random=Math.random){return (first?8:15)*60-Math.log1p(-Math.min(.999999999,Math.max(0,random())))*(first?12:20)*60;}
export class RecordedAudio {
 constructor({random=Math.random,fetcher=globalThis.fetch?.bind(globalThis),Context=globalThis.AudioContext||globalThis.webkitAudioContext}={}){
  this.random=random;this.fetcher=fetcher;this.Context=Context;this.context=null;this.buffers=null;this.active=false;this.forestVolume=.35;this.weatherVolume=.5;this.rain=0;this.mixTick=0;this.voices=new Set();this.wolfVoice=null;this.wolfRemaining=wolfDelay(true,random);this.ready=null;this.decoding=null;
 }
 preload(){
  return this.ready??=Promise.all(ASSETS.map(async name=>{const response=await this.fetcher(new URL(`./assets/audio/${name}.m4a`,import.meta.url));if(!response.ok)throw new Error(`Cannot load ${name} audio: ${response.status}`);return response.arrayBuffer();}));
 }
 unlock(){
  if(!this.Context)return Promise.resolve();
  try{
   this.context??=new this.Context();const context=this.context;
   const resumed=context.resume();
   this.decoding??=this.preload().then(async data=>{
    const buffers=await Promise.all(data.map(bytes=>context.decodeAudioData(bytes)));
    this.buffers=Object.fromEntries(ASSETS.map((name,i)=>[name,buffers[i]]));
    this.forest=this.loop('forest');this.storm=this.loop('storm');this.mix();
   });
   return Promise.all([resumed,this.decoding]).catch(error=>{console.warn('Recorded audio unavailable:',error);});
  }catch(error){console.warn('Recorded audio unavailable:',error);return Promise.resolve();}
 }
 loop(name){const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers[name];source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(this.context.destination);source.start();return {source,gain};}
 setActive(active){this.active=active;if(!active)for(const voice of this.voices)voice.source.stop();this.mix();}
 mix(){
  if(!this.forest)return;
  const now=this.context.currentTime;
  // The supplied storm already includes thunder: no extra synthetic thunder layer.
  this.forest.gain.gain.setTargetAtTime(this.active?this.forestVolume*(1-this.rain*.65):0,now,.25);
  this.storm.gain.gain.setTargetAtTime(this.active?this.weatherVolume*this.rain:0,now,.25);
 }
 play(name,volume,rate=1,pan=0){
  if(!this.active||!this.buffers||this.context.state!=='running'||volume<=0||this.voices.size>=6)return null;
  const source=this.context.createBufferSource(),gain=this.context.createGain(),panner=this.context.createStereoPanner();
  source.buffer=this.buffers[name];source.playbackRate.value=rate;gain.gain.value=volume;panner.pan.value=pan;source.connect(gain);gain.connect(panner);panner.connect(this.context.destination);
  const voice={source,gain,panner};this.voices.add(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();panner.disconnect();this.voices.delete(voice);if(this.wolfVoice===voice)this.wolfVoice=null;};source.start();return voice;
 }
 footstep(impact,landing,volume){this.play('footsteps',volume*Math.min(1.5,impact)*(landing?.8:.65),landing?.85:.96+this.random()*.08);}
 step(dt,rain,weatherVolume){
  this.rain=rain;this.weatherVolume=weatherVolume;this.mixTick+=dt;
  if(this.mixTick>=.1){this.mixTick=0;this.mix();}
  if(!this.active||!this.buffers||this.context.state!=='running')return;
  this.wolfRemaining-=dt;
  if(this.wolfRemaining<=0){if(!this.wolfVoice)this.wolfVoice=this.play('wolf',this.forestVolume*.4,1,(this.random()-.5)*1.4);this.wolfRemaining=wolfDelay(false,this.random);}
 }
}
