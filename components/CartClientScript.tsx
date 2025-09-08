"use client"
import React from 'react'
import { showToast } from './Toast'

export default function CartClientScript() {
	React.useEffect(() => {
		const original = window.alert
		window.alert = (msg?: any) => {
			try {
				showToast('행복한 하루 되세요!')
			} catch (e) {
				// fallback to original if something goes wrong
				original.call(window, '행복한 하루 되세요!')
			}
		}
		return () => {
			window.alert = original
		}
	}, [])

	return null
}
