import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  providers,
  getIntegration,
  saveIntegration,
  testIntegration,
  externalWebhook,
  webhookInfo,
  rotateWebhookSecret,
} from '../controllers/ivrIntegrationController.js';

const router = Router();

// Public inbound webhook from external IVR vendors
router.post('/external/:provider/:companyId', externalWebhook);

router.use(authenticate);
router.get('/providers', authorize('SUPER_ADMIN', 'MANAGER'), providers);
router.get('/integration', authorize('SUPER_ADMIN'), getIntegration);
router.put('/integration', authorize('SUPER_ADMIN'), saveIntegration);
router.post('/integration/test', authorize('SUPER_ADMIN'), testIntegration);
router.get('/webhook-info', authorize('SUPER_ADMIN'), webhookInfo);
router.post('/webhook-secret/rotate', authorize('SUPER_ADMIN'), rotateWebhookSecret);

export default router;
