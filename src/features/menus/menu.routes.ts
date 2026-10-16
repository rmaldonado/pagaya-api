import { Router } from 'express';
import { MenuController } from './controllers/MenuController.js';
import { authMiddleware } from '../../shared/middlewares/auth.middleware.js';

const router = Router();
const controller = new MenuController();

router.use(authMiddleware as any);
router.get('/', controller.getMenu as any);

export default router;
