// Pipeline completo de processamento de bilhetes
//
// Etapas:
// 1) Normalização OCR (local)
// 2) Extração de Metadados (local)
// 2.5) Extração de linhas de apostas brutas (local)
// 3) Parser Semântico de Apostas (LLM)
// 4) Formatter Final do Bilhete (local)

import { normalizeOcr } from "../ocr/normalizeOcr";
import { NormalizationInput, BilheteFinal } from "../schema/bilhete.schema";
import { semanticTicketLLM } from "./semanticTicketLLM";
import { LlmClient } from "../utils/llmClient";

const DEBUG = process.env.DEBUG_BILHETE === '1';

// Pipeline simplificado: o normalizeOcr prepara as linhas e o
// semanticTicketLLM se torna o INTÉRPRETE principal (LLM-first),
// com fallback interno para regex + parser de apostas quando
// necessário.
export async function processBilhete(input: NormalizationInput): Promise<BilheteFinal> {
  const normalized = normalizeOcr(input);

  // Log de diagnóstico para inspecionar exatamente o que o normalizeOcr
  // está entregando para o restante do pipeline.
  if (DEBUG) {
    console.log("🧪 NORMALIZED LINES ↓↓↓");
    normalized.lines.forEach((l, i) => {
      console.log(i, JSON.stringify(l));
    });
  }

  return semanticTicketLLM({ lines: normalized.lines });
}

// Variante que permite injetar um cliente LLM específico
// (por exemplo, um cliente real Groq em produção), mantendo a
// mesma arquitetura LLM-first.
export async function processBilheteWithClient(
  input: NormalizationInput,
  client: LlmClient,
): Promise<BilheteFinal> {
  const normalized = normalizeOcr(input);
  if (DEBUG) {
    console.log("🧪 NORMALIZED LINES (with client) ↓↓↓");
    normalized.lines.forEach((l, i) => {
      console.log(i, JSON.stringify(l));
    });
  }
  return semanticTicketLLM({ lines: normalized.lines }, client as any);
}

export * from "../schema/bilhete.schema";
