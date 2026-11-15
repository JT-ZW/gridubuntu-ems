import vercel from '@sveltejs/adapter-vercel';
import worker from './adapter-worker.js';
// Vercel and Linux CI use the official adapter. Windows local builds retain
// the portable Worker output because Vercel's route aliases require symlinks.
const localWindows=process.platform==='win32'&&process.env.VERCEL!=='1'&&process.env.DEPLOY_TARGET!=='vercel';
const adapter=process.env.DEPLOY_TARGET==='worker'||localWindows?worker():vercel({runtime:'nodejs24.x',maxDuration:120});
export default {kit:{adapter,prerender:{entries:['/','/product','/impact','/about','/team','/contact']}}};
