import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {Orders,CAMP_HOUR} from '../orders.js';
import {FieldKit} from '../kit.js';
import {Camp} from '../camp.js';

// Orders follow the course: rations until C, camp by dark after it, water on the last leg.
const orders=new Orders();
assert.match(orders.order(0),/^Reach posts A to C\. Rations are issued for today only/);assert.match(orders.order(3),/^Reach D and E\. Make camp by dark/);assert.match(orders.order(5),/^Reach F, G and H\. Arrive at each with at least a litre of safe water/);assert.match(orders.order(8),/complete/);
const kit=new FieldKit(()=>0);kit.set('rations',3);kit.pack();
assert.equal(orders.register('A',kit,10),'','nothing to check at A');
let line=orders.register('C',kit,14);assert.match(line,/^The DS takes your 3 rations\. From here you live off the land\. Next: Reach D and E/);assert.equal(kit.rations,0);assert.equal(orders.rationsTaken,3);
assert.equal(orders.register('C',kit,15),'','the rations are only taken once');
assert.equal(orders.campDue,CAMP_HOUR,'camp is due at dark the same day');
const late=new Orders(),empty=new FieldKit();empty.set('rations',0);empty.pack();assert.match(late.register('C',empty,20),/no rations left/);assert.equal(late.campDue,24+CAMP_HOUR,'reached in the evening: camp is due the next night');
console.log('Passed DS orders by stage and rations taken at post C.');

// Camp by dark: judged once, when it is due.
const camp=new Camp(new THREE.Scene()),player={x:0,z:0};
assert.equal(orders.step(CAMP_HOUR-.1,{camp,player,kit}),'','not due yet');
line=orders.step(CAMP_HOUR,{camp,player,kit});assert.match(line,/Missing: a lit fire, a basha, a cooked meal/);assert.equal(orders.camp,false);assert.equal(orders.step(CAMP_HOUR+1,{camp,player,kit}),'','only judged once');
const good=new Orders();good.register('C',kit,12);camp.light(1,1,3);camp.pitch(3,1,0,'debris');kit.cooked=1;kit.energy=50;kit.eat('cooked');good.ate(kit.lastEaten);assert.equal(kit.lastEaten,'cooked');
assert.match(good.step(CAMP_HOUR,{camp,player,kit}),/fire, basha and a cooked meal\. Noted/);assert.equal(good.camp,true);
const away=new Orders();away.register('C',kit,12);away.ate('cooked');assert.match(away.step(CAMP_HOUR,{camp,player:{x:200,z:0},kit}),/Missing: you at your camp/);
const before=new Orders();before.ate('cooked');assert.equal(before.ateCooked,false,'a meal before C does not count');
camp.pitch(40,40,0,'tarp');const apart=new Orders();apart.register('C',kit,12);apart.ate('cooked');assert.match(apart.step(CAMP_HOUR,{camp,player,kit}),/your fire beside your basha/);
console.log('Passed the camp-by-dark check: fire, basha, you at camp and a cooked meal.');

// Water at the last posts, and the debrief.
const w=new FieldKit();w.set('filter',0);w.pack();w.water=2;w.untreated=1.5;
assert.match(good.register('F',w,40),/0\.5 L safe\. Not enough/);w.untreated=0;assert.match(good.register('G',w,44),/2\.0 L safe\. Good/);assert.equal(good.register('G',w,45),'','each post is checked once');
let debrief=good.debrief();assert.equal(debrief.length,3);assert.match(debrief[0],/none left to hand in at C/);assert.match(orders.debrief()[0],/3 handed in at C/);assert.match(debrief[1],/Good/);assert.match(debrief[2],/warning\. Short of safe water at F/);
assert.match(orders.debrief()[1],/warning\. Missing a lit fire, a basha, a cooked meal/);assert.match(new Orders().debrief()[0],/not yet/);
// Saved and restored exactly.
const copy=new Orders();copy.load(JSON.parse(JSON.stringify(good.save())));assert.deepEqual(copy.debrief(),good.debrief());assert.equal(copy.campDue,good.campDue);copy.load(null);assert.equal(copy.rationsTaken,null);
console.log('Passed water checks at F to H, the debrief, and saving orders.');
