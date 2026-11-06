// Original 16 × 16 silhouettes; geometry stays crisp at integer scales.
const paths={
 noartfps:'M6 0h4v3H6zM0 6h3v4H0zm13 0h3v4h-3zM6 13h4v3H6zM4 3h8v1h1v8h-1v1H4v-1H3V4h1zm1 2v6h6V5zm2 2h2v2H7z',
 'km-compiler':'M1 1h10v2h3v12H1zm2 2v10h9V5h-3V3zm1 3h4v1H4zm0 3h6v1H4zm0 3h3v1H4z',
 'km-bot':'M1 2h5v1h4V2h5v12h-5v1H6v-1H1zm2 2v8h3v1h1V5H6V4zm6 1v8h1v-1h3V4h-3zM11 0h2v1h2v2h-2v2h-2V3H9V1h2z',
 'km-network':'M6 0h4v4H6zm1 5h2v2h5v3h-2V9H4v1H2V7h5zM0 11h6v5H0zm2 2v1h2v-1zm8-2h6v5h-6zm2 2v1h2v-1z',
 agent:'M3 4h4V2h2v2h4v2h2v7h-2v2H3v-2H1V6h2zm1 3v3h2V7zm6 0v3h2V7zM5 12v1h6v-1z',
 game:'M3 4h10v2h2v7h-3v-2H4v2H1V6h2zm2 2v2H3v2h2v2h2v-2h2V8H7V6zm6 1v2h2V7z',
 screen:'M1 2h14v10H9v2h3v1H4v-1h3v-2H1zm2 2v6h10V4z',
 compass:'M7 0h2v2h3v2h2v3h2v2h-2v3h-2v2H9v2H7v-2H4v-2H2V9H0V7h2V4h2V2h3zm3 5H8v2H6v4h2V9h2z',
 school:'M0 5l8-4 8 4-8 4zm3 4 5 2 5-2v4l-5 2-5-2zm11-2h2v6h-2z',
 github:'M4 1h3v2h2V1h3v2h2v7h-2v2h-1v4H9v-4H7v4H5v-2H2v-2H0v-2h2v2h3v-1H3V9H2V4h2z',
 phone:'M2 1h4v4H4v3h2v2h2v2h3v-2h4v4h-2v2H9v-2H6v-2H4v-2H2V7H0V3h2z',
 route:'M1 1h5v5H1zm9 9h5v5h-5zM8 2h5v2H8zm3 2h2v4h-2zM3 8h2v4h3v2H3z',
 brushline:'M3 5h8v2h2v2h2v5h-2v2h-2v-2H5v2H3v-2H1V9h2zm2 2v3h6V7zM3 11v1h2v-1zm8 0v1h2v-1zM1 0h2v3H1zm3 0h2v2H4zm3 0h2v2H7z',
 museum:'M0 2h13v11H0zm2 2v7h9V4zm1 5 2-3h2v2h2v2H3zM9 5h1v1H9zm5-1h2v12H3v-2h11z',
 nex:'M0 2h14v12H0zm2 2v8h10V4zm1 1h2v1h1v2H5v1H3V8h1V6H3zm4 4h3v1H7zM13 0h1v1h1v1h1v1h-2V2h-1z',
 pgos:'M1 0h6v5H1zm1 2v1h1V2zm6-2h6v5H8zm1 2v1h1V2zM4 6h1v2h6V6h1v3H9v2h4v5H7v-5h1V9H4zM8 13v1h1v-1zM0 11h5v5H0zm1 2v1h1v-1z',
 cloudgame:'M0 1h16v11H9v2h3v2H4v-2h3v-2H0zm2 2v7h12V3zm1 1h1v4H3zm9 1h1v4h-1zM7 6h2v2H7z',
 accelerator:'M5 0h6v1h2v2h2v2h1v6h-1v2h-2v2h-2v1H5v-1H3v-2H1v-2H0V5h1V3h2V1h2zm1 2v2H4v2H2v1h4v2H2v2h2v2h2v1h1V9h2v5h1v-1h2v-2h2V9H9V7h5V6h-2V4h-2V2z',
 desktop:'M0 1h11v10H7v2h3v2H1v-2h4v-2H0zm2 2v6h7V3zm10 3h4v10h-4zm1 2v5h2V8z',
 cleaner:'M6 0h5v2H9v4h4v2h2v7H1V8h2V6h4V2H6zM4 8v4H3v1h10v-1h-1V8zm2 1h1v3H6zm3 0h1v3H9z',
 win10:'M0 3h6v5H0zm8-2h8v7H8zM0 10h6v4H0zm8 0h8v6H8z',
 uwp:'M0 1h16v14H0zm2 2v10h12V3zm1 1h3v3H3zm5 0h5v1H8zm0 2h4v1H8zM3 9h10v1H3zm0 2h8v1H3z',
 reader:'M0 2h6v1h4V2h6v12h-6v1H6v-1H0zm2 2v8h4v1h1V5H6V4zm7 1v8h1v-1h4V4h-4v1z',
 ishowfx:'M1 0h11v2H3v8H1zm3 3h11v11H4zm2 2v7h7V5zm1 5 2-3h1v2h2v2H7zM0 12h2v2h2v2H0z',
 xidian:'M5 0h6v2h2v2h-2v8h4v4H1v-4h4V4H3V2h2zm2 3v4h2V3zm0 6v3h2V9zM3 14v1h10v-1z',
 protocol:'M0 3h5v2h2v6H5v2H0zm2 2v6h2V5zm7-2h2v2h5v8h-5v2H9v-4H8V7h1zm3 4v4h2V7z',
 layers:'M0 0h12v12H0zm2 2v8h8V2zm2 1h4v1H4zm0 3h4v1H4zm0 3h3v1H4zm9-6h2v12H3v-2h10z',
 shield:'M2 1h12v8h-2v3h-2v2H6v-2H4V9H2zm2 2v5h2v3h2v1h1v-1h1V8h2V3zm2 3h2v2h1V6h2v3H9v2H7V9H6z',
 chart:'M0 1h2v12h14v2H0zm4 7h2v3H4zm4-3h2v6H8zm4-4h2v10h-2z',
 rules:'M0 3h3V1h3v2h10v2H6v2H3V5H0zm0 8h10V9h3v2h3v2h-3v2h-3v-2H0z',
 cloud:'M5 1h6v2h2v3h2v2h1v5H0V8h1V6h3V3h1zm1 2v4H3v2H2v2h12V9h-3V5H9V3z',
 input:'M2 0h2v2h2v2h2v2h2v2h2v2H8v2h2v3H7v-3H5v2H2z'
};
export function icon(name){return `<svg class="pixel-icon" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" fill-rule="evenodd" d="${paths[name]||paths.compass}"/></svg>`;}
export function projectIcon(id){return icon(id==='bot'?'agent':id);}
export function hasIcon(name){return Object.hasOwn(paths,name);}
