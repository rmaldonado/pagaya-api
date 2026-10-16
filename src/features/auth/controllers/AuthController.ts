import { Request, Response, NextFunction } from 'express';
import { AuthRepository } from '../repositories/AuthRepository.js';
import { LoginUseCase } from '../use-cases/LoginUseCase.js';
import { LogoutUseCase } from '../use-cases/LogoutUseCase.js';
import { GetProfileUseCase } from '../use-cases/GetProfileUseCase.js';
import { AuthenticatedRequest } from '../../../shared/middlewares/auth.middleware.js';

export class AuthController {
  private loginUseCase: LoginUseCase;
  private logoutUseCase: LogoutUseCase;
  private getProfileUseCase: GetProfileUseCase;

  constructor() {
    const authRepository = new AuthRepository();
    this.loginUseCase = new LoginUseCase(authRepository);
    this.logoutUseCase = new LogoutUseCase(authRepository);
    this.getProfileUseCase = new GetProfileUseCase(authRepository);
  }

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body;
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const sessionData = await this.loginUseCase.execute({
        email,
        password,
        ip,
        userAgent,
      });

      res.status(200).json({
        success: true,
        message: 'Inicio de sesión exitoso',
        data: sessionData,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : req.body.token;

      const loggedOut = await this.logoutUseCase.execute(token);

      res.status(200).json({
        success: loggedOut,
        message: loggedOut ? 'Sesión revocada exitosamente' : 'Sesión ya inactiva',
      });
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user!.id;
      const profile = await this.getProfileUseCase.execute(userId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  };
}
