-- 运营试课冻结。占位课默认冻结，避免预览空白课文。不删除已有行。
alter table public.course_level
  add column if not exists preview_frozen boolean not null default false;

comment on column public.course_level.preview_frozen is
  '为 true 时运营不能试课预览。占位课默认冻结，课文做完后由后台开关打开。';

update public.course_level
set preview_frozen = true
where title like '%占位%'
   or title like '%待补充%'
   or title ~ '^Level [0-9]+ · 单元 [0-9]+ · 第 [0-9]+ 关$'
   or coalesce(body->>'is_placeholder', body->>'placeholder') in ('true', 't');
