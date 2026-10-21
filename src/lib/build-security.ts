// Used at build time as well as in tests. Never returns a credential value.
export function assertPublicBuildEnv(environment:Record<string,string|undefined>) {
  for(const [name,value] of Object.entries(environment)){
    if(!name.startsWith('VITE_')||!value)continue;
    const normalized=value.trim();
    let privileged=/^sb_secret_/.test(normalized)||/SECRET|SERVICE_ROLE|PRIVATE|PASSWORD/i.test(name);
    try{const role=JSON.parse(atob(normalized.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role;privileged ||= typeof role==='string'&&role!=='anon';}catch{/* Non-JWT public values are expected. */}
    try{const url=new URL(normalized);privileged ||= !!url.username||!!url.password;}catch{/* Most values are not URLs. */}
    if(privileged)throw new Error(`A variável pública ${name} contém uma credencial reservada ao backend. Build bloqueado.`);
  }
}
