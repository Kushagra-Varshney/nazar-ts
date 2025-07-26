import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();

router.get('/analytics', AnalyticsController.getAnalytics);
router.get('/analytics/file-types', AnalyticsController.getFileTypeDistribution);
router.get('/analytics/trends', AnalyticsController.getActivityTrends);

export default router;