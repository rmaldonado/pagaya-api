import { IAuthRepository } from '../repositories/AuthRepository.js';
import { NotFoundError } from '../../../shared/errors/AppError.js';
import { User } from '../domain/entities/User.js';

export class GetProfileUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(userId: string): Promise<User> {
    const user = await this.authRepository.findUserById(userId);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado.');
    }
    return user;
  }
}
