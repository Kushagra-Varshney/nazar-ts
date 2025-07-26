import { Router } from 'express';
import { HostsController } from '../controllers/hostsController';

const router = Router();

router.get('/hosts', HostsController.getAllHosts);

export default router;