import {build} from 'esbuild';
import {cp,rm,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {localizeData,localizeHtml,englishSourcePlugin,languageLinks,languageStyle} from './localize.mjs';
process.chdir(fileURLToPath(new URL('..',import.meta.url)));
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
await cp('public','dist',{recursive:true});
const localeBoot = await build({entryPoints:['src/locale.js'],bundle:true,minify:true,format:'iife',globalName:'PixelLocale',write:false,footer:{js:'PixelLocale.startLocale();'}});
const localeScript = `<script>${localeBoot.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`;
for (const language of ['zh','en']) {
  const prefix = language === 'en' ? '/en' : '';
  const dir = 'dist'+prefix;
  const plugins = language === 'en' ? [englishSourcePlugin] : [];
  await mkdir(dir+'/data',{recursive:true});
  await cp('src/style.css',dir+'/style.css');
  if (language === 'en') for (const name of ['portfolio','gallery']) {
    const data = JSON.parse(await readFile(`public/data/${name}.json`,'utf8'));
    await writeFile(`${dir}/data/${name}.json`,JSON.stringify(localizeData(data)));
  }
  await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'iife',outfile:dir+'/app.js',plugins});
  const entries=[['app',prefix+'/app.js'],['style',prefix+'/style.css'],['data',prefix+'/data/portfolio.json'],['gallery',prefix+'/data/gallery.json'],['font','/fonts/ark-pixel/ark-pixel-12px-proportional-zh_hans.otf.woff2']];
  const manifest=await Promise.all(entries.map(async([id,url])=>{const bytes=await readFile('dist'+url);return {id,url:url+'?v='+createHash('sha256').update(bytes).digest('hex').slice(0,12),size:bytes.length};}));
  const loader=await build({entryPoints:['src/loading.js'],bundle:true,minify:true,format:'iife',globalName:'PixelBoot',write:false,plugins,footer:{js:`if(!window.__cvLocaleRedirecting)PixelBoot.startBoot(${JSON.stringify(manifest)});`}});
  let html = await readFile('src/index.html','utf8');
  if (language === 'en') html = localizeHtml(html);
  html=html.replace('<head>','<head>'+localeScript).replace('</header>',languageLinks(language)+'</header>')
    .replace('/* BOOT_STYLE */',(await readFile('src/loading.css','utf8'))+languageStyle)
    .replace('/* BOOT_SCRIPT */',loader.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
  await writeFile(dir+'/index.html',html);
  let resume=await readFile('public/resume/index.html','utf8');
  if(language==='en')resume=localizeHtml(resume);
  resume=resume.replace('<head>','<head>'+localeScript).replace('</head>',`<style>${languageStyle}</style></head>`).replace('<main class="resume">','<main class="resume">'+languageLinks(language,true));
  await mkdir(dir+'/resume',{recursive:true});
  await writeFile(dir+'/resume/index.html',resume);
}
console.log('Built Chinese and English pages in dist/ with shared media');
