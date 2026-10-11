import * as THREE from 'three';
export function createModelFactory(){
const mat={snow:new THREE.MeshStandardMaterial({color:'#f0f8ff',roughness:.94}),pine:new THREE.MeshStandardMaterial({color:'#204e47',roughness:.92}),bark:new THREE.MeshStandardMaterial({color:'#685049',roughness:1}),rock:new THREE.MeshStandardMaterial({color:'#7b8a9a',flatShading:true,roughness:.86}),red:new THREE.MeshStandardMaterial({color:'#fc664d',roughness:.45}),navy:new THREE.MeshStandardMaterial({color:'#12374e',roughness:.7}),teal:new THREE.MeshStandardMaterial({color:'#3dc8c1',roughness:.53}),black:new THREE.MeshStandardMaterial({color:'#182932',roughness:.4}),skin:new THREE.MeshStandardMaterial({color:'#efb48e',roughness:.75}),white:new THREE.MeshStandardMaterial({color:'#fafaff',roughness:.9}),blue:new THREE.MeshStandardMaterial({color:'#397ee8',roughness:.55}),gold:new THREE.MeshStandardMaterial({color:'#ffca54',metalness:.25,roughness:.4}),pelo:new THREE.MeshStandardMaterial({color:'#875735',roughness:.8}),oscuro:new THREE.MeshStandardMaterial({color:'#67412d',roughness:.8}),hocico:new THREE.MeshStandardMaterial({color:'#e8c69c',roughness:.8}),bufanda:new THREE.MeshStandardMaterial({color:'#ff684a',roughness:.75}),casco:new THREE.MeshStandardMaterial({color:'#f5b936',roughness:.55}),esquis:new THREE.MeshStandardMaterial({color:'#16b8c4',roughness:.5}),gafas:new THREE.MeshStandardMaterial({color:'#243346',roughness:.4}),lente:new THREE.MeshStandardMaterial({color:'#bdefff',roughness:.12})};
const sharedGeo={box:new THREE.BoxGeometry(1,1,1),sphere:new THREE.SphereGeometry(1,12,8),cylinder:new THREE.CylinderGeometry(1,1,1,8),cone:new THREE.ConeGeometry(1,1,8)};
function part(parent,geometry,material,x,y,z,sx=1,sy=1,sz=1){const o=new THREE.Mesh(geometry,material);o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function limb(parent,material,x,y,z,sx,sy,sz){const pivot=new THREE.Group();pivot.position.set(x,y,z);parent.add(pivot);part(pivot,sharedGeo.sphere,material,0,-sy*.48,0,sx,sy*.6,sz);return pivot;}
function makeSkier(){
const root=new THREE.Group(),body=new THREE.Group();root.add(body);
const hips=part(body,sharedGeo.sphere,mat.oscuro,0,.82,0,.32,.26,.24);
part(body,sharedGeo.sphere,mat.pelo,0,1.05,0,.32,.45,.28);
part(body,sharedGeo.sphere,mat.hocico,0,1.06,-.15,.22,.32,.12);
part(body,sharedGeo.sphere,mat.pelo,0,1.56,-.04,.3,.26,.26);
part(body,sharedGeo.sphere,mat.hocico,0,1.5,-.25,.21,.14,.14);
part(body,sharedGeo.sphere,mat.black,0,1.53,-.37,.06,.05,.04);
for(const s of [-1,1]){part(body,sharedGeo.sphere,mat.oscuro,s*.24,1.7,-.03,.09,.1,.07);}
part(body,sharedGeo.sphere,mat.casco,0,1.72,-.02,.31,.16,.27);
part(body,sharedGeo.sphere,mat.gafas,0,1.62,-.23,.24,.07,.07);
part(body,sharedGeo.box,mat.lente,0,1.62,-.27,.18,.045,.03);
part(body,sharedGeo.sphere,mat.bufanda,0,1.33,-.04,.32,.07,.28);
const scarf=part(body,sharedGeo.box,mat.bufanda,.22,1.3,.22,.13,.04,.45);
scarf.rotation.y=-.2;
const tail=new THREE.Group();tail.position.set(0,.82,.18);body.add(tail);
part(tail,sharedGeo.sphere,mat.oscuro,0,-.08,.28,.13,.11,.42);
part(tail,sharedGeo.cone,mat.oscuro,0,-.1,.55,.1,.38,.1);
const legs=[],arms=[],skis=[];
for(const s of [-1,1]){
legs.push(limb(body,mat.oscuro,s*.2,.88,0,.14,.68,.14));
const arm=limb(body,mat.pelo,s*.35,1.42,-.05,.12,.5,.12);
arm.rotation.z=s*.3;
arms.push(arm);
const pole=part(body,sharedGeo.cylinder,mat.black,s*.55,.6,.1,.025,.95,.025);
pole.rotation.x=-.2;
const ski=new THREE.Group();ski.position.set(s*.25,.06,0);root.add(ski);
part(ski,sharedGeo.box,mat.esquis,0,0,0,.16,.07,2.2);
const tip=part(ski,sharedGeo.box,mat.casco,0,.08,-1.08,.16,.07,.35);
tip.rotation.x=-.4;
part(ski,sharedGeo.box,mat.black,0,.14,0,.2,.18,.4);
skis.push(ski);
}
return {root,body,hips,legs,arms,skis,tail,scarf};
}
function makeYeti(){const root=new THREE.Group(),body=new THREE.Group();root.add(body);part(body,sharedGeo.sphere,mat.white,0,1.8,0,.93,1.18,.66);part(body,sharedGeo.sphere,mat.white,0,3.06,-.05,.64,.7,.57);part(body,sharedGeo.sphere,mat.skin,0,2.98,-.49,.45,.37,.12);for(const s of [-1,1]){part(body,sharedGeo.sphere,mat.white,s*.62,3.1,0,.2,.24,.2);part(body,sharedGeo.sphere,mat.black,s*.21,3.18,-.59,.06,.075,.04);const brow=part(body,sharedGeo.box,mat.navy,s*.2,3.32,-.56,.24,.055,.06);brow.rotation.z=-s*.2;}part(body,sharedGeo.sphere,mat.navy,0,2.98,-.64,.12,.085,.08);part(body,sharedGeo.sphere,mat.black,0,2.79,-.59,.21,.1,.06);for(const s of [-1,1])part(body,sharedGeo.box,mat.white,s*.1,2.83,-.64,.065,.09,.03);const arms=[],legs=[];for(const s of [-1,1]){arms.push(limb(body,mat.white,s*.98,2.55,0,.28,1.15,.3));legs.push(limb(body,mat.white,s*.42,1.07,0,.32,.92,.34));part(legs[legs.length-1],sharedGeo.sphere,mat.skin,0,-.82,-.15,.32,.14,.44);}return {root,body,arms,legs};}

return { materials:mat, geometries:sharedGeo, makeSkier, makeYeti, dispose(){ for(const key in mat)mat[key].dispose(); for(const key in sharedGeo)sharedGeo[key].dispose(); } };
}
