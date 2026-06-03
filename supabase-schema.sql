-- Supabase schema for e-commerce app
-- Run this in Supabase SQL editor or use db/migrations

-- Profiles table connected to Supabase auth.users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Product catalog
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null,
  currency text not null default 'EUR',
  image_url text,
  in_stock boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Shopping cart items for authenticated users
create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null default 1,
  added_at timestamptz not null default now(),
  unique (profile_id, product_id)
);

-- Orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'pending',
  total_amount numeric(10,2) not null,
  currency text not null default 'EUR',
  shipping_address jsonb,
  payment_method text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id),
  quantity int not null default 1,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) generated always as (quantity * unit_price) stored
);

-- Payment methods stored securely for future tokenized checkout
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  provider text not null default 'stripe',
  provider_payment_method_id text not null,
  card_brand text,
  card_last4 text,
  card_exp_month int,
  card_exp_year int,
  is_default boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payment_intents (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  provider text not null default 'stripe',
  provider_client_secret text,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Audit trigger to update product timestamps
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_products_updated_at
before update on products
for each row
execute function set_updated_at();
