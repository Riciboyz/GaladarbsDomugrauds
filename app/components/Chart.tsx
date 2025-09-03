'use client'

import { useMemo } from 'react'

interface ChartData {
  label: string
  value: number
  color?: string
}

interface ChartProps {
  data: ChartData[]
  type: 'bar' | 'line' | 'pie' | 'doughnut'
  width?: number
  height?: number
  className?: string
  showLabels?: boolean
  showValues?: boolean
  showLegend?: boolean
}

export default function Chart({
  data,
  type,
  width = 400,
  height = 300,
  className = '',
  showLabels = true,
  showValues = true,
  showLegend = true
}: ChartProps) {
  const maxValue = Math.max(...data.map(d => d.value))
  const totalValue = data.reduce((sum, d) => sum + d.value, 0)

  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]

  const getColor = (index: number, color?: string) => {
    return color || colors[index % colors.length]
  }

  const renderBarChart = () => {
    return (
      <div className="flex items-end space-x-2 h-full">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div
              className="w-full bg-primary-600 rounded-t transition-all duration-300 hover:opacity-80"
              style={{
                height: `${(item.value / maxValue) * 100}%`,
                backgroundColor: getColor(index, item.color)
              }}
              title={`${item.label}: ${item.value}`}
            />
            {showLabels && (
              <div className="mt-2 text-xs text-secondary-600 text-center">
                {item.label}
              </div>
            )}
            {showValues && (
              <div className="text-xs font-medium text-secondary-900">
                {item.value}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const renderLineChart = () => {
    const points = data.map((item, index) => ({
      x: (index / (data.length - 1)) * 100,
      y: 100 - (item.value / maxValue) * 100
    }))

    const pathData = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
      .join(' ')

    return (
      <div className="relative h-full">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
          <path
            d={pathData}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            className="transition-all duration-300"
          />
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="2"
              fill="#3B82F6"
              className="transition-all duration-300 hover:r-3"
            />
          ))}
        </svg>
        {showLabels && (
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-secondary-600">
            {data.map((item, index) => (
              <span key={index}>{item.label}</span>
            ))}
          </div>
        )}
      </div>
    )
  }

  const renderPieChart = () => {
    let currentAngle = 0
    const radius = 40
    const centerX = 50
    const centerY = 50

    return (
      <div className="relative h-full">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
          {data.map((item, index) => {
            const percentage = (item.value / totalValue) * 100
            const angle = (percentage / 100) * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle

            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)

            const largeArcFlag = angle > 180 ? 1 : 0

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')

            currentAngle += angle

            return (
              <path
                key={index}
                d={pathData}
                fill={getColor(index, item.color)}
                className="transition-all duration-300 hover:opacity-80"
                title={`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`}
              />
            )
          })}
        </svg>
        {showValues && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-secondary-900">
                {totalValue}
              </div>
              <div className="text-xs text-secondary-600">Total</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDoughnutChart = () => {
    let currentAngle = 0
    const radius = 30
    const centerX = 50
    const centerY = 50

    return (
      <div className="relative h-full">
        <svg width="100%" height="100%" viewBox="0 0 100 100" className="absolute inset-0">
          {data.map((item, index) => {
            const percentage = (item.value / totalValue) * 100
            const angle = (percentage / 100) * 360
            const startAngle = currentAngle
            const endAngle = currentAngle + angle

            const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180)
            const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180)
            const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180)
            const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180)

            const largeArcFlag = angle > 180 ? 1 : 0

            const pathData = [
              `M ${centerX} ${centerY}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              'Z'
            ].join(' ')

            currentAngle += angle

            return (
              <path
                key={index}
                d={pathData}
                fill={getColor(index, item.color)}
                className="transition-all duration-300 hover:opacity-80"
                title={`${item.label}: ${item.value} (${percentage.toFixed(1)}%)`}
              />
            )
          })}
        </svg>
        {showValues && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-semibold text-secondary-900">
                {totalValue}
              </div>
              <div className="text-xs text-secondary-600">Total</div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart()
      case 'line':
        return renderLineChart()
      case 'pie':
        return renderPieChart()
      case 'doughnut':
        return renderDoughnutChart()
      default:
        return renderBarChart()
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 p-4 ${className}`}>
      <div style={{ width, height }} className="relative">
        {renderChart()}
      </div>
      
      {showLegend && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getColor(index, item.color) }}
              />
              <span className="text-sm text-secondary-700">{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}