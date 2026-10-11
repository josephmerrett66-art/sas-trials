import assert from 'node:assert/strict';
import {RecordedAudio,wolfDelay} from '../recorded-audio.js';
import {MovementFeel} from '../feel.js';
class Param {value=0;setTargetAtTime(value){this.value=value;}}
class Node {gain=new Param();pan=new Param();playbackRate=new Param();connect(){}disconnect(){}start(){this.started=true;}stop(){this.onended?.();}}
class Context {state='running';currentTime=0;destination={};sources=[];decodes=0;resume(){return Promise.resolve();}decodeAudioData(bytes){this.decodes++;return Promise.resolve({bytes,duration:1});}createBufferSource(){const node=new Node();this.sources.push(node);return node;}createGain(){return new Node();}createStereoPanner(){return new Node();}}
const requests=[];
const sound=new RecordedAudio({Context,random:()=>.5,fetcher:async url=>{requests.push(url.pathname);return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}});
sound.setActive(true);await sound.unlock();await sound.unlock();
assert.equal(requests.length,4);assert.equal(sound.context.decodes,4);assert.equal(sound.context.sources.length,2,'One persistent loop per ambience recording');
assert(sound.forest.source.loop&&sound.storm.source.loop);assert.equal(sound.storm.gain.gain.value,0);
sound.step(.1,1,.5);assert.equal(sound.storm.gain.gain.value,.5);assert(sound.forest.gain.gain.value>0,'Forest remains underneath storms');
const feel=new MovementFeel(sound);feel.volume=.4;feel.sound(1);feel.sound(1,true);
assert.equal(sound.context.sources[2].buffer,sound.buffers.footsteps);assert.equal(sound.context.sources[3].buffer,sound.buffers.footsteps);assert.equal(sound.context.decodes,4,'Steps reuse the recording');
for(let i=0;i<20;i++)feel.sound(1);assert.equal(sound.voices.size,6,'Bound simultaneous sounds');
sound.setActive(false);assert.equal(sound.voices.size,0);assert.equal(sound.forest.gain.gain.value,0);assert.equal(sound.storm.gain.gain.value,0);
const remaining=sound.wolfRemaining;sound.step(3600,0,.5);assert.equal(sound.wolfRemaining,remaining,'Paused time does not advance rare wildlife');
sound.setActive(true);sound.step(remaining-.01,0,.5);assert.equal(sound.wolfVoice,null,'No early howl');sound.step(.02,0,.5);assert.equal(sound.wolfVoice.source.buffer,sound.buffers.wolf);assert(sound.wolfRemaining>=900);
const voice=sound.wolfVoice;sound.step(1,0,.5);assert.equal(sound.wolfVoice,voice,'No stacked howls');sound.setActive(false);assert.equal(sound.wolfVoice,null,'Pause stops active howl');
for(const n of [0,.1,.5,.9,.999999999,1]){assert(wolfDelay(true,()=>n)>=480);assert(wolfDelay(false,()=>n)>=900);assert(Number.isFinite(wolfDelay(false,()=>n)));}
assert(wolfDelay(false,()=>.9)>wolfDelay(false,()=>.1)*2,'Wide irregular gaps, rather than fixed interval jitter');
console.log('Recorded audio: looping, reusable footstep sample, bounded voices, pause/mute, rare irregular wildlife passed.');
