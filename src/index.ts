// Entry point do projeto bilhete-tracker
//
// Este arquivo expõe a função principal do pipeline
// (`processBilhete`) e oferece dois modos de execução:
// - Local (npm start, sem PORT): roda apenas o exemplo mínimo no console.
// - Produção (Render, com PORT): sobe um servidor HTTP com a API do pipeline.

import express from "express";
import { processBilhete, processBilheteWithClient } from "./pipeline";
import { NormalizationInput, BilheteFinal } from "./schema/bilhete.schema";
import { callOcrSpaceByUrl } from "./utils/ocrClient";
import { createGroqLlmClient } from "./utils/groqLlmClient";
import { normalizeOcr } from "./ocr/normalizeOcr";
import { globalTicketCache, TicketCache, PARSER_VERSION } from "./utils/ticketCache";
import crypto from "crypto";
import fetch from "node-fetch";

const DEBUG = process.env.DEBUG_BILHETE === '1';

export { processBilhete, processBilheteWithClient } from "./pipeline";
export * from "./schema/bilhete.schema";

export type ProcessFromImageOptions = {
  // Quando true, usa o MockLlmClient interno (nenhuma chamada externa ao Groq).
  useMockLlm?: boolean;
  // Quando true, ignora cache e força reprocessamento de OCR + LLM
  bypassCache?: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calcula o delay com backoff exponencial: 200ms → 400ms → 600ms
 */
function getBackoffDelay(attempt: number): number {
  const backoffMs = [200, 400, 600];
  return backoffMs[Math.min(attempt - 1, backoffMs.length - 1)];
}

async function callOcrWithRetry(imageUrl: string, maxRetries = 3) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ocrResponse = await callOcrSpaceByUrl(imageUrl);

      const errorMessages = Array.isArray(ocrResponse?.ErrorMessage)
        ? ocrResponse.ErrorMessage
        : ocrResponse?.ErrorMessage
          ? [String(ocrResponse.ErrorMessage)]
          : [];

      const isTimeout =
        ocrResponse?.OCRExitCode === 6 ||
        errorMessages.some((msg: string) => msg?.toLowerCase().includes("timed out")) ||
        ocrResponse?.IsErroredOnProcessing;

      if (isTimeout) {
        const errorText = errorMessages.length > 0 ? errorMessages.join("; ") : "erro desconhecido";
        throw new Error(
          `Falha ao processar imagem no OCR.space (OCRExitCode ${ocrResponse?.OCRExitCode ?? "?"}): ${errorText}`,
        );
      }

      // Sucesso
      return ocrResponse;
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  OCR.space tentativa ${attempt}/${maxRetries} falhou: ${String(err)}`);
      if (attempt < maxRetries) {
        const backoffMs = getBackoffDelay(attempt);
        console.log(`   Aguardando ${backoffMs}ms antes da próxima tentativa...`);
        await sleep(backoffMs);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

// Função de alto nível que orquestra TUDO:
// 1) Chama OCR.space (engine 2) a partir de uma URL de imagem
// 2) Passa o JSON do OCR para o pipeline local
// 3) Usa LLM (Groq) para parsing semântico das apostas
// 4) Retorna o BilheteFinal pronto para o backend (ex.: BackTrack)
// 5) Usa cache de tickets por hash de imagem (1h TTL) quando bypassCache=false
export async function processBilheteFromImageUrl(
  imageUrl: string,
  options: ProcessFromImageOptions = {},
): Promise<BilheteFinal> {
  // Verifica se deve usar cache (padrão: true, a menos que DISABLE_TICKET_CACHE=true ou bypassCache=true)
  const disableCacheEnv = process.env.DISABLE_TICKET_CACHE?.toLowerCase() === "true";
  const shouldUseCache = !disableCacheEnv && !options.bypassCache;

  let imageBuffer: Buffer | null = null;
  let imageHash: string | null = null;

  console.log(`[PARSER v${PARSER_VERSION}] Iniciando processamento de bilhete...`);

  // Se cache está habilitado, baixa a imagem e calcula o hash
  // IMPORTANTE: Hash é calculado do CONTEÚDO da imagem, não da URL
  // Isso garante que se a mesma URL tiver imagens diferentes, o cache será invalidado
  if (shouldUseCache) {
    try {
      const imageRes = await fetch(imageUrl);
      if (imageRes.ok) {
        imageBuffer = await imageRes.buffer();
        // Hash baseado no CONTEÚDO (buffer) da imagem, não na URL
        imageHash = TicketCache.hashImageBuffer(imageBuffer);

        // Tenta recuperar do cache
        const cached = globalTicketCache.get(imageHash);
        if (cached) {
          console.log(`✅ [CACHE HIT v${PARSER_VERSION}] Bilhete recuperado do cache para hash ${imageHash.substring(0, 8)}...`);
          return cached;
        }

        console.log(`📝 [CACHE MISS v${PARSER_VERSION}] Hash ${imageHash.substring(0, 8)}... não encontrado no cache. Processando...`);
      }
    } catch (err) {
      console.warn(`⚠️  Falha ao baixar imagem para cache: ${String(err)}. Continuando sem cache...`);
    }
  }

  // OcrClient é responsável por ler OCR_SPACE_API_KEY internamente.
  // Fazemos retry defensivo para contornar timeouts esporádicos do OCR.space (E101).
  const ocrResponse = await callOcrWithRetry(imageUrl, 3);

  // Logs de diagnóstico para inspecionar o OCR bruto e o resultado
  // imediato da normalização, antes de qualquer chamada ao LLM.
  if (DEBUG) {
    console.log("OCR RAW:", JSON.stringify(ocrResponse, null, 2));
    const debugInput: NormalizationInput = {
      kind: "ocrSpace",
      payload: ocrResponse,
    };
    const debugNormalized = normalizeOcr(debugInput);
    console.log("NORMALIZED:", debugNormalized.lines);
  }

  const input: NormalizationInput = {
    kind: "ocrSpace",
    payload: ocrResponse,
  };

  let result: BilheteFinal;

  if (options.useMockLlm) {
    // Usa o pipeline padrão com MockLlmClient (sem chamadas externas).
    result = await processBilhete(input);
  } else {
    // GroqLlmClient é responsável por ler GROQ_API_KEY internamente.
    const client = createGroqLlmClient();
    result = await processBilheteWithClient(input, client);
  }

  // Armazena o resultado no cache se hash foi gerado
  // Chave de cache: ticket:{parserVersion}:{imageHash}
  if (shouldUseCache && imageHash) {
    globalTicketCache.set(imageHash, result);
    console.log(`💾 [CACHE STORE v${PARSER_VERSION}] Chave: ticket:${PARSER_VERSION}:${imageHash.substring(0, 8)}... armazenado com TTL 1h`);
  }

  return result;
}

async function runExample(): Promise<void> {
  // Exemplo obrigatório do enunciado:
  const parsedText = [
    "Jogador ressaltos → Flagg, Cooper 7+ (DAL)",
    "Jogador assistências → Flagg, Cooper 5+",
  ].join("\n");

  const input: NormalizationInput = {
    kind: "parsedText",
    payload: parsedText,
  };

  const result: BilheteFinal = await processBilhete(input);

  // Saída demonstrativa em JSON, para fácil inspeção.
  // A formatação final segue o contrato do schema.
  console.log(JSON.stringify(result, null, 2));
}

function createHttpServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", parserVersion: PARSER_VERSION });
  });

  app.post("/api/process-image", async (req, res) => {
    const { imageUrl, useMockLlm, bypassCache } = req.body ?? {};

    const isProduction = process.env.NODE_ENV === "production";
    const effectiveUseMockLlm = isProduction ? false : useMockLlm;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({ error: "Campo imageUrl (string) é obrigatório" });
    }

    try {
      console.log(`[HTTP] POST /api/process-image - Parser v${PARSER_VERSION}`);
      const ticket = await processBilheteFromImageUrl(imageUrl, { 
        useMockLlm: effectiveUseMockLlm,
        bypassCache: bypassCache === true 
      });
      
      // 🔍 DEBUG: Log do bilhete antes de retornar
      console.log('🔍 [BILHETE-TRACKER] Retornando bilhete:');
      console.log('   Esporte:', ticket.esporte);
      console.log('   Evento:', ticket.evento);
      console.log('   Torneio:', ticket.torneio);
      
      return res.json(ticket);
    } catch (err) {
      console.error("Erro ao processar bilhete via HTTP:", err);
      const message = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ error: "Falha ao processar bilhete", message });
    }
  });

  return app;
}

function startHttpServer() {
  const app = createHttpServer();
  const port = Number(process.env.PORT) || 3000;

  app.listen(port, () => {
    console.log(`bilhete-tracker HTTP server listening on port ${port}`);
  });
}

// Modo de execução:
// - Se houver PORT (ex.: Render), sobe o servidor HTTP.
// - Caso contrário (ex.: npm start local), roda apenas o exemplo.
if (require.main === module) {
  if (process.env.PORT) {
    startHttpServer();
  } else {
    runExample().catch((err) => {
      console.error("Erro ao processar exemplo de bilhete:", err);
      process.exitCode = 1;
    });
  }
}
