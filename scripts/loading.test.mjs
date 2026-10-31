import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {readResource} from '../src/loading.js';

test('download progress counts decoded streamed bytes even with compressed Content-Length',async()=>{
 const seen=[];
 const bytes=await readResource('/app.js',{fetcher:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1,2]));c.enqueue(new Uint8Array([3,4,5]));c.close();}}),{headers:{'Content-Length':'2','Content-Encoding':'gzip'}}),onProgress:n=>seen.push(n)});
 assert.deepEqual(seen,[2,5]);assert.deepEqual([...bytes],[1,2,3,4,5]);
});
test('HTTP and interrupted streams reject rather than reporting completion',async()=>{
 await assert.rejects(readResource('/app.js',{fetcher:async()=>new Response('',{status:503})}),/503/);
 await assert.rejects(readResource('/app.js',{fetcher:async()=>new Response(new ReadableStream({start(c){c.error(new Error('disconnected'));}}))}),/disconnected/);
});

const bundle=(await build({entryPoints:[fileURLToPath(new URL('../src/loading.js',import.meta.url))],bundle:true,format:'iife',globalName:'PixelBoot',write:false})).outputFiles[0].text;
function harness({bad=null,fontError=false}={}){
 const elements=new Map(),frames=[],timers=new Map(),scripts=[];let timerId=0;
 const el=id=>{if(!elements.has(id))elements.set(id,{id,contains(){return false;},hidden:id==='load-retry',inert:id==='app-shell',dataset:{},attrs:{},firstElementChild:{style:{}},classList:{add(){}},setAttribute(k,v){this.attrs[k]=v;}});return elements.get(id);};
 const content={app:'test app',style:'test css',data:'{"projects":[]}',gallery:'{"projects":[]}',font:'font'};
 const manifest=Object.entries(content).map(([id,body])=>({id,url:'/'+id,size:body.length}));
 const context=vm.createContext({Uint8Array,TextDecoder,AbortController,console:{error(){},warn(){}},
  setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame:fn=>frames.push(fn),addEventListener(){},removeEventListener(){},matchMedia:()=>({matches:false}),
  document:{getElementById:el,head:{append(){}},body:{append:s=>scripts.push(s)},createElement:tag=>({tag}),fonts:{add(){}}},
  FontFace:class{load(){return fontError?Promise.reject(Error('bad font')):Promise.resolve(this);}},
  fetch:async url=>new Response(content[url.slice(1)],{status:url===bad?503:200}),location:{reload(){}}});
 context.window=context;vm.runInContext(bundle,context);
 const boot=context.PixelBoot.startBoot(manifest);
 async function pump(){for(let i=0;i<8;i++){const pending=frames.splice(0);for(const fn of pending)fn();await new Promise(setImmediate);}}
 return {boot,pump,el,timers,scripts,frames};
}
test('the app stays inert until its first rendered frame explicitly completes startup',async()=>{
 const h=harness();assert.equal(h.scripts.length,0);assert.equal(h.el('app-shell').inert,true);
 await h.pump();assert.equal(h.scripts.length,1);assert.equal(h.el('site-loader').dataset.phase,'render');
 assert.equal(h.el('load-progress').attrs['aria-valuenow'],'97');assert.equal(h.el('app-shell').inert,true);
 const completion=h.boot.complete();await h.pump();assert.equal(await completion,true);
 assert.equal(h.el('load-progress').attrs['aria-valuenow'],'100');assert.equal(h.el('app-shell').inert,false);
 assert(![...h.timers.values()].some(t=>t.ms===45000));
});
test('failed resources and startup timeout keep progress below 100 and offer recovery',async()=>{
 for(const bad of ['/app','/data','/style']){const h=harness({bad});await h.pump();assert.equal(h.el('site-loader').dataset.phase,'error');assert.equal(h.el('load-retry').hidden,false);assert.equal(h.el('app-shell').inert,true);assert.notEqual(h.el('load-progress').attrs['aria-valuenow'],'100');assert.equal(await h.boot.complete(),false);assert.equal(h.scripts.length,0);}
 const h=harness();await h.pump();[...h.timers.values()].find(t=>t.ms===45000).fn();assert.equal(h.el('site-loader').dataset.phase,'error');assert.equal(await h.boot.complete(),false);
});
test('missing or invalid fonts retain access through the fallback typeface',async()=>{
 for(const opts of [{bad:'/font'},{fontError:true}]){const h=harness(opts);await h.pump();assert.equal(h.el('site-loader').dataset.phase,'render');assert.equal(h.scripts.length,1);const completion=h.boot.complete();await h.pump();assert.equal(await completion,true);}
});
