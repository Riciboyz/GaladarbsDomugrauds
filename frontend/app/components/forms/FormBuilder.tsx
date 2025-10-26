'use client'

import { useState } from 'react'
import { 
  PlusIcon,
  TrashIcon,
  DocumentTextIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface FormField {
  id: string
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date'
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

interface FormBuilderProps {
  fields: FormField[]
  onFieldsChange: (fields: FormField[]) => void
  className?: string
}

export default function FormBuilder({
  fields,
  onFieldsChange,
  className = ''
}: FormBuilderProps) {
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [showAddField, setShowAddField] = useState(false)

  const addField = (field: Omit<FormField, 'id'>) => {
    const newField: FormField = {
      ...field,
      id: Math.random().toString(36).substr(2, 9)
    }
    onFieldsChange([...fields, newField])
    setShowAddField(false)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    onFieldsChange(fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    ))
    setEditingField(null)
  }

  const deleteField = (fieldId: string) => {
    onFieldsChange(fields.filter(field => field.id !== fieldId))
  }

  const moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...fields]
    const [movedField] = newFields.splice(fromIndex, 1)
    newFields.splice(toIndex, 0, movedField)
    onFieldsChange(newFields)
  }

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'select', label: 'Select' },
    { value: 'checkbox', label: 'Checkbox' },
    { value: 'radio', label: 'Radio' },
    { value: 'date', label: 'Date' }
  ]

  const renderFieldPreview = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'date':
        return (
          <input
            type={field.type}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled
          />
        )
      case 'textarea':
        return (
          <textarea
            placeholder={field.placeholder}
            rows={3}
            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            disabled
          />
        )
      case 'select':
        return (
          <select
            className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled
          >
            <option>Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        )
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                  disabled
                />
                <span className="text-sm text-secondary-700">{option}</span>
              </label>
            ))}
          </div>
        )
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  className="border-secondary-300 text-primary-600 focus:ring-primary-500"
                  disabled
                />
                <span className="text-sm text-secondary-700">{option}</span>
              </label>
            ))}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-900">Form Builder</h3>
        <p className="text-sm text-secondary-600">Drag and drop to reorder fields</p>
      </div>

      {/* Fields */}
      <div className="p-4 space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="border border-secondary-200 rounded-lg p-4 hover:border-secondary-300 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-secondary-900">
                    {field.label}
                  </span>
                  {field.required && (
                    <span className="text-red-500 text-sm">*</span>
                  )}
                  <span className="text-xs text-secondary-500 bg-secondary-100 px-2 py-1 rounded">
                    {field.type}
                  </span>
                </div>
                {renderFieldPreview(field)}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => setEditingField(field)}
                  className="p-2 text-secondary-600 hover:bg-secondary-100 rounded transition-colors"
                >
                  <DocumentTextIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => deleteField(field.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add Field Button */}
        <button
          onClick={() => setShowAddField(true)}
          className="w-full border-2 border-dashed border-secondary-300 rounded-lg p-4 text-secondary-600 hover:border-secondary-400 hover:text-secondary-700 transition-colors"
        >
          <PlusIcon className="h-6 w-6 mx-auto mb-2" />
          <span className="text-sm font-medium">Add Field</span>
        </button>
      </div>

      {/* Add Field Modal */}
      {showAddField && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md bg-white rounded-lg shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                  Add New Field
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Field Type
                    </label>
                    <select className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                      {fieldTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Label
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter field label"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">
                      Placeholder
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter placeholder text"
                    />
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="required"
                      className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="required" className="ml-2 text-sm text-secondary-700">
                      Required field
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddField(false)}
                    className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => addField({
                      type: 'text',
                      label: 'New Field',
                      placeholder: 'Enter text...',
                      required: false
                    })}
                    className="px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 rounded-lg transition-colors"
                  >
                    Add Field
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for form builder state management
export function useFormBuilder(initialFields: FormField[] = []) {
  const [fields, setFields] = useState<FormField[]>(initialFields)

  const addField = (field: Omit<FormField, 'id'>) => {
    const newField: FormField = {
      ...field,
      id: Math.random().toString(36).substr(2, 9)
    }
    setFields(prev => [...prev, newField])
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    ))
  }

  const deleteField = (fieldId: string) => {
    setFields(prev => prev.filter(field => field.id !== fieldId))
  }

  const moveField = (fromIndex: number, toIndex: number) => {
    setFields(prev => {
      const newFields = [...prev]
      const [movedField] = newFields.splice(fromIndex, 1)
      newFields.splice(toIndex, 0, movedField)
      return newFields
    })
  }

  return {
    fields,
    addField,
    updateField,
    deleteField,
    moveField
  }
}
