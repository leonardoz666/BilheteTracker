// Cliente real para Groq (llama-3.1-8b-instant)
//
// Implementa a interface LlmClient usando a API HTTP
// compatível com OpenAI da Groq.

import fetch from "node-fetch";
import { BilheteFinal, ResultadoSemanticoLLM } from "../schema/bilhete.schema";
import { LlmClient, TicketLlmClient } from "./llmClient";
import { KeyRotator, readKeysFromEnv } from "./keyRotator";

const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

export type GroqLlmClientOptions = {
  apiKey?: string; // se não informado, usa process.env.GROQ_API_KEY
  getApiKey?: () => string; // permite rotação dinâmica por chamada
  onKeyFailure?: (key: string, status?: number) => void; // notifica falha para backoff externo
};

export class GroqLlmClient implements TicketLlmClient {
  private apiKey: string;
  private getApiKey?: () => string;
  private onKeyFailure?: (key: string, status?: number) => void;

  constructor(options: GroqLlmClientOptions = {}) {
    this.getApiKey = options.getApiKey;
    this.onKeyFailure = options.onKeyFailure;
    const key = options.apiKey || process.env.GROQ_API_KEY || (this.getApiKey ? this.getApiKey() : undefined);
    if (!key) {
      throw new Error("GROQ_API_KEY não definido. Informe via options.apiKey ou variável de ambiente.");
    }
    this.apiKey = key;
  }

