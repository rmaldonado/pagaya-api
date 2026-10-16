import { Router } from 'express';
import authRoutes from './features/auth/auth.routes.js';
import menuRoutes from './features/menus/menu.routes.js';
import productsRoutes from './features/products/products.routes.js';
import movementsRoutes from './features/movements/movements.routes.js';
import transfersRoutes from './features/transfers/transfers.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/menus', menuRoutes);
router.use('/products', productsRoutes);
router.use('/movements', movementsRoutes);
router.use('/transfers', transfersRoutes);

export default router;
