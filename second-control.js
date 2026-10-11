const rock={x:576,z:-604.8,size:4.5,rotation:1.1,shade:1};
const log={x:590,z:-605,rotation:0,length:7,radius:.45};
export const SECOND_CONTROL={rock,log,post:{x:rock.x,z:rock.z+6}};
export function secondControlClearing(x,z){const dx=(x-582)/22,dz=(z+603)/18;return dx*dx+dz*dz<1;}
export function isSecondControlRock(x,z){return Math.abs(x-rock.x)<.01&&Math.abs(z-rock.z)<.01;}
export function isSecondControlLog(x,z){return Math.abs(x-log.x)<.01&&Math.abs(z-log.z)<.01;}
export function isSecondControlCollider(x,z){return isSecondControlRock(x,z)||Math.abs(x-log.x)<.01&&Math.abs(z-log.z)<=log.length/3+.01;}
