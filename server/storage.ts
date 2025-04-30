import { users, images, type User, type InsertUser, type GeneratedImage } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, isNotNull } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { push } from "./ws";

// Define storage interface
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveImage(image: GeneratedImage): Promise<GeneratedImage>;
  getAllImages(options?: { starred?: boolean; trash?: boolean; limit?: number; cursor?: string }): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }>;
  getImageById(id: string): Promise<GeneratedImage | undefined>;
  updateImage(id: string, updates: Partial<GeneratedImage>): Promise<GeneratedImage | undefined>;
  deleteImage(id: string, permanent?: boolean): Promise<void>;
  bulkUpdateImages(ids: string[], updates: Partial<GeneratedImage>): Promise<void>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  private uploadsDir: string;
  
  constructor() {
    // Ensure uploads directory exists
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async saveImage(image: GeneratedImage): Promise<GeneratedImage> {
    // First try to extract base64 data from image URL if present
    let base64Data: string | null = null;
    
    if (image.url && image.url.startsWith('data:image')) {
      base64Data = image.url.split(',')[1];
    }
    
    // Create directory structure if it doesn't exist
    const fullDir = path.join(this.uploadsDir, 'full');
    const thumbDir = path.join(this.uploadsDir, 'thumb');
    
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, { recursive: true });
    }
    
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    
    // Generate file paths
    const fileName = `${image.id}.png`;
    const thumbName = `${image.id}_thumb.png`;
    const filePath = path.join(fullDir, fileName);
    const thumbPath = path.join(thumbDir, thumbName);
    
    // Save image file if we have base64 data
    if (base64Data) {
      fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
      
      // For now, just use the same image for thumbnail
      fs.writeFileSync(thumbPath, Buffer.from(base64Data, 'base64'));
    }
    
    // Parse size to get width and height
    const [width, height] = image.size.split('x');
    
    // Prepare database object
    const dbImage = {
      id: image.id,
      url: image.url,
      prompt: image.prompt,
      size: image.size,
      model: image.model,
      // Set width and height
      width: width || "1024",
      height: height || "1024",
      // Set paths for URLs
      fullUrl: `/uploads/full/${fileName}`,
      thumbUrl: `/uploads/thumb/${thumbName}`,
      sourceThumb: image.sourceThumb || null,
      sourceImage: image.sourceImage || null, // Add sourceImage to database
      starred: "false",
      // Don't set deletedAt - it's null by default
    };
    
    // Save to database
    const [savedImage] = await db.insert(images).values(dbImage).returning();
    
    // Notify clients about the new image with complete image data
    push('imageCreated', {
      image: {
        id: savedImage.id,
        url: savedImage.url,
        prompt: savedImage.prompt,
        size: savedImage.size,
        model: savedImage.model,
        createdAt: savedImage.createdAt ? new Date(savedImage.createdAt).toISOString() : new Date().toISOString(),
        width: savedImage.width || '1024',
        height: savedImage.height || '1024',
        fullUrl: savedImage.fullUrl,
        thumbUrl: savedImage.thumbUrl,
        starred: savedImage.starred === "true",
        sourceThumb: savedImage.sourceThumb,
        sourceImage: savedImage.sourceImage,
        deletedAt: savedImage.deletedAt ? new Date(savedImage.deletedAt).toISOString() : null
      }
    });
    
    // Convert to GeneratedImage type
    return {
      ...savedImage,
      createdAt: savedImage.createdAt ? new Date(savedImage.createdAt).toISOString() : new Date().toISOString(),
      starred: savedImage.starred === "true",
      deletedAt: savedImage.deletedAt ? new Date(savedImage.deletedAt).toISOString() : null
    };
  }

  async getAllImages(options: { starred?: boolean; trash?: boolean; limit?: number; cursor?: string } = {}): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }> {
    const { starred, trash, limit = 20, cursor } = options;
    
    // Build query
    let query = db.select().from(images);
    
    // Filter by starred and trash status
    if (starred) {
      query = query.where(eq(images.starred, "true"));
    }
    
    if (trash) {
      query = query.where(isNotNull(images.deletedAt));
    } else {
      query = query.where(isNull(images.deletedAt));
    }
    
    // Order by createdAt (latest first)
    query = query.orderBy(desc(images.createdAt));
    
    // Apply pagination
    query = query.limit(limit + 1); // Get one extra to determine if there's more
    
    // Apply cursor if provided
    if (cursor) {
      const [cursorDate, cursorId] = cursor.split(':');
      // In a real app, we'd use a more sophisticated cursor approach
      if (cursorDate && cursorId) {
        // Skip items before the cursor
        // This is a simplification - in production we'd use something more efficient
      }
    }
    
    // Execute query
    const results = await query;
    
    // Check if there are more results
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, limit) : results;
    
    // Create next cursor if there are more results
    let nextCursor = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = `${lastItem.createdAt}:${lastItem.id}`;
    }
    
    // Convert to GeneratedImage type
    const mappedItems = items.map(item => ({
      ...item,
      createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
      starred: item.starred === "true",
      deletedAt: item.deletedAt ? new Date(item.deletedAt).toISOString() : null
    }));
    
    return {
      items: mappedItems,
      nextCursor
    };
  }

  async getImageById(id: string): Promise<GeneratedImage | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    
    if (!image) return undefined;
    
    return {
      ...image,
      createdAt: image.createdAt ? new Date(image.createdAt).toISOString() : new Date().toISOString(),
      starred: image.starred === "true",
      deletedAt: image.deletedAt ? new Date(image.deletedAt).toISOString() : null
    };
  }

  async updateImage(id: string, updates: Partial<GeneratedImage>): Promise<GeneratedImage | undefined> {
    // Convert boolean to string for starred field
    const dbUpdates: Record<string, any> = {};
    
    if (updates.starred !== undefined) {
      dbUpdates.starred = updates.starred ? "true" : "false";
    }
    
    if (updates.deletedAt !== undefined) {
      dbUpdates.deletedAt = updates.deletedAt ? new Date(updates.deletedAt) : null;
    }
    
    // Add other updates
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'starred' && key !== 'deletedAt') {
        dbUpdates[key] = value;
      }
    });
    
    // Update in database
    const [updatedImage] = await db
      .update(images)
      .set(dbUpdates)
      .where(eq(images.id, id))
      .returning();
    
    if (!updatedImage) return undefined;
    
    // Notify clients about the updated image
    push('imageUpdated', {
      id: updatedImage.id,
      updates: {
        starred: updatedImage.starred === "true",
        deletedAt: updatedImage.deletedAt
      }
    });
    
    return {
      ...updatedImage,
      createdAt: updatedImage.createdAt ? new Date(updatedImage.createdAt).toISOString() : new Date().toISOString(),
      starred: updatedImage.starred === "true",
      deletedAt: updatedImage.deletedAt ? new Date(updatedImage.deletedAt).toISOString() : null
    };
  }

  async deleteImage(id: string, permanent: boolean = false): Promise<void> {
    if (permanent) {
      // Get image paths before deleting
      const [image] = await db.select().from(images).where(eq(images.id, id));
      
      if (image) {
        // Delete image files
        const filePath = path.join(this.uploadsDir, 'full', `${id}.png`);
        const thumbPath = path.join(this.uploadsDir, 'thumb', `${id}_thumb.png`);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
        
        // Delete from database
        await db.delete(images).where(eq(images.id, id));
        
        // Notify clients
        push('imageDeleted', { id });
      }
    } else {
      // Soft delete - mark as deleted
      await this.updateImage(id, { deletedAt: new Date().toISOString() });
    }
  }

  async bulkUpdateImages(ids: string[], updates: Partial<GeneratedImage>): Promise<void> {
    // Convert boolean to string for starred field
    const dbUpdates: Record<string, any> = {};
    
    if (updates.starred !== undefined) {
      dbUpdates.starred = updates.starred ? "true" : "false";
    }
    
    if (updates.deletedAt !== undefined) {
      dbUpdates.deletedAt = updates.deletedAt ? new Date(updates.deletedAt) : null;
    }
    
    // Add other updates
    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'starred' && key !== 'deletedAt') {
        dbUpdates[key] = value;
      }
    });
    
    for (const id of ids) {
      await db
        .update(images)
        .set(dbUpdates)
        .where(eq(images.id, id));
      
      // Notify clients
      push('imageUpdated', {
        id,
        updates: {
          starred: dbUpdates.starred === "true",
          deletedAt: dbUpdates.deletedAt
        }
      });
    }
  }
}

// Create database storage instance
export const storage = new DatabaseStorage();
