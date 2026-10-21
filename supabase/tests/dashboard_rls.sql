-- Run only in an isolated staging database after the corrected migration.
-- All fixtures, helper objects and changes are rolled back. No Storage HTTP
-- endpoint or Auth service is exercised by these SQL tests.
begin;
create schema literare_test;
grant usage on schema literare_test to anon,authenticated;
create table literare_test.results(name text primary key,passed boolean not null);
grant insert on literare_test.results to anon,authenticated;
create function literare_test.assert_true(test_name text,condition boolean) returns void
language plpgsql security invoker set search_path='' as $$
begin
  if condition is distinct from true then raise exception 'FAIL: %',test_name; end if;
  insert into literare_test.results values(test_name,true);
end; $$;
create function literare_test.expect_error(test_name text,statement text,expected_state text) returns void
language plpgsql security invoker set search_path='' as $$
declare actual text;
begin
  begin execute statement; exception when others then actual:=sqlstate; end;
  if actual is distinct from expected_state then
    raise exception 'FAIL %: expected SQLSTATE %, got %',test_name,expected_state,coalesce(actual,'success');
  end if;
  insert into literare_test.results values(test_name,true);
end; $$;
insert into auth.users(id,email) values
 ('10000000-0000-4000-8000-000000000001','dashboard-admin@example.invalid'),
 ('10000000-0000-4000-8000-000000000002','dashboard-editor@example.invalid'),
 ('10000000-0000-4000-8000-000000000003','dashboard-support@example.invalid'),
 ('10000000-0000-4000-8000-000000000004','dashboard-viewer@example.invalid'),
 ('10000000-0000-4000-8000-000000000005','dashboard-unapproved@example.invalid'),
 ('10000000-0000-4000-8000-000000000006','dashboard-limited@example.invalid'),
 ('10000000-0000-4000-8000-000000000007','dashboard-revoked@example.invalid'),
 ('10000000-0000-4000-8000-000000000008','dashboard-legacy-only@example.invalid');
insert into public.dashboard_members(user_id,role,modules,active) values
 ('10000000-0000-4000-8000-000000000001','admin','{}',true),
 ('10000000-0000-4000-8000-000000000002','editorial','{coautorias,catalogo,conteudo,relatorios}',true),
 ('10000000-0000-4000-8000-000000000003','support','{contatos,relatorios}',true),
 ('10000000-0000-4000-8000-000000000004','viewer','{contatos,catalogo,relatorios}',true),
 ('10000000-0000-4000-8000-000000000006','editorial','{catalogo}',true),
 ('10000000-0000-4000-8000-000000000007','admin','{}',false);
insert into public.coauthor_admins(user_id) values
 ('10000000-0000-4000-8000-000000000007'),('10000000-0000-4000-8000-000000000008');
insert into public.contact_submissions(id,name,email,phone,message,updated_at) values
 ('20000000-0000-4000-8000-000000000001','Pessoa Teste','pessoa@example.invalid','11999999999','Mensagem para validar isolamento dos contatos.',now()-interval '1 day');
insert into public.coauthor_books(id,title,description,category,editorial_coordinator,cover_path,registration_status) values
 ('30000000-0000-4000-8000-000000000001','Closed fixture','Descrição','Categoria','Coordenação','10000000-0000-4000-8000-000000000002/30000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.webp','closed'),
 ('30000000-0000-4000-8000-000000000002','Open fixture','Descrição','Categoria','Coordenação','10000000-0000-4000-8000-000000000002/30000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002.webp','open');
insert into public.catalog_books(id,title,authors,category,cover_path,publication_status) values
 ('50000000-0000-4000-8000-000000000001','Draft fixture',array['Author'],'Categoria','10000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.webp','draft'),
 ('50000000-0000-4000-8000-000000000002','Published fixture',array['Author'],'Categoria','10000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002.webp','published');
insert into public.site_content(key,state,title,image_url) values
 ('about_1','draft','Draft fixture','https://example.invalid/storage/v1/object/public/institutional-images/10000000-0000-4000-8000-000000000002/60000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001.webp'),
 ('about_1','published','Published fixture','https://example.invalid/storage/v1/object/public/institutional-images/10000000-0000-4000-8000-000000000002/60000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002.webp')
on conflict(key,state) do update set title=excluded.title,image_url=excluded.image_url;
insert into storage.objects(bucket_id,name)
  select 'coauthor-book-covers',cover_path from public.coauthor_books where title in ('Closed fixture','Open fixture')
  union all select 'catalog-book-covers',cover_path from public.catalog_books where title in ('Draft fixture','Published fixture')
  union all select 'institutional-images',split_part(image_url,'/institutional-images/',2) from public.site_content where key='about_1';

