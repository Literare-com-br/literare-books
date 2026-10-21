import {test,expect} from '@playwright/test';
test.describe.configure({mode:'parallel'});
for(const width of [320,375,430,768,1024,1440,1920]){
 test(`editorial process and institutional numbers ${width}`,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width<768?812:1000});await page.goto('/');
  await page.locator('#diferenciais').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
  const scene=page.locator('.journey-section');
  await expect(scene).toBeAttached();
  await expect(scene).toHaveAttribute('data-layout',width<768?'vertical':'horizontal');
  await expect(page.locator('.journey-item')).toHaveCount(7);
  await expect(page.locator('.journey-title')).toHaveText(['Avaliação de conteúdo','Reunião com Autor(a)','Criação de Capa','Preparação para revisão','Diagramação','Checklist do Editor','Envio para a gráfica']);
  await expect(page.locator('.journey-number')).toHaveText(['01','02','03','04','05','06','07']);
  await expect(page.locator('#editorial-process-title')).toHaveText('Nosso processo editorial.');
  await expect(page.locator('.journey-date,.journey-description,.journey-notice')).toHaveCount(0);
  if(width<768){
   const bounds=await page.locator('.journey-item').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
   for(let i=1;i<bounds.length;i++){expect(bounds[i].top).toBeGreaterThan(bounds[i-1].bottom-1);expect(bounds[i].left).toBe(bounds[0].left)}
  }
  await scene.evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top+el.getBoundingClientRect().height-innerHeight+50,behavior:'instant'}));
  await expect.poll(()=>page.locator('.journey-line').evaluate(el=>{const m=new DOMMatrix(getComputedStyle(el).transform);return innerWidth<768?m.m22:m.m11})).toBeGreaterThan(.98);
  await expect.poll(()=>page.locator('.journey-dot').last().evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m11)).toBeGreaterThan(.98);
  if(width>=768)expect(await page.locator('.journey-copy').last().evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth})).toBe(true);
  if([320,768,1440].includes(width))await page.screenshot({path:`qa-results/editorial-process-${width}.png`});
  await page.locator('.metrics').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-100,behavior:'instant'}));
  if(width<768)await page.locator('.metric-value').last().scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(page.locator('.metric-value')).toHaveText(['+1.000','+200 mil','+200 milhões']);
  await expect(page.locator('.metrics-grid p .sr-only')).toHaveText(['Livros publicados','Páginas diagramadas','Caracteres revisados']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if([320,768,1440].includes(width)){
   await expect(page.locator('.metrics-grid p .blur-reveal').first()).toHaveAttribute('data-reveal','done');
   await page.screenshot({path:`qa-results/metrics-${width}.png`});
  }
  expect(errors).toEqual([]);
 });
}

test('text accessibility, viewport activation and reduced motion',async({page})=>{
 await page.goto('/');await expect(page.locator('.hero-kicker .blur-reveal')).toHaveAttribute('data-reveal','done');
 await expect(page.getByRole('heading',{level:1})).toHaveAccessibleName('Onde grandes histórias ganham vida.');
 await page.locator('#sobre').scrollIntoViewIfNeeded();await expect(page.locator('#sobre p .blur-reveal').first()).toHaveAttribute('data-reveal','done');
 await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
 await page.locator('#diferenciais').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));await expect(page.locator('.journey-section')).toHaveClass(/is-still/);
 await expect(page.locator('.journey-title').first()).toHaveCSS('transform','none');
});
test('phone media loads on approach, autoplays silently, loops and pauses outside the viewport',async({page})=>{
 await page.goto('/');
 expect(await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('.mp4')).length)).toBe(0);
 await page.locator('#projetos').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
 const video=page.locator('.phone-media video');
 await expect(video).toBeAttached();
 await expect.poll(()=>video.evaluate((el:HTMLVideoElement)=>!el.paused&&el.currentTime>0),{timeout:12000}).toBe(true);
 expect(await video.evaluate((el:HTMLVideoElement)=>el.muted&&el.loop&&el.playsInline&&!el.controls)).toBe(true);
 await video.evaluate((el:HTMLVideoElement)=>{el.currentTime=el.duration-.15});
 await expect.poll(()=>video.evaluate((el:HTMLVideoElement)=>el.currentTime<2&&!el.paused),{timeout:10000}).toBe(true);
 await page.locator('#contato').evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top-78,behavior:'instant'}));
 await expect.poll(()=>video.evaluate((el:HTMLVideoElement)=>el.paused)).toBe(true);
});
test('eligible text coverage and a bounded number of shared viewport observers',async({page})=>{
 await page.addInitScript(()=>{const win=window as typeof window&{observerCount:number};win.observerCount=0;const Original=win.IntersectionObserver;win.IntersectionObserver=class extends Original{constructor(callback:IntersectionObserverCallback,options?:IntersectionObserverInit){super(callback,options);win.observerCount++}}});
 await page.goto('/');
 for(const anchor of ['#servicos','#diferenciais','#projetos','#contato','footer'])await page.locator(anchor).evaluate(el=>window.scrollTo({top:scrollY+el.getBoundingClientRect().top,behavior:'instant'}));
 await expect(page.locator('.journey-section')).toBeAttached();
 const unwrapped=await page.evaluate(()=>{
  const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);const result:string[]=[];let node:Node|null;
  while((node=walker.nextNode())){const text=node.textContent?.trim()??'';const parent=node.parentElement;
   if(!parent||!/[\p{L}\p{N}]/u.test(text)||parent.closest('.blur-reveal,[data-text-animation],svg,style,script,option,textarea,[aria-hidden=true],.sr-only'))continue;
   if(parent.checkVisibility())result.push(text);
  }return result;
 });
 expect(unwrapped).toEqual([]);
 expect(await page.evaluate(()=>(window as typeof window&{observerCount:number}).observerCount)).toBeLessThan(15);
});


