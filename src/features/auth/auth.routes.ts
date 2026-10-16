import { Router } from 'express';
import { AuthController } from './controllers/AuthController.js';
import { authMiddleware } from '../../shared/middlewares/auth.middleware.js';

const router = Router();
const controller = new AuthController();

router.post('/login', controller.login);
router.post('/logout', controller.logout);
router.get('/me', authMiddleware as any, controller.getMe as any);

export default router;
