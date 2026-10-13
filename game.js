import {createTouchControls} from './touch-controls.js?v=1';
import {loadNatureTrees} from './nature-trees.js?v=big-1';
import {ForestLife} from './forest-life.js?v=big-1';
import {bakeForestShadows} from './cached-forest-shadows.js?v=big-1';
import {RecordedAudio} from './recorded-audio.js?v=1';
import {ForestWeather} from './weather.js?v=daycycle-1';
import {mainTrail} from './landmark-routes.js?v=big-1';
import * as THREE from './vendor/three.module.js';
import {terrainHeight,WORLD_SIZE,rivers,riverAt} from './terrain.js?v=big-1';
import {ValleyRiver} from './river.js?v=big-1';
import {Controller,defaults} from './controller.js?v=vitals-1';
import {GamepadInput} from './gamepad.js?v=sticks-1';
import {createForest,collideForest} from './forest.js?v=big-1';
import {MovementFeel,LookSway} from './feel.js?v=recorded-audio-1';
import {PlayerLean,leanInput} from './lean.js';
import {loadDetailAtlases} from './detail-atlas.js';
import {ForestVisibility} from './forest-visibility.js?v=big-1';
import {RenderBudget} from './render-budget.js';
import {FrameMonitor} from './frame-monitor.js';
import {GpuTimer} from './gpu-timer.js';
import {ForestTorch,installTorchOptics} from './torch.js?v=daycycle-1';
import {START,makeCheckpoints,NavigationExercise} from './navigation.js?v=big-1';
import {addCheckpointPosts,NavigationView} from './navigation-view.js?v=feedback-1';
import {HeldNavigation} from './held-navigation.js?v=fire-1';
import {FieldKit,strikeChance,SPIT_HOURS} from './kit.js?v=fire-1';
import {findSprings,addSprings,nearbySpring,updateSpringVisibility} from './springs.js?v=big-1';
import {PackingView} from './packing-view.js?v=fire-1';
import {InventoryView} from './inventory-view.js?v=fire-1';
import {DayClock,formatClock} from './daycycle.js?v=1';
import {Camp} from './camp.js?v=fire-1';
import {Wildlife} from './wildlife.js?v=warrens-1';
import {ForestFloor} from './forest-floor.js?v=fire-1';
import {findWarrens,nearestWarren,WarrenView,ON_RUN_ODDS,OFF_RUN_ODDS} from './warrens.js?v=1';
import {nearbyObstacles} from './obstacle-grid.js';
import {VitalsHud} from './vitals-hud.js?v=fade-1';
import {lookTarget,needBands,needAdvice} from './fieldcraft.js?v=fire-1';
import {BodyCues,BodySounds} from './body-cues.js?v=fire-1';
import {snapshot,restore,readSave,writeSave,clearSave} from './save-game.js?v=fire-1';

