const preferenceKey = 'pixelcao.language';
const supported = value => value === 'zh' || value === 'en';

export function preferredLanguage(languages = []) {
  for (const language of languages) {
    const base = String(language).toLowerCase().split(/[-_]/)[0];
    if (supported(base)) return base;
  }
  return 'en';
}

export function languageDestination(href, saved, languages) {
  const url = new URL(href);
  const explicit = url.searchParams.get('lang');
  const englishPath = /^\/en(?:\/|$)/.test(url.pathname);
  const language = supported(explicit) ? explicit : englishPath ? 'en' :
    supported(saved) ? saved : preferredLanguage(languages);
  const base = url.pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  url.pathname = language === 'en' ? '/en' + (base.startsWith('/') ? base : '/' + base) : base;
  if (url.pathname === '/en') url.pathname = '/en/';
  return {language, url: url.href, explicit: supported(explicit) ? explicit : null};
}

export function startLocale() {
  let saved;
  try { saved = localStorage.getItem(preferenceKey); } catch { /* Storage is optional. */ }
  const result = languageDestination(location.href, saved, navigator.languages?.length ? navigator.languages : [navigator.language]);
  if (result.explicit) {
    try { localStorage.setItem(preferenceKey, result.explicit); } catch { /* The URL still records this choice. */ }
  }
  if (result.url !== location.href) {
    window.__cvLocaleRedirecting = true;
    location.replace(result.url);
    return;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const updateLinks = () => {
      for (const link of document.querySelectorAll('[data-language]')) {
        const url = new URL(location.href);
        url.searchParams.set('lang', link.dataset.language);
        link.href = languageDestination(url.href, null, []).url;
      }
    };
    updateLinks();
    window.addEventListener('hashchange', updateLinks);
  }, {once: true});
}
