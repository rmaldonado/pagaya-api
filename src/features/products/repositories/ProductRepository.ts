import { pool } from '../../../shared/config/db.js';
import { Product } from '../domain/entities/Product.js';

export interface IProductRepository {
  findByUserId(userId: string): Promise<Product[]>;
  findByIdAndUserId(productId: string, userId: string): Promise<Product | null>;
}

export class ProductRepository implements IProductRepository {
  async findByUserId(userId: string): Promise<Product[]> {
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        alias, 
        type, 
        currency, 
        available_balance::FLOAT AS "availableBalance", 
        created_at AS "createdAt"
      FROM products
      WHERE user_id = $1
      ORDER BY id ASC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async findByIdAndUserId(productId: string, userId: string): Promise<Product | null> {
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        alias, 
        type, 
        currency, 
        available_balance::FLOAT AS "availableBalance", 
        created_at AS "createdAt"
      FROM products
      WHERE id = $1 AND user_id = $2;
    `;
    const result = await pool.query(query, [productId, userId]);
    return result.rows[0] || null;
  }
}
