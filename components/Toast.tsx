"use client"
import React from 'react'

type Toast = { id: string; message: string }

let listeners: ((t: Toast[]) => void)[] = []
let toasts: Toast[] = []

export function showToast(message: string) {
	const id = String(Date.now())
	toasts = [...toasts, { id, message }]
	listeners.forEach(l => l(toasts))
	setTimeout(() => {
		toasts = toasts.filter(t => t.id !== id)
		listeners.forEach(l => l(toasts))
	}, 3500)
}

export default function Toast() {
	const [state, setState] = React.useState<Toast[]>([])
	React.useEffect(() => {
		const l = (t: Toast[]) => setState(t)
		listeners.push(l)
		return () => {
			listeners = listeners.filter(x => x !== l)
		}
	}, [])

	if (state.length === 0) return null

	return (
		<div className="fixed right-4 bottom-6 z-50 space-y-2">
			{state.map(t => (
				<div key={t.id} className="bg-black text-white px-4 py-2 rounded shadow">
					{t.message}
				</div>
			))}
		</div>
	)
}
