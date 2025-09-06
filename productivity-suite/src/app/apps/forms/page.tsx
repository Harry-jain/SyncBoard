'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileSpreadsheet, Save, Download, Share, Plus, Folder, Eye, BarChart3 } from 'lucide-react'

interface FormField {
  id: string
  type: 'text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox' | 'radio'
  label: string
  required: boolean
  options?: string[]
}

interface Form {
  id: string
  name: string
  description: string
  fields: FormField[]
  responses: any[]
  createdAt: string
  updatedAt: string
}

export default function FormsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [forms, setForms] = useState<Form[]>([])
  const [currentForm, setCurrentForm] = useState<Form | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isViewing, setIsViewing] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [newFieldType, setNewFieldType] = useState<FormField['type']>('text')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  const createNewForm = () => {
    const newForm: Form = {
      id: Date.now().toString(),
      name: 'Untitled Form',
      description: '',
      fields: [],
      responses: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setForms([newForm, ...forms])
    setCurrentForm(newForm)
    setFormName(newForm.name)
    setFormDescription(newForm.description)
    setIsEditing(true)
  }

  const openForm = (form: Form) => {
    setCurrentForm(form)
    setFormName(form.name)
    setFormDescription(form.description)
    setIsEditing(true)
  }

  const addField = () => {
    if (!currentForm) return

    const newField: FormField = {
      id: Date.now().toString(),
      type: newFieldType,
      label: 'New Field',
      required: false,
      options: newFieldType === 'select' || newFieldType === 'radio' ? ['Option 1', 'Option 2'] : undefined
    }

    const updatedForm = {
      ...currentForm,
      fields: [...currentForm.fields, newField],
      updatedAt: new Date().toISOString()
    }

    setCurrentForm(updatedForm)
    setForms(forms.map(f => f.id === currentForm.id ? updatedForm : f))
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!currentForm) return

    const updatedFields = currentForm.fields.map(field =>
      field.id === fieldId ? { ...field, ...updates } : field
    )

    const updatedForm = {
      ...currentForm,
      fields: updatedFields,
      updatedAt: new Date().toISOString()
    }

    setCurrentForm(updatedForm)
    setForms(forms.map(f => f.id === currentForm.id ? updatedForm : f))
  }

  const removeField = (fieldId: string) => {
    if (!currentForm) return

    const updatedFields = currentForm.fields.filter(field => field.id !== fieldId)

    const updatedForm = {
      ...currentForm,
      fields: updatedFields,
      updatedAt: new Date().toISOString()
    }

    setCurrentForm(updatedForm)
    setForms(forms.map(f => f.id === currentForm.id ? updatedForm : f))
  }

  const saveForm = () => {
    if (!currentForm) return

    const updatedForm = {
      ...currentForm,
      name: formName,
      description: formDescription,
      updatedAt: new Date().toISOString()
    }

    setForms(forms.map(f => f.id === currentForm.id ? updatedForm : f))
    setCurrentForm(updatedForm)
    setIsEditing(false)
  }

  const previewForm = () => {
    setIsViewing(true)
  }

  const exitPreview = () => {
    setIsViewing(false)
  }

  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <input
            type={field.type}
            placeholder={field.label}
            className="w-full p-2 border border-gray-300 rounded-md"
            required={field.required}
          />
        )
      case 'textarea':
        return (
          <textarea
            placeholder={field.label}
            className="w-full p-2 border border-gray-300 rounded-md h-20"
            required={field.required}
          />
        )
      case 'select':
        return (
          <select
            className="w-full p-2 border border-gray-300 rounded-md"
            required={field.required}
          >
            <option value="">Select an option</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        )
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  className="mr-2"
                  required={field.required}
                />
                {option}
              </label>
            ))}
          </div>
        )
      case 'checkbox':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              className="mr-2"
              required={field.required}
            />
            {field.label}
          </label>
        )
      default:
        return null
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard')}
              >
                ← Back to Dashboard
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                Forms
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing && currentForm && !isViewing && (
                <>
                  <Button onClick={previewForm} variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button onClick={saveForm} size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </>
              )}
              {isViewing && (
                <Button onClick={exitPreview} size="sm">
                  Exit Preview
                </Button>
              )}
              {!isViewing && (
                <Button onClick={createNewForm}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Form
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isViewing ? (
          /* Form Preview */
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <h1 className="text-2xl font-bold">{currentForm?.name}</h1>
                {currentForm?.description && (
                  <p className="text-gray-600">{currentForm.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <form className="space-y-6">
                  {currentForm?.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                  <Button type="submit" className="w-full">
                    Submit Form
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Forms List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Folder className="h-5 w-5 mr-2" />
                    My Forms
                  </CardTitle>
                  <CardDescription>
                    {forms.length} form{forms.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {forms.map((form) => (
                      <div
                        key={form.id}
                        className={`p-3 rounded-lg border cursor-pointer hover:bg-gray-50 ${
                          currentForm?.id === form.id ? 'bg-purple-50 border-purple-200' : ''
                        }`}
                        onClick={() => openForm(form)}
                      >
                        <div className="flex items-center">
                          <FileSpreadsheet className="h-4 w-4 mr-2 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {form.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {form.responses.length} response{form.responses.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {forms.length === 0 && (
                      <div className="text-center text-gray-500 py-8">
                        <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No forms yet</p>
                        <p className="text-sm">Create your first form</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form Editor */}
            <div className="lg:col-span-3">
              {isEditing && currentForm ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="text-lg font-semibold border-none shadow-none p-0"
                        placeholder="Form name"
                      />
                      <Input
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        className="border-none shadow-none p-0"
                        placeholder="Form description (optional)"
                      />
                    </CardHeader>
                  </Card>

                  {/* Add Field */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium">Add Field</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="flex space-x-4">
                        <select
                          value={newFieldType}
                          onChange={(e) => setNewFieldType(e.target.value as FormField['type'])}
                          className="p-2 border border-gray-300 rounded-md"
                        >
                          <option value="text">Text</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="textarea">Textarea</option>
                          <option value="select">Select</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        <Button onClick={addField}>
                          Add Field
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Form Fields */}
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-medium">Form Fields</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {currentForm.fields.map((field) => (
                          <div key={field.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <Input
                                  value={field.label}
                                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                                  className="font-medium border-none shadow-none p-0 mb-2"
                                />
                                <div className="flex items-center space-x-4">
                                  <span className="text-sm text-gray-500">
                                    Type: {field.type}
                                  </span>
                                  <label className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={field.required}
                                      onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                      className="mr-2"
                                    />
                                    Required
                                  </label>
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => removeField(field.id)}
                              >
                                Remove
                              </Button>
                            </div>
                            {field.options && (
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                  Options:
                                </label>
                                <div className="space-y-2">
                                  {field.options.map((option, index) => (
                                    <div key={index} className="flex items-center space-x-2">
                                      <Input
                                        value={option}
                                        onChange={(e) => {
                                          const newOptions = [...field.options!]
                                          newOptions[index] = e.target.value
                                          updateField(field.id, { options: newOptions })
                                        }}
                                        className="flex-1"
                                      />
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const newOptions = field.options!.filter((_, i) => i !== index)
                                          updateField(field.id, { options: newOptions })
                                        }}
                                      >
                                        Remove
                                      </Button>
                                    </div>
                                  ))}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const newOptions = [...(field.options || []), 'New Option']
                                      updateField(field.id, { options: newOptions })
                                    }}
                                  >
                                    Add Option
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {currentForm.fields.length === 0 && (
                          <div className="text-center text-gray-500 py-8">
                            <p>No fields yet</p>
                            <p className="text-sm">Add fields to build your form</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card className="h-96">
                  <CardContent className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-500">
                      <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">No form selected</h3>
                      <p>Choose a form from the list or create a new one</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}