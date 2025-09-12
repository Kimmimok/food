"use client"
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export default function QrGenerator({ defaultMax = 1, settings }: { defaultMax?: number; settings?: any }) {
  const [max, setMax] = useState<number>(defaultMax)
  const [base, setBase] = useState<string>('')
  const [items, setItems] = useState<Array<{ table: number; url: string; src?: string | null }>>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') setBase(window.location.origin)
  }, [])

  async function generate() {
    const n = Math.max(0, Math.floor(Number(max) || 0))
    if (n > 500) {
      setMsg('너무 큰 값입니다 (최대 500)')
      return
    }
    setGenerating(true)
    setMsg('생성 중...')
    // normalize base: remove trailing slash
    let cleanBase = String(base || '').trim()
    if (!cleanBase) cleanBase = window.location.origin
    // remove trailing slash(es)
    cleanBase = cleanBase.replace(/\/+$/, '')

    const list: Array<{ table: number; url: string; src?: string | null }> = []
    for (let t = 0; t <= n; t++) {
      const target = t === 0 ? `${cleanBase}/guest/waitlist` : `${cleanBase}/order/${t}`
      list.push({ table: t, url: target, src: null })
    }
    setItems(list)

    // generate data URLs in sequence to avoid excessive parallel work
  for (let i = 0; i < list.length; i++) {
      try {
        const d = await QRCode.toDataURL(list[i].url, { width: 320 })
        setItems(prev => {
          const copy = [...prev]
          copy[i] = { ...copy[i], src: d }
          return copy
        })
      } catch {
        setItems(prev => {
          const copy = [...prev]
          copy[i] = { ...copy[i], src: null }
          return copy
        })
      }
    }

    setGenerating(false)
    setMsg('생성 완료')
    setTimeout(()=>setMsg(null), 2000)
  }

  async function generateWithToken() {
    const n = Math.max(0, Math.floor(Number(max) || 0))
    const list: Array<{ table: number; url: string; src?: string | null }> = []
    // ensure base normalized
    let cleanBase = String(base || '').trim()
    if (!cleanBase) cleanBase = window.location.origin
    cleanBase = cleanBase.replace(/\/+$/, '')

    for (let t = 0; t <= n; t++) {
      // request token for this table (use label as tableId)
      try {
        const res = await fetch('/api/table/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tableId: String(t) }) })
        const json = await res.json()
        const token = json?.token
        const target = token ? `${cleanBase}/guest/order/${token}` : `${cleanBase}/guest/order/${t}`
        list.push({ table: t, url: target, src: null })
      } catch {
        list.push({ table: t, url: `${cleanBase}/guest/order/${t}`, src: null })
      }
    }
    setItems(list)
    for (let i = 0; i < list.length; i++) {
      try {
        const d = await QRCode.toDataURL(list[i].url, { width: 320 })
        setItems(prev => {
          const copy = [...prev]
          copy[i] = { ...copy[i], src: d }
          return copy
        })
      } catch {
        setItems(prev => {
          const copy = [...prev]
          copy[i] = { ...copy[i], src: null }
          return copy
        })
      }
    }
  }

  function downloadDataUrl(dataUrl: string, filename: string) {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function downloadAllSequential() {
    if (!items.length) return
    setMsg('모두 다운로드 시작...')
    for (let i = 0; i < items.length; i++) {
      const it = items[i]
      if (it.src) {
        const name = it.table === 0 ? `waitlist-qr.png` : `table-${it.table}-qr.png`
        downloadDataUrl(it.src, name)
        // brief pause to avoid browser blocking
        await new Promise(r => setTimeout(r, 300))
      }
    }
    setMsg('다운로드 요청 보냄 (브라우저 설정에 따라 차단될 수 있음)')
    setTimeout(()=>setMsg(null), 2500)
  }

  async function copyUrl(u: string) {
    try {
      await navigator.clipboard.writeText(u)
      setMsg('링크 복사됨')
    } catch {
      setMsg('복사 실패')
    }
    setTimeout(()=>setMsg(null), 1500)
  }

  function printA4() {
    if (!items.length) return
    const win = window.open('', '_blank')
    if (!win) {
      setMsg('팝업이 차단되었습니다')
      setTimeout(()=>setMsg(null), 2000)
      return
    }

    const style = `
      @page { size: A4; margin: 10mm }
      html, body { margin:0; padding:0; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans', 'Helvetica Neue', Arial; }
      .sheet { box-sizing: border-box; padding: 10mm; width: calc(210mm - 20mm); height: calc(297mm - 20mm); }
      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; align-items: center; justify-items: center }
      .item { text-align: center; }
      .item img { width: 60mm; height: 60mm; display:block; margin: 0 auto }
      .label { margin-top: 4mm; font-size: 10pt }
      @media print { button { display: none } }
    `

    const filtered = items.filter(it => it.src)
    if (!filtered.length) {
      setMsg('인쇄할 QR이 없습니다')
      setTimeout(()=>setMsg(null),2000)
      return
    }

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>QR Print</title>
          <style>${style}</style>
        </head>
        <body>
          <div class="sheet">
            <div class="grid">
              ${filtered.map(it => `
                <div class="item">
                  <img src="${it.src}" alt="qr-${it.table}" />
                  <div class="label">테이블 ${it.table}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <script>
            window.onload = function(){ setTimeout(function(){ window.print(); }, 300); };
          </script>
        </body>
      </html>
    `

    win.document.open()
    win.document.write(html)
    win.document.close()
  }

  return (
    <div className="bg-white border rounded-lg p-4 shadow-sm">
      <h3 className="font-semibold">QR 코드 일괄 생성</h3>
      {/* 컨트롤들을 세로 1열로 쌓이도록 수정 */}
      <div className="mt-3 grid grid-cols-1 gap-3 items-start">
        <div>
          <label className="text-sm text-gray-600">마지막 테이블 번호 (0부터 포함)</label>
          <input type="number" value={String(max)} onChange={e=>setMax(Number(e.target.value))} className="w-full border rounded px-2 py-1 mt-1" />
          <div className="text-xs text-gray-400 mt-1">예: 5를 입력하면 0,1,2,3,4,5 총 6개의 QR 생성</div>
        </div>
        <div>
          <label className="text-sm text-gray-600">기본 접속 주소 (편집 가능)</label>
          <div className="flex flex-col gap-2 mt-1">
            <input type="text" value={base} onChange={e=>setBase(e.target.value)} placeholder="https://your-domain.com" className="w-full border rounded px-2 py-1" />
            <button type="button" onClick={()=>{ if (typeof window !== 'undefined') setBase(window.location.origin) }} className="px-3 py-1 border rounded text-sm w-full">현재 도메인</button>
          </div>
          <div className="text-xs text-gray-400 mt-1">기본 도메인 또는 외부 URL을 입력하세요. 슬래시(/)는 자동 정리됩니다.</div>
        </div>
        <div className="flex flex-col space-y-2">
          <button type="button" onClick={generate} disabled={generating} className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">생성</button>
          <button type="button" onClick={downloadAllSequential} disabled={!items.length} className="w-full px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50">모두 다운로드</button>
          <button type="button" onClick={printA4} disabled={!items.some(i=>i.src)} className="w-full px-3 py-2 bg-indigo-600 text-white rounded disabled:opacity-50">인쇄 (A4, QR+번호)</button>
          <button type="button" onClick={()=>{ setItems([]); setMsg(null) }} className="w-full px-3 py-2 bg-gray-200 rounded">초기화</button>
        </div>
      </div>

      {msg && <div className="mt-3 text-sm text-blue-600">{msg}</div>}

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {items.map(it => (
          <div key={it.table} className="border rounded p-2 bg-gray-50">
            <div className="text-xs text-gray-600">테이블 {it.table}</div>
            <div className="h-36 w-full flex items-center justify-center mt-2 bg-white border rounded">
              {it.src ? <img src={it.src} alt={`qr-${it.table}`} width={160} height={160} /> : <div className="text-sm text-gray-400">생성중...</div>}
            </div>
            <div className="mt-2 flex space-x-2">
              <button onClick={()=>it.src && downloadDataUrl(it.src, it.table===0? 'waitlist-qr.png' : `table-${it.table}-qr.png`)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50" disabled={!it.src}>다운로드</button>
              {!settings?.hide_urls_in_qr && (
                <>
                  <button onClick={()=>copyUrl(it.url)} className="text-xs px-2 py-1 bg-gray-200 rounded">링크복사</button>
                  <a href={it.url} target="_blank" rel="noreferrer" className="text-xs px-2 py-1 bg-green-600 text-white rounded">열기</a>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
