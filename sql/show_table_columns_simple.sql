-- 간단 버전: 테이블별 컬럼명과 데이터 타입만 표시
-- Supabase SQL Editor에서 실행하세요

SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM
    information_schema.columns
WHERE
    table_schema = 'public'
ORDER BY
    table_name,
    ordinal_position;
