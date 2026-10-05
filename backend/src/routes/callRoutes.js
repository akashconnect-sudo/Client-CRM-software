import { Router } from 'express';
import {
  listCalls,
  getCall,
  getCallsByEmployee,
  getCallsByLead,
  getCallRecording,
  initiateCall,
} from '../controllers/callController.js';
import { authenticate, scopeToEmployee } from '../middleware/auth.js';
import { requireModuleFeature } from '../middleware/moduleGate.js';

const router = Router();

router.use(authenticate, scopeToEmployee, requireModuleFeature('callBridge'));

router.post('/initiate', initiateCall);
router.get('/', listCalls);
router.get('/employee/:employeeId', getCallsByEmployee);
router.get('/lead/:leadId', getCallsByLead);
router.get('/:id/recording', getCallRecording);
router.get('/:id', getCall);

export default router;
