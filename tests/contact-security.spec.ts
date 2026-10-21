import {test,expect} from '@playwright/test';
import {createContactHandler,AREAS} from '../supabase/functions/submit-contact/handler';
import {CONTACT_AREAS} from '../src/data/contact-areas';
import {contactSchema} from '../src/lib/contact-schema';
const config={origins:['https://site.example'],secret:'test-secret',serviceKey:'server-test-only',hashSecret:'test-only-hmac-secret',supabaseUrl:'https://database.example'};
const valid={name:'Pessoa Teste',email:'teste@example.com',phone:'11999999999',message:'Mensagem para testar o fluxo seguro.',area_of_activity:'Psicologia',area_of_activity_other:'',turnstileToken:'proof-token',website:''};
const request=(body:unknown,origin='https://site.example')=>new Request('https://edge.example/submit-contact',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
test('area validation and server/client taxonomy agree',()=>{
  expect(AREAS).toEqual([...CONTACT_AREAS]);expect(contactSchema.safeParse({...valid,area_of_activity:''}).success).toBe(false);expect(contactSchema.safeParse({...valid,area_of_activity:'Outros'}).success).toBe(false);expect(contactSchema.safeParse({...valid,area_of_activity:'Outros',area_of_activity_other:'Pesquisa editorial'}).success).toBe(true);
});
test('server enforces origin, proof, hostname, action and generic errors',async()=>{
  let calls=0,proof:Record<string,unknown>={success:true,action:'contact_submit',hostname:'site.example'};
  const transport:typeof fetch=async(_input,init)=>{calls++;if(calls%2===1)return Response.json(proof);const payload=JSON.parse(String(init?.body));expect(payload.p_identity_hash).toMatch(/^[a-f0-9]{64}$/);expect(payload.p_token_hash).toMatch(/^[a-f0-9]{64}$/);expect(payload).not.toHaveProperty('turnstileToken');return new Response(null,{status:204});};
  const handler=createContactHandler(config,transport);
  expect((await handler(request(valid,'https://evil.example'))).status).toBe(403);expect(calls).toBe(0);
  expect((await handler(request({...valid,turnstileToken:''}))).status).toBe(400);expect(calls).toBe(0);
  expect((await handler(request(valid))).status).toBe(201);expect(calls).toBe(2);
  for(const invalid of [{success:false},{success:true,hostname:'evil.example',action:'contact_submit'},{success:true,hostname:'site.example',action:'login'}]){proof=invalid;calls=0;expect((await handler(request(valid))).status).toBe(400);expect(calls).toBe(1);}
  const broken=createContactHandler(config,async()=>{throw new Error('private key/internal database trace');});const response=await broken(request(valid));expect(response.status).toBe(503);expect(await response.text()).not.toContain('private');
});
test('server limits body size, denies honeypot and handles preflight without wildcard CORS',async()=>{
  let called=false;const handler=createContactHandler(config,async()=>{called=true;return new Response(null,{status:500});});
  expect((await handler(request({...valid,website:'spam.example'}))).status).toBe(400);expect((await handler(request({...valid,message:'a'.repeat(21000)}))).status).toBe(413);expect(called).toBe(false);
  const response=await handler(new Request('https://edge.example',{method:'OPTIONS',headers:{origin:'https://site.example'}}));expect(response.status).toBe(204);expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://site.example');
  const unavailable=await createContactHandler({...config,secret:''})(request(valid));expect(unavailable.status).toBe(503);
});

