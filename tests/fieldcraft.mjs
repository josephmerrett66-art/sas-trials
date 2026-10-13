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
const kit=new FieldKit(()=>0);kit.set('hatchet',0);kit.pack();
assert.equal(lookTarget(player,kit,{}),null,'nothing in view, no label');
let look=lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}});assert.deepEqual(look,{act:'gather',label:'Gather dead wood · G'});
assert.equal(lookTarget(player,kit,{tree:{x:0,z:2.5,radius:.6}}),null,'a tree behind you is not offered');
assert.equal(lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}},'pad').label,'Gather dead wood · X');
assert.equal(lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}},'touch').label,'Gather dead wood · Tap');
look=lookTarget(player,kit,{post:{code:'A',x:0,z:-1.5},tree:{x:0,z:-2.5,radius:.6}});assert.deepEqual(look,{act:'register',label:'Register post A · G'},'a post comes before wood');
assert.equal(lookTarget(player,kit,{post:{code:'A',x:0,z:-1.5},postReached:true}).act,null);
assert.equal(lookTarget(player,kit,{snare:{x:0,z:-1},snareCaught:true}).label,'Lift snare · rabbit caught · G');
kit.water=0;assert.equal(lookTarget(player,kit,{water:true}).label,'Fill bottles · G');kit.water=kit.bottles;assert.deepEqual(lookTarget(player,kit,{water:true}),{act:null,label:'Water · bottles full'});
assert.deepEqual(lookTarget(player,kit,{rabbit:{}}),{act:null,label:'Rabbit · find a straight branch under the trees for a throwing stick'},'no stick: the label says how to get one');
kit.branches=1;assert.match(lookTarget(player,kit,{rabbit:{}}).label,/whittle your branch/);assert.deepEqual(lookTarget(player,kit,{}),{act:'whittle',label:'Whittle a throwing stick from your branch · G'},'with a branch and no stick, whittling is offered');
look=lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}});assert.deepEqual(look,{act:'gather',label:'Gather dead wood · G   Whittle stick · hold G',whittle:true},'whittling rides along with what you look at');
assert.equal(lookTarget(player,kit,{tree:{x:0,z:-2.5,radius:.6}},'touch').label,'Gather dead wood · Tap','touch whittles from the bag instead');
kit.whittle();assert.equal(kit.sticks,1);assert.equal(kit.branches,0);assert.deepEqual(lookTarget(player,kit,{rabbit:{}}),{act:'throw',label:'Throw stick at rabbit · hold G'});assert.equal(lookTarget(player,kit,{rabbit:{}},'touch').label,'Throw stick at rabbit · Tap');
assert.equal(lookTarget(player,kit,{}),null,'nothing to whittle once you have a stick');
assert.equal(lookTarget(player,kit,{branch:{x:0,z:-1.5}}).label,'Pick up branch · G');assert.equal(lookTarget(player,kit,{branch:{x:0,z:1.5}}),null,'a branch behind you is not offered');
assert.equal(lookTarget(player,kit,{stick:{x:0,z:-1.5},branch:{x:0,z:-1}}).act,'pickup-stick','your own stick before another branch');
assert.equal(lookTarget(player,kit,{carcass:{x:0,z:-1.5},stick:{x:0,z:-1.5}}).act,'pickup-rabbit','the rabbit first');
// Campfire: G adds wood when you have it, otherwise cooks; the label lists every option.
const fire={x:0,z:-2};kit.wood=0;kit.raw=0;
assert.deepEqual(lookTarget(player,kit,{fire}),{act:null,label:'Campfire · gather wood to keep it going'});
kit.raw=1;assert.deepEqual(lookTarget(player,kit,{fire}),{act:'spit',label:'Campfire · Roast rabbit · G'});
kit.wood=2;assert.equal(lookTarget(player,kit,{fire,sleepable:true}).label,'Campfire · Add wood · G   Roast rabbit · F','no sleep offered without a basha');look=lookTarget(player,kit,{fire,sleepable:true,shelter:{x:3,z:2}});assert.equal(look.act,'stoke');assert.equal(look.label,'Campfire · Add wood · G   Roast rabbit · F   Sleep · Z');
assert.equal(lookTarget(player,kit,{fire,sleepable:true,shelter:{x:3,z:2}},'touch').label,'Campfire · Add wood · Tap   Roast rabbit','touch shows no keys it has none for');
// Roasting: progress while it cooks, then taking it off comes first.
assert.equal(lookTarget(player,kit,{fire,spit:{done:false,progress:.4}}).label,'Campfire · Add wood · G   Rabbit roasting · 40%');
assert.deepEqual(lookTarget(player,kit,{fire,spit:{done:true,progress:1}}),{act:'take',label:'Campfire · Take roast rabbit · G   Add wood · F'});
assert.deepEqual(lookTarget(player,kit,{laid:{x:0,z:-1.5}}),{act:'strike',label:'Fire lay · Strike your fire steel · G'});
// Boiling: the mess tin goes on, shows progress, and comes off boiled.
const tin=new FieldKit(()=>0);tin.set('stove',1);tin.set('hatchet',0);tin.pack();tin.untreated=.5;
assert.deepEqual(lookTarget(player,tin,{fire}),{act:'boil',label:'Campfire · Boil water · G'});
assert.equal(lookTarget(player,tin,{fire,pot:{done:false,progress:.5}}).label,'Campfire · Water boiling · 50%','one tin at a time');
assert.deepEqual(lookTarget(player,tin,{fire,pot:{done:true,progress:1}}),{act:'take-pot',label:'Campfire · Take boiled water · G'});
// The basha: sleep under it after dusk.
assert.deepEqual(lookTarget(player,tin,{shelter:{x:0,z:-2.5},sleepable:true}),{act:'sleep',label:'Basha · Sleep · Z'});assert.deepEqual(lookTarget(player,tin,{shelter:{x:0,z:-2.5}}),{act:null,label:'Basha · sleep here after dusk'});
assert.equal(lookTarget(player,tin,{shelter:{x:0,z:-2.5},sleepable:true},'touch').label,'Basha · Sleep · Tap');
// Trees: with a hatchet you chop, by hand you gather.
const axe=new FieldKit(()=>0);axe.pack();assert.deepEqual(lookTarget(player,axe,{tree:{x:0,z:-2.5,radius:.6}}),{act:'chop',label:'Chop dead wood · G'});
// Open ground: dry grass for tinder; and a fire once you have tinder, a branch and wood.
const camp=new FieldKit(()=>0);camp.pack();assert.equal(lookTarget(player,camp,{canBuild:true}),null,'nothing to build with yet');
assert.deepEqual(lookTarget(player,camp,{ground:true,canBuild:true}),{act:'tinder',label:'Pull dry grass for tinder · G'});
camp.gatherTinder();camp.wood=1;camp.takeBranch();camp.sticks=1;
assert.deepEqual(lookTarget(player,camp,{canBuild:true}),{act:'build',label:'Build a fire here · F'});assert.deepEqual(lookTarget(player,camp,{ground:true,canBuild:true}),{act:'tinder',label:'Pull dry grass for tinder · G   Build a fire here · F'});
assert.deepEqual(lookTarget(player,camp,{canBuild:true},'touch'),{act:'build',label:'Build a fire here · Tap'});
camp.branches=2;assert.deepEqual(lookTarget(player,camp,{canBuild:true}),{act:'build',label:'Build a fire here · F   Pitch a basha · Z',pitch:true},'two branches pitch a basha');
camp.tinder=0;assert.deepEqual(lookTarget(player,camp,{canBuild:true}),{act:'pitch',label:'Pitch a basha · Z',pitch:true});assert.equal(lookTarget(player,camp,{canBuild:true,shelter:{x:50,z:50}}),null,'one basha at a time');
console.log('Passed look-at facing, label priority, input key names and campfire options.');

