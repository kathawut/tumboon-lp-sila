-- เพิ่ม columns ในตาราง slips
alter table slips 
  add column if not exists trans_ref text,
  add column if not exists slip_image_url text,
  add column if not exists confirmed_name text,
  add column if not exists name_confirmed_at timestamptz;

create unique index if not exists slips_trans_ref_idx 
  on slips(trans_ref) where trans_ref is not null;

-- ตาราง user_sessions (เก็บ state ลูกค้า)
create table if not exists user_sessions (
  line_user_id text primary key,
  state text not null, -- 'waiting_name_confirm'
  slip_id uuid references slips(id),
  default_name text,
  updated_at timestamptz default now()
);

-- ตาราง target_accounts (บัญชีปลายทาง)
create table if not exists target_accounts (
  id uuid default gen_random_uuid() primary key,
  bank_name text not null,
  account_number text not null unique,
  account_name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- ตาราง settings (เก็บ config ต่างๆ เช่น ยอดเงินที่ต้องโอน)
create table if not exists settings (
  key text primary key,
  value text not null,
  description text,
  updated_at timestamptz default now()
);

-- insert ค่า default
-- required_amount: ยอดเงินทำบุญที่ต้องโอนเพื่อขอสลักชื่อบนหินอ่อน (5,100 บาท)
insert into settings (key, value, description) 
values ('required_amount', '5100', 'ยอดเงินทำบุญที่ต้องโอน (บาท)')
on conflict (key) do nothing;
