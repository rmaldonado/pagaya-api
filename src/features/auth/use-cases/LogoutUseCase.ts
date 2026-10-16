import { IAuthRepository } from '../repositories/AuthRepository.js';
import { BadRequestError } from '../../../shared/errors/AppError.js';

export class LogoutUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(token: string): Promise<boolean> {
    if (!token) {
      throw new BadRequestError('El token es requerido para cerrar la sesión.');
    }
    return this.authRepository.logoutWithProcedure(token);
  }
}
