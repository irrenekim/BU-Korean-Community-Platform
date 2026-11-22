-- Feedback: bug reports and ideas from people using the site.
-- Only ADDS one new table. Nothing existing is changed.
--
-- Your team reads it in Supabase → Table Editor → feedback.
-- To tell someone their report was handled, change "status" to seen or fixed there;
-- everyone sees that on the Feedback page.

begin;

create table public.feedback (
  id          bigint generated always as identity primary key,
  user_id     text not null default public.clerk_user_id(),
  user_email  text default (auth.jwt()->>'email'),
  author_name text not null default 'BU student' check (char_length(trim(author_name)) between 1 and 40),  -- first name, shown publicly
  kind        text not null check (kind in ('bug', 'idea', 'other')),
  page        text check (page is null or char_length(page) <= 40),
  message     text not null check (char_length(trim(message)) between 5 and 2000),
  status      text not null default 'new' check (status in ('new', 'seen', 'fixed')),
  created_at  timestamptz not null default now()
);

create index feedback_created_at_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

-- Anyone signed in can send feedback (even without a BU email, in case that's the problem).
-- They can only send it as themselves, and only as "new".
create policy "Signed-in users can send feedback"
  on public.feedback for insert to authenticated
  with check (
    user_id = public.clerk_user_id()
    and status = 'new'
    and user_email is not distinct from (auth.jwt()->>'email')
  );

-- Everyone can read all feedback, even visitors who aren't logged in.
-- Emails and user ids stay private: the public can only read the columns below.
-- (Your team still sees emails in Supabase → Table Editor.)
-- Nobody can edit or delete feedback from the site.
create policy "Anyone can read feedback"
  on public.feedback for select to anon, authenticated
  using (true);

grant select (id, author_name, kind, page, message, status, created_at) on public.feedback to anon, authenticated;
grant insert on public.feedback to authenticated;

commit;
