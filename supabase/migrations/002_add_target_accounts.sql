-- เพิ่ม trans_ref column ในตาราง slips
alter table slips add column if not exists trans_ref text;
create unique index if not exists slips_trans_ref_idx on slips(trans_ref) where trans_ref is not null;

-- สร้างตาราง target_accounts
create table if not exists target_accounts (
  id uuid default gen_random_uuid() primary key,
  bank_name text not null,
  account_number text not null unique,
  account_name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
