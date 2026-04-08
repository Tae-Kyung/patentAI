import { Coins } from 'lucide-react'

interface CreditCostBadgeProps {
  cost: number
  className?: string
}

export function CreditCostBadge({ cost, className = '' }: CreditCostBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ${className}`}
    >
      <Coins className="h-3 w-3" />
      {cost}
    </span>
  )
}
