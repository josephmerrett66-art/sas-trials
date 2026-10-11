import {stonePathSites,drapeStoneMaterial,trimStoneUndersides} from './stone-path.js?v=1';
import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {terrainHeight,terrainNormal} from './terrain.js';
import {trails,trailClearance} from './landmark-routes.js';
export async function loadNatureDetails(){
 const names=await (await fetch(new URL('./assets/nature-details/manifest.json',import.meta.url))).json(),loader=new GLTFLoader(),models=new Map(),textures=new Map();
 for(const name of names){const {scene}=await loader.loadAsync(new URL(`./assets/nature-details/${name}.gltf`,import.meta.url).href);scene.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(scene),size=b.getSize(new THREE.Vector3()),width=Math.max(size.x,size.z),center=b.getCenter(new THREE.Vector3()),parts=[];
 scene.traverse(mesh=>{if(!mesh.isMesh)return;const geometry=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geometry.translate(-center.x,-b.min.y,-center.z);geometry.scale(1/width,1/width,1/width);if(name==='RockPath_Round_Wide')trimStoneUndersides(geometry);let map=mesh.material.map;if(map){const key=map.image?.src??mesh.material.name;if(textures.has(key)){if(map!==textures.get(key))map.dispose();map=textures.get(key);}else textures.set(key,map);}const material=new THREE.MeshLambertMaterial({map,color:mesh.material.color,side:mesh.material.side,alphaTest:mesh.material.alphaTest||(/Plant|Flower|Fern|Clover|Bush/.test(name)?.45:0)});parts.push({geometry,material});});models.set(name,{parts,height:size.y/width,footprint:{x:size.x/width,z:size.z/width}});}
 return models;
}
export function addNatureDetails(scene,models,rocks,trees){
 const transform=new THREE.Object3D(),normal=new THREE.Vector3(),up=new THREE.Vector3(0,1,0),shade=new THREE.Color();let seed=811;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function batch(name,items,range=45){const model=models.get(name);for(const part of model.parts){if(name==='RockPath_Round_Wide')drapeStoneMaterial(part.material);const mesh=new THREE.InstancedMesh(part.geometry,part.material,items.length);mesh.name=`Kit ${name}`;mesh.userData.visibilityRange=range;mesh.userData.decorative=true;mesh.receiveShadow=true;mesh.castShadow=false;items.forEach((p,i)=>{transform.position.set(p.x,terrainHeight(p.x,p.z)+(p.y??0),p.z);if(name==='RockPath_Round_Wide')transform.rotation.set(0,p.rotation??0,0);else{transform.quaternion.setFromUnitVectors(up,terrainNormal(p.x,p.z,normal));transform.rotateY(p.rotation??0);}transform.scale.set(p.width,p.height??p.width,p.length??p.width);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);shade.setScalar(p.shade??1);mesh.setColorAt(i,shade);});mesh.computeBoundingSphere();scene.add(mesh);}}
 for(let family=0;family<3;family++)batch(`Rock_Medium_${family+1}`,rocks.filter((r,i)=>i%3===family).map(r=>({...r,width:r.size*(family===2?1.9:1.7),height:r.size*(family===2?1.3:1.15)})),94);
 const path=stonePathSites(trails,models.get('RockPath_Round_Wide'));batch('RockPath_Round_Wide',path,94);
 // Path spacing must not move existing habitat details.
 for(const route of trails)for(let z=route.start;z<route.end;z+=3.8)random();
 const detailNames=[...models.keys()].filter(n=>!n.startsWith('Rock'));
 const sites=new Map(detailNames.map(n=>[n,[]]));
 // Families occupy coherent habitats: flowers at sunny margins, ferns in groves,
 // mushrooms by trunks, pebbles by rocks, and fallen petals beside flowers.
 for(let i=0;i<trees.length;i+=7){const t=trees[i],field=Math.sin(t.x*.023)+Math.cos(t.z*.017),names=detailNames.filter(n=>n.startsWith('Pebble')||n.startsWith('Mushroom')||n.startsWith('Petal')|| (field>0?/Flower|Clover|Plant/.test(n):/Fern|Bush|Plant/.test(n)));
 for(let j=0;j<4;j++){const name=names[(i+j)%names.length],angle=random()*Math.PI*2,distance=name.startsWith('Mushroom')?.7:1.3+random()*3,x=t.x+Math.sin(angle)*distance,z=t.z+Math.cos(angle)*distance;if(trailClearance(x,z)<1.2)continue;let width=/Bush/.test(name)?1.1:/Fern|Plant/.test(name)?.7:/Flower|Clover/.test(name)?.5:/Pebble/.test(name)?.15:.22;sites.get(name).push({x,z,width:width*(.8+random()*.4),rotation:angle,shade:.86+random()*.14,y:name==='Mushroom_Laetiporus'?.6:0});}}
 for(const [name,items] of sites)batch(name,items,/Pebble|Petal/.test(name)?35:55);
 scene.userData.natureDetails={models:models.size,stonePathTiles:path.length,families:Object.fromEntries([...sites].map(([n,a])=>[n,a.length])),detailItems:[...sites.values()].reduce((n,a)=>n+a.length,0)};
}
