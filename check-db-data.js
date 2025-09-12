const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pidwxwgeveubcutcamgf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpZHd4d2dldmV1YmN1dGNhbWdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODIyNzUsImV4cCI6MjA3MTk1ODI3NX0.oxRzP-ah_FUoWzSwzXlpQOmQtQrsSC25BG1x-NX3PvE'
);

async function checkData() {
  console.log('=== menu_category 테이블 직접 조회 ===');
  const { data: catData, error: catErr } = await supabase
    .from('menu_category')
    .select('*');

  if (catErr) {
    console.error('menu_category 조회 오류:', catErr);
  } else {
    console.log('menu_category 데이터:', catData);
  }

  // 카테고리 데이터가 없으면 생성
  if (!catData || catData.length === 0) {
    console.log('\n=== 카테고리 데이터 생성 ===');

    const categoriesToInsert = [
      { id: '2c4d2466-fe19-40b7-8706-da93807e51a7', name: '면류', sort_order: 1, is_active: true },
      { id: '329d54d7-9fae-45e0-8d0e-a16820460e2c', name: '볶음', sort_order: 2, is_active: true },
      { id: 'd4306eec-af54-4c3e-b08d-ff01fae037cd', name: '음료', sort_order: 3, is_active: true },
      { id: '7abf5bd3-a903-4939-bae1-01d653089e9b', name: '주류', sort_order: 4, is_active: true }
    ];

    for (const category of categoriesToInsert) {
      const { error: insertError } = await supabase
        .from('menu_category')
        .upsert(category, { onConflict: 'id' });

      if (insertError) {
        console.error(`카테고리 ${category.name} 생성 오류:`, insertError);
      } else {
        console.log(`카테고리 ${category.name} 생성됨`);
      }
    }

    // 생성 후 다시 조회
    const { data: newCatData } = await supabase
      .from('menu_category')
      .select('*')
      .order('sort_order', { ascending: true });

    console.log('생성된 카테고리:', newCatData);
  }

  console.log('\n=== 메뉴 아이템 확인 (처음 10개) ===');
  const { data: items, error: itemError } = await supabase
    .from('menu_item')
    .select('id,name,category_id')
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .order('sort_order', { ascending: true })
    .limit(10);

  if (itemError) {
    console.error('메뉴 아이템 조회 오류:', itemError);
  } else {
    console.log(items);
  }

  console.log('\n=== 카테고리별 메뉴 수량 ===');
  const { data: counts, error: countError } = await supabase
    .from('menu_item')
    .select(`
      category_id,
      menu_category!inner(name)
    `)
    .eq('is_active', true)
    .eq('is_sold_out', false)
    .eq('menu_category.is_active', true);

  if (countError) {
    console.error('카운트 조회 오류:', countError);
  } else {
    const categoryCount = {};
    counts.forEach(item => {
      const catName = item.menu_category.name;
      categoryCount[catName] = (categoryCount[catName] || 0) + 1;
    });
    console.log(categoryCount);
  }
}

checkData().catch(console.error);