-- ISBN: checksum, prefixes, X, separators, empty, NULL and invalid encodings.
do $$ declare item record; begin
  for item in select * from (values
    ('',true),('0306406152',true),('0-8044-2957-X',true),('0-8044-2957-x',true),
    ('978-0-306-40615-7',true),('9791090636071',true),
    (null,false),('---',false),('   ',false),('123',false),('0306406153',false),
    ('9780306406158',false),('9770306406158',false),('0000000000',false),
    ('X306406152',false),('978030640615X',false),('9780306406157!',false),
    ('9780306406157'||chr(10),false),('９７８０３０６４０６１５７',false)
  ) as cases(value,valid) loop
    perform literare_test.assert_true('ISBN '||coalesce(item.value,'NULL'),public.valid_isbn(item.value)=item.valid);
  end loop;
end $$;
select literare_test.assert_true('buckets are private',not exists(select 1 from storage.buckets where id in ('coauthor-book-covers','catalog-book-covers','institutional-images') and public));
select literare_test.assert_true('private helper schema inaccessible',not has_schema_privilege('authenticated','literare_private','usage'));
select literare_test.assert_true('anonymous management execute revoked',not has_function_privilege('anon','public.dashboard_set_member(text,text,text[],boolean)','execute'));
select literare_test.assert_true('anonymous legacy predicate execute revoked',not has_function_privilege('anon','public.is_coauthor_admin()','execute'));
select literare_test.assert_true('trigger execute revoked',not has_function_privilege('authenticated','public.dashboard_touch_updated_at()','execute'));
select literare_test.assert_true('definer functions pin search_path',not exists(
 select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where (n.nspname='literare_private' or (n.nspname='public' and p.proname in ('dashboard_allowed','is_coauthor_admin','dashboard_users','dashboard_set_member','dashboard_asset_read','dashboard_asset_delete')))
 and (not p.prosecdef or p.proconfig is null or not exists(select 1 from unnest(p.proconfig) setting where setting like 'search_path=%'))));

-- Assert every resource and operation for each profile (not only hidden UI).
create function literare_test.check_matrix(actor text,expected_read text[],expected_write text[]) returns void
language plpgsql security invoker set search_path='' as $$
declare resource text;
begin
  foreach resource in array array['coautorias','contatos','catalogo','conteudo','relatorios','usuarios'] loop
    perform literare_test.assert_true(actor||' read '||resource,public.dashboard_allowed(resource,false)=(resource=any(expected_read)));
    perform literare_test.assert_true(actor||' write '||resource,public.dashboard_allowed(resource,true)=(resource=any(expected_write)));
  end loop;
  perform literare_test.assert_true(actor||' unknown resource denied',not public.dashboard_allowed('unknown',false));
  perform literare_test.assert_true(actor||' NULL operation denied',not public.dashboard_allowed('catalogo',null));
