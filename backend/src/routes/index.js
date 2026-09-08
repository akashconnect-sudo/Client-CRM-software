import { Router } from 'express';
import authRoutes from './authRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import leadRoutes from './leadRoutes.js';
import callRoutes from './callRoutes.js';
import reportRoutes from './reportRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import connectRoutes from './connectRoutes.js';
import ivrIntegrationRoutes from './ivrIntegrationRoutes.js';
import followUpRoutes from './followUpRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import companyRoutes from './companyRoutes.js';
import billingRoutes from './billingRoutes.js';
import aiRoutes from './aiRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/billing', billingRoutes);
router.use('/companies', companyRoutes);
router.use('/employees', employeeRoutes);
router.use('/leads', leadRoutes);
router.use('/calls', callRoutes);
router.use('/reports', reportRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/connect', connectRoutes);
router.use('/ivr', ivrIntegrationRoutes);
router.use('/follow-ups', followUpRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/ai', aiRoutes);

router.get('/health', (req, res) => res.json({ success: true, message: 'Sales Lead CRM API is running' }));

export default router;
