import { IAuthRepository } from '../repositories/AuthRepository.js';
import { LoginDto } from '../dtos/AuthDto.js';
import { BadRequestError, UnauthorizedError } from '../../../shared/errors/AppError.js';
import { UserSessionData } from '../domain/entities/User.js';

export class LoginUseCase {
  constructor(private readonly authRepository: IAuthRepository) {}

  async execute(dto: LoginDto): Promise<UserSessionData> {
    if (!dto.email || !dto.password) {
      throw new BadRequestError('El email y la contraseña son requeridos.');
    }

    const result = await this.authRepository.loginWithProcedure(dto);

    if (!result.success || !result.userId || !result.sessionToken) {
      throw new UnauthorizedError(result.message || 'Credenciales inválidas.');
    }

    return {
      user: {
        id: result.userId,
        name: result.userName!,
        email: result.email!,
      },
      token: result.sessionToken,
    };
  }
}
