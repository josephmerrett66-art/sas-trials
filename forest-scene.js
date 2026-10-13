import {stonePathSites,drapeStoneMaterial} from './stone-path.js?v=big-1';
import {meadowGrassGeometry,distantGrassGeometry} from './meadow-grass.js?v=1';
import {woodlandField,TREE_DETAIL_DISTANCE} from './nature-trees.js?v=big-1';
import {refineConifer,broadleafGeometry,flowerPatchGeometry,flowerSites} from './woodland-polish.js?v=big-1';
import {controlLandmarkClearing} from './control-landmarks.js?v=big-1';
import {createUniqueLandmarks} from './unique-landmarks.js?v=big-1';
import {SECOND_CONTROL,secondControlClearing} from './second-control.js?v=big-1';
import {createWreckLandmark} from './wreck-landmark.js?v=big-1';
import {FIRST_CONTROL,firstControlClearing,isControlBoulder} from './first-control.js?v=big-1';
import {trailClearance,trailCenter,trails} from './landmark-routes.js?v=big-1';
import * as THREE from './vendor/three.module.js';
import {createGroundMaterial} from './ground-material.js?v=gravel-1';
import {createSurfaceMaterial} from './surface-material.js?v=details-1';
import {makeSourceSteps} from './forest-visibility.js?v=big-1';
import {terrainHeight,terrainNormal,WORLD_SIZE,TERRAIN_STEP,riverClearance} from './terrain.js?v=valleys-1';
export {trailCenter};

// The forest is laid out once for the whole map (trees, rocks, stumps, logs: everything
// you can collide with), but only drawn near the player. Meshes are streamed in 160 m
// chunks: each chunk turns its share of the layout, plus its grass and small plants,
// into instance matrices for a fixed set of shared batches (one draw each).
export const CHUNK=160,LOAD_RADIUS=170,UNLOAD_RADIUS=260;
const half=WORLD_SIZE/2,span=WORLD_SIZE-20,areaScale=(span/620)**2,chunksPerSide=Math.ceil(WORLD_SIZE/CHUNK);
// mulberry32: unlike a plain LCG, successive pairs do not fall on visible lines.
const rng=seed=>{seed>>>=0;return ()=>{seed=(seed+0x6D2B79F5)>>>0;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};};
const hashSeed=(a,b,c=0)=>{let k=Math.imul(a|0,374761393)^Math.imul(b|0,668265263)^Math.imul(c|0,2246822519);k=Math.imul(k^(k>>>13),1274126177);return (k^(k>>>16))>>>0;};
const chunkOf=v=>Math.max(0,Math.min(chunksPerSide-1,Math.floor((v+half)/CHUNK)));
const chunkKey=(cx,cz)=>cx*1024+cz;
const cleared=(x,z)=>firstControlClearing(x,z)||secondControlClearing(x,z)||controlLandmarkClearing(x,z);
const outsideTrail=(x,z,margin=3.5)=>trailClearance(x,z)>margin-2.15&&Math.hypot(x,z-8)>5&&riverClearance(x,z)>margin-1.5;
const grassPatch=(x,z)=>.5+.28*Math.sin(x*.18+Math.sin(z*.09)*2)+.22*Math.cos(z*.15-x*.07);

