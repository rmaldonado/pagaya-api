-- ========================================================
-- Base de Datos: pagaya_db
-- ========================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
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

-- 1. Tabla: users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    failed_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    last_login_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla: products
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    alias VARCHAR(100) NOT NULL,
    type product_type NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PEN',
    available_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla: contacts
CREATE TABLE IF NOT EXISTS contacts (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabla: movements
CREATE TABLE IF NOT EXISTS movements (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    product_id VARCHAR(50) REFERENCES products(id) ON DELETE SET NULL,
    concept VARCHAR(255) NOT NULL,
    type movement_type NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'PEN',
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

-- 5. Tabla: user_sessions (tokens de sesión)
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabla: login_history (auditoría de accesos)
CREATE TABLE IF NOT EXISTS login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    email_attempted VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Secuencia de operaciones
CREATE SEQUENCE IF NOT EXISTS operation_id_seq START WITH 1001;

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_user ON movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON movements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);

-- Función de Login
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
    SELECT u.id, u.name, u.email, u.password, u.is_active, u.failed_attempts, u.locked_until
    INTO v_user
    FROM users u
    WHERE LOWER(u.email) = LOWER(p_email);

    IF NOT FOUND THEN
        INSERT INTO login_history (email_attempted, success, failure_reason, ip_address, user_agent)
        VALUES (p_email, FALSE, 'USUARIO_NO_EXISTE', p_ip, p_user_agent);

        RETURN QUERY SELECT FALSE, 'Credenciales inválidas'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
        RETURN;
    END IF;

    IF NOT v_user.is_active THEN
        INSERT INTO login_history (user_id, email_attempted, success, failure_reason, ip_address, user_agent)
        VALUES (v_user.id, p_email, FALSE, 'CUENTA_DESACTIVADA', p_ip, p_user_agent);

        RETURN QUERY SELECT FALSE, 'La cuenta se encuentra desactivada'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
        RETURN;
    END IF;

    IF v_user.locked_until IS NOT NULL AND v_user.locked_until > CURRENT_TIMESTAMP THEN
        INSERT INTO login_history (user_id, email_attempted, success, failure_reason, ip_address, user_agent)
        VALUES (v_user.id, p_email, FALSE, 'CUENTA_BLOQUEADA', p_ip, p_user_agent);

        RETURN QUERY SELECT FALSE, 'Cuenta bloqueada temporalmente por intentos fallidos'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
        RETURN;
    END IF;

    IF v_user.password = crypt(p_password, v_user.password) THEN
        UPDATE users 
        SET failed_attempts = 0,
            locked_until = NULL,
            last_login_at = CURRENT_TIMESTAMP
        WHERE id = v_user.id;

        v_new_token := encode(gen_random_bytes(32), 'hex');
        v_expires_at := CURRENT_TIMESTAMP + INTERVAL '24 hours';

        INSERT INTO user_sessions (user_id, token, ip_address, user_agent, expires_at)
        VALUES (v_user.id, v_new_token, p_ip, p_user_agent, v_expires_at);

        INSERT INTO login_history (user_id, email_attempted, success, ip_address, user_agent)
        VALUES (v_user.id, p_email, TRUE, p_ip, p_user_agent);

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

        INSERT INTO login_history (user_id, email_attempted, success, failure_reason, ip_address, user_agent)
        VALUES (v_user.id, p_email, FALSE, 'PASSWORD_INCORRECTO', p_ip, p_user_agent);

        RETURN QUERY SELECT FALSE, 'Credenciales inválidas'::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Función de Logout
CREATE OR REPLACE FUNCTION fn_logout(p_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM user_sessions WHERE token = p_token;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
