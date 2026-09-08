import { Router } from 'express';
import {
  dashboard,
  employeeReport,
  callReport,
  campaignReport,
  conversionReport,
  exportEmployeeReport,
  employeePerformanceDetail,
} from '../controllers/reportController.js';
import { authenticate, scopeToEmployee, managerOrSuperAdmin } from '../middleware/auth.js';
import { requireModuleFeature } from '../middleware/moduleGate.js';

const router = Router();

router.use(authenticate, scopeToEmployee);

router.get('/dashboard', dashboard);
router.get('/employees', managerOrSuperAdmin, requireModuleFeature('reports'), employeeReport);
router.get('/employees/export', managerOrSuperAdmin, requireModuleFeature('reports'), exportEmployeeReport);
router.get('/employees/:id/performance', requireModuleFeature('reports'), employeePerformanceDetail);
router.get('/calls', managerOrSuperAdmin, requireModuleFeature('callBridge'), callReport);
router.get('/campaigns', managerOrSuperAdmin, requireModuleFeature('reports'), campaignReport);
router.get('/conversions', managerOrSuperAdmin, requireModuleFeature('reports'), conversionReport);

export default router;
