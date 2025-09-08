export default function Page(props: any) {
	const station = props?.params?.station ?? 'unknown'
	return <div className="p-6">Serving station {station} (placeholder)</div>
}
