import { users, images, pageSettings, videos, projects, projectMembers, adminAuditLogs, type User, type UpsertUser, type GeneratedImage, type PageSettings, type InsertPageSettings, type Video, type InsertVideo, type Project, type InsertProject, type ProjectMember, type InsertProjectMember, type AdminAuditLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, isNull, isNotNull, and, ilike, lt, sql, or, not, inArray, ne, count } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";
import { push } from "./ws";
import crypto from "crypto";
import archiver from "archiver";
import { createWriteStream } from "fs";

// Define storage interface
export interface IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  // Enhanced User management operations with pagination
  getAllUsers(options?: {
    search?: string;
    statusFilter?: 'all' | 'active' | 'inactive';
    roleFilter?: 'all' | 'user' | 'admin';
    sortBy?: 'createdAt' | 'lastLoginAt' | 'email' | 'firstName';
    sortOrder?: 'asc' | 'desc';
  }): Promise<User[]>;
  
  // New paginated user listing with enhanced data
  getUsersPaginated(options: {
    page: number;
    limit: number;
    search?: string;
    statusFilter?: 'all' | 'active' | 'inactive';
    roleFilter?: 'all' | 'user' | 'admin';
    domainFilter?: string;
    activatedFilter?: 'all' | 'activated' | 'not_activated';
    sortBy?: 'lastLoginAt' | 'createdAt' | 'email' | 'firstName' | 'imageCount' | 'videoCount' | 'projectCount';
    sortOrder?: 'asc' | 'desc';
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    users: Array<User & {
      domain: string;
      imageCount: number;
      videoCount: number;
      projectCount: number;
      isActivated: boolean;
    }>;
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }>;
  
  getUserStatistics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    adminUsers: number;
    recentLogins: number;
    onlineUsers: number;
  }>;
  
  // User Actions with Audit Logging
  updateUserStatus(userId: string, isActive: boolean, adminUserId: string, adminEmail: string, ipAddress?: string): Promise<User | undefined>;
  updateUserRole(userId: string, role: 'user' | 'admin', adminUserId: string, adminEmail: string, ipAddress?: string): Promise<User | undefined>;
  forceUserLogout(userId: string, adminUserId: string, adminEmail: string, ipAddress?: string): Promise<boolean>;
  updateUserLastLogin(userId: string): Promise<User | undefined>;
  
  // Bulk Operations
  bulkUpdateUserStatus(userIds: string[], isActive: boolean, adminUserId: string, adminEmail: string, ipAddress?: string): Promise<{ success: number; failed: string[] }>;
  bulkUpdateUserRole(userIds: string[], role: 'user' | 'admin', adminUserId: string, adminEmail: string, ipAddress?: string): Promise<{ success: number; failed: string[] }>;
  
  // Export Operations
  exportUsers(options: {
    userIds?: string[];
    filters?: any;
    reason: string;
    adminUserId: string;
    adminEmail: string;
    ipAddress?: string;
    maxRows: number;
  }): Promise<{ data: any[]; count: number; auditId: string }>;
  
  // Audit Logging
  createAdminAuditLog(log: {
    adminUserId: string;
    adminEmail: string;
    action: string;
    targetUserId?: string;
    targetUserEmail?: string;
    details?: any;
    affectedCount?: number;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AdminAuditLog>;
  saveImage(image: GeneratedImage): Promise<GeneratedImage>;
  getAllImages(options?: { 
    starred?: boolean; 
    trash?: boolean; 
    limit?: number; 
    cursor?: string; 
    searchQuery?: string;
    models?: string[];
    aspectRatios?: string[];
    resolutions?: string[];
    dateRange?: { from?: Date; to?: Date };
  }): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }>;
  getImageCount(options?: { 
    starred?: boolean; 
    trash?: boolean; 
    searchQuery?: string;
    models?: string[];
    aspectRatios?: string[];
    resolutions?: string[];
    dateRange?: { from?: Date; to?: Date };
  }): Promise<number>;
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
  bulkMoveVideos(videoIds: string[], targetProjectId: string | null): Promise<void>;
  getUnassignedVideos(userId: string): Promise<Video[]>;
  getVideosByProject(projectId: string): Promise<Video[]>;

  // Project operations
  createProject(project: InsertProject): Promise<Project>;
  getAllProjects(userId: string, showArchived?: boolean): Promise<Project[]>;
  getProjectsWithStats(userId: string, showArchived?: boolean): Promise<Project[]>;
  getProjectById(id: string): Promise<Project | undefined>;
  updateProject(id: string, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;
  getProjectWithVideos(projectId: string, userId: string): Promise<{ project: Project; videos: Video[] } | null>;
  
  // Project membership operations for collaboration
  addProjectMember(projectId: string, userId: string, addedBy?: string): Promise<ProjectMember>;
  removeProjectMember(projectId: string, userId: string): Promise<void>;
  getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  getProjectMembersWithDetails(projectId: string): Promise<(ProjectMember & { user: User })[]>;
  getUserProjectMemberships(userId: string): Promise<ProjectMember[]>;
  hasProjectAccess(projectId: string, userId: string): Promise<boolean>;
  
  // New project management operations
  duplicateProject(projectId: string, userId: string, includeVideos?: boolean): Promise<Project>;
  reorderProjects(userId: string, projectIds: string[]): Promise<void>;
  permanentDeleteProject(projectId: string, deleteVideos?: boolean): Promise<void>;
  createProjectExportZip(project: Project, videos: Video[]): Promise<{success: boolean; downloadUrl?: string; error?: string}>;
  getProjectMemberCounts(userId: string): Promise<Record<string, number>>;
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
    onlineUsers: number;
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

    // Online users (last 10 minutes)
    const [onlineUsers] = await db.select({ count: sql`count(*)` }).from(users).where(
      and(
        isNotNull(users.lastLoginAt),
        sql`${users.lastLoginAt} >= NOW() - INTERVAL '10 minutes'`,
        excludeHidden
      )
    );
    
    return {
      totalUsers: Number(totalUsers.count),
      activeUsers: Number(activeUsers.count),
      adminUsers: Number(adminUsers.count),
      recentLogins: Number(recentLogins.count),
      onlineUsers: Number(onlineUsers.count),
    };
  }

  // New paginated user listing with enhanced data
  async getUsersPaginated(options: {
    page: number;
    limit: number;
    search?: string;
    statusFilter?: 'all' | 'active' | 'inactive';
    roleFilter?: 'all' | 'user' | 'admin';
    domainFilter?: string;
    activatedFilter?: 'all' | 'activated' | 'not_activated';
    sortBy?: 'lastLoginAt' | 'createdAt' | 'email' | 'firstName' | 'imageCount' | 'videoCount' | 'projectCount';
    sortOrder?: 'asc' | 'desc';
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    users: Array<User & {
      domain: string;
      imageCount: number;
      videoCount: number;
      projectCount: number;
      isActivated: boolean;
    }>;
    totalCount: number;
    totalPages: number;
    currentPage: number;
  }> {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;
    const excludeHidden = not(eq(users.email, 'joacogrimoldi@gmail.com'));
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    // Build conditions
    const conditions: any[] = [excludeHidden];
    
    if (options.search) {
      const searchTerm = `%${options.search}%`;
      const searchCondition = or(
        ilike(users.email, searchTerm),
        ilike(users.firstName, searchTerm),
        ilike(users.lastName, searchTerm),
        ilike(users.id, searchTerm)
      );
      if (searchCondition) conditions.push(searchCondition);
    }
    
    if (options.statusFilter === 'active') {
      conditions.push(eq(users.isActive, true));
    } else if (options.statusFilter === 'inactive') {
      conditions.push(eq(users.isActive, false));
    }
    
    if (options.roleFilter && options.roleFilter !== 'all') {
      conditions.push(eq(users.role, options.roleFilter));
    }
    
    if (options.domainFilter) {
      conditions.push(sql`split_part(${users.email}, '@', 2) = ${options.domainFilter}`);
    }
    
    if (options.activatedFilter === 'activated') {
      conditions.push(isNotNull(users.lastLoginAt));
    } else if (options.activatedFilter === 'not_activated') {
      conditions.push(isNull(users.lastLoginAt));
    }
    
    if (options.dateFrom) {
      conditions.push(sql`${users.createdAt} >= ${options.dateFrom}`);
    }
    
    if (options.dateTo) {
      conditions.push(sql`${users.createdAt} <= ${options.dateTo}`);
    }

    const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    // OPTIMIZED: Get enhanced user data with counts using efficient JOINs instead of N+1 subqueries
    const baseQuery = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profileImageUrl: users.profileImageUrl,
        isActive: users.isActive,
        role: users.role,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        domain: sql`split_part(${users.email}, '@', 2)`,
        imageCount: sql`COALESCE(COUNT(DISTINCT ${images.id}), 0)`,
        videoCount: sql`COALESCE(COUNT(DISTINCT ${videos.id}), 0)`,
        projectCount: sql`COALESCE(COUNT(DISTINCT ${projects.id}), 0)`,
        isActivated: sql`${users.lastLoginAt} IS NOT NULL`,
      })
      .from(users)
      .leftJoin(images, 
        and(
          eq(images.user_id, users.id),
          eq(images.environment, currentEnv)
        )
      )
      .leftJoin(videos,
        and(
          eq(videos.userId, users.id),
          eq(videos.environment, currentEnv)
        )
      )
      .leftJoin(projects,
        and(
          eq(projects.userId, users.id),
          isNull(projects.deletedAt)
        )
      );
    
    // Apply WHERE clause and GROUP BY
    const usersQuery = whereClause 
      ? baseQuery.where(whereClause)
      : baseQuery;
    
    const queryWithGroupBy = usersQuery.groupBy(
      users.id,
      users.email,
      users.firstName,
      users.lastName,
      users.profileImageUrl,
      users.isActive,
      users.role,
      users.lastLoginAt,
      users.createdAt,
      users.updatedAt
    );
    
    // Apply sorting
    const sortBy = options.sortBy || 'lastLoginAt';
    const sortOrder = options.sortOrder || 'desc';
    
    let orderByColumn;
    switch (sortBy) {
      case 'email':
        orderByColumn = users.email;
        break;
      case 'firstName':
        orderByColumn = users.firstName;
        break;
      case 'createdAt':
        orderByColumn = users.createdAt;
        break;
      case 'imageCount':
        orderByColumn = sql`"imageCount"`;
        break;
      case 'videoCount':
        orderByColumn = sql`"videoCount"`;
        break;
      case 'projectCount':
        orderByColumn = sql`"projectCount"`;
        break;
      default:
        orderByColumn = users.lastLoginAt;
    }
    
    // Get paginated results with sorting
    const usersData = await queryWithGroupBy
      .orderBy(sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn))
      .limit(limit)
      .offset(offset);
    
    // Get total count
    const countQuery = db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(whereClause);
    const [{ count }] = await countQuery;
    
    const totalCount = Number(count);
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
      users: usersData.map(user => ({
        ...user,
        domain: String(user.domain || ''),
        imageCount: Number(user.imageCount || 0),
        videoCount: Number(user.videoCount || 0),
        projectCount: Number(user.projectCount || 0),
        isActivated: Boolean(user.isActivated),
      })),
      totalCount,
      totalPages,
      currentPage: page,
    };
  }

  // Enhanced user status update with audit logging - new implementation
  async updateUserStatus(userId: string, isActive: boolean, adminUserId: string, adminEmail: string, ipAddress?: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .update(users)
        .set({ 
          isActive,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (user) {
        // Log the action
        await this.createAdminAuditLog({
          adminUserId,
          adminEmail,
          action: 'user_status_change',
          targetUserId: userId,
          targetUserEmail: user.email || undefined,
          details: { previousStatus: !isActive, newStatus: isActive },
          ipAddress,
        });
      }

      return user;
    } catch (error) {
      console.error('Error updating user status:', error);
      return undefined;
    }
  }

  // Enhanced user role update with audit logging
  async updateUserRole(userId: string, role: 'user' | 'admin', adminUserId: string, adminEmail: string, ipAddress?: string): Promise<User | undefined> {
    try {
      const [existingUser] = await db.select().from(users).where(eq(users.id, userId));
      
      const [user] = await db
        .update(users)
        .set({ 
          role,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (user && existingUser) {
        // Log the action
        await this.createAdminAuditLog({
          adminUserId,
          adminEmail,
          action: 'user_role_change',
          targetUserId: userId,
          targetUserEmail: user.email || undefined,
          details: { previousRole: existingUser.role, newRole: role },
          ipAddress,
        });
      }

      return user;
    } catch (error) {
      console.error('Error updating user role:', error);
      return undefined;
    }
  }

  // Force user logout with audit logging
  async forceUserLogout(userId: string, adminUserId: string, adminEmail: string, ipAddress?: string): Promise<boolean> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (user) {
        // Update last login to force re-authentication
        await db
          .update(users)
          .set({ 
            lastLoginAt: new Date(0), // Set to epoch to force logout
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        // Log the action
        await this.createAdminAuditLog({
          adminUserId,
          adminEmail,
          action: 'force_logout',
          targetUserId: userId,
          targetUserEmail: user.email || undefined,
          details: { reason: 'Admin forced logout' },
          ipAddress,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error forcing user logout:', error);
      return false;
    }
  }

  // Bulk user status update
  async bulkUpdateUserStatus(userIds: string[], isActive: boolean, adminUserId: string, adminEmail: string, ipAddress?: string): Promise<{ success: number; failed: string[] }> {
    const failed: string[] = [];
    let success = 0;

    for (const userId of userIds) {
      try {
        const result = await this.updateUserStatus(userId, isActive, adminUserId, adminEmail, ipAddress);
        if (result) {
          success++;
        } else {
          failed.push(userId);
        }
      } catch (error) {
        failed.push(userId);
      }
    }

    // Log bulk action
    await this.createAdminAuditLog({
      adminUserId,
      adminEmail,
      action: 'bulk_action',
      details: { 
        operation: 'status_change', 
        newStatus: isActive, 
        userIds,
        successCount: success,
        failedCount: failed.length
      },
      affectedCount: success,
      ipAddress,
    });

    return { success, failed };
  }

  // Bulk user role update  
  async bulkUpdateUserRole(userIds: string[], role: 'user' | 'admin', adminUserId: string, adminEmail: string, ipAddress?: string): Promise<{ success: number; failed: string[] }> {
    const failed: string[] = [];
    let success = 0;

    for (const userId of userIds) {
      try {
        const result = await this.updateUserRole(userId, role, adminUserId, adminEmail, ipAddress);
        if (result) {
          success++;
        } else {
          failed.push(userId);
        }
      } catch (error) {
        failed.push(userId);
      }
    }

    // Log bulk action
    await this.createAdminAuditLog({
      adminUserId,
      adminEmail,
      action: 'bulk_action',
      details: { 
        operation: 'role_change', 
        newRole: role, 
        userIds,
        successCount: success,
        failedCount: failed.length
      },
      affectedCount: success,
      ipAddress,
    });

    return { success, failed };
  }

  // Export users with audit logging and caps
  async exportUsers(options: {
    userIds?: string[];
    filters?: any;
    reason: string;
    adminUserId: string;
    adminEmail: string;
    ipAddress?: string;
    maxRows: number;
  }): Promise<{ data: any[]; count: number; auditId: string }> {
    const { userIds, filters = {}, reason, adminUserId, adminEmail, ipAddress, maxRows } = options;
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    // Build all conditions upfront to avoid query chaining issues
    const conditions: any[] = [not(eq(users.email, 'joacogrimoldi@gmail.com'))];
    
    // Apply user ID filter if provided
    if (userIds && userIds.length > 0) {
      conditions.push(inArray(users.id, userIds));
    }
    
    // Apply search filter if provided
    if (filters.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(users.email, searchTerm),
          ilike(users.firstName, searchTerm),
          ilike(users.lastName, searchTerm)
        )
      );
    }
    
    // Build single query with all conditions
    const query = db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        isActive: users.isActive,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        domain: sql`split_part(${users.email}, '@', 2)`,
        imageCount: sql`(
          SELECT COUNT(*) FROM ${images}
          WHERE ${images.user_id} = ${users.id}
          AND ${images.environment} = ${currentEnv}
        )`,
        videoCount: sql`(
          SELECT COUNT(*) FROM ${videos}
          WHERE ${videos.userId} = ${users.id}
          AND ${videos.environment} = ${currentEnv}
        )`,
        projectCount: sql`(
          SELECT COUNT(*) FROM ${projects}
          WHERE ${projects.userId} = ${users.id}
          AND ${projects.deletedAt} IS NULL
        )`,
      })
      .from(users)
      .where(and(...conditions));

    // Enforce row limit
    const data = await query.limit(maxRows + 1); // Get one extra to check if limit exceeded
    
    if (data.length > maxRows) {
      throw new Error(`Export would exceed maximum allowed rows (${maxRows}). Please refine your filters.`);
    }

    // Create audit log
    const auditLog = await this.createAdminAuditLog({
      adminUserId,
      adminEmail,
      action: 'export',
      details: { 
        exportType: userIds ? 'selected_users' : 'filtered_users',
        filters: userIds ? { userIds } : filters,
        rowCount: data.length
      },
      affectedCount: data.length,
      reason,
      ipAddress,
    });

    return {
      data: data.map(user => ({
        ...user,
        imageCount: Number(user.imageCount || 0),
        videoCount: Number(user.videoCount || 0),
        projectCount: Number(user.projectCount || 0),
      })),
      count: data.length,
      auditId: auditLog.id,
    };
  }

  // Create admin audit log
  async createAdminAuditLog(log: {
    adminUserId: string;
    adminEmail: string;
    action: string;
    targetUserId?: string;
    targetUserEmail?: string;
    details?: any;
    affectedCount?: number;
    reason?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AdminAuditLog> {
    const auditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...log,
      createdAt: new Date(),
    };

    try {
      const [result] = await db.insert(adminAuditLogs).values(auditLog).returning();
      return result;
    } catch (error) {
      console.error('Error creating audit log:', error);
      // Don't fail the main operation if audit logging fails
      return auditLog as AdminAuditLog;
    }
  }

  // Enhanced analytics methods using existing data
  async getUserTrends(): Promise<Array<{
    date: string;
    totalUsers: number;
  }>> {
    // Get user growth trends showing total user count over time for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const excludeHidden = not(eq(users.email, 'joacogrimoldi@gmail.com'));
    
    // Get base total from before 30 days ago
    const [baseTotalQuery] = await db.select({ count: sql`count(*)` })
      .from(users)
      .where(and(
        excludeHidden,
        sql`${users.createdAt} < ${thirtyDaysAgo}`
      ));
    const baseTotal = Number(baseTotalQuery.count);
    
    const rawData = await db.select({
      date: sql`date(${users.createdAt})`,
      count: sql`count(*)`
    })
    .from(users)
    .where(and(
      excludeHidden,
      sql`${users.createdAt} >= ${thirtyDaysAgo}`
    ))
    .groupBy(sql`date(${users.createdAt})`)
    .orderBy(sql`date(${users.createdAt})`);

    // Calculate total users for each day
    const trends = [];
    let runningTotal = baseTotal;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = rawData.find(d => d.date === dateStr);
      const newUsers = dayData ? Number(dayData.count) : 0;
      runningTotal += newUsers;
      
      trends.push({
        date: dateStr,
        totalUsers: runningTotal
      });
    }
    
    return trends;
  }

  async getComprehensiveFeatureUsageAnalytics(): Promise<Array<{
    feature: string;
    count: number;
    percentage: number;
    category: string;
  }>> {
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    // Get comprehensive counts from all platform features
    const [imageCount] = await db.select({ count: sql`count(*)` })
      .from(images)
      .where(eq(images.environment, currentEnv));
    
    const [videoCount] = await db.select({ count: sql`count(*)` })
      .from(videos)
      .where(eq(videos.environment, currentEnv));

    // Get car-specific images (those with car-related prompts or using car generation)
    const [carImageCount] = await db.select({ count: sql`count(*)` })
      .from(images)
      .where(and(
        eq(images.environment, currentEnv),
        or(
          sql`lower(${images.prompt}) LIKE '%car%'`,
          sql`lower(${images.prompt}) LIKE '%vehicle%'`,
          sql`lower(${images.prompt}) LIKE '%auto%'`,
          sql`${images.model} = 'car-generation'`
        )
      ));

    // Get upscaled images (those processed through upscaling)
    const [upscaleCount] = await db.select({ count: sql`count(*)` })
      .from(images)
      .where(and(
        eq(images.environment, currentEnv),
        or(
          sql`lower(${images.prompt}) LIKE '%upscale%'`,
          sql`lower(${images.prompt}) LIKE '%enhance%'`,
          sql`${images.model} = 'topaz-upscale'`
        )
      ));

    // Get project count (collaborative video projects)
    const [projectCount] = await db.select({ count: sql`count(*)` })
      .from(projects)
      .where(isNull(projects.deletedAt));

    // Get user count for context
    const excludeHidden = not(eq(users.email, 'joacogrimoldi@gmail.com'));
    const [activeUserCount] = await db.select({ count: sql`count(*)` })
      .from(users)
      .where(and(eq(users.isActive, true), excludeHidden));
    
    const totalContentGeneration = Number(imageCount.count) + Number(videoCount.count);
    
    const features = [
      {
        feature: 'AI Image Generation',
        count: Number(imageCount.count),
        percentage: totalContentGeneration > 0 ? Math.round((Number(imageCount.count) / totalContentGeneration) * 100) : 0,
        category: 'Content Generation'
      },
      {
        feature: 'AI Video Generation', 
        count: Number(videoCount.count),
        percentage: totalContentGeneration > 0 ? Math.round((Number(videoCount.count) / totalContentGeneration) * 100) : 0,
        category: 'Content Generation'
      },
      {
        feature: 'Car Design Visualization',
        count: Number(carImageCount.count),
        percentage: Number(imageCount.count) > 0 ? Math.round((Number(carImageCount.count) / Number(imageCount.count)) * 100) : 0,
        category: 'Specialized Tools'
      },
      {
        feature: 'Image Upscaling',
        count: Number(upscaleCount.count),
        percentage: Number(imageCount.count) > 0 ? Math.round((Number(upscaleCount.count) / Number(imageCount.count)) * 100) : 0,
        category: 'Enhancement'
      },
      {
        feature: 'Video Projects',
        count: Number(projectCount.count),
        percentage: Number(activeUserCount.count) > 0 ? Math.round((Number(projectCount.count) / Number(activeUserCount.count)) * 100) : 0,
        category: 'Organization'
      }
    ];
    
    return features.sort((a, b) => b.count - a.count);
  }

  async getComprehensiveUserActivity(): Promise<Array<{
    user: string;
    action: string;
    time: string;
    details: string;
  }>> {
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    const excludeHidden = not(eq(users.email, 'joacogrimoldi@gmail.com'));
    
    // Get recent image generations with detailed model info
    const recentImages = await db.select({
      userName: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      action: sql`'Image Generated'`,
      time: images.createdAt,
      details: sql`${images.model} || ' - ' || SUBSTRING(${images.prompt}, 1, 50) || CASE WHEN LENGTH(${images.prompt}) > 50 THEN '...' ELSE '' END`
    })
    .from(images)
    .innerJoin(users, eq(users.id, sql`split_part(${images.id}, '-', 1)`))
    .where(and(
      eq(images.environment, currentEnv),
      excludeHidden,
      sql`${images.createdAt} >= NOW() - INTERVAL '7 days'`
    ))
    .orderBy(desc(images.createdAt))
    .limit(8);
    
    // Get recent video generations with project info
    const recentVideos = await db.select({
      userName: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      action: sql`'Video Generated'`,
      time: videos.createdAt,
      details: sql`${videos.model} || ' - ' || SUBSTRING(${videos.prompt}, 1, 50) || CASE WHEN LENGTH(${videos.prompt}) > 50 THEN '...' ELSE '' END`
    })
    .from(videos)
    .innerJoin(users, eq(users.id, videos.userId))
    .where(and(
      eq(videos.environment, currentEnv),
      excludeHidden,
      sql`${videos.createdAt} >= NOW() - INTERVAL '7 days'`
    ))
    .orderBy(desc(videos.createdAt))
    .limit(8);

    // Get recent project creations
    const recentProjects = await db.select({
      userName: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      action: sql`'Project Created'`,
      time: projects.createdAt,
      details: sql`'Project: ' || ${projects.name} || CASE WHEN ${projects.description} IS NOT NULL THEN ' - ' || SUBSTRING(${projects.description}, 1, 40) ELSE '' END`
    })
    .from(projects)
    .innerJoin(users, eq(users.id, projects.userId))
    .where(and(
      excludeHidden,
      sql`${projects.createdAt} >= NOW() - INTERVAL '7 days'`,
      isNull(projects.deletedAt)
    ))
    .orderBy(desc(projects.createdAt))
    .limit(5);

    // Get recent user logins
    const recentLogins = await db.select({
      userName: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.email})`,
      action: sql`'User Login'`,
      time: users.lastLoginAt,
      details: sql`'Last active session'`
    })
    .from(users)
    .where(and(
      excludeHidden,
      isNotNull(users.lastLoginAt),
      sql`${users.lastLoginAt} >= NOW() - INTERVAL '24 hours'`
    ))
    .orderBy(desc(users.lastLoginAt))
    .limit(5);
    
    // Combine and sort by time
    const allActivity = [...recentImages, ...recentVideos, ...recentProjects, ...recentLogins]
      .filter(item => item.time !== null)
      .sort((a, b) => new Date(b.time!).getTime() - new Date(a.time!).getTime())
      .slice(0, 20);
    
    return allActivity.map(item => ({
      user: String(item.userName || 'Unknown User'),
      action: String(item.action),
      time: item.time!.toISOString(),
      details: String(item.details || '')
    }));
  }

  async getDailyRouteActivityMetrics(): Promise<Array<{
    date: string;
    create: number;
    car: number;
    video: number;
    gallery: number;
    email: number;
    admin: number;
  }>> {
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    const excludeHidden = not(eq(users.email, 'joacogrimoldi@gmail.com'));
    
    // Get daily route activity metrics for the last 7 days
    const dailyMetrics = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // /create route activity (image generations)
      const [createActivity] = await db.select({ count: sql`count(*)` })
        .from(images)
        .where(and(
          eq(images.environment, currentEnv),
          sql`DATE(${images.createdAt}) = ${dateStr}`
        ));

      // /car route activity (car-specific images)
      const [carActivity] = await db.select({ count: sql`count(*)` })
        .from(images)
        .where(and(
          eq(images.environment, currentEnv),
          sql`DATE(${images.createdAt}) = ${dateStr}`,
          or(
            sql`lower(${images.prompt}) LIKE '%car%'`,
            sql`lower(${images.prompt}) LIKE '%vehicle%'`,
            sql`lower(${images.prompt}) LIKE '%auto%'`,
            sql`${images.model} = 'car-generation'`
          )
        ));

      // /video route activity (video generations)
      const [videoActivity] = await db.select({ count: sql`count(*)` })
        .from(videos)
        .where(and(
          eq(videos.environment, currentEnv),
          sql`DATE(${videos.createdAt}) = ${dateStr}`
        ));

      // Gallery route activity (estimate from image downloads/views - using image creation as proxy)
      const [galleryActivity] = await db.select({ count: sql`count(*)` })
        .from(images)
        .where(and(
          eq(images.environment, currentEnv),
          sql`DATE(${images.createdAt}) = ${dateStr}`
        ));

      // Email route activity (estimate from projects with email-like names or descriptions)
      const [emailActivity] = await db.select({ count: sql`count(*)` })
        .from(projects)
        .where(and(
          isNull(projects.deletedAt),
          sql`DATE(${projects.createdAt}) = ${dateStr}`,
          or(
            sql`lower(${projects.name}) LIKE '%email%'`,
            sql`lower(${projects.description}) LIKE '%email%'`,
            sql`lower(${projects.name}) LIKE '%newsletter%'`
          )
        ));

      // Admin route activity (admin users who logged in)
      const [adminActivity] = await db.select({ count: sql`count(*)` })
        .from(users)
        .where(and(
          excludeHidden,
          eq(users.role, 'admin'),
          sql`DATE(${users.lastLoginAt}) = ${dateStr}`
        ));

      dailyMetrics.push({
        date: dateStr,
        create: Number(createActivity.count),
        car: Number(carActivity.count), 
        video: Number(videoActivity.count),
        gallery: Math.round(Number(galleryActivity.count) * 0.3), // Estimate 30% of images viewed in gallery
        email: Number(emailActivity.count),
        admin: Number(adminActivity.count)
      });
    }
    
    return dailyMetrics;
  }

  // Legacy methods - use the enhanced versions with audit logging instead

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

  // Helper function to categorize resolution from dimensions
  private getResolutionCategory(dimensions: string): string {
    if (!dimensions) return 'standard';
    
    // Extract width from dimensions like "1024x1024" or "1920x1080"
    const match = dimensions.match(/^(\d+)x\d+$/);
    if (!match) return 'standard';
    
    const width = parseInt(match[1], 10);
    
    if (width >= 4096) return '4k';
    if (width >= 2048) return 'ultra';
    if (width >= 1536) return 'high';
    return 'standard';
  }

  async getAllImages(options: { 
    starred?: boolean; 
    trash?: boolean; 
    limit?: number; 
    cursor?: string; 
    searchQuery?: string;
    models?: string[];
    aspectRatios?: string[];
    resolutions?: string[];
    dateRange?: { from?: Date; to?: Date };
  } = {}): Promise<{ 
    items: GeneratedImage[]; 
    nextCursor: string | null 
  }> {
    const { 
      starred, 
      trash, 
      limit = 50, 
      cursor, 
      searchQuery,
      models,
      aspectRatios,
      resolutions,
      dateRange
    } = options;
    
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
      
      // Add model filtering
      if (models && models.length > 0) {
        conditions.push(inArray(images.model, models));
      }
      
      // Add aspect ratio filtering - check both aspectRatio field and dimensions-derived ratios
      if (aspectRatios && aspectRatios.length > 0) {
        const aspectRatioConditions = [];
        
        // First condition: match exact aspectRatio field values
        aspectRatioConditions.push(inArray(images.aspectRatio, aspectRatios));
        
        // Second condition: check dimensions-derived ratios using integer math
        const dimensionConditions = aspectRatios.map(ratio => {
          switch (ratio) {
            case '1:1':
              // width === height (square)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int`;
            case '16:9':
              // width * 9 === height * 16 (widescreen)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 9 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 16`;
            case '9:16':
              // width * 16 === height * 9 (portrait/vertical)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 16 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 9`;
            case '4:3':
              // width * 3 === height * 4 (classic)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 3 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 4`;
            case '3:2':
              // width * 2 === height * 3 (photo)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 2 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 3`;
            case '2:3':
              // width * 3 === height * 2 (portrait photo)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 3 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 2`;
            case '3:4':
              // width * 4 === height * 3 (portrait classic)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 4 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 3`;
            default:
              return sql`false`;
          }
        });
        
        // Combine conditions with OR - match either exact aspectRatio OR calculated from dimensions
        if (dimensionConditions.length > 0) {
          aspectRatioConditions.push(or(...dimensionConditions));
        }
        
        conditions.push(or(...aspectRatioConditions));
      }
      
      // Add date range filtering
      if (dateRange) {
        if (dateRange.from) {
          conditions.push(sql`${images.createdAt} >= ${dateRange.from.toISOString()}`);
        }
        if (dateRange.to) {
          conditions.push(sql`${images.createdAt} <= ${dateRange.to.toISOString()}`);
        }
      }
      
      // Add resolution filtering using SQL CASE statement
      if (resolutions && resolutions.length > 0) {
        const resolutionCaseConditions = resolutions.map(res => {
          switch (res) {
            case '4k':
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 4096`;
            case 'ultra':
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 2048 AND (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int < 4096`;
            case 'high':
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 1536 AND (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int < 2048`;
            case 'standard':
              return sql`(${images.dimensions} IS NULL OR ${images.dimensions} = '' OR (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int < 1536)`;
            default:
              return sql`false`;
          }
        });
        
        if (resolutionCaseConditions.length > 0) {
          conditions.push(or(...resolutionCaseConditions));
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
      let mappedItems = items.map(item => {
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
      
      // Resolution filtering is now handled server-side in SQL conditions above
      
      return {
        items: mappedItems,
        nextCursor
      };
    } catch (error) {
      console.error('Error getting images:', error);
      return { items: [], nextCursor: null };
    }
  }

  async getImageCount(options: { 
    starred?: boolean; 
    trash?: boolean; 
    searchQuery?: string;
    models?: string[];
    aspectRatios?: string[];
    resolutions?: string[];
    dateRange?: { from?: Date; to?: Date };
  } = {}): Promise<number> {
    const { 
      starred, 
      trash, 
      searchQuery,
      models,
      aspectRatios,
      resolutions,
      dateRange
    } = options;
    
    // Get current environment to filter images
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    try {
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
      
      // Add model filtering
      if (models && models.length > 0) {
        conditions.push(inArray(images.model, models));
      }
      
      // Add aspect ratio filtering - check both aspectRatio field and dimensions-derived ratios
      if (aspectRatios && aspectRatios.length > 0) {
        const aspectRatioConditions = [];
        
        // First condition: match exact aspectRatio field values
        aspectRatioConditions.push(inArray(images.aspectRatio, aspectRatios));
        
        // Second condition: check dimensions-derived ratios using integer math
        const dimensionConditions = aspectRatios.map(ratio => {
          switch (ratio) {
            case '1:1':
              // width === height (square)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int`;
            case '16:9':
              // width * 9 === height * 16 (widescreen)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 9 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 16`;
            case '9:16':
              // width * 16 === height * 9 (portrait/vertical)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 16 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 9`;
            case '4:3':
              // width * 3 === height * 4 (classic)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 3 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 4`;
            case '3:2':
              // width * 2 === height * 3 (photo)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 2 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 3`;
            case '2:3':
              // width * 3 === height * 2 (portrait photo)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 3 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 2`;
            case '3:4':
              // width * 4 === height * 3 (portrait classic)
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[1]::int * 4 = (regexp_match(${images.dimensions}, '^(\\d+)x(\\d+)$'))[2]::int * 3`;
            default:
              return sql`false`;
          }
        });
        
        // Combine conditions with OR - match either exact aspectRatio OR calculated from dimensions
        if (dimensionConditions.length > 0) {
          aspectRatioConditions.push(or(...dimensionConditions));
        }
        
        conditions.push(or(...aspectRatioConditions));
      }
      
      // Add date range filtering
      if (dateRange) {
        if (dateRange.from) {
          conditions.push(sql`${images.createdAt} >= ${dateRange.from.toISOString()}`);
        }
        if (dateRange.to) {
          conditions.push(sql`${images.createdAt} <= ${dateRange.to.toISOString()}`);
        }
      }
      
      // Add resolution filtering using SQL CASE statement (identical to getAllImages)
      if (resolutions && resolutions.length > 0) {
        const resolutionCaseConditions = resolutions.map(res => {
          switch (res) {
            case '4k':
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 4096`;
            case 'ultra':
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 2048 AND (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int < 4096`;
            case 'high':
              return sql`(regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int >= 1536 AND (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int < 2048`;
            case 'standard':
              return sql`(${images.dimensions} IS NULL OR ${images.dimensions} = '' OR (regexp_match(${images.dimensions}, '^(\\d+)x\\d+$'))[1]::int < 1536)`;
            default:
              return sql`false`;
          }
        });
        
        if (resolutionCaseConditions.length > 0) {
          conditions.push(or(...resolutionCaseConditions));
        }
      }
      
      // Build and execute the count query
      let result;
      if (conditions.length === 0) {
        result = await db.select({ count: count() }).from(images);
      } else if (conditions.length === 1) {
        result = await db.select({ count: count() })
          .from(images)
          .where(conditions[0]);
      } else {
        result = await db.select({ count: count() })
          .from(images)
          .where(and(...conditions));
      }
      
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error getting image count:', error);
      return 0;
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
    
    // Get current environment to filter videos
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    // If fetching by userId, we need to get videos from:
    // 1. Projects owned by the user
    // 2. Projects where the user is a member
    if (userId && !projectId) {
      // Get all project IDs where user has access
      const ownedProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.userId, userId));
      
      const memberProjects = await db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .where(eq(projectMembers.userId, userId));
      
      const accessibleProjectIds = [
        ...ownedProjects.map(p => p.id),
        ...memberProjects.map(p => p.projectId)
      ];
      
      // Build query for videos
      const conditions: any[] = [
        eq(videos.environment, currentEnv),
        or(
          eq(videos.userId, userId), // Videos created by user
          and(
            isNotNull(videos.projectId),
            inArray(videos.projectId, accessibleProjectIds.length > 0 ? accessibleProjectIds : ['none'])
          ) // Videos in accessible projects
        )
      ];
      
      if (status) conditions.push(eq(videos.status, status));
      if (cursor) conditions.push(lt(videos.createdAt, new Date(cursor)));
      
      const videoList = await db
        .select()
        .from(videos)
        .where(and(...conditions))
        .orderBy(desc(videos.createdAt))
        .limit(limit + 1);
      
      const hasMore = videoList.length > limit;
      const items = hasMore ? videoList.slice(0, -1) : videoList;
      const nextCursor = hasMore ? items[items.length - 1]?.createdAt?.toISOString() || null : null;
      
      return { items, nextCursor };
    } else {
      // Original logic for specific project or no user filter
      let query = db.select().from(videos) as any;
      const conditions = [];
      
      // CRITICAL: Filter by environment to prevent cross-environment issues
      conditions.push(eq(videos.environment, currentEnv));
      
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

  // Check if video files should be deleted (reference counting)
  async shouldDeleteVideoFiles(videoId: string, videoUrl: string | null, thumbUrl: string | null): Promise<boolean> {
    // If no URLs to check, no files to delete
    if (!videoUrl && !thumbUrl) {
      return false;
    }

    // Get current environment to ensure we only check within the same environment
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';

    // Check if any other videos reference the same URLs (excluding the video being deleted)
    // IMPORTANT: Only check within the same environment for proper isolation
    const conditions: any[] = [
      ne(videos.id, videoId),
      eq(videos.environment, currentEnv) // Environment isolation
    ];
    
    if (videoUrl && thumbUrl) {
      conditions.push(or(eq(videos.url, videoUrl), eq(videos.thumbUrl, thumbUrl)));
    } else if (videoUrl) {
      conditions.push(eq(videos.url, videoUrl));
    } else if (thumbUrl) {
      conditions.push(eq(videos.thumbUrl, thumbUrl));
    }

    const referencingVideos = await db
      .select({ id: videos.id })
      .from(videos)
      .where(and(...conditions))
      .limit(1); // We only need to know if ANY exist

    // Delete files only if no other videos reference them
    const shouldDelete = referencingVideos.length === 0;
    
    console.log(`Reference check for video ${videoId} in ${currentEnv}: ${shouldDelete ? 'DELETE' : 'KEEP'} files (${referencingVideos.length} other references found)`);
    
    return shouldDelete;
  }

  // Bulk move videos to a project
  async bulkMoveVideos(videoIds: string[], targetProjectId: string | null): Promise<void> {
    await db
      .update(videos)
      .set({ 
        projectId: targetProjectId,
        updatedAt: new Date()
      })
      .where(inArray(videos.id, videoIds));
  }

  // Get unassigned videos (videos without a project)
  async getUnassignedVideos(userId: string): Promise<Video[]> {
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    return await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.userId, userId),
        eq(videos.environment, currentEnv),
        isNull(videos.projectId)
      ))
      .orderBy(desc(videos.createdAt));
  }

  // Enhanced Project operations with advanced features
  async createProject(project: InsertProject): Promise<Project> {
    const [createdProject] = await db.insert(projects).values(project).returning();
    return createdProject;
  }

  async getAllProjects(userId: string, showArchived = false): Promise<Project[]> {
    // Get projects where user is owner OR member
    const ownerConditions = [eq(projects.userId, userId)];
    if (!showArchived) {
      ownerConditions.push(isNull(projects.deletedAt));
    }

    // Projects owned by user
    const ownedProjects = await db
      .select()
      .from(projects)
      .where(and(...ownerConditions))
      .orderBy(asc(projects.orderIndex), desc(projects.createdAt));

    // Projects where user is a member
    const memberConditions = [ne(projects.userId, userId)]; // Exclude already owned projects
    if (!showArchived) {
      memberConditions.push(isNull(projects.deletedAt));
    }

    const memberProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        gcsFolder: projects.gcsFolder,
        videoCount: projects.videoCount,
        userId: projects.userId,
        orderIndex: projects.orderIndex,
        deletedAt: projects.deletedAt,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(and(
        eq(projectMembers.userId, userId),
        ...memberConditions
      ))
      .orderBy(asc(projects.orderIndex), desc(projects.createdAt));

    // Combine and sort all projects
    const allProjects = [...ownedProjects, ...memberProjects];
    return allProjects.sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) {
        return a.orderIndex - b.orderIndex;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getProjectById(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectWithVideos(projectId: string, userId: string): Promise<{
    project: Project;
    videos: Video[];
    totalVideos: number;
    completedVideos: number;
    processingVideos: number;
    totalDuration: number;
  } | null> {
    // Get project
    // Check if user has access to this project (owner or member)
    const hasAccess = await this.hasProjectAccess(projectId, userId);
    if (!hasAccess) {
      return null;
    }

    const project = await this.getProjectById(projectId);
    if (!project) {
      return null;
    }

    // Get current environment to filter videos
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';

    // Get all videos for this project, filtered by environment (no userId filter for collaborative projects)
    const projectVideos = await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.projectId, projectId),
        eq(videos.environment, currentEnv)
      ))
      .orderBy(desc(videos.createdAt));

    // Calculate statistics
    const completedVideos = projectVideos.filter(v => v.status === 'completed').length;
    const processingVideos = projectVideos.filter(v => v.status === 'processing').length;
    const totalDuration = projectVideos
      .filter(v => v.status === 'completed')
      .reduce((sum, v) => sum + (parseInt(v.duration) || 0), 0);

    return {
      project,
      videos: projectVideos,
      totalVideos: projectVideos.length,
      completedVideos,
      processingVideos,
      totalDuration
    };
  }

  async getProjectsWithStats(userId: string, showArchived = false): Promise<Array<Project & {
    videoCount: number;
    completedCount: number;
    processingCount: number;
    lastActivity?: Date;
  }>> {
    // Get current environment to filter videos
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    // Get projects where user is owner OR member
    const archiveCondition = showArchived ? [] : [isNull(projects.deletedAt)];
    
    // Union query to get both owned projects and member projects with stats
    const projectsWithStats = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        gcsFolder: projects.gcsFolder,
        videoCount: projects.videoCount,
        userId: projects.userId,
        orderIndex: projects.orderIndex,
        archivedAt: projects.deletedAt,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        totalVideos: sql<number>`COALESCE(COUNT(CASE WHEN ${videos.environment} = ${currentEnv} THEN ${videos.id} END), 0)`.as('totalVideos'),
        completedCount: sql<number>`COALESCE(SUM(CASE WHEN ${videos.status} = 'completed' AND ${videos.environment} = ${currentEnv} THEN 1 ELSE 0 END), 0)`.as('completedCount'),
        processingCount: sql<number>`COALESCE(SUM(CASE WHEN ${videos.status} = 'processing' AND ${videos.environment} = ${currentEnv} THEN 1 ELSE 0 END), 0)`.as('processingCount'),
        lastActivity: sql<Date>`COALESCE(MAX(CASE WHEN ${videos.environment} = ${currentEnv} THEN ${videos.createdAt} END), ${projects.createdAt})`.as('lastActivity')
      })
      .from(projects)
      .leftJoin(videos, eq(projects.id, videos.projectId))
      .leftJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(and(
        or(
          eq(projects.userId, userId), // User owns the project
          eq(projectMembers.userId, userId) // User is a member
        ),
        ...archiveCondition
      ))
      .groupBy(projects.id, projects.orderIndex, projects.deletedAt)
      .orderBy(asc(projects.orderIndex), desc(projects.createdAt));

    // Remove duplicates that might occur from the join
    const uniqueProjects = projectsWithStats.reduce((acc, project) => {
      const existing = acc.find(p => p.id === project.id);
      if (!existing) {
        acc.push(project);
      }
      return acc;
    }, [] as typeof projectsWithStats);

    return uniqueProjects.map(p => ({
      ...p,
      deletedAt: p.archivedAt, // Map archivedAt to deletedAt for consistency
      videoCount: p.totalVideos,
      completedCount: p.completedCount,
      processingCount: p.processingCount,
      lastActivity: p.lastActivity
    }));
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
    // First move all videos in this project to no project (null)
    await db
      .update(videos)
      .set({ projectId: null })
      .where(eq(videos.projectId, id));
    
    // Then delete the project
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Update video count when videos are moved to/from projects
  async updateProjectVideoCount(projectId: string): Promise<void> {
    // Get current environment to filter videos
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    const videoCount = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(videos)
      .where(and(
        eq(videos.projectId, projectId),
        eq(videos.environment, currentEnv)
      ));
    
    await db
      .update(projects)
      .set({ 
        videoCount: videoCount[0]?.count || 0,
        updatedAt: new Date() 
      })
      .where(eq(projects.id, projectId));
  }

  // Project management operations
  async duplicateProject(projectId: string, userId: string, includeVideos = false): Promise<Project> {
    const originalProject = await this.getProjectById(projectId);
    if (!originalProject) {
      throw new Error('Project not found');
    }

    // Generate unique name for duplicate
    let baseName = `Copy of ${originalProject.name}`;
    let duplicateName = baseName;
    let counter = 1;

    // Check if name already exists and increment counter
    while (true) {
      const existing = await db
        .select()
        .from(projects)
        .where(and(
          eq(projects.userId, userId),
          eq(projects.name, duplicateName)
        ))
        .limit(1);

      if (existing.length === 0) break;
      
      counter++;
      duplicateName = `${baseName} (${counter})`;
    }

    // Get max order index for this user
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`MAX(${projects.orderIndex})` })
      .from(projects)
      .where(eq(projects.userId, userId));
    
    const maxOrder = maxOrderResult[0]?.maxOrder || 0;

    // Create the duplicate project
    const duplicateId = crypto.randomUUID();
    const duplicateData = {
      id: duplicateId,
      name: duplicateName,
      description: originalProject.description,
      gcsFolder: `projects/${duplicateId}`,
      videoCount: 0,
      userId,
      orderIndex: maxOrder + 1,
    };

    const [duplicatedProject] = await db
      .insert(projects)
      .values(duplicateData)
      .returning();

    // Duplicate video records if includeVideos is true
    if (includeVideos) {
      console.log('Duplicating video records for project:', duplicateId);
      
      // Get all videos from the original project
      const originalVideos = await db
        .select()
        .from(videos)
        .where(eq(videos.projectId, projectId));
      
      console.log(`Found ${originalVideos.length} videos to duplicate`);
      
      // Create new video records pointing to the same files
      if (originalVideos.length > 0) {
        const duplicatedVideoData = originalVideos.map(video => ({
          id: crypto.randomUUID(), // New unique ID
          projectId: duplicateId, // Point to the new project
          userId: video.userId,
          prompt: video.prompt,
          model: video.model, // Correct field name
          url: video.url, // Same file URL - shared storage
          thumbUrl: video.thumbUrl, // Same thumbnail URL
          fullUrl: video.fullUrl, // Same full URL
          status: video.status,
          duration: video.duration,
          resolution: video.resolution, // Required field
          aspectRatio: video.aspectRatio,
          referenceImageUrl: video.referenceImageUrl,
          firstFrameImage: video.firstFrameImage,
          jobId: video.jobId,
          promptOptimizer: video.promptOptimizer,
          environment: video.environment,
          error: video.error,
          size: video.size
        }));
        
        await db.insert(videos).values(duplicatedVideoData);
        
        // Update the video count for the duplicated project
        await db
          .update(projects)
          .set({ videoCount: originalVideos.length })
          .where(eq(projects.id, duplicateId));
          
        console.log(`Successfully duplicated ${originalVideos.length} video records`);
      }
    }

    return duplicatedProject;
  }



  async reorderProjects(userId: string, projectIds: string[]): Promise<void> {
    // Update the order index for each project
    const updates = projectIds.map((id, index) => 
      db
        .update(projects)
        .set({ 
          orderIndex: index,
          updatedAt: new Date()
        })
        .where(and(
          eq(projects.id, id),
          eq(projects.userId, userId)
        ))
    );

    // Execute all updates
    await Promise.all(updates);
  }

  async permanentDeleteProject(projectId: string, deleteVideos = false): Promise<void> {
    if (deleteVideos) {
      // Delete all videos in this project
      await db.delete(videos).where(eq(videos.projectId, projectId));
      
      // TODO: Also delete video files from object storage
      console.log('Video file deletion from object storage not yet implemented');
    } else {
      // Move all videos in this project to no project (null)
      await db
        .update(videos)
        .set({ projectId: null })
        .where(eq(videos.projectId, projectId));
    }
    
    // Delete the project
    await db.delete(projects).where(eq(projects.id, projectId));
  }

  async getVideosByProject(projectId: string): Promise<Video[]> {
    const currentEnv = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
    
    return await db
      .select()
      .from(videos)
      .where(and(
        eq(videos.projectId, projectId),
        eq(videos.environment, currentEnv)
      ))
      .orderBy(desc(videos.createdAt));
  }

  async createProjectExportZip(project: Project, projectVideos: Video[]): Promise<{success: boolean; downloadUrl?: string; error?: string}> {
    try {
      console.log(`Creating export ZIP for project: ${project.name} with ${projectVideos.length} videos`);

      // Create descriptive filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:T.-]/g, "").slice(0, 14); // YYYYMMDDHHMMSS
      const safeName = project.name.replace(/[^a-zA-Z0-9]/g, '_');
      const zipFilename = `project_export_${safeName}_${timestamp}.zip`;
      
      // Create paths
      const tmpZipPath = path.join("/tmp", zipFilename);
      const downloadDir = path.join(process.cwd(), "downloads");
      const downloadZipPath = path.join(downloadDir, zipFilename);
      
      // Ensure downloads directory exists
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      // Create prompts text file content
      let promptsContent = `Project: ${project.name}\n`;
      if (project.description) {
        promptsContent += `Description: ${project.description}\n`;
      }
      promptsContent += `Exported: ${new Date().toISOString()}\n`;
      promptsContent += `Total Videos: ${projectVideos.length}\n\n`;
      promptsContent += "=" .repeat(50) + "\n\n";
      
      projectVideos.forEach((video, index) => {
        promptsContent += `Video ${index + 1}:\n`;
        promptsContent += `Prompt: ${video.prompt}\n`;
        promptsContent += `Model: ${video.model}\n`;
        promptsContent += `Resolution: ${video.resolution}\n`;
        promptsContent += `Duration: ${video.duration}\n`;
        if (video.aspectRatio) promptsContent += `Aspect Ratio: ${video.aspectRatio}\n`;
        promptsContent += `Created: ${video.createdAt}\n`;
        promptsContent += "\n" + "-".repeat(30) + "\n\n";
      });

      // Download video files first
      const videoFiles: { name: string; data: Buffer }[] = [];
      const { Client } = await import('@replit/object-storage');
      const client = new Client();
      
      for (let i = 0; i < projectVideos.length; i++) {
        const video = projectVideos[i];
        if (video.url && video.url.includes('/api/object-storage/video/')) {
          try {
            // Extract storage path from URL
            const pathMatch = video.url.match(/\/api\/object-storage\/video\/(.+)/);
            if (pathMatch) {
              const { ok, value, error } = await client.downloadAsBytes(pathMatch[1]);
              
              if (ok && value) {
                // Generate safe filename for video
                const videoIndex = String(i + 1).padStart(2, '0');
                const videoExtension = pathMatch[1].split('.').pop() || 'mp4';
                const safeVideoName = `video_${videoIndex}.${videoExtension}`;
                
                // The value is an array containing a Buffer as the first element
                let videoBuffer: Buffer;
                if (Array.isArray(value) && value.length > 0 && Buffer.isBuffer(value[0])) {
                  // Object Storage returns an array with the Buffer as first element
                  videoBuffer = value[0];
                } else if (Buffer.isBuffer(value)) {
                  videoBuffer = value;
                } else if (value instanceof Uint8Array) {
                  videoBuffer = Buffer.from(value);
                } else if (Array.isArray(value)) {
                  // Fallback for other array types - should not happen
                  console.warn(`Unexpected array type for ${safeVideoName}, attempting conversion`);
                  videoBuffer = Buffer.alloc(0); // Empty buffer as fallback
                } else {
                  // Log what we got for debugging
                  console.log(`Unexpected value type for ${safeVideoName}:`, typeof value, (value as any)?.constructor?.name);
                  videoBuffer = Buffer.from(value as any);
                }
                
                console.log(`Downloaded video file: ${safeVideoName} (${videoBuffer.length} bytes)`);
                
                videoFiles.push({
                  name: safeVideoName,
                  data: videoBuffer
                });
                
              } else {
                console.warn(`Failed to download video file: ${pathMatch[1]}, error: ${error}`);
              }
            }
          } catch (videoError) {
            console.error(`Error downloading video:`, videoError);
          }
        }
      }

      // Create ZIP file
      await new Promise<void>((resolve, reject) => {
        const output = createWriteStream(tmpZipPath);
        const archive = archiver("zip", { zlib: { level: 9 } });
        
        output.on("close", () => {
          console.log(`Export ZIP created: ${tmpZipPath}, size: ${archive.pointer()} bytes`);
          resolve();
        });
        
        archive.on("error", (err) => {
          console.error(`Error creating export ZIP:`, err);
          reject(err);
        });
        
        archive.pipe(output);
        
        // Add prompts text file
        archive.append(promptsContent, { name: 'prompts.txt' });
        
        // Add video files
        videoFiles.forEach(videoFile => {
          if (videoFile.data && videoFile.data.length > 0) {
            archive.append(videoFile.data, { name: videoFile.name });
            console.log(`Added video to ZIP: ${videoFile.name} (${videoFile.data.length} bytes)`);
          } else {
            console.warn(`Skipping empty video file: ${videoFile.name}`);
          }
        });
        
        console.log(`Added ${videoFiles.length} video files to export ZIP`);
        archive.finalize();
      });

      // Move ZIP to downloads directory
      if (fs.existsSync(tmpZipPath)) {
        fs.copyFileSync(tmpZipPath, downloadZipPath);
        fs.unlinkSync(tmpZipPath); // Clean up temp file
      }

      const downloadUrl = `/downloads/${zipFilename}`;
      console.log(`Project export ZIP ready for download: ${downloadUrl}`);
      
      return { 
        success: true, 
        downloadUrl
      };

    } catch (error: any) {
      console.error('Failed to create project export ZIP:', error);
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred'
      };
    }
  }

  // Project membership operations for collaboration
  async addProjectMember(projectId: string, userId: string, addedBy?: string): Promise<ProjectMember> {
    const memberId = crypto.randomUUID();
    const [member] = await db
      .insert(projectMembers)
      .values({
        id: memberId,
        projectId,
        userId,
        addedBy
      })
      .returning();
    return member;
  }

  async removeProjectMember(projectId: string, userId: string): Promise<void> {
    await db
      .delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ));
  }

  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(projectMembers.addedAt));
  }

  async getProjectMembersWithDetails(projectId: string): Promise<(ProjectMember & { user: User })[]> {
    const result = await db
      .select({
        id: projectMembers.id,
        projectId: projectMembers.projectId,
        userId: projectMembers.userId,
        addedAt: projectMembers.addedAt,
        addedBy: projectMembers.addedBy,
        user: users
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId))
      .orderBy(asc(projectMembers.addedAt));

    return result.map(row => ({
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      addedAt: row.addedAt,
      addedBy: row.addedBy,
      user: row.user
    }));
  }

  async getUserProjectMemberships(userId: string): Promise<ProjectMember[]> {
    return await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId))
      .orderBy(asc(projectMembers.addedAt));
  }

  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    // Check if user is the project owner
    const [project] = await db
      .select({ userId: projects.userId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (project?.userId === userId) {
      return true;
    }

    // Check if user is a project member
    const [membership] = await db
      .select({ id: projectMembers.id })
      .from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      ))
      .limit(1);

    return !!membership;
  }

  async getProjectMemberCounts(userId: string): Promise<Record<string, number>> {
    // Get all projects that the user owns or is a member of
    const ownedProjects = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.userId, userId));

    const memberProjects = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .where(eq(projectMembers.userId, userId));

    // Combine and deduplicate project IDs
    const allProjectIds = Array.from(new Set([
      ...ownedProjects.map(p => p.id),
      ...memberProjects.map(p => p.projectId)
    ]));

    if (allProjectIds.length === 0) {
      return {};
    }


    // Get member counts for all accessible projects
    const memberCounts = await db
      .select({
        projectId: projectMembers.projectId,
        memberCount: sql<number>`COUNT(*)`.as('memberCount')
      })
      .from(projectMembers)
      .where(inArray(projectMembers.projectId, allProjectIds))
      .groupBy(projectMembers.projectId);


    // Convert to Record format
    const result: Record<string, number> = {};
    memberCounts.forEach(({ projectId, memberCount }) => {
      result[projectId] = memberCount;
    });

    return result;
  }

  async searchUsers(query: string, excludeUserId: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    return await db
      .select()
      .from(users)
      .where(and(
        ne(users.id, excludeUserId), // Exclude the current user
        or(
          sql`LOWER(${users.email}) LIKE ${searchTerm}`,
          sql`LOWER(${users.firstName}) LIKE ${searchTerm}`,
          sql`LOWER(${users.lastName}) LIKE ${searchTerm}`,
          sql`LOWER(CONCAT(${users.firstName}, ' ', ${users.lastName})) LIKE ${searchTerm}`
        )
      ))
      .limit(10)
      .orderBy(asc(users.email));
  }
}

// Create database storage instance
export const storage = new DatabaseStorage();
