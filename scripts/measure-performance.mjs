import fs from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
const phase=process.argv[2];
if(!['before','after'].includes(phase))throw new Error('Use before or after');
await fs.mkdir('performance/improvements',{recursive:true});
const assets=[];
for(const name of await fs.readdir('dist/assets'))if(/\.(js|css)$/.test(name)){const buffer=await fs.readFile(`dist/assets/${name}`);assets.push({name,bytes:buffer.length,gzip:gzipSync(buffer).length});}
const summary={phase,environment:'Local production preview; Supabase disabled; mobile Lighthouse defaults; one sample per route',assets,pages:[]};
const chrome=await launch({chromePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',chromeFlags:['--headless','--no-sandbox']});
try{
  for(const [name,path] of [['home','/'],['coauthors','/coautorias'],['login','/login']]){
    const {lhr}=await lighthouse(`http://127.0.0.1:4195${path}`,{port:chrome.port,onlyCategories:['performance','accessibility','seo'],logLevel:'error'},{extends:'lighthouse:default',settings:{maxWaitForLoad:35000,blockedUrlPatterns:['*supabase.co*']}});
    await fs.writeFile(`performance/improvements/${phase}-${name}.json`,JSON.stringify(lhr));
    const value={name,performance:lhr.categories.performance.score,accessibility:lhr.categories.accessibility.score,seo:lhr.categories.seo.score,FCP:lhr.audits['first-contentful-paint'].numericValue,LCP:lhr.audits['largest-contentful-paint'].numericValue,TBT:lhr.audits['total-blocking-time'].numericValue,CLS:lhr.audits['cumulative-layout-shift'].numericValue,transfer:lhr.audits['total-byte-weight'].numericValue};
    summary.pages.push(value);console.log(JSON.stringify(value));
  }
}finally{await chrome.kill();await fs.writeFile(`performance/improvements/${phase}-summary.json`,JSON.stringify(summary,null,2));}
