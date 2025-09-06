import React, { useState, useEffect, useRef } from 'react';
import { 
  SaveIcon,
  ShareIcon,
  DownloadIcon,
  UploadIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EditIcon,
  SettingsIcon,
  TextIcon,
  CheckSquareIcon,
  CircleIcon,
  StarIcon,
  CalendarIcon,
  ImageIcon,
  FileTextIcon,
  LinkIcon,
  ToggleLeftIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  PaletteIcon,
  CopyIcon,
  MoveIcon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'email' | 'url' | 'rating' | 'file' | 'toggle';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select, radio, checkbox
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  style?: {
    width: number;
    alignment: 'left' | 'center' | 'right';
    color: string;
    backgroundColor: string;
  };
}

interface Form {
  title: string;
  description: string;
  fields: FormField[];
  settings: {
    theme: string;
    allowAnonymous: boolean;
    collectEmails: boolean;
    showProgress: boolean;
    confirmationMessage: string;
  };
}

interface FormsAppProps {
  documentId: number;
  onSave: (content: any) => void;
  onClose: () => void;
}

export const FormsApp: React.FC<FormsAppProps> = ({
  documentId,
  onSave,
  onClose
}) => {
  const [form, setForm] = useState<Form>({
    title: 'Untitled Form',
    description: '',
    fields: [],
    settings: {
      theme: 'default',
      allowAnonymous: true,
      collectEmails: false,
      showProgress: true,
      confirmationMessage: 'Thank you for your submission!'
    }
  });
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [formResponses, setFormResponses] = useState<any[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    loadDocument();
  }, [documentId]);

  const loadDocument = async () => {
    try {
      const response = await fetch(`/api/drive/documents/${documentId}`);
      const data = await response.json();
      
      if (data.success && data.document) {
        const content = data.document.content || {
          title: 'Untitled Form',
          description: '',
          fields: [],
          settings: {
            theme: 'default',
            allowAnonymous: true,
            collectEmails: false,
            showProgress: true,
            confirmationMessage: 'Thank you for your submission!'
          }
        };
        setForm(content);
      }
    } catch (error) {
      console.error('Failed to load document:', error);
    }
  };

  const saveDocument = async () => {
    try {
      setIsSaving(true);
      await onSave(form);
    } catch (error) {
      console.error('Failed to save document:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      required: false,
      options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1', 'Option 2'] : undefined,
      style: {
        width: 100,
        alignment: 'left',
        color: '#000000',
        backgroundColor: '#ffffff'
      }
    };

    setForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));

    setSelectedField(newField.id);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      )
    }));
  };

  const deleteField = (id: string) => {
    setForm(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== id)
    }));
    setSelectedField(null);
  };

  const duplicateField = (id: string) => {
    const field = form.fields.find(f => f.id === id);
    if (field) {
      const newField = {
        ...field,
        id: `field_${Date.now()}`,
        label: `${field.label} (Copy)`
      };
      
      setForm(prev => ({
        ...prev,
        fields: [...prev.fields, newField]
      }));
    }
  };

  const moveField = (id: string, direction: 'up' | 'down') => {
    const fieldIndex = form.fields.findIndex(f => f.id === id);
    if (fieldIndex === -1) return;

    const newFields = [...form.fields];
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    if (targetIndex >= 0 && targetIndex < newFields.length) {
      [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];
      setForm(prev => ({ ...prev, fields: newFields }));
    }
  };

  const renderField = (field: FormField) => {
    const isSelected = selectedField === field.id;
    
    return (
      <div
        key={field.id}
        className={`p-4 border-2 rounded-lg transition-colors ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
        }`}
        onClick={() => setSelectedField(field.id)}
      >
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            
            {field.type === 'text' && (
              <Input
                placeholder={field.placeholder || 'Enter text...'}
                disabled
                className="w-full"
              />
            )}
            
            {field.type === 'textarea' && (
              <Textarea
                placeholder={field.placeholder || 'Enter text...'}
                disabled
                className="w-full"
                rows={3}
              />
            )}
            
            {field.type === 'select' && (
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {field.options?.map((option, index) => (
                    <SelectItem key={index} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {field.type === 'radio' && (
              <div className="space-y-2">
                {field.options?.map((option, index) => (
                  <label key={index} className="flex items-center space-x-2">
                    <input type="radio" disabled className="text-blue-600" />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}
            
            {field.type === 'checkbox' && (
              <div className="space-y-2">
                {field.options?.map((option, index) => (
                  <label key={index} className="flex items-center space-x-2">
                    <input type="checkbox" disabled className="text-blue-600" />
                    <span className="text-sm">{option}</span>
                  </label>
                ))}
              </div>
            )}
            
            {field.type === 'date' && (
              <Input type="date" disabled className="w-full" />
            )}
            
            {field.type === 'number' && (
              <Input
                type="number"
                placeholder={field.placeholder || 'Enter number...'}
                disabled
                className="w-full"
              />
            )}
            
            {field.type === 'email' && (
              <Input
                type="email"
                placeholder={field.placeholder || 'Enter email...'}
                disabled
                className="w-full"
              />
            )}
            
            {field.type === 'url' && (
              <Input
                type="url"
                placeholder={field.placeholder || 'Enter URL...'}
                disabled
                className="w-full"
              />
            )}
            
            {field.type === 'rating' && (
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon
                    key={star}
                    className="h-6 w-6 text-gray-300"
                    fill="currentColor"
                  />
                ))}
              </div>
            )}
            
            {field.type === 'file' && (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <FileTextIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Click to upload file</p>
              </div>
            )}
            
            {field.type === 'toggle' && (
              <Switch disabled />
            )}
          </div>
          
          {isSelected && (
            <div className="flex space-x-1 ml-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicateField(field.id);
                }}
              >
                <CopyIcon className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  moveField(field.id, 'up');
                }}
              >
                <MoveIcon className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteField(field.id);
                }}
              >
                <TrashIcon className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFieldEditor = () => {
    const field = form.fields.find(f => f.id === selectedField);
    if (!field) return null;

    return (
      <div className="space-y-4">
        <h3 className="font-medium">Field Settings</h3>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Field Label</label>
          <Input
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
            placeholder="Field label"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Placeholder</label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
            placeholder="Placeholder text"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => updateField(field.id, { required: checked })}
          />
          <label className="text-sm font-medium text-gray-700">Required field</label>
        </div>
        
        {(field.type === 'select' || field.type === 'radio' || field.type === 'checkbox') && (
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Options</label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <div key={index} className="flex space-x-2">
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[index] = e.target.value;
                      updateField(field.id, { options: newOptions });
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const newOptions = field.options?.filter((_, i) => i !== index) || [];
                      updateField(field.id, { options: newOptions });
                    }}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const newOptions = [...(field.options || []), 'New Option'];
                  updateField(field.id, { options: newOptions });
                }}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Field Width (%)</label>
          <Slider
            value={[field.style?.width || 100]}
            onValueChange={([value]) => updateField(field.id, { 
              style: { ...field.style, width: value }
            })}
            min={25}
            max={100}
            step={25}
            className="w-full"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">SyncBoard Forms</h1>
          <Badge variant="outline">
            {form.fields.length} field{form.fields.length !== 1 ? 's' : ''}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreview(!isPreview)}
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            {isPreview ? 'Edit' : 'Preview'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={saveDocument}
            disabled={isSaving}
          >
            <SaveIcon className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button variant="outline" size="sm">
            <ShareIcon className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        {!isPreview && (
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <Tabs defaultValue="fields" className="flex-1">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="fields" className="flex-1 p-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-medium">Add Fields</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('text')}
                    >
                      <TextIcon className="h-4 w-4 mr-1" />
                      Text
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('textarea')}
                    >
                      <FileTextIcon className="h-4 w-4 mr-1" />
                      Textarea
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('select')}
                    >
                      <CheckSquareIcon className="h-4 w-4 mr-1" />
                      Select
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('radio')}
                    >
                      <CircleIcon className="h-4 w-4 mr-1" />
                      Radio
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('checkbox')}
                    >
                      <CheckSquareIcon className="h-4 w-4 mr-1" />
                      Checkbox
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('date')}
                    >
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      Date
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('number')}
                    >
                      <TextIcon className="h-4 w-4 mr-1" />
                      Number
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('email')}
                    >
                      <TextIcon className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('url')}
                    >
                      <LinkIcon className="h-4 w-4 mr-1" />
                      URL
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('rating')}
                    >
                      <StarIcon className="h-4 w-4 mr-1" />
                      Rating
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('file')}
                    >
                      <ImageIcon className="h-4 w-4 mr-1" />
                      File
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addField('toggle')}
                    >
                      <ToggleLeftIcon className="h-4 w-4 mr-1" />
                      Toggle
                    </Button>
                  </div>
                  
                  {selectedField && renderFieldEditor()}
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="flex-1 p-4">
                <div className="space-y-4">
                  <h3 className="font-medium">Form Settings</h3>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Form Title</label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Form title"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Form description"
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Allow Anonymous</label>
                      <Switch
                        checked={form.settings.allowAnonymous}
                        onCheckedChange={(checked) => setForm(prev => ({
                          ...prev,
                          settings: { ...prev.settings, allowAnonymous: checked }
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Collect Emails</label>
                      <Switch
                        checked={form.settings.collectEmails}
                        onCheckedChange={(checked) => setForm(prev => ({
                          ...prev,
                          settings: { ...prev.settings, collectEmails: checked }
                        }))}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Show Progress</label>
                      <Switch
                        checked={form.settings.showProgress}
                        onCheckedChange={(checked) => setForm(prev => ({
                          ...prev,
                          settings: { ...prev.settings, showProgress: checked }
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-1 block">Confirmation Message</label>
                    <Textarea
                      value={form.settings.confirmationMessage}
                      onChange={(e) => setForm(prev => ({
                        ...prev,
                        settings: { ...prev.settings, confirmationMessage: e.target.value }
                      }))}
                      placeholder="Thank you for your submission!"
                      rows={2}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Form Editor/Preview */}
          <div className="flex-1 overflow-auto bg-white">
            <div className="max-w-4xl mx-auto p-8">
              {isPreview ? (
                <div className="max-w-2xl mx-auto">
                  <h1 className="text-3xl font-bold mb-4">{form.title}</h1>
                  {form.description && (
                    <p className="text-gray-600 mb-8">{form.description}</p>
                  )}
                  
                  <form ref={formRef} className="space-y-6">
                    {form.fields.map(renderField)}
                    
                    <div className="pt-6">
                      <Button type="submit" className="w-full">
                        Submit Form
                      </Button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto">
                  <div className="mb-8">
                    <Input
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      className="text-3xl font-bold border-none shadow-none focus:ring-0 p-0 mb-2"
                      placeholder="Form Title"
                    />
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      className="text-gray-600 border-none shadow-none focus:ring-0 p-0 resize-none"
                      placeholder="Form description (optional)"
                      rows={2}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    {form.fields.length === 0 ? (
                      <div className="text-center text-gray-500 py-16">
                        <FileTextIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg mb-2">Start building your form</p>
                        <p className="text-sm">Click "Fields" in the sidebar to add form fields</p>
                      </div>
                    ) : (
                      form.fields.map(renderField)
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};