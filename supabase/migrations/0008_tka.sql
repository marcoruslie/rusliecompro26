-- TKA module: web rebuild of the legacy DOS (Clipper) accounting program in PRG/PEER.
--
-- Legacy layout: one DBF per document type per year (JLH___25.DBF, KKD___25.DBF, …).
-- Here every year lives in one table with a `tahun` column. Document headers and
-- lines are stored generically (tka_doc / tka_doc_line) with the original legacy
-- fields kept in JSONB, while everything the reports need is posted into typed
-- tables, exactly like the legacy posting files:
--   RACC  -> tka_jurnal      (general ledger lines)
--   ACD   -> tka_saldo_awal  (opening balance per account per year, from period 01)
--   RHPP  -> tka_mutasi      (stock movements)
--   RIN   -> tka_stok_awal   (opening stock per item per year, from period 01)
--   RHP   -> tka_hp          (customer / supplier invoice register)
--   RGR   -> tka_giro        (cheque / giro register)
-- Balances are always the year's opening + postings, so the app never rewrites
-- historical balance snapshots. `tka_tutup_tahun` rolls a year forward.

-- ───────────────────────────── master data ─────────────────────────────

create table if not exists public.tka_acc (
  acc text primary key,
  name text not null default '',
  accgroup int not null default 1,          -- 1 aktiva 2 hutang 3 modal 4 penjualan 5 HPP/biaya 6 pend. lain 7 biaya lain
  accinduk text not null default '',
  detil text not null default 'D',          -- D = detail (postable), I = induk (header)
  level int not null default 1,
  dk text not null default 'D',             -- normal balance side
  status text not null default '',
  chuser text not null default ''
);

create table if not exists public.tka_cusg (
  cusg text primary key,
  name text not null default '',
  acc text not null default '',
  chuser text not null default ''
);

create table if not exists public.tka_cus (
  cus text primary key,
  cusg text not null default '',
  name text not null default '',
  acc text not null default '',
  address1 text not null default '', address2 text not null default '',
  address3 text not null default '', address4 text not null default '',
  telp text not null default '', fax text not null default '',
  city text not null default '', npwp text not null default '',
  rem1 text not null default '', rem2 text not null default '',
  chuser text not null default ''
);

create table if not exists public.tka_sup (
  sup text primary key,
  name text not null default '',
  acc text not null default '',
  address1 text not null default '', address2 text not null default '',
  address3 text not null default '', address4 text not null default '',
  telp text not null default '', fax text not null default '',
  city text not null default '', npwp text not null default '',
  chuser text not null default ''
);

create table if not exists public.tka_gol (
  gol text primary key,
  name text not null default '',
  id text not null default 'F',             -- F = barang jadi, R = bahan baku
  chuser text not null default ''
);

create table if not exists public.tka_inv (
  gol text not null,
  inv text not null,
  name text not null default '',
  nameid text not null default '',
  nogudang text not null default '',
  acc text not null default '',
  sub text not null default '',
  loc text not null default '01',
  price numeric not null default 0, price1 numeric not null default 0, price2 numeric not null default 0,
  unit text not null default '', unit1 text not null default '', unit2 text not null default '',
  konver1 numeric not null default 0, konver2 numeric not null default 0,
  ongkos numeric not null default 0, ongkos1 numeric not null default 0,
  berat numeric not null default 0, dmeter numeric not null default 0,
  golb text not null default '', invb text not null default '',
  pricebl numeric not null default 0,
  hppmin numeric not null default 0,        -- standard cost used for HPP and production value
  rem text not null default '', rem2 text not null default '',
  chuser text not null default '',
  primary key (gol, inv)
);
create index if not exists tka_inv_inv_idx on public.tka_inv (inv);

create table if not exists public.tka_loc (
  loc text primary key,
  name text not null default '',
  chuser text not null default ''
);

create table if not exists public.tka_bank (
  id bigserial primary key,
  bank text not null default '',
  norek text not null default '',
  capem text not null default '',
  chuser text not null default ''
);

create table if not exists public.tka_biaya (
  biaya text primary key,
  chuser text not null default ''
);

-- Legacy TKA.DBF ("tenaga kerja"): workers. `acc_biaya` is the wage expense
-- account (legacy second ACC column), `accpiut` the employee-loan account.
create table if not exists public.tka_pekerja (
  tka text primary key,
  name text not null default '',
  acc text not null default '',
  accpiut text not null default '',
  acc_biaya text not null default '',
  address1 text not null default '', address2 text not null default '',
  address3 text not null default '', address4 text not null default '',
  telp text not null default '',
  tgl_masuk date,
  bagian text not null default '',
  idcard text not null default '',
  city text not null default '',
  birtdate date,
  chuser text not null default ''
);

-- Legacy TACC.DBF: the accounts the posting engine uses.
create table if not exists public.tka_setting (
  id int primary key default 1 check (id = 1),
  acckas text not null default '', accgiro text not null default '', accpiut text not null default '',
  accinvbb text not null default '', accinvbj text not null default '', acchgiro text not null default '',
  acchut text not null default '', accppnbli text not null default '', accppnjlh text not null default '',
  acclslaba text not null default '', accnxlaba text not null default '',
  accjlhp text not null default '', accjlhe text not null default '', accjlht text not null default '',
  accrjl text not null default '', acchppp text not null default '', acchppe text not null default '',
  acchppt text not null default '', accdisc text not null default '', accdiss text not null default '',
  accpajak text not null default '', accuh text not null default '', accul text not null default '',
  accum text not null default '', accux text not null default '',
  company_name text not null default 'TKA',
  company_address text not null default 'Surabaya',
  chuser text not null default ''
);
insert into public.tka_setting (id) values (1) on conflict do nothing;

-- ───────────────────────────── documents ─────────────────────────────
-- jnl codes: POP order partai, POE order eceran, JLH nota penjualan, RJL retur jual,
-- BPB penerimaan barang, BLI faktur pembelian, RBL retur beli, BBK bahan keluar,
-- BHP hasil produksi, KOR koreksi persediaan, OPN stock opname, KM kas masuk,
-- KK kas keluar, BM bank masuk, BK bank keluar, JNL jurnal umum.

create table if not exists public.tka_doc (
  id bigserial primary key,
  jnl text not null,
  tahun int not null,
  nomor text not null,
  tanggal date not null,
  sub text not null default '',             -- customer / supplier / worker code
  subname text not null default '',
  total numeric not null default 0,
  rem text not null default '',
  h jsonb not null default '{}'::jsonb,     -- remaining header fields (legacy names, lower-case)
  legacy boolean not null default false,    -- imported from the DOS program
  chuser text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jnl, tahun, nomor)
);
create index if not exists tka_doc_jnl_tgl_idx on public.tka_doc (jnl, tanggal desc);
create index if not exists tka_doc_sub_idx on public.tka_doc (jnl, sub);

