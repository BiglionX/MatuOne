-- 巩固一下：只在已有学习记录上追加标记，不删除进度。

alter table public.learning_record
  add column if not exists bonus_completed boolean not null default false,
  add column if not exists bonus_reward text;

comment on column public.learning_record.bonus_completed is
  '这一节的巩固副本是否完成。未做保持 false，不做物理删除。';

comment on column public.learning_record.bonus_reward is
  '巩固副本完成后记下的奖励，例如皇冠。';
