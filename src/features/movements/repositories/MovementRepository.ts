import { pool } from '../../../shared/config/db.js';
import { Movement } from '../domain/entities/Movement.js';
import { CreateMovementDto, GetMovementsQueryDto } from '../dtos/CreateMovementDto.js';

export interface IMovementRepository {
  findByUserId(userId: string, queryDto: GetMovementsQueryDto): Promise<Movement[]>;
  createWithProcedure(userId: string, dto: CreateMovementDto): Promise<Movement>;
}

export class MovementRepository implements IMovementRepository {
  async findByUserId(userId: string, queryDto: GetMovementsQueryDto): Promise<Movement[]> {
    const limit = queryDto.limit || 50;
    const offset = queryDto.offset || 0;

    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        product_id AS "productId", 
        concept, 
        type, 
        amount::FLOAT AS "amount", 
        currency, 
        category, 
        created_at AS "createdAt"
      FROM movements
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows;
  }

  /**
   * Invoca el procedimiento almacenado fn_create_movement
   * Realiza la inserción del movimiento y la actualización atómica del saldo con bloqueo de fila
   */
  async createWithProcedure(userId: string, dto: CreateMovementDto): Promise<Movement> {
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        product_id AS "productId", 
        concept, 
        type, 
        amount::FLOAT AS "amount", 
        currency, 
        category, 
        created_at AS "createdAt",
        new_balance::FLOAT AS "newBalance"
      FROM fn_create_movement($1, $2, $3, $4, $5, $6, $7);
    `;
    const result = await pool.query(query, [
      userId,
      dto.productId || null,
      dto.concept,
      dto.type,
      dto.amount,
      dto.currency || 'PEN',
      dto.category,
    ]);

    return result.rows[0];
  }
}
