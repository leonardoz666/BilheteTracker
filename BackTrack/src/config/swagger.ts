/**
 * Configuração do Swagger/OpenAPI para documentação da API
 */

import swaggerJsdoc from 'swagger-jsdoc';
import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

// Extra: deduz o tipo de opções a partir da função exportada, evitando depender
// de membros de namespace que não estão presentes em algumas builds de tipos.
type SwaggerJSDocOptions = Parameters<typeof swaggerJsdoc>[0];

const options: SwaggerJSDocOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BackTrack API',
      version: '1.0.0',
      description: `
        API REST para gerenciamento de apostas esportivas.
        
        ## Autenticação
        A maioria dos endpoints requer autenticação via JWT.
        Use o endpoint \`POST /api/auth/login\` para obter o token.
        
        ## Rate Limiting
        - Endpoints de autenticação: 5 requisições/15min por IP
        - Atualização de apostas: 60 requisições/min por usuário
        - Outros endpoints: 100 requisições/min por IP
        
        ## Pagination
        Endpoints de listagem suportam cursor pagination:
        - \`cursor\`: ID do último item da página anterior
        - \`take\`: Itens por página (padrão: 50, máximo: 100)
        - \`orderBy\`: Direção da ordenação (asc/desc)
      `,
      contact: {
        name: 'BackTrack Support',
        email: 'support@backtrack.app'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Servidor de desenvolvimento'
      },
      {
        url: 'https://backtrack-api.onrender.com',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via /api/auth/login'
        },
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'token',
          description: 'HttpOnly cookie com JWT'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro'
            },
            message: {
              type: 'string',
              description: 'Detalhes adicionais (opcional)'
            }
          }
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {}
            },
            nextCursor: {
              type: 'string',
              nullable: true,
              description: 'ID do último item (null se não houver mais páginas)'
            },
            hasMore: {
              type: 'boolean',
              description: 'Indica se há mais páginas'
            }
          }
        },
        Bet: {
          type: 'object',
          required: ['bancaId', 'esporte', 'evento', 'mercado', 'tipoAposta', 'valorApostado', 'odd', 'casaDeAposta'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'ID único da aposta'
            },
            bancaId: {
              type: 'string',
              format: 'uuid',
              description: 'ID da banca'
            },
            esporte: {
              type: 'string',
              example: 'Futebol',
              description: 'Esporte da aposta'
            },
            evento: {
              type: 'string',
              example: 'Flamengo x Palmeiras',
              description: 'Nome do evento/jogo'
            },
            torneio: {
              type: 'string',
              nullable: true,
              example: 'Brasileirão Série A',
              description: 'Torneio/campeonato'
            },
            pais: {
              type: 'string',
              nullable: true,
              example: 'Brasil',
              description: 'País do evento'
            },
            mercado: {
              type: 'string',
              example: 'Resultado Final',
              description: 'Mercado da aposta'
            },
            tipoAposta: {
              type: 'string',
              example: 'Casa',
              description: 'Tipo/opção da aposta'
            },
            aposta: {
              type: 'string',
              nullable: true,
              example: 'Flamengo vence',
              description: 'Descrição detalhada da aposta'
            },
            valorApostado: {
              type: 'number',
              format: 'float',
              example: 100.00,
              description: 'Valor apostado em R$'
            },
            odd: {
              type: 'number',
              format: 'float',
              example: 2.50,
              description: 'Odd da aposta'
            },
            bonus: {
              type: 'number',
              format: 'float',
              default: 0,
              example: 10.00,
              description: 'Bônus utilizado em R$'
            },
            dataJogo: {
              type: 'string',
              format: 'date-time',
              example: '2025-12-20T19:00:00Z',
              description: 'Data/hora do evento'
            },
            tipster: {
              type: 'string',
              nullable: true,
              example: 'John Doe',
              description: 'Nome do tipster'
            },
            status: {
              type: 'string',
              enum: ['Pendente', 'Green', 'Red', 'Vencida', 'Perdida', 'Cancelada', 'Cashout'],
              default: 'Pendente',
              description: 'Status da aposta'
            },
            casaDeAposta: {
              type: 'string',
              example: 'Bet365',
              description: 'Casa de apostas'
            },
            retornoObtido: {
              type: 'number',
              format: 'float',
              nullable: true,
              example: 250.00,
              description: 'Retorno obtido em R$ (apenas para apostas finalizadas)'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          }
        },
        Bankroll: {
          type: 'object',
          required: ['nome'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            usuarioId: {
              type: 'string',
              format: 'uuid'
            },
            nome: {
              type: 'string',
              example: 'Banca Principal',
              maxLength: 100
            },
            descricao: {
              type: 'string',
              nullable: true,
              example: 'Minha banca de apostas conservadoras'
            },
            status: {
              type: 'string',
              enum: ['Ativa', 'Inativa'],
              default: 'Ativa'
            },
            ePadrao: {
              type: 'boolean',
              default: false,
              description: 'Define se é a banca padrão do usuário'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid'
            },
            nomeCompleto: {
              type: 'string',
              example: 'João Silva'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'joao@example.com'
            },
            statusConta: {
              type: 'string',
              enum: ['Ativa', 'Inativa', 'Suspensa'],
              default: 'Ativa'
            },
            planoId: {
              type: 'string',
              format: 'uuid'
            },
            telegramId: {
              type: 'string',
              nullable: true
            },
            telegramUsername: {
              type: 'string',
              nullable: true
            },
            fotoPerfil: {
              type: 'string',
              nullable: true,
              format: 'uri'
            },
            membroDesde: {
              type: 'string',
              format: 'date-time'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Auth',
        description: 'Autenticação e autorização'
      },
      {
        name: 'Apostas',
        description: 'Gerenciamento de apostas'
      },
      {
        name: 'Bancas',
        description: 'Gerenciamento de bancas'
      },
      {
        name: 'Financeiro',
        description: 'Transações financeiras'
      },
      {
        name: 'Perfil',
        description: 'Gerenciamento de perfil de usuário'
      },
      {
        name: 'Tipsters',
        description: 'Gerenciamento de tipsters'
      },
      {
        name: 'Health',
        description: 'Endpoints de monitoramento'
      }
    ]
  },
  // Desabilitado o parse automático de JSDoc para evitar bug do swagger-jsdoc
  // (anchor.cstNode undefined em runtime). Mantemos apenas a definição estática.
  apis: []
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Configura o Swagger UI no Express
 */
export function setupSwagger(app: Express): void {
  // Servir especificação JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Servir UI do Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'BackTrack API Docs',
    customfavIcon: '/favicon.ico'
  }));
}

export { swaggerSpec };
