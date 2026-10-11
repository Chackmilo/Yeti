import { clamp } from '../config.js';
// Segment against a Minkowski-expanded cylinder (XZ disk). No temporary vectors.
export function segmentCircle(x0,d0,x1,d1,x,d,radius){
  const vx=x1-x0,vd=d1-d0,l=vx*vx+vd*vd;
  const t=l?clamp(((x-x0)*vx+(d-d0)*vd)/l,0,1):0;
  const dx=x0+vx*t-x,dz=d0+vd*t-d;return dx*dx+dz*dz<=radius*radius;
}
// Slab test: conservative circle-vs-rock AABB sweep. Expansion includes body radius.
export function segmentAABB(x0,d0,x1,d1,minX,maxX,minD,maxD,radius=0){
  let lo=0,hi=1;const vx=x1-x0,vd=d1-d0;
  minX-=radius;maxX+=radius;minD-=radius;maxD+=radius;
  if(Math.abs(vx)<1e-10){if(x0<minX||x0>maxX)return false;}
  else {let a=(minX-x0)/vx,b=(maxX-x0)/vx;if(a>b){const t=a;a=b;b=t;}lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}
  if(Math.abs(vd)<1e-10){if(d0<minD||d0>maxD)return false;}
  else {let a=(minD-d0)/vd,b=(maxD-d0)/vd;if(a>b){const t=a;a=b;b=t;}lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return false;}
  return lo<=hi;
}
export class CollisionSystem {
  constructor(world){this.world=world;this.candidates=0;}
  hit(x0,d0,x1,d1,radius,treesOnly=false,ignoreId=-1){
    const low=Math.min(d0,d1)-radius-2,high=Math.max(d0,d1)+radius+2;
    this.candidates=0;
    for(let bi=0;bi<this.world.blocks.length;bi++){
      const block=this.world.blocks[bi];if(block.end+8<low||block.start-8>high)continue;
      for(let i=0;i<block.items.length;i++){
        const o=block.items[i];if(!o.active||o.id===ignoreId||(treesOnly&&o.type!=='tree')||o.d+o.r<low||o.d-o.r>high)continue;
        this.candidates++;
        if(o.type==='tree'?segmentCircle(x0,d0,x1,d1,o.x,o.d,radius+o.r):segmentAABB(x0,d0,x1,d1,o.x-o.r,o.x+o.r,o.d-o.r,o.d+o.r,radius))return o;
      }
    }return null;
  }
}
