alter table public.destaques
  add column if not exists focal_x float default 0.5,
  add column if not exists focal_y float default 0.5;
