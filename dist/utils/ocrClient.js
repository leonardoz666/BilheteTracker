"use strict";
// Cliente para OCR.space (engine 2)
//
// Responsável por enviar uma imagem (via URL) para o OCR.space
// e retornar o JSON de resposta tipado em OcrSpaceResponse.
//
// Este módulo NÃO faz nenhuma interpretação semântica;
// apenas encapsula a chamada HTTP ao serviço OCR.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.callOcrSpaceByUrl = callOcrSpaceByUrl;
const node_fetch_1 = __importDefault(require("node-fetch"));
const form_data_1 = __importDefault(require("form-data"));
const OCR_SPACE_ENDPOINT = "https://api.ocr.space/parse/image";
async function callOcrSpaceByUrl(imageUrl, options = {}) {
    const apiKey = options.apiKey || process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
        throw new Error("OCR_SPACE_API_KEY não definido. Informe via options.apiKey ou variável de ambiente.");
    }
    const language = options.language || "por";
    const timeout = 10000; // 10s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        // 1) Baixar a imagem real a partir da URL (ex.: arquivo do Telegram).
        const imageRes = await (0, node_fetch_1.default)(imageUrl, { signal: controller.signal });
        if (!imageRes.ok) {
            const text = await imageRes.text().catch(() => "");
            throw new Error(`Falha ao baixar imagem para OCR (${imageRes.status} ${imageRes.statusText}): ${text}`);
        }
        const buffer = await imageRes.buffer();
        clearTimeout(timeoutId);
        // Tentar inferir nome e tipo de arquivo para o upload.
        const contentType = imageRes.headers.get("content-type") || "image/jpeg";
        const urlPath = new URL(imageUrl).pathname;
        const filenameFromUrl = urlPath.split("/").filter(Boolean).pop() || "upload.jpg";
        const form = new form_data_1.default();
        form.append("apikey", apiKey);
        form.append("language", language);
        form.append("OCREngine", "2");
        form.append("scale", "true");
        form.append("isTable", "false");
        form.append("file", buffer, {
            filename: filenameFromUrl,
            contentType,
        });
        const ocrController = new AbortController();
        const ocrTimeoutId = setTimeout(() => ocrController.abort(), timeout);
        const res = await (0, node_fetch_1.default)(OCR_SPACE_ENDPOINT, {
            method: "POST",
            body: form,
            // form-data define os headers corretos de multipart, incluindo boundary.
            headers: form.getHeaders(),
            signal: ocrController.signal,
        });
        clearTimeout(ocrTimeoutId);
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Falha na chamada ao OCR.space: ${res.status} ${res.statusText} - ${text}`);
        }
        const data = (await res.json());
        return data;
    }
    catch (err) {
        if (err.name === 'AbortError') {
            throw new Error(`Timeout (${timeout}ms) ao chamar OCR.space`);
        }
        throw err;
    }
    finally {
        clearTimeout(timeoutId);
    }
}
