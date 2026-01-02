create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique,
  avatar_url text,
  is_public_library boolean default false,
  is_public_wishlist boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists books (
  id text primary key,
  title text not null,
  authors text[] default '{}',
  cover_url text,
  description text,
  categories text[] default '{}',
  language text,
  isbn10 text,
  isbn13 text,
  published_date date,
  published_year integer,
  created_at timestamp with time zone default now()
);

create table if not exists user_books (
  user_id uuid references auth.users on delete cascade,
  book_id text references books on delete cascade,
  in_wishlist boolean default false,
  in_library boolean default false,
  reading_status text default 'to_read',
  reading_started_at date,
  reading_finished_at date,
  pages_total integer,
  pages_read integer,
  is_public_review boolean default false,
  public_review text,
  personal_note text,
  rating integer,
  added_at timestamp with time zone default now(),
  primary key (user_id, book_id)
);

alter table user_books
  add constraint rating_range check (rating is null or rating between 1 and 5);

alter table user_books
  add constraint reading_status_check check (
    reading_status in ('to_read', 'reading', 'finished')
  );

alter table user_books
  add constraint pages_total_check check (
    pages_total is null or pages_total >= 0
  );

alter table user_books
  add constraint pages_read_check check (
    pages_read is null or (pages_read >= 0 and (pages_total is null or pages_read <= pages_total))
  );

alter table profiles enable row level security;
alter table books enable row level security;
alter table user_books enable row level security;

create policy "profiles are viewable by everyone"
  on profiles for select using (true);

create policy "users can manage their profile"
  on profiles for update using (auth.uid() = id);

create policy "books are readable by everyone"
  on books for select using (true);

create policy "authenticated users can insert books"
  on books for insert with check (auth.role() = 'authenticated');

create policy "authenticated users can update books"
  on books for update using (auth.role() = 'authenticated');

create policy "user_books visible to owner"
  on user_books for select using (auth.uid() = user_id);

create policy "public wishlist readable"
  on user_books for select using (
    in_wishlist = true
    and exists (
      select 1 from profiles
      where profiles.id = user_id
        and profiles.is_public_wishlist = true
    )
  );

create policy "public library readable"
  on user_books for select using (
    in_library = true
    and exists (
      select 1 from profiles
      where profiles.id = user_id
        and profiles.is_public_library = true
    )
  );

create policy "public reviews readable"
  on user_books for select using (
    is_public_review = true
    and exists (
      select 1 from profiles
      where profiles.id = user_id
        and profiles.is_public_library = true
    )
  );

create policy "user_books insert by owner"
  on user_books for insert with check (auth.uid() = user_id);

create policy "user_books update by owner"
  on user_books for update using (auth.uid() = user_id);

create policy "user_books delete by owner"
  on user_books for delete using (auth.uid() = user_id);

create table if not exists book_stats (
  book_id text primary key references books on delete cascade,
  read_count integer default 0,
  rating_avg numeric(4, 2),
  rating_count integer default 0,
  updated_at timestamp with time zone default now()
);

alter table book_stats enable row level security;

create policy "book_stats are viewable by everyone"
  on book_stats for select using (true);

create or replace function public.refresh_book_stats(target_book_id text)
returns void as $$
begin
  insert into public.book_stats (book_id, read_count, rating_avg, rating_count, updated_at)
  select
    target_book_id,
    count(*) filter (where reading_status = 'finished'),
    avg(rating)::numeric(4, 2),
    count(rating),
    now()
  from public.user_books
  where book_id = target_book_id
  on conflict (book_id) do update set
    read_count = excluded.read_count,
    rating_avg = excluded.rating_avg,
    rating_count = excluded.rating_count,
    updated_at = excluded.updated_at;
end;
$$ language plpgsql security definer;

create or replace function public.handle_user_books_stats()
returns trigger as $$
begin
  perform public.refresh_book_stats(coalesce(new.book_id, old.book_id));
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists user_books_stats_update on public.user_books;
create trigger user_books_stats_update
  after insert or update or delete on public.user_books
  for each row execute procedure public.handle_user_books_stats();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists user_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  name text not null,
  description text,
  is_public boolean default false,
  created_at timestamp with time zone default now()
);

create table if not exists user_list_books (
  list_id uuid references user_lists on delete cascade,
  book_id text references books on delete cascade,
  added_at timestamp with time zone default now(),
  primary key (list_id, book_id)
);

alter table user_lists enable row level security;
alter table user_list_books enable row level security;

create policy "user_lists readable by owner"
  on user_lists for select using (auth.uid() = user_id);

create policy "public lists readable"
  on user_lists for select using (is_public = true);

create policy "user_lists insert by owner"
  on user_lists for insert with check (auth.uid() = user_id);

create policy "user_lists update by owner"
  on user_lists for update using (auth.uid() = user_id);

create policy "user_lists delete by owner"
  on user_lists for delete using (auth.uid() = user_id);

create policy "user_list_books readable by owner"
  on user_list_books for select using (
    exists (
      select 1 from user_lists
      where user_lists.id = user_list_books.list_id
      and user_lists.user_id = auth.uid()
    )
  );

create policy "public list books readable"
  on user_list_books for select using (
    exists (
      select 1 from user_lists
      where user_lists.id = user_list_books.list_id
      and user_lists.is_public = true
    )
  );

create policy "user_list_books insert by owner"
  on user_list_books for insert with check (
    exists (
      select 1 from user_lists
      where user_lists.id = user_list_books.list_id
      and user_lists.user_id = auth.uid()
    )
  );

create policy "user_list_books delete by owner"
  on user_list_books for delete using (
    exists (
      select 1 from user_lists
      where user_lists.id = user_list_books.list_id
      and user_lists.user_id = auth.uid()
    )
  );

create table if not exists user_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  year integer not null,
  month integer not null,
  target_books integer,
  target_pages integer,
  created_at timestamp with time zone default now(),
  unique (user_id, year, month)
);

alter table user_goals enable row level security;

create policy "user_goals readable by owner"
  on user_goals for select using (auth.uid() = user_id);

create policy "user_goals insert by owner"
  on user_goals for insert with check (auth.uid() = user_id);

create policy "user_goals update by owner"
  on user_goals for update using (auth.uid() = user_id);

create policy "user_goals delete by owner"
  on user_goals for delete using (auth.uid() = user_id);
