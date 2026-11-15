-- 私有素材桶单文件上限改为 5MB。没有 storage 的库（当前 Neon）跳过。
-- file_url 仍只存对象路径。24 小时签名地址在读取时签发，不写进这一列。

do $size$
begin
  if to_regclass('storage.buckets') is null then
    return;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit'
  ) then
    update storage.buckets
    set public = false, file_size_limit = 5242880
    where id = 'org-materials';
  end if;
end
$size$;
