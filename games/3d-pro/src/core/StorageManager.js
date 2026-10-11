export class StorageManager {
  constructor(prefix='snow_escape_'){this.prefix=prefix;this.memory=new Map();}
  get(key,fallback){try{return localStorage.getItem(this.prefix+key)??this.memory.get(key)??fallback;}catch{return this.memory.get(key)??fallback;}}
  set(key,value){const s=String(value);this.memory.set(key,s);try{localStorage.setItem(this.prefix+key,s);}catch{/* Private mode/quota: memory fallback. */}}
  record(mode){const n=Number(this.get('hi_'+mode,0));return Number.isFinite(n)?Math.max(0,Math.floor(n)):0;}
  saveRecord(mode,distance){const n=Number.isFinite(distance)?Math.max(0,Math.floor(distance)):0;const previous=this.record(mode);if(n>previous)this.set('hi_'+mode,n);return n>previous;}
}
