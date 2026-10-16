import { ITransferRepository } from '../repositories/TransferRepository.js';
import { TransferDto, TransferResultDto, CreateContactDto } from '../dtos/TransferDto.js';
import { Contact } from '../domain/entities/Contact.js';
import { BadRequestError } from '../../../shared/errors/AppError.js';

export class ExecuteTransferUseCase {
  constructor(private readonly transferRepository: ITransferRepository) {}

  async execute(userId: string, dto: TransferDto): Promise<TransferResultDto> {
    if (!dto.fromProductId || dto.amount === undefined || (!dto.contactId && !dto.destinationPhone)) {
      throw new BadRequestError('Producto origen, monto y destino (contacto o teléfono) son requeridos.');
    }

    if (dto.amount <= 0) {
      throw new BadRequestError('El monto a transferir debe ser mayor a 0.');
    }

    const result = await this.transferRepository.executeTransferWithProcedure(userId, dto);

    if (!result.success) {
      throw new BadRequestError(result.message || 'Error al procesar la transferencia.');
    }

    return result;
  }
}

export class GetContactsUseCase {
  constructor(private readonly transferRepository: ITransferRepository) {}

  async execute(userId: string): Promise<Contact[]> {
    return this.transferRepository.findContactsByUserId(userId);
  }
}

export class CreateContactUseCase {
  constructor(private readonly transferRepository: ITransferRepository) {}

  async execute(userId: string, dto: CreateContactDto): Promise<Contact> {
    if (!dto.name || !dto.phone) {
      throw new BadRequestError('Nombre y teléfono son obligatorios.');
    }
    return this.transferRepository.createContact(userId, dto);
  }
}

export class GetNextOperationIdUseCase {
  constructor(private readonly transferRepository: ITransferRepository) {}

  async execute(): Promise<number> {
    return this.transferRepository.getNextOperationId();
  }
}
