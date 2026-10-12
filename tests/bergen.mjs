import assert from 'node:assert/strict';
import {BergenGrid,SHAPES,COLS,ROWS} from '../bergen-grid.js';
import {FieldKit} from '../kit.js';

const g=new BergenGrid();assert.equal(g.cols*g.rows,COLS*ROWS);
const bag=g.place('bedroll',0,0);assert.ok(bag);assert.equal(g.place('water',1,1),null,'blocks cannot overlap');
assert.equal(g.place('waterproof',5,0),null,'blocks stay inside the bergen');assert.ok(g.place('waterproof',3,0,false));
assert.ok(g.move(bag,0,3,true),'a block can be turned and moved');assert.deepEqual(g.size(bag),[4,2]);
assert.equal(g.move(bag,5,3,false),false,'a move that does not fit is refused');assert.equal(bag.x,0);
const copy=g.copy();assert.deepEqual(copy.save(),g.save());assert.equal(g.roomFor(['stove']),true);const before=g.freeCells;g.roomFor(['stove','stove']);assert.equal(g.freeCells,before,'checking room changes nothing');
// Fill it: auto-placement turns blocks to use awkward gaps, and stops when full.
const full=new BergenGrid();let n=0;while(full.autoPlace('wood'))n++;assert.equal(n,Math.floor(COLS/1)*Math.floor(ROWS/3)+Math.floor(COLS/3)*(ROWS%3),'wood packs upright, then on its side');assert.equal(full.roomFor(['wood']),false);
// The kit is what is in the bergen.
const kit=new FieldKit(()=>0);assert.equal(kit.loadout.water,2);assert.equal(kit.bergen.count('water'),2);
assert.equal(kit.set('bedroll',1),true);assert.equal(kit.loadout.bedroll,1);
kit.pack();const layout=JSON.stringify(kit.bergen.save());
kit.wood=0;let wood=0;while(kit.gatherWood())wood++;assert.ok(wood>=1);assert.ok(kit.wood<=5);
const tight=new FieldKit(()=>0);for(const id of ['water','rations'])tight.set(id,6);tight.set('waterproof',1);tight.set('stove',1);tight.set('bedroll',1);tight.pack();
let gathered=0;while(tight.gatherWood())gathered++;assert.ok(gathered<5,'a full bergen has no room for much wood');assert.match(tight.message,/No room|all the wood/);
tight.eat('ration');tight.eat('ration');
kit.raw=1;kit.cook();assert.equal(kit.cooked,1);assert.equal(kit.raw,0);
kit.reset();assert.equal(JSON.stringify(kit.bergen.save()),layout,'a new attempt repacks the same layout');assert.equal(kit.wood,0);assert.equal(kit.rations,2);
console.log('Passed bergen grid fitting, turning, moving, auto-placement, room checks, kit counts from the grid, no room for extra wood and repacking the same layout.');
