import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentCircle, segmentAABB, CollisionSystem } from '../src/physics/CollisionSystem.js';
import { WorldGenerator } from '../src/world/WorldGenerator.js';
import { StorageManager } from '../src/core/StorageManager.js';
import { CONFIG as C } from '../src/config.js';
test('CCD contra cilindros: cruce rápido, tangencia, reposo y fallo',()=>{
  assert.equal(segmentCircle(-10,0,10,0,0,0,1),true);
  assert.equal(segmentCircle(-10,1,10,1,0,0,1),true);
  assert.equal(segmentCircle(0,0,0,0,0,0,1),true);
  assert.equal(segmentCircle(-10,2,10,2,0,0,1),false);
});
test('CCD contra AABB expandida: cruce, eje paralelo y extremo',()=>{
  assert.equal(segmentAABB(-10,0,10,0,-1,1,-1,1,.4),true);
  assert.equal(segmentAABB(-10,2,10,2,-1,1,-1,1,.4),false);
  assert.equal(segmentAABB(0,-10,0,10,-1,1,-1,1,.4),true);
  assert.equal(segmentAABB(0,0,0,0,-1,1,-1,1),true);
});
test('Corredor seguro para 100 semillas y reciclaje hasta 10 km',()=>{
  const w=new WorldGenerator();for(let seed=0;seed<100;seed++){
    w.reset(seed);assert.equal(w.validate(),true);
    for(let d=0;d<10000;d+=10){w.update(d);assert.equal(w.validate(),true);}
  }
});
test('Generación determinista y reutilización de los mismos objetos',()=>{
  const a=new WorldGenerator(),b=new WorldGenerator();a.reset(42);b.reset(42);assert.deepEqual(a.blocks,b.blocks);
  const block=a.blocks[0],item=block.items[0];for(let d=0;d<2000;d+=10)a.update(d);
  assert.equal(a.blocks[0],block);assert.equal(a.blocks[0].items[0],item);
  assert.equal(a.blocks.length,C.blockCount);assert.equal(a.blocks[0].items.length,C.rowsPerBlock*22);
});
test('Broad phase detecta un tronco y permite ignorar su ID',()=>{
  const w=new WorldGenerator();w.reset(1);for(const b of w.blocks)for(const o of b.items)o.active=false;
  const o=w.blocks[0].items[0];w.assign(o,'tree',0,-50,1);const c=new CollisionSystem(w);
  assert.equal(c.hit(-20,-50,20,-50,.4),o);assert.equal(c.hit(-20,-50,20,-50,.4,true,o.id),null);
});
test('Storage funciona sin localStorage y separa récords por modo',()=>{
  const s=new StorageManager();assert.equal(s.record('classic'),0);assert.equal(s.saveRecord('classic',120.9),true);
  assert.equal(s.record('classic'),120);assert.equal(s.saveRecord('classic',20),false);assert.equal(s.record('modern'),0);
  s.set('hi_modern','NaN');assert.equal(s.record('modern'),0);
});
