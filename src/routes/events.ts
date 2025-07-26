import { Router } from 'express';
import { EventsController } from '../controllers/eventsController';

const router = Router();

router.get('/events', EventsController.getAllEvents);
router.get('/hosts/:hostId/events', EventsController.getEventsByHost);

export default router;