import {mainTrail} from './landmark-routes.js?v=no-river-1';
const attack={x:mainTrail.center(-594),z:-594};
const north={x:attack.x-45,z:attack.z-35,size:3.4,rotation:.35,shade:1};
const south={x:north.x+8,z:north.z+16,size:2.8,rotation:1.8,shade:.94};
export const FIRST_CONTROL={attack,north,south,post:{x:north.x+4.7,z:north.z}};
// Clear only the immediate landmark cluster; preserve the rest of the seeded forest.
export function firstControlClearing(x,z){const dx=(x-(north.x+4))/19,dz=(z-(north.z+8))/27;return dx*dx+dz*dz<1;}
export function isControlBoulder(x,z){return Math.abs(x-north.x)<.01&&Math.abs(z-north.z)<.01||Math.abs(x-south.x)<.01&&Math.abs(z-south.z)<.01;}
