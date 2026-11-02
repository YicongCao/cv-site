import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {preferredLanguage,languageDestination} from '../src/locale.js';
import {localizeData,localizeHtml,translate} from './localize.mjs';
const origin='https://cv.yicong.me';

test('browser languages: Chinese variants, preference order and English fallback',()=>{
  for(const locale of ['zh-CN','zh-TW','zh-Hant','zh-HK','zh'])assert.equal(preferredLanguage([locale]),'zh');
  assert.equal(preferredLanguage(['en-GB','zh-CN']),'en');
  assert.equal(preferredLanguage(['fr-FR','zh-CN']),'zh');
  for(const languages of [[],['ja-JP'],['de-DE','fr-FR']])assert.equal(preferredLanguage(languages),'en');
});
test('manual choice wins; shared English URLs are stable; queries and project anchors survive',()=>{
  assert.equal(languageDestination(origin+'/?bootdebug#museum','en',['zh']).url,origin+'/en/?bootdebug#museum');
  assert.equal(languageDestination(origin+'/en/?lang=zh#museum','en',['en']).url,origin+'/?lang=zh#museum');
  assert.equal(languageDestination(origin+'/en/','zh',['zh']).language,'en');
  assert.equal(languageDestination(origin+'/resume/',null,['en']).url,origin+'/en/resume/');
  assert.equal(languageDestination(origin+'/?lang=invalid','bad',['zh']).language,'zh');
  const first=languageDestination(origin+'/?lang=en#brushline',null,['zh']);
  assert.equal(languageDestination(first.url,'en',['zh']).url,first.url);
});
test('blocked storage still selects a language without throwing',async()=>{
  const source=(await readFile(new URL('../src/locale.js',import.meta.url),'utf8')).replaceAll('export ','');
  let redirected;
  vm.runInNewContext(source+'\nstartLocale();',{
    URL,navigator:{languages:['en-US']},localStorage:{getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}},
    location:{href:origin+'/?lang=en',replace(url){redirected=url;}},window:{},document:{}
  });
  assert.equal(redirected,origin+'/en/?lang=en');
});
test('translations preserve source URLs and use complete phrases first',()=>{
  const data={id:'museum',title:'项目画廊',src:'/media/项目画廊.jpg',original:'/作品.png',url:'https://example.com/作品',workflow:[{title:'我的工作'}]};
  const translated=localizeData(data);
  assert.equal(translated.title,'Project Gallery');
  assert.equal(translated.src,data.src);assert.equal(translated.original,data.original);assert.equal(translated.url,data.url);
  assert.equal(localizeHtml('<html lang="zh-CN"><a href="/media/作品.jpg">查看完整简历</a>'),'<html lang="en"><a href="/media/作品.jpg">view the full resume</a>');
  assert(!/[\p{Script=Han}]/u.test(translate('请启用 JavaScript 浏览作品展厅，或查看完整简历')));
});
test('built English app, copy and resume are localized, with media identities unchanged',async()=>{
  const read=path=>readFile(new URL('../dist/'+path,import.meta.url),'utf8');
  const zh=JSON.parse(await read('data/portfolio.json')),en=JSON.parse(await read('en/data/portfolio.json'));
  assert.equal(en.projects.length,zh.projects.length);assert.equal(en.assets.length,zh.assets.length);
  for(let i=0;i<zh.assets.length;i++)for(const key of ['id','src','original','preview'])assert.equal(en.assets[i][key],zh.assets[i][key]);
  for(const asset of en.assets)for(const field of ['title','chapter'])assert(!/\p{Script=Han}/u.test(asset[field]||''),asset.id+': '+field);
  for(const project of en.projects)for(const field of ['title','summary','period','contributions','workflow'])assert(!/\p{Script=Han}/u.test(JSON.stringify(project[field])),project.id+': '+field);
  const app=(await read('en/app.js')).replace(/\\u([\da-f]{4})/gi,(_,code)=>String.fromCharCode(parseInt(code,16)));
  assert(!/\p{Script=Han}/u.test(app),'English application contains untranslated text');
  for(const page of ['en/index.html','en/resume/index.html']){
    const html=await read(page);assert(html.includes('lang="en"'));assert(html.includes('data-language="zh"'));
    const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).join('').replace(/\\u([\da-f]{4})/gi,(_,code)=>String.fromCharCode(parseInt(code,16)));
    assert(!/\p{Script=Han}/u.test(scripts),'Untranslated inline script: '+page);
    const visible=html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]+>/g,'').replaceAll('中','');
    assert(!/\p{Script=Han}/u.test(visible),'Untranslated visible text: '+page);
  }
});
