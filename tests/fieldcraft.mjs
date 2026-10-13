import assert from 'node:assert/strict';
import {facing,lookTarget,needAdvice,needBands} from '../fieldcraft.js';
import {BodyCues} from '../body-cues.js';
import {vitalsWanted} from '../vitals-hud.js';
import {FieldKit,TIRED_HOURS} from '../kit.js';

// Facing: yaw 0 looks along -z. Things behind or to the side are not looked at unless very close.
const player={x:0,z:0,yaw:0};
assert.equal(facing(player,0,-2,2.6),true,'straight ahead');assert.equal(facing(player,0,2,2.6),false,'behind');
assert.equal(facing(player,2,-.2,2.6),false,'off to the side');assert.equal(facing(player,0,.8,2.6),true,'right beside you counts');
assert.equal(facing(player,0,-4,2.6),false,'out of reach');assert.equal(facing(player,0,-4,2.6,1.6),true,'a tree trunk is reached at its edge');

// Look-at label and what G does.
const kit=new FieldKit(()=>0);kit.pack();
assert.equal(lookTarget(player,kit,{}),null,'nothing in view, no label');
let look=lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}});assert.deepEqual(look,{act:'gather',label:'Gather dead wood · G'});
assert.equal(lookTarget(player,kit,{tree:{x:0,z:2.5,radius:.6}}),null,'a tree behind you is not offered');
assert.equal(lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}},'pad').label,'Gather dead wood · X');
assert.equal(lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}},'touch').label,'Gather dead wood · Tap');
look=lookTarget(player,kit,{post:{code:'A',x:0,z:-1.5},tree:{x:0,z:-2.5,radius:.6}});assert.deepEqual(look,{act:'register',label:'Register post A · G'},'a post comes before wood');
assert.equal(lookTarget(player,kit,{post:{code:'A',x:0,z:-1.5},postReached:true}).act,null);
assert.equal(lookTarget(player,kit,{snare:{x:0,z:-1},snareCaught:true}).label,'Lift snare · rabbit caught · G');
kit.water=0;assert.equal(lookTarget(player,kit,{water:true}).label,'Fill bottles · G');kit.water=kit.bottles;assert.deepEqual(lookTarget(player,kit,{water:true}),{act:null,label:'Water · bottles full'});
assert.equal(lookTarget(player,kit,{rabbit:{}}).act,'throw');
// Campfire: G adds wood when you have it, otherwise cooks; the label lists every option.
const fire={x:0,z:-2};kit.wood=0;kit.raw=0;
assert.deepEqual(lookTarget(player,kit,{fire}),{act:null,label:'Campfire · gather wood to keep it going'});
kit.raw=1;assert.deepEqual(lookTarget(player,kit,{fire}),{act:'cook',label:'Campfire · Cook rabbit · G'});
kit.wood=2;look=lookTarget(player,kit,{fire,sleepable:true});assert.equal(look.act,'stoke');assert.equal(look.label,'Campfire · Add wood · G   Cook rabbit · F   Sleep · Z');
assert.equal(lookTarget(player,kit,{fire,sleepable:true},'touch').label,'Campfire · Add wood · Tap   Cook rabbit','touch shows no keys it has none for');
console.log('Passed look-at facing, label priority, input key names and campfire options.');

// Inner voice: one line when a need gets worse, naming the next step with what you carry.
const voice=new FieldKit(()=>0);voice.pack();let bands=needBands(voice,{});
assert.equal(needAdvice(voice,null),'','no advice without a previous reading');assert.equal(needAdvice(voice,bands),'');
voice.energy=50;assert.match(needAdvice(voice,bands),/^Getting hungry\. Eat a ration, or keep it and hunt/);
voice.rations=0;assert.match(needAdvice(voice,bands),/Throw your stick at a rabbit/);voice.raw=1;assert.match(needAdvice(voice,bands),/Cook your rabbit/);
bands=needBands(voice,{});voice.energy=55;assert.equal(needAdvice(voice,bands),'','recovering within a band says nothing');
voice.energy=80;bands=needBands(voice,{});voice.energy=50;voice.hydration=50;assert.match(needAdvice(voice,bands),/^Thirsty\. Drink from your bottle/,'thirst is said first');
voice.water=0;assert.match(needAdvice(voice,bands),/Springs are the blue dots/);
voice.hydration=100;voice.energy=100;bands=needBands(voice,{});voice.warmth=50;assert.match(needAdvice(voice,bands),/Getting cold\. A fire would help/);voice.wood=2;assert.match(needAdvice(voice,bands),/you have the wood/);
voice.warmth=100;bands=needBands(voice,{});voice.awake=TIRED_HOURS+1;assert.match(needAdvice(voice,bands),/^Tired\./);
console.log('Passed inner-voice advice for hunger, thirst, cold and tiredness.');

// Body cues: nothing while comfortable, then sounds on a timer and a tremor that builds.
const body=new BodyCues(()=>.5),fine=new FieldKit();fine.pack();let fired=0;
for(let i=0;i<600;i++)if(Object.values(body.step(.5,fine)).some(Boolean))fired++;assert.equal(fired,0,'a comfortable body is quiet');assert.equal(body.tremor,0);
fine.energy=40;let growls=0;for(let i=0;i<1200;i++)if(body.step(.5,fine).growl)growls++;assert.ok(growls>=4&&growls<=10,`hunger growls now and then (${growls} in 10 minutes)`);
fine.energy=100;fine.warmth=20;for(let i=0;i<120;i++)body.step(.5,fine);assert.ok(body.tremor>.6,'cold hands shake');
let chatter=0;for(let i=0;i<240;i++)if(body.step(.5,fine).chatter)chatter++;assert.ok(chatter>=2,'teeth chatter when shivering');
fine.warmth=100;fine.awake=TIRED_HOURS+5;let blinks=0;for(let i=0;i<240;i++)if(body.step(.5,fine).blink)blinks++;assert.ok(blinks>=4,'tired eyes blink');
fine.withdrawn='Exhaustion';assert.equal(body.step(.5,fine).blink,false,'nothing after withdrawing');
console.log('Passed body cues: quiet when comfortable, growls, tremor, chattering and blinks.');

// Condition bars fade in below 60 and out again above 65.
assert.equal(vitalsWanted({a:100,b:62},false),false);assert.equal(vitalsWanted({a:100,b:59},false),true);
assert.equal(vitalsWanted({a:100,b:62},true),true,'stays up until comfortably clear');assert.equal(vitalsWanted({a:100,b:66},true),false);
console.log('Passed condition bar fade thresholds.');
