import { NextResponse } from 'next/server'
import { bulkMarkServed } from '@/app/kitchen/actions'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const station = body.station
    if (!station) return NextResponse.json({ error: 'station required' }, { status: 400 })
    const ids = await bulkMarkServed(station)
    return NextResponse.json({ ids })
  } catch (err:any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
