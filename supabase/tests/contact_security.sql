-- Isolated staging/local only; all fixtures roll back.
begin;
do $$ begin
  assert exists(select 1 from public.contact_submissions where area_of_activity is null),'Old contacts must remain unmodified';
  assert not has_function_privilege('anon','public.submit_verified_contact(text,text,text,text,text,text,text,text)','execute');
  assert not has_function_privilege('authenticated','public.submit_verified_contact(text,text,text,text,text,text,text,text)','execute');
  assert has_function_privilege('service_role','public.submit_verified_contact(text,text,text,text,text,text,text,text)','execute');
end $$;
set local role anon;
do $$ begin
  begin
    insert into public.contact_submissions(name,email,phone,message) values('Bypass Test','bypass@example.invalid','11999999999','Attempt to bypass verification directly.');
    raise exception 'Public insert bypassed verification';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
select public.submit_verified_contact('Verified Test','verified@example.invalid','11999999999','Mensagem validada no backend de teste.','Outros','Ciência',repeat('a',64),repeat('1',64));
select public.submit_verified_contact('Verified Test','verified@example.invalid','11999999999','Mensagem validada no backend de teste.','Tecnologia','',repeat('a',64),repeat('2',64));
select public.submit_verified_contact('Verified Test','verified@example.invalid','11999999999','Mensagem validada no backend de teste.','Saúde','',repeat('a',64),repeat('3',64));
do $$ begin
  begin
    perform public.submit_verified_contact('Verified Test','verified@example.invalid','11999999999','Uma quarta mensagem deve ser bloqueada.','Saúde','',repeat('a',64),repeat('4',64));
    raise exception 'Email quota bypassed' using errcode='XX000';
  exception when raise_exception then
    if sqlerrm<>'contact_rate_limit' then raise; end if;
  end;
  begin
    perform public.submit_verified_contact('Verified Test','verified@example.invalid','11999999999','Uma mensagem repetida deve ser bloqueada.','Saúde','',repeat('b',64),repeat('1',64));
    raise exception 'Proof replay accepted';
  exception when unique_violation then null; end;
  begin
    perform public.submit_verified_contact('Verified Test','verified@example.invalid','11999999999','Uma área inválida deve ser bloqueada.','Inválida','',repeat('b',64),repeat('5',64));
    raise exception 'Invalid area accepted';
  exception when check_violation then null; end;
  begin
    perform public.submit_verified_contact('Verified Test','verified@example.invalid','11999999999','Área Outros exige informação adicional.','Outros','',repeat('b',64),repeat('6',64));
    raise exception 'Empty custom area accepted';
  exception when check_violation then null; end;
end $$;
reset role;
do $$ declare i integer; begin
  delete from literare_private.contact_limits;delete from literare_private.contact_tokens;
  for i in 1..100 loop
    perform public.submit_verified_contact('Global Test','global'||i||'@example.invalid','11999999999','Mensagem com captcha validado para teste.','Tecnologia','',md5(i::text)||md5(i::text),md5(('token'||i))||md5(('token'||i)));
  end loop;
  begin
    perform public.submit_verified_contact('Global Test','global101@example.invalid','11999999999','Mensagem que excede o limite global.','Tecnologia','',repeat('c',64),repeat('f',64));
    raise exception 'Global quota bypassed' using errcode='XX000';
  exception when raise_exception then if sqlerrm<>'contact_rate_limit' then raise; end if; end;
end $$;
insert into auth.users(id,email) values('71000000-0000-4000-8000-000000000001','export-reader@example.invalid'),('71000000-0000-4000-8000-000000000002','export-denied@example.invalid');
insert into public.dashboard_members(user_id,role,modules) values('71000000-0000-4000-8000-000000000001','viewer','{contatos}'),('71000000-0000-4000-8000-000000000002','editorial','{catalogo}');
insert into public.contact_submissions(name,email,phone,message,area_of_activity,created_at)
  select 'Export Test '||i,'row'||i||'@export.invalid','11999999999','Mensagem completa para exportação em lote.','Tecnologia','2026-10-20 15:00:00+00' from generate_series(1,1005) i;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare row record; cursor_at timestamptz; cursor_id uuid; total integer:=0; batch integer; begin
  loop
    batch:=0;
    for row in select * from public.export_contacts_page(p_search=>'export.invalid',p_area=>'Tecnologia',p_snapshot=>'2026-10-21 23:00:00+00',p_cursor_at=>cursor_at,p_cursor_id=>cursor_id) loop
      cursor_at:=row.created_at;cursor_id:=row.id;batch:=batch+1;total:=total+1;
    end loop;
    exit when batch<500;
  end loop;
  assert total=1005,'Export must include all authorized contacts beyond pagination';
  assert (select count(*)=500 from public.export_contacts_page(p_search=>'export.invalid',p_area=>'Tecnologia',p_ascending=>true,p_snapshot=>'2026-10-21 23:00:00+00'));
  assert (select count(*)=0 from public.export_contacts_page(p_search=>'export.invalid',p_area=>'Saúde'));
  assert (select count(*)>0 from public.export_contacts_page(p_area=>'__unknown__'));
end $$;
reset role;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
  begin perform * from public.export_contacts_page();raise exception 'Unauthorized export succeeded';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: direct insert blocked; verified backend; per-identity/global quotas; replay; area constraints; 1005-row export; RLS' as result;
rollback;
