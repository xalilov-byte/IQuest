-- ═══════════════════════════════════════════════════════════════════════
--  IQUEST — 0005: sertifikatlar
--
--  Sertifikat — "IQuest testi natijasi" (CONTRACT §6.7): ism, taxminiy
--  ball va ORALIQ, sana, noyob kod va tekshirish havolasi
--  (iquest.uz/sertifikat/?kod=…). "Rasmiy IQ", "klinik" degan ishora yo'q.
--
--  Faqat SERVERDA o'tkazilgan test uchun (test_results.certified —
--  0006 dagi test_sessions orqali; urug', tartib va vaqt serverda):
--  mode = 'test', reliable, n ≥ 30, shubhasiz. Qurilmada o'tgan test
--  (submit-test) sertifikat BERMAYDI. Sertifikatni mijoz yarata olmaydi
--  (INSERT huquqi ham, siyosati ham yo'q).
--
--  Kod — kriptografik tasodifiy, taxmin qilib bo'lmaydi: IQ-XXXX-XXXX,
--  32 belgili alifbo (0/O va 1/I yo'q — qog'ozdan o'qilganda
--  adashtirilmasin) → 40 bit ≈ 1.1·10¹² variant. Tekshirish sahifasi
--  jadvalni O'QIMAYDI — get_certificate(kod) faqat ko'rsatiladigan
--  maydonlarni qaytaradi. Kodni bilmasdan ro'yxat olib bo'lmaydi.
-- ═══════════════════════════════════════════════════════════════════════

create table public.certificates (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique
                  constraint cert_code_format check (code ~ '^IQ-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$'),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  test_result_id  bigint not null unique references public.test_results (id) on delete cascade,
  -- Ism berilgan paytdagi holatda saqlanadi: keyin profil ismi
  -- o'zgartirilsa, sertifikat boshqa odamniki bo'lib qolmasin.
  name            text not null constraint cert_name check (char_length(btrim(name)) between 1 and 80),
  iq              smallint not null constraint cert_iq check (iq between 55 and 145),
  lo              smallint not null constraint cert_lo check (lo between 55 and 145),
  hi              smallint not null constraint cert_hi check (hi between 55 and 145),
  engine          text not null,
  issued_at       timestamptz not null default now(),
  revoked_at      timestamptz,
  revoked_reason  text constraint cert_reason check (char_length(revoked_reason) <= 200),
  constraint cert_interval check (lo <= iq and iq <= hi),
  constraint cert_revoked_pair check ((revoked_at is null) = (revoked_reason is null))
);

create index certificates_user_idx on public.certificates (user_id);


-- Kod: gen_random_uuid() (pg_strong_random) dan 40 bit → 8 belgi.
create function public.certificate_code()
returns text
language plpgsql volatile
set search_path = pg_catalog, pg_temp
as $$
declare
  alpha constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  v bigint := ('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))::bit(40)::bigint;
  s text := '';
begin
  for i in 1..8 loop
    s := substr(alpha, (v & 31)::int + 1, 1) || s;
    v := v >> 5;
  end loop;
  return 'IQ-' || substr(s, 1, 4) || '-' || substr(s, 5, 4);
end;
$$;


/* Sertifikat berish — ichki (record_test_result va issue_certificate
   chaqiradi). Shartlar bajarilmasa NULL qaytaradi, xato emas: natija
   baribir yozilgan, sertifikat — qo'shimcha. Ism bo'lmasa ham NULL —
   ilova foydalanuvchidan ism so'rab, issue_certificate() ni chaqiradi. */
create function public.certificate_issue(p_result_id bigint, p_user uuid)
returns text
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  r public.test_results;
  nm text;
  c text;
begin
  select * into r from public.test_results where id = p_result_id;
  if r.id is null or r.user_id <> p_user then
    return null;
  end if;
  if r.mode <> 'test' or not r.reliable or not r.certified or r.suspicious or r.n < 30 then
    return null;
  end if;
  select code into c from public.certificates where test_result_id = r.id;
  if c is not null then
    return c;
  end if;
  select nullif(btrim(p.name), '') into nm from public.profiles p where p.id = p_user;
  if nm is null then
    return null;
  end if;
  for i in 1..5 loop
    c := public.certificate_code();
    begin
      insert into public.certificates (code, user_id, test_result_id, name, iq, lo, hi, engine)
      values (c, p_user, r.id, nm, r.iq, r.lo, r.hi, r.engine);
      return c;
    exception when unique_violation then
      -- kod to'qnashuvi (2⁴⁰ ichida) yoki shu natijaga parallel berildi
      select code into c from public.certificates where test_result_id = r.id;
      if c is not null then
        return c;
      end if;
    end;
  end loop;
  raise exception 'sertifikat kodi ajratib bo''lmadi';
end;
$$;

/* Foydalanuvchi o'z natijasi uchun keyinroq so'raydi (masalan ism
   qo'shgandan keyin). Faqat o'z natijasi; shartlar yuqoridagidek. */
create function public.issue_certificate(p_result_id bigint)
returns text
language plpgsql
security definer set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  c text;
begin
  if uid is null or public.is_anonymous_user() then
    raise exception 'tizimga kirish kerak' using errcode = '42501';
  end if;
  c := public.certificate_issue(p_result_id, uid);
  if c is null then
    raise exception 'bu natija uchun sertifikat berilmaydi (rasmiy, ishonchli test va profil ismi kerak)'
      using errcode = '22023';
  end if;
  return c;
end;
$$;

/* Tekshirish sahifasi (hammaga ochiq). Faqat ko'rsatiladigan maydonlar;
   user_id, natija id'si, bekor qilish sababi — yo'q. Topilmasa — bo'sh. */
create function public.get_certificate(p_code text)
returns table (code text, name text, iq integer, lo integer, hi integer,
               issued_at timestamptz, revoked boolean, revoked_at timestamptz)
language sql stable
security definer set search_path = public, pg_temp
as $$
  select c.code, c.name, c.iq::int, c.lo::int, c.hi::int, c.issued_at,
         c.revoked_at is not null, c.revoked_at
    from public.certificates c
   where char_length(p_code) <= 20
     and c.code = upper(btrim(p_code));
$$;

/* Bekor qilish — faqat egasi (owner). Sertifikat o'chirilmaydi: tekshirish
   sahifasi "bekor qilingan" deb ko'rsatishi kerak, "topilmadi" emas —
   aks holda qo'lidagi qog'oz hali ham haqiqiydek ko'rinardi. */
create function public.revoke_certificate(p_code text, p_reason text)
returns void
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if not public.has_role(array['owner']::public.app_role[]) then
    raise exception 'sertifikatni faqat egasi (owner) bekor qiladi' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'bekor qilish sababi kerak' using errcode = '22023';
  end if;
  update public.certificates
     set revoked_at = now(), revoked_reason = left(btrim(p_reason), 200)
   where code = upper(btrim(p_code)) and revoked_at is null;
  if not found then
    raise exception 'sertifikat topilmadi yoki allaqachon bekor qilingan' using errcode = '22023';
  end if;
end;
$$;

-- Jurnal: berish va bekor qilish. IQ qiymati yozilmaydi (u egasiga va
-- kodni bilganlarga tegishli, auditorga emas).
create function public.audit_certificates()
returns trigger
language plpgsql
security definer set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (actor_id, actor_role, action, resource, after)
    values (auth.uid(), public.my_role(), 'sertifikat berildi', 'certificate:' || new.code,
            jsonb_build_object('test_result_id', new.test_result_id, 'user_id', new.user_id));
  elsif tg_op = 'UPDATE' and new.revoked_at is distinct from old.revoked_at then
    insert into public.audit_log (actor_id, actor_role, action, resource, after)
    values (auth.uid(), public.my_role(), 'sertifikat bekor qilindi', 'certificate:' || new.code,
            jsonb_build_object('reason', new.revoked_reason));
  end if;
  return new;
end;
$$;

create trigger audit_certificates_trg
  after insert or update on public.certificates
  for each row execute function public.audit_certificates();


-- ═══ RLS VA HUQUQLAR ═══════════════════════════════════════════════════
alter table public.certificates enable row level security;

-- O'z sertifikatlari ro'yxati. Boshqalarniki — faqat kod bilan,
-- get_certificate() orqali.
create policy certificates_self_read on public.certificates
  for select to authenticated using (user_id = auth.uid());

revoke all on public.certificates from anon, authenticated;
grant select on public.certificates to authenticated;

revoke all on function public.certificate_code()                 from public, anon, authenticated;
revoke all on function public.certificate_issue(bigint, uuid)    from public, anon, authenticated;
revoke all on function public.issue_certificate(bigint)          from public, anon, authenticated;
revoke all on function public.get_certificate(text)              from public, anon, authenticated;
revoke all on function public.revoke_certificate(text, text)     from public, anon, authenticated;
grant execute on function public.issue_certificate(bigint)       to authenticated;
grant execute on function public.get_certificate(text)           to anon, authenticated;
grant execute on function public.revoke_certificate(text, text)  to authenticated;
