-- 모든 데이터베이스 테이블의 컬럼 구조 조회
-- Supabase SQL Editor에서 실행하세요

SELECT
    t.table_schema,
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.numeric_precision,
    c.numeric_scale,
    c.is_nullable,
    c.column_default,
    CASE
        WHEN pk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END as is_primary_key,
    CASE
        WHEN fk.column_name IS NOT NULL THEN 'YES'
        ELSE 'NO'
    END as is_foreign_key,
    fk.foreign_table_name,
    fk.foreign_column_name
FROM
    information_schema.tables t
JOIN
    information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
LEFT JOIN (
    -- Primary Key 정보
    SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name
    FROM
        information_schema.table_constraints tc
    JOIN
        information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE
        tc.constraint_type = 'PRIMARY KEY'
) pk ON t.table_schema = pk.table_schema AND t.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    -- Foreign Key 정보
    SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_name as foreign_table_name,
        ccu.column_name as foreign_column_name
    FROM
        information_schema.table_constraints tc
    JOIN
        information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN
        information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        AND tc.table_schema = ccu.table_schema
    WHERE
        tc.constraint_type = 'FOREIGN KEY'
) fk ON t.table_schema = fk.table_schema AND t.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE
    t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY
    t.table_name,
    c.ordinal_position;
