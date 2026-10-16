import { CONFIG as C, corridor } from '../config.js';
export class WorldGenerator {
  constructor(){
    this.blocks=[];this.randState=1;this.nextStart=0;this.nextId=0;
    for(let b=0;b<C.blockCount;b++){
      const block={start:0,end:0,revision:0,items:[],flags:[],ramps:[]};
      for(let i=0;i<C.rowsPerBlock*22;i++)block.items.push({active:false,id:0,type:'tree',x:0,d:0,s:1,r:1});
      for(let i=0;i<C.rowsPerBlock;i++){block.flags.push({active:false,x:0,d:0,blue:false,cleared:false,rivalCleared:false});block.ramps.push({active:false,x:0,d:0,cleared:false});}
      this.blocks.push(block);
    }
  }
  random(){let t=this.randState+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}
  assign(o,type,x,d,s){o.active=true;o.id=this.nextId++;o.type=type;o.x=x;o.d=d;o.s=s;o.r=type==='tree'?.38*s:s;}
  fill(block,start){
    block.start=start;block.end=start+(C.rowsPerBlock-1)*C.rowStep;block.revision++;
    for(let i=0;i<block.items.length;i++)block.items[i].active=false;
    let index=0;
    for(let row=0;row<C.rowsPerBlock;row++){
      const d=start+row*C.rowStep;
      for(let side=-1;side<=1;side+=2)for(let j=0;j<9;j++){
        this.assign(block.items[index++],'tree',side*(C.halfWidth+.9+(j%3)*3.2)+this.random()*1.8,
          d+(Math.floor(j/3)-1)*4.3+this.random()*1.5,.8+this.random()*.45);
      }
      for(let j=0;j<4;j++){
        const x=-22+this.random()*44,od=d+(this.random()-.5)*6,s=.7+this.random()*.45,type=this.random()<.76?'tree':'rock';
        if(Math.abs(x-corridor(od))>C.safeHalf+1.8*s)this.assign(block.items[index++],type,x,od,s);
      }
      const f=block.flags[row],r=block.ramps[row],n=Math.round(d/C.rowStep);
      f.active=d>20&&n%3===0;f.x=corridor(d);f.d=d;f.blue=n%2===0;f.cleared=false;f.rivalCleared=false;
      r.active=d>45&&n%6===2;r.x=corridor(d)+((n%4)-1.5)*1.5;r.d=d;r.cleared=false;
    }
  }
  reset(seed){this.randState=seed>>>0;this.nextId=0;this.nextStart=-C.rowsPerBlock*C.rowStep;
    for(let i=0;i<this.blocks.length;i++){this.fill(this.blocks[i],this.nextStart);this.nextStart+=C.rowsPerBlock*C.rowStep;}}
  update(distance){for(let i=0;i<this.blocks.length;i++)if(this.blocks[i].end+8<distance-78){this.fill(this.blocks[i],this.nextStart);this.nextStart+=C.rowsPerBlock*C.rowStep;}}
  validate(){
    for(let b=0;b<this.blocks.length;b++)for(let i=0;i<this.blocks[b].items.length;i++){
      const o=this.blocks[b].items[i];if(o.active&&Math.abs(o.x)<C.halfWidth&&Math.abs(o.x-corridor(o.d))<=C.safeHalf+o.r+.39)return false;
    }return true;
  }
}
