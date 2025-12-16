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
import { getCachedTicket, setCachedTicket } from "./utils/ticketCache";

export { processBilhete, processBilheteWithClient } from "./pipeline";
export * from "./schema/bilhete.schema";

export type ProcessFromImageOptions = {
  // Quando true, usa o MockLlmClient interno (nenhuma chamada externa ao Groq).
  useMockLlm?: boolean;
  // Quando true, ignora o cache e força reprocessamento (útil para debug/desenvolvimento).
  bypassCache?: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callOcrWithRetry(imageUrl: string, maxRetries = 3) {
  let lastError: unknown;
  
  // Backoff: 200ms → 400ms → 600ms
  const delays = [200, 400, 600];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ocrResponse = await callOcrSpaceByUrl(imageUrl);

      const errorMessages = Array.isArray(ocrResponse?.ErrorMessage)
        ? ocrResponse.ErrorMessage
        : ocrResponse?.ErrorMessage
          ? [String(ocrResponse.ErrorMessage)]
          : [];

      // OCRExitCode valores (OCR.space documentation):
      // 1 = Sucesso (Parsed Successfully)
      // 2 = Sucesso Parcial (Parsed Partially)
      // 3 = Falha Total (All pages failed)
      // 4 = Erro Fatal (Error occurred)
      const isSuccess = ocrResponse?.OCRExitCode === 1 || ocrResponse?.OCRExitCode === 2;
      const isFatal =
        ocrResponse?.OCRExitCode === 3 ||
        ocrResponse?.OCRExitCode === 4 ||
        errorMessages.some((msg: string) => msg?.toLowerCase().includes("timed out")) ||
        ocrResponse?.IsErroredOnProcessing;

      if (isFatal) {
        const errorText = errorMessages.length > 0 ? errorMessages.join("; ") : "erro desconhecido";
        throw new Error(
          `Falha ao processar imagem no OCR.space (OCRExitCode ${ocrResponse?.OCRExitCode ?? "?"}): ${errorText}`,
        );
      }

      // Sucesso (codes 1 ou 2)
      if (isSuccess) {
        return ocrResponse;
      }

      // Exit codes desconhecidos - tenta novamente
      throw new Error(
        `OCR.space retornou código desconhecido: ${ocrResponse?.OCRExitCode}`,
      );
    } catch (err) {
      lastError = err;
      console.warn(`⚠️  OCR.space tentativa ${attempt}/${maxRetries} falhou: ${String(err)}`);
      if (attempt < maxRetries) {
        const delay = delays[attempt - 1];
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        await sleep(delay);
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
export async function processBilheteFromImageUrl(
  imageUrl: string,
  options: ProcessFromImageOptions = {},
): Promise<BilheteFinal> {
  // Verifica cache antes de processar (se não for bypass e cache não estiver desabilitado)
  const cacheDisabled = process.env.DISABLE_TICKET_CACHE === "true";
  const shouldUseCache = !options.bypassCache && !cacheDisabled;
  
  if (shouldUseCache) {
    const cached = getCachedTicket(imageUrl);
    if (cached) {
      return cached;
    }
  }

  // OcrClient é responsável por ler OCR_SPACE_API_KEY internamente.
  // Fazemos retry defensivo com backoff exponencial para contornar timeouts esporádicos do OCR.space (E101).
  const ocrResponse = await callOcrWithRetry(imageUrl, 3);

   // Logs de diagnóstico para inspecionar o OCR bruto e o resultado
   // imediato da normalização, antes de qualquer chamada ao LLM.
   console.log("OCR RAW:", JSON.stringify(ocrResponse, null, 2));

   const debugInput: NormalizationInput = {
     kind: "ocrSpace",
     payload: ocrResponse,
   };
   const debugNormalized = normalizeOcr(debugInput);
   console.log("NORMALIZED:", debugNormalized.lines);

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

  // Salva resultado no cache (apenas se cache estiver habilitado)
  if (shouldUseCache) {
    setCachedTicket(imageUrl, result);
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
    res.json({ status: "ok" });
  });

  app.post("/api/process-image", async (req, res) => {
    const { imageUrl, useMockLlm } = req.body ?? {};

    const isProduction = process.env.NODE_ENV === "production";
    const effectiveUseMockLlm = isProduction ? false : useMockLlm;

    if (!imageUrl || typeof imageUrl !== "string") {
      return res.status(400).json({ error: "Campo imageUrl (string) é obrigatório" });
    }

    try {
      const ticket = await processBilheteFromImageUrl(imageUrl, { useMockLlm: effectiveUseMockLlm });
      
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
