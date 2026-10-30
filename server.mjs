import http from 'node:http';
import {stat,realpath} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.woff2':'font/woff2','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.mov':'video/quicktime','.flv':'video/x-flv','.pdf':'application/pdf','.ico':'image/x-icon'};
export const server=http.createServer(async(req,res)=>{
  const fail=(code,message)=>{res.writeHead(code,{'Content-Type':'text/plain; charset=utf-8'});res.end(req.method==='HEAD'?'':message);};
  if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return fail(405,'Method not allowed');}
  let pathname;try{pathname=decodeURIComponent(req.url.split('?')[0]);}catch{return fail(400,'Invalid URL');}
  if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(s=>s==='..'||s.startsWith('.')))return fail(403,'Forbidden');
  let file=path.resolve(root,'.'+pathname);if(file!==path.resolve(root)&&!file.startsWith(root))return fail(403,'Forbidden');
  try{
    let info=await stat(file);if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}
    const canonical=await realpath(file);if(!canonical.startsWith(root)||!info.isFile())return fail(403,'Forbidden');
    const headers={'Content-Type':types[path.extname(file).toLowerCase()]||'application/octet-stream','Accept-Ranges':'bytes','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
    let start=0,end=info.size-1,status=200;
    if(req.headers.range){
      const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!m||(!m[1]&&!m[2])){res.setHeader('Content-Range',`bytes */${info.size}`);return fail(416,'Invalid range');}
      if(!m[1]){start=Math.max(0,info.size-Number(m[2]));}else{start=Number(m[1]);if(m[2])end=Math.min(end,Number(m[2]));}
      if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.setHeader('Content-Range',`bytes */${info.size}`);return fail(416,'Invalid range');}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD'||!info.size)return res.end();
    createReadStream(file,{start,end}).on('error',()=>res.destroy()).pipe(res);
  }catch(error){fail(error.code==='ENOENT'||error.code==='ENOTDIR'?404:500,'File unavailable');}
});
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||3000);
  if(!Number.isInteger(port)||port<1||port>65535){console.error('PORT must be 1–65535');process.exit(1);}
  server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is occupied. Stop its service or set PORT.`:e.message);process.exit(1);});
  server.listen(port,'127.0.0.1',()=>console.log(`pixelcao: http://127.0.0.1:${port}`));
}
