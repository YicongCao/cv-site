import {test,after,before} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {server} from '../server.mjs';
let port;
before(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));port=server.address().port;});
after(()=>new Promise(r=>server.close(r)));
function request(path,options={}){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path,...options},res=>{let chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});r.on('error',reject);r.end();});}
test('GET/HEAD, content types and all static-only boundaries',async()=>{
 let r=await request('/');assert.equal(r.status,200);assert.match(r.body.toString(),/pixelcao/);
 r=await request('/',{method:'HEAD'});assert.equal(r.status,200);assert.equal(r.body.length,0);
 for(const p of ['/missing','/src/app.js','/design/source-ledger.json','/media/'])assert.equal((await request(p)).status,404,p);
 for(const p of ['/../AGENTS.md','/%2e%2e/AGENTS.md','/%2eenv','/foo%5cbar','/%00'])assert.equal((await request(p)).status,403,p);
 assert.equal((await request('/%zz')).status,400);assert.equal((await request('/',{method:'POST'})).status,405);
 assert.match((await request('/resume/')).headers['content-type'],/text\/html/);
});
test('video range seeking, suffix, HEAD and invalid ranges',async()=>{
 const url='/media/originals/videos/a144.mp4';let r=await request(url,{headers:{Range:'bytes=0-31'}});
 assert.equal(r.status,206);assert.equal(r.body.length,32);assert.equal(r.headers['content-range'],'bytes 0-31/49289857');assert.equal(r.headers['content-type'],'video/mp4');
 r=await request(url,{headers:{Range:'bytes=-16'}});assert.equal(r.body.length,16);
 r=await request(url,{method:'HEAD',headers:{Range:'bytes=32-63'}});assert.equal(r.status,206);assert.equal(r.body.length,0);assert.equal(r.headers['content-length'],'32');
 for(const Range of ['bytes=999999999-','bytes=2-1','bytes=0-1,2-3','bytes=-0','bytes=-'])assert.equal((await request(url,{headers:{Range}})).status,416,Range);
});
test('original background music is served locally with audio MIME and range support',async()=>{
 let r=await request('/audio/quiet-islands.mp3',{method:'HEAD'});assert.equal(r.status,200);assert.equal(r.headers['content-type'],'audio/mpeg');assert.ok(Number(r.headers['content-length'])>100000);
 r=await request('/audio/quiet-islands.mp3',{headers:{Range:'bytes=0-31'}});assert.equal(r.status,206);assert.equal(r.body.length,32);
});
