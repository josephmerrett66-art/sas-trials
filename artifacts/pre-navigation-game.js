import {ForestTorch,installTorchOptics} from './torch.js?v=no-ink-1';
import {terrainHeight,WORLD_SIZE} from './terrain.js';
import * as THREE from './vendor/three.module.js';
import {Controller,defaults} from './controller.js?v=no-ink-1';
import {GamepadInput} from './gamepad.js?v=pad-1';
import {SurvivalThreats} from './survival-threats.js?v=no-ink-1';
import {Survival} from './survival.js?v=no-ink-1';
import {PlayerLean,leanInput} from './lean.js?v=no-ink-1';
import {createForest,collideForest} from './forest.js?v=no-ink-1';
import {MovementFeel,LookSway} from './feel.js?v=look-sway-1';
import {Arsenal} from './arsenal.js?v=no-ink-1';
import {PackWorld} from './pack-world.js?v=no-ink-1';
import {Footprints} from './footprints.js?v=no-ink-1';
import {loadDetailAtlases} from './detail-atlas.js?v=performance-15';
import {FrameMonitor} from './frame-monitor.js';
import {fitForestShadows} from './forest-shadows.js';
import {ForestVisibility} from './forest-visibility.js?v=no-ink-1';
import {RenderBudget} from './render-budget.js?v=no-ink-1';
import {GpuTimer} from './gpu-timer.js?v=performance-12';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x000000);scene.fog=new THREE.Fog(0x000000,22,45);
const camera=new THREE.PerspectiveCamera(85,innerWidth/innerHeight,.05,900);camera.rotation.order='YXZ';scene.add(camera);

