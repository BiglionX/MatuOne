-- 第一单元第 19 节是打字关，第 20 节是项目关。标题和课型对齐目录，正文仍由课时接口组装。

update public.course_level
set title = '把学过的词再打一遍',
    goal = '把 print、forward、right 再打准确',
    level_type = 'typing',
    knowledge_tags = array['print', 'forward', 'right']::text[],
    milestone_badge = null,
    updated_at = now()
where sort_order = 19;

update public.course_level
set title = '单元作品：海龟问候',
    goal = '用一句问候和一条正方形，做成能送给同学的小作品',
    level_type = 'project',
    knowledge_tags = array['print', 'forward', 'for_loop']::text[],
    milestone_badge = 'first_drawing',
    updated_at = now()
where sort_order = 20;
