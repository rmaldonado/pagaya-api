export interface TransferDto {
  fromProductId: string;
  contactId?: string;
  destinationPhone?: string;
  amount: number;
  concept?: string;
}

export interface TransferResultDto {
  success: boolean;
  message: string;
  operationId?: string;
  movementId?: string;
  amount?: number;
  currency?: string;
  remainingBalance?: number;
}

export interface CreateContactDto {
  name: string;
  phone: string;
}
