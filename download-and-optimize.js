// download-public-images.cjs
// 공개 이미지 자동 다운로드 + 리사이즈(500px, JPEG 75) + 파일명 매칭

const fs = require('fs');
const axios = require('axios');
const sharp = require('sharp');

const OUT_DIR = './public/images';
const WIDTH = 500;         // 모바일 최적화 가로폭
const QUALITY = 75;        // JPEG 품질

// Wikimedia Commons 검색 → 첫 번째 결과 원본 URL 얻기
async function getCommonsImageUrl(query) {
  const endpoint = 'https://commons.wikimedia.org/w/api.php';
  // namespace=6(File), generator=search 로 파일만 검색
  const params = {
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrlimit: 1,
    gsrsearch: query,
    gsrnamespace: 6,
    prop: 'imageinfo',
    iiprop: 'url',
    origin: '*'
  };
  const url = endpoint + '?' + new URLSearchParams(params).toString();

  const res = await axios.get(url, { timeout: 15000 });
  const pages = res?.data?.query?.pages || {};
  const first = Object.values(pages)[0];
  const ii = first?.imageinfo?.[0];
  return ii?.url || null;
}

// Picsum placeholder (브랜드 미표시, 200 OK 안정적)
function picsumUrl(seedName) {
  return `https://picsum.photos/seed/${encodeURIComponent(seedName)}/800/800`;
}

// 버퍼 다운로드
async function downloadBuffer(url) {
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000, maxRedirects: 5 });
  return Buffer.from(res.data);
}

// 저장 (리사이즈 + JPEG 압축)
async function saveOptimized(buffer, outPath) {
  await sharp(buffer).resize({ width: WIDTH }).jpeg({ quality: QUALITY }).toFile(outPath);
}

