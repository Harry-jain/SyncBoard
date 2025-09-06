import express from 'express';
import { DriveStorageService } from '../storage/drive-storage';
import { isAuthenticated } from '../auth';
import multer from 'multer';

const router = express.Router();
const driveService = new DriveStorageService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// GET /api/drive/storage - Get storage information
router.get('/storage', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const storage = await driveService.getStorageInfo(userId);
    res.json({ success: true, storage });
  } catch (error) {
    console.error('Get storage info error:', error);
    res.status(500).json({ success: false, message: 'Failed to get storage info' });
  }
});

// GET /api/drive/files - Get files in folder
router.get('/files', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { parentId, page = 1, limit = 50, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    const result = await driveService.getFiles(
      userId,
      parentId ? parseInt(parentId as string) : undefined,
      parseInt(page as string),
      parseInt(limit as string),
      search as string
    );
    
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ success: false, message: 'Failed to get files' });
  }
});

// POST /api/drive/files - Create file or folder
router.post('/files', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { name, type, parentId } = req.body;
    
    const result = await driveService.uploadFile(userId, {
      name,
      type,
      size: 0,
      parentId: parentId ? parseInt(parentId) : undefined
    });
    
    res.json(result);
  } catch (error) {
    console.error('Create file error:', error);
    res.status(500).json({ success: false, message: 'Failed to create file' });
  }
});

// GET /api/drive/files/:id - Get file by ID
router.get('/files/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const fileId = parseInt(req.params.id);
    const file = await driveService.getFile(fileId, userId);
    
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    res.json({ success: true, file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ success: false, message: 'Failed to get file' });
  }
});

// PUT /api/drive/files/:id - Update file
router.put('/files/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const fileId = parseInt(req.params.id);
    const { name, content, settings } = req.body;
    
    const result = await driveService.updateFile(fileId, userId, {
      name,
      content,
      settings
    });
    
    res.json(result);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ success: false, message: 'Failed to update file' });
  }
});

// DELETE /api/drive/files/:id - Delete file
router.delete('/files/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const fileId = parseInt(req.params.id);
    const result = await driveService.deleteFile(fileId, userId);
    
    res.json(result);
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// POST /api/drive/upload - Upload file
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { parentId } = req.body;
    
    const result = await driveService.uploadFile(userId, {
      name: req.file.originalname,
      type: 'file',
      mimeType: req.file.mimetype,
      size: req.file.size,
      parentId: parentId ? parseInt(parentId) : undefined,
      content: req.file.buffer.toString('base64')
    });
    
    res.json(result);
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload file' });
  }
});

// GET /api/drive/files/:id/download - Download file
router.get('/files/:id/download', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const fileId = parseInt(req.params.id);
    const file = await driveService.getFile(fileId, userId);
    
    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    
    // In a real app, you would stream the file content
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.send('File content would be streamed here');
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ success: false, message: 'Failed to download file' });
  }
});

// Office Documents Routes

// GET /api/drive/documents/:id - Get office document
router.get('/documents/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const documentId = parseInt(req.params.id);
    const file = await driveService.getFile(documentId, userId);
    
    if (!file) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    
    // Get office document data
    const response = await fetch(`/api/drive/office-documents/${documentId}`);
    const data = await response.json();
    
    res.json({ success: true, document: data.document, file });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ success: false, message: 'Failed to get document' });
  }
});

// POST /api/drive/documents - Create office document
router.post('/documents', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { title, documentType, parentId } = req.body;
    
    const result = await driveService.createOfficeDocument(userId, {
      title,
      documentType,
      parentId: parentId ? parseInt(parentId) : undefined
    });
    
    res.json(result);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ success: false, message: 'Failed to create document' });
  }
});

// PUT /api/drive/documents/:id - Update office document
router.put('/documents/:id', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const documentId = parseInt(req.params.id);
    const { content, settings } = req.body;
    
    const result = await driveService.updateFile(documentId, userId, {
      content,
      settings
    });
    
    res.json(result);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ success: false, message: 'Failed to update document' });
  }
});

// GET /api/drive/templates - Get document templates
router.get('/templates', async (req, res) => {
  try {
    const { documentType, category } = req.query;
    
    const templates = await driveService.getTemplates(
      documentType as string,
      category as string,
      true
    );
    
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, message: 'Failed to get templates' });
  }
});

export default router;