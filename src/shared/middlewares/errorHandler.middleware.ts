import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Manejo de errores de dominio (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Errores no controlados
  console.error('💥 Unhandled Exception:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Error interno del servidor.',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
