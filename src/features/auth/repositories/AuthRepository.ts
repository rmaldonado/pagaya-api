import { pool } from '../../../shared/config/db.js';
import { LoginDto, LoginResultDto } from '../dtos/AuthDto.js';
import { User } from '../domain/entities/User.js';

export interface IAuthRepository {
  loginWithProcedure(dto: LoginDto): Promise<LoginResultDto>;
  logoutWithProcedure(token: string): Promise<boolean>;
  findUserById(userId: string): Promise<User | null>;
}

export class AuthRepository implements IAuthRepository {
  /**
   * Invoca el procedimiento almacenado fn_login (Bcrypt + Bloqueo + Auditoría OWASP)
   */
  async loginWithProcedure(dto: LoginDto): Promise<LoginResultDto> {
    const query = `
      SELECT success, message, user_id, user_name, email, session_token 
      FROM fn_login($1, $2, $3, $4);
    `;
    const result = await pool.query(query, [
      dto.email,
      dto.password,
      dto.ip || null,
      dto.userAgent || null,
    ]);

    const row = result.rows[0];
    return {
      success: row.success,
      message: row.message,
      userId: row.user_id,
      userName: row.user_name,
      email: row.email,
      sessionToken: row.session_token,
    };
  }

  /**
   * Invoca el procedimiento almacenado fn_logout
   */
  async logoutWithProcedure(token: string): Promise<boolean> {
    const query = `SELECT fn_logout($1) AS logged_out;`;
    const result = await pool.query(query, [token]);
    return result.rows[0]?.logged_out ?? false;
  }

  /**
   * Obtiene el perfil del usuario autenticado
   */
  async findUserById(userId: string): Promise<User | null> {
    const query = `
      SELECT 
        id, 
        name, 
        email, 
        is_active AS "isActive", 
        is_email_verified AS "isEmailVerified", 
        last_login_at AS "lastLoginAt", 
        created_at AS "createdAt"
      FROM users
      WHERE id = $1;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  }
}
