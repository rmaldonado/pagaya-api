import { Response, NextFunction } from 'express';
import { TransferRepository } from '../repositories/TransferRepository.js';
import {
  ExecuteTransferUseCase,
  GetContactsUseCase,
  CreateContactUseCase,
  GetNextOperationIdUseCase,
} from '../use-cases/TransferUseCases.js';
import { AuthenticatedRequest } from '../../../shared/middlewares/auth.middleware.js';

export class TransferController {
  private executeTransferUseCase: ExecuteTransferUseCase;
  private getContactsUseCase: GetContactsUseCase;
  private createContactUseCase: CreateContactUseCase;
  private getNextOperationIdUseCase: GetNextOperationIdUseCase;

  constructor() {
    const transferRepository = new TransferRepository();
    this.executeTransferUseCase = new ExecuteTransferUseCase(transferRepository);
    this.getContactsUseCase = new GetContactsUseCase(transferRepository);
    this.createContactUseCase = new CreateContactUseCase(transferRepository);
    this.getNextOperationIdUseCase = new GetNextOperationIdUseCase(transferRepository);
  }

  getContacts = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const contacts = await this.getContactsUseCase.execute(userId);

      res.status(200).json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      next(error);
    }
  };

  createContact = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { name, phone } = req.body;

      const contact = await this.createContactUseCase.execute(userId, { name, phone });

      res.status(201).json({
        success: true,
        message: 'Contacto registrado correctamente.',
        data: contact,
      });
    } catch (error) {
      next(error);
    }
  };

  getNextOperationId = async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const nextOp = await this.getNextOperationIdUseCase.execute();

      res.status(200).json({
        success: true,
        data: {
          nextOperationId: nextOp,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  transfer = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { fromProductId, contactId, destinationPhone, amount, concept } = req.body;

      const result = await this.executeTransferUseCase.execute(userId, {
        fromProductId,
        contactId,
        destinationPhone,
        amount: parseFloat(amount),
        concept,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };
}
