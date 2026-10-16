import { Router } from 'express';
import { MovementController } from './controllers/MovementController.js';
import { authMiddleware } from '../../shared/middlewares/auth.middleware.js';
import { authorize } from '../../shared/middlewares/authorize.middleware.js';

const router = Router();
const controller = new MovementController();

router.use(authMiddleware as any);

router.get('/', authorize('movements:read') as any, controller.getMovements as any);
router.post('/', authorize('movements:create') as any, controller.createMovement as any);

export default router;
