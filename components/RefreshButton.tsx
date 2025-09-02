'use client'

interface RefreshButtonProps {
  className?: string
  children: React.ReactNode
}

export default function RefreshButton({ className, children }: RefreshButtonProps) {
  const handleRefresh = () => {
    window.location.reload()
  }

  return (
    <button
      onClick={handleRefresh}
      className={className}
    >
      {children}
    </button>
  )
}
