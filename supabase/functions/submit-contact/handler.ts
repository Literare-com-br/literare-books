// Web-standard handler, tested locally with fake transports. No SDK dependency.
export const AREAS=['Psicologia','Educação','Saúde','Administração','Direito','Tecnologia','Empreendedorismo','Recursos Humanos','Literatura','Outros'];
type Config={origins:string[];secret:string;supabaseUrl:string;serviceKey:string;hashSecret:string};
export function createContactHandler(config:Config,transport:typeof fetch=fetch) {
  return async(request:Request):Promise<Response>=>{
    const origin=request.headers.get('origin')||'',allowed=config.origins.includes(origin);
    const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
    if(allowed){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Methods']='POST, OPTIONS';headers['Access-Control-Allow-Headers']='content-type, authorization, apikey, x-client-info';}
    const reply=(status:number,sent=false)=>new Response(JSON.stringify({sent,message:sent?'Mensagem enviada.':'Não foi possível enviar. Tente novamente mais tarde.'}),{status,headers});
    if(!allowed)return reply(403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    if(request.method!=='POST')return reply(405);
    if(!config.secret||!config.serviceKey||!config.hashSecret||!config.supabaseUrl.startsWith('https://'))return reply(503);
    if(!/^application\/json\b/i.test(request.headers.get('content-type')||''))return reply(415);
    try{
      const reader=request.body?.getReader();if(!reader)return reply(400);
      const parts:Uint8Array[]=[];let size=0;
      while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>20000){await reader.cancel();return reply(413);}parts.push(value);}
      const body=new Uint8Array(size);let offset=0;for(const part of parts){body.set(part,offset);offset+=part.length;}
      const input=JSON.parse(new TextDecoder().decode(body));
      if(!input||typeof input!=='object'||Array.isArray(input))return reply(400);
      const fields=['name','email','phone','message','area_of_activity','turnstileToken'];
      if(fields.some(key=>typeof input[key]!=='string'))return reply(400);
      const {name,email,phone,message,area_of_activity:area,turnstileToken:token}=input;
      const other=typeof input.area_of_activity_other==='string'?input.area_of_activity_other.trim():'';
      if(name.trim().length<3||name.length>120||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)
        ||!/^[-+0-9 ().]{10,22}$/.test(phone)||message.trim().length<15||message.length>3000
        ||!AREAS.includes(area)||(area==='Outros'&&(other.length<3||other.length>100))
        ||(area!=='Outros'&&other!=='')||token.length<1||token.length>2048||input.website)return reply(400);
      const verification=await transport('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:config.secret,response:token}),signal:AbortSignal.timeout(8000)});
      if(!verification.ok)return reply(503);
      const proof=await verification.json();
      if(proof.success!==true||proof.action!=='contact_submit'||proof.hostname!==new URL(origin).hostname)return reply(400);
      const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(config.hashSecret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const hex=(buffer:ArrayBuffer)=>[...new Uint8Array(buffer)].map(b=>b.toString(16).padStart(2,'0')).join('');
      const identity=hex(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(email.trim().toLowerCase())));
      const tokenHash=hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)));
      const saved=await transport(`${config.supabaseUrl}/rest/v1/rpc/submit_verified_contact`,{method:'POST',headers:{'Content-Type':'application/json',apikey:config.serviceKey,Authorization:`Bearer ${config.serviceKey}`},body:JSON.stringify({p_name:name,p_email:email,p_phone:phone,p_message:message,p_area:area,p_other:other,p_identity_hash:identity,p_token_hash:tokenHash}),signal:AbortSignal.timeout(10000)});
      if(!saved.ok){let code='';try{code=(await saved.json()).code;}catch{/* No internal errors are returned. */}return reply(code==='P0001'?429:code==='23505'?409:503);}
      return reply(201,true);
    }catch{return reply(503);}
  };
}
