import { IProductRepository } from '../repositories/ProductRepository.js';
import { Product } from '../domain/entities/Product.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';

export class GetProductsUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(userId: string): Promise<Product[]> {
    return this.productRepository.findByUserId(userId);
  }
}

export class GetProductByIdUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(productId: string, userId: string): Promise<Product> {
    const product = await this.productRepository.findByIdAndUserId(productId, userId);
    if (!product) {
      throw new NotFoundError('Producto no encontrado.');
    }
    return product;
  }
}
