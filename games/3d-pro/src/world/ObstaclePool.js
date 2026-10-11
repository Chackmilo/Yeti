import * as THREE from 'three';
import { CONFIG as C, snowHeight } from '../config.js';
export class ObstaclePool {
  constructor(scene,world,mat){
    this.scene=scene;this.world=world;this.dummy=new THREE.Object3D();this.blocks=[];
    this.geometries=[new THREE.CylinderGeometry(.22,.38,2.2,6),new THREE.ConeGeometry(1.75,3.8,7),new THREE.ConeGeometry(1.52,3.15,7),new THREE.ConeGeometry(1.24,3.4,7),new THREE.ConeGeometry(1.1,2.85,7),new THREE.DodecahedronGeometry(1,0),new THREE.DodecahedronGeometry(1,0),new THREE.CylinderGeometry(.035,.035,2,5),new THREE.BoxGeometry(.9,.47,.025),new THREE.BoxGeometry(.9,.47,.025),new THREE.CylinderGeometry(1,1,1,10),new THREE.BoxGeometry(3.0,.4,1.8)];
    this.hitMaterial=new THREE.MeshBasicMaterial({color:'#ff4455',wireframe:true,transparent:true,opacity:.6,depthTest:false});
    const rampMaterial=new THREE.MeshStandardMaterial({color:'#cbeefd',roughness:.35,metalness:.25});
    const materials=[mat.bark,mat.pine,mat.snow,mat.pine,mat.snow,mat.rock,mat.snow,mat.red,mat.red,mat.blue,this.hitMaterial,rampMaterial];
    this.offsets=new Float32Array([1.1,3.1,3.55,5.05,5.48]);
    for(let b=0;b<world.blocks.length;b++){
      const group=new THREE.Group(),meshes=[];scene.add(group);
      for(let k=0;k<this.geometries.length;k++){
        const capacity=k<5?C.rowsPerBlock*22:k<7?C.rowsPerBlock*4:k===7?C.rowsPerBlock*2:k<10?C.rowsPerBlock:k===10?C.rowsPerBlock*22:C.rowsPerBlock;
        const mesh=new THREE.InstancedMesh(this.geometries[k],materials[k],capacity);mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.count=0;mesh.castShadow=k<10||k===11;mesh.receiveShadow=k<10||k===11;mesh.frustumCulled=true;mesh.boundingSphere=new THREE.Sphere();group.add(mesh);meshes.push(mesh);
      }meshes[10].visible=false;this.blocks.push({group,meshes,revision:-1});
    }
  }
  matrix(mesh,index,x,y,z,sx,sy,sz,ry=0,rx=0){const d=this.dummy;d.position.set(x,y,z);d.rotation.set(rx,ry,0);d.scale.set(sx,sy,sz);d.updateMatrix();mesh.setMatrixAt(index,d.matrix);}
  rebuild(renderBlock,block){
    const m=renderBlock.meshes,center=(block.start+block.end)*.5,base=snowHeight(0,center);let ti=0,ri=0,pi=0,fi=0,bi=0,hi=0,rm=0;
    for(let i=0;i<block.items.length;i++){
      const o=block.items[i];if(!o.active)continue;const y=snowHeight(o.x,o.d)-base,z=center-o.d,s=o.s;
      if(o.type==='tree'){for(let k=0;k<5;k++)this.matrix(m[k],ti,o.x,y+this.offsets[k]*s,z,s,s,s);ti++;}
      else {this.matrix(m[5],ri,o.x,y+.65*s,z,s,.8*s,s,o.x);this.matrix(m[6],ri,o.x,y+1.04*s,z,s*.8,.28*s,s*.8,o.x);ri++;}
      this.matrix(m[10],hi++,o.x,y+.75,z,o.r,1.5,o.r);
    }
    for(let i=0;i<block.flags.length;i++){
      const f=block.flags[i];if(!f.active)continue;const y=snowHeight(f.x,f.d)-base,z=center-f.d;
      for(let side=-1;side<=1;side+=2){const x=f.x+side*(C.safeHalf+1.2);this.matrix(m[7],pi++,x,y+1,z,1,1,1);this.matrix(f.blue?m[9]:m[8],f.blue?bi++:fi++,x+side*.44,y+1.63,z,1,1,1);}
    }
    if(block.ramps){
      for(let i=0;i<block.ramps.length;i++){
        const r=block.ramps[i];if(!r.active)continue;const y=snowHeight(r.x,r.d)-base,z=center-r.d;
        this.matrix(m[11],rm++,r.x,y+.24,z,1,1,1,0,.22);
      }
    }
    for(let k=0;k<m.length;k++){
      m[k].count=k<5?ti:k<7?ri:k===7?pi:k===8?fi:k===9?bi:k===10?hi:rm;m[k].instanceMatrix.needsUpdate=true;
      m[k].boundingSphere.center.set(0,0,0);m[k].boundingSphere.radius=75;
    }renderBlock.revision=block.revision;
  }
  update(player){const base=snowHeight(0,player.d);for(let i=0;i<this.blocks.length;i++){
    const block=this.world.blocks[i],render=this.blocks[i],center=(block.start+block.end)*.5;
    if(render.revision!==block.revision)this.rebuild(render,block);
    render.group.position.set(0,snowHeight(0,center)-base,player.d-center);
  }}
  setDebug(enabled){for(let i=0;i<this.blocks.length;i++)this.blocks[i].meshes[10].visible=enabled;}
  dispose(){for(let b=0;b<this.blocks.length;b++){this.scene.remove(this.blocks[b].group);for(let k=0;k<this.blocks[b].meshes.length;k++)this.blocks[b].meshes[k].dispose();}for(let k=0;k<this.geometries.length;k++)this.geometries[k].dispose();this.hitMaterial.dispose();}
}