create table if not exists public.tka_doc_line (
  id bigserial primary key,
  doc_id bigint not null references public.tka_doc(id) on delete cascade,
  urut int not null default 0,
  acc text not null default '',
  gol text not null default '',
  inv text not null default '',
  invname text not null default '',
  qty numeric not null default 0,
  unit text not null default '',
  price numeric not null default 0,
  val numeric not null default 0,
  dk text not null default '',
  nota text not null default '',
  jnlno text not null default '',
  tka text not null default '',
  rem text not null default '',
  d jsonb not null default '{}'::jsonb      -- remaining line fields
);
create index if not exists tka_doc_line_doc_idx on public.tka_doc_line (doc_id, urut);
create index if not exists tka_doc_line_inv_idx on public.tka_doc_line (gol, inv);
create index if not exists tka_doc_line_jnlno_idx on public.tka_doc_line (jnlno) where jnlno <> '';
create index if not exists tka_doc_line_tka_idx on public.tka_doc_line (tka) where tka <> '';

-- ───────────────────────────── postings ─────────────────────────────

create table if not exists public.tka_jurnal (
  id bigserial primary key,
  doc_id bigint references public.tka_doc(id) on delete cascade,
  giro_id bigint,
  tahun int not null,
  tanggal date not null,
  jnl text not null,                        -- legacy codes: 498 KM, 499 BM, 500 KK, 501 BK, JLH, BLI, BHP, RGR, …
  nomor text not null default '',
  id_cs text not null default '',           -- C customer, S supplier
  sub text not null default '',
  subname text not null default '',
  acc text not null,
  bg text not null default '',
  bgdue date,
  rem text not null default '',
  debet numeric not null default 0,
  kredit numeric not null default 0
);
create index if not exists tka_jurnal_acc_idx on public.tka_jurnal (acc, tanggal);
create index if not exists tka_jurnal_tahun_idx on public.tka_jurnal (tahun, acc);
create index if not exists tka_jurnal_doc_idx on public.tka_jurnal (doc_id);
create index if not exists tka_jurnal_giro_idx on public.tka_jurnal (giro_id) where giro_id is not null;
create index if not exists tka_jurnal_nomor_idx on public.tka_jurnal (jnl, tahun, nomor);

create table if not exists public.tka_saldo_awal (
  tahun int not null,
  acc text not null,
  awal numeric not null default 0,          -- debet minus kredit at 1 January
  primary key (tahun, acc)
);

create table if not exists public.tka_mutasi (
  id bigserial primary key,
  doc_id bigint references public.tka_doc(id) on delete cascade,
  tahun int not null,
  tanggal date not null,
  jnl text not null,
  nomor text not null default '',
  jnlno text not null default '',
  sub text not null default '',
  subname text not null default '',
  nota text not null default '',
  loc text not null default '01',
  gol text not null,
  inv text not null,
  unit text not null default '',
  price numeric not null default 0,
  qin numeric not null default 0,
  qout numeric not null default 0,
  vin numeric not null default 0,
  vout numeric not null default 0
);
create index if not exists tka_mutasi_inv_idx on public.tka_mutasi (gol, inv, tanggal);
create index if not exists tka_mutasi_tahun_idx on public.tka_mutasi (tahun, gol, inv);
create index if not exists tka_mutasi_doc_idx on public.tka_mutasi (doc_id);

create table if not exists public.tka_stok_awal (
  tahun int not null,
  loc text not null default '01',
  gol text not null,
  inv text not null,
  unit text not null default '',
  qty numeric not null default 0,
  val numeric not null default 0,
  primary key (tahun, loc, gol, inv)
);

-- Invoice register (RHP merged across years; newest legacy year wins).
-- Outstanding = val - payment_legacy - valret_legacy - payments/returns in tka_bayar.
create table if not exists public.tka_hp (
  id bigserial primary key,
  id_cs text not null,                      -- C piutang customer, S hutang supplier
  nomor text not null,
  nkey text not null,                       -- normalised nota number used for matching
  tanggal date,
  sub text not null default '',
  subname text not null default '',
  nota text not null default '',
  notadate date,
  duedate date,
  val numeric not null default 0,
  payment_legacy numeric not null default 0,
  valret_legacy numeric not null default 0,
  rem text not null default '',
  doc_id bigint references public.tka_doc(id) on delete set null,
  unique (id_cs, nkey)
);
create index if not exists tka_hp_sub_idx on public.tka_hp (id_cs, sub);

create table if not exists public.tka_bayar (
  id bigserial primary key,
  doc_id bigint references public.tka_doc(id) on delete cascade,
  id_cs text not null,
  kind text not null default 'P',           -- P payment, R return
  nkey text not null,
  nota text not null default '',
  tanggal date not null,
  nomor text not null default '',
  val numeric not null default 0
);
create index if not exists tka_bayar_key_idx on public.tka_bayar (id_cs, nkey);
create index if not exists tka_bayar_doc_idx on public.tka_bayar (doc_id);

create table if not exists public.tka_giro (
  id bigserial primary key,
  doc_id bigint references public.tka_doc(id) on delete set null,
  status text not null default '',          -- '' masuk (dari customer), '1' keluar (ke supplier)
  nomor text not null default '',
  tanggal date,
  sub text not null default '',
  subname text not null default '',
  bg text not null,
  acc text not null default '',             -- giro account debited/credited by the voucher
  acc1 text not null default '',            -- bank account used when cashed
  bank text not null default '',
  bgdue date,
  bgval numeric not null default 0,
  bgrem text not null default '',
  cairdate date,
  cair text not null default ''             -- '' terbuka, C cair, T tolak
);
create index if not exists tka_giro_bg_idx on public.tka_giro (bg);
create index if not exists tka_giro_open_idx on public.tka_giro (cair, bgdue);

alter table public.tka_jurnal
  drop constraint if exists tka_jurnal_giro_fk,
  add constraint tka_jurnal_giro_fk foreign key (giro_id) references public.tka_giro(id) on delete cascade;

-- Import diagnostics (anything the importer could not place).
create table if not exists public.tka_import_log (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  tabel text not null,
  pesan text not null
);

-- ───────────────────────────── RLS ─────────────────────────────

