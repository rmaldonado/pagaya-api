import { Response, NextFunction } from 'express';
import { MovementRepository } from '../repositories/MovementRepository.js';
import { GetMovementsUseCase, CreateMovementUseCase } from '../use-cases/MovementUseCases.js';
import { AuthenticatedRequest } from '../../../shared/middlewares/auth.middleware.js';

export class MovementController {
  private getMovementsUseCase: GetMovementsUseCase;
  private createMovementUseCase: CreateMovementUseCase;

  constructor() {
    const movementRepository = new MovementRepository();
    this.getMovementsUseCase = new GetMovementsUseCase(movementRepository);
    this.createMovementUseCase = new CreateMovementUseCase(movementRepository);
  }

  getMovements = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

      const movements = await this.getMovementsUseCase.execute(userId, { limit, offset });

      res.status(200).json({
        success: true,
        data: movements,
      });
    } catch (error) {
      next(error);
    }
  };

  createMovement = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { productId, concept, type, amount, currency, category } = req.body;

      const movement = await this.createMovementUseCase.execute(userId, {
        productId,
        concept,
        type,
        amount: parseFloat(amount),
        currency,
        category,
      });

      res.status(201).json({
        success: true,
        message: 'Movimiento registrado correctamente',
        data: movement,
      });
    } catch (error) {
      next(error);
    }
  };
}
