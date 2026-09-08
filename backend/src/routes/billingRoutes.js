import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  plans,
  catalog,
  quote,
  subscription,
  checkout,
  checkoutPublic,
  seatTopUpCheckout,
  confirmSeatTopUpPayment,
  confirmPayment,
  activatePlan,
} from '../controllers/billingController.js';

const router = Router();

router.get('/plans', plans);
router.get('/catalog', catalog);
router.post('/quote', quote);
router.post('/confirm-payment', confirmPayment);
router.get('/subscription', authenticate, subscription);
router.post('/checkout', authenticate, authorize('SUPER_ADMIN'), checkout);
router.post('/checkout/public', checkoutPublic);
router.post('/seats/checkout', authenticate, authorize('SUPER_ADMIN'), seatTopUpCheckout);
router.post('/seats/confirm', authenticate, authorize('SUPER_ADMIN'), confirmSeatTopUpPayment);
router.post('/activate', authenticate, authorize('SUPER_ADMIN'), activatePlan);

export default router;
