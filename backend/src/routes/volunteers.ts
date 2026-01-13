import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import * as volunteerService from '../services/volunteerService';
import { validateVolunteerData } from '../utils/validation';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    validateVolunteerData(req.body);
    const volunteer = await volunteerService.createVolunteer({
      ...req.body,
      is_active: true,
      joined_date: new Date().toISOString(),
    });
    res.status(201).json(successResponse(volunteer));
  })
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const sortBy = (req.query.sort as 'newest' | 'oldest') || 'newest';
    const volunteers = await volunteerService.getVolunteers(sortBy);
    res.json(successResponse(volunteers));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const volunteer = await volunteerService.getVolunteerById(req.params.id);
    res.json(successResponse(volunteer));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const volunteer = await volunteerService.updateVolunteer(req.params.id, req.body);
    res.json(successResponse(volunteer));
  })
);

router.patch(
  '/:id/toggle-status',
  asyncHandler(async (req: Request, res: Response) => {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }
    const volunteer = await volunteerService.toggleVolunteerStatus(req.params.id, is_active);
    res.json(successResponse(volunteer));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await volunteerService.deleteVolunteer(req.params.id);
    res.json(successResponse({ message: 'Volunteer deleted successfully' }));
  })
);

// Work assignment routes
router.post(
  '/work-assignments',
  asyncHandler(async (req: Request, res: Response) => {
    const { volunteer_id, event_id, task_name, task_status } = req.body;

    // Validation errors
    if (!volunteer_id || !event_id || !task_name) {
      return res.status(400).json({ 
        error: 'volunteer_id, event_id, and task_name are required' 
      });
    }

    if (task_status && !['assigned', 'in_progress', 'completed'].includes(task_status)) {
      return res.status(400).json({ 
        error: 'task_status must be one of: assigned, in_progress, completed' 
      });
    }

    try {
      const workAssignment = await volunteerService.createWorkAssignment({
        volunteer_id,
        event_id,
        task_name,
        task_status: task_status || 'assigned'
      });
      res.status(201).json(successResponse(workAssignment));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Explicit error handling - no silent failures
      if (errorMsg.includes('Volunteer not found')) {
        return res.status(404).json({ error: `Volunteer ${volunteer_id} not found` });
      }
      if (errorMsg.includes('Event not found')) {
        return res.status(404).json({ error: `Event ${event_id} not found` });
      }
      if (errorMsg.includes('not found')) {
        return res.status(404).json({ error: errorMsg });
      }
      
      // Database error
      return res.status(500).json({ error: `Failed to assign work: ${errorMsg}` });
    }
  })
);

router.get(
  '/:id/work-history',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Volunteer ID is required' });
    }
    
    try {
      const workHistory = await volunteerService.getWorkHistory(id);
      res.json(successResponse(workHistory));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: `Failed to fetch work history: ${errorMsg}` });
    }
  })
);

router.delete(
  '/work-assignments/:workId',
  asyncHandler(async (req: Request, res: Response) => {
    const { workId } = req.params;
    
    if (!workId) {
      return res.status(400).json({ error: 'Work assignment ID is required' });
    }
    
    try {
      await volunteerService.deleteWorkAssignment(workId);
      res.json(successResponse({ message: 'Work assignment deleted successfully' }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: `Failed to delete work assignment: ${errorMsg}` });
    }
  })
);

router.delete(
  '/:id/work-history/:eventId',
  asyncHandler(async (req: Request, res: Response) => {
    const { id, eventId } = req.params;
    
    if (!id || !eventId) {
      return res.status(400).json({ error: 'Volunteer ID and Event ID are required' });
    }
    
    try {
      await volunteerService.deleteAllWorkForEvent(eventId, id);
      res.json(successResponse({ message: 'All work assignments deleted successfully' }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: `Failed to delete work assignments: ${errorMsg}` });
    }
  })
);

export default router;
