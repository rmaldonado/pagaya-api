-- ========================================================
-- Datos iniciales (Seeds)
-- ========================================================

-- Usuario Inicial (Contraseña cifrada: Demo123*)
INSERT INTO users (id, name, email, password) VALUES
('usr-01', 'Ana Demo', 'demo@pagaya.pe', crypt('Demo123*', gen_salt('bf', 10)))
ON CONFLICT (id) DO UPDATE 
SET password = crypt('Demo123*', gen_salt('bf', 10));

-- Productos
INSERT INTO products (id, user_id, alias, type, currency, available_balance) VALUES
('prd-01', 'usr-01', 'Billetera Principal', 'WALLET', 'PEN', 1250.50),
('prd-02', 'usr-01', 'Cuenta de Ahorro', 'SAVINGS', 'PEN', 3400.00)
ON CONFLICT (id) DO NOTHING;

-- Contactos
INSERT INTO contacts (id, user_id, name, phone) VALUES
('ct-01', 'usr-01', 'Carlos Mendoza', '*** *** 123'),
('ct-02', 'usr-01', 'Lucía Torres', '*** *** 456'),
('ct-03', 'usr-01', 'Diego Ramírez', '*** *** 789'),
('ct-04', 'usr-01', 'Sofía Vásquez', '*** *** 012'),
('ct-05', 'usr-01', 'Andrés Rojas', '*** *** 345')
ON CONFLICT (id) DO NOTHING;

-- Movimientos
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
