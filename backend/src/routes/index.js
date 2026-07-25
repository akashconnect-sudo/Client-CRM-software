import { Router } from 'express';
import authRoutes from './authRoutes.js';
import employeeRoutes from './employeeRoutes.js';
import leadRoutes from './leadRoutes.js';
import callRoutes from './callRoutes.js';
import reportRoutes from './reportRoutes.js';
import webhookRoutes from './webhookRoutes.js';
import connectRoutes from './connectRoutes.js';
import followUpRoutes from './followUpRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import companyRoutes from './companyRoutes.js';
import billingRoutes from './billingRoutes.js';

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
router.use('/follow-ups', followUpRoutes);
router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);

router.get('/health', (req, res) => res.json({ success: true, message: 'Sales Lead CRM API is running' }));

export default router;
