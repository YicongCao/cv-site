import {projectIcon} from './icons.js';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// One source of truth: the same five articles appear on projects and KM islands.
export function resolveArticles(project,articles,assets){
 const byId=new Map((articles||[]).map(article=>[article.id,article]));
 return (project.articles||[]).map(id=>byId.get(id)).filter(Boolean).map(article=>({...article,image:assets.get(article.image)})).filter(article=>article.image&&/^https:\/\/km\.woa\.com\/articles\/show\/\d+$/.test(article.url));
}

export function articleCards(project,articles,assets){
 return resolveArticles(project,articles,assets).map(article=>`<article class="km-card" data-article="${escape(article.id)}"><a class="km-article" href="${escape(article.url)}" target="_blank" rel="noopener"><img src="${escape(article.image.src)}" width="${article.image.width}" height="${article.image.height}" alt="${escape(article.title)} · KM 文章截图" loading="lazy"><span class="km-article-title">${projectIcon({'pgos':'km-compiler','bot':'km-bot','accelerator':'km-network'}[article.project]||project.id)}<span>${escape(article.title)}</span></span><span class="km-article-link">KM ↗</span></a></article>`).join('');
}
