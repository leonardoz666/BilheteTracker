// Setup global para testes
import { config } from 'dotenv';

// Carregar variáveis de ambiente para testes
config();

// Configurar timezone para testes consistentes
process.env.TZ = 'UTC';
