'use client'

import { useState } from 'react'
import { PlusIcon, TrashIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  priority?: 'low' | 'medium' | 'high'
  assignee?: string
  dueDate?: Date
  tags?: string[]
}

interface Column {
  id: string
  title: string
  tasks: Task[]
  color?: string
}

interface KanbanBoardProps {
  columns: Column[]
  onTaskMove?: (taskId: string, fromColumn: string, toColumn: string) => void
  onTaskAdd?: (columnId: string, task: Omit<Task, 'id'>) => void
  onTaskEdit?: (taskId: string, updates: Partial<Task>) => void
  onTaskDelete?: (taskId: string) => void
  className?: string
}

export default function KanbanBoard({
  columns,
  onTaskMove,
  onTaskAdd,
  onTaskEdit,
  onTaskDelete,
  className = ''
}: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null)

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDraggedOverColumn(columnId)
  }

  const handleDragLeave = () => {
    setDraggedOverColumn(null)
  }

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault()
    
    if (draggedTask && draggedTask.status !== targetColumnId) {
      onTaskMove?.(draggedTask.id, draggedTask.status, targetColumnId)
    }
    
    setDraggedTask(null)
    setDraggedOverColumn(null)
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-green-500'
      default:
        return 'border-l-gray-300'
    }
  }

  const getPriorityText = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'High Priority'
      case 'medium':
        return 'Medium Priority'
      case 'low':
        return 'Low Priority'
      default:
        return 'Normal Priority'
    }
  }

  return (
    <div className={`flex space-x-4 overflow-x-auto ${className}`}>
      {columns.map((column) => (
        <div
          key={column.id}
          className={`flex-shrink-0 w-80 bg-secondary-50 rounded-lg p-4 ${
            draggedOverColumn === column.id ? 'bg-primary-50' : ''
          }`}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          {/* Column Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color || '#6B7280' }}
              />
              <h3 className="font-semibold text-secondary-900">{column.title}</h3>
              <span className="text-sm text-secondary-500">({column.tasks.length})</span>
            </div>
            <button
              onClick={() => onTaskAdd?.(column.id, {
                title: 'New Task',
                status: column.id
              })}
              className="p-1 hover:bg-secondary-200 rounded transition-colors"
            >
              <PlusIcon className="h-4 w-4 text-secondary-500" />
            </button>
          </div>

          {/* Tasks */}
          <div className="space-y-3">
            {column.tasks.map((task) => (
              <div
                key={task.id}
                draggable
                onDragStart={() => handleDragStart(task)}
                className={`bg-white rounded-lg border-l-4 p-4 shadow-sm hover:shadow-md transition-shadow cursor-move ${getPriorityColor(task.priority)}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-secondary-900">{task.title}</h4>
                  <button className="p-1 hover:bg-secondary-100 rounded transition-colors">
                    <EllipsisHorizontalIcon className="h-4 w-4 text-secondary-500" />
                  </button>
                </div>
                
                {task.description && (
                  <p className="text-sm text-secondary-600 mb-3">{task.description}</p>
                )}
                
                <div className="flex items-center justify-between text-xs text-secondary-500">
                  <span className={getPriorityColor(task.priority).replace('border-l-', 'text-')}>
                    {getPriorityText(task.priority)}
                  </span>
                  {task.dueDate && (
                    <span>
                      Due {task.dueDate.toLocaleDateString()}
                    </span>
                  )}
                </div>
                
                {task.tags && task.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {task.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-secondary-100 text-secondary-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Hook for kanban board state management
export function useKanbanBoard(initialColumns: Column[] = []) {
  const [columns, setColumns] = useState<Column[]>(initialColumns)

  const addTask = (columnId: string, task: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...task,
      id: Math.random().toString(36).substr(2, 9)
    }

    setColumns(prev => prev.map(column =>
      column.id === columnId
        ? { ...column, tasks: [...column.tasks, newTask] }
        : column
    ))
  }

  const moveTask = (taskId: string, fromColumnId: string, toColumnId: string) => {
    setColumns(prev => prev.map(column => {
      if (column.id === fromColumnId) {
        return {
          ...column,
          tasks: column.tasks.filter(task => task.id !== taskId)
        }
      }
      if (column.id === toColumnId) {
        const task = prev.find(c => c.id === fromColumnId)?.tasks.find(t => t.id === taskId)
        if (task) {
          return {
            ...column,
            tasks: [...column.tasks, { ...task, status: toColumnId }]
          }
        }
      }
      return column
    }))
  }

  const updateTask = (taskId: string, updates: Partial<Task>) => {
    setColumns(prev => prev.map(column => ({
      ...column,
      tasks: column.tasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      )
    })))
  }

  const deleteTask = (taskId: string) => {
    setColumns(prev => prev.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => task.id !== taskId)
    })))
  }

  return {
    columns,
    addTask,
    moveTask,
    updateTask,
    deleteTask
  }
}