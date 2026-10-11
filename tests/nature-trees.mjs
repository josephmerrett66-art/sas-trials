import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {createForest} from '../forest-scene.js';
import {ForestVisibility} from '../forest-visibility.js';
import {woodlandField} from '../nature-trees.js';
const models=['Pine_5','Pine_4','CommonTree_4'].map(name=>({name,parts:[{geometry:new THREE.ConeGeometry(.15,1,6).translate(0,.5,0),material:new THREE.MeshLambertMaterial(),leaf:true}]}));
const original=new THREE.Scene(),upgraded=new THREE.Scene();createForest(original);const obstacles=createForest(upgraded,models);
for(const name of ['Faceted forest floor','Winding dirt trail']){
 const a=original.getObjectByName(name),b=upgraded.getObjectByName(name);assert.equal(a.children.length,b.children.length);
 a.children.forEach((tile,i)=>assert.deepEqual(tile.geometry.attributes.position.array,b.children[i].geometry.attributes.position.array,'terrain and dirt path are exactly preserved'));
}
assert.ok(upgraded.userData.forestStats.trees<original.userData.forestStats.trees,'groves leave openings');
assert.ok(obstacles.every(o=>Number.isFinite(o.baseY)&&o.radius>0));
assert.ok(Math.abs(woodlandField(10,20).grove-woodlandField(11,21).grove)<.1,'neighbours share woodland family field');
const visibility=new ForestVisibility(upgraded),camera=new THREE.PerspectiveCamera(85,1.5,.05,400);camera.position.set(0,2,8);visibility.restoreAll();assert.ok(visibility.shadowOnly.every(mesh=>mesh.visible),'shadow silhouettes restored for cached bake');visibility.update(camera);assert.ok(visibility.shadowOnly.every(mesh=>!mesh.visible),'shadow silhouettes never appear in the colour pass');
for(const batch of visibility.batches.filter(b=>b.mesh.userData.treeDetail)){
 assert.equal(batch.range,92);assert.ok(batch.mesh.count<350,'bounded nearby detailed trees');
}
for(const model of models){const d=JSON.parse(fs.readFileSync(new URL(`../assets/nature/${model.name}.gltf`,import.meta.url)));for(const item of [...d.buffers,...d.images])assert.ok(fs.existsSync(new URL(`../assets/nature/${item.uri}`,import.meta.url)),'all asset dependencies bundled');}
console.log('Passed grove coherence, unchanged floor/path geometry, imported asset dependencies, colliders and bounded tree detail.');
function components(g){const p=g.attributes.position,keys=new Map(),parent=[],ids=[];for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e5)).join(':');let id=keys.get(key);if(id===undefined){id=parent.length;parent.push(id);keys.set(key,id);}ids.push(id);}const root=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};const used=new Set();for(let i=0;i<g.index.count;i+=3){const a=ids[g.index.array[i]],b=ids[g.index.array[i+1]],c=ids[g.index.array[i+2]];parent[root(b)]=root(a);parent[root(c)]=root(a);used.add(a);used.add(b);used.add(c);}return new Set([...used].map(root)).size;}
const {simplifyTreeBark}=await import('../nature-trees.js');
for(const model of models){
 const url=new URL(`../assets/nature/${model.name}.gltf`,import.meta.url),data=JSON.parse(fs.readFileSync(url)),binary=fs.readFileSync(new URL(data.buffers[0].uri,url)),primitive=data.meshes[0].primitives[0],geometry=new THREE.BufferGeometry();
 const read=id=>{const a=data.accessors[id],v=data.bufferViews[a.bufferView],width={VEC2:2,VEC3:3,VEC4:4,SCALAR:1}[a.type],ArrayType={5126:Float32Array,5123:Uint16Array,5125:Uint32Array}[a.componentType];return new ArrayType(binary.buffer,binary.byteOffset+(v.byteOffset??0)+(a.byteOffset??0),a.count*width).slice();};
 for(const [name,semantic,width] of [['position','POSITION',3],['normal','NORMAL',3],['uv','TEXCOORD_0',2]])geometry.setAttribute(name,new THREE.BufferAttribute(read(primitive.attributes[semantic]),width));geometry.setIndex(new THREE.BufferAttribute(read(primitive.indices),1));
 const all=data.meshes[0].primitives.map(p=>data.accessors[p.attributes.POSITION]),height=Math.max(...all.map(a=>a.max[1]))-Math.min(...all.map(a=>a.min[1]));geometry.scale(1/height,1/height,1/height);geometry.computeBoundingBox();const box=geometry.boundingBox.clone(),before=geometry.index.count,reduced=simplifyTreeBark(geometry);reduced.computeBoundingBox();assert.ok(reduced.index.count<before,'bark triangle count reduced');assert.ok(reduced.boundingBox.min.distanceTo(box.min)<.018&&reduced.boundingBox.max.distanceTo(box.max)<.018,'branching silhouette remains within a small fraction of tree height');assert.ok(reduced.attributes.normal.array.every(Number.isFinite));assert.ok(components(reduced)<=components(geometry),'no extra disconnected bark islands');console.log(`${model.name}: bark ${before/3} -> ${reduced.index.count/3} triangles`);
}
