export default function Page(props: any) {
	const tableId = props?.params?.tableId ?? 'unknown'
	return <div className="p-6">Order for table {tableId} (placeholder)</div>
}
