import { MovementType } from '../domain/entities/Movement.js';

export interface CreateMovementDto {
  productId?: string;
  concept: string;
  type: MovementType;
  amount: number;
  currency?: string;
  category: string;
}

export interface GetMovementsQueryDto {
  limit?: number;
  offset?: number;
}
