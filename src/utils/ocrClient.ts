// Cliente para OCR.space (engine 2)
//
// Responsável por enviar uma imagem (via URL) para o OCR.space
// e retornar o JSON de resposta tipado em OcrSpaceResponse.
//
// Este módulo NÃO faz nenhuma interpretação semântica;
// apenas encapsula a chamada HTTP ao serviço OCR.

import fetch from "node-fetch";
import FormData from "form-data";
import { OcrSpaceResponse } from "../schema/bilhete.schema";

const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";

export type OcrSpaceOptions = {
  apiKey?: string; // opcional; se não passado, usa process.env.OCR_SPACE_API_KEY
  language?: string; // ex: "por", "eng"
};

export async function callOcrSpaceByUrl(
  imageUrl: string,
  options: OcrSpaceOptions = {},
): Promise<OcrSpaceResponse> {
  const apiKey = options.apiKey || process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    throw new Error("OCR_SPACE_API_KEY não definido. Informe via options.apiKey ou variável de ambiente.");
  }

  const language = options.language || "por";

  // 1) Baixar a imagem real a partir da URL (ex.: arquivo do Telegram).
  const imageRes = await fetch(imageUrl);
  if (!imageRes.ok) {
    const text = await imageRes.text().catch(() => "");
    throw new Error(
      `Falha ao baixar imagem para OCR (${imageRes.status} ${imageRes.statusText}): ${text}`,
    );
  }

  const buffer = await imageRes.buffer();

  // Tentar inferir nome e tipo de arquivo para o upload.
  const contentType = imageRes.headers.get("content-type") || "image/jpeg";
  const urlPath = new URL(imageUrl).pathname;
  const filenameFromUrl = urlPath.split("/").filter(Boolean).pop() || "upload.jpg";

  const form = new FormData();
  form.append("apikey", apiKey);
  form.append("language", language);
  form.append("OCREngine", "2");
  form.append("scale", "true");
  form.append("isTable", "false");
  form.append("file", buffer, {
    filename: filenameFromUrl,
    contentType,
  });

  const res = await fetch(OCR_SPACE_ENDPOINT, {
    method: "POST",
    body: form as any,
    // form-data define os headers corretos de multipart, incluindo boundary.
    headers: form.getHeaders(),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha na chamada ao OCR.space: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = (await res.json()) as OcrSpaceResponse;
  return data;
}
