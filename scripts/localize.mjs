import {readFile} from 'node:fs/promises';
const dictionary = JSON.parse(await readFile(new URL('../src/locales/en.json', import.meta.url), 'utf8'));
const escaped = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = new RegExp(Object.keys(dictionary).sort((a,b) => b.length-a.length).map(escaped).join('|'), 'g');
export const translate = text => text.replace(pattern, match => dictionary[match]);

// URLs and original file names are source references, not display copy.
const sourceFields = new Set(['id','src','original','preview','coverSrc','url','filename','path','name']);
export function localizeData(value, key = '') {
  if (typeof value === 'string') {
    if (sourceFields.has(key) || value.startsWith('/') || /^https?:/.test(value)) return value;
    const text = translate(value);
    return ['text','summary','contributions'].includes(key) ? text.replace(/^[a-z]/, c => c.toUpperCase()) : text;
  }
  if (Array.isArray(value)) return value.map(item => localizeData(item, key));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, localizeData(v,k)]));
  return value;
}

export function localizeHtml(html) {
  const urls = [];
  let localized = translate(html.replace(/\b(?:href|src|srcset)=(?:"[^"]*"|'[^']*')/g, match => `__CV_URL_${urls.push(match)-1}__`));
  localized = localized.replace(/__CV_URL_(\d+)__/g, (_,i) => urls[Number(i)]);
  return localized.replace('lang="zh-CN"','lang="en"').replaceAll('href="/resume/"','href="/en/resume/"').replaceAll('href="https://cv.yicong.me/"','href="https://cv.yicong.me/en/"');
}

export const englishSourcePlugin = {name:'english-copy', setup(build) {
  build.onLoad({filter:/\/src\/[^/]+\.js$/}, async args => {
    const source = await readFile(args.path, 'utf8');
    return {contents:translate(source).replaceAll('href="/resume/"','href="/en/resume/"'), loader:'js'};
  });
}};

export function languageLinks(language, resume = false) {
  const base = resume ? '/resume/' : '/';
  return `<nav class="language-switch" aria-label="Language"><a href="${base}?lang=zh" data-language="zh" lang="zh-CN" hreflang="zh-CN"${language === 'zh' ? ' aria-current="true"' : ''}>中</a><a href="/en${base}?lang=en" data-language="en" lang="en" hreflang="en"${language === 'en' ? ' aria-current="true"' : ''}>EN</a></nav>`;
}
export const languageStyle = `.language-switch{display:flex;align-items:center;gap:2px;flex:none;font:14px/1.2 system-ui,sans-serif}.language-switch a{display:grid;place-items:center;min-width:32px;min-height:36px;padding:4px;color:inherit;text-decoration:none;opacity:.6;border-bottom:2px solid transparent}.language-switch a:hover,.language-switch a:focus-visible{opacity:1}.language-switch a[aria-current]{opacity:1;border-color:currentColor}.resume>.language-switch{justify-content:flex-end;margin:-20px 0 12px}@media print{.language-switch{display:none}}@media(max-width:480px){header .language-switch{gap:0;font-size:12px}header .language-switch a{min-width:28px;min-height:44px;padding:2px}header .brand{width:auto;min-width:0;flex:1}header .resume-link{min-width:0}header #open-gallery,header .sound-toggle{width:36px;min-width:36px;padding:9px}.resume>.language-switch{margin:-12px 0 16px}}`;
