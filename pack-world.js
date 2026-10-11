import * as THREE from './vendor/three.module.js';
import {FBXLoader} from './vendor/FBXLoader.js';
import {consolidateSolidMaterials} from './solid-materials.js';
import {ProjectilePool} from './projectile-pool.js';

export async function loadPackFile(folder,name){if(name==='Brick'){const positions=await (await fetch('./assets/pack/Props/Brick.json')).json();const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x777777,flatShading:true}));}return new FBXLoader().loadAsync(`./assets/pack/${folder}/${name}.fbx`);}
export function monochrome(object,viewmodel=false){object.traverse(mesh=>{if(!mesh.isMesh)return;mesh.frustumCulled=false;for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){const c=material.color;if(c){const luminance=Math.max(.035,c.r*.3+c.g*.59+c.b*.11);if(viewmodel&&c.r>c.g*1.35&&c.r>.2)c.setHex(0xb89b70);else c.setRGB(luminance,luminance,luminance);}if(material.specular)material.specular.setRGB(.08,.08,.08);if(material.emissive)material.emissive.setRGB(0,0,0);material.flatShading=true;material.needsUpdate=true;}if(viewmodel)mesh.layers.set(1);});return object;}
export class PackWorld {
  constructor(scene,obstacles,{survival=false,knifeOnly=false,groundHeight=null}={}){this.knifeOnly=knifeOnly;this.groundHeight=groundHeight;this.survival=survival;this.scene=scene;this.obstacles=obstacles;this.targets=[];this.effects=[];this.projectiles=[];this.grenades=[];this.clock=0;this.marks=[];this.markGeometry=new THREE.SphereGeometry(.025,4,3);this.markMaterial=new THREE.MeshBasicMaterial({color:0x222222});this.markMesh=new THREE.InstancedMesh(this.markGeometry,this.markMaterial,100);this.markMesh.userData.decorative=true;this.markMesh.count=0;this.markMesh.frustumCulled=false;this.markMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.markMesh);this.markIndex=0;this.markTransform=new THREE.Object3D();}
  async load(){
    const names=['Barrel','Barrel_Shattered','Wall','Wall_Shattered','Smoke','Brick'];
    const models=await Promise.all(names.map(n=>loadPackFile('Props',n)));this.models=Object.fromEntries(names.map((n,i)=>[n,consolidateSolidMaterials(monochrome(models[i]))]));
    const weapons=this.knifeOnly?[]:['Grenade','Glock_Bullet','Glock_Bullet_Shell','M416_Bullet','M416_Bullet_Shell'];
    const parts=await Promise.all(weapons.map(n=>loadPackFile('Weapons',n)));this.parts=Object.fromEntries(weapons.map((n,i)=>[n,consolidateSolidMaterials(monochrome(parts[i]))]));
    this.projectilePool=this.knifeOnly?null:new ProjectilePool(this.scene,this.parts);
    for(const [x,z] of (this.survival?[[-1.8,-3],[-4.2,-110],[.15,-235]]:[[-5,-3],[6,-10],[-7,-16],[8,-24]])){const spot=this.survival?this.cacheSpot(x,z):{x,z};this.place('Barrel',spot.x,spot.z,this.survival?1.5:1.1,!this.survival);}
    if(!this.survival){this.place('Wall',-9,-10,2.3,false);this.place('Wall',10,-19,2.3,false);}
    const brick=this.models.Brick.clone();this.fit(brick,.22);const bricks=new THREE.InstancedMesh(brick.geometry,brick.material,8),placement=new THREE.Object3D();bricks.name='Instanced loose bricks';placement.scale.copy(brick.scale);for(let i=0;i<8;i++){placement.position.set(-10+i*.26,.05,-6);placement.updateMatrix();bricks.setMatrixAt(i,placement.matrix);}bricks.computeBoundingSphere();this.scene.add(bricks);
  }
  cacheSpot(x,z){
    for(let ring=0;ring<8;ring++)for(let i=0;i<16;i++){const angle=i*Math.PI/8,cx=x+Math.cos(angle)*ring*.6,cz=z+Math.sin(angle)*ring*.6;if(this.obstacles.every(o=>Math.hypot(cx-o.x,cz-o.z)>o.radius+1.4))return {x:cx,z:cz};}return {x,z};
  }
  fit(object,height){const b=new THREE.Box3().setFromObject(object),size=b.getSize(new THREE.Vector3());object.scale.multiplyScalar(height/Math.max(size.y,.001));const scaled=new THREE.Box3().setFromObject(object);object.position.y-=scaled.min.y;return object;}
  place(name,x,z,height,explosive){
    const root=this.models[name].clone();this.fit(root,height);root.position.x=x;root.position.z=z;root.position.y+=this.groundHeight?.(x,z)??0;this.scene.add(root);
    const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());const collider={x,z,baseY:this.groundHeight?.(x,z)??0,radius:Math.max(size.x,size.z)*.45,height};this.obstacles.push(collider);
    const target={root,name,x,z,height,explosive,health:explosive?60:100,collider,lootCache:this.survival&&name==='Barrel',damage:amount=>{if(target.lootCache||target.health<=0)return;target.health-=amount;if(target.health<=0)this.destroy(target);}};
    root.updateMatrixWorld(true);root.traverse(o=>{o.matrixAutoUpdate=false;o.matrixWorldAutoUpdate=false;if(o.isMesh)o.userData.combatTarget=target;});this.targets.push(target);
  }
  destroy(target){
    this.scene.remove(target.root);const i=this.obstacles.indexOf(target.collider);if(i>=0)this.obstacles.splice(i,1);
    const broken=this.models[target.name+'_Shattered'].clone();this.fit(broken,target.height);broken.position.x=target.x;broken.position.z=target.z;this.scene.add(broken);this.effects.push({object:broken,life:15});
    if(target.explosive)this.explode(new THREE.Vector3(target.x,.5,target.z),5);
  }
  explode(position,radius=5){
    this.onExplosion?.(position,radius);
    for(const target of this.targets)if(target.health>0&&Math.hypot(position.x-target.x,position.z-target.z)<radius)target.damage(100);
    const smoke=this.models.Smoke.clone();this.fit(smoke,1);smoke.position.copy(position);smoke.traverse(o=>{if(o.isMesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=true;m.opacity=.7;}}});this.scene.add(smoke);this.effects.push({object:smoke,life:1.4,smoke:true});
  }
  throwGrenade(camera,position=null){const object=this.parts.Grenade.clone();object.scale.setScalar(.012);object.position.copy(position??camera.position);const velocity=camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(12);velocity.y+=3;this.scene.add(object);this.grenades.push({object,velocity,fuse:2.2});}
  shotEffects(camera,type,hit){
    if(type==='knife'||type==='grenade')return;if(hit&&!hit.object.userData.pursuer){this.markTransform.position.copy(hit.point).addScaledVector(camera.getWorldDirection(new THREE.Vector3()),-.03);this.markTransform.updateMatrix();this.markMesh.setMatrixAt(this.markIndex,this.markTransform.matrix);this.markIndex=(this.markIndex+1)%100;this.markMesh.count=Math.min(100,this.markMesh.count+1);this.markMesh.instanceMatrix.needsUpdate=true;}
    const rifle=type!=='glock',bulletName=rifle?'M416_Bullet':'Glock_Bullet',object=this.projectilePool.create(bulletName);object.scale.setScalar(.01);object.position.copy(camera.position);object.quaternion.copy(camera.quaternion);object.rotateY(Math.PI);const velocity=camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(160);this.projectiles.push({object,pool:bulletName,velocity,life:Math.min(.5,(hit?.distance??60)/160)});
    const shellName=rifle?'M416_Bullet_Shell':'Glock_Bullet_Shell',shell=this.projectilePool.create(shellName);shell.scale.setScalar(.01);shell.position.copy(camera.position).add(new THREE.Vector3(.16,-.1,-.2).applyQuaternion(camera.quaternion));const side=new THREE.Vector3(1,0,0).applyQuaternion(camera.quaternion);this.projectiles.push({object:shell,pool:shellName,velocity:side.multiplyScalar(2).add(new THREE.Vector3(0,1.8,0)),life:2.5,shell:true});
  }
  clearTransient(){for(const effect of [...this.grenades,...this.projectiles,...this.effects])this.scene.remove(effect.object);this.grenades=[];this.projectiles=[];this.effects=[];this.projectilePool?.sync([]);}
  update(dt){
    for(const grenade of [...this.grenades]){grenade.fuse-=dt;grenade.velocity.y-=18*dt;grenade.object.position.addScaledVector(grenade.velocity,dt);grenade.object.rotation.x+=dt*5;if(grenade.object.position.y<.1){grenade.object.position.y=.1;grenade.velocity.y=Math.abs(grenade.velocity.y)*.25;grenade.velocity.x*=.8;grenade.velocity.z*=.8;}if(grenade.fuse<=0){this.explode(grenade.object.position.clone());this.scene.remove(grenade.object);this.grenades.splice(this.grenades.indexOf(grenade),1);}}
    for(const p of [...this.projectiles]){p.life-=dt;if(p.shell){p.velocity.y-=18*dt;p.object.rotation.x+=dt*8;}p.object.position.addScaledVector(p.velocity,dt);if(p.object.position.y<.04&&p.shell){p.object.position.y=.04;p.velocity.set(0,0,0);}if(p.life<=0){this.scene.remove(p.object);this.projectiles.splice(this.projectiles.indexOf(p),1);}}
    this.projectilePool?.sync(this.projectiles);
    for(const effect of [...this.effects]){effect.life-=dt;if(effect.smoke){effect.object.scale.multiplyScalar(1+dt*.8);effect.object.position.y+=dt*.3;effect.object.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.opacity=Math.max(0,effect.life/1.4)*.7;});}if(effect.life<=0){this.scene.remove(effect.object);this.effects.splice(this.effects.indexOf(effect),1);}}
  }
}
