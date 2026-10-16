export type ProductType = 'WALLET' | 'SAVINGS';

export interface Product {
  id: string;
  userId?: string;
  alias: string;
  type: ProductType;
  currency: string;
  availableBalance: number;
  createdAt?: string;
}
