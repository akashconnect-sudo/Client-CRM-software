import { Router } from 'express';
import {
  listFollowUps,
  completeFollowUp,
  followUpDashboard,
} from '../controllers/followUpController.js';
import { authenticate, scopeToEmployee } from '../middleware/auth.js';
import { requireModuleFeature } from '../middleware/moduleGate.js';

const router = Router();

router.use(authenticate, scopeToEmployee, requireModuleFeature('follow-ups'));

router.get('/', listFollowUps);
router.get('/dashboard', followUpDashboard);
router.patch('/:id/complete', completeFollowUp);

export default router;
