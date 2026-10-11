import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {ValleyRiver} from '../river.js';
import {terrainHeight,rivers,riverAt,riverClearance} from '../terrain.js';
import {FIRST_CONTROL} from '../first-control.js';
import {SECOND_CONTROL} from '../second-control.js';
import {CONTROL_LANDMARKS} from '../control-landmarks.js';

const main=rivers.filter(r=>r.main);
assert.equal(main.length,1,'one main river');
const streams=rivers.filter(r=>!r.main);
assert.ok(streams.length>=3&&streams.length<=10,'the river branches into a bounded number of streams');
assert.ok(main[0].length>1800,'the main river crosses the map');

// Junctions are checked separately below; elsewhere the bank must hide the ribbon edge.
const nearOther=(r,p)=>rivers.some(o=>o!==r&&o.points.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<q.F+14));
for(const r of rivers){
 const pts=r.points;
 for(let i=1;i<pts.length;i++)assert.ok(pts[i].S<=pts[i-1].S+1e-6,`${r.name} never flows uphill`);
 // Not a straight line: the path is substantially longer than the distance between its ends.
 const a=pts[0],b=pts.at(-1);if(r.main)assert.ok(r.length>1.15*Math.hypot(b.x-a.x,b.z-a.z),`${r.name} winds through the valleys`);
 for(let i=0;i<pts.length;i+=4){
  const p=pts[i],bed=terrainHeight(p.x,p.z);
  assert.ok(bed<p.S-.08,`${r.name} has water over its bed`);
  // Across the bank the ground rises above the water, so the ribbon edges stay hidden.
  const q=pts[Math.min(pts.length-1,i+1)],o=pts[Math.max(0,i-1)],tx=q.x-o.x,tz=q.z-o.z,l=Math.hypot(tx,tz)||1;
  if(Math.max(Math.abs(p.x),Math.abs(p.z))>700||nearOther(r,p))continue;
  for(const side of [-1,1]){const d=p.w+7.5,x=p.x-tz/l*d*side,z=p.z+tx/l*d*side;assert.ok(terrainHeight(x,z)>p.S+.05,`${r.name} water edge stays under the bank`);}
 }
}
// Streams meet water at the level of the water they join.
for(const r of streams){const end=r.points.at(-1),others=rivers.filter(o=>o!==r);let best=null,bd=Infinity;for(const o of others)for(const p of o.points){const d=Math.hypot(p.x-end.x,p.z-end.z);if(d<bd){bd=d;best=p;}}assert.ok(bd<1,'stream ends on another channel');assert.ok(Math.abs(best.S-end.S)<.05,'stream joins at the receiving water level');}

const sites=[{x:0,z:12},FIRST_CONTROL.post,SECOND_CONTROL.car,...CONTROL_LANDMARKS.flatMap(c=>[c.post,c.feature])];
for(const p of sites)assert.ok(riverClearance(p.x,p.z)>15,'start, posts and control features stay dry');

const river=new ValleyRiver(new THREE.Scene());
assert.ok(river.group.children.length<90,'water tiles remain bounded');
assert.ok(river.group.children.every(o=>o.userData.terrainTile),'water is culled by tile');
assert.ok(river.triangles<20000,'water mesh stays light');
river.step(2);assert.equal(river.time.value,2);
console.log(`Passed downhill flow, winding branches (${streams.length} streams, ${Math.round(rivers.reduce((s,r)=>s+r.length,0))} m), matched junctions, hidden water edges, dry posts and bounded tiles.`);
