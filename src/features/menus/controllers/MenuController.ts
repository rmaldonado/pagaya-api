import { Response, NextFunction } from 'express';
import { MenuRepository } from '../repositories/MenuRepository.js';
import { GetUserMenuUseCase } from '../use-cases/GetUserMenuUseCase.js';
import { AuthenticatedRequest } from '../../../shared/middlewares/auth.middleware.js';

export class MenuController {
  private getUserMenuUseCase: GetUserMenuUseCase;

  constructor() {
    const menuRepository = new MenuRepository();
    this.getUserMenuUseCase = new GetUserMenuUseCase(menuRepository);
  }

  getMenu = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const menuTree = await this.getUserMenuUseCase.execute(userId);

      res.status(200).json({
        success: true,
        data: menuTree,
      });
    } catch (error) {
      next(error);
    }
  };
}
