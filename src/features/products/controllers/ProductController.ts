import { Response, NextFunction } from 'express';
import { ProductRepository } from '../repositories/ProductRepository.js';
import { GetProductsUseCase, GetProductByIdUseCase } from '../use-cases/ProductUseCases.js';
import { AuthenticatedRequest } from '../../../shared/middlewares/auth.middleware.js';

export class ProductController {
  private getProductsUseCase: GetProductsUseCase;
  private getProductByIdUseCase: GetProductByIdUseCase;

  constructor() {
    const productRepository = new ProductRepository();
    this.getProductsUseCase = new GetProductsUseCase(productRepository);
    this.getProductByIdUseCase = new GetProductByIdUseCase(productRepository);
  }

  getProducts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const products = await this.getProductsUseCase.execute(userId);

      res.status(200).json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  };

  getProductById = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const id = req.params.id as string;

      const product = await this.getProductByIdUseCase.execute(id, userId);

      res.status(200).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  };
}
