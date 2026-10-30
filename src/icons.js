// Original 16 × 16 silhouettes; geometry stays crisp at integer scales.
const paths={
 agent:'M3 4h4V2h2v2h4v2h2v7h-2v2H3v-2H1V6h2zm1 3v3h2V7zm6 0v3h2V7zM5 12v1h6v-1z',
 game:'M3 4h10v2h2v7h-3v-2H4v2H1V6h2zm2 2v2H3v2h2v2h2v-2h2V8H7V6zm6 1v2h2V7z',
 screen:'M1 2h14v10H9v2h3v1H4v-1h3v-2H1zm2 2v6h10V4z',
 compass:'M7 0h2v2h3v2h2v3h2v2h-2v3h-2v2H9v2H7v-2H4v-2H2V9H0V7h2V4h2V2h3zm3 5H8v2H6v4h2V9h2z',
 school:'M0 5l8-4 8 4-8 4zm3 4 5 2 5-2v4l-5 2-5-2zm11-2h2v6h-2z',
 github:'M4 1h3v2h2V1h3v2h2v7h-2v2h-1v4H9v-4H7v4H5v-2H2v-2H0v-2h2v2h3v-1H3V9H2V4h2z',
 phone:'M2 1h4v4H4v3h2v2h2v2h3v-2h4v4h-2v2H9v-2H6v-2H4v-2H2V7H0V3h2z',
 route:'M1 1h5v5H1zm9 9h5v5h-5zM8 2h5v2H8zm3 2h2v4h-2zM3 8h2v4h3v2H3z'
};
export function icon(name){return `<svg class="pixel-icon" viewBox="0 0 16 16" aria-hidden="true" shape-rendering="crispEdges"><path fill="currentColor" fill-rule="evenodd" d="${paths[name]||paths.compass}"/></svg>`;}
