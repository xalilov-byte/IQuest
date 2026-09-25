/* ─────────────────────────────────────────────────────────────────────────
   SALBIY TEKSHIRUV: himoya olib tashlansa, test HAQIQATAN yiqiladimi?

   "Test o'tdi" ikki narsani anglatishi mumkin: himoya ishlayapti — yoki
   test hech narsani tekshirmayapti (masalan so'rov boshqa sababdan
   yiqilyapti). Ikkinchisini faqat bitta yo'l bilan ajratish mumkin:
   himoyani ataylab buzib, testni qayta ishga tushirish. Test yashil
   qolsa — u foydasiz.

   Har bir "mutant" — migratsiyadagi BITTA himoyaning olib tashlanishi
   (aniq matn almashtirish). supabase/tests/run.mjs har mutant uchun toza
   baza ko'taradi, buzilgan migratsiyani qo'llaydi, testlarni yurgizadi va
   ikkalasini talab qiladi: (1) testlar yiqildi, (2) chiqishda `expect`
   matni bor — ya'ni aynan SHU himoyaning testi yiqildi, boshqa narsa emas.

   `from` manbada aynan BIR marta uchrashi shart. Migratsiya o'zgarib
   almashtirish topilmasa, yurituvchi "mutant eskirgan" deb yiqiladi —
   salbiy tekshiruv jimgina yo'qolib qolmaydi.

   Qatlamli himoyalar (masalan trigger + siyosat + CHECK) uchun har
   qatlamning o'z mutanti bor: testlar qaysi qatlam javob berganini
   xato turidan ajratadi.
   ───────────────────────────────────────────────────────────────────── */

