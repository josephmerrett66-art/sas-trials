const car={x:347,z:-188};
export const SECOND_CONTROL={car,post:{x:347,z:-183}};
export function secondControlClearing(x,z){const dx=(x-(car.x+6))/22,dz=(z-(car.z+.8))/18;return dx*dx+dz*dz<1;}
