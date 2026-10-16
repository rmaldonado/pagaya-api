import { Router } from 'express';
import { TransferController } from './controllers/TransferController.js';
import { authMiddleware } from '../../shared/middlewares/auth.middleware.js';
import { authorize } from '../../shared/middlewares/authorize.middleware.js';

const router = Router();
const controller = new TransferController();

router.use(authMiddleware as any);

router.get('/contacts', authorize('contacts:manage') as any, controller.getContacts as any);
router.post('/contacts', authorize('contacts:manage') as any, controller.createContact as any);
router.get('/next-operation-id', authorize('transfers:execute') as any, controller.getNextOperationId as any);
router.post('/', authorize('transfers:execute') as any, controller.transfer as any);

export default router;
