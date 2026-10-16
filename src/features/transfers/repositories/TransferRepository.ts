import { pool } from '../../../shared/config/db.js';
import { Contact } from '../domain/entities/Contact.js';
import { TransferDto, TransferResultDto, CreateContactDto } from '../dtos/TransferDto.js';

export interface ITransferRepository {
  findContactsByUserId(userId: string): Promise<Contact[]>;
  createContact(userId: string, dto: CreateContactDto): Promise<Contact>;
  getNextOperationId(): Promise<number>;
  executeTransferWithProcedure(userId: string, dto: TransferDto): Promise<TransferResultDto>;
}

export class TransferRepository implements ITransferRepository {
  async findContactsByUserId(userId: string): Promise<Contact[]> {
    const query = `
      SELECT 
        id, 
        user_id AS "userId", 
        name, 
        phone, 
        created_at AS "createdAt"
      FROM contacts
      WHERE user_id = $1
      ORDER BY name ASC;
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  }

  async createContact(userId: string, dto: CreateContactDto): Promise<Contact> {
    const contactId = `ct-${Date.now()}`;
    const query = `
      INSERT INTO contacts (id, user_id, name, phone)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id AS "userId", name, phone, created_at AS "createdAt";
    `;
    const result = await pool.query(query, [contactId, userId, dto.name, dto.phone]);
    return result.rows[0];
  }

  async getNextOperationId(): Promise<number> {
    const query = `SELECT nextval('operation_id_seq') AS "nextOperationId";`;
    const result = await pool.query(query);
    return parseInt(result.rows[0].nextOperationId, 10);
  }

  /**
   * Invoca el procedimiento almacenado fn_execute_transfer
   * Realiza validación de saldo con bloqueo FOR UPDATE, descuento de saldo,
   * asignación de correlativo, inserción de movimiento y log de auditoría atómicamente.
   */
  async executeTransferWithProcedure(userId: string, dto: TransferDto): Promise<TransferResultDto> {
    const query = `
      SELECT 
        success, 
        message, 
        operation_id::TEXT AS "operationId", 
        movement_id AS "movementId", 
        amount::FLOAT AS "amount", 
        currency, 
        remaining_balance::FLOAT AS "remainingBalance"
      FROM fn_execute_transfer($1, $2, $3, $4, $5, $6);
    `;
    const result = await pool.query(query, [
      userId,
      dto.fromProductId,
      dto.amount,
      dto.concept || null,
      dto.contactId || null,
      dto.destinationPhone || null,
    ]);

    return result.rows[0];
  }
}
