import * as THREE from 'three';
import { CONFIG as C, snowHeight } from '../config.js';
export class MountainTerrain {
  constructor(scene,materials,geometries){
    this.scene=scene;scene.background=new THREE.Color(C.colors.sky);scene.fog=new THREE.FogExp2(C.colors.fog,.0075);
    this.tiles=[];
    for(let i=0;i<C.terrainCount;i++){
      const geometry=new THREE.PlaneGeometry(140,C.terrainLength,40,16);geometry.rotateX(-Math.PI/2);
      const mesh=new THREE.Mesh(geometry,materials.snow);mesh.receiveShadow=true;mesh.frustumCulled=true;scene.add(mesh);this.tiles.push({mesh,center:0});
    }
    this.mountains=new THREE.Group();scene.add(this.mountains);
    for(let i=0;i<16;i++){
      const mesh=new THREE.Mesh(geometries.cone,i%3?materials.snow:materials.rock);
      mesh.position.set((i%2?-1:1)*(90+(i%4)*28),9,-170-Math.floor(i/2)*36);
      mesh.scale.set(48,70+(i%3)*24,53);mesh.rotation.y=i*.81;this.mountains.add(mesh);
    }this.reset();
  }
  setTile(tile,center){
    tile.center=center;const pos=tile.mesh.geometry.attributes.position,base=snowHeight(0,center);
    for(let i=0;i<pos.count;i++)pos.setY(i,snowHeight(pos.getX(i),center-pos.getZ(i))-base);
    pos.needsUpdate=true;tile.mesh.geometry.computeVertexNormals();tile.mesh.geometry.computeBoundingSphere();
  }
  reset(){for(let i=0;i<this.tiles.length;i++)this.setTile(this.tiles[i],(i-2)*C.terrainLength);}
  update(player){
    const base=snowHeight(0,player.d);
    for(let i=0;i<this.tiles.length;i++){
      const tile=this.tiles[i];while(tile.center<player.d-2*C.terrainLength)this.setTile(tile,tile.center+C.terrainCount*C.terrainLength);
      tile.mesh.position.set(0,snowHeight(0,tile.center)-base,player.d-tile.center);
    }this.mountains.position.set(player.x*.08,-7,0);
  }
  dispose(){for(let i=0;i<this.tiles.length;i++){this.scene.remove(this.tiles[i].mesh);this.tiles[i].mesh.geometry.dispose();}this.scene.remove(this.mountains);}
}