do $$
declare t text;
begin
  foreach t in array array['tka_acc','tka_cusg','tka_cus','tka_sup','tka_gol','tka_inv','tka_loc','tka_bank',
    'tka_biaya','tka_pekerja','tka_setting','tka_doc','tka_doc_line','tka_jurnal','tka_saldo_awal','tka_mutasi',
    'tka_stok_awal','tka_hp','tka_bayar','tka_giro','tka_import_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated full access" on public.%I', t);
    execute format('create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ───────────────────────────── helpers ─────────────────────────────

-- 'MK0170' and 'MK170' are the same nota: strip zero padding inside digit runs.
create or replace function public.tka_nkey(p text)
returns text language sql immutable as $$
  select regexp_replace(upper(regexp_replace(coalesce(p, ''), '\s', '', 'g')), '(^|[^0-9])0+([0-9])', '\1\2', 'g')
$$;

-- Legacy year/month letters: KK/\A/0001 = 2025 January (year letter = chr(65 + year - 1998)).
create or replace function public.tka_ym_code(p date)
returns text language sql immutable as $$
  select chr(65 + extract(year from p)::int - 1998) || chr(64 + extract(month from p)::int)
$$;

-- Next document number. Cash/bank vouchers use the legacy PREFIX/YM/NNNN pattern
-- (sequence per month); everything else increments the last number used that year.
create or replace function public.tka_next_nomor(p_jnl text, p_tanggal date)
returns text language plpgsql stable as $$
declare
  v_prefix text;
  v_last text;
  v_num text;
  v_n bigint;
begin
  v_prefix := case p_jnl when 'KM' then 'KM/' when 'KK' then 'KK/' when 'BM' then 'BM/'
                         when 'BK' then 'BK/' when 'KOR' then 'KR/' when 'JNL' then 'JU/' else null end;
  if v_prefix is not null then
    v_prefix := v_prefix || public.tka_ym_code(p_tanggal) || '/';
    select max(substring(nomor from length(v_prefix) + 1)) into v_last
      from public.tka_doc
     where jnl = p_jnl and tahun = extract(year from p_tanggal)::int and nomor like replace(replace(v_prefix, '\', '\\'), '_', '\_') || '%';
    v_n := coalesce(nullif(regexp_replace(coalesce(v_last, ''), '\D', '', 'g'), '')::bigint, 0) + 1;
    return v_prefix || lpad(v_n::text, 4, '0');
  end if;

  select nomor into v_last from public.tka_doc
   where jnl = p_jnl and tahun = extract(year from p_tanggal)::int
   order by created_at desc, id desc limit 1;
  if v_last is null then
    return case p_jnl when 'POP' then '1001' else '001' end;
  end if;
  v_num := substring(v_last from '(\d+)\D*$');
  if v_num is null then return v_last || '-1'; end if;
  v_n := v_num::bigint + 1;
  return regexp_replace(v_last, '\d+(\D*)$', lpad(v_n::text, length(v_num), '0') || '\1');
end $$;

create or replace function public.tka_jnl_code(p_jnl text)
returns text language sql immutable as $$
  select case p_jnl when 'KM' then '498' when 'BM' then '499' when 'KK' then '500' when 'BK' then '501' else p_jnl end
$$;

-- ───────────────────────────── posting engine ─────────────────────────────

-- Cost of a sales / production line. Imported lines carry the exact legacy cost
-- (hpp_val for hpp_qty units); otherwise unit cost d.hpp, else the item's
-- standard cost (TKA_INV.HPPMIN), as the legacy program did.
create or replace function public.tka_line_cost(p_d jsonb, p_gol text, p_inv text, p_qty numeric)
returns numeric language sql stable as $$
  select case
    when nullif(p_d->>'hpp_val', '') is not null and (p_d->>'hpp_qty')::numeric = p_qty then (p_d->>'hpp_val')::numeric
    when nullif(p_d->>'hpp', '') is not null then round(p_qty * (p_d->>'hpp')::numeric, 2)
    else round(p_qty * coalesce((select hppmin from public.tka_inv i where i.gol = p_gol and i.inv = p_inv), 0), 2)
  end
$$;

create or replace function public.tka_post(p_doc_id bigint)
returns void language plpgsql security invoker as $$
declare
  d public.tka_doc%rowtype;
  s public.tka_setting%rowtype;
  l record;
  v_acc text;
  v_hpp numeric;
  v_cost numeric;
  v_code text;
  v_id_cs text;
  v_d numeric; v_k numeric;
  v_disc numeric; v_ppn numeric;
begin
  select * into d from public.tka_doc where id = p_doc_id;
  if not found then raise exception 'Dokumen % tidak ditemukan', p_doc_id; end if;
  select * into s from public.tka_setting where id = 1;
  v_code := public.tka_jnl_code(d.jnl);

  delete from public.tka_jurnal where doc_id = p_doc_id;
  delete from public.tka_mutasi where doc_id = p_doc_id;
  delete from public.tka_bayar where doc_id = p_doc_id;
  delete from public.tka_giro where doc_id = p_doc_id and cair = '';

  -- Cash / bank vouchers and general journal: every line is a ledger line.
  if d.jnl in ('KM','KK','BM','BK','JNL') then
    v_id_cs := case when d.jnl in ('KM','BM') then 'C' when d.jnl in ('KK','BK') then 'S' else '' end;
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.acc = '' or l.val = 0 then continue; end if;
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, bg, bgdue, rem, debet, kredit)
      values (p_doc_id, d.tahun, d.tanggal, v_code, d.nomor, v_id_cs, d.sub, d.subname, l.acc,
              coalesce(l.d->>'bg', ''), nullif(l.d->>'bgdue', '')::date, l.rem,
              case when l.dk = 'D' then l.val else 0 end, case when l.dk = 'K' then l.val else 0 end);
      if l.nota <> '' and ((v_id_cs = 'C' and l.dk = 'K') or (v_id_cs = 'S' and l.dk = 'D')) then
        insert into public.tka_bayar (doc_id, id_cs, kind, nkey, nota, tanggal, nomor, val)
        values (p_doc_id, v_id_cs, 'P', public.tka_nkey(l.nota), l.nota, d.tanggal, d.nomor, l.val);
      end if;
      if coalesce(l.d->>'bg', '') <> '' and v_id_cs <> ''
         and ((v_id_cs = 'C' and l.dk = 'D') or (v_id_cs = 'S' and l.dk = 'K'))
         and not exists (select 1 from public.tka_giro g where g.bg = l.d->>'bg' and g.cair <> '') then
        insert into public.tka_giro (doc_id, status, nomor, tanggal, sub, subname, bg, acc, bank, bgdue, bgval, bgrem)
        values (p_doc_id, case when v_id_cs = 'S' then '1' else '' end, d.nomor, d.tanggal, d.sub, d.subname,
                l.d->>'bg', l.acc, coalesce(l.d->>'bank', ''), nullif(l.d->>'bgdue', '')::date, l.val,
                coalesce(nullif(l.d->>'bgrem', ''), l.rem));
      end if;
    end loop;
    select coalesce(sum(debet), 0), coalesce(sum(kredit), 0) into v_d, v_k from public.tka_jurnal where doc_id = p_doc_id;
    if round(v_d, 2) <> round(v_k, 2) then
      raise exception 'Jurnal tidak seimbang: debet % ≠ kredit %', v_d, v_k;
    end if;

  -- Nota penjualan: piutang / penjualan per line, HPP / persediaan barang jadi at standard cost.
  elsif d.jnl = 'JLH' then
    select coalesce(nullif(c.acc, ''), s.accpiut) into v_acc from public.tka_cus c where c.cus = d.sub;
    v_acc := coalesce(v_acc, s.accpiut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      if l.val <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, v_acc, l.invname, l.val, 0),
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname,
           case coalesce(l.d->>'tk', '') when 'E' then s.accjlhe when 'T' then s.accjlht else s.accjlhp end, l.invname, 0, l.val);
      end if;
      if v_cost <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname,
           case coalesce(l.d->>'tk', '') when 'E' then s.acchppe when 'T' then s.acchppt else s.acchppp end, l.invname, v_cost, 0),
          (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, s.accinvbj, l.invname, 0, v_cost);
      end if;
      if l.inv <> '' then
        insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, jnlno, sub, subname, loc, gol, inv, unit, price, qout, vout)
        values (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, l.jnlno, d.sub, d.subname, coalesce(nullif(d.h->>'loc', ''), '01'),
                l.gol, l.inv, l.unit, l.price, l.qty, v_cost);
      end if;
    end loop;
    v_disc := coalesce(nullif(d.h->>'discval', '')::numeric, 0);
    v_ppn := coalesce(nullif(d.h->>'ppnval', '')::numeric, 0);
    if v_disc <> 0 then
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, s.accdisc, 'DISKON PENJUALAN', v_disc, 0),
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, v_acc, 'DISKON PENJUALAN', 0, v_disc);
    end if;
    if v_ppn <> 0 and s.accppnjlh <> '' then
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, v_acc, 'PPN KELUARAN', v_ppn, 0),
        (p_doc_id, d.tahun, d.tanggal, 'JLH', d.nomor, 'C', d.sub, d.subname, s.accppnjlh, 'PPN KELUARAN', 0, v_ppn);
    end if;
    perform public.tka_upsert_hp(d, 'C');

  -- Retur penjualan: retur / piutang, barang kembali ke persediaan.
  elsif d.jnl = 'RJL' then
    select coalesce(nullif(c.acc, ''), s.accpiut) into v_acc from public.tka_cus c where c.cus = d.sub;
    v_acc := coalesce(v_acc, s.accpiut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      if l.val <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, s.accrjl, l.invname, l.val, 0),
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, v_acc, l.invname, 0, l.val);
        if l.nota <> '' then
          insert into public.tka_bayar (doc_id, id_cs, kind, nkey, nota, tanggal, nomor, val)
          values (p_doc_id, 'C', 'R', public.tka_nkey(l.nota), l.nota, d.tanggal, d.nomor, l.val);
        end if;
      end if;
      if v_cost <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, s.accinvbj, l.invname, v_cost, 0),
          (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, 'C', d.sub, d.subname, s.acchppp, l.invname, 0, v_cost);
      end if;
      if l.inv <> '' then
        insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, nota, loc, gol, inv, unit, price, qin, vin)
        values (p_doc_id, d.tahun, d.tanggal, 'RJL', d.nomor, d.sub, d.subname, l.nota, coalesce(nullif(d.h->>'loc', ''), '01'),
                l.gol, l.inv, l.unit, l.price, l.qty, v_cost);
      end if;
    end loop;

  -- Penerimaan barang: stock in; value comes from the matching faktur pembelian line.
  elsif d.jnl = 'BPB' then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      select coalesce(sum(fl.val), 0), max(fl.price) into v_cost, v_hpp
        from public.tka_doc_line fl join public.tka_doc f on f.id = fl.doc_id
       where f.jnl = 'BLI' and fl.jnlno = d.nomor and fl.gol = l.gol and fl.inv = l.inv
         and extract(year from nullif(fl.d->>'jnldate', '')::date) = d.tahun;
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, nota, loc, gol, inv, unit, price, qin, vin)
      values (p_doc_id, d.tahun, d.tanggal, 'BPB', d.nomor, d.sub, d.subname, d.nomor, coalesce(nullif(d.h->>'loc', ''), '01'),
              l.gol, l.inv, l.unit, coalesce(v_hpp, 0), l.qty, v_cost);
    end loop;

  -- Faktur pembelian: persediaan bahan baku / hutang. Re-values the referenced BPB.
  elsif d.jnl = 'BLI' then
    select coalesce(nullif(x.acc, ''), s.acchut) into v_acc from public.tka_sup x where x.sup = d.sub;
    v_acc := coalesce(v_acc, s.acchut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.val = 0 then continue; end if;
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, s.accinvbb, l.invname, l.val, 0),
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, v_acc, l.invname, 0, l.val);
    end loop;
    v_ppn := coalesce(nullif(d.h->>'ppnval', '')::numeric, 0);
    if v_ppn <> 0 and s.accppnbli <> '' then
      insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, s.accppnbli, 'PPN MASUKAN', v_ppn, 0),
        (p_doc_id, d.tahun, d.tanggal, 'BLI', d.nomor, 'S', d.sub, d.subname, v_acc, 'PPN MASUKAN', 0, v_ppn);
    end if;
    perform public.tka_upsert_hp(d, 'S');
    update public.tka_mutasi m
       set vin = x.val, price = x.price
      from (select fl.jnlno, extract(year from nullif(fl.d->>'jnldate', '')::date)::int as th, fl.gol, fl.inv,
                   sum(fl.val) as val, max(fl.price) as price
              from public.tka_doc_line fl where fl.doc_id = p_doc_id and fl.jnlno <> ''
             group by 1, 2, 3, 4) x
     where m.jnl = 'BPB' and m.nomor = x.jnlno and m.tahun = x.th and m.gol = x.gol and m.inv = x.inv;

  -- Retur pembelian: hutang / persediaan bahan baku, stock out.
  elsif d.jnl = 'RBL' then
    select coalesce(nullif(x.acc, ''), s.acchut) into v_acc from public.tka_sup x where x.sup = d.sub;
    v_acc := coalesce(v_acc, s.acchut);
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.val <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'RBL', d.nomor, 'S', d.sub, d.subname, v_acc, l.invname, l.val, 0),
          (p_doc_id, d.tahun, d.tanggal, 'RBL', d.nomor, 'S', d.sub, d.subname, s.accinvbb, l.invname, 0, l.val);
        if l.nota <> '' then
          insert into public.tka_bayar (doc_id, id_cs, kind, nkey, nota, tanggal, nomor, val)
          values (p_doc_id, 'S', 'R', public.tka_nkey(l.nota), l.nota, d.tanggal, d.nomor, l.val);
        end if;
      end if;
      if l.inv <> '' then
        insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, nota, loc, gol, inv, unit, price, qout, vout)
        values (p_doc_id, d.tahun, d.tanggal, 'RBL', d.nomor, d.sub, d.subname, l.nota, coalesce(nullif(d.h->>'loc', ''), '01'),
                l.gol, l.inv, l.unit, l.price, l.qty, l.val);
      end if;
    end loop;

  -- Bahan keluar ke pekerja: raw material out at standard cost (no ledger lines, as legacy).
  elsif d.jnl = 'BBK' then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, loc, gol, inv, unit, price, qout, vout)
      values (p_doc_id, d.tahun, d.tanggal, 'BBK', d.nomor, d.sub, d.subname, coalesce(nullif(d.h->>'loc', ''), '01'),
              l.gol, l.inv, l.unit, case when l.qty <> 0 then round(v_cost / l.qty, 4) else 0 end, l.qty, v_cost);
    end loop;

  -- Hasil produksi: barang jadi masuk at standard cost; persediaan barang jadi / bahan baku.
  elsif d.jnl = 'BHP' then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      v_cost := public.tka_line_cost(l.d, l.gol, l.inv, l.qty);
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, sub, subname, loc, gol, inv, unit, price, qin, vin)
      values (p_doc_id, d.tahun, d.tanggal, 'BHP', d.nomor, coalesce(nullif(l.tka, ''), d.sub),
              coalesce(nullif(l.d->>'tkaname', ''), d.subname), coalesce(nullif(d.h->>'loc', ''), '01'),
              l.gol, l.inv, l.unit, case when l.qty <> 0 then round(v_cost / l.qty, 4) else 0 end, l.qty, v_cost);
      if v_cost <> 0 then
        insert into public.tka_jurnal (doc_id, tahun, tanggal, jnl, nomor, sub, subname, acc, rem, debet, kredit) values
          (p_doc_id, d.tahun, d.tanggal, 'BHP', d.nomor, coalesce(nullif(l.tka, ''), d.sub), d.subname, s.accinvbj, 'Prod. ' || l.invname, v_cost, 0),
          (p_doc_id, d.tahun, d.tanggal, 'BHP', d.nomor, coalesce(nullif(l.tka, ''), d.sub), d.subname, s.accinvbb, 'Prod. ' || l.invname, 0, v_cost);
      end if;
    end loop;

  -- Koreksi persediaan / stock opname: + masuk, - keluar, value as entered.
  elsif d.jnl in ('KOR','OPN') then
    for l in select * from public.tka_doc_line where doc_id = p_doc_id order by urut, id loop
      if l.inv = '' then continue; end if;
      insert into public.tka_mutasi (doc_id, tahun, tanggal, jnl, nomor, loc, gol, inv, unit, price, qin, qout, vin, vout)
      values (p_doc_id, d.tahun, d.tanggal, d.jnl, d.nomor, coalesce(nullif(d.h->>'loc', ''), '01'), l.gol, l.inv, l.unit, l.price,
              case when l.dk = '-' then 0 else l.qty end, case when l.dk = '-' then l.qty else 0 end,
              case when l.dk = '-' then 0 else l.val end, case when l.dk = '-' then l.val else 0 end);
    end loop;
  end if;
  -- POP / POE (orders) have no postings.
