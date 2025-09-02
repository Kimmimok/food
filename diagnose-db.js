// @ts-nocheck
const { createClient } = require('@supabase/supabase-js')

async function diagnoseDatabase() {
  console.log('🔍 데이터베이스 진단을 시작합니다...\n')

  try {
    // 환경변수 확인
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    console.log('1. 환경변수 확인:')
    console.log('   - SUPABASE_URL:', supabaseUrl ? '✅ 설정됨' : '❌ 설정되지 않음')
    console.log('   - SUPABASE_KEY:', supabaseKey ? '✅ 설정됨' : '❌ 설정되지 않음')

    if (!supabaseUrl || !supabaseKey) {
      console.log('\n❌ 환경변수가 설정되지 않아 데이터베이스 연결에 실패했습니다.')
      console.log('해결 방법:')
      console.log('   - .env.local 파일에 다음 변수를 추가하세요:')
      console.log('     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
      console.log('     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key')
      return
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('\n2. 데이터베이스 연결 테스트:')

    // 기본 연결 테스트
    try {
      const { data, error } = await supabase.from('order_item').select('count').limit(1)
      if (error) {
        console.log('   ❌ 연결 실패:', error.message)
        console.log('   오류 코드:', error.code)
        console.log('   오류 힌트:', error.hint || '없음')
      } else {
        console.log('   ✅ 기본 연결 성공')
      }
    } catch (err) {
      console.log('   ❌ 연결 예외 발생:', err.message)
    }

    // 테이블 존재 여부 확인
    console.log('\n3. 테이블 존재 여부 확인:')

    const tables = ['order_item', 'menu_item', 'order_ticket', 'dining_table']
    for (const table of tables) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(1)
        if (error) {
          console.log(`   - ${table}: ❌ (${error.message})`)
        } else {
          console.log(`   - ${table}: ✅`)
        }
      } catch (err) {
        console.log(`   - ${table}: ❌ (예외: ${err.message})`)
      }
    }

    // 실제 쿼리 테스트
    console.log('\n4. 실제 쿼리 테스트:')

    try {
      console.log('   메인 쿼리 테스트 중...')
      const { data, error } = await supabase
        .from('order_item')
        .select(`
          id, status, created_at,
          name_snapshot, qty,
          order_id,
          menu_item_id
        `)
        .eq('status', 'done')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) {
        console.log('   ❌ 메인 쿼리 실패:', error.message)
        console.log('   오류 코드:', error.code)
        console.log('   오류 힌트:', error.hint || '없음')
      } else {
        console.log(`   ✅ 메인 쿼리 성공 (${data?.length || 0}개 항목 발견)`)
        if (data && data.length > 0) {
          console.log('   샘플 데이터:', data[0])
        }
      }
    } catch (err) {
      console.log('   ❌ 메인 쿼리 예외:', err.message)
    }

  } catch (error) {
    console.log('\n❌ 진단 중 예외 발생:', error.message)
  }

  console.log('\n🏁 진단 완료')
}

diagnoseDatabase()
