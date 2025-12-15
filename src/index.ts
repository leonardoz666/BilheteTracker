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

export { processBilhete, processBilheteWithClient } from "./pipeline";
export * from "./schema/bilhete.schema";

export type ProcessFromImageOptions = {
  // Quando true, usa o MockLlmClient interno (nenhuma chamada externa ao Groq).
  useMockLlm?: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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
        await sleep(1200);
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
  // OcrClient é responsável por ler OCR_SPACE_API_KEY internamente.
  // Fazemos retry defensivo para contornar timeouts esporádicos do OCR.space (E101).
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

  if (options.useMockLlm) {
    // Usa o pipeline padrão com MockLlmClient (sem chamadas externas).
    return processBilhete(input);
  }

  // GroqLlmClient é responsável por ler GROQ_API_KEY internamente.
  const client = createGroqLlmClient();
  return processBilheteWithClient(input, client);
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