// Inner voice: one line when a need gets worse, naming the next step with what you carry.
const voice=new FieldKit(()=>0);voice.pack();let bands=needBands(voice,{});
assert.equal(needAdvice(voice,null),'','no advice without a previous reading');assert.equal(needAdvice(voice,bands),'');
voice.energy=50;assert.match(needAdvice(voice,bands),/^Getting hungry\. Eat a ration, or keep it and hunt/);
voice.rations=0;assert.match(needAdvice(voice,bands),/Find a straight branch under the trees, whittle a throwing stick/);voice.branches=1;assert.match(needAdvice(voice,bands),/Whittle your branch/);voice.whittle();assert.match(needAdvice(voice,bands),/Creep up on a rabbit and throw your stick/);voice.raw=1;assert.match(needAdvice(voice,bands),/Roast your rabbit/);
bands=needBands(voice,{});voice.energy=55;assert.equal(needAdvice(voice,bands),'','recovering within a band says nothing');
voice.energy=80;bands=needBands(voice,{});voice.energy=50;voice.hydration=50;assert.match(needAdvice(voice,bands),/^Thirsty\. Drink from your bottle/,'thirst is said first');
voice.water=0;assert.match(needAdvice(voice,bands),/Springs are the blue dots/);
voice.hydration=100;voice.energy=100;bands=needBands(voice,{});voice.warmth=50;assert.match(needAdvice(voice,bands),/Getting cold\. A fire would help/);voice.wood=0;voice.tinder=0;assert.match(needAdvice(voice,bands),/You still need tinder \(dry grass, or shavings from whittling\), a branch for kindling, a bundle of dead wood/,'the advice lists what is missing');voice.wood=2;voice.tinder=1;voice.branches=1;assert.match(needAdvice(voice,bands),/Build a fire: you have tinder, kindling and wood/);
voice.warmth=100;bands=needBands(voice,{});voice.awake=TIRED_HOURS+1;assert.match(needAdvice(voice,bands),/^Tired\. Make camp after dusk: a fire, and a basha from 2 fallen branches/);
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
