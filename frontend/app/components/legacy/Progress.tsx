'use client'

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  showLabel?: boolean
  label?: string
  className?: string
  animated?: boolean
  striped?: boolean
}

export default function Progress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className = '',
  animated = false,
  striped = false
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-2'
      case 'lg':
        return 'h-4'
      default:
        return 'h-3'
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-green-500'
      case 'warning':
        return 'bg-yellow-500'
      case 'error':
        return 'bg-red-500'
      case 'info':
        return 'bg-blue-500'
      default:
        return 'bg-primary-600'
    }
  }

  const getStripedClasses = () => {
    if (!striped) return ''
    return 'bg-stripes'
  }

  const getAnimatedClasses = () => {
    if (!animated) return ''
    return 'animate-pulse'
  }

  const baseClasses = 'w-full bg-secondary-200 rounded-full overflow-hidden'
  const sizeClasses = getSizeClasses()
  const variantClasses = getVariantClasses()
  const stripedClasses = getStripedClasses()
  const animatedClasses = getAnimatedClasses()

  return (
    <div className={className}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-secondary-700">
            {label || 'Progress'}
          </span>
          <span className="text-sm text-secondary-500">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
      
      <div className={`${baseClasses} ${sizeClasses}`}>
        <div
          className={`${variantClasses} ${stripedClasses} ${animatedClasses} h-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// Specialized progress components
export function CircularProgress({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  className = ''
}: Omit<ProgressProps, 'size'> & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const radius = size === 'sm' ? 20 : size === 'lg' ? 40 : size === 'xl' ? 50 : 30
  const strokeWidth = size === 'sm' ? 3 : size === 'lg' ? 6 : size === 'xl' ? 8 : 4
  const circumference = 2 * Math.PI * radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'text-green-500'
      case 'warning':
        return 'text-yellow-500'
      case 'error':
        return 'text-red-500'
      case 'info':
        return 'text-blue-500'
      default:
        return 'text-primary-600'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-12 h-12'
      case 'lg':
        return 'w-20 h-20'
      case 'xl':
        return 'w-24 h-24'
      default:
        return 'w-16 h-16'
    }
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${getSizeClasses()} ${className}`}>
      <svg
        className="transform -rotate-90"
        width={radius * 2 + strokeWidth}
        height={radius * 2 + strokeWidth}
      >
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-secondary-200"
        />
        <circle
          cx={radius + strokeWidth / 2}
          cy={radius + strokeWidth / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className={`${getVariantClasses()} transition-all duration-300 ease-out`}
        />
      </svg>
      
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-medium text-secondary-700">
            {label || `${Math.round(percentage)}%`}
          </span>
        </div>
      )}
    </div>
  )
}

export function StepProgress({
  steps,
  currentStep,
  className = ''
}: {
  steps: string[]
  currentStep: number
  className?: string
}) {
  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isUpcoming = index > currentStep

        return (
          <div key={index} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                isCompleted
                  ? 'bg-primary-600 border-primary-600 text-white'
                  : isCurrent
                  ? 'border-primary-600 text-primary-600'
                  : 'border-secondary-300 text-secondary-400'
              }`}
            >
              {isCompleted ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            
            <span
              className={`ml-2 text-sm font-medium ${
                isCompleted || isCurrent
                  ? 'text-primary-600'
                  : 'text-secondary-400'
              }`}
            >
              {step}
            </span>
            
            {index < steps.length - 1 && (
              <div
                className={`ml-4 w-8 h-0.5 ${
                  isCompleted ? 'bg-primary-600' : 'bg-secondary-300'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
