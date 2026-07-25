import { Router } from 'express';
import { contactEvent } from '../controllers/connectController.js';
import { verifyConnectWebhook } from '../middleware/webhookAuth.js';
import { resolveWebhookCompany } from '../middleware/webhookCompany.js';

const router = Router();

router.use(resolveWebhookCompany);
router.post('/contact-event', verifyConnectWebhook, contactEvent);

export default router;
