export const ACTION=Object.freeze({ LEFT:0, RIGHT:1, BRAKE:2, DOWN:3, TURBO:4 });
const MAP={ArrowLeft:0,KeyA:0,ArrowRight:1,KeyD:1,ArrowUp:2,KeyW:2,ArrowDown:3,KeyS:3,KeyF:4,ShiftLeft:4,ShiftRight:4,Space:4};
const TOUCH={left:0,right:1,brake:2,turbo:4};
export class InputManager {
  constructor({onCommand,onBlur,isPlaying}){
    this.keys=Object.create(null);this.counts=new Uint8Array(5);this.touchCounts=new Uint8Array(5);
    this.gamepadCounts=new Uint8Array(5);this.gamepadPrevButtons=[];
    this.pointerIds=new Int32Array(16);this.pointerIds.fill(-1);this.pointerActions=new Int8Array(16);
    this.buttons=Array.from(document.querySelectorAll('[data-action]'));this.onCommand=onCommand;
    this.onBlur=onBlur;this.isPlaying=isPlaying;this.abort=new AbortController();const signal=this.abort.signal;
    window.addEventListener('keydown',e=>this.keyDown(e),{signal});
    window.addEventListener('keyup',e=>this.keyUp(e),{signal});
    window.addEventListener('blur',()=>{this.clear();this.onBlur();},{signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){this.clear();this.onBlur();}},{signal});
    for(const b of this.buttons){
      b.addEventListener('pointerdown',e=>{
        e.preventDefault();if(!this.isPlaying())return;
        for(let i=0;i<16;i++)if(this.pointerIds[i]===-1){this.pointerIds[i]=e.pointerId;this.pointerActions[i]=TOUCH[b.dataset.action];this.touchCounts[this.pointerActions[i]]++;b.setPointerCapture(e.pointerId);b.classList.add('held');break;}
      },{signal});
      const release=e=>{for(let i=0;i<16;i++)if(this.pointerIds[i]===e.pointerId){this.touchCounts[this.pointerActions[i]]--;this.pointerIds[i]=-1;break;}if(!this.touchCounts[TOUCH[b.dataset.action]])b.classList.remove('held');};
      b.addEventListener('pointerup',release,{signal});b.addEventListener('pointercancel',release,{signal});b.addEventListener('lostpointercapture',release,{signal});
    }
  }
  poll(){
    if(typeof navigator==='undefined'||!navigator.getGamepads)return;
    const gamepads=navigator.getGamepads();
    if(!gamepads)return;
    let gpLeft=false,gpRight=false,gpBrake=false,gpDown=false,gpTurbo=false;
    for(let i=0;i<gamepads.length;i++){
      const gp=gamepads[i];
      if(!gp||!gp.connected)continue;
      const b=gp.buttons;
      const btn=idx=>b&&b[idx]&&(b[idx].pressed||b[idx].value>0.2);
      const prev=this.gamepadPrevButtons[i]||[];
      const btnJustPressed=idx=>btn(idx)&&!prev[idx];

      const ax0=gp.axes&&gp.axes[0]!==undefined?gp.axes[0]:0;
      const ax1=gp.axes&&gp.axes[1]!==undefined?gp.axes[1]:0;

      if(ax0<-0.28||btn(14))gpLeft=true;
      if(ax0>0.28||btn(15))gpRight=true;
      if(ax1<-0.35||btn(12)||btn(6)||btn(4)||btn(1))gpBrake=true;
      if(ax1>0.35||btn(13))gpDown=true;
      if(btn(7)||btn(5)||btn(0))gpTurbo=true;

      if(btnJustPressed(9))this.onCommand('pause');
      if(btnJustPressed(0)&&!this.isPlaying())this.onCommand('start');
      if(btnJustPressed(2))this.onCommand('autopilot');
      if(btnJustPressed(3))this.onCommand('restart');
      if(btnJustPressed(8))this.onCommand('debug');

      if(!this.gamepadPrevButtons[i])this.gamepadPrevButtons[i]=[];
      if(b){for(let k=0;k<b.length;k++)this.gamepadPrevButtons[i][k]=!!btn(k);}
    }
    this.gamepadCounts[0]=gpLeft?1:0;
    this.gamepadCounts[1]=gpRight?1:0;
    this.gamepadCounts[2]=gpBrake?1:0;
    this.gamepadCounts[3]=gpDown?1:0;
    this.gamepadCounts[4]=gpTurbo?1:0;
  }
  keyDown(e){
    if(e.target instanceof Element&&e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
    const a=MAP[e.code];if(a!==undefined||e.code==='Escape'||e.code==='F2'||e.code==='Tab')e.preventDefault();
    if(e.repeat||this.keys[e.code])return;this.keys[e.code]=true;if(a!==undefined)this.counts[a]++;
    switch(e.code){
      case 'Enter':this.onCommand('start');break;
      case 'KeyR':this.onCommand('restart');break;
      case 'Escape':this.onCommand('pause');break;
      case 'F2':case 'Backquote':this.onCommand('debug');break;
      case 'KeyT':case 'Tab':this.onCommand('autopilot');break;
    }
  }
  keyUp(e){if(!this.keys[e.code])return;this.keys[e.code]=false;const a=MAP[e.code];if(a!==undefined&&this.counts[a])this.counts[a]--;}
  held(action){this.poll();return this.counts[action]>0||this.touchCounts[action]>0||this.gamepadCounts[action]>0;}
  clear(){for(const k in this.keys)this.keys[k]=false;this.counts.fill(0);this.touchCounts.fill(0);this.gamepadCounts.fill(0);this.pointerIds.fill(-1);for(let i=0;i<this.buttons.length;i++)this.buttons[i].classList.remove('held');}
  dispose(){this.clear();this.abort.abort();}
}
