import {S} from './world-size.js?v=big-1';
const car={x:Math.round(S(347)),z:Math.round(S(-188))};
export const SECOND_CONTROL={car,post:{x:car.x,z:car.z+5}};
export function secondControlClearing(x,z){const dx=(x-(car.x+6))/22,dz=(z-(car.z+.8))/18;return dx*dx+dz*dz<1;}
