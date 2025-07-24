import { users, images, videos, projects, type User, type InsertUser, type GeneratedImage, type Video, type InsertVideo, type Project, type InsertProject } from "@shared/schema";
import { db } from "./db";
import { eq, desc, isNull, isNotNull, and, ilike, lt } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { push } from "./ws";

// Define storage interface
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  saveImage(image: GeneratedImage): Promise<GeneratedImage>;
  getAllImages(options?: { starred?: boolean; trash?: boolean; limit?: number; cursor?: string; searchQuery?: string }): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }>;
  getImageById(id: string): Promise<GeneratedImage | undefined>;
  updateImage(id: string, updates: Partial<GeneratedImage>): Promise<GeneratedImage | undefined>;
  deleteImage(id: string, permanent?: boolean): Promise<void>;
  bulkUpdateImages(ids: string[], updates: Partial<GeneratedImage>): Promise<void>;
  createVideo(video: InsertVideo): Promise<Video>;
  getVideoById(id: string): Promise<Video | undefined>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined>;
  getVideosByProject(projectId: string): Promise<Video[]>;
  createProject(project: InsertProject): Promise<Project>;
  getAllProjects(): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
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
      // Store user-selected parameters for enhanced display
      aspectRatio: image.aspectRatio || null,
      quality: image.quality || null,
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
        aspectRatio: savedImage.aspectRatio,
        quality: savedImage.quality,
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

  async getAllImages(options: { starred?: boolean; trash?: boolean; limit?: number; cursor?: string; searchQuery?: string } = {}): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }> {
    const { starred, trash, limit = 50, cursor, searchQuery } = options;
    
    console.log(`getAllImages called with options:`, JSON.stringify(options));
    
    // Apply sensible limit constraints for performance
    const take = Math.min(Number(limit) || 50, 100);
    
    try {
      // Build query
      let query = db.select().from(images);
      
      // Build conditions array
      const conditions = [];
      
      // Filter by starred and trash status
      if (starred) {
        console.log("Filtering for starred=true images");
        conditions.push(eq(images.starred, "true"));
      }
      
      if (trash) {
        conditions.push(isNotNull(images.deletedAt));
      } else {
        conditions.push(isNull(images.deletedAt));
      }
      
      // Add text search if searchQuery is provided
      if (searchQuery && searchQuery.trim() !== '') {
        const searchTerm = searchQuery.trim();
        console.log(`Searching for prompt containing: "${searchTerm}"`);
        
        // Use case-insensitive ILIKE for flexible search
        if (searchTerm.length >= 1) { // Allow even single character searches
          try {
            conditions.push(
              ilike(images.prompt, `%${searchTerm}%`)
            );
            
            console.log(`Added search condition for prompt containing: "${searchTerm}"`);
          } catch (err) {
            console.error(`Error adding search condition:`, err);
          }
        }
      }
      
      // Apply all conditions to the query
      if (conditions.length === 1) {
        query = query.where(conditions[0]);
      } else if (conditions.length > 1) {
        // For multiple conditions, use the 'and' operator
        query = query.where(and(...conditions));
      }
      
      // Order by createdAt (latest first)
      query = query.orderBy(desc(images.createdAt));
      
      // Apply cursor-based pagination if provided
      if (cursor) {
        try {
          const cursorImage = await db.select()
            .from(images)
            .where(eq(images.id, cursor))
            .limit(1);
            
          if (cursorImage.length > 0) {
            // Get the creation date of the cursor image for efficient pagination
            query = query.where(
              lt(images.createdAt, cursorImage[0].createdAt)
            );
          }
        } catch (err) {
          console.error('Error applying cursor pagination:', err);
        }
      }
      
      // Apply pagination
      query = query.limit(take + 1); // Get one extra to determine if there's more
      
      // Log the SQL for debugging
      const sqlInfo = query.toSQL();
      console.log("Generated SQL:", sqlInfo.sql);
      console.log("SQL parameters:", sqlInfo.params);
      
      // Execute query
      const results = await query;
      console.log(`Query returned ${results.length} results`);
      
      // Check if there are more results
      const hasMore = results.length > take;
      const items = hasMore ? results.slice(0, take) : results;
      
      // Create next cursor if there are more results
      let nextCursor = null;
      if (hasMore && items.length > 0) {
        const lastItem = items[items.length - 1];
        nextCursor = lastItem.id; // Simplified cursor using just the ID
      }
      
      // Convert to GeneratedImage type with thumbnail optimization
      const mappedItems = items.map(item => {
        // This is important - make sure we properly convert the string "true"/"false" to boolean
        const starredStatus = item.starred === "true";
        console.log(`Image ${item.id} starred status: "${item.starred}" -> ${starredStatus}`);
        
        return {
          id: item.id,
          url: item.thumbUrl || item.url, // Prefer thumbnail for gallery listing
          prompt: item.prompt,
          size: item.size,
          model: item.model,
          createdAt: item.createdAt ? new Date(item.createdAt).toISOString() : new Date().toISOString(),
          width: item.width,
          height: item.height,
          thumbUrl: item.thumbUrl,
          fullUrl: item.fullUrl,
          sourceThumb: item.sourceThumb,
          sourceImage: item.sourceImage,
          starred: starredStatus,
          deletedAt: item.deletedAt ? new Date(item.deletedAt).toISOString() : null,
          // Include new fields for enhanced display
          aspectRatio: item.aspectRatio,
          quality: item.quality
        };
      });
      
      console.log(`Returning ${mappedItems.length} images, nextCursor: ${nextCursor}`);
      
      // Log a sample image for debugging
      if (mappedItems.length > 0) {
        console.log(`Sample image data:`, {
          id: mappedItems[0].id,
          starred: mappedItems[0].starred,
          deletedAt: mappedItems[0].deletedAt
        });
      }
      
      return {
        items: mappedItems,
        nextCursor
      };
    } catch (error) {
      console.error('Error getting images:', error);
      return { items: [], nextCursor: null };
    }
  }

  async getImageById(id: string): Promise<GeneratedImage | undefined> {
    const [image] = await db.select().from(images).where(eq(images.id, id));
    
    if (!image) return undefined;
    
    return {
      ...image,
      createdAt: image.createdAt ? new Date(image.createdAt).toISOString() : new Date().toISOString(),
      starred: image.starred === "true",
      deletedAt: image.deletedAt ? new Date(image.deletedAt).toISOString() : null,
      aspectRatio: image.aspectRatio,
      quality: image.quality
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
      deletedAt: updatedImage.deletedAt ? new Date(updatedImage.deletedAt).toISOString() : null,
      aspectRatio: updatedImage.aspectRatio,
      quality: updatedImage.quality
    };
  }

  async deleteImage(id: string, permanent: boolean = false): Promise<void> {
    if (permanent) {
      // Get image paths before deleting
      const [image] = await db.select().from(images).where(eq(images.id, id));
      
      if (image) {
        try {
          // Extract actual paths from URLs
          const getPathFromUrl = (url: string | null) => {
            if (!url) return null;
            // Extract path component from URL, e.g. /uploads/full/img_123.png -> full/img_123.png
            const match = url.match(/\/uploads\/(.+)$/);
            return match ? match[1] : null;
          };
          
          // Support various potential file formats (png, webp)
          const possibleFullPaths = [
            path.join(this.uploadsDir, 'full', `${id}.png`),
            path.join(this.uploadsDir, getPathFromUrl(image.fullUrl) || '')
          ];
          
          const possibleThumbPaths = [
            path.join(this.uploadsDir, 'thumb', `${id}.webp`),
            path.join(this.uploadsDir, 'thumb', `${id}.png`),
            path.join(this.uploadsDir, 'thumb', `${id}_thumb.png`),
            path.join(this.uploadsDir, getPathFromUrl(image.thumbUrl) || '')
          ];
          
          // Delete full image if any of the possible paths exist
          for (const fullPath of possibleFullPaths) {
            if (fs.existsSync(fullPath)) {
              console.log(`Deleting full image at: ${fullPath}`);
              fs.unlinkSync(fullPath);
              break; // Only delete one matching file
            }
          }
          
          // Delete thumbnail if any of the possible paths exist
          for (const thumbPath of possibleThumbPaths) {
            if (fs.existsSync(thumbPath)) {
              console.log(`Deleting thumbnail at: ${thumbPath}`);
              fs.unlinkSync(thumbPath);
              break; // Only delete one matching file
            }
          }
        } catch (err) {
          console.error(`Error deleting image files for ${id}:`, err);
          // Continue with database deletion even if file deletion fails
        }
        
        // Delete from database
        await db.delete(images).where(eq(images.id, id));
        
        // Notify clients about permanent deletion
        push('imageDeleted', { id });
        console.log(`Permanently deleted image ${id}`);
      }
    } else {
      // Soft delete - mark as deleted
      await this.updateImage(id, { deletedAt: new Date().toISOString() });
      console.log(`Soft deleted image ${id} (moved to trash)`);
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

  // Video methods
  async createVideo(video: InsertVideo): Promise<Video> {
    const [savedVideo] = await db.insert(videos).values(video).returning();
    return savedVideo;
  }

  async getVideoById(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const [updated] = await db.update(videos).set(updates).where(eq(videos.id, id)).returning();
    return updated;
  }

  async getVideosByProject(projectId: string): Promise<Video[]> {
    return await db.select().from(videos).where(eq(videos.project_id, projectId)).orderBy(desc(videos.created_at));
  }

  // Project methods
  async createProject(project: InsertProject): Promise<Project> {
    const [created] = await db.insert(projects).values(project).returning();
    return created;
  }

  async getAllProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.created_at));
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [updated] = await db.update(projects).set({
      ...updates,
      updated_at: new Date(),
    }).where(eq(projects.id, id)).returning();
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    // First delete all videos in the project
    await db.delete(videos).where(eq(videos.project_id, id));
    // Then delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const [updatedVideo] = await db
      .update(videos)
      .set(updates)
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo;
  }
}

// Create database storage instance
export const storage = new DatabaseStorage();
