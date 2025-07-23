import express from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';

const router = express.Router();

// Project schema for validation
const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
});

const projectsTable = 'projects'; // We'll add this to schema later

// GET / - List all projects
router.get('/', async (req, res) => {
  try {
    // For now, return mock projects since we haven't implemented projects table
    const mockProjects = [
      { id: '1', name: 'Marketing Campaign 2024', createdAt: new Date('2024-01-15') },
      { id: '2', name: 'Product Demo Videos', createdAt: new Date('2024-02-20') },
      { id: '3', name: 'Social Media Content', createdAt: new Date('2024-03-10') },
    ];
    
    res.json(mockProjects);
  } catch (error) {
    console.log(`Error fetching projects: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST / - Create new project
router.post('/', async (req, res) => {
  try {
    const validatedData = createProjectSchema.parse(req.body);
    
    const project = {
      id: uuidv4(),
      name: validatedData.name,
      createdAt: new Date(),
    };
    
    // TODO: Store in database when projects table is added
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
    
    // TODO: Implement when we have proper video-project relationships
    console.log(`Fetching videos for project: ${id}`);
    
    res.json([]);
  } catch (error) {
    console.log(`Error fetching project videos: ${error}`);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;