const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'high-performance'});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1));document.querySelector('#world').appendChild(renderer.domElement);
const hemisphere=new THREE.HemisphereLight(0xd9edff,0x5d6240,1.2);hemisphere.layers.enable(1);scene.add(hemisphere);
const sunlight=new THREE.DirectionalLight(0xffe0ac,1.7);sunlight.layers.enable(1);sunlight.position.set(-30,50,20);sunlight.castShadow=true;sunlight.shadow.mapSize.set(2048,2048);Object.assign(sunlight.shadow.camera,{left:-50,right:50,top:50,bottom:-50,near:.1,far:180});sunlight.shadow.bias=-.0002;sunlight.shadow.normalBias=.035;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.BasicShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;scene.add(sunlight);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000),new THREE.MeshBasicMaterial({color:0x667244}));floor.rotation.x=-Math.PI/2;floor.position.y=-80;scene.add(floor);
const obstacles=createForest(scene);
fitForestShadows(sunlight,scene);
const forestVisibility=new ForestVisibility(scene,{maxDistance:scene.fog.far+2});
for(const object of scene.children)if(object.isMesh){object.updateMatrixWorld(true);object.matrixAutoUpdate=false;object.matrixWorldAutoUpdate=false;}
const footprints=new Footprints(scene);
const feel=new MovementFeel(),lookSway=new LookSway(),lean=new PlayerLean();
const packWorld=new PackWorld(scene,obstacles,{survival:true,knifeOnly:true,groundHeight:terrainHeight});
const pistol=new Arsenal(camera,scene,feel,packWorld,{knifeOnly:true});
const enemy=new SurvivalThreats(scene,obstacles,feel);pistol.pursuer=enemy;enemy.root.visible=false;
document.querySelector('.hint').textContent='Loading forest and knife…';
document.querySelector('#play').disabled=true;
try{await Promise.all([packWorld.load(),pistol.load(),loadDetailAtlases(),enemy.ready]);}catch(error){document.querySelector('.hint').textContent='Asset loading failed. Reload the page to retry.';throw error;}
renderer.shadowMap.needsUpdate=true;
document.querySelector('#play').disabled=false;
document.querySelector('.hint').textContent='Xbox controller or mouse + keyboard · Press A to start';
packWorld.onExplosion=(position,radius)=>{const distance=Math.hypot(position.x-player.x,position.z-player.z);if(distance<25)feel.sound(Math.max(.1,1.4-distance/25),true);if(distance<radius)feel.landed(10);enemy.explode(position,radius);enemy.noise(position.x,position.z,120);};
const player=new Controller(terrainHeight,WORLD_SIZE/2-5),keys=new Set(),movementInput=new Set();const gamepad=new GamepadInput();let mouseFire=false,mouseAim=false,active=false,locked=false,controllerMode=false,accumulator=0,last=performance.now(),lastFrame=last;
player.z=12;
const survival=new Survival(scene,packWorld,pistol,enemy);
for(const npc of enemy.pool)npc.groundHeight=terrainHeight;
// Eternal night: only surfaces reached by the torch receive illumination.
sunlight.intensity=0;sunlight.castShadow=false;hemisphere.intensity=0;renderer.shadowMap.enabled=false;renderer.shadowMap.needsUpdate=false;
for(const name of ['Faceted sky clouds','Distant mountain silhouettes'])scene.getObjectByName(name).visible=false;
scene.traverse(object=>{if(!object.isMesh||!object.material?.isMeshBasicMaterial)return;const old=object.material;object.material=new THREE.MeshLambertMaterial({color:old.color,transparent:old.transparent,opacity:old.opacity,depthWrite:old.depthWrite,side:old.side,polygonOffset:old.polygonOffset,polygonOffsetFactor:old.polygonOffsetFactor,polygonOffsetUnits:old.polygonOffsetUnits});old.dispose();});
installTorchOptics(scene);
const torch=new ForestTorch(camera),torchButton=document.querySelector('#torch-toggle');
const syncTorch=()=>{torchButton.setAttribute('aria-pressed',String(torch.on));torchButton.textContent=torch.dark?`TORCH · ${torch.on?'ON':'OFF'}`:'TORCH · DAYLIGHT';};
torchButton.addEventListener('click',()=>{torch.toggle();syncTorch();});syncTorch();
const nightSetting=document.querySelector('#night-mode');
function setNightMode(night,persist=true){
 nightSetting.checked=night;torch.setDark(night);survival.nightMode=night;
 sunlight.intensity=night?0:1.7;hemisphere.intensity=night?0:1.2;
 scene.background.set(night?0x000000:0x9cbdd0);scene.fog.color.copy(scene.background);
 scene.fog.near=night?22:35;scene.fog.far=night?45:90;
 forestVisibility.maxDistance=scene.fog.far+2;forestVisibility.previousPosition.set(Infinity,Infinity,Infinity);
 document.querySelector('#menu h1').innerHTML=night?'There is<br><em>no dawn.</em>':'Into the<br><em>woods.</em>';
 document.querySelector('#menu p').innerHTML=night?'Search black barrels for supplies.<br>Bring fuel home. Avoid roaming threats.<br>Keep the camp supplied. Survive eternal night.':'Search black barrels for supplies.<br>Explore the forest. Avoid roaming threats.<br>Switch on night mode for torch-lit survival.';
 torchButton.disabled=!night;torchButton.textContent=night?`TORCH · ${torch.on?'ON':'OFF'}`:'TORCH · DAYLIGHT';
 if(persist)try{localStorage.setItem('forest-night-mode',String(night));}catch{}
}
let savedNight=true;try{savedNight=localStorage.getItem('forest-night-mode')!=='false';}catch{}
const lightingOverride=new URLSearchParams(location.search).get('lighting');
setNightMode(lightingOverride?lightingOverride!=='day':savedNight,false);
nightSetting.addEventListener('change',()=>setNightMode(nightSetting.checked));
function resetRun(){player.reset();player.z=12;feel.reset();lookSway.reset();lean.reset();pistol.reset();enemy.reset(player);packWorld.clearTransient();survival.reset();}
const hint=document.querySelector('.hint'),footer=document.querySelector('footer');
const keyboardHelp=footer.innerHTML;let helpMode=null;
const hud=Object.fromEntries(['damage','speed','speedbar','state','distance','crosshair','ammo','fps','bunny'].map(id=>[id,document.getElementById(id)]));
let hudTime=0,frameAverage=1/60;
function setActive(value){if(value){feel.unlockAudio();pistol.sounds.unlock();}active=value;enemy.root.visible=value;document.body.classList.toggle('playing',value);keys.clear();player.jumpBuffer=0;accumulator=0;document.querySelector('#play').firstChild.textContent='RESUME THE WORLD ';}
function pause(){mouseFire=false;mouseAim=false;setActive(false);if(locked)document.exitPointerLock();}
function readPad(){try{return gamepad.read(navigator.getGamepads?.()??[],player.config.deadzone,player.config.stickCurve);}catch{return null;}}
const fields=[['size','Player size',.7,2.2,.05],['walk','Walk speed',2,10,.1],['sprint','Sprint speed',5,16,.1],['acceleration','Acceleration',10,90,1],['braking','Braking',5,80,1],['directionGrip','Direction grip',0,24,1],['airControl','Air control',0,25,.5],['jump','Jump height',.5,2.5,.05],['sensitivity','Mouse sensitivity',.0005,.005,.0001],['fov','Field of view',65,110,1],['stickSensitivity','Stick look speed',.5,5,.1],['stickCurve','Stick precision curve',1,2.4,.1],['deadzone','Stick dead zone',.05,.35,.01],['juice','Camera motion',0,2,.1],['armMotion','Arm motion',0,2,.1],['footstepVolume','Footstep volume',0,1,.05]];
for(const [key,name,min,max,step] of fields){const label=document.createElement('label');label.className='setting';label.innerHTML=`${name}<output></output><input type="range" min="${min}" max="${max}" step="${step}" value="${player.config[key]}" aria-label="${name}">`;const input=label.querySelector('input'),out=label.querySelector('output');const sync=()=>{if(key==='size'){player.setSize(Number(input.value));collideForest(player,obstacles);}else player.config[key]=Number(input.value);out.value=key==='sensitivity'?(Number(input.value)*1000).toFixed(1):Number(input.value).toFixed((key==='jump'||key==='deadzone'||key==='size'||key==='adsSensitivity')?2:1)+(key==='size'?'×':'');};input.addEventListener('input',sync);sync();document.querySelector('#sliders').appendChild(label);}
document.querySelector('#reset').onclick=()=>{player.setSize(defaults.size);Object.assign(player.config,defaults);document.querySelectorAll('.setting input').forEach((el,i)=>{el.value=defaults[fields[i][0]];el.dispatchEvent(new Event('input'));});};
document.querySelector('#play').onclick=async()=>{if(readPad()){controllerMode=true;setActive(true);return;}controllerMode=false;try{await renderer.domElement.requestPointerLock();}catch{hint.textContent='Connect an Xbox controller or open in a desktop browser for mouse capture.';}};
document.addEventListener('pointerlockchange',()=>{locked=document.pointerLockElement===renderer.domElement;if(locked){controllerMode=false;setActive(true);}else if(!controllerMode)setActive(false);});
document.addEventListener('pointerdown',()=>{feel.unlockAudio();pistol.sounds.unlock(true);});
document.addEventListener('keydown',()=>{feel.unlockAudio();pistol.sounds.unlock(true);},{once:true});
document.addEventListener('mousemove',e=>{if(!locked)return;player.yaw-=e.movementX*player.config.sensitivity*(1-pistol.aim*.4);player.pitch=THREE.MathUtils.clamp(player.pitch-e.movementY*player.config.sensitivity*(1-pistol.aim*.4),-Math.PI/2+.01,Math.PI/2-.01);});
document.addEventListener('keydown',e=>{if(e.code==='Escape'){pause();return;}if(!active)return;if(['Space','KeyW','KeyA','KeyS','KeyD','KeyC','KeyQ','KeyE','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)player.jumpBuffer=player.time+.12;if(e.code==='KeyF'&&!e.repeat)pistol.melee();if(e.code==='KeyL'&&!e.repeat){torch.toggle();syncTorch();}if(e.code==='KeyG'&&!e.repeat)survival.interact(player);if(e.code==='KeyH'&&!e.repeat)survival.heal();if(e.code==='KeyT')resetRun();});
document.addEventListener('mousedown',e=>{if(!active||(!locked&&e.target!==renderer.domElement))return;if(e.button===0){mouseFire=true;pistol.fire();}if(e.button===2)mouseAim=true;});
document.addEventListener('mouseup',e=>{if(e.button===2)mouseAim=false;if(e.button===0)mouseFire=false;});
renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',pause);document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderBudget.resize(innerWidth,innerHeight,devicePixelRatio);});
const graphics=renderer.getContext(),gpuTimer=new GpuTimer(graphics),adapterExtension=graphics.getExtension('WEBGL_debug_renderer_info');const adapter=adapterExtension?graphics.getParameter(adapterExtension.UNMASKED_RENDERER_WEBGL):graphics.getParameter(graphics.RENDERER);
const noCull=new URLSearchParams(location.search).has('nocull');const renderBudget=new RenderBudget(renderer,Math.min(devicePixelRatio,1));renderBudget.resize(innerWidth,innerHeight,devicePixelRatio);const frameMonitor=new FrameMonitor(),benchmark=new URLSearchParams(location.search).has('benchmark');let benchmarkStart=0,benchmarkDone=false,benchmarkWarm=false,benchmarkProbe=false,benchmarkResult=null;const benchmarkOutput=document.createElement('output');benchmarkOutput.id='performance-results';benchmarkOutput.hidden=!benchmark;if(benchmark){benchmarkOutput.style='position:fixed;bottom:12px;left:12px;color:white;background:#000c;padding:12px;font:13px monospace;z-index:100;max-width:460px;white-space:pre-wrap';benchmarkOutput.textContent='Benchmark running: walking, turning, jumping and knife attacks…';document.body.appendChild(benchmarkOutput);pistol.select(0,true);setActive(true);}
if(new URLSearchParams(location.search).has('survivaltest')){
 const panel=document.createElement('div');panel.style='position:fixed;left:20px;top:140px;z-index:110;padding:12px;background:#18221bf0;color:white';
 const button=(label,action)=>{const b=document.createElement('button');b.textContent=label;b.onclick=action;panel.appendChild(b);};
 const caches=packWorld.targets.filter(t=>t.lootCache);for(let i=0;i<caches.length;i++)button(`Cache ${i+1}`,()=>{player.x=caches[i].x;player.z=caches[i].z+2.4;player.yaw=0;player.pitch=-.28;});
 button('Hills',()=>{player.x=32;player.z=-145;player.y=terrainHeight(player.x,player.z);player.yaw=.1;player.pitch=-.14;});button('Camp',()=>{player.x=0;player.z=12;player.yaw=.3;player.pitch=-.28;});button('Search / store',()=>survival.interact(player));button('Test medkit',()=>{enemy.playerHealth=40;survival.heal();});button('New run',resetRun);button('Hide test controls',()=>panel.hidden=true);document.body.appendChild(panel);setActive(true);
}
renderer.info.autoReset=false;scene.matrixAutoUpdate=false;scene.matrixWorldAutoUpdate=false;
renderer.setAnimationLoop(now=>{if(document.hidden){last=lastFrame=now;return;}const cpuStart=performance.now(),lastFramePrevious=lastFrame;renderer.info.reset();if(benchmark&&!benchmarkDone){benchmarkStart||=now;const elapsed=(now-benchmarkStart)/1000;player.yaw=Math.sin(elapsed*.25)*1.4;player.pitch=-.04;for(let i=0;i<enemy.pool.length;i++){const npc=enemy.pool[i],angle=player.yaw+(i-(enemy.pool.length-1)/2)*.14;npc.x=player.x-Math.sin(angle)*8;npc.z=player.z-Math.cos(angle)*8;npc.health=npc.playerHealth=100;npc.grace=0;}enemy.playerHealth=100;keys.add('KeyW');if(elapsed%3<.15)player.jumpBuffer=player.time+.12;if(pistol.current.spec.automatic||elapsed%1<.2)pistol.fire();if(pistol.state.ammo===0)pistol.reload();if(elapsed>=10&&!benchmarkWarm){benchmarkWarm=true;frameMonitor.frames=[];}if(elapsed>=30&&!benchmarkProbe){benchmarkProbe=true;pause();benchmarkResult={...frameMonitor.summary(),weapon:pistol.current.spec.id,mode:torch.dark?'eternal-night':'daylight',torch:torch.on,dark:torch.dark,map:scene.userData.forestStats,enemies:enemy.alive,adapter,renderScale:renderBudget.scale,gpuMs:gpuTimer.ms,viewport:{width:innerWidth,height:innerHeight,pixelRatio:renderer.getPixelRatio()}};frameMonitor.frames=[];benchmarkOutput.textContent='Checking browser frame cadence with an empty render…';}if(elapsed>=36){benchmarkDone=true;benchmarkProbe=false;benchmarkOutput.textContent=JSON.stringify({...benchmarkResult,emptyRenderFps:frameMonitor.summary().fps},null,2);benchmarkOutput.dataset.result=benchmarkOutput.textContent;}}const dt=Math.min((now-last)/1000,.05);last=now;const pad=benchmark?null:readPad();
if(controllerMode&&!pad){pause();controllerMode=false;hint.textContent='Controller disconnected. Reconnect and press A to resume.';}
if(pad){hint.textContent='Xbox controller connected · Press A to enter · Menu to pause';if(helpMode!=='pad'){helpMode='pad';footer.innerHTML='<span><kbd>LS</kbd> Move</span><span><kbd>RS</kbd> Look</span><span><kbd>LS CLICK</kbd> Sprint (hold)</span><span><kbd>A</kbd> Jump</span><span><kbd>B</kbd> Crouch / slide</span><span><kbd>D-PAD ← / →</kbd> Lean (hold)</span><span><kbd>RT</kbd> Slash</span><span><kbd>RB</kbd> Torch</span><span><kbd>X</kbd> Search / store</span><span><kbd>RS CLICK</kbd> Melee</span><span><kbd>D-PAD ↑</kbd> Medkit</span><span><kbd>Y</kbd> New run</span><span><kbd>MENU</kbd> Tune</span>';}if(pad.pause){if(active)pause();else{controllerMode=true;setActive(true);}}else if(!active&&pad.jumpPressed){controllerMode=true;setActive(true);}else if(active&&pad.jumpPressed)player.jumpBuffer=player.time+.12;if(active&&pad.meleePressed)pistol.melee();if(active&&pad.nextPressed){torch.toggle();syncTorch();}if(active&&pad.firePressed)pistol.fire();if(active&&pad.reloadPressed)survival.interact(player);if(active&&pad.healPressed)survival.heal();if(active&&pad.respawn)resetRun();}else if(helpMode!=='keyboard'){helpMode='keyboard';footer.innerHTML=keyboardHelp;}

const physicsStart=performance.now();
const aiming=false;
if(active&&pistol.current.spec.automatic&&(mouseFire||pad?.fire))pistol.fire();
if(active){if(pad){player.yaw-=pad.look.x*player.config.stickSensitivity*(1-pistol.aim*(1-player.config.adsSensitivity))*dt;player.pitch=THREE.MathUtils.clamp(player.pitch-pad.look.y*player.config.stickSensitivity*(1-pistol.aim*(1-player.config.adsSensitivity))*dt,-Math.PI/2+.01,Math.PI/2-.01);}const input=movementInput;input.clear();if(enemy.playerHealth>0)for(const key of keys)input.add(key);if(pad&&enemy.playerHealth>0){if(pad.jump)input.add('Space');if(pad.crouch)input.add('KeyC');if(pad.sprint)input.add('ShiftLeft');}if(aiming){input.delete('ShiftLeft');input.delete('ShiftRight');}accumulator+=dt;while(accumulator>=1/120){const wasGrounded=player.grounded,fallSpeed=-player.vy;player.step(1/120,input,hud.bunny.checked,pad?.move);collideForest(player,obstacles);footprints.step(player);if(!wasGrounded&&player.grounded)feel.landed(fallSpeed);if(wasGrounded&&!player.grounded)feel.jumped();feel.step(1/120,player,player.config.juice);accumulator-=1/120;}}const physicsEnd=performance.now();const motion=feel.output,lookMotion=lookSway.step(dt,active?(pad?.look.x??(benchmark&&!benchmarkDone?Math.cos(now*.00025)*.6:0)):0,active?(pad?.look.y??0):0,player.config.juice,pistol.aim);const leanDirection=active?(leanInput(keys,pad)+(benchmark&&!benchmarkDone?Math.sign(Math.sin(now*.001)):0)):0,leanMotion=lean.step(dt,leanDirection,player,obstacles);camera.position.set(player.x+Math.cos(player.yaw)*(motion.x+lookMotion.x)+leanMotion.x,player.y+player.eye+motion.y+lookMotion.y+leanMotion.y,player.z-Math.sin(player.yaw)*(motion.x+lookMotion.x)+leanMotion.z);camera.rotation.set(player.pitch+motion.pitch,player.yaw,motion.roll+lookMotion.roll+leanMotion.roll);enemy.root.visible=active;enemy.step(active&&!survival.finished?dt:0,player);survival.step(active&&!benchmark?dt:0,player);torch.step(active?dt:0,player);packWorld.update(active?dt:0);pistol.update(active?dt:0,player,feel,active,aiming,lookMotion);document.body.classList.toggle('scoped',pistol.current.spec.id==='awm'&&pistol.aim>.9&&active);const targetFov=THREE.MathUtils.lerp(player.config.fov+motion.fov,player.config.fov-(pistol.current.spec.id==='awm'?45:18),pistol.aim);camera.fov+=(targetFov-camera.fov)*(1-Math.exp(-8*dt));camera.updateProjectionMatrix();const speed=Math.hypot(player.vx,player.vz);frameAverage+=(Math.max(.001,(now-lastFrame)/1000)-frameAverage)*.06;lastFrame=now;hudTime+=dt;if(hudTime>=.1){hudTime=0;hud.speed.textContent=speed.toFixed(2);hud.speedbar.style.width=`${Math.min(100,speed/player.config.sprint*100)}%`;hud.state.textContent=player.state;document.querySelector('#threat').textContent=`${enemy.status} · HEALTH ${Math.ceil(enemy.playerHealth)}`;hud.damage.style.opacity=enemy.attack>0?String(enemy.attack*.5):enemy.playerHealth<=0?'.65':'0';hud.distance.textContent=`${Math.floor(player.travel)} m travelled`;hud.crosshair.style.opacity=String(1-pistol.aim*.75);hud.ammo.textContent=pistol.hud();document.querySelector('#hitmarker').style.opacity=pistol.hitTimer>0?'1':'0';hud.fps.textContent=`${Math.round(1/frameAverage)} FPS`;document.querySelector('#survival-hud').textContent=survival.hud(player);document.querySelector('#interaction').textContent=survival.prompt();}const updateEnd=performance.now();camera.layers.enable(1);scene.updateMatrixWorld();if(renderer.shadowMap.needsUpdate)forestVisibility.restoreAll();else if(!noCull)forestVisibility.update(camera,true);const cullEnd=performance.now();renderer.autoClear=true;gpuTimer.begin();if(benchmarkProbe){renderer.clear();}else renderer.render(scene,camera);gpuTimer.end();const cpuMs=performance.now()-cpuStart;frameMonitor.sample(now,cpuMs,renderer.info.render,{physicsMs:physicsEnd-physicsStart,updateMs:updateEnd-physicsEnd,cullMs:cullEnd-updateEnd,renderMs:performance.now()-cullEnd});renderBudget.sample((now-lastFramePrevious),cpuMs,!document.hidden,gpuTimer.ms);if(hudTime===0)hud.fps.title=JSON.stringify({...frameMonitor.summary(),renderScale:renderBudget.scale,gpuMs:gpuTimer.ms});});