end $$;
select set_config('request.jwt.claims','{}',true);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
select literare_test.check_matrix('anon','{}','{}');
select literare_test.expect_error('anonymous cannot read contacts','select * from public.contact_submissions','42501');
select literare_test.assert_true('anonymous closed metadata hidden',not exists(select 1 from public.coauthor_books where title='Closed fixture'));
select literare_test.assert_true('anonymous draft catalog hidden',not exists(select 1 from public.catalog_books where title='Draft fixture'));
select literare_test.assert_true('anonymous draft content hidden',not exists(select 1 from public.site_content where state='draft'));
select literare_test.assert_true('anonymous reads published metadata',exists(select 1 from public.catalog_books where title='Published fixture'));
select literare_test.assert_true('anonymous reads only published images',(select count(*)=3 from storage.objects));
insert into public.contact_submissions(name,email,phone,message) values('Visitante Teste','visitor@example.invalid','11999999999','Envio público permitido sem acesso ao atendimento.');
select literare_test.assert_true('anonymous insert succeeds',true);
select literare_test.expect_error('anonymous cannot inject status', $$insert into public.contact_submissions(name,email,phone,message,status) values('Visitante Teste','visitor@example.invalid','11999999999','Mensagem pública com tentativa de status.','completed')$$,'42501');
select literare_test.expect_error('anonymous cannot upload private cover', $$insert into storage.objects(bucket_id,name) values('catalog-book-covers','10000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000003.webp')$$,'42501');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select literare_test.check_matrix('admin','{coautorias,contatos,catalogo,conteudo,relatorios,usuarios}','{coautorias,contatos,catalogo,conteudo,usuarios}');
select literare_test.assert_true('legacy admin true',public.is_coauthor_admin());
select literare_test.assert_true('admin directory allowed',exists(select 1 from public.dashboard_users()));
select literare_test.assert_true('admin can read private images',(select count(*)=6 from storage.objects));
select literare_test.expect_error('admin cannot change self',$$select public.dashboard_set_member('dashboard-admin@example.invalid','viewer','{}',false)$$,'42501');
select literare_test.expect_error('admin cannot modify contact body', $$update public.contact_submissions set message='Changed by status-only agent'$$,'42501');
select literare_test.expect_error('admin cannot delete contacts','delete from public.contact_submissions','42501');
select literare_test.expect_error('admin cannot directly write members',$$update public.dashboard_members set role='admin'$$,'42501');
select literare_test.expect_error('admin cannot assign editorial resources to support',$$select public.dashboard_set_member('dashboard-support@example.invalid','support',array['catalogo'],true)$$,'23514');
select literare_test.expect_error('admin cannot authorize nonexistent account',$$select public.dashboard_set_member('does-not-exist@example.invalid','viewer','{}',true)$$,'22023');
select public.dashboard_set_member('dashboard-unapproved@example.invalid','viewer',array['catalogo'],true);
select public.dashboard_set_member('dashboard-unapproved@example.invalid','viewer',array['catalogo'],false);
select literare_test.assert_true('admin authorized and revoked another account',true);
select literare_test.expect_error('admin directory rejects negative offset','select * from public.dashboard_users(-1)','22023');
reset role;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select literare_test.check_matrix('editorial','{coautorias,catalogo,conteudo,relatorios}','{coautorias,catalogo,conteudo}');
select literare_test.assert_true('editorial legacy predicate remains false',not public.is_coauthor_admin());
select literare_test.assert_true('editorial reads closed metadata',exists(select 1 from public.coauthor_books where title='Closed fixture'));
select literare_test.assert_true('editorial cannot read contacts',not exists(select 1 from public.contact_submissions));
select literare_test.expect_error('editorial cannot manage users',$$select public.dashboard_set_member('dashboard-editor@example.invalid','admin','{}',true)$$,'42501');
select literare_test.expect_error('editorial cannot list users','select * from public.dashboard_users()','42501');
select literare_test.expect_error('invalid ISBN constraint',$$insert into public.catalog_books(title,authors,isbn,category) values('Invalid',array['Author'],'---','Categoria')$$,'23514');
select literare_test.expect_error('empty author constraint',$$insert into public.catalog_books(title,authors,category) values('Invalid',array[' '],'Categoria')$$,'23514');
select literare_test.expect_error('NULL category item constraint',$$insert into public.site_content(key,state,title,items) values('categories','draft','Invalid',array[null]::text[])$$,'23514');
insert into public.catalog_books(title,authors,isbn,category) values('Valid creation',array['Author 1','Author 2'],'9780306406157','Categoria');
insert into public.coauthor_books(title,description,category,editorial_coordinator) values('Editorial creation','Descrição','Categoria','Coordenação');
select literare_test.assert_true('editorial CRUD inserts allowed',exists(select 1 from public.coauthor_books where title='Editorial creation'));
update public.coauthor_books set title='Editorial updated' where title='Editorial creation';
delete from public.coauthor_books where title='Editorial updated';
select literare_test.assert_true('editorial CRUD delete allowed',not exists(select 1 from public.coauthor_books where title='Editorial updated'));
select literare_test.assert_true('editorial reports omit contacts',not(public.dashboard_report(now()-interval '1 day',now()+interval '1 day') ? 'contacts_monthly'));
select literare_test.expect_error('report rejects NULL dates',$$select public.dashboard_report(null,now())$$,'22023');
select literare_test.expect_error('report rejects infinite dates',$$select public.dashboard_report('-infinity',now())$$,'22023');
insert into storage.objects(bucket_id,name) values('catalog-book-covers','10000000-0000-4000-8000-000000000002/50000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000003.webp');
select literare_test.assert_true('editorial upload path allowed',true);
select literare_test.expect_error('editorial foreign upload path rejected', $$insert into storage.objects(bucket_id,name) values('catalog-book-covers','10000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000004.webp')$$,'42501');
delete from storage.objects where bucket_id='catalog-book-covers' and name like '%000000000003.webp';
select literare_test.assert_true('unreferenced upload cleanup allowed',not exists(select 1 from storage.objects where name like '%000000000003.webp'));
delete from storage.objects where bucket_id='catalog-book-covers';
select literare_test.assert_true('referenced catalog covers cannot be removed',(select count(*)=2 from storage.objects where bucket_id='catalog-book-covers'));
update storage.objects set name='moved.webp' where bucket_id='catalog-book-covers';
select literare_test.assert_true('overwrite and move denied',not exists(select 1 from storage.objects where name='moved.webp'));
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select literare_test.check_matrix('support','{contatos,relatorios}','{contatos}');
update public.contact_submissions set status='completed' where id='20000000-0000-4000-8000-000000000001';
select literare_test.assert_true('support persists status and updated_at',exists(select 1 from public.contact_submissions where id='20000000-0000-4000-8000-000000000001' and status='completed' and updated_at>now()-interval '1 minute'));
select literare_test.assert_true('support report excludes editorial',not(public.dashboard_report(now()-interval '1 day',now()+interval '1 day') ? 'books_categories'));
select literare_test.expect_error('support cannot escalate self',$$select public.dashboard_set_member('dashboard-support@example.invalid','admin','{}',true)$$,'42501');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select literare_test.check_matrix('viewer','{contatos,catalogo,relatorios}','{}');
update public.contact_submissions set status='pending' where id='20000000-0000-4000-8000-000000000001';
select literare_test.assert_true('viewer status update affects no row',exists(select 1 from public.contact_submissions where id='20000000-0000-4000-8000-000000000001' and status='completed'));
select literare_test.assert_true('viewer can read explicitly allowed draft catalog',exists(select 1 from public.catalog_books where title='Draft fixture'));
select literare_test.expect_error('viewer cannot insert catalog',$$insert into public.catalog_books(title,authors,category) values('Forbidden',array['Author'],'Categoria')$$,'42501');
select literare_test.expect_error('viewer cannot upload assets',$$insert into storage.objects(bucket_id,name) values('catalog-book-covers','10000000-0000-4000-8000-000000000004/50000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000004.webp')$$,'42501');
select literare_test.assert_true('viewer source-scoped report',public.dashboard_report(now()-interval '1 day',now()+interval '1 day') ? 'catalog_categories');
reset role;