  async callSemanticParser(lines: string[]): Promise<ResultadoSemanticoLLM> {
    const contentLines = lines.join("\n");

    const systemPrompt = `Você é um parser semântico de apostas esportivas.
Receberá linhas de texto livre extraídas de bilhetes de aposta (podem incluir
metadados e textos que NÃO são apostas). Ignore tudo o que não for uma
aposta clara e foque apenas em identificar apostas individuais.

NUNCA use layout, posição na tela, nomes comerciais da casa ou odds/valores
monetários para inferir significado. Trabalhe somente com o conteúdo textual.

Você deve devolver APENAS um JSON válido no formato:
{
  "apostas": [
    {
      "tipo": "player_prop" | "team_prop" | "match_prop" | "winner",
      "jogador": string | null,
      "estatistica": string,
      "condicao": string,
      "valor": number | null,
      "time": string | null,
      "timeAbrev": string | null,
      "periodo": "Jogo" | "1º Quarto" | "2º Quarto" | "1º Tempo" | "2º Tempo" | null,
      "confianca": "alta" | "media" | "baixa"
    }
  ]
}

Regras semânticas importantes:
- Foque na INTENÇÃO da aposta, não no layout visual.
- Diferencie corretamente mercados do tipo "Cada time X" de mercados de
  "Mais de X total". Exemplos:
  * "Cada time 3+ escanteios" -> representa que CADA equipe precisa ter
    pelo menos 3 escanteios (team_prop).
  * "Mais de 3 escanteios no jogo" -> representa um total combinado de
    escanteios na partida (match_prop).
- Quando o texto indicar algo para "cada time" ou "ambas as equipes", trate
  como um mercado de equipe (team_prop), deixando isso refletido em
  "estatistica" e "condicao".
- Quando o texto falar de totais do jogo ("total de gols", "total de
  escanteios"), trate como match_prop.
- Use o campo "periodo" para distinguir claramente se a aposta é para o
  jogo todo ou para trechos específicos (1º tempo, 2º tempo, 1º quarto, etc.).
  Quando o texto terminar com algo como "(DAL)", "(LAL)", "(BOS)" ou
  qualquer sequência de 2 a 4 letras maiúsculas entre parênteses NO FIM
  da linha, interprete isso como abreviação do time e preencha o campo
  "timeAbrev" com esse valor, sem tratá-lo como período.

Regras específicas para apostas de vencedor (winner/moneyline):
- Se uma linha começar com prefixos como:
  * "Vencedor - TIME"
  * "Winner - TEAM"
  * "Moneyline - TEAM"
  então trate essa aposta como:
  {
    "tipo": "winner",
    "time": "nome do time",
    "periodo": "Jogo"
  }
  e deixe "estatistica" e "condicao" vazios ou genéricos, sem tentar
  inventar linhas numéricas.

Regras adicionais:
- Não invente dados ausentes.
- Não junte múltiplas apostas em uma só.
- Ignore completamente odds, valores monetários e nomes da casa.
- Se não houver apostas válidas, devolva {"apostas": []}.
- O campo "confianca" DEVE ser preenchido com um dos valores: "alta", "media" ou "baixa".
  Use "media" como padrão quando não tiver segurança sobre o nível de confiança.
- Responda SEMPRE apenas o JSON, sem texto extra.`;

    const userPrompt = `Linhas extraídas do bilhete (podem ter apostas e outros textos):\n${contentLines}`;

    // Atualiza chave dinâmica se disponível
    if (this.getApiKey) this.apiKey = this.getApiKey();
    let res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      // Em caso de 429/401/403, tenta trocar de chave e refazer 1 vez
      if ((res.status === 429 || res.status === 401 || res.status === 403) && this.getApiKey) {
        const failedKey = this.apiKey;
        if (this.onKeyFailure) this.onKeyFailure(failedKey, res.status);
        this.apiKey = this.getApiKey();
        res = await fetch(GROQ_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.1,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        });
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Erro na chamada à API Groq: ${res.status} ${res.statusText} - ${text}`);
      }
    }

    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return { apostas: [] };
    }

    try {
      const parsed = JSON.parse(content) as ResultadoSemanticoLLM;
      if (!parsed || !Array.isArray(parsed.apostas)) {
        return { apostas: [] };
      }
      // Garantir que confianca sempre tenha um valor válido (fallback para "media")
      const apostasComFallback = parsed.apostas.map((a: any) => ({
        ...a,
        confianca: a.confianca && ["alta", "media", "baixa"].includes(a.confianca)
          ? a.confianca
          : "media",
      }));
      return { apostas: apostasComFallback };
    } catch {
      // Se a IA não respeitar o formato, voltamos com lista vazia
      return { apostas: [] };
    }
  }

  async callTicketParser(lines: string[]): Promise<BilheteFinal> {
    const prompt = `Você é um especialista em apostas esportivas.
Receberá TODAS as linhas de texto extraídas via OCR de um bilhete de aposta.
As linhas podem conter: cabeçalhos, metadados (esporte, torneio, valor,
odd, retorno), textos institucionais e, principalmente, descrições de
apostas. Ignore completamente layout visual, colunas, cores ou posição na
imagem: trabalhe apenas com o texto.

Sua tarefa é interpretar o bilhete COMPLETO e devolver EXCLUSIVAMENTE um
JSON válido no formato abaixo, SEM texto extra, explicações ou comentários.

Formato esperado (campos em português, todos opcionais; use null quando
não souber):
{
  "esporte": string | null,
  "torneio": string | null,
  "evento": string | null,
  "valorApostado": number | null,
  "odd": number | null,
  "retornoPotencial": number | null,
  "tipo": "Simples" | "Multipla" | "Pré" | "Ao vivo" | null,
  "data": string | null,
  "bonus": number | null,
  "apostasDetalhadas": [
    {
      "tipo": "player_prop" | "team_prop" | "match_prop" | "winner",
      "jogador": string | null,
      "estatistica": string,
      "condicao": string,
      "valor": number | null,
      "time": string | null,
      "timeAbrev": string | null,
      "periodo": "Jogo" | "1º Quarto" | "2º Quarto" | "1º Tempo" | "2º Tempo" | null,
      "confianca": "alta" | "media" | "baixa"
    }
  ]
}

Instruções de interpretação das apostas (INTENÇÃO):
- Identifique, para cada aposta, qual é o objeto principal:
  * jogador específico (player_prop),
  * equipe/time (team_prop),
  * estatística total da partida (match_prop).
- Diferencie corretamente frases como:
  * "Cada time 3+ escanteios" (cada equipe precisa alcançar 3 ou mais
    escanteios) -> trate como team_prop com condicao deixando claro
    "cada time 3+ escanteios".
  * "Mais de 3 escanteios no jogo" (total combinado de escanteios na
    partida) -> trate como match_prop.
- Use o campo "estatistica" para capturar o que está sendo medido
  (ex.: "Escanteios", "Gols", "Assistências", "Chutes a gol").
- Use o campo "condicao" para o limiar/condição numérica ou textual
  (ex.: "3+", ">= 5", "Duplo-duplo", "Cada time 2+ gols").
- Use o campo "periodo" para distinguir claramente se a aposta vale para
  o jogo inteiro ou apenas para um período (1º/2º tempo, 1º/2º quarto,
  etc.).
  Quando o texto terminar com algo como "(DAL)", "(LAL)", "(BOS)" ou
  qualquer sequência de 2 a 4 letras maiúsculas entre parênteses NO FIM
  da linha, interprete isso como abreviação do time e preencha o campo
  "timeAbrev" com esse valor, sem tratá-lo como período.

Instruções adicionais para apostas de vencedor (winner/moneyline):
- Se uma linha começar com prefixos como:
  * "Vencedor - TIME"
  * "Winner - TEAM"
  * "Moneyline - TEAM"
  então trate essa aposta como:
  {
    "tipo": "winner",
    "time": "nome do time",
    "periodo": "Jogo"
  }
  e não preencha "estatistica" ou "condicao" com números artificiais;
  a intenção é apenas indicar o vencedor da partida.

Instruções adicionais para identificar ESPORTE e EVENTO:
- PRIORIDADE 1: use os NOMES dos times/jogadores para inferir o esporte.
  Se os nomes forem de clubes de futebol (ex.: Inter de Milão, Liverpool, Juventus),
  defina o esporte como "Futebol" mesmo que haja palavras ambíguas.
- PRIORIDADE 2: se as linhas mencionarem estatísticas típicas de basquete
  ("ressaltos", "rebotes", "assistências", "pontos", "3PT" etc.),
  assuma "Basquete" apenas quando NÃO houver times claramente de futebol.
- Se as linhas mencionarem "gols", "escanteios", "cartões", "Ambas equipes marcam",
  ou termos como "placar", assuma "Futebol", a menos que haja evidência mais forte em contrário.
- Em caso de conflito entre palavras genéricas e nomes claros de equipes, priorize os nomes.
  Se ainda houver dúvida, devolva "esporte": null em vez de arriscar um esporte errado.

🔒 REGRA ABSOLUTA PARA O CAMPO "evento":
- O campo "evento" DEVE conter APENAS os nomes dos DOIS TIMES no formato "Time1 x Time2"
- ❌ NUNCA inclua nome de jogador no evento (ex: "Nikola Jokic x HOU Rockets" é ERRADO)
- ✅ O evento CORRETO seria apenas "Denver Nuggets x Houston Rockets"
- Se você encontrar linhas como "DEN Nuggets" ou "HOU Rockets", converta para nomes completos:
  * "DEN" ou "DEN Nuggets" → "Denver Nuggets"
  * "HOU" ou "HOU Rockets" → "Houston Rockets"
  * "LAL" ou "Lakers" → "Los Angeles Lakers"
  * "GSW" ou "Warriors" → "Golden State Warriors"
- O evento SEMPRE deve ser "Time Completo x Time Completo" (nunca jogador, nunca abreviação)
- Se não conseguir identificar dois times válidos, retorne "evento": null

🎯 REGRAS CRÍTICAS SOBRE PERÍODOS:
- Se uma aposta menciona EXPLICITAMENTE um período (ex: "1º Quarto - Jokic - 1+ Rebotes"), 
  preencha o campo "periodo" com o valor correspondente ("1º Quarto")
- Se uma aposta NÃO menciona período explícito (ex: "Nikola Jokic - 10+ Assistências"),
  deixe "periodo": null (isso significa jogo completo)
- ❌ NUNCA copie período de outra aposta ou infira período global
- ❌ NUNCA assuma que todas as apostas têm o mesmo período

🔥 REGRA CRÍTICA DE PARSING (linhas com período no início):
Quando linha começa com período, use este padrão:
"[PERÍODO] - [JOGADOR] - [ESTATÍSTICA] [CONDIÇÃO]"

Exemplos:
- "1º Quarto - Nikola Jokic - Rebotes 1+"
  → periodo: "1º Quarto", jogador: "Nikola Jokic", estatistica: "Rebotes", condicao: "1+"
  
- "HT - Nikola Jokic - Rebotes 1+"
  → periodo: "1º Tempo" (HT = HalfTime), jogador: "Nikola Jokic", estatistica: "Rebotes", condicao: "1+"
  
- "FT - Nikola Jokic - Assistências 5+"
  → periodo: "Jogo" (FT = FullTime), jogador: "Nikola Jokic", estatistica: "Assistências", condicao: "5+"

❌ ERRO COMUM: NÃO pegue a palavra do período como estatística!
- ERRADO: estatistica: "Quarto", periodo: "1º Quarto"
- CORRETO: estatistica: "Rebotes", periodo: "1º Quarto"

🎯 REGRAS CRÍTICAS SOBRE TIPOS DE APOSTAS:
- "Total Gols - Mais de 2.5" → match_prop, estatistica: "Total Gols" (MANTENHA "Total")
- "Total Escanteios - Mais de 10.5" → match_prop, estatistica: "Total Escanteios" (MANTENHA "Total")
- "Nikola Jokic - 10+ Rebotes" → player_prop (estatística de UM JOGADOR)
- "Cada time 4+ escanteios" → team_prop (cada time precisa atingir)
- ⚠️ IMPORTANTE: Para mercados "Total X", SEMPRE mantenha a palavra "Total" na estatística
- ❌ NUNCA misture: "Total Gols" com jogador = SEMPRE match_prop, NUNCA player_prop

📚 EXEMPLOS DE INTERPRETAÇÃO CORRETA:

Exemplo 1 - Basquete (períodos diferentes):
Linhas:
- Nikola Jokic - 10+ Assistências
- Nikola Jokic - 10+ Rebotes  
- 1° Quarto - Nikola Jokic - 1+ Rebotes

Resposta CORRETA:
{
  "apostasDetalhadas": [
    {"tipo": "player_prop", "jogador": "Nikola Jokic", "estatistica": "Assistências", 
     "condicao": "10+", "periodo": null, "confianca": "alta"},
    {"tipo": "player_prop", "jogador": "Nikola Jokic", "estatistica": "Rebotes",
     "condicao": "10+", "periodo": null, "confianca": "alta"},
    {"tipo": "player_prop", "jogador": "Nikola Jokic", "estatistica": "Rebotes",
     "condicao": "1+", "periodo": "1º Quarto", "confianca": "alta"}
  ]
}

Exemplo 2 - Futebol (match_prop vs player_prop):
Linhas:
- Juventus x Pafos
- Vencedor do 1° Tempo - Juventus
- Total Gols - Mais de 2.5
- Francisco Conceição (JUV) - Chutar a Gol

Resposta CORRETA:
{
  "evento": "Juventus x Pafos",
  "apostasDetalhadas": [
    {"tipo": "winner", "time": "Juventus", "periodo": "1º Tempo", 
     "estatistica": "", "condicao": "", "confianca": "alta"},
    {"tipo": "match_prop", "jogador": null, "estatistica": "Total Gols",
     "condicao": "Mais de 2.5", "periodo": "Jogo", "confianca": "alta"},
    {"tipo": "player_prop", "jogador": "Francisco Conceição", "estatistica": "Chutar a Gol",
     "condicao": "", "periodo": "Jogo", "timeAbrev": "JUV", "confianca": "alta"}
  ]
}

Exemplo 3 - Basquete (sintaxes alternativas de período):
Linhas:
- 1º Quarto
- Nikola Jokic - Rebotes 1+

Resposta CORRETA (período na linha anterior se aplica):
{
  "apostasDetalhadas": [
    {"tipo": "player_prop", "jogador": "Nikola Jokic", "estatistica": "Rebotes",
     "condicao": "1+", "periodo": "1º Quarto", "confianca": "media"}
  ]
}

Exemplo 4 - Basquete (HT/FT são períodos):
Linhas:
- HT
- Nikola Jokic - Rebotes 1+

Resposta CORRETA (HT = 1º Tempo):
{
  "apostasDetalhadas": [
    {"tipo": "player_prop", "jogador": "Nikola Jokic", "estatistica": "Rebotes",
     "condicao": "1+", "periodo": "1º Tempo", "confianca": "media"}
  ]
}

Exemplo 5 - Basquete (FT = jogo completo):
Linhas:
- FT
- Nikola Jokic - Rebotes 1+

Resposta CORRETA (FT = Jogo):
{
  "apostasDetalhadas": [
    {"tipo": "player_prop", "jogador": "Nikola Jokic", "estatistica": "Rebotes",
     "condicao": "1+", "periodo": "Jogo", "confianca": "media"}
  ]
}

❌ ERRO COMUM: NÃO faça assim:
{"tipo": "player_prop", "jogador": "Francisco Conceição", "estatistica": "Gols", ...}
✅ CORRETO: Total Gols é SEMPRE match_prop, mesmo com jogador no contexto

Regras gerais adicionais:
- Use ponto como separador decimal (ex: 1.85, 120.5).
- Não invente valores: se não tiver certeza, use null.
- Quando houver múltiplas apostas (combinadas), descreva cada uma em
  "apostasDetalhadas".
- O campo "confianca" em cada aposta DEVE ser preenchido com um dos valores: 
  "alta", "media" ou "baixa". Use "media" como padrão quando não tiver 
  segurança sobre o nível de confiança.
- Não inclua comentários, markdown, código TypeScript ou texto fora do
  JSON.

Agora, aqui estão as linhas do bilhete (uma por linha):
${lines.join("\n")}`;

    // Atualiza chave dinâmica se disponível
    if (this.getApiKey) this.apiKey = this.getApiKey();
    let res = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Você analisa bilhetes de apostas esportivas a partir de texto OCR e responde apenas com JSON válido.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      // Em caso de 429/401/403, tenta trocar de chave e refazer 1 vez
      if ((res.status === 429 || res.status === 401 || res.status === 403) && this.getApiKey) {
        const failedKey = this.apiKey;
        if (this.onKeyFailure) this.onKeyFailure(failedKey, res.status);
        this.apiKey = this.getApiKey();
        res = await fetch(GROQ_ENDPOINT, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            temperature: 0.2,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  "Você analisa bilhetes de apostas esportivas a partir de texto OCR e responde apenas com JSON válido.",
              },
              { role: "user", content: prompt },
            ],
          }),
        });
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Erro na chamada à API Groq (ticket): ${res.status} ${res.statusText} - ${text}`);
      }
    }

    const json: any = await res.json();
    const content = json?.choices?.[0]?.message?.content;

    if (typeof content !== "string") {
      return {
        esporte: null,
        torneio: null,
        evento: null,
        valorApostado: null,
        odd: null,
        retornoPotencial: null,
        tipo: null,
        data: null,
        bonus: null,
        aposta: "",
        mercado: "",
        apostasDetalhadas: [],
      };
    }

    try {
      const parsed = JSON.parse(content) as BilheteFinal;
      // Garantir que confianca sempre tenha um valor válido em apostasDetalhadas
      const apostasComFallback = (Array.isArray(parsed.apostasDetalhadas)
        ? parsed.apostasDetalhadas
        : []
      ).map((a: any) => ({
        ...a,
        confianca: a.confianca && ["alta", "media", "baixa"].includes(a.confianca)
          ? a.confianca
          : "media",
      }));
      
      return {
        esporte: parsed.esporte ?? null,
        torneio: parsed.torneio ?? null,
        evento: parsed.evento ?? null,
        valorApostado: parsed.valorApostado ?? null,
        odd: parsed.odd ?? null,
        retornoPotencial: parsed.retornoPotencial ?? null,
        tipo: parsed.tipo ?? null,
        data: parsed.data ?? null,
        bonus: parsed.bonus ?? null,
        aposta: parsed.aposta ?? "",
        mercado: parsed.mercado ?? "",
        apostasDetalhadas: apostasComFallback,
      };
    } catch {
      return {
        esporte: null,
        torneio: null,
        evento: null,
        valorApostado: null,
        odd: null,
        retornoPotencial: null,
        tipo: null,
        data: null,
        bonus: null,
        aposta: "",
        mercado: "",
        apostasDetalhadas: [],
      };
    }
  }
}

export function createGroqLlmClient(options: GroqLlmClientOptions = {}): GroqLlmClient {
  // Se já recebeu getApiKey/apiKey, apenas repassa
  if (options.apiKey || options.getApiKey) {
    return new GroqLlmClient(options);
  }

  // Lê múltiplas chaves do env (GROQ_API_KEYS ou GROQ_API_KEY)
  const keys = readKeysFromEnv(process.env);
  if (keys.length > 0) {
    const rateLimitMs = Number(process.env.GROQ_RATE_LIMIT_COOLDOWN_MS || "") || undefined;
    const rotator = new KeyRotator({ keys, rateLimitCooldownMs: rateLimitMs });
    return new GroqLlmClient({
      getApiKey: () => rotator.nextKey(),
      onKeyFailure: (key, status) => rotator.recordFailure(key, status),
    });
  }

  // Mantém comportamento anterior (vai lançar se não houver chave)
  return new GroqLlmClient({});
}
