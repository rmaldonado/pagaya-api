export type MovementType = 'EXPENSE' | 'INCOME';

export interface Movement {
  id: string;
  userId?: string;
  productId?: string;
  concept: string;
  type: MovementType;
  amount: number;
  currency: string;
  category: string;
  createdAt: string;
}
