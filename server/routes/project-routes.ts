import express from 'express';
import { z } from 'zod';
import { 
  insertProjectSchema, 
  duplicateProjectSchema, 
  reorderProjectsSchema, 
  archiveProjectSchema, 
  deleteProjectSchema 
} from '@shared/schema';
import { storage } from '../storage';
import crypto from 'crypto';

const router = express.Router();

// Create project
router.post('/', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validate input
    const createProjectSchema = z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
    });

    const validationResult = createProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      });
    }

    const { name, description } = validationResult.data;

    // Create project  
    const projectId = crypto.randomUUID();
    const projectData = {
      id: projectId,
      name,
      description: description || null,
      gcsFolder: `projects/${projectId}`, // GCS folder path for project assets
      videoCount: 0,
      userId,
    };
    
    const project = await storage.createProject(projectData);

    res.json({
      success: true,
      ...project,
      message: 'Project created successfully'
    });

  } catch (error: any) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List user's projects
router.get('/', async (req, res) => {
  try {
    // DIAGNOSTIC: Log authentication details
    const user = req.user as any;
    const userId = user?.claims?.sub;
    console.log('[DIAGNOSTIC] /api/projects GET - Auth details:', {
      hasUser: !!user,
      hasUserClaims: !!(user?.claims),
      userId: userId,
      isAuthenticated: req.isAuthenticated?.(),
      sessionExists: !!(req as any).session,
      userKeys: user ? Object.keys(user) : [],
      claimsKeys: user?.claims ? Object.keys(user.claims) : []
    });
    
    if (!userId) {
      console.error('[DIAGNOSTIC] /api/projects GET - Authentication failed: No userId found');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { withStats, showArchived } = req.query;
    
    if (withStats === 'true') {
      const projectsWithStats = await storage.getProjectsWithStats(userId, showArchived === 'true');
      res.json(projectsWithStats);
    } else {
      const projects = await storage.getAllProjects(userId, showArchived === 'true');
      res.json(projects);
    }

  } catch (error: any) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project with videos and detailed statistics
router.get('/:id/details', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const projectDetails = await storage.getProjectWithVideos(req.params.id, userId);
    if (!projectDetails) {
      return res.status(404).json({ error: 'Project not found or access denied' });
    }

    res.json(projectDetails);

  } catch (error: any) {
    console.error('Get project details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project by ID
router.get('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const project = await storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Ensure user can only access their own projects (or is admin)
    if (project.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);

  } catch (error: any) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const project = await storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Ensure user can only update their own projects (or is admin)
    if (project.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate input
    const updateProjectSchema = z.object({
      name: z.string().min(1).max(100).optional(),
      description: z.string().max(500).optional(),
    });

    const validationResult = updateProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      });
    }

    const updatedProject = await storage.updateProject(req.params.id, validationResult.data);
    if (!updatedProject) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({
      success: true,
      ...updatedProject,
      message: 'Project updated successfully'
    });

  } catch (error: any) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const project = await storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Ensure user can only delete their own projects (or is admin)
    if (project.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await storage.deleteProject(req.params.id);
    res.json({ success: true, message: 'Project deleted successfully' });

  } catch (error: any) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Duplicate project
router.post('/:id/duplicate', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validationResult = duplicateProjectSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      });
    }

    const project = await storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const duplicatedProject = await storage.duplicateProject(req.params.id, userId, validationResult.data.includeVideos);
    
    res.json({
      success: true,
      ...duplicatedProject,
      message: 'Project duplicated successfully'
    });

  } catch (error: any) {
    console.error('Duplicate project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Archive project (soft delete)
router.post('/:id/archive', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const project = await storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const archivedProject = await storage.archiveProject(req.params.id);
    res.json({
      success: true,
      ...archivedProject,
      message: 'Project archived successfully'
    });

  } catch (error: any) {
    console.error('Archive project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Restore project from archive
router.post('/:id/restore', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const project = await storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const restoredProject = await storage.restoreProject(req.params.id);
    res.json({
      success: true,
      ...restoredProject,
      message: 'Project restored successfully'
    });

  } catch (error: any) {
    console.error('Restore project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder projects
router.post('/reorder', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const validationResult = reorderProjectsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: validationResult.error.issues 
      });
    }

    await storage.reorderProjects(userId, validationResult.data.projectIds);
    
    res.json({
      success: true,
      message: 'Projects reordered successfully'
    });

  } catch (error: any) {
    console.error('Reorder projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Permanently delete project
router.delete('/:id/permanent', async (req, res) => {
  try {
    const user = req.user as any;
    const userId = user?.claims?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { deleteVideos } = req.body;

    const project = await storage.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (project.userId !== userId && user?.claims?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await storage.permanentDeleteProject(req.params.id, deleteVideos === true);
    const message = deleteVideos 
      ? 'Project permanently deleted with all videos'
      : 'Project permanently deleted. Videos moved to "Videos without a project"';
    res.json({ success: true, message });

  } catch (error: any) {
    console.error('Permanent delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;