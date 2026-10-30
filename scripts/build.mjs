import {build} from 'esbuild';
import {cp,rm,mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
await cp('src/index.html','dist/index.html');await cp('src/style.css','dist/style.css');
await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'iife',outfile:'dist/app.js'});
console.log('Built independent dist/');