end $$;

create or replace function public.tka_upsert_hp(d public.tka_doc, p_id_cs text)
returns void language plpgsql as $$
begin
  insert into public.tka_hp (id_cs, nomor, nkey, tanggal, sub, subname, nota, notadate, duedate, val, rem, doc_id)
  values (p_id_cs, d.nomor, public.tka_nkey(d.nomor), d.tanggal, d.sub, d.subname, d.nomor, d.tanggal,
          coalesce(nullif(d.h->>'duedate', '')::date, d.tanggal), d.total, d.rem, d.id)
  on conflict (id_cs, nkey) do update
     set nomor = excluded.nomor, tanggal = excluded.tanggal, sub = excluded.sub, subname = excluded.subname,
         notadate = excluded.notadate, duedate = excluded.duedate, val = excluded.val, doc_id = excluded.doc_id;
end $$;

-- Save a document (header + lines) and post it, atomically.
-- p: { id?, jnl, nomor?, tanggal, sub, subname, total, rem, h:{}, lines:[{acc,gol,inv,invname,qty,unit,price,val,dk,nota,jnlno,tka,rem,d:{}}] }
create or replace function public.tka_save_doc(p jsonb)
returns bigint language plpgsql security invoker as $$
declare
  v_id bigint := nullif(p->>'id', '')::bigint;
  v_tgl date := (p->>'tanggal')::date;
  v_nomor text := nullif(trim(coalesce(p->>'nomor', '')), '');
  v_user text := coalesce(split_part(auth.jwt()->>'email', '@', 1), 'system');
  l jsonb;
  i int := 0;