const params=new URLSearchParams(location.search),benchmark=params.has('benchmark'),benchmarkLandmark=benchmark&&/^[B-H]$/.test(params.get('landmark')??'');
const scene=new THREE.Scene();scene.background=new THREE.Color(0x9cbdd0);scene.fog=new THREE.Fog(0x9cbdd0,35,90);
const camera=new THREE.PerspectiveCamera(defaults.fov,innerWidth/innerHeight,.05,900);camera.rotation.order='YXZ';scene.add(camera);
const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);document.querySelector('#world').appendChild(renderer.domElement);
const renderBudget=new RenderBudget(renderer);renderBudget.resize(innerWidth,innerHeight,devicePixelRatio);
const hemisphere=new THREE.HemisphereLight(0xd9edff,0x5d6240,1.2),sunlight=new THREE.DirectionalLight(0xffe0ac,1.7);sunlight.position.set(-30,50,20);scene.add(hemisphere,sunlight);
const natureModels=await loadNatureTrees().catch(error=>{console.warn('Nature tree loading failed; using procedural forest:',error);return null;});
const obstacles=createForest(scene,natureModels),forestVisibility=new ForestVisibility(scene,{maxDistance:92});
// The forest streams in chunks around the player; shadows are re-baked for the loaded area.
const forestStream=scene.userData.forestStream,streamPosition={x:START.x,z:START.z};let shadowBakeAt=0;
for(const object of scene.children)if(object.isMesh){object.updateMatrixWorld(true);object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;}
const points=makeCheckpoints(obstacles),checkpointPosts=addCheckpointPosts(scene,points);
const river=new ValleyRiver(scene),springs=findSprings(obstacles,points),springMeshes=addSprings(scene,springs);for(const tile of river.group.children)if(tile.userData.terrainTile)forestVisibility.addTile(tile);forestStream.keepClear(springs,3.6);forestStream.loadAround(START.x,START.z);
// Field survival: a game clock, one campfire, snares and a small pool of rabbits.
const clock=new DayClock(),camp=new Camp(scene),nearScratch=[];
const clearOfObstacles=(x,z)=>{for(const o of nearbyObstacles(obstacles,x,z,.4,nearScratch))if(Math.hypot(x-o.x,z-o.z)<o.radius+.4)return false;return true;};
// Warrens sit on open ground; rabbits come out near them and snares on their runs catch.
const warrens=findWarrens((x,z,r)=>{for(const o of nearbyObstacles(obstacles,x,z,r,nearScratch))if(Math.hypot(x-o.x,z-o.z)<o.radius+r)return false;return true;}),warrenView=new WarrenView(scene,warrens);
const wildlife=new Wildlife(scene,{obstacleClear:clearOfObstacles,home:(x,z)=>nearestWarren(warrens,x,z,90)}),floor=new ForestFloor(scene,obstacles,{clear:clearOfObstacles});
const kit=new FieldKit(),exercise=new NavigationExercise(points),view=new NavigationView(exercise,{springs,kit,rivers,clock,camp});
const heldNavigation=new HeldNavigation(camera,view.chart);
const player=new Controller(terrainHeight,WORLD_SIZE/2-5),keys=new Set(),movementInput=new Set(),gamepad=new GamepadInput();
const soundscape=new RecordedAudio();
// Body cues and the inner voice: needs are felt and talked through before the bars matter.
const bodyCues=new BodyCues(),bodySounds=new BodySounds(soundscape),blink=document.querySelector('#blink');let lastBands=null,lookLabel='',lookUsable=false,hold=null;
const feel=new MovementFeel(soundscape),lookSway=new LookSway(),lean=new PlayerLean();
const hint=document.querySelector('.hint'),footer=document.querySelector('footer'),hud={bunny:document.querySelector('#bunny'),fps:document.querySelector('#fps')};
let touch=null,inventory=null;
let lastY=0,active=false,locked=false,controllerMode=false,started=false,accumulator=0,last=performance.now(),lastFrame=last,hudTime=0,frameAverage=1/60;
const play=document.querySelector('#play');play.disabled=true;hint.textContent='Preparing navigation chart…';await Promise.all([loadDetailAtlases(),heldNavigation.ready,soundscape.preload().catch(error=>console.warn('Recorded audio preload failed:',error))]);play.disabled=false;hint.textContent='Mouse + keyboard or Xbox controller';
installTorchOptics(scene);const torch=new ForestTorch(camera),torchButton=document.querySelector('#torch-toggle'),timeSetting=document.querySelector('#time-mode');
const weather=new ForestWeather(scene,camera,params.get('weather')??'auto');
const weatherSetting=document.querySelector('#weather-mode');weatherSetting.value=weather.state.mode;weatherSetting.onchange=()=>weather.state.setMode(weatherSetting.value);
document.querySelector('#forest-volume').oninput=e=>soundscape.forestVolume=Number(e.target.value);
document.querySelector('#weather-volume').oninput=e=>weather.volume=Number(e.target.value);document.querySelector('#lightning-mode').onchange=e=>weather.lightning=e.target.checked;
function syncTorch(){torchButton.setAttribute('aria-pressed',String(torch.on));torchButton.textContent=`TORCH · ${torch.on?'ON':'OFF'}`;}
// Time of day: a running clock by default; the settings can hold it at day or night.
// Lighting follows it every frame in weather.step; only the shadow switch waits for a change.
function setTimeMode(mode,persist=true){clock.setMode(mode);timeSetting.value=mode;sunlight.castShadow=mode!=='night';torch.setDark(clock.darkness);forestVisibility.previousPosition.set(Infinity,Infinity,Infinity);if(persist)try{localStorage.setItem('navigation-time',mode);}catch{}}
let timeMode='cycle';try{timeMode=localStorage.getItem('navigation-time')??(localStorage.getItem('navigation-night')==='true'?'night':'cycle');}catch{}
const lighting=params.get('lighting');setTimeMode(['cycle','day','night'].includes(lighting)?lighting:benchmark?'day':['cycle','day','night'].includes(timeMode)?timeMode:'cycle',false);syncTorch();
const forestShadowStats=bakeForestShadows(renderer,scene,sunlight,forestVisibility);sunlight.castShadow=clock.mode!=='night';let torchShown=null;
const forestLife=new ForestLife(scene);const vitals=new VitalsHud();
timeSetting.onchange=()=>setTimeMode(timeSetting.value);torchButton.onclick=()=>{torch.toggle();syncTorch();};
function resetRun(forget=true){if(forget){clearSave();if(savedNote){savedNote='';hint.textContent=touch?.enabled?'Left joystick: move · Drag the scene: look · Tap Jump and hold Run':'Mouse + keyboard or Xbox controller';}}kit.reset();clock.reset();camp.reset();wildlife.reset();floor.reset();hold=null;gathered.clear();bodyCues.reset();lastBands=null;duskWarned=-1;player.pace=1;packing?.update(false);play.firstChild.textContent='BEGIN EXERCISE ';player.reset();player.x=START.x;player.z=START.z;player.y=terrainHeight(player.x,player.z);feel.reset();lookSway.reset();lean.reset();exercise.reset();view.reset();lastY=player.y;keys.clear();accumulator=0;view.toggle('assignment');}
let packing=null,duskWarned=-1,savedNote='';const gathered=new Set();const savedRun=benchmark||params.has('navtest')?null:readSave();resetRun(false);view.close();
// Saved runs: the browser keeps one exercise in progress. It is written every 20 s of play,
// on pause, after sleeping and when the tab is hidden or closed; Reset exercise deletes it.
const saving=!benchmark&&!params.has('navtest');let saveTimer=0;
function saveGame(){if(!saving)return;if(kit.withdrawn){clearSave();return;}if(!kit.packed)return;writeSave(snapshot({kit,player,clock,camp,exercise,gathered,obstacles,floor}));}
if(savedRun&&restore(savedRun,{kit,player,clock,camp,exercise,gathered,obstacles,floor,groundHeight:terrainHeight})){player.pace=kit.pace;lastY=player.y;forestStream.loadAround(player.x,player.z);started=true;view.drawMap();view.update(player);play.firstChild.textContent='CONTINUE EXERCISE ';savedNote=`Saved run · ${clock.label} · ${exercise.complete?'circuit complete':`next post ${exercise.current.code}`}`;hint.textContent=savedNote;}
addEventListener('pagehide',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden)saveGame();});
function setActive(value){touch?.reset();active=value;soundscape.setActive(value);document.body.classList.toggle('playing',value);keys.clear();player.jumpBuffer=0;accumulator=0;if(value){feel.unlockAudio();if(!started){started=true;if(view.panel!=='assignment')view.toggle('assignment');}}play.firstChild.textContent='RESUME EXERCISE ';}
function pause(){inventory?.hide();saveGame();setActive(false);if(locked)document.exitPointerLock();}
// The backpack frees the mouse without pausing: the world (and the clock) keeps going.
function openBag(){if(!active||!kit.packed||inventory.open)return;keys.clear();inventory.show();if(locked)document.exitPointerLock();}
function closeBag(){if(active&&!controllerMode&&!touch?.enabled&&!locked)renderer.domElement.requestPointerLock()?.catch?.(()=>{});}
function readPad(){try{return gamepad.read(navigator.getGamepads?.()??[],player.config.deadzone,player.config.stickCurve);}catch{return null;}}
const fields=[['size','Player size',.7,2.2,.05],['walk','Walk speed',2,10,.1],['sprint','Sprint speed',5,16,.1],['acceleration','Acceleration',10,90,1],['braking','Braking',5,80,1],['directionGrip','Direction grip',0,24,1],['airControl','Air control',0,25,.5],['jump','Jump height',.5,2.5,.05],['sensitivity','Mouse sensitivity',.0005,.005,.0001],['fov','Field of view',65,110,1],['stickSensitivity','Stick look speed',.5,5,.1],['stickCurve','Stick precision curve',1,2.4,.1],['deadzone','Stick dead zone',.05,.35,.01],['juice','Camera motion',0,2,.1],['footstepVolume','Footstep volume',0,1,.05]];
for(const [key,name,min,max,step] of fields){const label=document.createElement('label');label.className='setting';label.innerHTML=`${name}<output></output><input type="range" min="${min}" max="${max}" step="${step}" value="${player.config[key]}" aria-label="${name}">`;const input=label.querySelector('input'),out=label.querySelector('output');const sync=()=>{if(key==='size'){player.setSize(Number(input.value));collideForest(player,obstacles);}else player.config[key]=Number(input.value);out.value=key==='sensitivity'?(Number(input.value)*1000).toFixed(1):Number(input.value).toFixed((key==='jump'||key==='deadzone'||key==='size'||key==='adsSensitivity')?2:1)+(key==='size'?'×':'');};input.addEventListener('input',sync);sync();document.querySelector('#sliders').appendChild(label);}
document.querySelector('#reset').onclick=()=>{player.setSize(defaults.size);Object.assign(player.config,defaults);document.querySelectorAll('.setting input').forEach((el,i)=>{el.value=defaults[fields[i][0]];el.dispatchEvent(new Event('input'));});};
// Every new attempt starts at the kit list; packing locks in the loadout.
function stepOff(){kit.pack();player.pace=kit.pace;view.drawMap();}
function begin(){if(kit.withdrawn)resetRun();if(kit.packed)return true;if(packing.open){packing.hide();stepOff();return true;}packing.show();return false;}
packing=new PackingView(kit,{clock,onStepOff:()=>{stepOff();start();}});
play.onclick=()=>{if(begin())start();};
async function start(){feel.unlockAudio();if(readPad()){controllerMode=true;setActive(true);return;}if(touch?.enabled){controllerMode=true;setActive(true);return;}controllerMode=false;try{await renderer.domElement.requestPointerLock();}catch{hint.textContent='Mouse capture needs a desktop browser. Xbox controller is also supported.';}}
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(locked)setActive(true);else if(!controllerMode&&!inventory?.open)setActive(false);});
// After closing the backpack, a click on the world takes the mouse back if the browser refused.
renderer.domElement.addEventListener('click',()=>{if(active&&!locked&&!controllerMode&&!touch?.enabled&&!inventory?.open)renderer.domElement.requestPointerLock()?.catch?.(()=>{});});
document.addEventListener('mousemove',e=>{if(!locked||view.blocking)return;player.yaw-=e.movementX*player.config.sensitivity;player.pitch=THREE.MathUtils.clamp(player.pitch-e.movementY*player.config.sensitivity,-Math.PI/2+.01,Math.PI/2-.01);});
// Springs and the river both fill bottles; standing in or beside the water is enough.
const riverProbe={};function nearRiver(){const q=riverAt(player.x,player.z,riverProbe);return !!q.river&&q.d<q.w+2.5&&player.y<q.S+1.5;}
function nearWater(){return !!nearbySpring(springs,player)||nearRiver();}
// Fieldcraft. Messages reuse the post notice line; the chart notes carry the totals.
function say(text,time=4){exercise.message=text;exercise.messageTime=time;view.refreshNotes();}
const forward=()=>({x:-Math.sin(player.yaw),z:-Math.cos(player.yaw)});
function nearTree(){let best=null,bd=2.6;for(const o of nearbyObstacles(obstacles,player.x,player.z,bd,nearScratch)){if(o.height<4||gathered.has(o))continue;const d=Math.hypot(player.x-o.x,player.z-o.z)-o.radius;if(d<bd){bd=d;best=o;}}return best;}
function rabbitInSight(){const f=forward();return wildlife.target(player,f.x,f.z);}
// What the player is looking at decides what G (or a tap on the label on touch) does, and the
// label under the crosshair says so. One reused object; worked out at the HUD rate and on G.
const lookNear={reach:{}},spitState={done:false,progress:0};
function currentLook(){
 const post=exercise.complete?null:exercise.nearby(player),snare=kit.packed?camp.nearSnare(player):null;
 lookNear.post=post;lookNear.postReached=!!post&&exercise.checkpoints.indexOf(post)<exercise.stage;
 if(!kit.packed){lookNear.snare=lookNear.fire=lookNear.rabbit=lookNear.tree=lookNear.branch=lookNear.stick=lookNear.carcass=lookNear.warren=lookNear.laid=lookNear.spit=null;lookNear.ground=lookNear.canBuild=false;lookNear.water=false;}
 else{lookNear.snare=snare;lookNear.snareCaught=!!snare&&clock.hours>=snare.catchAt;lookNear.fire=camp.lit&&camp.near(player)?camp.fire:null;lookNear.laid=camp.laid&&camp.near(player)?camp.fire:null;lookNear.spit=camp.spit&&camp.near(player)?(spitState.done=camp.spitDone,spitState.progress=Math.min(1,camp.spit.progress/SPIT_HOURS),spitState):null;lookNear.water=nearWater();lookNear.rabbit=rabbitInSight();lookNear.tree=nearTree();lookNear.branch=floor.nearestBranch(player);lookNear.stick=floor.nearestStick(player);lookNear.carcass=floor.nearestCarcass(player);lookNear.warren=nearestWarren(warrens,player.x,player.z,6);const open=openGround();lookNear.ground=open&&player.pitch<-.55;lookNear.canBuild=open&&!(camp.lit&&camp.near(player,40));}
 lookNear.sleepable=clock.mode!=='cycle'||clock.sleepable;
 return lookTarget(player,kit,lookNear,touch?.enabled?'touch':controllerMode?'pad':'keyboard');
}
// source: 'key', 'pad' or 'touch'. Aiming a throw lasts while G or X is held; a tap throws at once.
function interact(source='key'){
 if(hold){if(hold.act==='whittle'||hold.act==='chop'){say(hold.act==='chop'?'You stop chopping.':'You put the knife away.');hold=null;}return;}
 const target=currentLook();
 if(target?.act==='throw'&&source!=='touch'){hold={act:'aim',t:0,source,start:performance.now()};return;}
 // With whittling on offer as well, a tap does the label's first action and holding whittles.
 if(target?.whittle){hold={act:'press',t:0,source,target,start:performance.now()};return;}
 if(target?.act==='throw')return releaseThrow(.5);
 if(target?.act)return fieldActions[target.act]();
 if(kit.packed&&camp.lit&&camp.near(player)&&!kit.wood)say('No wood to add. Gather dead wood beside the big trees.');
}
// F (RT on Xbox): strike a laid fire, roast or take a rabbit or boil water at a lit one, or build one.
function fire(){
 if(!kit.packed)return;
 if(camp.laid&&camp.near(player))return strikeSteel();
 if(camp.lit&&camp.near(player)){if(camp.spitDone)return takeRoast();if(kit.raw>0&&!camp.spit)return roastRabbit();return cookFood();}
 lightFire();
}
// Single actions, shared by the keys and the backpack.
function registerPost(){if(exercise.complete||!exercise.nearby(player))return false;if(exercise.interact(player)){view.update(player);saveGame();}return true;}
function liftSnare(){const snare=camp.nearSnare(player);if(!snare||!kit.packed)return;if(!kit.roomFor(clock.hours>=snare.catchAt?['snares','raw']:['snares'])){say('No room in your bergen. Rearrange it (Tab) or eat or burn something first.');return;}kit.recoverSnare(camp.checkSnare(snare,clock.hours));say(kit.message);view.drawMap();}
function stokeFire(){if(!kit.packed||!camp.lit||!camp.near(player))return;camp.fire.fuel=kit.stokeFire(camp.fire.fuel);say(kit.message);}
function fill(){if(!kit.packed)return;if(!nearWater()){say('No water within reach. Find a spring, stream or river.');return;}kit.refill();say(kit.message);}
// The hunting chain. Throws are decided as the stick leaves your hand and land after a short arc:
// a hit drops the rabbit where it sat, a miss sends it running, and either way you fetch your stick.
const WHITTLE_SECONDS=2.5;
function pickBranch(){const spot=floor.nearestBranch(player);if(!spot||!kit.packed)return;if(kit.takeBranch())floor.take(spot);say(kit.message,5);}
function pickStick(){const stick=floor.nearestStick(player);if(!stick||!kit.packed)return;if(kit.pickUpStick())floor.pick(stick);say(kit.message);}
function pickRabbit(){const rabbit=floor.nearestCarcass(player);if(!rabbit||!kit.packed)return;if(kit.pickUpRabbit())floor.pick(rabbit);say(kit.message,5);}
// Once started, whittling carries on by itself; moving off or pressing again stops it.
function startWhittle(){if(!kit.packed||!kit.branches)return;hold={act:'whittle',t:0};say('Whittling a point with your knife…',WHITTLE_SECONDS);}
function releaseThrow(charge){
 hold=null;if(!kit.packed||!kit.throwStick()){say('No throwing stick. Whittle one from a straight branch.');return;}
 const rabbit=rabbitInSight(),f=forward();let tx=player.x+f.x*9,tz=player.z+f.z*9,hit=false;
 if(rabbit){hit=wildlife.random()<wildlife.throwChance(rabbit,player,(Math.min(1,charge)-.5)*.2);const side=wildlife.random()<.5?-1:1;tx=rabbit.x+(hit?0:-f.z*side*1.3+f.x*1.1);tz=rabbit.z+(hit?0:f.x*side*1.3+f.z*1.1);}
 floor.launch(player.x+f.x*.4,player.y+player.eye-.25,player.z+f.z*.4,tx,tz,{rabbit,hit});
}
function stickLanded({rabbit,hit}){
 if(rabbit&&hit&&rabbit.active){wildlife.kill(rabbit);floor.dropCarcass(rabbit.x,rabbit.z,rabbit.yaw);say('Got it. Pick up the rabbit, and fetch your stick.',5);}
 else if(rabbit){if(rabbit.active)wildlife.bolt(rabbit,player);say('Missed. It bolts for cover. Fetch your stick.',5);}
 else say('Your stick lands in the grass. Fetch it.');
}
// Whittling and aiming run each frame while they last, and put the stick in your right hand.
// How long a key is held is real time, so a slow frame never turns a hold into a tap.
function stepHold(dt,speed,pad){
 if(!hold){heldNavigation.hold(null);return;}
 hold.t+=dt;const held=hold.source==='key'?keys.has('KeyG'):hold.source==='pad'?!!pad?.use:false;
 // A release seen late (a slow frame) is still a tap: the key state decides before the clock.
 if(hold.act==='press'){if(!held){const act=hold.target.act;hold=null;if(act)fieldActions[act]();}else if(performance.now()-hold.start>=300)startWhittle();heldNavigation.hold(null);return;}
 if(hold.act==='chop'){const tree=nearTree();if(speed>2.2||!tree){hold=null;say('You stop chopping.');heldNavigation.hold(null);return;}if(hold.t>=hold.swings*.7+.35){hold.swings++;bodySounds.play('chop');}if(hold.t>=CHOP_SECONDS){hold=null;if(kit.gatherWood(2))gathered.add(tree);say(kit.message);heldNavigation.hold(null);return;}heldNavigation.hold('chop',hold.t/CHOP_SECONDS);return;}
 if(hold.act==='whittle'){if(speed>2.2){hold=null;say('You stop whittling to move.');heldNavigation.hold(null);return;}if(hold.t>=WHITTLE_SECONDS){hold=null;kit.whittle();say(kit.message,6);heldNavigation.hold(null);return;}heldNavigation.hold('whittle',hold.t/WHITTLE_SECONDS);return;}
 const drawn=(performance.now()-hold.start)/600;if(!held)return releaseThrow(drawn);
 heldNavigation.hold('aim',Math.min(1,drawn));
}
function holdLabel(){if(!hold||hold.act==='press')return null;if(hold.act==='whittle')return `Whittling · ${Math.min(99,Math.floor(hold.t/WHITTLE_SECONDS*100))}%`;if(hold.act==='chop')return `Chopping · ${Math.min(99,Math.floor(hold.t/CHOP_SECONDS*100))}%`;return `Aiming${performance.now()-hold.start>=600?' · steady':''} · release ${hold.source==='pad'?'X':'G'} to throw`;}
function gatherWood(){const tree=nearTree();if(!tree||!kit.packed){say('No dead wood within reach. Stand beside a big tree.');return;}if(kit.gatherWood())gathered.add(tree);say(kit.message);}
// With the hatchet: a few swings, then two bundles from the tree. Moving off stops it.
const CHOP_SECONDS=2.2;
function startChop(){if(!kit.packed||!nearTree()||!kit.has('hatchet'))return gatherWood();hold={act:'chop',t:0,swings:0};say('Chopping dead limbs with your hatchet…',CHOP_SECONDS);}
function cookFood(){if(!kit.packed)return;if(!(camp.lit&&camp.near(player))){say('Boil water beside a lit fire.');return;}kit.cook();say(kit.message);}
// The fire chain: tinder from dry grass (or whittling), a branch for kindling, dead wood to burn.
// Laying it uses one of each; then the fire steel, one strike at a time, until the tinder catches.
function strikeSteel(){
 if(!kit.packed||!camp.laid||!camp.near(player))return;if(!kit.has('firesteel')){say('You need a fire steel to light it.');return;}
 camp.strike();bodySounds.play('strike');
 if(Math.random()<strikeChance(weather.state.rain)){camp.ignite();say('The tinder catches. The kindling takes. Feed it wood as it grows.',5);view.drawMap();}
 else say(weather.state.rain>.3?'Sparks, but the tinder is damp. Keep striking.':'Sparks. Keep striking.',2);
}
function roastRabbit(){if(!kit.packed||!camp.lit||!camp.near(player)||camp.spit)return;if(kit.spitRabbit())camp.setSpit();say(kit.message,5);}
function takeRoast(){if(!kit.packed||!camp.spitDone||!camp.near(player))return;if(!kit.roomFor(['cooked'])){say('No room in your bergen for the rabbit. Eat something or make room first.');return;}camp.takeSpit();kit.takeCooked();say(kit.message,5);}
function pullTinder(){if(!kit.packed)return;kit.gatherTinder();say(kit.message);}
// Ground under your feet you can pull grass from or build on: dry, open and looked down at.
function openGround(){return !nearRiver()&&!nearWater()&&!nearTree()&&!(camp.fire&&camp.near(player,3));}
function lightFire(){
 if(!kit.packed)return;
 if(nearRiver()){say('Too wet to build a fire here.');return;}
 if(camp.lit&&!camp.near(player,40))say('You leave your old fire to burn out.');
 const fuel=kit.layFire();if(fuel){const f=forward();camp.light(player.x+f.x*2.6,player.z+f.z*2.6,fuel,false);view.drawMap();}say(kit.message,5);
}
function snare(){if(!kit.packed)return;if(nearRiver()){say('Set snares on dry ground.');return;}if(kit.setSnare()){const f=forward(),x=player.x+f.x*.8,z=player.z+f.z*.8,run=nearestWarren(warrens,x,z);camp.setSnare(x,z,clock.hours,undefined,run?ON_RUN_ODDS:OFF_RUN_ODDS);if(!run)kit.message='Snare set, but there is no rabbit sign here. Runs by a warren catch far more often.';view.drawMap();}say(kit.message,5);}
const sleepFade=document.querySelector('#sleep-fade');let sleepTime=0;
function sleep(){
 if(!kit.packed)return;
 if(clock.mode==='cycle'&&!clock.sleepable){say(`Too light to sleep (${formatClock(clock.hours).slice(-5)}). Make camp from dusk, after 19:30.`);return;}
 const fireHours=camp.lit&&camp.near(player)?camp.fire.fuel:0,slept=kit.sleep(clock.mode==='cycle'?clock.untilWake():8,{fire:fireHours,rain:weather.state.rain});
 if(slept>0){clock.advance(slept);camp.burn(slept,weather.state.rain);sleepFade.querySelector('p').textContent=`${clock.label} · ${kit.message}`;sleepFade.hidden=false;sleepFade.classList.remove('waking');void sleepFade.offsetWidth;sleepFade.classList.add('waking');sleepTime=3.2;view.drawMap();saveGame();}
 say(kit.message);
}
function drink(){kit.drink();say(kit.message);}
function eat(kind=null){kit.eat(kind);say(kit.message);}
const fieldActions={chop:startChop,tinder:pullTinder,build:lightFire,strike:strikeSteel,spit:roastRabbit,take:takeRoast,boil:cookFood,snare,register:registerPost,lift:liftSnare,stoke:stokeFire,cook:cookFood,fill,throw:()=>releaseThrow(.5),gather:gatherWood,branch:pickBranch,'pickup-stick':pickStick,'pickup-rabbit':pickRabbit,whittle:startWhittle};
view.prompt.onclick=()=>{if(touch?.enabled&&active)interact('touch');};
function tool(name){feel.unlockAudio();if(name==='interact')interact();else view.toggle(name);keys.clear();touch?.reset();}
for(const button of document.querySelectorAll('[data-tool]'))button.onclick=()=>tool(button.dataset.tool);
for(const button of document.querySelectorAll('[data-close]'))button.onclick=()=>view.close();
for(const button of document.querySelectorAll('[data-restart]'))button.onclick=resetRun;
document.addEventListener('keydown',e=>{if(inventory?.open&&active){if(e.code==='Escape'){pause();return;}if(['Tab','KeyI'].includes(e.code)){e.preventDefault();inventory.close();return;}if(e.target.closest?.('.bergen'))return;if(['ArrowDown','ArrowRight','KeyS','KeyD'].includes(e.code)){e.preventDefault();inventory.move(1);}else if(['ArrowUp','ArrowLeft','KeyW','KeyA'].includes(e.code)){e.preventDefault();inventory.move(-1);}return;}if(e.code==='Tab'&&active){e.preventDefault();if(!e.repeat)openBag();return;}if(e.code==='Escape'){pause();return;}if(e.code==='KeyR'&&!active&&!e.repeat&&!packing?.open){resetRun();return;}if(!active||e.target.matches('input'))return;keys.add(e.code);if(['Space','KeyM','KeyK','KeyJ'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyM')tool('map');if(e.code==='KeyK')tool('compass');if(e.code==='KeyJ')tool('assignment');if(e.code==='KeyG')interact();if(e.code==='KeyV')drink();if(e.code==='KeyB')eat();if(e.code==='KeyF')fire();if(e.code==='KeyZ')sleep();if(e.code==='KeyN')snare();if(e.code==='KeyI')openBag();if(e.code==='KeyL'){torch.toggle();syncTorch();}if(e.code==='Space'&&!view.blocking)player.jumpBuffer=player.time+.12;});
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderBudget.resize(innerWidth,innerHeight,devicePixelRatio);});
touch=createTouchControls(renderer.domElement,{enabled:matchMedia('(any-pointer: coarse)').matches||params.has('touch'),canMove:()=>active&&!view.blocking&&!inventory?.open,look:(x,y)=>{player.yaw-=x*.004;player.pitch=THREE.MathUtils.clamp(player.pitch-y*.004,-Math.PI/2+.01,Math.PI/2-.01);},jump:()=>player.jumpBuffer=player.time+.12,pause});
inventory=new InventoryView(kit,{enabled:touch.enabled,near:()=>({water:nearWater(),wet:nearRiver(),post:exercise.complete?null:exercise.nearby(player),fire:camp.lit&&camp.near(player),laid:camp.laid&&camp.near(player),spitOn:!!camp.spit&&camp.near(player),spitDone:camp.spitDone&&camp.near(player),ground:openGround(),snare:camp.nearSnare(player),tree:!!nearTree(),rabbit:!!rabbitInSight(),sleepable:clock.mode!=='cycle'||clock.sleepable}),actions:{...fieldActions,drink,'eat-ration':()=>eat('ration'),'eat-cooked':()=>eat('cooked'),'eat-raw':()=>eat('raw'),light:lightFire,snare,sleep,whittle:()=>{kit.whittle();say(kit.message);}},onClose:closeBag});
if(touch.enabled)hint.textContent=(savedNote?savedNote+' · ':'')+'Left joystick: move · Drag the scene: look · Tap Jump and hold Run';
const graphics=renderer.getContext(),gpuTimer=new GpuTimer(graphics),adapterExtension=graphics.getExtension('WEBGL_debug_renderer_info'),adapter=adapterExtension?graphics.getParameter(adapterExtension.UNMASKED_RENDERER_WEBGL):graphics.getParameter(graphics.RENDERER),frameMonitor=new FrameMonitor();
let benchmarkStart=0,benchmarkDone=false,benchmarkWarm=false,benchmarkProbe=false,benchmarkResult=null;
const benchmarkOutput=document.createElement('output');benchmarkOutput.id='performance-results';benchmarkOutput.hidden=!benchmark;
if(benchmarkLandmark){const p=points[(params.get('landmark').charCodeAt(0)-65)];player.x=p.x+5;player.z=p.z+5;player.y=terrainHeight(player.x,player.z);}
if(benchmark){benchmarkOutput.style='position:fixed;bottom:12px;left:12px;color:white;background:#000c;padding:12px;font:13px monospace;z-index:100;max-width:460px;white-space:pre-wrap';benchmarkOutput.textContent=benchmarkLandmark?`Benchmark: inspecting checkpoint ${params.get('landmark')} landmark…`:'Benchmark: walking, turning, jumping and compass inspection…';document.body.appendChild(benchmarkOutput);stepOff();setActive(true);view.close();}
// Explicit test harness only; absent from normal gameplay.
if(params.has('navtest')){const panel=document.createElement('div');panel.id='nav-test';panel.style='position:fixed;top:5px;left:5px;z-index:120';for(const [label,z,x] of [['Test valley',30,-130],['Test trail fork',-360,mainTrail.center(-360)],['Test flower patch',9,-3.8]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{view.close();player.x=x;player.z=z;player.y=terrainHeight(x,z);player.yaw=label==='Test flower patch'?0:label==='Test trail fork'?Math.PI:Math.PI*.75;player.pitch=label==='Test flower patch'?-.5:-.25;exercise.previous=null;};panel.appendChild(b);}for(const p of points){const b=document.createElement('button');b.textContent=`Test post ${p.code}`;b.onclick=()=>{view.close();player.x=p.x;player.z=p.z+1.5;player.y=terrainHeight(player.x,player.z);exercise.previous=null;};panel.appendChild(b);}for(const [label,yaw] of [['Test face north',0],['Test face east',-Math.PI/2],['Test face south',Math.PI],['Test face west',Math.PI/2],['Test face northeast',-Math.PI/4],['Test face southeast',-Math.PI*3/4],['Test face southwest',Math.PI*3/4],['Test face northwest',Math.PI/4]]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{view.close();player.yaw=yaw;player.pitch=-1.05;};panel.appendChild(b);}for(const [text,pitch] of [['Test look down',-1.05],['Test look forward',0],['Test look straight up',Math.PI/2],['Test look straight down',-Math.PI/2]]){const b=document.createElement('button');b.textContent=text;b.onclick=()=>{view.close();player.pitch=pitch;};panel.appendChild(b);}const attack=document.createElement('button');attack.textContent='Test first attack point';attack.onclick=()=>{view.close();player.x=points[0].attack.x;player.z=points[0].attack.z;player.y=terrainHeight(player.x,player.z);player.yaw=.91;player.pitch=-.08;exercise.previous=null;};panel.appendChild(attack);const approach=document.createElement('button');approach.textContent='Test first boulder approach';approach.onclick=()=>{view.close();player.x=points[0].x+14;player.z=points[0].z+16;player.y=terrainHeight(player.x,player.z);player.yaw=.68;player.pitch=-.08;exercise.previous=null;};panel.appendChild(approach);const second=document.createElement('button');second.textContent='Test second landmark approach';second.onclick=()=>{view.close();const p=points[1];player.x=p.x+5;player.z=p.z+5;player.y=terrainHeight(player.x,player.z);player.yaw=.55;player.pitch=-.12;exercise.previous=null;};panel.appendChild(second);for(const p of points.slice(2)){const b=document.createElement('button');b.textContent=`Test landmark ${p.code}`;b.onclick=()=>{view.close();player.x=p.x+5;player.z=p.z+5;player.y=terrainHeight(player.x,player.z);player.yaw=.55;player.pitch=-.12;exercise.previous=null;};panel.appendChild(b);}const leafTest=document.createElement('button');leafTest.textContent='Test broadleaf detail';leafTest.onclick=()=>{view.close();let closest=null,distance=Infinity;for(const source of forestVisibility.batches.find(b=>b.mesh.name==='Woodland CommonTree_4 crowns'||b.mesh.name==='Broadleaf clustered crowns').sources.values())for(let i=0;i<source.count;i++){const x=source.spheres[i*4],y=source.spheres[i*4+1],z=source.spheres[i*4+2],d=x*x+(z-START.z)**2;if(d<distance){distance=d;closest={x,y,z};}}player.x=closest.x+12;player.z=closest.z-8;player.y=terrainHeight(player.x,player.z);player.yaw=Math.atan2(12,-8);player.pitch=Math.atan2(closest.y-(player.y+player.eye),Math.hypot(12,8));exercise.previous=null;};panel.appendChild(leafTest);for(const [i,spring] of springs.entries()){const b=document.createElement('button');b.textContent=`Test spring ${i+1}`;b.onclick=()=>{view.close();player.x=spring.x+5;player.z=spring.z+3;player.y=terrainHeight(player.x,player.z);player.yaw=Math.atan2(5,3);player.pitch=-.3;exercise.previous=null;};panel.appendChild(b);}const hide=document.createElement('button');hide.textContent='Hide test controls';hide.onclick=()=>panel.hidden=true;panel.appendChild(hide);document.body.appendChild(panel);window.navtest={kit,player,springs,view,clock,camp,wildlife,floor,warrens,obstacles,stream:forestStream,bake:()=>bakeForestShadows(renderer,scene,sunlight,forestVisibility),renderer};stepOff();controllerMode=true;setActive(true);}
renderer.info.autoReset=false;scene.matrixAutoUpdate=false;scene.matrixWorldAutoUpdate=false;
renderer.setAnimationLoop(now=>{
 if(document.hidden){last=lastFrame=now;return;}const cpuStart=performance.now(),frameMs=now-lastFrame;renderer.info.reset();
 if(benchmark&&!benchmarkDone){benchmarkStart||=now;const elapsed=(now-benchmarkStart)/1000;player.yaw=benchmarkLandmark?.55+Math.sin(elapsed*.25)*.3:Math.sin(elapsed*.25)*1.4;player.pitch=-.04;if(!benchmarkLandmark)keys.add('KeyW');if(params.has('armsrun'))keys.add('ShiftLeft');if(!benchmarkLandmark&&elapsed%3<.15)player.jumpBuffer=player.time+.12;if(elapsed>=10&&!benchmarkWarm){benchmarkWarm=true;frameMonitor.frames=[];}if(elapsed>=30&&!benchmarkProbe){benchmarkProbe=true;pause();benchmarkResult={...frameMonitor.summary(),mode:'navigation',shadows:forestShadowStats,audio:{state:soundscape.context?.state??'unavailable',recordings:soundscape.buffers?Object.fromEntries(Object.entries(soundscape.buffers).map(([name,buffer])=>[name,buffer.duration])):null},weather:weather.state.current,night:torch.dark,enemies:0,adapter,renderScale:renderBudget.scale,gpuMs:gpuTimer.ms,viewport:{width:innerWidth,height:innerHeight}};frameMonitor.frames=[];}if(elapsed>=36){benchmarkDone=true;benchmarkProbe=false;benchmarkOutput.textContent=JSON.stringify({...benchmarkResult,emptyRenderFps:frameMonitor.summary().fps},null,2);benchmarkOutput.dataset.result=benchmarkOutput.textContent;}}
 const dt=Math.min((now-last)/1000,.05);last=now;let pad=benchmark||params.has('navtest')?null:readPad();
 if(controllerMode&&!pad&&!touch?.enabled&&!params.has('navtest')){pause();controllerMode=false;hint.textContent='Controller disconnected. Reconnect or use mouse + keyboard.';}
 // Xbox: right stick click opens the backpack; the D-pad picks an action, A uses it, B closes.
 if(pad&&active&&inventory.open){if(pad.bagPressed||pad.backPressed)inventory.close();else if(pad.pause){inventory.hide();pause();}else{if(pad.healPressed||pad.leftPressed)inventory.move(-1);if(pad.drinkPressed||pad.rightPressed)inventory.move(1);if(pad.jumpPressed)inventory.activate();}pad=null;}
 else if(pad&&active&&pad.bagPressed)openBag();
 if(pad){if(!active&&pad.respawn)resetRun();if(pad.pause){if(active)pause();else if(begin()){controllerMode=true;setActive(true);}}else if(!active&&pad.jumpPressed){if(begin()){controllerMode=true;setActive(true);}}else if(active){if(pad.healPressed)eat();if(pad.drinkPressed)drink();if(pad.firePressed)fire();if(pad.campPressed)sleep();if(pad.respawn)snare();if(pad.previousPressed)tool('compass');if(pad.nextPressed)tool('assignment');if(pad.mapPressed)tool('map');if(pad.reloadPressed)interact('pad');if(pad.jumpPressed&&!view.blocking)player.jumpBuffer=player.time+.12;}}
 const physicsStart=performance.now();
 if(active&&!view.blocking){if(pad){player.yaw-=pad.look.x*player.config.stickSensitivity*dt;player.pitch=THREE.MathUtils.clamp(player.pitch-pad.look.y*player.config.stickSensitivity*dt,-Math.PI/2+.01,Math.PI/2-.01);}movementInput.clear();for(const key of keys)movementInput.add(key);if(pad){if(pad.jump)movementInput.add('Space');if(pad.crouch)movementInput.add('KeyC');if(pad.sprint)movementInput.add('ShiftLeft');}if(touch?.sprint)movementInput.add('ShiftLeft');accumulator+=dt;while(accumulator>=1/120){const grounded=player.grounded,fall=-player.vy;player.step(1/120,movementInput,hud.bunny.checked,pad?.move??(touch?.enabled?touch.move:null));collideForest(player,obstacles);if(!grounded&&player.grounded)feel.landed(fall);if(grounded&&!player.grounded)feel.jumped();feel.step(1/120,player,player.config.juice);accumulator-=1/120;}exercise.step(dt,player);
  const speed=Math.hypot(player.vx,player.vz),climb=player.grounded?Math.min(.5,player.y-lastY):0;lastY=player.y;// Wading: deeper water slows you, down to a little over half pace at the deepest point.
  const wade=riverAt(player.x,player.z,riverProbe),depth=wade.river&&wade.d<wade.w+1?Math.max(0,wade.S-player.y):0;
  if(!benchmark)clock.step(dt);
  kit.step(dt,{effort:Math.min(1.7,speed/(player.config.walk*Math.max(.1,player.pace))),climb,rain:weather.state.rain,hours:benchmark?0:dt/60,dark:clock.darkness,sun:clock.daylight*(1-weather.state.cloud),fire:camp.warming(player),soaked:depth>.35});
  {const cue=bodyCues.step(benchmark?0:dt,kit);if(cue.growl)bodySounds.play('growl');if(cue.swallow)bodySounds.play('swallow');if(cue.chatter)bodySounds.play('chatter');if(cue.blink){blink.classList.remove('on');void blink.offsetWidth;blink.classList.add('on');}}
  stepHold(dt,speed,pad);
  if(clock.mode==='cycle'&&clock.hour>=19.5&&clock.hour<20&&duskWarned!==clock.day){duskWarned=clock.day;say('Dusk is coming. Gather wood and make camp.');}player.pace=kit.pace*(1-.45*Math.min(1,depth/.9));if(kit.withdrawn){pause();play.firstChild.textContent='REPACK AND RESTART ';}}else {if(hold){hold=null;heldNavigation.hold(null);}player.vx=player.vz=0;feel.step(0,player,player.config.juice);exercise.messageTime=Math.max(0,exercise.messageTime-dt);}
 const physicsEnd=performance.now(),motion=feel.output,lookMotion=lookSway.step(dt,active&&!view.blocking?(pad?.look.x??0):0,active&&!view.blocking?(pad?.look.y??0):0,player.config.juice,0),leanMotion=lean.step(dt,active&&!view.blocking?leanInput(keys,pad):0,player,obstacles);
 camera.position.set(player.x+Math.cos(player.yaw)*(motion.x+lookMotion.x)+leanMotion.x,player.y+player.eye+motion.y+lookMotion.y+leanMotion.y,player.z-Math.sin(player.yaw)*(motion.x+lookMotion.x)+leanMotion.z);camera.rotation.set(player.pitch+motion.pitch,player.yaw,motion.roll+lookMotion.roll+leanMotion.roll);heldNavigation.update(player,active&&!view.blocking?dt:0,feel,active,bodyCues.tremor);torch.setDark(clock.darkness);torch.step(active?dt:0,player);{const show=clock.darkness>.35;if(show!==torchShown){torchShown=show;torchButton.hidden=!show;}}camera.fov+=(player.config.fov+motion.fov-camera.fov)*(1-Math.exp(-8*dt));camera.updateProjectionMatrix();weather.step(dt,active,clock.darkness,torch.on,sunlight,hemisphere,forestVisibility,clock.dusk);river.step(dt);camp.step(active?dt:0,clock.hours,{dark:clock.darkness,rain:weather.state.rain,camera,range:scene.fog.far});warrenView.update(player);{const landed=floor.step(active?dt:0,player);if(landed)stickLanded(landed.data);}wildlife.step(dt,player,{activity:Math.min(1,.3+.3*clock.daylight+.5*clock.dusk),active:active&&!view.blocking&&kit.packed});if(sleepTime>0){sleepTime-=dt;if(sleepTime<=0)sleepFade.hidden=true;}soundscape.step(dt,weather.state.rain,weather.volume);forestLife.step(dt,active&&!view.blocking,camera,weather.state,torch.dark);
 frameAverage+=(Math.max(.001,frameMs/1000)-frameAverage)*.06;lastFrame=now;hudTime+=dt;if(hudTime>=.1){hudTime=0;view.update(player);{const look=active&&(!hold||hold.act==='press')?currentLook():null,label=holdLabel()??look?.label??'',usable=!!look?.act;if(label!==lookLabel){lookLabel=label;view.prompt.textContent=label;}if(usable!==lookUsable){lookUsable=usable;view.prompt.classList.toggle('usable',usable);}}if(active&&kit.packed){const advice=needAdvice(kit,lastBands);if(advice)say(advice,7);lastBands=needBands(kit,lastBands??{});}else lastBands=null;view.refreshNotes();vitals.update(kit.packed,kit,player);if(active&&(saveTimer+=.1)>=20){saveTimer=0;saveGame();}packing.update(active);inventory.render();hud.fps.textContent=`${Math.round(1/frameAverage)} FPS`;}
 const updateEnd=performance.now();for(const post of checkpointPosts){const dx=post.position.x-camera.position.x,dz=post.position.z-camera.position.z;post.visible=dx*dx+dz*dz<(scene.fog.far+4)**2;}updateSpringVisibility(springMeshes,springs,camera,scene.fog.far+4);// A jump of more than 40 m (restart, test teleport) loads the new area at once; walking streams it.
 if(Math.hypot(player.x-streamPosition.x,player.z-streamPosition.z)>40)forestStream.loadAround(player.x,player.z);else forestStream.update(player.x,player.z);streamPosition.x=player.x;streamPosition.z=player.z;
 if(forestStream.version!==forestStream.bakedVersion&&!forestStream.building&&sunlight.castShadow&&now-shadowBakeAt>1500){shadowBakeAt=now;bakeForestShadows(renderer,scene,sunlight,forestVisibility);}
 scene.updateMatrixWorld();forestVisibility.update(camera,true);const cullEnd=performance.now();gpuTimer.begin();if(benchmarkProbe)renderer.clear();else renderer.render(scene,camera);gpuTimer.end();const cpu=performance.now()-cpuStart;frameMonitor.sample(now,cpu,renderer.info.render,{physicsMs:physicsEnd-physicsStart,updateMs:updateEnd-physicsEnd,cullMs:cullEnd-updateEnd,renderMs:performance.now()-cullEnd});renderBudget.sample(frameMs,cpu,true,gpuTimer.ms);
});