select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',true);
set local role authenticated;
select literare_test.check_matrix('limited editorial','{catalogo}','{catalogo}');
select literare_test.expect_error('unassigned reports denied',$$select public.dashboard_report(now()-interval '1 day',now())$$,'42501');
reset role;
do $$ declare actor text; begin
  foreach actor in array array['000000000005','000000000007','000000000008'] loop
    perform set_config('request.jwt.claim.sub','10000000-0000-4000-8000-'||actor,true);
    set local role authenticated;
    perform literare_test.check_matrix('unapproved/revoked '||actor,'{}','{}');
    perform literare_test.assert_true('no contacts '||actor,not exists(select 1 from public.contact_submissions));
    perform literare_test.assert_true('no legacy fallback '||actor,not public.is_coauthor_admin());
    perform literare_test.assert_true('no private assets '||actor,(select count(*)=3 from storage.objects));
    reset role;
  end loop;
end $$;
select set_config('request.jwt.claim.sub','',true);

-- Direct owner/backend DML and Auth cascade cannot remove the last admin.
-- Save and restore prior active flags so existing staging members are unchanged.
create temporary table prior_active_flags as select user_id,active from public.dashboard_members;
update public.dashboard_members set active=false where user_id<>'10000000-0000-4000-8000-000000000001' and active;
select literare_test.expect_error('last admin cannot be deactivated',$$update public.dashboard_members set active=false where user_id='10000000-0000-4000-8000-000000000001'$$,'23514');
select literare_test.expect_error('last admin cannot be demoted',$$update public.dashboard_members set role='viewer' where user_id='10000000-0000-4000-8000-000000000001'$$,'23514');
select literare_test.expect_error('last admin cannot be deleted',$$delete from public.dashboard_members where user_id='10000000-0000-4000-8000-000000000001'$$,'23514');
select literare_test.expect_error('last admin Auth cascade blocked',$$delete from auth.users where id='10000000-0000-4000-8000-000000000001'$$,'23514');
select literare_test.expect_error('membership truncate blocked','truncate public.dashboard_members','42501');
update public.dashboard_members m set active=s.active from prior_active_flags s where m.user_id=s.user_id;

-- Unknown permissive policies cannot OR around the restrictive ceiling.
create policy "Test overly broad contacts" on public.contact_submissions for select to authenticated using(true);
create policy "Test overly broad assets" on storage.objects for all to anon,authenticated using(true) with check(true);
create policy "Test overly broad buckets" on storage.buckets for update to authenticated using(true) with check(true);
grant update on storage.buckets to authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',true);
set local role authenticated;
select literare_test.assert_true('restrictive contact ceiling survives broad policy',not exists(select 1 from public.contact_submissions));
select literare_test.assert_true('restrictive storage ceiling survives broad policy',(select count(*)=3 from storage.objects));
update storage.buckets set public=true where id='catalog-book-covers';
select literare_test.assert_true('API cannot make managed bucket public',true);
reset role;
select literare_test.assert_true('bucket still private after API attempt',not(select public from storage.buckets where id='catalog-book-covers'));
select set_config('request.jwt.claim.sub','',true);

select count(*) as passed_assertions from literare_test.results;
select name,passed from literare_test.results order by name;
rollback;