begin
  if v_tgl is null then raise exception 'Tanggal wajib diisi'; end if;
  if v_nomor is null then v_nomor := public.tka_next_nomor(p->>'jnl', v_tgl); end if;

  if v_id is null then
    insert into public.tka_doc (jnl, tahun, nomor, tanggal, sub, subname, total, rem, h, chuser)
    values (p->>'jnl', extract(year from v_tgl)::int, v_nomor, v_tgl, coalesce(p->>'sub', ''), coalesce(p->>'subname', ''),
            coalesce(nullif(p->>'total', '')::numeric, 0), coalesce(p->>'rem', ''), coalesce(p->'h', '{}'::jsonb),
            to_char(now(), 'DD/MM/YY HH24:MI ') || v_user)
    returning id into v_id;
  else
    update public.tka_doc
       set tahun = extract(year from v_tgl)::int, nomor = v_nomor, tanggal = v_tgl,
           sub = coalesce(p->>'sub', ''), subname = coalesce(p->>'subname', ''),
           total = coalesce(nullif(p->>'total', '')::numeric, 0), rem = coalesce(p->>'rem', ''),
           h = coalesce(p->'h', '{}'::jsonb), updated_at = now(),
           chuser = to_char(now(), 'DD/MM/YY HH24:MI ') || v_user
     where id = v_id;
    if not found then raise exception 'Dokumen % tidak ditemukan', v_id; end if;
    delete from public.tka_doc_line where doc_id = v_id;
  end if;

  for l in select * from jsonb_array_elements(coalesce(p->'lines', '[]'::jsonb)) loop
    i := i + 1;
    insert into public.tka_doc_line (doc_id, urut, acc, gol, inv, invname, qty, unit, price, val, dk, nota, jnlno, tka, rem, d)
    values (v_id, i, coalesce(l->>'acc', ''), coalesce(l->>'gol', ''), coalesce(l->>'inv', ''), coalesce(l->>'invname', ''),
            coalesce(nullif(l->>'qty', '')::numeric, 0), coalesce(l->>'unit', ''), coalesce(nullif(l->>'price', '')::numeric, 0),
            coalesce(nullif(l->>'val', '')::numeric, 0), coalesce(l->>'dk', ''), coalesce(l->>'nota', ''),
            coalesce(l->>'jnlno', ''), coalesce(l->>'tka', ''), coalesce(l->>'rem', ''), coalesce(l->'d', '{}'::jsonb));
  end loop;

  perform public.tka_post(v_id);
  -- A faktur pembelian re-values its BPB; a BPB picks up an existing faktur's value.
  return v_id;
end $$;

create or replace function public.tka_delete_doc(p_id bigint)
returns void language plpgsql security invoker as $$
begin
  delete from public.tka_hp where doc_id = p_id and payment_legacy = 0 and valret_legacy = 0
     and not exists (select 1 from public.tka_bayar b where b.id_cs = tka_hp.id_cs and b.nkey = tka_hp.nkey);
  update public.tka_hp set val = 0 where doc_id = p_id;
  delete from public.tka_doc where id = p_id;
end $$;

-- Cash a giro (C), bounce it (T), or reopen it (''). Posts journal RGR.
create or replace function public.tka_giro_status(p_id bigint, p_cair text, p_tanggal date, p_acc1 text)
returns void language plpgsql security invoker as $$
declare
  g public.tka_giro%rowtype;
  v_sub_acc text;
  s public.tka_setting%rowtype;
