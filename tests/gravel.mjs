import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {gravelTexture} from '../gravel-texture.js?v=1';
import {createGroundMaterial} from '../ground-material.js';
import {createForest} from '../forest-scene.js';
const texture=gravelTexture();assert.equal(texture,gravelTexture());assert.equal(texture.wrapS,THREE.RepeatWrapping);assert.equal(texture.wrapT,THREE.RepeatWrapping);assert.ok(texture.generateMipmaps);
const values=texture.image.data;let min=255,max=0;for(let i=0;i<values.length;i+=4){min=Math.min(min,values[i]);max=Math.max(max,values[i]);assert.equal(values[i+3],255);}assert.ok(max-min>60);
const material=createGroundMaterial(true);assert.equal(material.flatShading,false);assert.equal(material.vertexColors,false);
const shader={uniforms:{},vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};material.onBeforeCompile(shader);assert.equal(shader.uniforms.detailNoise.value,texture);assert.equal((shader.fragmentShader.match(/texture2D/g)||[]).length,1);assert.ok(shader.fragmentShader.includes('groundUV/2.0'));
const scene=new THREE.Scene();createForest(scene);const path=scene.getObjectByName('Winding dirt trail');let variations=0;const shared=new Map();
for(const tile of path.children){assert.equal(tile.material.flatShading,false);assert.ok(!tile.geometry.attributes.color);const p=tile.geometry.attributes.position,n=tile.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){const key=`${p.getX(i).toFixed(3)},${p.getZ(i).toFixed(3)}`,normal=[n.getX(i),n.getY(i),n.getZ(i)],old=shared.get(key);if(old)for(let j=0;j<3;j++)assert.ok(Math.abs(old[j]-normal[j])<.00002);else shared.set(key,normal);if(i%3&&Math.abs(n.getY(i)-n.getY(i-1))>.00001)variations++;}
}assert.ok(variations>100);assert.equal(scene.userData.forestStats.trees,119049);console.log('Passed cached mipmapped gravel, single sample shader, smooth shared path normals, preserved forest layout.');
