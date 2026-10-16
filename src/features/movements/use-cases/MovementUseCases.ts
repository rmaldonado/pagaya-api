import { IMovementRepository } from '../repositories/MovementRepository.js';
import { Movement } from '../domain/entities/Movement.js';
import { CreateMovementDto, GetMovementsQueryDto } from '../dtos/CreateMovementDto.js';
import { BadRequestError } from '../../../shared/errors/AppError.js';

export class GetMovementsUseCase {
  constructor(private readonly movementRepository: IMovementRepository) {}

  async execute(userId: string, query: GetMovementsQueryDto): Promise<Movement[]> {
    return this.movementRepository.findByUserId(userId, query);
  }
}

export class CreateMovementUseCase {
  constructor(private readonly movementRepository: IMovementRepository) {}

  async execute(userId: string, dto: CreateMovementDto): Promise<Movement> {
    if (!dto.concept || !dto.type || dto.amount === undefined || !dto.category) {
      throw new BadRequestError('Concepto, tipo, monto y categoría son obligatorios.');
    }

    if (dto.type !== 'INCOME' && dto.type !== 'EXPENSE') {
      throw new BadRequestError("El tipo de movimiento debe ser 'INCOME' o 'EXPENSE'.");
    }

    if (dto.amount <= 0) {
      throw new BadRequestError('El monto debe ser un número positivo.');
    }

    return this.movementRepository.createWithProcedure(userId, dto);
  }
}
