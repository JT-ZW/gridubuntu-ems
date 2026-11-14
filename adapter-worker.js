import { writeFileSync } from 'node:fs';
import { build } from 'esbuild';

// Small SvelteKit adapter for the Worker ESM + dist/client format used by Sites.
export default function adapter() {
 return {
  name: 'gridubuntu-worker',
  supports: { read: () => false },
  async adapt(builder) {
   const temp = builder.getBuildDirectory('gridubuntu-worker');
   builder.rimraf(temp); builder.mkdirp(temp);
   builder.rimraf('dist'); builder.mkdirp('dist/server');
   builder.writeClient('dist/client'); builder.writePrerendered('dist/client');
   builder.writeServer(`${temp}/app`);
   writeFileSync(`${temp}/manifest.js`, `export const manifest = ${builder.generateManifest({relativePath:'./app'})};`);
   writeFileSync(`${temp}/worker.js`, `
import { Server } from './app/index.js';
import { manifest } from './manifest.js';
const server = new Server(manifest);
let initialized;
export default {
 async fetch(request, env, context) {
  if (!initialized) initialized = server.init({env});
  await initialized;
  const pathname = new URL(request.url).pathname;
  if (env.ASSETS && (manifest.assets.has(pathname.slice(1)) || pathname.startsWith('/_app/') || manifest._.prerendered_routes.has(pathname))) {
   return env.ASSETS.fetch(request);
  }
  return server.respond(request, {platform:{env,context},getClientAddress:()=>request.headers.get('CF-Connecting-IP') || 'unknown'});
 }
};`);
   await build({entryPoints:[`${temp}/worker.js`],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,conditions:['workerd','browser'],logLevel:'warning'});
  }
 };
}
