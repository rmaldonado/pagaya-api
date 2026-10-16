import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/db.js';
import { UnauthorizedError } from '../errors/AppError.js';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Token de autorización no proporcionado o formato inválido.');
    }

    const token = authHeader.split(' ')[1];

    const query = `
      SELECT s.token, u.id, u.name, u.email, s.expires_at
      FROM user_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = $1 
        AND s.expires_at > CURRENT_TIMESTAMP 
        AND s.revoked_at IS NULL
        AND u.is_active = TRUE
      LIMIT 1;
    `;
    const result = await pool.query(query, [token]);

    if (result.rows.length === 0) {
      throw new UnauthorizedError('Sesión inválida, revocada o expirada.');
    }

    req.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
    };

    next();
  } catch (error) {
    next(error);
  }
}
