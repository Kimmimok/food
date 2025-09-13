const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function runMultiTenancyStep1() {
  console.log('🚀 멀티테넌시 1단계: 데이터베이스 스키마 수정 시작...\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // 1단계 SQL 실행
    console.log('📝 restaurant_settings 테이블에 컬럼 추가 중...');

    // restaurant_id 컬럼 추가
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.restaurant_settings
        ADD COLUMN IF NOT EXISTS restaurant_id uuid DEFAULT gen_random_uuid()
      `
    });

    if (error1) {
      console.log('⚠️  RPC 함수가 없으므로 직접 SQL 실행을 위해 Supabase 대시보드를 사용하세요.');
      console.log('📋 다음 SQL을 Supabase SQL Editor에서 실행하세요:\n');
      console.log(`-- restaurant_settings 테이블에 컬럼 추가
ALTER TABLE public.restaurant_settings
ADD COLUMN IF NOT EXISTS restaurant_id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS domain text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 기존 데이터 업데이트
UPDATE public.restaurant_settings
SET restaurant_id = '550e8400-e29b-41d4-a716-446655440000'::uuid,
    domain = 'restaurant1.yourdomain.com',
    is_active = true
WHERE id = 1;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_restaurant_settings_domain ON public.restaurant_settings(domain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_settings_restaurant_id ON public.restaurant_settings(restaurant_id);`);
      return;
    }

    // 기존 데이터 업데이트
    const { error: error2 } = await supabase
      .from('restaurant_settings')
      .update({
        restaurant_id: '550e8400-e29b-41d4-a716-446655440000',
        domain: 'restaurant1.yourdomain.com',
        is_active: true
      })
      .eq('id', 1);

    if (error2) {
      console.error('❌ 데이터 업데이트 실패:', error2);
      return;
    }

    // 결과 확인
    const { data, error: error3 } = await supabase
      .from('restaurant_settings')
      .select('id, name, restaurant_id, domain, is_active');

    if (error3) {
      console.error('❌ 데이터 조회 실패:', error3);
      return;
    }

    console.log('✅ 1단계 완료! restaurant_settings 테이블 상태:');
    console.table(data);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }
}

runMultiTenancyStep1();