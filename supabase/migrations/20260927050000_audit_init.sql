-- Skema cloud aplikasi Audit Pertamina Way.
-- Semua objek memakai awalan audit_ agar tidak bentrok dengan tabel aplikasi lain (bbm_*, dll)
-- di proyek Supabase yang sama.
--
-- Akses: hanya pengguna login yang terdaftar di audit_members.
--   admin   : baca semua audit, kelola anggota, hapus audit mana pun
--   auditor : baca semua audit, buat/ubah audit, hapus draft miliknya sendiri
-- Admin awal = pengawas aplikasi PANTAS (bbm_members). Bila tabel masih kosong,
-- pengguna pertama yang login menjadi admin (audit_claim_first).

create schema if not exists audit_private;
grant usage on schema audit_private to authenticated;

create table public.audit_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  nama text,
  role text not null default 'auditor' check (role in ('admin', 'auditor')),
  created_at timestamptz not null default now()
);

create table public.audit_reports (
  id text primary key,
  status text not null default 'draft' check (status in ('draft', 'selesai')),
  nomor_spbu text,
  kota text,
  tanggal_audit date,
  data jsonb not null,
  summary jsonb not null default '{}'::jsonb,
  client_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  updated_by uuid default auth.uid()
);

create index audit_reports_updated_at_idx on public.audit_reports (updated_at desc);
create index audit_reports_spbu_idx on public.audit_reports (nomor_spbu);

create function audit_private.touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.created_by := old.created_by;
  return new;
end;
$$;

create trigger audit_reports_touch before update on public.audit_reports
  for each row execute function audit_private.touch();

create function audit_private.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.audit_members where user_id = auth.uid());
$$;

create function audit_private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.audit_members where user_id = auth.uid() and role = 'admin');
$$;

grant execute on function audit_private.is_member(), audit_private.is_admin() to authenticated;

-- Dipanggil aplikasi setelah login. Mengembalikan peran pemanggil (null = bukan anggota).
create function public.audit_claim_first() returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    return null;
  end if;
  lock table public.audit_members in exclusive mode;
  if not exists (select 1 from public.audit_members) then
    select email into v_email from auth.users where id = auth.uid();
    insert into public.audit_members (user_id, email, role) values (auth.uid(), v_email, 'admin');
  end if;
  return (select role from public.audit_members where user_id = auth.uid());
end;
$$;

-- Admin menambahkan anggota berdasarkan email akun yang sudah ada di Supabase Auth.
create function public.audit_add_member(p_email text, p_nama text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_email text;
begin
  if not audit_private.is_admin() then
    raise exception 'Hanya admin yang dapat menambah anggota';
  end if;
  if p_role not in ('admin', 'auditor') then
    raise exception 'Peran tidak valid';
  end if;
  select id, email into v_id, v_email from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'Akun dengan email % belum dibuat di Supabase Auth', p_email;
  end if;
  insert into public.audit_members (user_id, email, nama, role)
  values (v_id, v_email, nullif(trim(p_nama), ''), p_role)
  on conflict (user_id) do update set nama = excluded.nama, role = excluded.role;
end;
$$;

revoke execute on function public.audit_claim_first(), public.audit_add_member(text, text, text) from public, anon;
grant execute on function public.audit_claim_first(), public.audit_add_member(text, text, text) to authenticated;

alter table public.audit_members enable row level security;
alter table public.audit_reports enable row level security;

create policy "anggota baca" on public.audit_members for select to authenticated using (audit_private.is_member());
create policy "admin ubah anggota" on public.audit_members for update to authenticated
  using (audit_private.is_admin()) with check (audit_private.is_admin());
create policy "admin hapus anggota" on public.audit_members for delete to authenticated
  using (audit_private.is_admin() and user_id <> auth.uid());

create policy "anggota baca" on public.audit_reports for select to authenticated using (audit_private.is_member());
create policy "anggota tambah" on public.audit_reports for insert to authenticated
  with check (audit_private.is_member() and created_by = auth.uid());
create policy "anggota ubah" on public.audit_reports for update to authenticated
  using (audit_private.is_member()) with check (audit_private.is_member());
create policy "hapus audit" on public.audit_reports for delete to authenticated
  using (audit_private.is_admin() or (created_by = auth.uid() and status = 'draft'));

-- Foto bukti (bucket privat, hanya anggota). Path: <audit_id>/<photo_id>.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audit-foto', 'audit-foto', false, 5242880, array['image/jpeg']);

create policy "audit foto baca" on storage.objects for select to authenticated
  using (bucket_id = 'audit-foto' and audit_private.is_member());
create policy "audit foto unggah" on storage.objects for insert to authenticated
  with check (bucket_id = 'audit-foto' and audit_private.is_member());
create policy "audit foto hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'audit-foto' and audit_private.is_admin());

-- Admin awal: pengawas aplikasi PANTAS di proyek yang sama (bila ada).
do $$
begin
  if to_regclass('public.bbm_members') is not null then
    insert into public.audit_members (user_id, email, nama, role)
    select user_id, email, nama, 'admin' from public.bbm_members where role = 'pengawas'
    on conflict (user_id) do nothing;
  end if;
end;
$$;