// Whole-map layout: deterministic, cheap, and shared by collision, springs and wood.
function forestLayout(natureModels){
 const random=rng(417),trees=[],rocks=[],stumps=[],logs=[];
 for(let i=0;i<Math.round(4700*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z)||cleared(x,z))continue;trees.push({x,z,height:9+random()*14,width:1.65+random()*2.25,rotation:random()*Math.PI*2,trunk:.7+random()*.65});}
 const landmarkTrees=[[-6,-2],[7,-4],[-6,-17],[6,1],[-7,13]].map(([x,z])=>({x,z,height:22,width:3.5,rotation:random()*6,trunk:1.3}));trees.push(...landmarkTrees);
 trees.forEach((tree,i)=>{
  const roll=random(),last=trees.length-5;tree.id=i;tree.species=i>=last?[0,2,4,3,1][i-last]:roll<.3?0:roll<.55?1:roll<.76?2:roll<.86?3:roll<.93?4:5;
  if(natureModels){const field=woodlandField(tree.x,tree.z);tree.kitFamily=field.grove>.4?2:field.grove<-.5?1:0;tree.species=roll>.94?5:tree.kitFamily===2?3:tree.kitFamily===1?2:0;}
  if(tree.species===0)tree.width*=.75;
  if(tree.species===1){tree.width*=.9;tree.height*=1.1;}
  if(tree.species===2)tree.width*=1.2;
  if(tree.species===3){tree.height*=.75;tree.width*=1.3;}
  if(tree.species===4){tree.height*=.7;tree.trunk*=.8;}
  if(tree.species===5){tree.height*=.45;tree.width*=.45;tree.trunk*=.45;}
  tree.leanX=(random()-.5)*.09;tree.leanZ=(random()-.5)*.09;
  tree.trunkHeight=tree.height*(tree.species===3?.63:tree.species===4?1:.72);
  tree.ground=terrainHeight(tree.x,tree.z);tree.shade=.65+random()*.35;
 });
 let planted=trees;
 if(natureModels)planted=trees.filter((t,i)=>{if(i>=trees.length-5)return true;const hash=Math.sin(t.x*12.9898+t.z*78.233)*43758.5453;return hash-Math.floor(hash)<=woodlandField(t.x,t.z).density;});
 for(let i=0;i<Math.round(1600*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z,4.4)||cleared(x,z))continue;rocks.push({x,z,size:.6+random()*2.8,rotation:random()*6,shade:.8+random()*.2});}
 for(const [x,z,size] of [[-4,-3,2.1],[5,-11,2.4],[-7,-23,3],[8,9,2.5]])rocks.push({x,z,size,rotation:random()*6,shade:1});
 rocks.push(FIRST_CONTROL.north,FIRST_CONTROL.south);
 for(let i=0;i<Math.round(260*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z,4)||cleared(x,z))continue;stumps.push({x,z,size:.4+random()*.5,height:.3+random()*.4});}
 for(let i=0;i<Math.round(140*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z,7)||cleared(x,z))continue;logs.push({x,z,rotation:random()*6,length:2.3+random()*2,radius:.18+random()*.17});}
 const pebbles=[];for(const route of trails)for(let z=route.start;z<route.end;z+=.55){const x=route.center(z)+(random()-.5)*8;pebbles.push({x,z,size:.03+random()*.19,rotation:random()*6,shade:.7+random()*.3});}
 const obstacles=[];
 for(const t of planted)obstacles.push({x:t.x,z:t.z,baseY:t.ground,radius:.43*t.trunk,height:t.height,tree:t});
 for(const r of rocks)obstacles.push({x:r.x,z:r.z,baseY:terrainHeight(r.x,r.z),radius:r.size*.85,height:r.size});
 for(const s of stumps)obstacles.push({x:s.x,z:s.z,baseY:terrainHeight(s.x,s.z),radius:s.size,height:s.height});
 for(const l of logs)for(let i=-1;i<=1;i++)obstacles.push({x:l.x-Math.sin(l.rotation)*i*l.length/3,z:l.z+Math.cos(l.rotation)*i*l.length/3,baseY:terrainHeight(l.x,l.z),radius:l.radius+.15,height:l.radius*2});
 return {trees:planted,allTrees:trees,rocks,stumps,logs,pebbles,obstacles};
}
// Bucket whole-map items by chunk.
function bucket(items,map,name){for(const item of items){const key=chunkKey(chunkOf(item.x),chunkOf(item.z));let entry=map.get(key);if(!entry)map.set(key,entry={});(entry[name]??=[]).push(item);}}