export const MUTANTS = [
  // ── 0001: hisoblar va jurnal ────────────────────────────────────────
  {
    id: 'profiles-rls-off',
    applyCatches: 'XATO: RLS yoqilmagan jadval',
    why: 'profiles jadvalida RLS o\'chirilsa',
    file: '0001_init.sql',
    subs: [["alter table public.profiles  enable row level security;\n", '']],
    expect: "FAIL: foydalanuvchi faqat o'z profilini",
  },
  {
    id: 'signup-role-from-meta',
    why: 'handle_new_user rol va tg_id ni klient meta-ma\'lumotidan olsa (Nazariy teshigi)',
    file: '0001_init.sql',
    subs: [[
      "insert into public.profiles (id, name)\n  values (new.id, ",
      "insert into public.profiles (id, role, tg_id, name)\n  values (new.id, " +
      "coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'user'), " +
      "(new.raw_user_meta_data ->> 'tg_id')::bigint, ",
    ]],
    expect: 'FAIL: role meta',
  },
  {
    id: 'profiles-guard-role',
    why: 'profil qo\'riqchisi rol o\'zgarishini tekshirmasa',
    file: '0001_init.sql',
    subs: [["if new.role is distinct from old.role\n     and not public.has_role(array['owner']::public.app_role[]) then",
            'if false then']],
    expect: 'rolini bera oldi',
  },
  {
    id: 'profiles-guard-tg',
    why: 'profil qo\'riqchisi tg_id o\'zgarishini tekshirmasa',
    file: '0001_init.sql',
    subs: [['if new.tg_id is distinct from old.tg_id then\n    raise', 'if false then\n    raise']],
    expect: "tg_id sini o'zgartira oldi",
  },
  {
    id: 'audit-read-open',
    why: 'audit jurnali hammaga o\'qishga ochilsa',
    file: '0001_init.sql',
    subs: [["create policy audit_read on public.audit_log\n  for select to authenticated\n  using (public.has_role(array['auditor','owner']::public.app_role[]));",
            'create policy audit_read on public.audit_log\n  for select to authenticated\n  using (true);']],
    expect: "FAIL: oddiy foydalanuvchi audit jurnalini ko'rdi",
  },
  {
    id: 'audit-grant-insert',
    why: 'authenticated\'ga audit jurnaliga yozish huquqi berilsa (RLS baribir to\'sadi — lint ushlaydi)',
    file: '0001_init.sql',
    subs: [['grant select on public.audit_log to authenticated;',
            'grant select, insert on public.audit_log to authenticated;']],
    expect: 'FAIL: authenticated audit jurnaliga yozish huquqiga ega',
  },

  // ── 0002: og'zaki savollar va to'rt ko'z ────────────────────────────
  {
    id: 'verbal-rls-off',
    applyCatches: 'XATO: RLS yoqilmagan jadval',
    why: 'verbal_items da RLS o\'chirilsa',
    file: '0002_verbal.sql',
    subs: [['alter table public.verbal_items   enable row level security;\n', '']],
    expect: 'FAIL: anon qoralama',
  },
  {
    id: 'verbal-public-read-all',
    why: 'ommaviy o\'qish siyosati qoralamani ham ochsa',
    file: '0002_verbal.sql',
    subs: [["using (state = 'published');", 'using (true);']],
    expect: 'FAIL: anon qoralama',
  },
  {
    id: 'verbal-anon-all-columns',
    why: 'anon\'ga ustun cheklovisiz SELECT berilsa (xodim id\'lari chiqadi)',
    file: '0002_verbal.sql',
    subs: [[
      'grant select (key, kind, level,\n              uz_prompt, uz_stimulus, uz_options,\n' +
      '              ru_prompt, ru_stimulus, ru_options,\n' +
      '              correct, explain_uz, explain_ru, state, updated_at)\n  on public.verbal_items to anon;',
      'grant select on public.verbal_items to anon;',
    ]],
    expect: 'FAIL: anon xodimlarning ichki identifikatorlarini',
  },
  {
    id: 'guard-insert-published',
    why: 'qo\'riqchi INSERT bilan darhol nashrni tekshirmasa (siyosat va CHECK qoladi)',
    file: '0002_verbal.sql',
    subs: [["if new.state not in ('draft', 'review') then", 'if false then']],
    expect: "FAIL: qo'riqchi trigger INSERT bilan nashrni to'smadi",
  },
  {
    id: 'policy-insert-published',
    why: 'INSERT siyosati holatni cheklamasa (trigger va CHECK qoladi)',
    file: '0002_verbal.sql',
    subs: [["\n    and state in ('draft', 'review'));", ');']],
    expect: "FAIL: siyosat (triggersiz) INSERT bilan nashrni to'smadi",
  },
  {
    id: 'check-published-reviewed',
    why: 'nashr invarianti (CHECK) olib tashlansa (trigger va siyosat qoladi)',
    file: '0002_verbal.sql',
    subs: [["check (\n    state <> 'published'\n    or", 'check (\n    true\n    or']],
    expect: "FAIL: CHECK o'z-o'zini tasdiqlagan nashrni to'smadi",
  },
  {
    id: 'four-eyes-off',
    why: 'to\'rt ko\'z tekshiruvi qo\'riqchidan olib tashlansa',
    file: '0002_verbal.sql',
    subs: [['if new.content_by is not null and new.content_by = uid then', 'if false then']],
    expect: "FAIL: to'rt ko'z qo'riqchisi muallifni to'xtatmadi",
  },
  {
    id: 'four-eyes-updated-by',
    why: 'to\'rt ko\'z Nazariy\'dagidek "oxirgi tahrir qilgan" bo\'yicha tekshirilsa',
    file: '0002_verbal.sql',
    subs: [['if new.content_by is not null and new.content_by = uid then',
            'if old.updated_by is not null and old.updated_by = uid then']],
    expect: "FAIL: to'rt ko'z (izoh orqali aylanma)",
  },
  {
    id: 'content-change-no-review',
    why: 'mazmun o\'zgarganda savol ko\'rib chiqishga qaytarilmasa',
    file: '0002_verbal.sql',
    subs: [['  if public.verbal_content(new) is distinct from public.verbal_content(old) then\n    new.content_by',
            '  if false then\n    new.content_by']],
    expect: "FAIL: kalit o'zgardi, savol esa nashrda qoldi",
  },
  {
    id: 'content-ignores-ru-options',
    why: 'ruscha variantlar "mazmun" hisoblanmasa (Nazariy\'dagi tarjima teshigi)',
    file: '0002_verbal.sql',
    subs: [['v.ru_prompt, v.ru_stimulus, v.ru_options);', 'v.ru_prompt, v.ru_stimulus);']],
    expect: 'FAIL: ruscha variantlar almashtirildi',
  },
  {
    id: 'guard-reviewed-by-writable',
    why: 'reviewed_by ni klient yoza olsa',
    file: '0002_verbal.sql',
    subs: [['    new.reviewed_by    := old.reviewed_by;\n', '']],
    expect: 'FAIL: reviewed_by soxtalashtirildi',
  },
  {
    id: 'publish-without-login',
    why: 'qo\'riqchi tizimga kirmagan ulanishning nashrini to\'smasa',
    file: '0002_verbal.sql',
    subs: [["if uid is null then\n      raise exception 'nashr etish", "if false then\n      raise exception 'nashr etish"]],
    expect: "FAIL: tizimga kirmagan ulanish nashrini qo'riqchi to'smadi",
  },
  {
    id: 'key-mutable',
    why: 'savol kaliti (key) o\'zgartirilishi mumkin bo\'lsa',
    file: '0002_verbal.sql',
    subs: [['if new.key is distinct from old.key or new.id is distinct from old.id then',
            'if new.id is distinct from old.id then']],
    expect: "FAIL: key o'zgardi",
  },
  {
    id: 'check-options-same-count',
    why: 'uz va ru variantlar soni tengligi tekshirilmasa',
    file: '0002_verbal.sql',
    subs: [['check (array_length(ru_options, 1) = array_length(uz_options, 1))', 'check (true)']],
    expect: 'FAIL: CHECK — "variant soni mos emas"',
  },
  {
    id: 'options-duplicates-allowed',
    why: 'takroriy variantlar tekshirilmasa',
    file: '0002_verbal.sql',
    subs: [["\n     and (select count(distinct lower(regexp_replace(btrim(o), '\\s+', ' ', 'g')))\n            from unnest(opts) o) = cardinality(opts);", ';']],
    expect: 'FAIL: CHECK — "takroriy variant"',
  },
  {
    id: 'retired-trigger-missing',
    why: 'arxivlangan kalitlar ro\'yxati yuritilmasa',
    file: '0002_verbal.sql',
    subs: [['create trigger verbal_retired_trg\n  after insert or update of state on public.verbal_items\n  for each row execute function public.verbal_sync_retired();', '']],
    expect: "FAIL: arxivlangan kalit ommaviy ro'yxatga tushmadi",
  },
  {
    id: 'audit-noop-noise',
    why: 'bo\'sh UPDATE ham jurnalga yozilsa',
    file: '0002_verbal.sql',
    subs: [["  if tg_op = 'UPDATE'\n     and (to_jsonb(new)", "  if false and tg_op = 'UPDATE'\n     and (to_jsonb(new)"]],
    expect: "FAIL: bo'sh UPDATE jurnalga",
  },

  // ── 0003: natijalar (faqat server yozadi, faqat egasi o'qiydi) ────
  {
    id: 'results-rls-off',
    applyCatches: 'XATO: RLS yoqilmagan jadval',
    why: 'test_results da RLS o\'chirilsa',
    file: '0003_results.sql',
    subs: [['alter table public.test_results   enable row level security;\n', '']],
    expect: "FAIL: foydalanuvchi boshqaning natijasini ko'rdi",
  },
  {
    id: 'results-read-all',
    why: 'natijalarni o\'qish siyosati hammaga ochilsa',
    file: '0003_results.sql',
    subs: [['create policy results_self_read on public.test_results\n  for select to authenticated\n  using (user_id = auth.uid());',
            'create policy results_self_read on public.test_results\n  for select to authenticated\n  using (true);']],
    expect: "FAIL: foydalanuvchi boshqaning natijasini ko'rdi",
  },
  {
    id: 'games-read-all',
    why: 'o\'yin natijalarini o\'qish hammaga ochilsa',
    file: '0003_results.sql',
    subs: [['create policy games_self_read on public.game_results\n  for select to authenticated\n  using (user_id = auth.uid());',
            'create policy games_self_read on public.game_results\n  for select to authenticated\n  using (true);']],
    expect: "FAIL: foydalanuvchi boshqaning o'yin natijasini ko'rdi",
  },
  {
    id: 'results-client-insert',
    why: 'mijozga natija yozish huquqi va siyosati berilsa (ikkala qatlam)',
    file: '0003_results.sql',
    subs: [['grant select on public.test_results   to authenticated;',
            'grant select, insert on public.test_results to authenticated;\n' +
            'create policy results_client_insert on public.test_results for insert to authenticated with check (true);']],
    expect: 'FAIL: mijoz yozdi — foydalanuvchi test_results INSERT',
  },
  {
    id: 'results-grant-insert',
    why: 'mijozga natija yozish HUQUQI berilsa (siyosat yo\'q — RLS to\'sadi; lint ushlaydi)',
    file: '0003_results.sql',
    subs: [['grant select on public.test_results   to authenticated;',
            'grant select, insert on public.test_results to authenticated;']],
    expect: 'FAIL: authenticated natija/ball/sertifikat yozish huquqiga ega',
  },
  {
    id: 'results-n-unbounded',
    why: 'n yuqori chegarasi olib tashlansa',
    file: '0003_results.sql',
    subs: [['check (n between 1 and 200)', 'check (n >= 1)']],
    expect: 'FAIL: CHECK — "n = 201"',
  },
  {
    id: 'results-seed-reuse',
    why: 'bitta urug\'ni qayta yuborib ball yig\'ish mumkin bo\'lsa',
    file: '0003_results.sql',
    subs: [[",\n  -- Bitta urug' bitta foydalanuvchida bir marta: qayta yuborib ball\n  -- yig'ish yo'q.\n  constraint results_seed_once unique (user_id, mode, seed)", '']],
    expect: "FAIL: bitta urug' ikki marta ball berdi",
  },
  {
    id: 'delete-my-data-everyone',
    why: 'delete_my_data() hammaning natijasini o\'chirsa',
    file: '0003_results.sql',
    subs: [['delete from public.test_results where user_id = uid;', 'delete from public.test_results;']],
    expect: "FAIL: boshqaning natijasi o'chdi",
  },
  {
    id: 'delete-my-data-nosub',
    why: 'delete_my_data() kim chaqirayotganini tekshirmasa',
    file: '0003_results.sql',
    subs: [["  if uid is null then\n    raise exception 'tizimga kirish kerak' using errcode = '42501';\n  end if;\n  delete from public.test_results",
            '  delete from public.test_results']],
    expect: "FAIL: delete_my_data() auth.uid() null bilan to'xtamadi",
  },
  {
    id: 'delete-not-audited',
    why: 'natija o\'chirilishi jurnalga tushmasa',
    file: '0003_results.sql',
    subs: [['create trigger audit_results_delete_trg\n  after delete on public.test_results\n  referencing old table as gone\n  for each statement execute function public.audit_results_delete();', '']],
    expect: "FAIL: o'chirish jurnalga tushmadi",
  },
  {
    id: 'delete-my-data-anon',
    why: 'anon\'ga delete_my_data() huquqi berilsa (ichki tekshiruv qoladi — lint ushlaydi)',
    file: '0003_results.sql',
    subs: [['grant execute on function public.delete_my_data() to authenticated;',
            'grant execute on function public.delete_my_data() to authenticated, anon;']],
    expect: 'FAIL: anon RPC huquqiga ega',
  },
  {
    id: 'responses-read-open',
    why: 'anonim javoblar hammaga o\'qishga ochilsa',
    file: '0003_results.sql',
    subs: [["create policy responses_staff_read on public.item_responses\n  for select to authenticated\n  using (public.has_role(array['auditor','owner']::public.app_role[]));",
            'create policy responses_staff_read on public.item_responses\n  for select to authenticated\n  using (true);']],
    expect: "FAIL: oddiy foydalanuvchi item_responses ni o'qidi",
  },
  {
    id: 'responses-not-anonymous',
    why: 'javoblar jadvaliga user_id qo\'shilsa (anonimlik yo\'qoladi)',
    file: '0003_results.sql',
    subs: [['  created_on  date not null default current_date,\n',
            '  created_on  date not null default current_date,\n  user_id     uuid default auth.uid(),\n']],
    expect: "FAIL: item_responses ustunlari o'zgardi",
  },

  // ── 0004: liga va reyting ──────────────────────────────────────────
  {
    id: 'league-add-points-public',
    why: 'liga ballini qo\'shish funksiyasidan EXECUTE olinmasa (PostgreSQL uni hammaga beradi)',
    file: '0004_league.sql',
    subs: [['revoke all on function public.league_add_points(uuid, int) from public, anon, authenticated;\n', '']],
    expect: 'league_add_points()',
  },
  {
    id: 'league-group-unbounded',
    why: 'guruh hajmi cheklanmasa',
    file: '0004_league.sql',
    subs: [['  having count(*) < public.league_group_size()\n', '  having true\n']],
    expect: "FAIL: liga guruhlari 30 kishidan oshdi",
  },
  {
    id: 'league-board-all-groups',
    why: 'league_board() boshqa guruhlarni ham ko\'rsatsa',
    file: '0004_league.sql',
    subs: [['     where m.week = me.week and m.tier = me.tier and m.grp = me.grp', '     where m.week = me.week']],
    expect: "FAIL: league_board() o'z guruhini to'g'ri bermadi",
  },
  {
    id: 'league-board-anon',
    why: 'anon\'ga league_board() huquqi berilsa',
    file: '0004_league.sql',
    subs: [['grant execute on function public.league_board()          to authenticated;',
            'grant execute on function public.league_board()          to authenticated, anon;']],
    expect: 'FAIL: anon RPC huquqiga ega',
  },
  {
    id: 'leaderboard-uncertified',
    why: 'IQ reytingiga qurilmada o\'tgan (soxtalash mumkin) test ham kirsa',
    file: '0004_league.sql',
    subs: [["         where r.mode = 'test' and r.reliable and r.certified and not r.suspicious",
            "         where r.mode = 'test' and r.reliable and not r.suspicious"]],
    expect: 'FAIL: IQ reytingi',
  },
  {
    id: 'leaderboard-no-consent',
    why: 'IQ reytingida rozilik bermaganlar ham ko\'rinsa',
    file: '0004_league.sql',
    subs: [['        from best b\n        join public.profiles p on p.id = b.user_id\n       where p.show_on_leaderboard\n',
            '        from best b\n        join public.profiles p on p.id = b.user_id\n']],
    expect: 'FAIL: IQ reytingi',
  },
  {
    id: 'league-promotion-rule',
    why: 'ko\'tarilish zonasi buzilsa (20% o\'rniga 50%)',
    file: '0004_league.sql',
    subs: [['when r.rnk <= ceil(r.size * 0.2)', 'when r.rnk <= ceil(r.size * 0.5)']],
    expect: "FAIL: liga — ko'tarilish/tushish noto'g'ri",
  },
  {
    id: 'league-close-current-week',
    why: 'joriy (davom etayotgan) haftani yopib bo\'lsa',
    file: '0004_league.sql',
    subs: [["  if p_week >= public.league_week() then\n    raise exception 'joriy yoki kelajakdagi haftani yopib bo''lmaydi: %', p_week;\n  end if;\n", '']],
    expect: "FAIL: liga — joriy (davom etayotgan) hafta yopildi",
  },
  {
    id: 'league-close-not-idempotent',
    why: 'hafta ikki marta yopilishi mumkin bo\'lsa (cron qayta ishlasa)',
    file: '0004_league.sql',
    subs: [['  if exists (select 1 from public.league_closed where week = p_week) then\n    return 0;\n  end if;\n', '']],
    expect: 'league_results_pkey',
  },

  // ── 0005: sertifikatlar ────────────────────────────────────────────
  {
    id: 'cert-from-client-test',
    why: 'qurilmada o\'tgan (soxtalash mumkin) testga sertifikat berilsa',
    file: '0005_certificates.sql',
    subs: [['or not r.certified ', '']],
    expect: 'FAIL: sertifikat berilmasligi kerak edi: qurilmadagi test',
  },
  {
    id: 'cert-short-test',
    why: '30 tadan kam savolli testga sertifikat berilsa',
    file: '0005_certificates.sql',
    subs: [[' or r.n < 30 then', ' then']],
    expect: 'FAIL: sertifikat berilmasligi kerak edi: 30 tadan kam savol',
  },
  {
    id: 'cert-read-all',
    why: 'sertifikatlar jadvali hammaga ochilsa',
    file: '0005_certificates.sql',
    subs: [['create policy certificates_self_read on public.certificates\n  for select to authenticated using (user_id = auth.uid());',
            'create policy certificates_self_read on public.certificates\n  for select to authenticated using (true);']],
    expect: "FAIL: foydalanuvchi boshqaning sertifikatlari ro'yxatini ko'rdi",
  },
  {
    id: 'cert-lookup-pattern',
    why: 'get_certificate() kod o\'rniga naqsh qabul qilsa (hamma sertifikatni sanab olish)',
    file: '0005_certificates.sql',
    subs: [['   where char_length(p_code) <= 20\n     and c.code = upper(btrim(p_code));', '   where c.code like upper(btrim(p_code));']],
    expect: "FAIL: get_certificate() noma'lum kod bilan nimadir qaytardi",
  },
  {
    id: 'cert-code-guessable',
    why: 'sertifikat kodi kriptografik tasodifiy bo\'lmasa (vaqtdan)',
    file: '0005_certificates.sql',
    subs: [["v bigint := ('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))::bit(40)::bigint;",
            'v bigint := (extract(epoch from clock_timestamp()) * 1000)::bigint % 4096;']],
    expect: 'FAIL: sertifikat kodi takrorlandi',
  },
  {
    id: 'cert-issue-others',
    why: 'issue_certificate() boshqaning natijasiga ham sertifikat bersa',
    file: '0005_certificates.sql',
    subs: [['  c := public.certificate_issue(p_result_id, uid);',
            '  c := public.certificate_issue(p_result_id, (select user_id from public.test_results where id = p_result_id));']],
    expect: 'FAIL: boshqaning natijasiga sertifikat berildi',
  },
  {
    id: 'cert-revoke-anyone',
    why: 'sertifikatni istalgan odam bekor qila olsa',
    file: '0005_certificates.sql',
    subs: [["  if not public.has_role(array['owner']::public.app_role[]) then\n    raise exception 'sertifikatni faqat egasi",
            "  if false then\n    raise exception 'sertifikatni faqat egasi"]],
    expect: 'FAIL: sertifikat egasi (foydalanuvchi) uni bekor qila oldi',
  },
  {
    id: 'cert-not-audited',
    why: 'sertifikat berilishi/bekor qilinishi jurnalga tushmasa',
    file: '0005_certificates.sql',
    subs: [['create trigger audit_certificates_trg\n  after insert or update on public.certificates\n  for each row execute function public.audit_certificates();', '']],
    expect: "FAIL: sertifikat berilishi/bekor qilinishi jurnalga tushmadi",
  },

  // ── 0006: server yozuvchi funksiyalar va sertifikatli test ──────────
  {
    id: 'record-for-clients',
    why: 'record_test_result() mijozga ham ochilsa (istalgan IQ ni yozadi)',
    file: '0006_record.sql',
    subs: [['grant execute on function public.record_test_result(uuid, uuid, text, bigint, text, jsonb, boolean, int, jsonb)\n  to service_role;',
            'grant execute on function public.record_test_result(uuid, uuid, text, bigint, text, jsonb, boolean, int, jsonb)\n  to service_role, authenticated;']],
    expect: 'record_test_result()',
  },
  {
    id: 'client-path-certified',
    why: 'qurilmadagi test jurnali "serverda o\'tgan" deb yozilsa',
    file: '0006_record.sql',
    subs: [['p_result, p_suspicious, p_points, p_responses, false, false);', 'p_result, p_suspicious, p_points, p_responses, true, true);']],
    expect: "FAIL: qurilmadagi test (submit-test) certified bo'lib yozildi",
  },
  {
    id: 'results-no-rate-limit',
    why: 'kunlik natijalar chegarasi olib tashlansa',
    file: '0006_record.sql',
    subs: [["created_at > now() - interval '24 hours') >= 100 then", "created_at > now() - interval '24 hours') >= 100000 then"]],
    expect: 'FAIL: kunlik chegara (natijalar)',
  },
  {
    id: 'points-no-daily-cap',
    why: 'kunlik ball chegarasi olib tashlansa',
    file: '0006_record.sql',
    subs: [['as $$ select 2000 $$;', 'as $$ select 2000000 $$;']],
    expect: 'FAIL: kunlik ball chegarasi ishlamadi',
  },
  {
    id: 'suspicious-gets-points',
    why: 'shubhali natija ham ball olsa',
    file: '0006_record.sql',
    subs: [["100 tadan ortiq natija yozilmaydi' using errcode = 'ZK429';\n  end if;\n\n  granted := case when coalesce(p_suspicious, false) then 0",
            "100 tadan ortiq natija yozilmaydi' using errcode = 'ZK429';\n  end if;\n\n  granted := case when false then 0"]],
    expect: 'FAIL: shubhali natija ball oldi',
  },
  {
    id: 'sessions-readable',
    why: 'mijoz o\'z sessiyasini (urug\'ini) o\'qiy olsa',
    file: '0006_record.sql',
    subs: [['revoke all on public.test_sessions from anon, authenticated;',
            'revoke all on public.test_sessions from anon, authenticated;\ngrant select on public.test_sessions to authenticated;\n' +
            'create policy sessions_self on public.test_sessions for select to authenticated using (user_id = auth.uid());']],
    expect: "FAIL: mijoz o'z sessiyasining urug'ini o'qidi",
  },
  {
    id: 'session-min-ms-off',
    why: 'server tez (skript) javobni rad etmasa',
    file: '0006_record.sql',
    subs: [['  if ms < greatest(coalesce(p_min_ms, 300), 300) then', '  if false then']],
    expect: "FAIL: 300 ms dan tez javob qabul qilindi",
  },
  {
    id: 'session-min-ms-trusts-caller',
    why: 'eng kam vaqtni chaqiruvchi pasaytira olsa',
    file: '0006_record.sql',
    subs: [['  if ms < greatest(coalesce(p_min_ms, 300), 300) then', '  if ms < coalesce(p_min_ms, 300) then']],
    expect: 'FAIL: min_ms = 0 bilan tez javob',
  },
  {
    id: 'session-other-user',
    why: 'boshqaning sessiyasiga javob yozish mumkin bo\'lsa',
    file: '0006_record.sql',
    subs: [["  if s.id is null or s.user_id is distinct from p_user then\n    raise exception 'sessiya topilmadi' using errcode = 'ZK404';\n  end if;\n  if s.state <> 'open' then\n    raise exception 'sessiya yopilgan' using errcode = 'ZK410';\n  end if;\n  if now() > s.deadline",
            "  if s.id is null then\n    raise exception 'sessiya topilmadi' using errcode = 'ZK404';\n  end if;\n  if s.state <> 'open' then\n    raise exception 'sessiya yopilgan' using errcode = 'ZK410';\n  end if;\n  if now() > s.deadline"]],
    expect: 'FAIL: boshqaning sessiyasiga javob yozildi',
  },
  {
    id: 'session-double-answer',
    why: 'bir savolga ikki marta javob yozilsa',
    file: '0006_record.sql',
    subs: [["  if p_index is distinct from jsonb_array_length(s.log) then\n    raise exception 'bu savolga allaqachon javob berilgan' using errcode = 'ZK409';\n  end if;\n", '']],
    expect: 'FAIL: bir savolga ikki marta javob yozildi',
  },
  {
    id: 'session-no-deadline',
    why: 'muddati o\'tgan sessiyaga javob qabul qilinsa',
    file: '0006_record.sql',
    subs: [["  if now() > s.deadline then\n    raise exception 'sessiya muddati tugagan' using errcode = 'ZK410';\n  end if;\n", '']],
    expect: "FAIL: muddati o'tgan sessiyaga javob qabul qilindi",
  },
  {
    id: 'session-finish-incomplete',
    why: 'tugamagan sessiya "done" bo\'lib yakunlansa (sertifikat bilan)',
    file: '0006_record.sql',
    subs: [["  if p_state = 'done' and jsonb_array_length(s.log) <> s.length then", "  if false then"]],
    expect: 'FAIL: tugamagan sessiya "done" bo\'lib yakunlandi',
  },
  {
    id: 'session-expired-certificate',
    why: 'muddati o\'tgan sessiya sertifikat bersa',
    file: '0006_record.sql',
    subs: [["coalesce(p_eligible, false) and p_state = 'done' and s.length >= 30);", 'coalesce(p_eligible, false));']],
    expect: "FAIL: muddati o'tgan sessiya sertifikat berdi",
  },
  {
    id: 'session-daily-unlimited',
    why: 'kunlik sertifikatli test chegarasi olib tashlansa',
    file: '0006_record.sql',
    subs: [["started_at > now() - interval '24 hours') >= 3 then", "started_at > now() - interval '24 hours') >= 300 then"]],
    expect: 'FAIL: kunlik sertifikatli test chegarasi (3)',
  },
];
