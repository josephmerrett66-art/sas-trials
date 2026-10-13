import {TIRED_HOURS,SPENT_HOURS} from './kit.js?v=orders-1';
// Hunger, thirst, cold and tiredness felt before they are read: a stomach growl, a dry swallow,
// chattering teeth, trembling hands on the map and compass, and slow blinks. BodyCues is pure
// timing (testable in node); BodySounds synthesises the sounds from one shared noise buffer, so
// nothing is downloaded and nothing is allocated per frame.
const clamp=v=>Math.max(0,Math.min(1,v)),lerp=(a,b,t)=>a+(b-a)*clamp(t);
// Seconds until a cue's first sound after the need appears, so it lands with the advice line.
const FIRST=6;

export class BodyCues {
 constructor(random=Math.random){this.random=random;this.out={growl:false,swallow:false,chatter:false,blink:false};this.reset();}
 reset(){this.growl=this.swallow=this.chatter=this.blink=FIRST;this.tremor=0;}
 // Counts a cue down while its need lasts; returns true when it is due and sets the next wait.
 due(name,need,interval,dt){if(!need){this[name]=FIRST;return false;}this[name]-=dt;if(this[name]>0)return false;this[name]=interval*(.75+.5*this.random());return true;}
 // dt in real seconds. Returns the shared {growl,swallow,chatter,blink} flags for this step.
 step(dt,kit){
  const out=this.out;out.growl=out.swallow=out.chatter=out.blink=false;
  if(!kit.packed||kit.withdrawn||dt<=0)return out;
  // Hands shake from cold below 60 warmth, and a little from hunger once weak.
  const target=Math.min(1,Math.max(clamp((60-kit.warmth)/50),clamp((30-kit.energy)/30)*.5));
  this.tremor+=(target-this.tremor)*Math.min(1,dt*.6);
  out.growl=this.due('growl',kit.energy<60||kit.sick>0,kit.sick>0?30:lerp(150,35,(60-kit.energy)/50),dt);
  out.swallow=this.due('swallow',kit.hydration<40,lerp(70,25,(40-kit.hydration)/40),dt);
  out.chatter=this.due('chatter',kit.warmth<35,lerp(40,15,(35-kit.warmth)/35),dt);
  out.blink=this.due('blink',kit.awake>=TIRED_HOURS,lerp(30,8,(kit.awake-TIRED_HOURS)/(SPENT_HOURS-TIRED_HOURS)),dt);
  return out;
 }
}

export class BodySounds {
 constructor(audio){this.audio=audio;this.noise=null;}
 get context(){const a=this.audio;return a?.active&&a.context?.state==='running'?a.context:null;}
 buffer(context){if(this.noise)return this.noise;const b=context.createBuffer(1,context.sampleRate,context.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return this.noise=b;}
 // A filtered noise burst. Nodes are made per sound (a few a minute at most) and freed on end.
 burst(context,at,length,type,frequency,q,volume,sweep=null){
  const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();
  source.buffer=this.buffer(context);filter.type=type;filter.Q.value=q;filter.frequency.setValueAtTime(frequency,at);
  if(sweep)for(const [t,f] of sweep)filter.frequency.linearRampToValueAtTime(f,at+t*length);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume,at+length*.25);gain.gain.linearRampToValueAtTime(0,at+length);
  source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  source.start(at,Math.random()*.5,length);
 }
 play(name){
  const context=this.context;if(!context)return;const now=context.currentTime,level=Math.min(1.5,(this.audio.forestVolume??.35)/.35);
  if(name==='growl')this.burst(context,now,1.3,'lowpass',90,14,.55*level,[[.35,230],[.7,110],[1,160]]);
  else if(name==='swallow'){this.burst(context,now,.09,'bandpass',700,3,.18*level);this.burst(context,now+.2,.12,'bandpass',420,3,.16*level);}
  else if(name==='chatter')for(let i=0;i<7;i++)this.burst(context,now+i*.075,.035,'highpass',2600,1,.07*level);
  // Fieldcraft: a hatchet biting into dead wood, and the scrape of a fire steel.
  else if(name==='chop'){this.burst(context,now,.12,'lowpass',420,6,.5*level,[[.5,180],[1,120]]);this.burst(context,now+.01,.05,'bandpass',1500,2,.18*level);}
  else if(name==='strike')this.burst(context,now,.16,'highpass',3200,1,.22*level,[[1,5200]]);
 }
}
