import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusIcon, 
  UploadIcon, 
  DownloadIcon, 
  ShareIcon, 
  TrashIcon, 
  EditIcon, 
  EyeIcon, 
  SearchIcon, 
  FilterIcon, 
  GridIcon, 
  ListIcon, 
  FolderIcon, 
  FolderOpenIcon, 
  FileIcon, 
  FileTextIcon, 
  ImageIcon, 
  VideoIcon, 
  MusicIcon, 
  ArchiveIcon, 
  MoreHorizontalIcon,
  StarIcon,
  ClockIcon,
  UserIcon,
  SettingsIcon,
  BarChart3Icon
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Progress } from '../ui/progress';
import { SlidesApp } from '../office/SlidesApp';
import { ExcelApp } from '../office/ExcelApp';
import { WordApp } from '../office/WordApp';
import { FormsApp } from '../office/FormsApp';
import { NotebookApp } from '../office/NotebookApp';

interface DriveFile {
  id: number;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  size: number;
  parentId?: number;
  path: string;
  isPublic: boolean;
  isShared: boolean;
  shareToken?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  lastAccessed?: string;
  metadata?: any;
}

interface StorageInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  usagePercentage: number;
}

interface DriveInterfaceProps {
  onClose?: () => void;
}

export const DriveInterface: React.FC<DriveInterfaceProps> = ({ onClose }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [activeDocument, setActiveDocument] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadFiles();
    loadStorageInfo();
  }, [currentFolder]);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/drive/files?parentId=${currentFolder || ''}&sortBy=${sortBy}&sortOrder=${sortOrder}&search=${searchQuery}`);
      const data = await response.json();
      
      if (data.success) {
        setFiles(data.files);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const response = await fetch('/api/drive/storage');
      const data = await response.json();
      
      if (data.success) {
        setStorageInfo(data.storage);
      }
    } catch (error) {
      console.error('Failed to load storage info:', error);
    }
  };

  const createFolder = async (name: string) => {
    try {
      const response = await fetch('/api/drive/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          type: 'folder',
          parentId: currentFolder
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadFiles();
      }
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const createOfficeDocument = async (type: 'slides' | 'excel' | 'word' | 'forms' | 'notebook', name: string) => {
    try {
      const response = await fetch('/api/drive/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: name,
          documentType: type,
          parentId: currentFolder
        })
      });
      
      const data = await response.json();
      if (data.success) {
        loadFiles();
        setActiveApp(type);
        setActiveDocument(data.document.id);
      }
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const uploadFile = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('parentId', currentFolder?.toString() || '');

      const response = await fetch('/api/drive/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        loadFiles();
        loadStorageInfo();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const deleteFile = async (fileId: number) => {
    try {
      const response = await fetch(`/api/drive/files/${fileId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        loadFiles();
        loadStorageInfo();
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const openFile = (file: DriveFile) => {
    if (file.type === 'folder') {
      setCurrentFolder(file.id);
      return;
    }

    // Check if it's an office document
    const officeTypes = ['slides', 'excel', 'word', 'forms', 'notebook'];
    const mimeType = file.mimeType || '';
    
    if (mimeType.includes('syncboard.slides')) {
      setActiveApp('slides');
      setActiveDocument(file.id);
    } else if (mimeType.includes('syncboard.spreadsheet')) {
      setActiveApp('excel');
      setActiveDocument(file.id);
    } else if (mimeType.includes('syncboard.document')) {
      setActiveApp('word');
      setActiveDocument(file.id);
    } else if (mimeType.includes('syncboard.form')) {
      setActiveApp('forms');
      setActiveDocument(file.id);
    } else if (mimeType.includes('syncboard.notebook')) {
      setActiveApp('notebook');
      setActiveDocument(file.id);
    } else {
      // Handle other file types (download, preview, etc.)
      window.open(`/api/drive/files/${file.id}/download`, '_blank');
    }
  };

  const getFileIcon = (file: DriveFile) => {
    if (file.type === 'folder') {
      return <FolderIcon className="h-8 w-8 text-blue-500" />;
    }

    const mimeType = file.mimeType || '';
    
    if (mimeType.includes('syncboard.slides')) {
      return <FileTextIcon className="h-8 w-8 text-orange-500" />;
    } else if (mimeType.includes('syncboard.spreadsheet')) {
      return <FileTextIcon className="h-8 w-8 text-green-500" />;
    } else if (mimeType.includes('syncboard.document')) {
      return <FileTextIcon className="h-8 w-8 text-blue-500" />;
    } else if (mimeType.includes('syncboard.form')) {
      return <FileTextIcon className="h-8 w-8 text-purple-500" />;
    } else if (mimeType.includes('syncboard.notebook')) {
      return <FileTextIcon className="h-8 w-8 text-yellow-500" />;
    } else if (mimeType.startsWith('image/')) {
      return <ImageIcon className="h-8 w-8 text-pink-500" />;
    } else if (mimeType.startsWith('video/')) {
      return <VideoIcon className="h-8 w-8 text-red-500" />;
    } else if (mimeType.startsWith('audio/')) {
      return <MusicIcon className="h-8 w-8 text-indigo-500" />;
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return <ArchiveIcon className="h-8 w-8 text-gray-500" />;
    } else {
      return <FileIcon className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleFileSelect = (fileId: number, selected: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (selected) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(uploadFile);
    }
  };

  const renderOfficeApp = () => {
    if (!activeApp || !activeDocument) return null;

    const commonProps = {
      documentId: activeDocument,
      onSave: (content: any) => {
        // Save logic would go here
        console.log('Saving document:', content);
      },
      onClose: () => {
        setActiveApp(null);
        setActiveDocument(null);
        loadFiles();
      }
    };

    switch (activeApp) {
      case 'slides':
        return <SlidesApp {...commonProps} />;
      case 'excel':
        return <ExcelApp {...commonProps} />;
      case 'word':
        return <WordApp {...commonProps} />;
      case 'forms':
        return <FormsApp {...commonProps} />;
      case 'notebook':
        return <NotebookApp {...commonProps} />;
      default:
        return null;
    }
  };

  if (activeApp) {
    return renderOfficeApp();
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold">SyncBoard Drive</h1>
          {storageInfo && (
            <div className="flex items-center space-x-2">
              <div className="w-32">
                <Progress value={storageInfo.usagePercentage} className="h-2" />
              </div>
              <span className="text-sm text-gray-500">
                {formatFileSize(storageInfo.usedSpace)} / {formatFileSize(storageInfo.totalSpace)}
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <SearchIcon className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none shadow-none focus:ring-0"
              />
            </div>
            
            <div className="space-y-2">
              <Button
                size="sm"
                className="w-full justify-start"
                onClick={() => setShowUpload(true)}
              >
                <UploadIcon className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  const name = prompt('Folder name:');
                  if (name) createFolder(name);
                }}
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-700 mb-2">Office Apps</h3>
              
              <div className="space-y-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => createOfficeDocument('slides', 'New Presentation')}
                >
                  <FileTextIcon className="h-4 w-4 mr-2 text-orange-500" />
                  Slides
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => createOfficeDocument('excel', 'New Spreadsheet')}
                >
                  <FileTextIcon className="h-4 w-4 mr-2 text-green-500" />
                  Excel
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => createOfficeDocument('word', 'New Document')}
                >
                  <FileTextIcon className="h-4 w-4 mr-2 text-blue-500" />
                  Word
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => createOfficeDocument('forms', 'New Form')}
                >
                  <FileTextIcon className="h-4 w-4 mr-2 text-purple-500" />
                  Forms
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => createOfficeDocument('notebook', 'New Notebook')}
                >
                  <FileTextIcon className="h-4 w-4 mr-2 text-yellow-500" />
                  Notebook
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
              >
                <GridIcon className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
              
              <div className="w-px h-6 bg-gray-300 mx-2" />
              
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="size">Size</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
            
            <div className="flex items-center space-x-2">
              {selectedFiles.size > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    selectedFiles.forEach(deleteFile);
                    setSelectedFiles(new Set());
                  }}
                >
                  <TrashIcon className="h-4 w-4 mr-2" />
                  Delete ({selectedFiles.size})
                </Button>
              )}
            </div>
          </div>

          {/* Files Grid/List */}
          <div className="flex-1 overflow-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading files...</p>
                </div>
              </div>
            ) : files.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center text-gray-500">
                  <FolderIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">No files found</p>
                  <p className="text-sm">Upload files or create a new document to get started</p>
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {files.map(file => (
                  <Card
                    key={file.id}
                    className={`cursor-pointer transition-colors ${
                      selectedFiles.has(file.id) ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                    }`}
                    onClick={() => openFile(file)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleFileSelect(file.id, !selectedFiles.has(file.id));
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col items-center text-center">
                        {getFileIcon(file)}
                        <p className="text-sm font-medium mt-2 truncate w-full">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {file.type === 'folder' ? 'Folder' : formatFileSize(file.size)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(file.updatedAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <div
                    key={file.id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFiles.has(file.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => openFile(file)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleFileSelect(file.id, !selectedFiles.has(file.id));
                    }}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {file.type === 'folder' ? 'Folder' : formatFileSize(file.size)} • {formatDate(file.updatedAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {file.isShared && (
                        <Badge variant="outline" className="text-xs">Shared</Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileSelect(file.id, !selectedFiles.has(file.id));
                        }}
                      >
                        <MoreHorizontalIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
    </div>
  );
};