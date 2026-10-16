export type MovementType = 'EXPENSE' | 'INCOME';

export interface Movement {
  id: string;
  userId?: string;
  productId?: string | null;
  concept: string;
  type: MovementType;
  amount: number;
  currency: string;
  category: string;
  createdAt: string;
  newBalance?: number | null;
}
