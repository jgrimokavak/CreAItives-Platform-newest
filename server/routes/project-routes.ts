import express from 'express';
import { z } from 'zod';
import { insertProjectSchema } from '@shared/schema';
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

    console.log('[DIAGNOSTIC] /api/projects GET - Fetching projects for userId:', userId);
    const projects = await storage.getAllProjects(userId);
    console.log('[DIAGNOSTIC] /api/projects GET - Found projects:', projects.length);
    res.json(projects);

  } catch (error: any) {
    console.error('[DIAGNOSTIC] /api/projects GET - Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

export default router;