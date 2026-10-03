import { build } from 'esbuild';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
await mkdir('dist/extension',{recursive:true});
await build({entryPoints:['src/extension/content.ts','src/extension/background.ts','src/extension/options.ts'],outdir:'dist/extension',bundle:true,format:'iife',target:'chrome120'});
for (const file of ['options.html','options.css']) await copyFile(`src/extension/${file}`,`dist/extension/${file}`);
await writeFile('dist/extension/manifest.json',JSON.stringify({manifest_version:3,name:'디시 공동 보스 레이드',version:'0.1.0',description:'지정 게시글에서 함께 도전하는 하루 보스',permissions:['storage'],host_permissions:['https://gall.dcinside.com/*'],optional_host_permissions:['https://*/*','http://localhost/*'],background:{service_worker:'background.js'},options_page:'options.html',action:{default_title:'레이드 설정'},content_scripts:[{matches:['https://gall.dcinside.com/*'],js:['content.js'],run_at:'document_idle'}]},null,2));
console.log('Extension built: dist/extension');
