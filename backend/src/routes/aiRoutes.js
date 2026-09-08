import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireAIAccess } from '../middleware/aiGate.js';
import {
  getAiStatus,
  askAdvisor,
  suggestFollowUp,
  requestPulseReasoning,
  getJob,
  listJobs,
} from '../controllers/aiController.js';

const router = Router();

router.use(authenticate);

router.get('/status', getAiStatus);
router.get('/jobs', requireAIAccess, listJobs);
router.get('/jobs/:jobId', requireAIAccess, getJob);
router.post('/advisor/ask', requireAIAccess, askAdvisor);
router.post('/follow-up-draft', requireAIAccess, suggestFollowUp);
router.post('/follow-up-draft/:leadId', requireAIAccess, suggestFollowUp);
router.post('/pulse/:leadId', requireAIAccess, requestPulseReasoning);

export default router;
