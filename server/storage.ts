import { users, images, pageSettings, videos, projects, type User, type UpsertUser, type GeneratedImage, type PageSettings, type InsertPageSettings, type Video, type InsertVideo, type Project, type InsertProject } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, isNull, isNotNull, and, ilike, lt, sql, or, not } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { push } from "./ws";
import crypto from "crypto";

// Define storage interface
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // User management operations
  getAllUsers(options?: {
    search?: string;
    statusFilter?: 'all' | 'active' | 'inactive';
    roleFilter?: 'all' | 'user' | 'admin';
    sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'firstName';
    sortOrder?: 'asc' | 'desc';
  }): Promise<User[]>;
  getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    recentLogins: number; // logins in last 7 days
  }>;
  updateUserStatus(userId: string, isActive: boolean): Promise<User | undefined>;
  updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User | undefined>;
  updateUserLastLogin(userId: string): Promise<User | undefined>;
  saveImage(image: GeneratedImage): Promise<GeneratedImage>;
  getAllImages(options?: { starred?: boolean; trash?: boolean; limit?: number; cursor?: string; searchQuery?: string }): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }>;
  getImageById(id: string): Promise<GeneratedImage | undefined>;
  updateImage(id: string, updates: Partial<GeneratedImage>): Promise<GeneratedImage | undefined>;
  deleteImage(id: string, permanent?: boolean): Promise<void>;
  bulkUpdateImages(ids: string[], updates: Partial<GeneratedImage>): Promise<void>;

  // Page settings operations
  getAllPageSettings(): Promise<PageSettings[]>;
  updatePageSetting(pageKey: string, isEnabled: boolean): Promise<PageSettings | undefined>;
  initializePageSettings(): Promise<void>;

  // Video operations
  saveVideo(video: InsertVideo): Promise<Video>;
  getAllVideos(options?: { userId?: string; projectId?: string; status?: string; limit?: number; cursor?: string }): Promise<{
    items: Video[];
    nextCursor: string | null;
  }>;
  getVideoById(id: string): Promise<Video | undefined>;
  updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined>;
  deleteVideo(id: string): Promise<void>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getAllProjects(userId: string): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
}

