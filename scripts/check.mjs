import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const content=JSON.parse(fs.readFileSync('content.json','utf8'));
const pages=['','about','experience','projects','skills','education',...content.projects.map(p=>'projects/'+p.slug)];
for(const page of pages){const file=path.join(root,page,'index.html');const html=fs.readFileSync(file,'utf8');if(html.includes('127.0.0.1:3000')||html.includes('Rayyan Haider'))throw Error('Unexpected reference content: '+page);if(!html.includes('/portfolio/pages-runtime.js'))throw Error('Missing static transport: '+page);}
console.log('Verified '+pages.length+' GitHub Pages routes.');
