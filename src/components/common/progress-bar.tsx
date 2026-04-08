import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  max?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function ProgressBar({
  value,
  max = 100,
  showLabel = false,
  size = 'md',
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div
        className={cn(
          'w-full overflow-hidden rounded-full bg-secondary',
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full rounded-full bg-primary transition-all duration-300',
            sizeClasses[size]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface StageProgressProps {
  currentStage: number
  totalStages: number
  stages: string[]
  className?: string
}

export function StageProgress({
  currentStage,
  totalStages,
  stages,
  className,
}: StageProgressProps) {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between">
        {stages.map((stage, index) => (
          <div
            key={stage}
            className={cn(
              'flex flex-col items-center',
              index <= currentStage ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium',
                index < currentStage
                  ? 'border-primary bg-primary text-primary-foreground'
                  : index === currentStage
                  ? 'border-primary bg-background'
                  : 'border-muted-foreground bg-background'
              )}
            >
              {index < currentStage ? '✓' : index + 1}
            </div>
            <span className="mt-2 text-xs">{stage}</span>
          </div>
        ))}
      </div>
      <div className="relative mt-4 mb-2">
        <div className="absolute left-0 top-0 h-1 w-full rounded-full bg-secondary" />
        <div
          className="absolute left-0 top-0 h-1 rounded-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentStage) / (totalStages - 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