// 50개 파일명 + 검색어(여러 후보). Wikimedia에서 먼저 시도 후, 실패 시 Picsum으로 대체
const items = [
  // === 소주 10 ===
  { name: 'soju-chamisul.jpg',    queries: ['soju bottle', 'korean soju bottle green', 'korean liquor bottle'] },
  { name: 'soju-cheoeum.jpg',     queries: ['korean soju bottle', 'green glass bottle alcohol korea'] },
  { name: 'soju-jinro.jpg',       queries: ['soju bottle jinro', 'korean soju bottle'] },
  { name: 'soju-c1.jpg',          queries: ['soju bottle', 'korean alcohol bottle'] },
  { name: 'soju-daeseon.jpg',     queries: ['soju bottle', 'korean liquor'] },
  { name: 'soju-joheundae.jpg',   queries: ['soju bottle', 'korean soju'] },
  { name: 'soju-white.jpg',       queries: ['soju bottle white label', 'korean soju bottle'] },
  { name: 'soju-hanra.jpg',       queries: ['soju bottle jejudo', 'korean soju green bottle'] },
  { name: 'soju-o2rin.jpg',       queries: ['soju bottle o2', 'korean green liquor bottle'] },
  { name: 'soju-joheunsul.jpg',   queries: ['soju bottle', 'korean liquor'] },

  // === 맥주 10 ===
  { name: 'beer-cass.jpg',        queries: ['beer bottle lager', 'glass bottle beer'] },
  { name: 'beer-hite.jpg',        queries: ['beer bottle', 'pale lager bottle'] },
  { name: 'beer-ob.jpg',          queries: ['beer bottle brown', 'lager bottle'] },
  { name: 'beer-kloud.jpg',       queries: ['beer glass and bottle', 'lager bottle'] },
  { name: 'beer-terra.jpg',       queries: ['green beer bottle', 'beer bottle outdoors'] },
  { name: 'beer-max.jpg',         queries: ['beer bottle closeup', 'beer bottle on table'] },
  { name: 'beer-asahi.jpg',       queries: ['beer bottle japan', 'beer bottle with glass'] },
  { name: 'beer-heineken.jpg',    queries: ['green beer bottle', 'beer bottle product photo'] },
  { name: 'beer-guinness.jpg',    queries: ['stout beer bottle', 'beer bottle black label'] },
  { name: 'beer-bud.jpg',         queries: ['beer bottle budweiser style', 'beer bottle macro'] },

  // === 막걸리 10 ===
  { name: 'mak-jangsu.jpg',       queries: ['makgeolli bottle', 'korean rice wine bottle'] },
  { name: 'mak-seoul.jpg',        queries: ['makgeolli korean rice wine bottle', 'makgeolli'] },
  { name: 'mak-kooksoondang.jpg', queries: ['makgeolli bottle korea', 'rice wine bottle korea'] },
  { name: 'mak-neurin.jpg',       queries: ['makgeolli bottle traditional', 'korean rice wine'] },
  { name: 'mak-yeatnal.jpg',      queries: ['makgeolli bottle vintage', 'makgeolli korea'] },
  { name: 'mak-jipyeong.jpg',     queries: ['makgeolli bottle jipyeong', 'korean rice wine bottle'] },
  { name: 'mak-udo.jpg',          queries: ['korean rice wine bottle', 'makgeolli bottle peanut'] },
  { name: 'mak-albam.jpg',        queries: ['makgeolli chestnut bottle', 'korean rice wine bottle'] },
  { name: 'mak-bokbunja.jpg',     queries: ['makgeolli raspberry bottle', 'korean fruit wine bottle'] },
  { name: 'mak-apple.jpg',        queries: ['makgeolli apple bottle', 'korean rice wine bottle'] },

  // === 병 음료 10 ===
  { name: 'drink-b-cocacola.jpg',     queries: ['cola bottle', 'soda bottle cola'] },
  { name: 'drink-b-pepsi.jpg',        queries: ['cola bottle', 'soda bottle dark'] },
  { name: 'drink-b-sprite.jpg',       queries: ['lemon lime soda bottle', 'green soda bottle'] },
  { name: 'drink-b-chilsung.jpg',     queries: ['lemon lime soda bottle', 'soda bottle korea'] },
  { name: 'drink-b-fanta-orange.jpg', queries: ['orange soda bottle', 'soda bottle orange'] },
  { name: 'drink-b-fanta-grape.jpg',  queries: ['grape soda bottle', 'soda bottle purple'] },
  { name: 'drink-b-mountain-dew.jpg', queries: ['citrus soda bottle', 'green soda bottle'] },
  { name: 'drink-b-milkis.jpg',       queries: ['korean soda bottle white', 'milky soda bottle'] },
  { name: 'drink-b-welchs.jpg',       queries: ['grape juice soda bottle', 'purple soda bottle'] },
  { name: 'drink-b-pocari.jpg',       queries: ['sports drink bottle', 'ion drink bottle'] },

  // === 캔 음료 10 ===
  { name: 'drink-c-cocacola.jpg',     queries: ['cola can', 'soda can red'] },
  { name: 'drink-c-pepsi.jpg',        queries: ['cola can', 'soda can blue'] },
  { name: 'drink-c-sprite.jpg',       queries: ['lemon lime soda can', 'green soda can'] },
  { name: 'drink-c-chilsung.jpg',     queries: ['lemon lime soda can', 'korean soda can'] },
  { name: 'drink-c-fanta-orange.jpg', queries: ['orange soda can', 'soda can orange'] },
  { name: 'drink-c-fanta-grape.jpg',  queries: ['grape soda can', 'soda can purple'] },
  { name: 'drink-c-mountain-dew.jpg', queries: ['citrus soda can', 'green soda can'] },
  { name: 'drink-c-milkis.jpg',       queries: ['korean soda can white', 'milky soda can'] },
  { name: 'drink-c-welchs.jpg',       queries: ['grape soda can', 'purple soda can'] },
  { name: 'drink-c-pocari.jpg',       queries: ['sports drink can', 'ion drink can'] },
];

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  await fs.promises.mkdir(OUT_DIR, { recursive: true });

  for (const item of items) {
    const outPath = `${OUT_DIR}/${item.name}`;
    let buffer = null;

    // 1) Wikimedia Commons에서 검색어 후보 순회
    for (const q of item.queries) {
      try {
        const commonsUrl = await getCommonsImageUrl(q);
        if (!commonsUrl) { continue; }
        buffer = await downloadBuffer(commonsUrl);
        console.log(`✔ Found on Commons: ${item.name}  (query: "${q}")`);
        break;
      } catch (e) {
        // 다음 쿼리 계속
      }
      await sleep(250); // 요청 간 살짝 대기 (예의상)
    }

    // 2) 실패 시 Picsum placeholder로 대체
    if (!buffer) {
      const ph = picsumUrl(item.name);
      try {
        buffer = await downloadBuffer(ph);
        console.log(`○ Placeholder used: ${item.name}`);
      } catch (e) {
        console.error(`✖ Failed (even placeholder): ${item.name} -> ${e.message}`);
        continue;
      }
    }

    // 3) 저장(리사이즈+압축)
    try {
      await saveOptimized(buffer, outPath);
      console.log(`Saved: ${item.name}`);
    } catch (e) {
      console.error(`✖ Save failed: ${item.name} -> ${e.message}`);
    }

    // API 과도 호출 방지
    await sleep(200);
  }

  console.log('✅ Done.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

