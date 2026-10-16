import { Response, NextFunction } from 'express';
import { pool } from '../config/db.js';
import { AuthenticatedRequest } from './auth.middleware.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

export function authorize(requiredPermission: string) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Usuario no autenticado.');
      }

      // Verificación contra la vista optimizada de permisos RBAC
      const checkQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM v_user_permissions 
          WHERE user_id = $1 AND permission_code = $2
        ) AS has_permission;
      `;
      const result = await pool.query(checkQuery, [user.id, requiredPermission]);

      const isAllowed = result.rows[0]?.has_permission;

      if (!isAllowed) {
        // Registro en auditoría de seguridad de intento no autorizado (OWASP A01/A09)
        await pool.query(
          `INSERT INTO security_audit_log (user_id, event_type, metadata)
           VALUES ($1, 'ACCESS_DENIED', $2)`,
          [user.id, JSON.stringify({ requiredPermission, path: req.originalUrl, method: req.method })]
        );

        throw new ForbiddenError(`Acceso denegado: requiere el permiso '${requiredPermission}'.`);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
