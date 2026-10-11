import assert from 'node:assert/strict';
import {FieldKit} from '../kit.js';
import {InventoryView} from '../inventory-view.js';

const make=()=>({hidden:false,disabled:false,textContent:'',innerHTML:'',attrs:{},setAttribute(k,v){this.attrs[k]=v;}});
const els={'#kit-sheet':make(),'#kit-toggle':make(),'#kit-contents':make(),'#kit-message':make(),'[data-kit="close"]':make(),'[data-kit="drink"]':make(),'[data-kit="eat"]':make(),'[data-kit="fill"]':make(),'[data-kit="register"]':make()};
els['#kit-sheet'].hidden=true;els['#kit-sheet'].querySelector=q=>els[q];
const root={hidden:false,querySelector:q=>els[q]};globalThis.document={querySelector:q=>q==='#kit-menu'?root:null};

const kit=new FieldKit(()=>1);kit.pack();let near={spring:null,post:null},registered=0;
const desktop=new InventoryView(kit,{enabled:false,drink(){},eat(){},fill(){},register(){},near:()=>near});
assert.equal(root.hidden,true,'no kit button without touch');assert.equal(desktop.open,false);

const view=new InventoryView(kit,{enabled:true,drink:()=>kit.drink(),eat:()=>kit.eat(),fill:()=>kit.refill(),register:()=>registered++,near:()=>near});
assert.equal(root.hidden,false);assert.equal(view.open,false);
els['#kit-toggle'].onclick();assert.equal(view.open,true);assert.equal(els['#kit-toggle'].attrs['aria-expanded'],'true');
assert.match(els['#kit-contents'].innerHTML,/2\.0 L/);assert.equal(els['[data-kit="fill"]'].disabled,true,'no spring nearby');assert.equal(els['[data-kit="register"]'].hidden,true);
els['[data-kit="drink"]'].onclick();assert.match(els['#kit-contents'].innerHTML,/1\.5 L/);assert.match(els['#kit-message'].textContent,/Drank/);
kit.energy=50;els['[data-kit="eat"]'].onclick();els['[data-kit="eat"]'].onclick();assert.equal(kit.rations,0);assert.equal(els['[data-kit="eat"]'].disabled,true,'no rations left');
near={spring:{x:0,z:0},post:{code:'C'}};view.render();assert.equal(els['[data-kit="fill"]'].disabled,false);assert.equal(els['[data-kit="register"]'].hidden,false);assert.match(els['[data-kit="register"]'].textContent,/post C/);
els['[data-kit="fill"]'].onclick();assert.equal(kit.water,2);els['[data-kit="register"]'].onclick();assert.equal(registered,1);
els['[data-kit="close"]'].onclick();assert.equal(view.open,false);
console.log('Passed touch-only kit button, contents, drink/eat/fill/register actions, disabled states and close.');