begin
  select * into g from public.tka_giro where id = p_id;
  if not found then raise exception 'Giro % tidak ditemukan', p_id; end if;
  select * into s from public.tka_setting where id = 1;
  delete from public.tka_jurnal where giro_id = p_id;
  update public.tka_giro set cair = coalesce(p_cair, ''), cairdate = case when coalesce(p_cair, '') = '' then null else p_tanggal end,
         acc1 = coalesce(nullif(p_acc1, ''), acc1)
   where id = p_id returning * into g;
  if g.cair = '' then return; end if;
  if g.cair = 'C' and g.acc1 = '' then raise exception 'Akun bank pencairan wajib diisi'; end if;
  if g.status = '1' then
    select coalesce(nullif(acc, ''), s.acchut) into v_sub_acc from public.tka_sup where sup = g.sub;
  else
    select coalesce(nullif(acc, ''), s.accpiut) into v_sub_acc from public.tka_cus where cus = g.sub;
  end if;
  v_sub_acc := coalesce(v_sub_acc, case when g.status = '1' then s.acchut else s.accpiut end);
  insert into public.tka_jurnal (giro_id, tahun, tanggal, jnl, nomor, id_cs, sub, subname, acc, bg, bgdue, rem, debet, kredit)
  select p_id, extract(year from p_tanggal)::int, p_tanggal, 'RGR', g.nomor, case when g.status = '1' then 'S' else 'C' end,
         g.sub, g.subname, x.acc, g.bg, g.bgdue, g.bg || ' ' || g.bgrem, x.debet, x.kredit
    from (values
      -- incoming giro: bank (or piutang when bounced) / giro account
      (case when g.status = '1' then g.acc else (case when g.cair = 'C' then g.acc1 else v_sub_acc end) end,
       g.bgval, 0::numeric),
      (case when g.status = '1' then (case when g.cair = 'C' then g.acc1 else v_sub_acc end) else g.acc end,
       0::numeric, g.bgval)
    ) as x(acc, debet, kredit);
end $$;

-- ───────────────────────────── reports ─────────────────────────────

-- Trial balance for months [p_dari..p_sampai] of a year, detail accounts only.
create or replace function public.tka_neraca_saldo(p_tahun int, p_dari int, p_sampai int)
returns table (acc text, name text, accgroup int, accinduk text, level int, awal numeric, debet numeric, kredit numeric, akhir numeric)
language sql stable as $$
  with mv as (
    select j.acc,
           sum(case when extract(month from j.tanggal) < p_dari then j.debet - j.kredit else 0 end) as pre,
           sum(case when extract(month from j.tanggal) between p_dari and p_sampai then j.debet else 0 end) as d,
           sum(case when extract(month from j.tanggal) between p_dari and p_sampai then j.kredit else 0 end) as k
      from public.tka_jurnal j
     where j.tahun = p_tahun and extract(month from j.tanggal) <= p_sampai
     group by j.acc
  ), accs as (
    select acc from mv union select acc from public.tka_saldo_awal where tahun = p_tahun
  )
  select a.acc, coalesce(m.name, '(akun tidak terdaftar)'), coalesce(m.accgroup, 0), coalesce(m.accinduk, ''), coalesce(m.level, 9),
         coalesce(sa.awal, 0) + coalesce(mv.pre, 0),
         coalesce(mv.d, 0), coalesce(mv.k, 0),
         coalesce(sa.awal, 0) + coalesce(mv.pre, 0) + coalesce(mv.d, 0) - coalesce(mv.k, 0)
    from accs a
    left join public.tka_acc m on m.acc = a.acc
    left join mv on mv.acc = a.acc
    left join public.tka_saldo_awal sa on sa.tahun = p_tahun and sa.acc = a.acc
   order by a.acc
$$;

-- General ledger card for one account between two dates (within one year).
create or replace function public.tka_buku_besar(p_acc text, p_dari date, p_sampai date)
returns table (tanggal date, jnl text, nomor text, sub text, subname text, rem text, bg text, debet numeric, kredit numeric, saldo numeric, doc_id bigint)
language sql stable as $$
  with awal as (
    select coalesce((select awal from public.tka_saldo_awal where tahun = extract(year from p_dari)::int and acc = p_acc), 0)
         + coalesce((select sum(debet - kredit) from public.tka_jurnal
                      where acc = p_acc and tahun = extract(year from p_dari)::int and tanggal < p_dari), 0) as v
  ), rows as (
    select j.tanggal, j.jnl, j.nomor, j.sub, j.subname, j.rem, j.bg, j.debet, j.kredit, j.doc_id, j.id
      from public.tka_jurnal j
     where j.acc = p_acc and j.tanggal between p_dari and p_sampai
  )
  select p_dari, 'AWAL', '', '', '', 'SALDO AWAL', '', 0::numeric, 0::numeric, (select v from awal), null::bigint
  union all
  select r.tanggal, r.jnl, r.nomor, r.sub, r.subname, r.rem, r.bg, r.debet, r.kredit,
         (select v from awal) + sum(r.debet - r.kredit) over (order by r.tanggal, r.id), r.doc_id
    from rows r
$$;

-- Stock position for months [p_dari..p_sampai] of a year.
create or replace function public.tka_posisi_stok(p_tahun int, p_dari int, p_sampai int)
returns table (gol text, inv text, name text, unit text, golid text,
               q_awal numeric, q_in numeric, q_out numeric, q_akhir numeric,
               v_awal numeric, v_in numeric, v_out numeric, v_akhir numeric)
language sql stable as $$
  with mv as (
    select m.gol, m.inv,
           sum(case when extract(month from m.tanggal) < p_dari then m.qin - m.qout else 0 end) as qpre,
           sum(case when extract(month from m.tanggal) < p_dari then m.vin - m.vout else 0 end) as vpre,
           sum(case when extract(month from m.tanggal) >= p_dari then m.qin else 0 end) as qi,
           sum(case when extract(month from m.tanggal) >= p_dari then m.qout else 0 end) as qo,
           sum(case when extract(month from m.tanggal) >= p_dari then m.vin else 0 end) as vi,
           sum(case when extract(month from m.tanggal) >= p_dari then m.vout else 0 end) as vo
      from public.tka_mutasi m
     where m.tahun = p_tahun and extract(month from m.tanggal) <= p_sampai
     group by m.gol, m.inv
  ), sa as (
    select s.gol, s.inv, sum(s.qty) as q, sum(s.val) as v from public.tka_stok_awal s where s.tahun = p_tahun group by 1, 2
  ), k as (
    select gol, inv from mv union select gol, inv from sa
  )
  select k.gol, k.inv, coalesce(i.name, ''), coalesce(i.unit, ''), coalesce(g.id, ''),
         coalesce(sa.q, 0) + coalesce(mv.qpre, 0), coalesce(mv.qi, 0), coalesce(mv.qo, 0),
         coalesce(sa.q, 0) + coalesce(mv.qpre, 0) + coalesce(mv.qi, 0) - coalesce(mv.qo, 0),
         coalesce(sa.v, 0) + coalesce(mv.vpre, 0), coalesce(mv.vi, 0), coalesce(mv.vo, 0),
         coalesce(sa.v, 0) + coalesce(mv.vpre, 0) + coalesce(mv.vi, 0) - coalesce(mv.vo, 0)
    from k
    left join mv on mv.gol = k.gol and mv.inv = k.inv
    left join sa on sa.gol = k.gol and sa.inv = k.inv
    left join public.tka_inv i on i.gol = k.gol and i.inv = k.inv
    left join public.tka_gol g on g.gol = k.gol
   order by k.gol, k.inv
