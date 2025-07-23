import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';

const router = express.Router();

// Project schema for validation
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

// GET / - List all projects with video counts
router.get('/', async (req, res) => {
  try {
    const projects = await storage.getAllProjects();
    
    // Get video counts for each project
    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const videos = await storage.getVideosByProject(project.id);
        return {
          ...project,
          video_count: videos.length,
        };
      })
    );
    
    res.json(projectsWithCounts);
  } catch (error) {
    console.log(`Error fetching projects: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - Create new project
router.post('/', async (req, res) => {
  try {
    const validatedData = createProjectSchema.parse(req.body);
    
    const projectData = {
      id: uuidv4(),
      name: validatedData.name,
      description: validatedData.description || null,
      gcs_folder: `projects/${uuidv4()}`, // Create unique GCS folder for each project
    };
    
    const project = await storage.createProject(projectData);
    console.log('Created project:', project);
    
    res.json(project);
  } catch (error) {
    console.log(`Error creating project: ${error}`);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id/videos - Get videos for a specific project
router.get('/:id/videos', async (req, res) => {
  try {
    const { id } = req.params;
    
    const videos = await storage.getVideosByProject(id);
    console.log(`Fetched ${videos.length} videos for project: ${id}`);
    
    res.json(videos);
  } catch (error) {
    console.log(`Error fetching project videos: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /:id - Get project details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const project = await storage.getProjectById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.log(`Error fetching project: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /:id - Update project
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = createProjectSchema.parse(req.body);
    
    const updated = await storage.updateProject(id, validatedData);
    if (!updated) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(updated);
  } catch (error) {
    console.log(`Error updating project: ${error}`);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: error.errors,
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /:id - Delete project and all its videos
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await storage.deleteProject(id);
    console.log(`Deleted project: ${id}`);
    
    res.status(204).send();
  } catch (error) {
    console.log(`Error deleting project: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;