export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'PagaYa API',
    version: '1.0.0',
    description: 'Documentación interactiva de la API REST de PagaYa (Billetera digital y transferencias)',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local de desarrollo',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'Token',
        description: 'Ingrese el session_token obtenido en el endpoint /api/auth/login',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'usr-01' },
          name: { type: 'string', example: 'Ana Demo' },
          email: { type: 'string', example: 'demo@pagaya.pe' },
          isActive: { type: 'boolean', example: true },
          lastLoginAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'prd-01' },
          userId: { type: 'string', example: 'usr-01' },
          alias: { type: 'string', example: 'Billetera Principal' },
          type: { type: 'string', enum: ['WALLET', 'SAVINGS'], example: 'WALLET' },
          currency: { type: 'string', example: 'PEN' },
          availableBalance: { type: 'number', example: 1250.5 },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Movement: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'mov-01' },
          userId: { type: 'string', example: 'usr-01' },
          productId: { type: 'string', example: 'prd-01' },
          concept: { type: 'string', example: 'Almuerzo' },
          type: { type: 'string', enum: ['EXPENSE', 'INCOME'], example: 'EXPENSE' },
          amount: { type: 'number', example: 40.0 },
          currency: { type: 'string', example: 'PEN' },
          category: { type: 'string', example: 'Comida' },
          createdAt: { type: 'string', format: 'date-time', example: '2026-09-04T14:10:00Z' },
        },
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'ct-01' },
          userId: { type: 'string', example: 'usr-01' },
          name: { type: 'string', example: 'Carlos Mendoza' },
          phone: { type: 'string', example: '*** *** 123' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'demo@pagaya.pe' },
          password: { type: 'string', example: 'Demo123*' },
        },
      },
      LoginResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Inicio de sesión exitoso' },
          data: {
            type: 'object',
            properties: {
              user: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'usr-01' },
                  name: { type: 'string', example: 'Ana Demo' },
                  email: { type: 'string', example: 'demo@pagaya.pe' },
                },
              },
              token: { type: 'string', example: '9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d' },
            },
          },
        },
      },
      CreateMovementRequest: {
        type: 'object',
        required: ['concept', 'type', 'amount', 'category'],
        properties: {
          productId: { type: 'string', example: 'prd-01' },
          concept: { type: 'string', example: 'Supermercado' },
          type: { type: 'string', enum: ['EXPENSE', 'INCOME'], example: 'EXPENSE' },
          amount: { type: 'number', example: 150.75 },
          currency: { type: 'string', default: 'PEN', example: 'PEN' },
          category: { type: 'string', example: 'Compras' },
        },
      },
      CreateContactRequest: {
        type: 'object',
        required: ['name', 'phone'],
        properties: {
          name: { type: 'string', example: 'María García' },
          phone: { type: 'string', example: '*** *** 999' },
        },
      },
      MenuItem: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          parentId: { type: 'integer', nullable: true, example: null },
          title: { type: 'string', example: 'Transferencias' },
          route: { type: 'string', example: '/transfers' },
          icon: { type: 'string', example: 'swap-horizontal' },
          orderIndex: { type: 'integer', example: 30 },
          children: {
            type: 'array',
            items: { $ref: '#/components/schemas/MenuItem' },
          },
        },
      },
      TransferRequest: {
        type: 'object',
        required: ['fromProductId', 'amount'],
        properties: {
          fromProductId: { type: 'string', example: 'prd-01' },
          contactId: { type: 'string', example: 'ct-01' },
          destinationPhone: { type: 'string', example: '*** *** 123' },
          amount: { type: 'number', example: 50.0 },
          concept: { type: 'string', example: 'Cena compartida' },
        },
      },
    },
  },
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Login exitoso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginResponse' },
              },
            },
          },
          401: { description: 'Credenciales inválidas o cuenta bloqueada' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Autenticación'],
        summary: 'Cerrar sesión',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Sesión finalizada correctamente' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Obtener usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Datos del usuario en sesión',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'No autenticado o sesión expirada' },
        },
      },
    },
    '/api/menus': {
      get: {
        tags: ['Navegación / Menús'],
        summary: 'Obtener menú dinámico autorizado por RBAC',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Árbol jerárquico de opciones de menú permitidas para el usuario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/MenuItem' },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'No autenticado' },
        },
      },
    },
    '/api/products': {
      get: {
        tags: ['Productos'],
        summary: 'Listar productos/cuentas del usuario',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Lista de billeteras y cuentas',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/products/{id}': {
      get: {
        tags: ['Productos'],
        summary: 'Obtener detalle de un producto',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            example: 'prd-01',
          },
        ],
        responses: {
          200: {
            description: 'Detalle del producto',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Product' },
                  },
                },
              },
            },
          },
          404: { description: 'Producto no encontrado' },
        },
      },
    },
    '/api/movements': {
      get: {
        tags: ['Movimientos'],
        summary: 'Listar movimientos con paginación',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 },
            description: 'Cantidad máxima de movimientos a retornar',
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Desplazamiento para paginación',
          },
        ],
        responses: {
          200: {
            description: 'Listado de movimientos ordenados por fecha descendente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Movement' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Movimientos'],
        summary: 'Registrar nuevo movimiento (actualiza saldo del producto)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateMovementRequest' },
            },
          },
        },
        responses: {
          201: {
            description: 'Movimiento creado exitosamente',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: { $ref: '#/components/schemas/Movement' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/transfers/contacts': {
      get: {
        tags: ['Transferencias y Contactos'],
        summary: 'Listar contactos frecuentes',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Contactos del usuario',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Contact' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Transferencias y Contactos'],
        summary: 'Agregar nuevo contacto',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateContactRequest' },
            },
          },
        },
        responses: {
          201: { description: 'Contacto creado correctamente' },
        },
      },
    },
    '/api/transfers/next-operation-id': {
      get: {
        tags: ['Transferencias y Contactos'],
        summary: 'Obtener siguiente ID de operación correlativo',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Siguiente número correlativo generado por PostgreSQL',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        nextOperationId: { type: 'integer', example: 1001 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/transfers': {
      post: {
        tags: ['Transferencias y Contactos'],
        summary: 'Realizar transferencia bancaria/billetera',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TransferRequest' },
            },
          },
        },
        responses: {
          200: {
            description: 'Transferencia realizada con éxito',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Transferencia realizada con éxito.' },
                    data: {
                      type: 'object',
                      properties: {
                        operationId: { type: 'string', example: '1001' },
                        movementId: { type: 'string', example: 'mov-1727680000000' },
                        amount: { type: 'number', example: 50.0 },
                        currency: { type: 'string', example: 'PEN' },
                        remainingBalance: { type: 'number', example: 1200.5 },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Saldo insuficiente o datos incompletos' },
        },
      },
    },
  },
};
