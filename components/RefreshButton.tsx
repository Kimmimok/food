'use client'

interface RefreshButtonProps {
  className?: string
  children: React.ReactNode
}

export function RefreshButton({ className, children }: RefreshButtonProps) {
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

// keep default export for existing default imports
export default RefreshButton
