import {refineConifer,broadleafGeometry,flowerPatchGeometry,flowerSites} from './woodland-polish.js?v=1';
import {controlLandmarkClearing} from './control-landmarks.js?v=irregular-route-1';
import {createUniqueLandmarks} from './unique-landmarks.js?v=irregular-route-1';
import {SECOND_CONTROL,secondControlClearing} from './second-control.js?v=irregular-route-1';
import {createWreckLandmark} from './wreck-landmark.js?v=irregular-route-1';
import {FIRST_CONTROL,firstControlClearing,isControlBoulder} from './first-control.js?v=1';
import {trailClearance,trailCenter,trails} from './landmark-routes.js?v=no-river-1';
import {tileTerrain} from './terrain-tiles.js';
import * as THREE from './vendor/three.module.js';
import {createGroundMaterial} from './ground-material.js?v=no-river-1';
import {createSurfaceMaterial} from './surface-material.js?v=performance-15';

import {terrainHeight,WORLD_SIZE,TERRAIN_SEGMENTS} from './terrain.js?v=gullies-1';
export {trailCenter};
export function createForest(scene){
  let seed=417;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const span=WORLD_SIZE-20,areaScale=(span/620)**2,lengthScale=span/620;
  const obstacles=[],transform=new THREE.Object3D(),shade=new THREE.Color();
  const material=(color,extra={})=>new THREE.MeshStandardMaterial({color,flatShading:true,roughness:1,...extra});
  const outsideTrail=(x,z,margin=3.5)=>trailClearance(x,z)>margin-2.15&&Math.hypot(x,z-8)>5;
  const batch=(name,geometry,mat,items,place,decorative=false)=>{
    const kind=name.includes('wood faces')?'wood':/trunks|branches|stumps|logs|roots|knots/.test(name)?'bark':/boulders|pebbles/.test(name)?'rock':/crowns|shrubs|ferns|grass/.test(name)?'foliage':null;
    if(kind){const old=mat;mat=createSurfaceMaterial(kind,old.color,{side:old.side,fog:old.fog});old.dispose();}
    const mesh=new THREE.InstancedMesh(geometry,mat,items.length);mesh.name=name;mesh.userData.decorative=decorative;
    items.forEach((item,i)=>{transform.position.set(0,0,0);transform.rotation.set(0,0,0);transform.scale.set(1,1,1);place(item,transform,i);if(!/mountain|cloud/.test(name))transform.position.y+=item.ground??terrainHeight(item.x,item.z);transform.updateMatrix();mesh.setMatrixAt(i,transform.matrix);if(item.shade!==undefined){shade.setScalar(item.shade);mesh.setColorAt(i,shade);}});
    mesh.computeBoundingSphere();mesh.castShadow=/trunks|crowns|branches|knots|boulders|stumps|logs|roots/.test(name);mesh.receiveShadow=mesh.castShadow||/shrubs|ferns|grass|wildflower|wood faces/.test(name);scene.add(mesh);return mesh;
  };
  const groundGeometry=new THREE.PlaneGeometry(WORLD_SIZE,WORLD_SIZE,TERRAIN_SEGMENTS,TERRAIN_SEGMENTS);groundGeometry.rotateX(-Math.PI/2);
  const positions=groundGeometry.attributes.position;
  for(let i=0;i<positions.count;i++){const x=positions.getX(i),z=positions.getZ(i);positions.setY(i,terrainHeight(x,z));}
  groundGeometry.computeVertexNormals();
  scene.add(tileTerrain(groundGeometry,createGroundMaterial(),'Faceted forest floor'));
  // Copy terrain triangles exactly so the dirt never clips into rolling hills.
  const trailPositions=[],trailColors=[],trailEdges=[],indices=groundGeometry.index.array;
  const trailField=new Float32Array(positions.count);for(let i=0;i<positions.count;i++)trailField[i]=trailClearance(positions.getX(i),positions.getZ(i));
  for(let i=0;i<indices.length;i+=3){
   const ids=[indices[i],indices[i+1],indices[i+2]];if(!ids.some(id=>trailField[id]<6))continue;
   const color=new THREE.Color(0x9e784b).lerp(new THREE.Color(0xc49b60),random());
   const vertex=(u,v)=>{const w=1-u-v,x=w*positions.getX(ids[0])+u*positions.getX(ids[1])+v*positions.getX(ids[2]),z=w*positions.getZ(ids[0])+u*positions.getZ(ids[1])+v*positions.getZ(ids[2]);return [x,w*positions.getY(ids[0])+u*positions.getY(ids[1])+v*positions.getY(ids[2])+.02,z,trailClearance(x,z)];};
   const add=(a,b,c)=>{if(Math.min(a[3],b[3],c[3])>.4)return;for(const p of [a,b,c]){trailPositions.push(p[0],p[1],p[2]);trailColors.push(color.r,color.g,color.b);trailEdges.push(p[3]);}};
   // Local subdivision only along tracks, retaining the exact parent terrain plane.
   // Unsigned distance prevents false dirt wedges between nearby branches.
   for(let u=0;u<3;u++)for(let v=0;v<3-u;v++){const a=vertex(u/3,v/3),b=vertex((u+1)/3,v/3),c=vertex(u/3,(v+1)/3);add(a,b,c);if(u+v<2)add(b,vertex((u+1)/3,(v+1)/3),c);}
  }
  const pathGeometry=new THREE.BufferGeometry();pathGeometry.setAttribute('position',new THREE.Float32BufferAttribute(trailPositions,3));pathGeometry.setAttribute('color',new THREE.Float32BufferAttribute(trailColors,3));pathGeometry.setAttribute('trailEdge',new THREE.Float32BufferAttribute(trailEdges,1));pathGeometry.computeVertexNormals();scene.add(tileTerrain(pathGeometry,createGroundMaterial(true),'Winding dirt trail'));groundGeometry.dispose();pathGeometry.dispose();
  const trees=[];
  for(let i=0;i<Math.round(4700*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z))continue;trees.push({x,z,height:9+random()*14,width:1.65+random()*2.25,rotation:random()*Math.PI*2,trunk:.7+random()*.65});}
  for(const [x,z] of [[-6,-2],[7,-4],[-6,-17],[6,1],[-7,13]])trees.push({x,z,height:22,width:3.5,rotation:random()*6,trunk:1.3});
  const species=['pine','spruce','fir','broadleaf','snag','sapling'];
  trees.forEach((tree,i)=>{
    const roll=random();tree.species=i>=trees.length-5?[0,2,4,3,1][i-(trees.length-5)]:roll<.3?0:roll<.55?1:roll<.76?2:roll<.86?3:roll<.93?4:5;
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
  const trunkGeometry=new THREE.CylinderGeometry(.17,.43,1,7);trunkGeometry.translate(0,.5,0);
  batch('Tall faceted trunks',trunkGeometry,material(0x87603c),trees,(t,o)=>{o.position.set(t.x,0,t.z);o.rotation.set(t.leanZ,t.rotation,-t.leanX);o.scale.set(t.trunk,t.trunkHeight,t.trunk);});
  trees.forEach(t=>obstacles.push({x:t.x,z:t.z,baseY:t.ground,radius:.43*t.trunk,height:t.height}));
  // Each conifer family has its own serrated crown geometry and tier proportions.
  for(const type of [0,1,2,5]){
    const segments=type===1?9:type===2?8:7;
    let geometry=new THREE.ConeGeometry(1,1,segments,2);
    const vertices=geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){
      const x=vertices.getX(i),z=vertices.getZ(i),y=vertices.getY(i),angle=Math.atan2(z,x);
      const ragged=1+Math.sin(angle*5+y*13)*.16+Math.cos(angle*3+y*7)*.08;
      vertices.setXYZ(i,x*ragged,y+Math.sin(angle*4)*.025*(.5-y),z*ragged);
    }
    geometry.computeVertexNormals();geometry=refineConifer(geometry);const crowns=[];
    trees.filter(t=>t.species===type).forEach(t=>{
      const layers=type===0?3+Math.floor(random()*2):type===1?5+Math.floor(random()*3):type===2?4+Math.floor(random()*3):3;
      const bottom=type===0?.5:type===1?.28:type===2?.36:.32;
      for(let tier=0;tier<layers;tier++){
        if(tier>0&&tier<layers-1&&random()<.09)continue;
        const progress=tier/(layers-1),y=t.height*(bottom+(1-bottom-.07)*progress);
        crowns.push({ground:t.ground,x:t.x+t.leanX*y+(random()-.5)*t.width*.18,z:t.z+t.leanZ*y+(random()-.5)*t.width*.18,y,width:t.width*(1-progress*.77)*(.85+random()*.3),height:t.height*(type===1?.28:type===2?.36:.43)*(1-progress*.36),rotation:t.rotation+random()*.9,shade:.58+random()*.42});
      }
    });
    batch(species[type]+' irregular crowns',geometry,material(type===1?0x547544:type===2?0x6b8140:0x657d3b),crowns,(c,o)=>{o.position.set(c.x,c.y,c.z);o.rotation.set((random()-.5)*.08,c.rotation,(random()-.5)*.08);o.scale.set(c.width,c.height,c.width*(.8+random()*.35));});
  }
  const leafy=[];trees.filter(t=>t.species===3).forEach(t=>{for(let i=0;i<5;i++){const angle=i*2.4,y=t.height*(.67+random()*.25);leafy.push({ground:t.ground,x:t.x+Math.sin(angle)*t.width*.55+t.leanX*y,z:t.z+Math.cos(angle)*t.width*.55+t.leanZ*y,y,size:t.width*(.65+random()*.3),shade:.65+random()*.35});}});
  batch('Broadleaf clustered crowns',broadleafGeometry(),material(0x789044),leafy,(c,o)=>{o.position.set(c.x,c.y,c.z);o.rotation.y=random()*6;o.scale.set(c.size,c.size*.8,c.size);});
  const branches=[];trees.forEach(t=>{
    const count=t.species===4?6:t.species===3?4:2+Math.floor(random()*4);
    for(let i=0;i<count;i++){const y=t.trunkHeight*(.22+random()*.72);branches.push({ground:t.ground,x:t.x+t.leanX*y,z:t.z+t.leanZ*y,y,rotation:t.rotation+i*2.399+random()*.4,length:(t.species===4?.7:1)+random()*t.width*.6,tilt:t.species===4?1.2:.8+random()*.65});}
  });
  const branchGeometry=new THREE.CylinderGeometry(.025,.085,1,5);branchGeometry.translate(0,.5,0);
  batch('Uneven exposed branches',branchGeometry,material(0x765435),branches,(b,o)=>{o.position.set(b.x,b.y,b.z);o.rotation.set(b.tilt,b.rotation,0);o.scale.y=b.length;});
  const roots=[],knots=[];trees.filter(t=>t.species!==5).forEach(t=>{
    for(let i=0;i<3;i++)roots.push({ground:t.ground,x:t.x,z:t.z,rotation:t.rotation+i*2.1,size:t.trunk});
    if(random()<.45){const y=t.trunkHeight*(.12+random()*.25),angle=t.rotation;knots.push({ground:t.ground,x:t.x+Math.sin(angle)*t.trunk*.29+t.leanX*y,z:t.z+Math.cos(angle)*t.trunk*.29+t.leanZ*y,y,size:t.trunk*.12});}
  });
  const rootGeometry=new THREE.ConeGeometry(1,1,4);rootGeometry.translate(0,.5,0);
  batch('Flared trunk roots',rootGeometry,material(0x755335),roots,(r,o)=>{o.position.set(r.x,0,r.z);o.rotation.set(.35,r.rotation,.55);o.scale.set(r.size*.22,r.size*.8,r.size*.32);});
  batch('Trunk bark knots',new THREE.IcosahedronGeometry(1,0),material(0x60432c),knots,(k,o)=>{o.position.set(k.x,k.y,k.z);o.scale.set(k.size,k.size*1.5,k.size);});
  const rocks=[];for(let i=0;i<Math.round(1600*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z,4.4))continue;rocks.push({x,z,size:.6+random()*2.8,rotation:random()*6,shade:.8+random()*.2});}
  for(const [x,z,size] of [[-4,-3,2.1],[5,-11,2.4],[-7,-23,3],[8,9,2.5]])rocks.push({x,z,size,rotation:random()*6,shade:1});
  rocks.push(FIRST_CONTROL.north,FIRST_CONTROL.south);
  batch('Large faceted boulders',new THREE.IcosahedronGeometry(1,0),material(0x777d78),rocks,(r,o)=>{o.position.set(r.x,r.size*.34,r.z);o.rotation.set(.15,r.rotation,.1);o.scale.set(r.size,r.size*.65,r.size*.8);});
  rocks.forEach(r=>obstacles.push({x:r.x,z:r.z,baseY:terrainHeight(r.x,r.z),radius:r.size*.85,height:r.size}));
  const pebbles=[];for(let i=0;i<Math.round(2400*lengthScale);i++){const route=trails[Math.floor(random()*trails.length)],z=route.start+random()*(route.end-route.start),x=route.center(z)+(random()-.5)*8;pebbles.push({x,z,size:.03+random()*.19,rotation:random()*6,shade:.7+random()*.3});}
  batch('Trail pebbles',new THREE.IcosahedronGeometry(1,0),material(0x92938b),pebbles,(r,o)=>{o.position.set(r.x,.025,r.z);o.rotation.y=r.rotation;o.scale.set(r.size,r.size*.6,r.size);},true);
  // Single low-poly clump geometry shared by every grass instance.
  const blades=[];for(let i=0;i<6;i++){const angle=i*2.399,width=.045+random()*.025,height=.25+random()*.35,x=Math.sin(angle)*.12,z=Math.cos(angle)*.12;const sideX=Math.cos(angle)*width,sideZ=-Math.sin(angle)*width;blades.push(x-sideX,0,z-sideZ,x+sideX,0,z+sideZ,x+Math.sin(angle)*.15,height,z+Math.cos(angle)*.15);}
  const grassGeometry=new THREE.BufferGeometry();grassGeometry.setAttribute('position',new THREE.Float32BufferAttribute(blades,3));grassGeometry.computeVertexNormals();
  const grass=[];for(let i=0;i<Math.round(74000*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(trailClearance(x,z)<.25||Math.hypot(x,z-8)<2.8)continue;grass.push({x,z,size:.55+random()*1.2,rotation:random()*6,shade:.6+random()*.4});}
  for(let i=0;i<Math.round(5000*lengthScale);i++){const route=trails[Math.floor(random()*trails.length)],z=route.start+random()*(route.end-route.start),side=random()<.5?-1:1,x=route.center(z)+side*(route.width(z)+.4+random()*4);if(Math.hypot(x,z-8)<3)continue;grass.push({x,z,size:.75+random()*1.25,rotation:random()*6,shade:.6+random()*.4});}
  batch('Dense grass clumps',grassGeometry,material(0x8ca347,{side:THREE.DoubleSide}),grass,(g,o)=>{o.position.set(g.x,.015,g.z);o.rotation.y=g.rotation;o.scale.setScalar(g.size);},true);
  const bushes=[];for(let i=0;i<Math.round(5000*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z,4))continue;bushes.push({x,z,size:.4+random()*.85,rotation:random()*6,shade:.7+random()*.3});}
  for(let i=0;i<60;i++){const z=-60+random()*80,x=trailCenter(z)+(random()<.5?-1:1)*(4+random()*7);if(Math.hypot(x,z-8)>6)bushes.push({x,z,size:.6+random()*.9,rotation:random()*6,shade:.7+random()*.3});}
  batch('Low angular shrubs',new THREE.IcosahedronGeometry(1,0),material(0x627b36),bushes,(b,o)=>{o.position.set(b.x,b.size*.35,b.z);o.rotation.y=b.rotation;o.scale.set(b.size,b.size*.65,b.size);},true);
  const fernVertices=[];for(let i=0;i<8;i++){const angle=i*Math.PI/4,x=Math.sin(angle),z=Math.cos(angle);fernVertices.push(0,0,0,x*.5+.1,.22,z*.5-.1,x*.8,.4,z*.8,0,0,0,x*.8,.4,z*.8,x*.5-.1,.22,z*.5+.1);}
  const fernGeometry=new THREE.BufferGeometry();fernGeometry.setAttribute('position',new THREE.Float32BufferAttribute(fernVertices,3));fernGeometry.computeVertexNormals();
  const ferns=bushes.filter((b,i)=>i%2===0).map(b=>({...b,x:b.x+.7,z:b.z+.4}));batch('Star-shaped forest ferns',fernGeometry,material(0x83a34c,{side:THREE.DoubleSide}),ferns,(f,o)=>{o.position.set(f.x,.02,f.z);o.rotation.y=f.rotation;o.scale.setScalar(f.size);},true);
  const stumps=[];for(let i=0;i<Math.round(260*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z,4))continue;stumps.push({x,z,size:.4+random()*.5,height:.3+random()*.4});}
  batch('Cut tree stumps',new THREE.CylinderGeometry(.8,1,1,7),material(0x735337),stumps,(s,o)=>{o.position.set(s.x,s.height*.5,s.z);o.scale.set(s.size,s.height,s.size);});
  batch('Pale cut wood faces',new THREE.CircleGeometry(1,7),material(0xb28d58),stumps,(s,o)=>{o.position.set(s.x,s.height+.003,s.z);o.rotation.x=-Math.PI/2;o.scale.setScalar(s.size*.8);},true);
  stumps.forEach(s=>obstacles.push({x:s.x,z:s.z,baseY:terrainHeight(s.x,s.z),radius:s.size,height:s.height}));
  const logs=[];for(let i=0;i<Math.round(140*areaScale);i++){const x=(random()-.5)*span,z=(random()-.5)*span;if(!outsideTrail(x,z,7))continue;logs.push({x,z,rotation:random()*6,length:2.3+random()*2,radius:.18+random()*.17});}
  batch('Fallen tree logs',new THREE.CylinderGeometry(1,1,1,7),material(0x6d5035),logs,(l,o)=>{o.position.set(l.x,l.radius,l.z);o.rotation.set(Math.PI/2,0,l.rotation);o.scale.set(l.radius,l.length,l.radius);});
  logs.forEach(l=>{for(let i=-1;i<=1;i++)obstacles.push({x:l.x-Math.sin(l.rotation)*i*l.length/3,z:l.z+Math.cos(l.rotation)*i*l.length/3,baseY:terrainHeight(l.x,l.z),radius:l.radius+.15,height:l.radius*2});});
  // Fog layers and polygonal mountain silhouettes frame the forest beyond the play area.
  const mountains=[];for(let i=0;i<22;i++){const angle=i*Math.PI*2/22;mountains.push({x:Math.sin(angle)*430,z:Math.cos(angle)*430,height:35+random()*50,width:35+random()*30,shade:.75+random()*.25});}
  batch('Distant mountain silhouettes',new THREE.ConeGeometry(1,1,5),material(0x829ead,{fog:false}),mountains,(m,o)=>{o.position.set(m.x,m.height*.5-6,m.z);o.rotation.y=random()*6;o.scale.set(m.width,m.height,m.width);},true);
  const clouds=[];for(let i=0;i<30;i++){const angle=random()*Math.PI*2,radius=100+random()*100;clouds.push({x:Math.sin(angle)*radius,z:Math.cos(angle)*radius,y:50+random()*20,width:6+random()*14});}
  batch('Faceted sky clouds',new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xe9f2f6,fog:false}),clouds,(c,o)=>{o.position.set(c.x,c.y,c.z);o.scale.set(c.width,c.width*.25,c.width*.65);},true);
  const flowers=flowerSites();batch('Small woodland wildflower patches',flowerPatchGeometry(),createSurfaceMaterial('foliage',0xffffff,{vertexColors:true,side:THREE.DoubleSide}),flowers,(f,o)=>{o.position.set(f.x,.015,f.z);o.rotation.y=f.rotation;o.scale.setScalar(f.size);},true);
  // Compact existing static batches once before visibility indexing. Random generation
  // stays unchanged, keeping every other checkpoint and the rest of the forest stable.
  for(const mesh of scene.children){if(!mesh.isInstancedMesh||/clouds|mountain/.test(mesh.name))continue;
   let kept=0;for(let i=0;i<mesh.count;i++){const x=mesh.instanceMatrix.array[i*16+12],z=mesh.instanceMatrix.array[i*16+14];
    if(firstControlClearing(x,z)&&!(mesh.name==='Large faceted boulders'&&isControlBoulder(x,z)))continue;
    if(secondControlClearing(x,z)||controlLandmarkClearing(x,z))continue;
    if(kept!==i){mesh.instanceMatrix.array.copyWithin(kept*16,i*16,(i+1)*16);if(mesh.instanceColor)mesh.instanceColor.array.copyWithin(kept*3,i*3,(i+1)*3);}kept++;
   }mesh.count=kept;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
  }
  scene.userData.forestStats={worldSize:WORLD_SIZE,areaMultiplier:WORLD_SIZE**2/280**2,expansionFromNavigation:WORLD_SIZE**2/640**2,trees:trees.length,species:Object.fromEntries(species.map((name,i)=>[name,trees.filter(t=>t.species===i).length])),flowerPatches:flowers.length,grassClumps:grass.length,boulders:rocks.length,shrubs:bushes.length,obstacles:obstacles.length};
  const cleared=obstacles.filter(o=>(!firstControlClearing(o.x,o.z)||isControlBoulder(o.x,o.z))&&!secondControlClearing(o.x,o.z)&&!controlLandmarkClearing(o.x,o.z));
  createWreckLandmark(scene);
  for(const offset of [-1.5,0,1.5]){const x=SECOND_CONTROL.car.x,z=SECOND_CONTROL.car.z+offset;cleared.push({x,z,baseY:terrainHeight(x,z),radius:1.35,height:2.1});}
  createUniqueLandmarks(scene,cleared);
  return cleared;
}
