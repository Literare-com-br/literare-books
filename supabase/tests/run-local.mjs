// Local PostgreSQL/WASM only. Never reads .env or opens a database connection.
// Install the isolated test dependency as documented in MIGRATION-REVIEW.md.
import { readFile, writeFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PGlite } = await import(pathToFileURL(resolve('.local-tools/sql-runtime/node_modules/@electric-sql/pglite/dist/index.js')).href);
const sql = async path => (await readFile(path, 'utf8')).replace(/^\uFEFF/, '');
const migration = await sql('supabase/migrations/202610210001_administrative_dashboard.sql');
const results = [];
await mkdir('qa-results/sql-runtime',{recursive:true});
async function check(name, action) {
  try { await action(); results.push({name, passed:true}); console.log(`PASS ${name}`); }
  catch(error) { results.push({name,passed:false,error:error.message,code:error.code}); console.error(`FAIL ${name}: ${error.message} (${error.code})`); throw error; }
}
const bootstrap = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; create schema storage;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;
$$;
create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,metadata jsonb,unique(bucket_id,name));
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1];
$$;
alter table storage.buckets enable row level security;
alter table storage.objects enable row level security;
grant usage on schema public,auth,storage to anon,authenticated;
grant all on storage.objects to anon,authenticated;
grant select on storage.buckets to anon,authenticated;
`;
async function baseline(db) {
  await db.exec(bootstrap);
  for (const name of ['202610200001_contact_submissions.sql','202610200002_coauthor_books.sql']) await db.exec(await sql(`supabase/migrations/${name}`));
  await db.exec(`insert into auth.users values('90000000-0000-4000-8000-000000000001','existing-admin@example.invalid');
    insert into public.coauthor_admins(user_id) values('90000000-0000-4000-8000-000000000001');
    insert into public.contact_submissions(name,email,phone,message) values('Existing Contact','existing@example.invalid','11999999999','An existing contact that must be preserved.');`);
}
const db = new PGlite();
try {
  await check('missing prerequisites abort', async()=>{
    let failed=false;try{await db.exec(migration);}catch(e){failed=e.message.includes('Missing prerequisites');await db.exec('rollback');}
    if(!failed)throw new Error('Expected prerequisite failure');
  });
  await baseline(db);
  await check('fresh migration compiles and commits',()=>db.exec(migration));
  await check('reapplication commits without loss',()=>db.exec(migration));
  await check('preserves existing data and legacy membership',async()=>{
    const {rows}=await db.query(`select (select count(*) from public.contact_submissions) contacts,
      (select count(*) from public.dashboard_members where role='admin' and active) admins,
      (select count(*) from public.coauthor_admins) legacy`);
    if(rows[0].contacts!==1||rows[0].admins!==1||rows[0].legacy!==1)throw new Error(JSON.stringify(rows));
  });
  const testPath='supabase/tests/dashboard_rls.sql';
  await check('SQL security regression suite',async()=>{
    const output=await db.exec(await sql(testPath));
    const assertionCount=output.flatMap(r=>r.rows??[]).find(r=>'passed_assertions' in r)?.passed_assertions;
    if(!assertionCount||assertionCount<150)throw new Error('Missing security assertions');
    console.log(`  ${assertionCount} SQL assertions passed`);
    await writeFile('qa-results/sql-runtime/assertions.json',JSON.stringify(output.flatMap(r=>r.rows??[]).filter(r=>'passed' in r),null,2));
  });
  await check('contact security and export migration installs and reapplies',async()=>{
    const contactMigration=await sql('supabase/migrations/202610210002_contact_security_and_exports.sql');
    await db.exec(contactMigration);await db.exec(contactMigration);
  });
  await check('contact security and export SQL tests',()=>sql('supabase/tests/contact_security.sql').then(value=>db.exec(value)));
  await check('reapplication does not restore removed legacy membership',async()=>{
    await db.exec(`insert into auth.users values('90000000-0000-4000-8000-000000000002','anchor-admin@example.invalid');
      insert into public.dashboard_members(user_id,role) values('90000000-0000-4000-8000-000000000002','admin');
      delete from public.dashboard_members where user_id='90000000-0000-4000-8000-000000000001';`);
    await db.exec(migration);
    const {rows}=await db.query(`select exists(select 1 from public.dashboard_members where user_id='90000000-0000-4000-8000-000000000001') restored`);
    if(rows[0].restored)throw new Error('Legacy access resurrected');
    await db.exec(`set role anon; do $$ begin
      begin insert into public.contact_submissions(name,email,phone,message) values('Direct Bypass','bypass@example.invalid','11999999999','Old migrations must not reopen public inserts.');
        raise exception 'Older migration reopened direct insert'; exception when insufficient_privilege then null; end;
      end $$; reset role;`);
  });
} finally { await db.close(); await writeFile('qa-results/sql-runtime/results.json',JSON.stringify(results,null,2)); }

const upgraded = new PGlite();
try {
  await baseline(upgraded);
  await upgraded.exec(await sql('supabase/tests/fixtures/dashboard_v1.sql'));
  await upgraded.exec(`grant update(message),select(name) on public.contact_submissions to anon;
    insert into public.catalog_books(title,authors,category) values('Preserved v1 draft',array['Author'],'Categoria');`);
  await check('upgrade from previous dashboard preserves rows and removes stale column grants',async()=>{
    await upgraded.exec(migration);
    const {rows}=await upgraded.query(`select
      exists(select 1 from public.catalog_books where title='Preserved v1 draft') preserved,
      has_column_privilege('anon','public.contact_submissions','message','update') stale_update,
      has_column_privilege('anon','public.contact_submissions','name','select') stale_select`);
    if(!rows[0].preserved||rows[0].stale_update||rows[0].stale_select)throw new Error(JSON.stringify(rows));
  });
  await check('security suite after v1 upgrade',()=>sql('supabase/tests/dashboard_rls.sql').then(value=>upgraded.exec(value)));
} finally { await upgraded.close(); await writeFile('qa-results/sql-runtime/results.json',JSON.stringify(results,null,2)); }

const drifted=new PGlite();
try {
  await baseline(drifted);
  await drifted.exec(`alter table public.contact_submissions add column status integer;`);
  await check('incompatible existing schema fails atomically',async()=>{
    let failed=false;try{await drifted.exec(migration);}catch(e){failed=e.message.includes('Incompatible column');await drifted.exec('rollback');}
    const {rows}=await drifted.query(`select to_regclass('public.dashboard_members') created`);
    if(!failed||rows[0].created!==null)throw new Error('Schema drift did not roll back');
  });
} finally { await drifted.close(); await writeFile('qa-results/sql-runtime/results.json',JSON.stringify(results,null,2)); }
