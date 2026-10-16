# PagaYa Backend API (Node.js + Clean Architecture + PostgreSQL)

API RESTful empresarial desarrollada con **Node.js, Express, TypeScript y PostgreSQL**, implementando **Clean Architecture**, organización modular por **Features**, **Procedimientos Almacenados (PL/pgSQL)**, **Control de Acceso Basado en Roles (RBAC)** y estándares de seguridad **OWASP ASVS**.

---

## 🏗️ Arquitectura Limpia y Segregación de Responsabilidades

El proyecto sigue una arquitectura en capas por funcionalidad (Feature-Driven Clean Architecture):

```text
src/
├── shared/                              # Módulos transversales compartidos
│   ├── config/
│   │   ├── db.ts                        # Pool optimizado de conexión a PostgreSQL
│   │   └── swagger.ts                   # Especificación OpenAPI 3.0
│   ├── errors/                          # Jerarquía de errores de dominio (AppError, UnauthorizedError, etc.)
│   └── middlewares/
│       ├── auth.middleware.ts           # Validación de sesión activa en BD (OWASP A07)
│       ├── authorize.middleware.ts      # Verificación de permisos RBAC con v_user_permissions (OWASP A01)
│       └── errorHandler.middleware.ts   # Manejador global de excepciones
├── features/                            # Módulos desacoplados por funcionalidad de negocio
│   ├── auth/                            # Autenticación y Auditoría
│   │   ├── domain/entities/             # Entidades del dominio
│   │   ├── dtos/                        # Objetos de transferencia de datos
│   │   ├── repositories/                # Acceso a datos (invoca fn_login, fn_logout)
│   │   ├── use-cases/                   # Casos de uso (LoginUseCase, LogoutUseCase, GetProfileUseCase)
│   │   ├── controllers/                 # Adaptador HTTP Express
│   │   └── auth.routes.ts               # Rutas (/api/auth)
│   ├── menus/                           # Menú Dinámico Jerárquico por RBAC
│   │   ├── domain/entities/
│   │   ├── repositories/                # Invoca fn_get_user_menu
│   │   ├── use-cases/                   # Construcción de árbol jerárquico (padres/hijos)
│   │   ├── controllers/
│   │   └── menu.routes.ts               # Rutas (/api/menus)
│   ├── products/                        # Billeteras y Cuentas
│   │   ├── domain/entities/
│   │   ├── repositories/
│   │   ├── use-cases/
│   │   ├── controllers/
│   │   └── products.routes.ts           # Protegido con authorize('products:read')
│   ├── movements/                       # Historial y Registro de Ingresos/Egresos
│   │   ├── domain/entities/
│   │   ├── dtos/
│   │   ├── repositories/                # Invoca fn_create_movement (actualización atómica)
│   │   ├── use-cases/
│   │   ├── controllers/
│   │   └── movements.routes.ts          # Protegido con authorize('movements:read', 'movements:create')
│   └── transfers/                       # Transferencias Atómicas y Agenda
│       ├── domain/entities/
│       ├── dtos/
│       ├── repositories/                # Invoca fn_execute_transfer y correlativo
│       ├── use-cases/
│       ├── controllers/
│       └── transfers.routes.ts          # Protegido con authorize('transfers:execute', 'contacts:manage')
├── routes.ts                            # Agregador central de rutas (/api)
└── server.ts                            # Punto de entrada de la aplicación
```

---

## ⚡ Procedimientos Almacenados en PostgreSQL

Las operaciones críticas de base de datos se delegan a funciones y procedimientos PL/pgSQL atómicos para garantizar consistencia transaccional y máximo rendimiento:

1. `fn_login(p_email, p_password, p_ip, p_user_agent)`:
   - Verificación de contraseña con **Bcrypt** (`pgcrypto`).
   - Control de intentos fallidos (bloqueo automático tras 5 fallos durante 15 minutos).
   - Generación de token criptográfico de sesión (32 bytes).
   - Registro en `security_audit_log`.
2. `fn_logout(p_token)`:
   - Revocación inmediata del token en `user_sessions`.
3. `fn_get_user_menu(p_user_id)`:
   - Filtra los ítems de navegación según los permisos activos del usuario mediante roles.
4. `fn_create_movement(p_user_id, p_product_id, p_concept, p_type, p_amount, p_currency, p_category)`:
   - Inserta el movimiento y actualiza el saldo del producto en una sola transacción atómica con bloqueo de fila.
5. `fn_execute_transfer(p_user_id, p_from_product_id, p_amount, p_concept, p_contact_id, p_destination_phone)`:
   - Validación de saldo con bloqueo `FOR UPDATE`.
   - Obtención correlativa de `operation_id_seq`.
   - Descuento de saldo, inserción de movimiento y registro de auditoría.

---

## 🚀 Puesta en Marcha

### 1. Cargar Base de Datos
Ejecuta el script unificado que crea el esquema completo, RBAC, funciones y datos semilla:
```bash
psql -U postgres -d pagaya_db -f sql/database_complete.sql
```

### 2. Configurar `.env`
```env
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=pagaya_db
```

### 3. Iniciar el Servidor
```bash
# Modo desarrollo con auto-recarga
npm run dev

# Compilación y producción
npm run build
npm start
```

---

## 📖 Documentación Swagger UI

Accede a la interfaz interactiva para probar los endpoints y el esquema RBAC:
👉 **[http://localhost:3000/api-docs](http://localhost:3000/api-docs)**

Credenciales de prueba disponibles:
- **Cliente (`CUSTOMER`):** `demo@pagaya.pe` / `Demo123*`
- **Administrador (`ADMIN`):** `admin@pagaya.pe` / `Admin123*`
