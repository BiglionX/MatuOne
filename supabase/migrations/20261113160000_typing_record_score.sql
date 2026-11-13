-- 新写入的打字记录必须是正的速度和 1–100 的准确率。
-- NOT VALID：不回头扫描旧行，之后的 insert / update 仍会被拦住。
alter table public.typing_record
  add constraint typing_record_score_sane
  check (wpm > 0 and accuracy > 0 and accuracy <= 100) not valid;
