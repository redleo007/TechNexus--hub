import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { successResponse } from '../utils/response';
import * as participantService from '../services/participantService';
import { validateParticipantData } from '../utils/validation';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    validateParticipantData(req.body);
    const participant = await participantService.createParticipant({
      ...req.body,
      is_blocklisted: false,
    });
    res.status(201).json(successResponse(participant));
  })
);

router.post(
  '/with-event',
  asyncHandler(async (req: Request, res: Response) => {
    const { full_name, name, eventpass_id } = req.body;
    
    // Accept either full_name or name
    const participantName = full_name || name;
    
    if (!participantName || !participantName.trim()) {
      return res.status(400).json({ error: 'full_name or name is required' });
    }
    
    if (!eventpass_id) {
      return res.status(400).json({ error: 'eventpass_id is required' });
    }
    
    const participant = await participantService.createParticipantWithEvent({
      full_name: participantName.trim(),
      eventpass_id,
    });
    res.status(201).json(successResponse(participant));
  })
);

router.post(
  '/bulk-import-batch',
  asyncHandler(async (req: Request, res: Response) => {
    const { participants } = req.body;
    
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: 'participants array is required and must not be empty' });
    }

    // Validate each participant
    for (const p of participants) {
      if (!p.full_name || !p.full_name.trim()) {
        return res.status(400).json({ error: 'All participants must have full_name' });
      }
      if (!p.event_id) {
        return res.status(400).json({ error: 'All participants must have event_id' });
      }
    }

    const result = await participantService.bulkCreateParticipantsWithEvent(participants);
    res.status(201).json(successResponse({ imported: result.length, data: result }));
  })
);

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const includeBlocklisted = req.query.includeBlocklisted === 'true';
    const participants = await participantService.getParticipants(includeBlocklisted);
    res.json(successResponse(participants));
  })
);

router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const participant = await participantService.getParticipantById(req.params.id);
    res.json(successResponse(participant));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const participant = await participantService.updateParticipant(req.params.id, req.body);
    res.json(successResponse(participant));
  })
);

router.get(
  '/stats/active',
  asyncHandler(async (_req: Request, res: Response) => {
    const count = await participantService.getActiveParticipantsCount();
    res.json(successResponse({ count }));
  })
);

router.get(
  '/stats/blocklisted',
  asyncHandler(async (_req: Request, res: Response) => {
    const count = await participantService.getBlocklistedParticipantsCount();
    res.json(successResponse({ count }));
  })
);

export default router;