$$;

create or replace function public.tka_kartu_stok(p_gol text, p_inv text, p_dari date, p_sampai date)
returns table (tanggal date, jnl text, nomor text, sub text, subname text, price numeric,
               qin numeric, qout numeric, q_saldo numeric, vin numeric, vout numeric, v_saldo numeric, doc_id bigint)
language sql stable as $$
  with awal as (
    select coalesce((select sum(qty) from public.tka_stok_awal where tahun = extract(year from p_dari)::int and gol = p_gol and inv = p_inv), 0)
         + coalesce((select sum(qin - qout) from public.tka_mutasi where gol = p_gol and inv = p_inv
                        and tahun = extract(year from p_dari)::int and tanggal < p_dari), 0) as q,
           coalesce((select sum(val) from public.tka_stok_awal where tahun = extract(year from p_dari)::int and gol = p_gol and inv = p_inv), 0)
         + coalesce((select sum(vin - vout) from public.tka_mutasi where gol = p_gol and inv = p_inv
                        and tahun = extract(year from p_dari)::int and tanggal < p_dari), 0) as v
  ), rows as (
    select * from public.tka_mutasi m where m.gol = p_gol and m.inv = p_inv and m.tanggal between p_dari and p_sampai
  )
  select p_dari, 'AWAL', '', '', 'SALDO AWAL', 0::numeric, 0::numeric, 0::numeric, (select q from awal),
         0::numeric, 0::numeric, (select v from awal), null::bigint
  union all
  select r.tanggal, r.jnl, r.nomor, r.sub, r.subname, r.price, r.qin, r.qout,
         (select q from awal) + sum(r.qin - r.qout) over (order by r.tanggal, r.id),
         r.vin, r.vout,
         (select v from awal) + sum(r.vin - r.vout) over (order by r.tanggal, r.id), r.doc_id
    from rows r
$$;

-- Outstanding invoices (piutang C / hutang S) as of a date.
create or replace function public.tka_hp_outstanding(p_id_cs text, p_per date, p_sub text default null)
returns table (id bigint, nomor text, tanggal date, duedate date, sub text, subname text,
               val numeric, bayar numeric, retur numeric, sisa numeric, umur int, doc_id bigint)
language sql stable as $$
  select h.id, h.nomor, h.tanggal, h.duedate, h.sub, h.subname, h.val,
         h.payment_legacy + coalesce(b.p, 0), h.valret_legacy + coalesce(b.r, 0),
         h.val - h.payment_legacy - h.valret_legacy - coalesce(b.p, 0) - coalesce(b.r, 0),
         (p_per - coalesce(h.duedate, h.tanggal))::int, h.doc_id
    from public.tka_hp h
    left join lateral (
      select sum(case when kind = 'P' then val else 0 end) as p, sum(case when kind = 'R' then val else 0 end) as r
        from public.tka_bayar x where x.id_cs = h.id_cs and x.nkey = h.nkey and x.tanggal <= p_per
    ) b on true
   where h.id_cs = p_id_cs and (h.tanggal is null or h.tanggal <= p_per)
     and (p_sub is null or h.sub = p_sub)
     and abs(h.val - h.payment_legacy - h.valret_legacy - coalesce(b.p, 0) - coalesce(b.r, 0)) >= 1
   order by h.sub, h.tanggal, h.nomor
$$;

-- Subsidiary ledger card for one customer / supplier: invoices and payments.
create or replace function public.tka_hp_kartu(p_id_cs text, p_sub text, p_dari date, p_sampai date)
returns table (tanggal date, jenis text, nomor text, nota text, rem text, tambah numeric, kurang numeric, saldo numeric, doc_id bigint)
language sql stable as $$
  with ev as (
    select h.tanggal, 'NOTA'::text as jenis, h.nomor, h.nomor as nota, h.rem, h.val as tambah, 0::numeric as kurang, h.doc_id, 1 as ord
      from public.tka_hp h where h.id_cs = p_id_cs and h.sub = p_sub
    union all
    select h.tanggal, 'BAYAR (LAMA)', h.rem, h.nomor, 'Pelunasan tercatat di program lama', 0, h.payment_legacy + h.valret_legacy, null, 2
      from public.tka_hp h where h.id_cs = p_id_cs and h.sub = p_sub and h.payment_legacy + h.valret_legacy <> 0
    union all
    select b.tanggal, case when b.kind = 'R' then 'RETUR' else 'BAYAR' end, b.nomor, b.nota, '', 0, b.val, b.doc_id, 2
      from public.tka_bayar b join public.tka_hp h on h.id_cs = b.id_cs and h.nkey = b.nkey
     where b.id_cs = p_id_cs and h.sub = p_sub
  ), awal as (
    select coalesce(sum(tambah - kurang), 0) as v from ev where tanggal < p_dari
  )
  select p_dari, 'AWAL', '', '', 'SALDO AWAL', 0::numeric, 0::numeric, (select v from awal), null::bigint
  union all
  select e.tanggal, e.jenis, e.nomor, e.nota, e.rem, e.tambah, e.kurang,
         (select v from awal) + sum(e.tambah - e.kurang) over (order by e.tanggal, e.ord, e.nomor), e.doc_id
    from ev e where e.tanggal between p_dari and p_sampai
$$;

-- Sales / purchase / production lines flattened for reports.
create or replace view public.tka_v_lines with (security_invoker = true) as
  select d.id as doc_id, d.jnl, d.tahun, d.nomor, d.tanggal, d.sub, d.subname, d.total, d.rem as doc_rem, d.h,
         l.id as line_id, l.urut, l.acc, l.gol, l.inv, l.invname, l.qty, l.unit, l.price, l.val, l.dk, l.nota, l.jnlno, l.tka,
         l.rem, l.d
    from public.tka_doc d join public.tka_doc_line l on l.doc_id = d.id;

-- Outstanding customer orders: ordered qty vs qty invoiced on nota penjualan (JLD.JNLNO = order number).
create or replace function public.tka_outstanding_order(p_tahun int)
returns table (doc_id bigint, jnl text, nomor text, tanggal date, sub text, subname text, noorder text,
               gol text, inv text, invname text, unit text, price numeric, qty_order numeric, qty_kirim numeric, qty_sisa numeric)
