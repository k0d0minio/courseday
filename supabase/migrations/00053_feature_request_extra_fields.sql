alter table feature_requests
  add column if not exists priority text check (priority in ('nice_to_have', 'would_help', 'blocking')),
  add column if not exists workaround text,
  add column if not exists expected_outcome text;
