import { Router } from 'express';
import {
  listLeads,
  getLead,
  createLead,
  bulkImportLeads,
  bulkDeleteLeads,
  updateLead,
  deleteLead,
  assignLead,
  addNote,
  addFollowUp,
} from '../controllers/leadController.js';
import { authenticate, authorize, scopeToEmployee } from '../middleware/auth.js';
import { requireModuleFeature } from '../middleware/moduleGate.js';

const router = Router();

router.use(authenticate, scopeToEmployee, requireModuleFeature('leads'));

router.get('/', listLeads);
router.post('/', authorize('SUPER_ADMIN', 'MANAGER'), createLead);
router.post('/bulk-import', authorize('SUPER_ADMIN', 'MANAGER'), bulkImportLeads);
router.post('/bulk-delete', authorize('SUPER_ADMIN', 'MANAGER'), bulkDeleteLeads);
router.get('/:id', getLead);
router.put('/:id', updateLead);
router.delete('/:id', authorize('SUPER_ADMIN', 'MANAGER'), deleteLead);
router.post('/:id/assign', authorize('SUPER_ADMIN', 'MANAGER'), assignLead);
router.post('/:id/notes', addNote);
router.post('/:id/follow-up', addFollowUp);

export default router;
