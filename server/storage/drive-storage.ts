import { eq, and, desc, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { 
  driveStorage, 
  driveFiles, 
  officeDocuments,
  documentVersions,
  documentComments,
  documentSharing,
  documentTemplates,
  users,
  InsertDriveFile,
  InsertOfficeDocument,
  InsertDocumentVersion,
  InsertDocumentComment,
  InsertDocumentSharing,
  InsertDocumentTemplate,
  DriveFile,
  OfficeDocument,
  DriveStorage
} from '../../shared/schema';
import crypto from 'crypto';

export interface FileUploadResult {
  success: boolean;
  file?: DriveFile;
  error?: string;
}

export interface StorageInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  usagePercentage: number;
}

export interface FileSearchResult {
  files: DriveFile[];
  total: number;
  page: number;
  limit: number;
}

export class DriveStorageService {
  // Get user's storage information
  public async getStorageInfo(userId: number): Promise<StorageInfo> {
    try {
      const [storage] = await db.select()
        .from(driveStorage)
        .where(eq(driveStorage.userId, userId))
        .limit(1);

      if (!storage) {
        // Create storage record if it doesn't exist
        await this.initializeUserStorage(userId);
        return {
          totalSpace: 5368709120, // 5GB
          usedSpace: 0,
          availableSpace: 5368709120,
          usagePercentage: 0
        };
      }

      const usagePercentage = (Number(storage.usedSpace) / Number(storage.totalSpace)) * 100;

      return {
        totalSpace: Number(storage.totalSpace),
        usedSpace: Number(storage.usedSpace),
        availableSpace: Number(storage.totalSpace) - Number(storage.usedSpace),
        usagePercentage: Math.round(usagePercentage * 100) / 100
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw new Error('Failed to get storage information');
    }
  }

  // Initialize storage for new user
  public async initializeUserStorage(userId: number): Promise<void> {
    try {
      await db.insert(driveStorage).values({
        userId,
        totalSpace: 5368709120, // 5GB
        usedSpace: 0,
        maxSpace: 5368709120
      });
    } catch (error) {
      console.error('Failed to initialize user storage:', error);
      throw new Error('Failed to initialize storage');
    }
  }

  // Upload file to drive
  public async uploadFile(
    userId: number,
    fileData: {
      name: string;
      type: 'file' | 'folder';
      mimeType?: string;
      size: number;
      parentId?: number;
      content?: any;
    }
  ): Promise<FileUploadResult> {
    try {
      // Check storage space
      const storageInfo = await this.getStorageInfo(userId);
      if (fileData.type === 'file' && storageInfo.availableSpace < fileData.size) {
        return {
          success: false,
          error: 'Insufficient storage space'
        };
      }

      // Generate file path
      const path = await this.generateFilePath(userId, fileData.parentId, fileData.name);

      // Generate checksum for file integrity
      const checksum = fileData.type === 'file' ? 
        crypto.createHash('md5').update(JSON.stringify(fileData.content)).digest('hex') : 
        null;

      // Create file record
      const fileRecord: InsertDriveFile = {
        userId,
        name: fileData.name,
        type: fileData.type,
        mimeType: fileData.mimeType,
        size: BigInt(fileData.size),
        parentId: fileData.parentId,
        path,
        checksum,
        metadata: {
          uploadedAt: new Date().toISOString(),
          originalName: fileData.name
        }
      };

      const [file] = await db.insert(driveFiles).values(fileRecord).returning();

      // Update storage usage
      await this.updateStorageUsage(userId, fileData.size);

      return {
        success: true,
        file
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      return {
        success: false,
        error: 'Failed to upload file'
      };
    }
  }

  // Create office document
  public async createOfficeDocument(
    userId: number,
    documentData: {
      title: string;
      documentType: 'slides' | 'excel' | 'word' | 'forms' | 'notebook';
      content?: any;
      settings?: any;
      templateId?: number;
    }
  ): Promise<{ success: boolean; document?: OfficeDocument; error?: string }> {
    try {
      // Create file record first
      const fileResult = await this.uploadFile(userId, {
        name: `${documentData.title}.${documentData.documentType}`,
        type: 'file',
        mimeType: this.getMimeType(documentData.documentType),
        size: JSON.stringify(documentData.content || {}).length,
        content: documentData.content
      });

      if (!fileResult.success || !fileResult.file) {
        return {
          success: false,
          error: fileResult.error || 'Failed to create file'
        };
      }

      // Create office document record
      const officeDoc: InsertOfficeDocument = {
        fileId: fileResult.file.id,
        documentType: documentData.documentType,
        title: documentData.title,
        content: documentData.content || this.getDefaultContent(documentData.documentType),
        settings: documentData.settings || this.getDefaultSettings(documentData.documentType),
        collaborators: [userId],
        permissions: {
          owner: userId,
          canEdit: [userId],
          canView: [userId],
          canComment: [userId]
        },
        lastEditedBy: userId
      };

      const [document] = await db.insert(officeDocuments).values(officeDoc).returning();

      // Create initial version
      await this.createDocumentVersion(document.id, document.content, userId, 'Initial version');

      return {
        success: true,
        document
      };
    } catch (error) {
      console.error('Failed to create office document:', error);
      return {
        success: false,
        error: 'Failed to create office document'
      };
    }
  }

  // Get files in folder
  public async getFiles(
    userId: number,
    parentId?: number,
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Promise<FileSearchResult> {
    try {
      const offset = (page - 1) * limit;
      
      let whereCondition = eq(driveFiles.userId, userId);
      if (parentId !== undefined) {
        whereCondition = and(whereCondition, eq(driveFiles.parentId, parentId));
      }

      if (search) {
        whereCondition = and(whereCondition, like(driveFiles.name, `%${search}%`));
      }

      const files = await db.select()
        .from(driveFiles)
        .where(whereCondition)
        .orderBy(desc(driveFiles.updatedAt))
        .limit(limit)
        .offset(offset);

      const totalResult = await db.select({ count: sql<number>`count(*)` })
        .from(driveFiles)
        .where(whereCondition);

      return {
        files,
        total: totalResult[0]?.count || 0,
        page,
        limit
      };
    } catch (error) {
      console.error('Failed to get files:', error);
      return {
        files: [],
        total: 0,
        page,
        limit
      };
    }
  }

  // Get file by ID
  public async getFile(fileId: number, userId: number): Promise<DriveFile | null> {
    try {
      const [file] = await db.select()
        .from(driveFiles)
        .where(and(
          eq(driveFiles.id, fileId),
          eq(driveFiles.userId, userId)
        ))
        .limit(1);

      return file || null;
    } catch (error) {
      console.error('Failed to get file:', error);
      return null;
    }
  }

  // Update file
  public async updateFile(
    fileId: number,
    userId: number,
    updates: Partial<{
      name: string;
      content: any;
      settings: any;
    }>
  ): Promise<{ success: boolean; file?: DriveFile; error?: string }> {
    try {
      const file = await this.getFile(fileId, userId);
      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Update file record
      const updateData: any = {
        updatedAt: new Date()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.content) updateData.metadata = { ...file.metadata, content: updates.content };
      if (updates.settings) updateData.metadata = { ...file.metadata, settings: updates.settings };

      const [updatedFile] = await db.update(driveFiles)
        .set(updateData)
        .where(eq(driveFiles.id, fileId))
        .returning();

      // Update office document if it exists
      const [officeDoc] = await db.select()
        .from(officeDocuments)
        .where(eq(officeDocuments.fileId, fileId))
        .limit(1);

      if (officeDoc) {
        const docUpdateData: any = {
          lastEditedBy: userId,
          lastEditedAt: new Date()
        };

        if (updates.content) docUpdateData.content = updates.content;
        if (updates.settings) docUpdateData.settings = updates.settings;
        if (updates.name) docUpdateData.title = updates.name;

        await db.update(officeDocuments)
          .set(docUpdateData)
          .where(eq(officeDocuments.id, officeDoc.id));

        // Create new version
        await this.createDocumentVersion(
          officeDoc.id,
          updates.content || officeDoc.content,
          userId,
          'Document updated'
        );
      }

      return {
        success: true,
        file: updatedFile
      };
    } catch (error) {
      console.error('Failed to update file:', error);
      return {
        success: false,
        error: 'Failed to update file'
      };
    }
  }

  // Delete file
  public async deleteFile(fileId: number, userId: number): Promise<{ success: boolean; error?: string }> {
    try {
      const file = await this.getFile(fileId, userId);
      if (!file) {
        return {
          success: false,
          error: 'File not found'
        };
      }

      // Delete file record
      await db.delete(driveFiles).where(eq(driveFiles.id, fileId));

      // Update storage usage
      await this.updateStorageUsage(userId, -Number(file.size));

      return {
        success: true
      };
    } catch (error) {
      console.error('Failed to delete file:', error);
      return {
        success: false,
        error: 'Failed to delete file'
      };
    }
  }

  // Create document version
  public async createDocumentVersion(
    documentId: number,
    content: any,
    editedBy: number,
    comment?: string
  ): Promise<void> {
    try {
      // Get current version
      const [currentDoc] = await db.select()
        .from(officeDocuments)
        .where(eq(officeDocuments.id, documentId))
        .limit(1);

      if (!currentDoc) return;

      const newVersion = currentDoc.version + 1;

      // Create version record
      await db.insert(documentVersions).values({
        documentId,
        version: newVersion,
        content,
        editedBy,
        comment
      });

      // Update document version
      await db.update(officeDocuments)
        .set({ version: newVersion })
        .where(eq(officeDocuments.id, documentId));
    } catch (error) {
      console.error('Failed to create document version:', error);
    }
  }

  // Get document versions
  public async getDocumentVersions(documentId: number): Promise<any[]> {
    try {
      return await db.select()
        .from(documentVersions)
        .where(eq(documentVersions.documentId, documentId))
        .orderBy(desc(documentVersions.version));
    } catch (error) {
      console.error('Failed to get document versions:', error);
      return [];
    }
  }

  // Share document
  public async shareDocument(
    documentId: number,
    userId: number,
    shareData: {
      sharedWith?: number;
      permission: 'view' | 'edit' | 'comment' | 'admin';
      isPublic?: boolean;
      expiresAt?: Date;
    }
  ): Promise<{ success: boolean; shareToken?: string; error?: string }> {
    try {
      const shareToken = crypto.randomBytes(32).toString('hex');

      await db.insert(documentSharing).values({
        documentId,
        sharedWith: shareData.sharedWith,
        permission: shareData.permission,
        shareToken,
        isPublic: shareData.isPublic || false,
        expiresAt: shareData.expiresAt,
        createdBy: userId
      });

      return {
        success: true,
        shareToken
      };
    } catch (error) {
      console.error('Failed to share document:', error);
      return {
        success: false,
        error: 'Failed to share document'
      };
    }
  }

  // Get document templates
  public async getTemplates(
    documentType?: string,
    category?: string,
    isPublic: boolean = true
  ): Promise<any[]> {
    try {
      let whereCondition = eq(documentTemplates.isPublic, isPublic);
      
      if (documentType) {
        whereCondition = and(whereCondition, eq(documentTemplates.documentType, documentType));
      }
      
      if (category) {
        whereCondition = and(whereCondition, eq(documentTemplates.category, category));
      }

      return await db.select()
        .from(documentTemplates)
        .where(whereCondition)
        .orderBy(desc(documentTemplates.downloadCount));
    } catch (error) {
      console.error('Failed to get templates:', error);
      return [];
    }
  }

  // Helper methods
  private async generateFilePath(userId: number, parentId?: number, fileName: string): Promise<string> {
    if (!parentId) {
      return `/${fileName}`;
    }

    const [parent] = await db.select()
      .from(driveFiles)
      .where(eq(driveFiles.id, parentId))
      .limit(1);

    if (!parent) {
      return `/${fileName}`;
    }

    return `${parent.path}/${fileName}`;
  }

  private async updateStorageUsage(userId: number, sizeChange: number): Promise<void> {
    try {
      await db.update(driveStorage)
        .set({
          usedSpace: sql`${driveStorage.usedSpace} + ${sizeChange}`,
          updatedAt: new Date()
        })
        .where(eq(driveStorage.userId, userId));
    } catch (error) {
      console.error('Failed to update storage usage:', error);
    }
  }

  private getMimeType(documentType: string): string {
    const mimeTypes = {
      slides: 'application/vnd.syncboard.slides',
      excel: 'application/vnd.syncboard.spreadsheet',
      word: 'application/vnd.syncboard.document',
      forms: 'application/vnd.syncboard.form',
      notebook: 'application/vnd.syncboard.notebook'
    };
    return mimeTypes[documentType as keyof typeof mimeTypes] || 'application/octet-stream';
  }

  private getDefaultContent(documentType: string): any {
    const defaults = {
      slides: {
        slides: [{
          id: 1,
          title: 'Untitled Slide',
          content: '',
          background: '#ffffff',
          elements: []
        }]
      },
      excel: {
        sheets: [{
          id: 1,
          name: 'Sheet1',
          data: [[]],
          formulas: {}
        }]
      },
      word: {
        content: '',
        styles: {},
        formatting: {}
      },
      forms: {
        title: 'Untitled Form',
        description: '',
        fields: [],
        settings: {}
      },
      notebook: {
        pages: [{
          id: 1,
          title: 'Untitled Page',
          content: '',
          sections: []
        }]
      }
    };
    return defaults[documentType as keyof typeof defaults] || {};
  }

  private getDefaultSettings(documentType: string): any {
    return {
      theme: 'default',
      fontSize: 14,
      fontFamily: 'Arial',
      autoSave: true,
      collaboration: true
    };
  }
}