export function createForest(scene,natureModels=null,{around={x:0,z:12}}={}){
 const layout=forestLayout(natureModels),{trees,rocks,stumps,logs,pebbles}=layout,details=natureModels?.details??null;
 const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,flatShading:true,roughness:1,...extra});
 // Batch definitions: one pooled instanced mesh each, filled by whichever chunks are loaded.
 const batches=new Map();
 const define=(name,geometry,mat,{colored=false,decorative=false,range,minRange,shadowOnly=false,castShadow,receiveShadow,surface=true,extra={}}={})=>{
  const kind=name.includes('wood faces')?'wood':/trunks|branches|stumps|logs|roots|knots/.test(name)?'bark':/boulders|pebbles/.test(name)?'rock':/crowns|shrubs|ferns|grass/.test(name)?'foliage':null;
  if(surface&&kind&&!mat.userData.surface){const old=mat;mat=createSurfaceMaterial(/Distant grass/.test(name)?'grassFar':/grass/.test(name)?'grass':kind,old.color,{side:old.side,fog:old.fog,vertexColors:old.vertexColors});old.dispose();}
  const mesh=new THREE.InstancedMesh(geometry,mat,64);mesh.count=0;mesh.name=name;mesh.frustumCulled=false;mesh.userData.streamed=true;mesh.userData.decorative=decorative;Object.assign(mesh.userData,extra);
  if(colored)mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(64*3).fill(1),3);
  if(range)mesh.userData.visibilityRange=range;if(minRange)mesh.userData.minVisibilityRange=minRange;
  if(shadowOnly){mesh.userData.shadowOnly=true;mesh.userData.treeProxy=true;}
  mesh.castShadow=castShadow??/trunks|crowns|branches|knots|boulders|stumps|logs|roots/.test(name);mesh.receiveShadow=receiveShadow??(mesh.castShadow||/shrubs|ferns|grass|wildflower|wood faces/.test(name));
  scene.add(mesh);const batch={name,mesh,colored};batches.set(name,batch);return batch;
 };
 const treeProxy=!!natureModels,rockProxy=!!details;
 define('Tall faceted trunks',(()=>{const g=new THREE.CylinderGeometry(.17,.43,1,7);g.translate(0,.5,0);return g;})(),material(0x87603c),{shadowOnly:treeProxy});
 const species=['pine','spruce','fir','broadleaf','snag','sapling'];
 for(const type of [0,1,2,5]){
  const segments=type===1?9:type===2?8:7;let geometry=new THREE.ConeGeometry(1,1,segments,2);const vertices=geometry.attributes.position;
  for(let i=0;i<vertices.count;i++){const x=vertices.getX(i),z=vertices.getZ(i),y=vertices.getY(i),angle=Math.atan2(z,x),ragged=1+Math.sin(angle*5+y*13)*.16+Math.cos(angle*3+y*7)*.08;vertices.setXYZ(i,x*ragged,y+Math.sin(angle*4)*.025*(.5-y),z*ragged);}
  geometry.computeVertexNormals();geometry=refineConifer(geometry);
  define(species[type]+' irregular crowns',geometry,material(type===1?0x547544:type===2?0x6b8140:0x657d3b),{colored:true,shadowOnly:treeProxy});
 }
 define('Broadleaf clustered crowns',broadleafGeometry(),material(0x789044),{colored:true,shadowOnly:treeProxy});
 if(!natureModels){
  define('Uneven exposed branches',(()=>{const g=new THREE.CylinderGeometry(.025,.085,1,5);g.translate(0,.5,0);return g;})(),material(0x765435));
  define('Flared trunk roots',(()=>{const g=new THREE.ConeGeometry(1,1,4);g.translate(0,.5,0);return g;})(),material(0x755335));
  define('Trunk bark knots',new THREE.IcosahedronGeometry(1,0),material(0x60432c));
 }
 const families=[];
 if(natureModels)natureModels.forEach((model,family)=>{for(const part of model.parts){const b=define(`Woodland ${model.name} ${part.leaf?'crowns':'trunks'}`,part.geometry,part.material,{colored:true,range:TREE_DETAIL_DISTANCE,castShadow:false,receiveShadow:true,surface:false,extra:{treeDetail:true}});families.push({family,batch:b});}});
 define('Large faceted boulders',new THREE.IcosahedronGeometry(1,0),material(0x777d78),{colored:true,shadowOnly:rockProxy});
 if(!details){
  define('Trail pebbles',new THREE.IcosahedronGeometry(1,0),material(0x92938b),{colored:true,decorative:true});
  define('Low angular shrubs',new THREE.IcosahedronGeometry(1,0),material(0x627b36),{colored:true,decorative:true});
  const fernVertices=[];for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=Math.sin(angle),z=Math.cos(angle);fernVertices.push(0,0,0,x*.5+.1,.22,z*.5-.1,x*.8,.4,z*.8,0,0,0,x*.8,.4,z*.8,x*.5-.1,.22,z*.5+.1);}
  const fernGeometry=new THREE.BufferGeometry();fernGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fernVertices,3));fernGeometry.computeVertexNormals();
  define('Star-shaped forest ferns',fernGeometry,material(0x83a34c,{side:THREE.DoubleSide}),{colored:true,decorative:true});
  define('Small woodland wildflower patches',flowerPatchGeometry(),createSurfaceMaterial('foliage',0xffffff,{vertexColors:true,side:THREE.DoubleSide}),{decorative:true,surface:false});
 }
 const grassGeometry=meadowGrassGeometry();
 define('Dense grass clumps',grassGeometry,material(0xffffff,{side:THREE.DoubleSide,vertexColors:true}),{colored:true,decorative:true,range:33});
 define('Distant grass carpet',distantGrassGeometry(grassGeometry),material(0xffffff,{side:THREE.DoubleSide,vertexColors:true}),{colored:true,decorative:true,range:94,minRange:20});
 define('Cut tree stumps',new THREE.CylinderGeometry(.8,1,1,7),material(0x735337));
 define('Pale cut wood faces',new THREE.CircleGeometry(1,7),material(0xb28d58),{decorative:true});
 define('Fallen tree logs',new THREE.CylinderGeometry(1,1,1,7),material(0x6d5035));
 // Imported detail models (rocks, stone path, small habitat plants), when available.
 const detailBatches=new Map();
 if(details){
  for(const [name,model] of details){const range=/^Rock_Medium/.test(name)||name==='RockPath_Round_Wide'?94:/Pebble|Petal/.test(name)?35:55;detailBatches.set(name,model.parts.map((part,i)=>{if(name==='RockPath_Round_Wide')drapeStoneMaterial(part.material);return define(`Kit ${name}`+(i?` ${i}`:''),part.geometry,part.material,{colored:true,decorative:true,range,castShadow:false,receiveShadow:true,surface:false});}));}
 }
 const pathTiles=details?.has('RockPath_Round_Wide')?stonePathSites(trails,details.get('RockPath_Round_Wide')):[];
 const flowers=details?[]:flowerSites();
 // Whole-map items, bucketed by chunk.
 const chunks=new Map();
 bucket(trees,chunks,'trees');bucket(rocks,chunks,'rocks');bucket(stumps,chunks,'stumps');bucket(logs,chunks,'logs');
 if(!details)bucket(pebbles,chunks,'pebbles');bucket(flowers,chunks,'flowers');bucket(pathTiles,chunks,'path');
 // The few shrubs that frame the start of the trail.
 {const r=rng(77);const start=[];for(let i=0;i<60;i++){const z=-60+r()*80,x=trailCenter(z)+(r()<.5?-1:1)*(4+r()*7);if(Math.hypot(x,z-8)>6)start.push({x,z,size:.6+r()*.9,rotation:r()*6,shade:.7+r()*.3});}bucket(start,chunks,'startShrubs');}
 const stream=new ForestStream(scene,{batches,chunks,families,detailBatches,details,natureModels});
 scene.userData.forestStream=stream;
 const detailNames=details?[...details.keys()].filter(n=>!n.startsWith('Rock')):[];
 scene.userData.forestStats={worldSize:WORLD_SIZE,areaMultiplier:WORLD_SIZE**2/280**2,expansionFromNavigation:WORLD_SIZE**2/640**2,chunk:CHUNK,trees:trees.length,species:Object.fromEntries(species.map((name,i)=>[name,trees.filter(t=>t.species===i).length])),flowerPatches:flowers.length,boulders:rocks.length,stumps:stumps.length,logs:logs.length,obstacles:layout.obstacles.length};
 Object.defineProperty(scene.userData.forestStats,'grassClumps',{enumerable:true,get:()=>{let n=0;for(const c of stream.loaded.values())n+=c.grass;return n;}});
 if(details)scene.userData.natureDetails={models:details.size,stonePathTiles:pathTiles.length,families:Object.fromEntries(detailNames.map(n=>[n,0]))};
 const obstacles=layout.obstacles;
 createWreckLandmark(scene);
 for(const offset of [-1.5,0,1.5]){const x=SECOND_CONTROL.car.x,z=SECOND_CONTROL.car.z+offset;obstacles.push({x,z,baseY:terrainHeight(x,z),radius:1.35,height:2.1});}
 createUniqueLandmarks(scene,obstacles);
 stream.loadAround(around.x,around.z);
 return obstacles;
}

