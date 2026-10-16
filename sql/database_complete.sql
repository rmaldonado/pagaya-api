-- ============================================================================
-- BASE DE DATOS: PAGAYA_DB
-- ARQUITECTURA: RBAC + OWASP ASVS + BILLETERA DIGITAL + MENÚS DINÁMICOS
-- MOTOR: PostgreSQL 14+
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EXTENSIONES Y ENUMS
-- ----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE product_type AS ENUM ('WALLET', 'SAVINGS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE movement_type AS ENUM ('EXPENSE', 'INCOME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ----------------------------------------------------------------------------
-- 2. TABLAS DE AUTENTICACIÓN Y RBAC
-- ----------------------------------------------------------------------------

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    last_login_at TIMESTAMPTZ DEFAULT NULL,
    password_changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description VARCHAR(255),
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Permisos (Granularidad recurso:acción)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Relación N:M: Rol - Permisos
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- Relación N:M: Usuario - Roles
CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- ----------------------------------------------------------------------------
-- 3. SEGURIDAD, SESIONES Y AUDITORÍA (OWASP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    email_attempted VARCHAR(255),
    event_type VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 4. MENÚS DINÁMICOS Y JERÁRQUICOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menus (
    id SERIAL PRIMARY KEY,
    parent_id INT REFERENCES menus(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    route VARCHAR(150),
    icon VARCHAR(50),
    order_index INT NOT NULL DEFAULT 0,
    permission_id INT REFERENCES permissions(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- 5. MÓDULO FINANCIERO / BILLETERA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    type product_type NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PEN',
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movements (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
    concept VARCHAR(255) NOT NULL,
    type movement_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PEN',
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE SEQUENCE IF NOT EXISTS operation_id_seq START WITH 1001;

-- ----------------------------------------------------------------------------
-- 6. ÍNDICES DE RENDIMIENTO
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_audit_created ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menus_parent ON menus(parent_id);
CREATE INDEX IF NOT EXISTS idx_menus_permission ON menus(permission_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_user ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_created ON movements(created_at DESC);

-- ----------------------------------------------------------------------------
-- 7. VISTAS Y PROCEDIMIENTOS ALMACENADOS / FUNCIONES
-- ----------------------------------------------------------------------------

-- Vista para verificación de permisos RBAC
CREATE OR REPLACE VIEW v_user_permissions AS
SELECT DISTINCT
    u.id AS user_id,
    u.email,
    r.name AS role_name,
    p.code AS permission_code
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.is_active = TRUE;

-- Procedimiento Almacenado 1: fn_login
CREATE OR REPLACE FUNCTION fn_login(
    p_email VARCHAR,
    p_password VARCHAR,
    p_ip VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message VARCHAR,
    user_id VARCHAR,
    user_name VARCHAR,
    email VARCHAR,
    session_token TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_new_token TEXT;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT u.id, u.name, u.email, u.password_hash, u.is_active, u.failed_attempts, u.locked_until
    INTO v_user
    FROM users u
    WHERE LOWER(u.email) = LOWER(p_email);

    IF NOT FOUND THEN
        INSERT INTO security_audit_log (email_attempted, event_type, ip_address, user_agent, metadata)
        VALUES (p_email, 'LOGIN_FAILURE', p_ip, p_user_agent, '{"reason": "USER_NOT_FOUND"}');

        RETURN QUERY SELECT FALSE, 'Credenciales inválidas'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
        RETURN;
    END IF;

    IF NOT v_user.is_active THEN
        INSERT INTO security_audit_log (user_id, email_attempted, event_type, ip_address, user_agent, metadata)
        VALUES (v_user.id, p_email, 'LOGIN_FAILURE', p_ip, p_user_agent, '{"reason": "ACCOUNT_DISABLED"}');

        RETURN QUERY SELECT FALSE, 'La cuenta se encuentra desactivada'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
        RETURN;
    END IF;

    IF v_user.locked_until IS NOT NULL AND v_user.locked_until > CURRENT_TIMESTAMP THEN
        INSERT INTO security_audit_log (user_id, email_attempted, event_type, ip_address, user_agent, metadata)
        VALUES (v_user.id, p_email, 'LOGIN_LOCKED', p_ip, p_user_agent, '{"reason": "MAX_ATTEMPTS_EXCEEDED"}');

        RETURN QUERY SELECT FALSE, 'Cuenta temporalmente bloqueada por seguridad'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
        RETURN;
    END IF;

    IF v_user.password_hash = crypt(p_password, v_user.password_hash) THEN
        UPDATE users 
        SET failed_attempts = 0,
            locked_until = NULL,
            last_login_at = CURRENT_TIMESTAMP
        WHERE id = v_user.id;

        v_new_token := encode(gen_random_bytes(32), 'hex');
        v_expires_at := CURRENT_TIMESTAMP + INTERVAL '24 hours';

        INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (v_user.id, v_new_token, p_ip, p_user_agent, v_expires_at);

        INSERT INTO security_audit_log (user_id, email_attempted, event_type, ip_address, user_agent)
        VALUES (v_user.id, p_email, 'LOGIN_SUCCESS', p_ip, p_user_agent);

        RETURN QUERY SELECT 
            TRUE, 
            'Inicio de sesión exitoso'::VARCHAR, 
            v_user.id, 
            v_user.name, 
            v_user.email, 
            v_new_token;
    ELSE
        IF v_user.failed_attempts + 1 >= 5 THEN
            UPDATE users 
            SET failed_attempts = v_user.failed_attempts + 1,
                locked_until = CURRENT_TIMESTAMP + INTERVAL '15 minutes'
            WHERE id = v_user.id;
        ELSE
            UPDATE users 
            SET failed_attempts = v_user.failed_attempts + 1
            WHERE id = v_user.id;
        END IF;

        INSERT INTO security_audit_log (user_id, email_attempted, event_type, ip_address, user_agent, metadata)
        VALUES (v_user.id, p_email, 'LOGIN_FAILURE', p_ip, p_user_agent, jsonb_build_object('attempts', v_user.failed_attempts + 1));

        RETURN QUERY SELECT FALSE, 'Credenciales inválidas'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Procedimiento Almacenado 2: fn_logout
CREATE OR REPLACE FUNCTION fn_logout(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE user_sessions 
    SET revoked_at = CURRENT_TIMESTAMP 
    WHERE token = p_token AND revoked_at IS NULL;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Procedimiento Almacenado 3: fn_get_user_menu
CREATE OR REPLACE FUNCTION fn_get_user_menu(p_user_id VARCHAR(50))
RETURNS TABLE (
    id INT,
    parent_id INT,
    title VARCHAR,
    route VARCHAR,
    icon VARCHAR,
    order_index INT
) AS $$
BEGIN
    RETURN QUERY
    WITH user_perms AS (
        SELECT rp.permission_id
        FROM user_roles ur
        JOIN role_permissions rp ON ur.role_id = rp.role_id
        WHERE ur.user_id = p_user_id
    )
    SELECT DISTINCT 
        m.id,
        m.parent_id,
        m.title,
        m.route,
        m.icon,
        m.order_index
    FROM menus m
    LEFT JOIN user_perms up ON m.permission_id = up.permission_id
    WHERE m.is_active = TRUE
      AND (m.permission_id IS NULL OR up.permission_id IS NOT NULL)
    ORDER BY m.order_index ASC;
END;
$$ LANGUAGE plpgsql;

-- Procedimiento Almacenado 4: fn_create_movement (Inserta y actualiza saldo atómicamente)
CREATE OR REPLACE FUNCTION fn_create_movement(
    p_user_id VARCHAR(50),
    p_product_id VARCHAR(50),
    p_concept VARCHAR(255),
    p_type movement_type,
    p_amount NUMERIC(12, 2),
    p_currency VARCHAR(3),
    p_category VARCHAR(50)
)
RETURNS TABLE (
    id VARCHAR,
    user_id VARCHAR,
    product_id VARCHAR,
    concept VARCHAR,
    type movement_type,
    amount NUMERIC(12, 2),
    currency VARCHAR(3),
    category VARCHAR,
    created_at TIMESTAMPTZ,
    new_balance NUMERIC(12, 2)
) AS $$
DECLARE
    v_mov_id VARCHAR(50);
    v_new_balance NUMERIC(12, 2) := NULL;
    v_delta NUMERIC(12, 2);
BEGIN
    v_mov_id := 'mov-' || (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT;

    -- Si tiene producto, validar y actualizar saldo con bloqueo de fila
    IF p_product_id IS NOT NULL THEN
        IF p_type = 'INCOME' THEN
            v_delta := p_amount;
        ELSE
            v_delta := -p_amount;
        END IF;

        UPDATE products
        SET available_balance = available_balance + v_delta
        WHERE products.id = p_product_id AND products.user_id = p_user_id
        RETURNING available_balance INTO v_new_balance;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto no encontrado para este usuario';
        END IF;
    END IF;

    -- Insertar movimiento
    INSERT INTO movements (id, user_id, product_id, concept, type, amount, currency, category, created_at)
    VALUES (v_mov_id, p_user_id, p_product_id, p_concept, p_type, p_amount, COALESCE(p_currency, 'PEN'), p_category, CURRENT_TIMESTAMP);

    RETURN QUERY
    SELECT 
        m.id,
        m.user_id,
        m.product_id,
        m.concept,
        m.type,
        m.amount,
        m.currency,
        m.category,
        m.created_at,
        v_new_balance
    FROM movements m
    WHERE m.id = v_mov_id;
END;
$$ LANGUAGE plpgsql;

-- Procedimiento Almacenado 5: fn_execute_transfer (Transferencia atómica con bloqueo y correlativo)
CREATE OR REPLACE FUNCTION fn_execute_transfer(
    p_user_id VARCHAR(50),
    p_from_product_id VARCHAR(50),
    p_amount NUMERIC(12, 2),
    p_concept VARCHAR(255) DEFAULT NULL,
    p_contact_id VARCHAR(50) DEFAULT NULL,
    p_destination_phone VARCHAR(30) DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message VARCHAR,
    operation_id BIGINT,
    movement_id VARCHAR,
    amount NUMERIC(12, 2),
    currency VARCHAR(3),
    remaining_balance NUMERIC(12, 2)
) AS $$
DECLARE
    v_current_balance NUMERIC(12, 2);
    v_currency VARCHAR(3);
    v_op_id BIGINT;
    v_mov_id VARCHAR(50);
    v_concept_final VARCHAR(255);
BEGIN
    -- Validar monto
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT FALSE, 'El monto a transferir debe ser mayor a 0'::VARCHAR, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Bloquear producto origen y verificar saldo
    SELECT available_balance, products.currency
    INTO v_current_balance, v_currency
    FROM products
    WHERE products.id = p_from_product_id AND products.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Producto de origen no encontrado'::VARCHAR, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, 'Saldo insuficiente para realizar la operación'::VARCHAR, NULL::BIGINT, NULL::VARCHAR, NULL::NUMERIC, NULL::VARCHAR, NULL::NUMERIC;
        RETURN;
    END IF;

    -- Obtener siguiente ID de operación
    v_op_id := nextval('operation_id_seq');
    v_mov_id := 'mov-' || (EXTRACT(EPOCH FROM CURRENT_TIMESTAMP) * 1000)::BIGINT;
    v_concept_final := COALESCE(p_concept, 'Transferencia Op. #' || v_op_id);

    -- Descontar saldo
    UPDATE products
    SET available_balance = available_balance - p_amount
    WHERE products.id = p_from_product_id AND products.user_id = p_user_id;

    -- Registrar movimiento
    INSERT INTO movements (id, user_id, product_id, concept, type, amount, currency, category, created_at)
    VALUES (v_mov_id, p_user_id, p_from_product_id, v_concept_final, 'EXPENSE', p_amount, v_currency, 'Transferencia', CURRENT_TIMESTAMP);

    -- Registrar auditoría de transacción
    INSERT INTO security_audit_log (user_id, event_type, metadata)
    VALUES (p_user_id, 'TRANSFER_SUCCESS', jsonb_build_object(
        'operation_id', v_op_id,
        'from_product', p_from_product_id,
        'amount', p_amount,
        'destination_phone', p_destination_phone,
        'contact_id', p_contact_id
    ));

    RETURN QUERY SELECT 
        TRUE, 
        'Transferencia realizada exitosamente'::VARCHAR, 
        v_op_id, 
        v_mov_id, 
        p_amount, 
        v_currency, 
        (v_current_balance - p_amount);
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 8. DATOS INICIALES (SEEDS)
-- ----------------------------------------------------------------------------
INSERT INTO roles (id, name, description, is_system) VALUES
(1, 'ADMIN', 'Administrador con acceso total a la plataforma', TRUE),
(2, 'CUSTOMER', 'Usuario cliente de la billetera digital PagaYa', TRUE),
(3, 'SUPPORT', 'Agente de atención y soporte', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO permissions (id, code, module, description) VALUES
(1, 'products:read', 'PRODUCTS', 'Ver productos y saldos'),
(2, 'movements:read', 'MOVEMENTS', 'Consultar movimientos'),
(3, 'movements:create', 'MOVEMENTS', 'Registrar movimientos'),
(4, 'transfers:execute', 'TRANSFERS', 'Realizar transferencias'),
(5, 'contacts:manage', 'CONTACTS', 'Administrar contactos frecuentes'),
(6, 'users:manage', 'USERS', 'Gestionar usuarios y roles'),
(7, 'audit:read', 'AUDIT', 'Consultar logs de auditoría')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
(2, 1), (2, 2), (2, 3), (2, 4), (2, 5)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
(3, 1), (3, 2), (3, 7)
ON CONFLICT DO NOTHING;

INSERT INTO menus (id, parent_id, title, route, icon, order_index, permission_id) VALUES
(1, NULL, 'Billetera', '/wallet', 'wallet-outline', 10, 1),
(2, NULL, 'Movimientos', '/movements', 'receipt-outline', 20, 2),
(3, NULL, 'Transferencias', '/transfers', 'swap-horizontal', 30, 4),
(4, NULL, 'Administración', '/admin', 'shield-checkmark-outline', 40, 6),
(5, NULL, 'Mi Perfil', '/profile', 'person-outline', 50, NULL),
(6, 3, 'Nueva Transferencia', '/transfers/new', 'send-outline', 1, 4),
(7, 3, 'Mis Contactos', '/transfers/contacts', 'people-outline', 2, 5),
(8, 4, 'Usuarios y Roles', '/admin/users', 'people-circle-outline', 1, 6),
(9, 4, 'Auditoría', '/admin/audit', 'document-text-outline', 2, 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, name, email, password_hash, is_active, is_email_verified) VALUES
('usr-01', 'Ana Demo', 'demo@pagaya.pe', crypt('Demo123*', gen_salt('bf', 10)), TRUE, TRUE),
('usr-admin', 'Administrador PagaYa', 'admin@pagaya.pe', crypt('Admin123*', gen_salt('bf', 10)), TRUE, TRUE)
ON CONFLICT (id) DO UPDATE 
SET password_hash = EXCLUDED.password_hash;

INSERT INTO user_roles (user_id, role_id) VALUES
('usr-01', 2),
('usr-admin', 1)
ON CONFLICT DO NOTHING;

INSERT INTO products (id, user_id, alias, type, currency, available_balance) VALUES
('prd-01', 'usr-01', 'Billetera Principal', 'WALLET', 'PEN', 1250.50),
('prd-02', 'usr-01', 'Cuenta de Ahorro', 'SAVINGS', 'PEN', 3400.00)
ON CONFLICT (id) DO NOTHING;

INSERT INTO contacts (id, user_id, name, phone) VALUES
('ct-01', 'usr-01', 'Carlos Mendoza', '*** *** 123'),
('ct-02', 'usr-01', 'Lucía Torres', '*** *** 456'),
('ct-03', 'usr-01', 'Diego Ramírez', '*** *** 789'),
('ct-04', 'usr-01', 'Sofía Vásquez', '*** *** 012'),
('ct-05', 'usr-01', 'Andrés Rojas', '*** *** 345')
ON CONFLICT (id) DO NOTHING;

INSERT INTO movements (id, user_id, product_id, concept, type, amount, currency, category, created_at) VALUES
('mov-01', 'usr-01', 'prd-01', 'Almuerzo', 'EXPENSE', 40.00, 'PEN', 'Comida', '2026-09-04T14:10:00Z'),
('mov-02', 'usr-01', 'prd-01', 'Sueldo septiembre', 'INCOME', 2500.00, 'PEN', 'Ingreso', '2026-09-03T09:00:00Z'),
('mov-03', 'usr-01', 'prd-01', 'Transferencia recibida', 'INCOME', 120.00, 'PEN', 'Transferencia', '2026-09-02T18:30:00Z'),
('mov-04', 'usr-01', 'prd-01', 'Pago de luz', 'EXPENSE', 85.50, 'PEN', 'Servicios', '2026-09-01T10:15:00Z'),
('mov-05', 'usr-01', 'prd-01', 'Café con amigos', 'EXPENSE', 25.00, 'PEN', 'Comida', '2026-08-31T16:00:00Z'),
('mov-06', 'usr-01', 'prd-01', 'Recarga de celular', 'EXPENSE', 30.00, 'PEN', 'Servicios', '2026-08-30T11:20:00Z'),
('mov-07', 'usr-01', 'prd-01', 'Venta de libro', 'INCOME', 60.00, 'PEN', 'Ingreso', '2026-08-29T19:45:00Z'),
('mov-08', 'usr-01', 'prd-01', 'Supermercado', 'EXPENSE', 150.75, 'PEN', 'Compras', '2026-08-28T17:30:00Z'),
('mov-09', 'usr-01', 'prd-01', 'Transferencia a Carlos', 'EXPENSE', 200.00, 'PEN', 'Transferencia', '2026-08-27T13:00:00Z'),
('mov-10', 'usr-01', 'prd-01', 'Reembolso trabajo', 'INCOME', 350.00, 'PEN', 'Ingreso', '2026-08-26T09:30:00Z')
ON CONFLICT (id) DO NOTHING;

SELECT setval('roles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM roles));
SELECT setval('permissions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM permissions));
SELECT setval('menus_id_seq', (SELECT COALESCE(MAX(id), 1) FROM menus));