language sql stable as $$
  with o as (
    select d.id, d.jnl, d.nomor, d.tanggal, d.sub, d.subname, coalesce(d.h->>'noorder', '') as noorder,
           l.gol, l.inv, coalesce(nullif(l.invname, ''), l.d->>'ukuran', '') as invname, l.unit, l.price, sum(l.qty) as q
      from public.tka_doc d join public.tka_doc_line l on l.doc_id = d.id
     where d.jnl in ('POP','POE') and d.tahun = p_tahun
     group by 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
  ), k as (
    select l.jnlno, l.gol, l.inv, sum(l.qty) as q
      from public.tka_doc_line l join public.tka_doc d on d.id = l.doc_id
     where d.jnl = 'JLH' and d.tahun between p_tahun and p_tahun + 1 and l.jnlno <> ''
     group by 1, 2, 3
  )
  select o.id, o.jnl, o.nomor, o.tanggal, o.sub, o.subname, o.noorder, o.gol, o.inv, o.invname, o.unit, o.price,
         o.q, coalesce(k.q, 0), o.q - coalesce(k.q, 0)
    from o left join k on k.jnlno = o.nomor and k.gol = o.gol and k.inv = o.inv
   where o.q - coalesce(k.q, 0) > 0
   order by o.tanggal, o.nomor
$$;

-- Monthly totals for the dashboard.
create or replace function public.tka_dashboard(p_tahun int)
returns table (bulan int, penjualan numeric, pembelian numeric, produksi numeric, kas_masuk numeric, kas_keluar numeric)
language sql stable as $$
  select m.b,
         coalesce((select sum(total) from public.tka_doc where jnl = 'JLH' and tahun = p_tahun and extract(month from tanggal) = m.b), 0),
         coalesce((select sum(total) from public.tka_doc where jnl = 'BLI' and tahun = p_tahun and extract(month from tanggal) = m.b), 0),
         coalesce((select sum(vin) from public.tka_mutasi where jnl = 'BHP' and tahun = p_tahun and extract(month from tanggal) = m.b), 0),
         coalesce((select sum(total) from public.tka_doc where jnl in ('KM','BM') and tahun = p_tahun and extract(month from tanggal) = m.b), 0),
         coalesce((select sum(total) from public.tka_doc where jnl in ('KK','BK') and tahun = p_tahun and extract(month from tanggal) = m.b), 0)
    from generate_series(1, 12) as m(b)
$$;

-- ───────────────────────────── year-end close ─────────────────────────────

-- Opening balances for p_tahun + 1 computed from p_tahun. Balance-sheet accounts
-- carry forward; profit & loss (accgroup >= 4) is closed into the retained-earnings
-- account (TACC.ACCLSLABA). Returns the computed rows; writes them when p_simpan.
create or replace function public.tka_tutup_tahun(p_tahun int, p_simpan boolean default false)
returns table (jenis text, kunci text, nilai numeric, nilai_ada numeric)
language plpgsql security invoker as $$
declare
  s public.tka_setting%rowtype;
begin
  select * into s from public.tka_setting where id = 1;

  create temp table _sa on commit drop as
  with bal as (
    select acc, sum(v) as v from (
      select acc, awal as v from public.tka_saldo_awal where tahun = p_tahun
      union all
      select acc, debet - kredit from public.tka_jurnal where tahun = p_tahun
    ) x group by acc
  )
  select b.acc, case when coalesce(a.accgroup, 1) >= 4 or b.acc = s.accnxlaba then 0 else b.v end
                + case when b.acc = s.acclslaba
                       then (select coalesce(sum(b2.v), 0) from bal b2 left join public.tka_acc a2 on a2.acc = b2.acc
                              where coalesce(a2.accgroup, 1) >= 4)
                       else 0 end as awal
    from (select * from bal union all select s.acclslaba, 0 where not exists (select 1 from bal where acc = s.acclslaba)) b
    left join public.tka_acc a on a.acc = b.acc;

  create temp table _st on commit drop as
  select loc, gol, inv, max(unit) as unit, sum(q) as qty, sum(v) as val from (
    select loc, gol, inv, unit, qty as q, val as v from public.tka_stok_awal where tahun = p_tahun
    union all
    select loc, gol, inv, unit, qin - qout, vin - vout from public.tka_mutasi where tahun = p_tahun
  ) x group by loc, gol, inv;

  if p_simpan then
    delete from public.tka_saldo_awal where tahun = p_tahun + 1;
    insert into public.tka_saldo_awal (tahun, acc, awal) select p_tahun + 1, acc, round(awal, 2) from _sa where round(awal, 2) <> 0;
    delete from public.tka_stok_awal where tahun = p_tahun + 1;
    insert into public.tka_stok_awal (tahun, loc, gol, inv, unit, qty, val)
    select p_tahun + 1, loc, gol, inv, coalesce(unit, ''), round(qty, 2), round(val, 2) from _st
     where round(qty, 2) <> 0 or round(val, 2) <> 0;
  end if;

  return query
    select 'AKUN'::text, coalesce(x.acc, y.acc), coalesce(round(x.awal, 2), 0), coalesce(y.awal, 0)
      from _sa x full join (select acc, awal from public.tka_saldo_awal where tahun = p_tahun + 1) y on y.acc = x.acc
    union all
    select 'STOK', coalesce(x.gol, y.gol) || ' / ' || coalesce(x.inv, y.inv), coalesce(round(x.qty, 2), 0), coalesce(y.qty, 0)
      from (select gol, inv, sum(qty) as qty from _st group by 1, 2) x
      full join (select gol, inv, sum(qty) as qty from public.tka_stok_awal where tahun = p_tahun + 1 group by 1, 2) y
        on y.gol = x.gol and y.inv = x.inv;
end $$;

-- Years that have data, for the year pickers.
create or replace function public.tka_tahun_list()
returns table (tahun int) language sql stable as $$
  select distinct tahun from public.tka_saldo_awal
  union select distinct tahun from public.tka_doc
  order by 1 desc
$$;

-- Importer support (service role only): wipe TKA data, and move the id sequences
-- past the explicit ids the importer inserts.
create or replace function public.tka_reset()
returns void language plpgsql security definer set search_path = public as $$
begin
  truncate public.tka_jurnal, public.tka_mutasi, public.tka_bayar, public.tka_giro, public.tka_hp,
           public.tka_doc_line, public.tka_doc, public.tka_saldo_awal, public.tka_stok_awal, public.tka_import_log,
           public.tka_acc, public.tka_cusg, public.tka_cus, public.tka_sup, public.tka_gol, public.tka_inv,
           public.tka_loc, public.tka_bank, public.tka_biaya, public.tka_pekerja restart identity;
end $$;

create or replace function public.tka_fix_sequences()
returns void language plpgsql security definer set search_path = public as $$
declare t text;
begin
  foreach t in array array['tka_doc','tka_doc_line','tka_jurnal','tka_mutasi','tka_hp','tka_bayar','tka_giro','tka_bank','tka_import_log']
  loop
    execute format('select setval(pg_get_serial_sequence(%L, ''id''), greatest(coalesce((select max(id) from public.%I), 0), 1))', 'public.' || t, t);
  end loop;
end $$;

grant execute on all functions in schema public to authenticated;
revoke execute on function public.tka_reset() from public, anon, authenticated;
revoke execute on function public.tka_fix_sequences() from public, anon, authenticated;
