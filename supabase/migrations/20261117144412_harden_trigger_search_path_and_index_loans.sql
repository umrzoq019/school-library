alter function public.touch_updated_at() set search_path = '';
revoke all on function public.touch_updated_at() from public, anon, authenticated;

create index if not exists loan_requests_book_id_idx
  on public.loan_requests (book_id);
