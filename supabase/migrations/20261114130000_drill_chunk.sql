-- 短组块打字：在已有学习记录上追加次数，不删除进度。

alter table public.learning_record
  add column if not exists drill_reps integer not null default 0,
  add column if not exists drill_chunk text;

comment on column public.learning_record.drill_reps is
  '这一节的短组块打对了几次。未做保持 0。';

comment on column public.learning_record.drill_chunk is
  '服务端记下的组块原文，例如 print(" 。不信任前端传入的字符串。';
