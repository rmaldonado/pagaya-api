import { Router } from 'express';
import { ProductController } from './controllers/ProductController.js';
import { authMiddleware } from '../../shared/middlewares/auth.middleware.js';
import { authorize } from '../../shared/middlewares/authorize.middleware.js';

const router = Router();
const controller = new ProductController();

router.use(authMiddleware as any);
router.use(authorize('products:read') as any);

router.get('/', controller.getProducts as any);
router.get('/:id', controller.getProductById as any);

export default router;
