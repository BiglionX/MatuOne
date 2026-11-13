-- 第一单元 20 节的标题和正文保持原样，只把 level_type 对齐成单元节奏：
-- 12 new + 5 practice + 2 typing + 1 project。

update public.course_level
set level_type = (
  array[
    'new', 'new', 'new', 'new',
    'practice',
    'new', 'new', 'new',
    'typing',
    'new', 'new',
    'practice',
    'typing',
    'new', 'new', 'new',
    'practice', 'practice', 'practice',
    'project'
  ]
)[sort_order],
updated_at = now()
where sort_order between 1 and 20;