const transform=new THREE.Object3D(),shade=new THREE.Color(),normal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
// Collects one batch's instances for one chunk.
class Collector{
 constructor(colored){this.colored=colored;this.matrices=new Float32Array(16*64);this.colors=colored?new Float32Array(3*64):null;this.count=0;}
 add(item,place,{ground}={}){
  if(this.count*16>=this.matrices.length){const m=new Float32Array(this.matrices.length*2);m.set(this.matrices);this.matrices=m;if(this.colored){const c=new Float32Array(this.colors.length*2);c.set(this.colors);this.colors=c;}}
  transform.position.set(0,0,0);transform.rotation.set(0,0,0);transform.scale.set(1,1,1);place(item,transform);transform.position.y+=ground??item.ground??terrainHeight(item.x,item.z);transform.updateMatrix();
  this.matrices.set(transform.matrix.elements,this.count*16);if(this.colored){const s=item.shade??1,o=this.count*3;this.colors[o]=s;this.colors[o+1]=s;this.colors[o+2]=s;}this.count++;}
}

export class ForestStream {
 constructor(scene,{batches,chunks,families,detailBatches,details,natureModels}){
  this.scene=scene;this.batches=batches;this.layout=chunks;this.families=families;this.detailBatches=detailBatches;this.details=details;this.natureModels=natureModels;
  this.loaded=new Map();this.queue=[];this.building=null;this.visibility=null;this.version=0;this.clearings=[];
  this.ground=new THREE.Group();this.ground.name='Faceted forest floor';scene.add(this.ground);
  this.groundMaterial=createGroundMaterial();
  if(!details){this.trail=new THREE.Group();this.trail.name='Winding dirt trail';scene.add(this.trail);this.trailMaterial=createGroundMaterial(true);}
 }
 // Small open spots found after the layout (springs): no grass or plants grow there.
 keepClear(points,radius){this.clearings=points.map(p=>({x:p.x,z:p.z,r2:radius*radius}));this.building=null;
  for(const [key,c] of [...this.loaded])if(points.some(p=>p.x>c.minX-radius&&p.x<c.minX+CHUNK+radius&&p.z>c.minZ-radius&&p.z<c.minZ+CHUNK+radius))this.unload(key);}
 open(x,z){for(const c of this.clearings){const dx=x-c.x,dz=z-c.z;if(dx*dx+dz*dz<c.r2)return false;}return true;}
 // A visibility manager draws whatever is loaded; a new one takes over every chunk.
 attach(visibility){this.visibility=visibility;for(const chunk of this.loaded.values())this.register(chunk);}
 register(chunk){const v=this.visibility;if(!v){this.unculled=true;return;}for(const [mesh,source] of chunk.sources)v.addSource(mesh,chunk.key,source);for(const tile of chunk.tiles)v.addTile(tile);}
 wanted(x,z,radius=LOAD_RADIUS){const out=[];const c0=chunkOf(x-radius),c1=chunkOf(x+radius),r0=chunkOf(z-radius),r1=chunkOf(z+radius);
  for(let cx=c0;cx<=c1;cx++)for(let cz=r0;cz<=r1;cz++){const minX=cx*CHUNK-half,minZ=cz*CHUNK-half,dx=Math.max(minX-x,0,x-minX-CHUNK),dz=Math.max(minZ-z,0,z-minZ-CHUNK),d=Math.hypot(dx,dz);if(d<=radius)out.push({cx,cz,key:chunkKey(cx,cz),d});}
  return out.sort((a,b)=>a.d-b.d);}
 // Synchronous: everything within the load radius now (start of play, teleports, tests).
 loadAround(x,z,radius=LOAD_RADIUS){for(const w of this.wanted(x,z,radius))if(!this.loaded.has(w.key)){if(this.building?.key===w.key)this.building=null;const steps=this.build(w.cx,w.cz);let r;do r=steps.next();while(!r.done);}this.unloadFar(x,z,Math.max(UNLOAD_RADIUS,radius+80));this.queue=[];if(this.unculled)this.fill();}
 // Without a visibility manager (tools, tests) every loaded instance is written straight into its mesh.
 fill(){this.unculled=false;const per=new Map();for(const chunk of this.loaded.values())for(const [mesh,src] of chunk.sources){let list=per.get(mesh);if(!list)per.set(mesh,list=[]);list.push(src);}
  for(const {mesh} of this.batches.values()){const list=per.get(mesh)??[],count=list.reduce((n,s)=>n+s.count,0);if(mesh.instanceMatrix.count<count){mesh.instanceMatrix=new THREE.InstancedBufferAttribute(new Float32Array(count*16),16);if(mesh.instanceColor)mesh.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(count*3).fill(1),3);}
   let k=0;for(const src of list){mesh.instanceMatrix.array.set(src.matrices.subarray(0,src.count*16),k*16);if(mesh.instanceColor&&src.colors)mesh.instanceColor.array.set(src.colors.subarray(0,src.count*3),k*3);k+=src.count;}mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;}}
 // Per frame: unload far chunks and keep building the nearest missing one within a time budget.
 update(x,z,budgetMs=2.5){
  this.unloadFar(x,z,UNLOAD_RADIUS);
  if(!this.building){const next=this.wanted(x,z).find(w=>!this.loaded.has(w.key));if(next)this.building={key:next.key,steps:this.build(next.cx,next.cz),d:next.d};}
  // On a slow device, never let the player reach ground that is not built yet.
  if(this.building&&this.building.d<60){const steps=this.building.steps;this.building=null;let r;do r=steps.next();while(!r.done);return false;}
  const start=performance.now();
  while(this.building&&performance.now()-start<budgetMs){const r=this.building.steps.next();if(r.done){this.building=null;const next=this.wanted(x,z).find(w=>!this.loaded.has(w.key));if(next&&performance.now()-start<budgetMs*.5)this.building={key:next.key,steps:this.build(next.cx,next.cz),d:next.d};}}
  return this.building!==null;
 }
 unloadFar(x,z,radius){for(const [key,chunk] of this.loaded){const dx=Math.max(chunk.minX-x,0,x-chunk.minX-CHUNK),dz=Math.max(chunk.minZ-z,0,z-chunk.minZ-CHUNK);if(Math.hypot(dx,dz)>radius)this.unload(key);}}
 unload(key){const chunk=this.loaded.get(key);if(!chunk)return;const v=this.visibility;for(const mesh of chunk.sources.keys())v?.removeSource(mesh,key);for(const tile of chunk.tiles){v?.removeTile(tile);tile.parent.remove(tile);tile.geometry.dispose();}this.loaded.delete(key);this.version++;}
 get loadedBounds(){let minX=Infinity,minZ=Infinity,maxX=-Infinity,maxZ=-Infinity;for(const c of this.loaded.values()){minX=Math.min(minX,c.minX);minZ=Math.min(minZ,c.minZ);maxX=Math.max(maxX,c.minX+CHUNK);maxZ=Math.max(maxZ,c.minZ+CHUNK);}return {minX,minZ,maxX,maxZ};}
 // Builds one chunk, yielding between pieces so a frame never waits on a whole chunk.
 *build(cx,cz){
  const key=chunkKey(cx,cz),minX=cx*CHUNK-half,minZ=cz*CHUNK-half,maxX=minX+CHUNK,maxZ=minZ+CHUNK,items=this.layout.get(key)??{},random=rng(hashSeed(cx,cz,5));
  const collectors=new Map(),get=name=>{const b=this.batches.get(name);if(!b)return null;let c=collectors.get(b);if(!c)collectors.set(b,c=new Collector(b.colored));return c;};
  const add=(name,item,place,opts)=>{const c=get(name);if(c)c.add(item,place,opts);};
  const inside=(x,z)=>x>=minX&&x<maxX&&z>=minZ&&z<maxZ;
  const tiles=[yield* this.groundTile(minX,minZ)];const trail=yield* this.trailTile(minX,minZ);if(trail)tiles.push(trail);
  // Trees: trunks, crowns and bark detail, each tree from its own seed so it never changes.
  const treeList=items.trees??[];
  let built=0;
  for(const t of treeList){
   if(++built%60===0)yield 'trees';
   const r=rng(hashSeed(t.id,7,1));
   add('Tall faceted trunks',t,(t,o)=>{o.position.set(t.x,0,t.z);o.rotation.set(t.leanZ,t.rotation,-t.leanX);o.scale.set(t.trunk,t.trunkHeight,t.trunk);});
   if([0,1,2,5].includes(t.species)){const type=t.species,layers=type===0?3+Math.floor(r()*2):type===1?5+Math.floor(r()*3):type===2?4+Math.floor(r()*3):3,bottom=type===0?.5:type===1?.28:type===2?.36:.32;
    for(let tier=0;tier<layers;tier++){if(tier>0&&tier<layers-1&&r()<.09)continue;const progress=tier/(layers-1),y=t.height*(bottom+(1-bottom-.07)*progress);
     const c={ground:t.ground,x:t.x+t.leanX*y+(r()-.5)*t.width*.18,z:t.z+t.leanZ*y+(r()-.5)*t.width*.18,y,width:t.width*(1-progress*.77)*(.85+r()*.3),height:t.height*(type===1?.28:type===2?.36:.43)*(1-progress*.36),rotation:t.rotation+r()*.9,shade:.58+r()*.42,tx:(r()-.5)*.08,tz:(r()-.5)*.08,squash:.8+r()*.35};
     add(['pine','spruce','fir','','','sapling'][type]+' irregular crowns',c,(c,o)=>{o.position.set(c.x,c.y,c.z);o.rotation.set(c.tx,c.rotation,c.tz);o.scale.set(c.width,c.height,c.width*c.squash);});}}
   if(t.species===3)for(let i=0;i<5;i++){const angle=i*2.4,y=t.height*(.67+r()*.25),c={ground:t.ground,x:t.x+Math.sin(angle)*t.width*.55+t.leanX*y,z:t.z+Math.cos(angle)*t.width*.55+t.leanZ*y,y,size:t.width*(.65+r()*.3),shade:.65+r()*.35,spin:r()*6};add('Broadleaf clustered crowns',c,(c,o)=>{o.position.set(c.x,c.y,c.z);o.rotation.y=c.spin;o.scale.set(c.size,c.size*.8,c.size);});}
   if(!this.natureModels){
    const count=t.species===4?6:t.species===3?4:2+Math.floor(r()*4);
    for(let i=0;i<count;i++){const y=t.trunkHeight*(.22+r()*.72),b={ground:t.ground,x:t.x+t.leanX*y,z:t.z+t.leanZ*y,y,rotation:t.rotation+i*2.399+r()*.4,length:(t.species===4?.7:1)+r()*t.width*.6,tilt:t.species===4?1.2:.8+r()*.65};add('Uneven exposed branches',b,(b,o)=>{o.position.set(b.x,b.y,b.z);o.rotation.set(b.tilt,b.rotation,0);o.scale.y=b.length;});}
    if(t.species!==5){for(let i=0;i<3;i++)add('Flared trunk roots',{ground:t.ground,x:t.x,z:t.z,rotation:t.rotation+i*2.1,size:t.trunk},(q,o)=>{o.position.set(q.x,0,q.z);o.rotation.set(.35,q.rotation,.55);o.scale.set(q.size*.22,q.size*.8,q.size*.32);});
     if(r()<.45){const y=t.trunkHeight*(.12+r()*.25),angle=t.rotation;add('Trunk bark knots',{ground:t.ground,x:t.x+Math.sin(angle)*t.trunk*.29+t.leanX*y,z:t.z+Math.cos(angle)*t.trunk*.29+t.leanZ*y,y,size:t.trunk*.12},(k,o)=>{o.position.set(k.x,k.y,k.z);o.scale.set(k.size,k.size*1.5,k.size);});}}
   }
  }
  for(const {family,batch} of this.families){const c=get(batch.name);for(const t of treeList)if(t.kitFamily===family&&t.species!==4)c.add({...t,shade:.83+t.shade*.17},(t,o)=>{o.position.set(t.x,0,t.z);o.rotation.set(t.leanZ*.4,t.rotation,-t.leanX*.4);o.scale.setScalar(t.height);},{ground:t.ground});}
  yield 'kit trees';
  // Rocks, stumps, logs and trail pebbles from the whole-map layout.
  for(const rock of items.rocks??[])add('Large faceted boulders',rock,(q,o)=>{o.position.set(q.x,q.size*.34,q.z);o.rotation.set(.15,q.rotation,.1);o.scale.set(q.size,q.size*.65,q.size*.8);});
  if(this.details)(items.rocks??[]).forEach(rock=>{const family=hashSeed(Math.round(rock.x*10),Math.round(rock.z*10))%3;this.detail(get,`Rock_Medium_${family+1}`,{...rock,width:rock.size*(family===2?1.9:1.7),height:rock.size*(family===2?1.3:1.15)});});
  for(const s of items.stumps??[]){add('Cut tree stumps',s,(q,o)=>{o.position.set(q.x,q.height*.5,q.z);o.scale.set(q.size,q.height,q.size);});add('Pale cut wood faces',s,(q,o)=>{o.position.set(q.x,q.height+.003,q.z);o.rotation.x=-Math.PI/2;o.scale.setScalar(q.size*.8);});}
  for(const l of items.logs??[])add('Fallen tree logs',l,(q,o)=>{o.position.set(q.x,q.radius,q.z);o.rotation.set(Math.PI/2,0,q.rotation);o.scale.set(q.radius,q.length,q.radius);});
  for(const p of items.pebbles??[])add('Trail pebbles',p,(q,o)=>{o.position.set(q.x,.025,q.z);o.rotation.y=q.rotation;o.scale.set(q.size,q.size*.6,q.size);});
  for(const f of items.flowers??[])add('Small woodland wildflower patches',f,(q,o)=>{o.position.set(q.x,.015,q.z);o.rotation.y=q.rotation;o.scale.setScalar(q.size);});
  for(const p of items.path??[])this.detail(get,'RockPath_Round_Wide',p);
  yield 'rocks';
  // Shrubs and ferns, then habitat details beside trees (imported models only).
  if(!this.details){const bushes=[...(items.startShrubs??[])];for(let i=0,n=Math.round(5000*areaScale/(span*span)*CHUNK*CHUNK);i<n;i++){const x=minX+random()*CHUNK,z=minZ+random()*CHUNK;if(!outsideTrail(x,z,4)||cleared(x,z)||!this.open(x,z))continue;bushes.push({x,z,size:.4+random()*.85,rotation:random()*6,shade:.7+random()*.3});}
   bushes.forEach((b,i)=>{add('Low angular shrubs',b,(q,o)=>{o.position.set(q.x,q.size*.35,q.z);o.rotation.y=q.rotation;o.scale.set(q.size,q.size*.65,q.size);});if(i%2===0){const f={...b,x:b.x+.7,z:b.z+.4};add('Star-shaped forest ferns',f,(q,o)=>{o.position.set(q.x,.02,q.z);o.rotation.y=q.rotation;o.scale.setScalar(q.size);});}});}
  else{const names=[...this.details.keys()].filter(n=>!n.startsWith('Rock')),stats=this.scene.userData.natureDetails?.families;
   for(const t of treeList){if(t.id%7)continue;const r=rng(hashSeed(t.id,11,3)),field=Math.sin(t.x*.023)+Math.cos(t.z*.017),pool=names.filter(n=>n.startsWith('Pebble')||n.startsWith('Mushroom')||n.startsWith('Petal')||(field>0?/Flower|Clover|Plant/.test(n):/Fern|Bush|Plant/.test(n)));
    for(let j=0;j<4;j++){const name=pool[(t.id+j)%pool.length],angle=r()*Math.PI*2,distance=name.startsWith('Mushroom')?.7:1.3+r()*3,x=t.x+Math.sin(angle)*distance,z=t.z+Math.cos(angle)*distance;if(!this.open(x,z)||trailClearance(x,z)<1.2||riverClearance(x,z)<1)continue;const width=/Bush/.test(name)?1.1:/Fern|Plant/.test(name)?.7:/Flower|Clover/.test(name)?.5:/Pebble/.test(name)?.15:.22;this.detail(get,name,{x,z,width:width*(.8+r()*.4),rotation:angle,shade:.86+r()*.14,y:name==='Mushroom_Laetiporus'?.6:0});if(stats)stats[name]=(stats[name]??0)+1;}}}
  yield 'plants';
  // Grass: the meadow field, plus denser verges along the tracks. Every other clump also
  // draws as the cheap distant carpet. Built in slices to keep each frame short.
  const dense=get('Dense grass clumps'),far=get('Distant grass carpet');let clumps=0;
  const blade=g=>{dense.add(g,grassPlace);if(clumps++%2===0)far.add(g,grassPlace);};
  const candidates=Math.round(2*66000*areaScale/(span*span)*CHUNK*CHUNK);
  for(let i=0;i<candidates;i++){
   const x=minX+random()*CHUNK,z=minZ+random()*CHUNK,patch=grassPatch(x,z),keep=random()<=.22+patch*.78;
   if(i%400===399)yield 'grass';
   if(!keep||!this.open(x,z)||trailClearance(x,z)<1.5||riverClearance(x,z)<.3||Math.hypot(x,z-8)<2.8||cleared(x,z))continue;
   const grove=i%2?0:woodlandField(x,z).grove;
   blade({x,z,size:.72+patch*.6+random()*.35,rotation:random()*6,shade:.72+patch*.22+(grove<-.5?.06:0),width:1.3+patch*.4});
  }
  for(const route of trails){const z0=Math.max(route.start,minZ),z1=Math.min(route.end,maxZ);if(z1<=z0)continue;
   for(let i=0,n=Math.round((z1-z0)*2.2);i<n;i++){const z=z0+random()*(z1-z0),side=random()<.5?-1:1,x=route.center(z)+side*(route.width(z)+1.5+random()*3.5),patch=grassPatch(x,z);
    if(!inside(x,z)||!this.open(x,z)||trailClearance(x,z)<1.5||riverClearance(x,z)<.3||Math.hypot(x,z-8)<3||patch<.25||cleared(x,z))continue;
    blade({x,z,size:.85+patch*.65+random()*.25,rotation:random()*6,shade:.78+patch*.22,width:1.5});}}
  yield 'verges';
  const sources=new Map();for(const [batch,c] of collectors)if(c.count)sources.set(batch.mesh,yield* makeSourceSteps(c.matrices,c.colors,c.count,batch.mesh.geometry));
  for(const tile of tiles)(tile.userData.trail?this.trail:this.ground).add(tile);
  const chunk={key,cx,cz,minX,minZ,sources,tiles,grass:clumps};this.loaded.set(key,chunk);this.version++;this.register(chunk);
 }
 detail(get,name,p){
  const parts=this.detailBatches.get(name);if(!parts)return;
  for(const batch of parts){const c=get(batch.name);c.add(p,(q,o)=>{o.position.set(q.x,q.y??0,q.z);if(name==='RockPath_Round_Wide')o.rotation.set(0,q.rotation??0,0);else{o.quaternion.setFromUnitVectors(up,terrainNormal(q.x,q.z,normal));o.rotateY(q.rotation??0);}o.scale.set(q.width,q.height??q.width,q.length??q.width);});}
 }
 // Exact height-field triangles for this chunk, split along the same diagonal as terrainHeight.
 *groundTile(minX,minZ){
  const cells=CHUNK/TERRAIN_STEP,positions=new Float32Array(cells*cells*18);let k=0;
  const v=(x,z)=>{positions[k++]=x;positions[k++]=terrainHeight(x,z);positions[k++]=z;};
  for(let j=0;j<cells;j++){for(let i=0;i<cells;i++){const x0=minX+i*TERRAIN_STEP,z0=minZ+j*TERRAIN_STEP,x1=x0+TERRAIN_STEP,z1=z0+TERRAIN_STEP;v(x0,z0);v(x0,z1);v(x1,z0);v(x0,z1);v(x1,z1);v(x1,z0);}if(j%12===11)yield 'ground';}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,this.groundMaterial);mesh.name=`Faceted forest floor ${minX},${minZ}`;mesh.receiveShadow=true;mesh.userData.terrainTile=true;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;return mesh;
 }
 // Dirt track overlay (only without the imported stone path): subdivided terrain triangles.
 *trailTile(minX,minZ){
  if(!this.trail)return null;
  const cells=CHUNK/TERRAIN_STEP,n=cells+1,field=new Float32Array(n*n);let near=false;
  for(let j=0;j<n;j++)for(let i=0;i<n;i++){const d=trailClearance(minX+i*TERRAIN_STEP,minZ+j*TERRAIN_STEP);field[j*n+i]=d;if(d<6)near=true;}
  if(!near)return null;
  const positions=[],normals=[],edges=[],nrm=new THREE.Vector3();
  const corner=(i,j)=>({x:minX+i*TERRAIN_STEP,z:minZ+j*TERRAIN_STEP});
  for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
   if(i===0&&j%6===5)yield 'trail';
   for(const tri of [[[i,j],[i,j+1],[i+1,j]],[[i,j+1],[i+1,j+1],[i+1,j]]]){
    if(!tri.some(([a,b])=>field[b*n+a]<6))continue;const [A,B,C]=tri.map(([a,b])=>corner(a,b));
    const vertex=(u,w)=>{const s=1-u-w,x=s*A.x+u*B.x+w*C.x,z=s*A.z+u*B.z+w*C.z;terrainNormal(x,z,nrm);return [x,terrainHeight(x,z)+.02,z,trailClearance(x,z),nrm.x,nrm.y,nrm.z];};
    const push=(a,b,c)=>{if(Math.min(a[3],b[3],c[3])>.4)return;for(const p of [a,b,c]){positions.push(p[0],p[1],p[2]);normals.push(p[4],p[5],p[6]);edges.push(p[3]);}};
    for(let u=0;u<3;u++)for(let w=0;w<3-u;w++){const a=vertex(u/3,w/3),b=vertex((u+1)/3,w/3),c=vertex(u/3,(w+1)/3);push(a,b,c);if(u+w<2)push(b,vertex((u+1)/3,(w+1)/3),c);}
   }
  }
  if(!positions.length)return null;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('trailEdge',new THREE.Float32BufferAttribute(edges,1));geometry.computeBoundingBox();geometry.computeBoundingSphere();
  const mesh=new THREE.Mesh(geometry,this.trailMaterial);mesh.name=`Winding dirt trail ${minX},${minZ}`;mesh.receiveShadow=true;mesh.userData.terrainTile=true;mesh.userData.trail=true;mesh.matrixAutoUpdate=false;mesh.matrixWorldAutoUpdate=false;return mesh;
 }
}
const grassNormal=new THREE.Vector3();
function grassPlace(g,o){o.position.set(g.x,0,g.z);o.quaternion.setFromUnitVectors(up,terrainNormal(g.x,g.z,grassNormal));o.rotateY(g.rotation);o.scale.set(g.size*g.width,g.size*.85,g.size*g.width);}
