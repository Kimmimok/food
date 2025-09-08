import { NextResponse } from 'next/server'

export async function GET(req: Request) {
	// placeholder token generation
	return NextResponse.json({ token: null })
}
