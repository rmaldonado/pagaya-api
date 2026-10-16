import { pool } from '../../../shared/config/db.js';
import { MenuItem } from '../domain/entities/MenuItem.js';

export interface IMenuRepository {
  getUserAuthorizedMenus(userId: string): Promise<MenuItem[]>;
}

export class MenuRepository implements IMenuRepository {
  /**
   * Invoca la función almacenada fn_get_user_menu que filtra ítems por permisos RBAC del usuario
   */
  async getUserAuthorizedMenus(userId: string): Promise<MenuItem[]> {
    const query = `
      SELECT 
        id, 
        parent_id AS "parentId", 
        title, 
        route, 
        icon, 
        order_index AS "orderIndex"
      FROM fn_get_user_menu($1);
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
}