// Database storage implementation
export class DatabaseStorage implements IStorage {
  constructor() {
    // Object Storage is now used for image storage instead of local uploads directory
  }

  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // Try to insert the user first
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id, // Handle ID conflicts (same user logging in again)
          set: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImageUrl: userData.profileImageUrl,
            lastLoginAt: userData.lastLoginAt || new Date(),
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      // If we get an email constraint error, try to update by email
      if (error.code === '23505' && error.constraint === 'users_email_key') {
        console.log(`Email constraint conflict for ${userData.email}, attempting update by email`);
        
        // Find the existing user by email and update their information
        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, userData.email!));
          
        if (existingUser) {
          // Update the existing user with new data (especially the ID from Replit)
          const [updatedUser] = await db
            .update(users)
            .set({
              id: userData.id, // Update with new Replit ID
              firstName: userData.firstName,
              lastName: userData.lastName,
              profileImageUrl: userData.profileImageUrl,
              lastLoginAt: userData.lastLoginAt || new Date(),
              updatedAt: new Date(),
            })
            .where(eq(users.email, userData.email!))
            .returning();
          return updatedUser;
        }
      }
      
      // Re-throw the error if it's not something we can handle
      throw error;
    }
  }

  // User management methods
  async getAllUsers(options: {
    search?: string;
    statusFilter?: 'all' | 'active' | 'inactive';
    roleFilter?: 'all' | 'user' | 'admin';
    sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'firstName';
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<User[]> {
    const conditions = [];
    
    // Exclude special access users from admin listings
    conditions.push(not(eq(users.email, 'joacogrimoldi@gmail.com')));
    
    // Apply search filter
    if (options.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          ilike(users.email, searchTerm),
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm)
        )
      );
    }
    
    // Apply status filter
    if (options.statusFilter === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (options.statusFilter === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }
    
    // Apply role filter
    if (options.roleFilter && options.roleFilter !== 'all') {
      conditions.push(eq(users.role, options.roleFilter));
    }
    
    // Build the query directly
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Apply sorting
    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'desc';
    
    // Get the correct column for sorting
    let orderByColumn;
    switch (sortBy) {
      case 'email':
        orderByColumn = users.email;
        break;
      case 'firstName':
        orderByColumn = users.firstName;
        break;
      case 'lastLoginAt':
        orderByColumn = users.lastLoginAt;
        break;
      default:
        orderByColumn = users.createdAt;
    }
    
    // Build and execute the query
    const queryBuilder = db.select().from(users);
    
    if (whereClause) {
      if (sortOrder === 'asc') {
        return await queryBuilder.where(whereClause).orderBy(asc(orderByColumn));
      } else {
        return await queryBuilder.where(whereClause).orderBy(desc(orderByColumn));
      }
    } else {
      if (sortOrder === 'asc') {
        return await queryBuilder.orderBy(asc(orderByColumn));
      } else {
        return await queryBuilder.orderBy(desc(orderByColumn));
      }
    }
  }

  async getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    recentLogins: number;
  }> {
    // Exclude special access users from statistics
    const excludeHidden = not(eq(users.email, 'joacogrimoldi@gmail.com'));
    
    const [totalUsers] = await db.select({ count: sql`count(*)` }).from(users).where(excludeHidden);
    const [activeUsers] = await db.select({ count: sql`count(*)` }).from(users).where(and(eq(users.isActive, true), excludeHidden));
    const [adminUsers] = await db.select({ count: sql`count(*)` }).from(users).where(and(eq(users.role, 'admin'), excludeHidden));
    
    // Recent logins (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const [recentLogins] = await db.select({ count: sql`count(*)` }).from(users).where(
      and(
        isNotNull(users.lastLoginAt),
        sql`${users.lastLoginAt} >= ${sevenDaysAgo}`,
        excludeHidden
      )
    );
    
    return {
      totalUsers: Number(totalUsers.count),
      activeUsers: Number(activeUsers.count),
      adminUsers: Number(adminUsers.count),
      recentLogins: Number(recentLogins.count),
    };
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserLastLogin(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async saveImage(image: GeneratedImage): Promise<GeneratedImage> {
    // Note: This method is deprecated - image persistence now handled by fs-storage.ts using Object Storage
    // Direct database insertion for metadata only
    const dbImage = {
      id: image.id,
      url: image.url,
      prompt: image.prompt,
      dimensions: image.dimensions || '1024x1024', // Image dimensions like "1024x1024"
      model: image.model,
      width: image.width || "1024",
      height: image.height || "1024",
      fullUrl: image.fullUrl,
      thumbUrl: image.thumbUrl,
      sourceThumb: image.sourceThumb || null,
      sourceImage: image.sourceImage || null,
      starred: "false",
      aspectRatio: image.aspectRatio || null,
      quality: image.quality || null,
    };
    
    // Save to database
    const [savedImage] = await db.insert(images).values(dbImage).returning();
    
    // Notify clients about the new image with complete image data
    push('imageCreated', {
      image: {
        id: savedImage.id,
        url: savedImage.url,
        prompt: savedImage.prompt,
        dimensions: savedImage.dimensions || '1024x1024',
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
      id: savedImage.id,
      url: savedImage.url,
      prompt: savedImage.prompt,
      dimensions: savedImage.dimensions || '1024x1024',
      model: savedImage.model,
      createdAt: savedImage.createdAt ? new Date(savedImage.createdAt).toISOString() : new Date().toISOString(),
      width: savedImage.width || '1024',
      height: savedImage.height || '1024',
      fullUrl: savedImage.fullUrl,
      thumbUrl: savedImage.thumbUrl,
      starred: savedImage.starred === "true",
      sourceThumb: savedImage.sourceThumb,
      sourceImage: savedImage.sourceImage,
      deletedAt: savedImage.deletedAt ? new Date(savedImage.deletedAt).toISOString() : null,
      aspectRatio: savedImage.aspectRatio,
      quality: savedImage.quality
    };
  }

  async getAllImages(options: { starred?: boolean; trash?: boolean; limit?: number; cursor?: string; searchQuery?: string } = {}): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }> {
    const { starred, trash, limit = 50, cursor, searchQuery } = options;
    
    // Apply sensible limit constraints for performance
    const take = Math.min(Number(limit) || 50, 100);
    
    // Get current environment to filter images
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    try {
      // Build query
      let query = db.select().from(images);
      
      // Build conditions array
      const conditions = [];
      
      // CRITICAL FIX: Filter by environment to prevent cross-environment sync issues
      conditions.push(eq(images.environment, currentEnv));
      
      // Filter by starred and trash status
      if (starred) {
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
        
        // Use case-insensitive ILIKE for flexible search
        if (searchTerm.length >= 1) { // Allow even single character searches
          try {
            conditions.push(
              ilike(images.prompt, `%${searchTerm}%`)
            );
          } catch (err) {
            console.error(`Error adding search condition:`, err);
          }
        }
      }
      
      // Build conditions array
      let allConditions = [...conditions];
      
      // Apply cursor-based pagination if provided
      if (cursor) {
        try {
          const cursorImage = await db.select()
            .from(images)
            .where(eq(images.id, cursor))
            .limit(1);
            
          if (cursorImage.length > 0) {
            allConditions.push(lt(images.createdAt, cursorImage[0].createdAt));
          }
        } catch (err) {
          console.error('Error applying cursor pagination:', err);
        }
      }
      
      // Build and execute the final query
      let results;
      if (allConditions.length === 0) {
        results = await db.select()
          .from(images)
          .orderBy(desc(images.createdAt))
          .limit(take + 1);
      } else if (allConditions.length === 1) {
        results = await db.select()
          .from(images)
          .where(allConditions[0])
          .orderBy(desc(images.createdAt))
          .limit(take + 1);
      } else {
        results = await db.select()
          .from(images)
          .where(and(...allConditions))
          .orderBy(desc(images.createdAt))
          .limit(take + 1);
      }
      
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
        // Convert string "true"/"false" to boolean
        const starredStatus = item.starred === "true";
        
        return {
          id: item.id,
          url: item.thumbUrl || item.url, // Prefer thumbnail for gallery listing
          prompt: item.prompt,
          dimensions: item.dimensions || '1024x1024', // Image dimensions like "1024x1024"
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
      // Get image data before deleting
      const [image] = await db.select().from(images).where(eq(images.id, id));
      
      if (image) {
        try {
          // Delete from Object Storage
          const { objectStorage } = await import('./objectStorage');
          
          // Delete both full image and thumbnail from Object Storage
          // The deleteImage method expects just the image ID, not the full path
          await objectStorage.deleteImage(id, 'png');
          console.log(`Successfully deleted image ${id} from Object Storage`);
        } catch (err) {
          console.error(`Error deleting image files from Object Storage for ${id}:`, err);
          // Continue with database deletion even if file deletion fails
        }
        
        // Delete from database
        await db.delete(images).where(eq(images.id, id));
        
        // Notify clients about permanent deletion
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





  // Page settings methods
  async getAllPageSettings(): Promise<PageSettings[]> {
    return await db.select().from(pageSettings).orderBy(pageSettings.pageName);
  }

  async updatePageSetting(pageKey: string, isEnabled: boolean): Promise<PageSettings | undefined> {
    const [updated] = await db
      .update(pageSettings)
      .set({ 
        isEnabled, 
        updatedAt: new Date() 
      })
      .where(eq(pageSettings.pageKey, pageKey))
      .returning();
    return updated;
  }

  async initializePageSettings(): Promise<void> {
    // Default pages with their configurations
    const defaultPages = [
      { pageKey: 'create', pageName: 'Create', description: 'Main image creation page' },
      { pageKey: 'car', pageName: 'Car Creation', description: 'Car-specific image creation' },
      { pageKey: 'video', pageName: 'Video Creation', description: 'AI video generation with Vertex AI' },
      { pageKey: 'gallery', pageName: 'Gallery', description: 'View and manage generated images' },
      { pageKey: 'upscale', pageName: 'Upscale', description: 'Image upscaling functionality' },
      { pageKey: 'email-builder', pageName: 'Email CreAItor', description: 'MJML email builder' },
      { pageKey: 'trash', pageName: 'Trash', description: 'Deleted images management' },
    ];

    // Check if any page settings exist
    const existingSettings = await db.select().from(pageSettings).limit(1);
    
    if (existingSettings.length === 0) {
      // Initialize with default settings
      await db.insert(pageSettings).values(
        defaultPages.map(page => ({
          ...page,
          isEnabled: true,
        }))
      );
      console.log('Initialized page settings with default configuration');
    }
  }

  // Video operations
  async saveVideo(video: InsertVideo): Promise<Video> {
    const [savedVideo] = await db.insert(videos).values(video).returning();
    return savedVideo;
  }

  async getAllVideos(options?: { userId?: string; projectId?: string; status?: string; limit?: number; cursor?: string }): Promise<{
    items: Video[];
    nextCursor: string | null;
  }> {
    const { userId, projectId, status, limit = 50, cursor } = options || {};
    
    let query = db.select().from(videos) as any;
    const conditions = [];
    
    if (userId) conditions.push(eq(videos.userId, userId));
    if (projectId) conditions.push(eq(videos.projectId, projectId));
    if (status) conditions.push(eq(videos.status, status));
    if (cursor) conditions.push(lt(videos.createdAt, new Date(cursor)));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const videoList = await query
      .orderBy(desc(videos.createdAt))
      .limit(limit + 1);
    
    const hasMore = videoList.length > limit;
    const items = hasMore ? videoList.slice(0, -1) : videoList;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt?.toISOString() || null : null;
    
    return { items, nextCursor };
  }

  async getVideoById(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id));
    return video;
  }

  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | undefined> {
    const [updatedVideo] = await db
      .update(videos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return updatedVideo;
  }

  async deleteVideo(id: string): Promise<void> {
    await db.delete(videos).where(eq(videos.id, id));
  }

  // Project operations
  async createProject(project: InsertProject): Promise<Project> {
    const [createdProject] = await db.insert(projects).values(project).returning();
    return createdProject;
  }

  async getAllProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined> {
    const [updatedProject] = await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return updatedProject;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }
}

// Create database storage instance
export const storage = new DatabaseStorage();
