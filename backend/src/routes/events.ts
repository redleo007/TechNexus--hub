import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse, errorResponse } from '../utils/response';
import * as eventService from '../services/eventService';
import { validateEventData } from '../utils/validation';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    validateEventData(req.body);
    const event = await eventService.createEvent(req.body);
    res.status(201).json(successResponse(event));
  })
);

router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const events = await eventService.getEvents();
    res.json(successResponse(events));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const event = await eventService.getEventById(req.params.id);
    res.json(successResponse(event));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    if (req.body.name) {
      validateEventData(req.body);
    }
    const event = await eventService.updateEvent(req.params.id, req.body);
    res.json(successResponse(event));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    await eventService.deleteEvent(req.params.id);
    res.json(successResponse({ message: 'Event deleted successfully' }));
  })
);

export default router;
