import * as THREE from 'three';
import { CONFIG as C, snowHeight, clamp } from '../config.js';
export class SnowTracks {
  constructor(scene){
    this.scene=scene;this.index=0;this.timer=0;this.particleIndex=0;this.sprayTimer=0;
    this.pool=Array.from({length:C.trackCount},()=>({life:0,x:0,d:0,length:0,angle:0}));
    this.geometry=new THREE.BoxGeometry(1,.012,1);this.material=new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:.55,depthWrite:false});
    this.mesh=new THREE.InstancedMesh(this.geometry,this.material,C.trackCount);this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dummy=new THREE.Object3D();this.color=new THREE.Color();this.fresh=new THREE.Color('#7797b0');this.old=new THREE.Color('#eef7ff');
    for(let i=0;i<C.trackCount;i++)this.mesh.setColorAt(i,this.old);this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
    this.particles=Array.from({length:C.particleCount},()=>({life:0,x:0,y:0,d:0,vx:0,vy:0,vd:0}));
    this.positions=new Float32Array(C.particleCount*3);this.colors=new Float32Array(C.particleCount*3);this.positions.fill(-999);
    this.particleGeometry=new THREE.BufferGeometry();this.particleGeometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));this.particleGeometry.setAttribute('color',new THREE.BufferAttribute(this.colors,3).setUsage(THREE.DynamicDrawUsage));
    this.particleMaterial=new THREE.PointsMaterial({size:.15,color:'#fff',vertexColors:true,transparent:true,opacity:.8,depthWrite:false});this.points=new THREE.Points(this.particleGeometry,this.particleMaterial);this.points.frustumCulled=false;scene.add(this.points);this.reset();
  }
  reset(){for(let i=0;i<this.pool.length;i++)this.pool[i].life=0;for(let i=0;i<this.particles.length;i++)this.particles[i].life=0;this.index=0;this.particleIndex=0;this.timer=0;this.sprayTimer=0;}
  spray(player,n,force=1){for(let i=0;i<n;i++){
    const p=this.particles[this.particleIndex++%C.particleCount],side=Math.random()<.5?-1:1;
    p.life=.6+Math.random()*.5;p.x=player.x+side*.3;p.y=.15;p.d=player.d;p.vx=side*(1+Math.random()*3)*force;p.vy=1+Math.random()*3;p.vd=-2-Math.random()*4;
  }}
  step(dt,player,playing){
    if(playing&&!player.crash){
      this.timer+=dt;this.sprayTimer+=dt;
      if(this.timer>=1/30){const length=Math.max(.12,player.speed*this.timer),angle=-Math.atan2(player.vx,player.speed);
        for(let side=-1;side<=1;side+=2){const t=this.pool[this.index++%C.trackCount];t.life=C.trackLife;t.x=player.x+side*.25;t.d=player.d-length*.5;t.length=length+.09;t.angle=angle;}this.timer=0;
      }
      if(this.sprayTimer>.035&&(player.brake>.15||Math.abs(player.vx)>2||player.turbo)){this.spray(player,player.brake>.2?9:4,1+player.brake);this.sprayTimer=0;}
    }
    for(let i=0;i<this.pool.length;i++)this.pool[i].life=Math.max(0,this.pool[i].life-dt);
    for(let i=0;i<this.particles.length;i++){const p=this.particles[i];if(p.life<=0)continue;p.life-=dt;p.x+=p.vx*dt;p.d+=p.vd*dt;p.y+=p.vy*dt;p.vy-=8*dt;if(p.y<0)p.life=0;}
  }
  draw(player){
    const base=snowHeight(0,player.d),o=this.dummy;
    for(let i=0;i<this.pool.length;i++){
      const t=this.pool[i];if(t.life>0){o.position.set(t.x,snowHeight(t.x,t.d)-base+.025,player.d-t.d);o.scale.set(.07,1,t.length);o.rotation.set(0,t.angle,0);this.color.copy(this.old).lerp(this.fresh,Math.pow(t.life/C.trackLife,1.3));this.mesh.setColorAt(i,this.color);}
      else {o.position.set(0,-999,0);o.scale.set(0,0,0);}o.updateMatrix();this.mesh.setMatrixAt(i,o.matrix);
    }this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;
    for(let i=0;i<this.particles.length;i++){const p=this.particles[i],j=i*3;if(p.life>0){this.positions[j]=p.x;this.positions[j+1]=snowHeight(p.x,p.d)-base+p.y;this.positions[j+2]=player.d-p.d;const fade=clamp(p.life/.4,0,1);this.colors[j]=this.colors[j+1]=this.colors[j+2]=fade;}else this.positions[j+1]=-999;}
    this.particleGeometry.attributes.position.needsUpdate=true;this.particleGeometry.attributes.color.needsUpdate=true;
  }
  dispose(){this.scene.remove(this.mesh,this.points);this.mesh.dispose();this.geometry.dispose();this.material.dispose();this.particleGeometry.dispose();this.particleMaterial.dispose();}
}
