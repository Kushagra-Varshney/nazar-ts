import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';

const router = Router();

router.get('/dashboard', DashboardController.getDashboardData);

export default router;