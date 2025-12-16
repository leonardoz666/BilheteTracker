# bilhete-tracker

Pipeline em Node.js + TypeScript para processar bilhetes de apostas esportivas a partir de OCR do serviço OCR.space (engine 2).

## Visão geral da arquitetura

O sistema é organizado em um pipeline de 4 etapas:

1. **Normalização OCR (local)** – Converte o resultado do OCR.space em um array de linhas de texto limpas, removendo:
   - Botões (ex.: COMPARTILHAR, ENCERRAR, CASH OUT)
   - Odds duplicadas ou linhas que são apenas odds
   - Textos institucionais (ex.: "Jogue com responsabilidade")
   - Ruídos visuais repetidos
2. **Extração de Metadados (local)** – Usa regex simples para extrair apenas:
   - Esporte
   - Torneio
   - Evento
   - Valor Apostado
   - Odd
   - Retorno Potencial
   - Tipo (Simples, Múltipla, Pré, Ao vivo)
   - Data
   - Bônus
3. **Parser Semântico de Apostas (LLM)** – Recebe somente linhas que representam apostas e delega a interpretação para um LLM (aqui mockado). Essa etapa gera uma estrutura JSON com apostas normalizadas.
4. **Formatter Final do Bilhete (local)** – Reconstrói todo o texto final do zero, sem reutilizar o texto bruto do OCR, montando campos previsíveis (Aposta, Mercado, etc.).

## Por que o sistema não depende de layout

O OCR.space entrega, além de coordenadas X/Y, o campo `ParsedText` e o overlay `ParsedResults[].Overlay.Lines[].LineText`. Este projeto **nunca** utiliza coordenadas (Left, Top, Width, Height) para lógica. Em vez disso:

- A etapa de normalização usa apenas texto puro: quebra em linhas, limpa e filtra.
- Todas as regras de extração (metadados, apostas) são baseadas em padrões de texto (regex, palavras-chave).
- Isso garante que o sistema funcione mesmo quando:
  - O layout muda entre diferentes casas de aposta.
  - A ordem das linhas no OCR varia.
  - Há ruídos gráficos ou elementos de UI (botões, banners).

O foco é sempre o **conteúdo textual** e não a posição visual.

## Por que ParsedText é prioritário

O OCR.space engine 2 fornece:

- `ParsedResults[].ParsedText` – bloco único de texto com quebras de linha.
- `ParsedResults[].TextOverlay.Lines[].LineText` – linhas individuais com coordenadas.

Neste projeto:

1. A normalização tenta **primeiro** usar `ParsedText` como fonte principal, pois:
   - É mais estável entre diferentes resoluções e cortes de imagem.
   - Já agrega o conteúdo lógico em um fluxo contínuo de texto.
2. Se `ParsedText` estiver vazio ou inutilizável, o sistema faz **fallback** para `Overlay.Lines[].LineText`.
3. Em ambos os casos, as coordenadas são ignoradas e apenas o `LineText` é utilizado.

Essa estratégia simplifica o código e reduz a dependência de detalhes do engine de OCR.

## Onde entra o LLM

O LLM é utilizado **somente** na etapa 3 do pipeline, o parser semântico de apostas:

- Entrada do LLM:
  - Apenas linhas classificadas como apostas, por exemplo:
    - "Jogador ressaltos → Flagg, Cooper 7+ (DAL)"
    - "Jogador assistências → Flagg, Cooper 5+"
  - Sem odds, sem valores, sem textos institucionais.
  - Sem metadados financeiros (Valor Apostado, Retorno, Bônus etc.).
- Saída esperada (schema simplificado):

```json
{
  "apostas": [
    {
      "tipo": "player_prop" | "team_prop" | "match_prop",
      "jogador": "string | null",
      "estatistica": "string",
      "condicao": "string",
      "valor": "number | null",
      "periodo": "Jogo | 1º Quarto | 2º Quarto | 1º Tempo | 2º Tempo | null",
      "confianca": "alta | media | baixa"
    }
  ]
}
```

Neste repositório, o arquivo `src/utils/llmClient.ts` implementa um **MockLlmClient** baseado em heurísticas simples, para rodar localmente sem fazer chamadas externas. Em produção, você pode substituir essa implementação por uma chamada HTTP para um backend (por exemplo, o projeto BackTrack) que encapsule o modelo Groq **llama-3.1-8b-instant**.

## Como adicionar novas casas de aposta

Como o sistema não depende de layout, a adaptação para novas casas de aposta é feita principalmente ajustando regras de texto nas camadas locais:

1. **Normalização de OCR** (`src/ocr/normalizeOcr.ts`)
   - Adicionar novas palavras-chave de botões ou textos institucionais específicos da casa.
   - Ajustar regras que identificam linhas que são apenas odds.
2. **Extração de Metadados** (`src/pipeline/extractMetadata.ts`)
   - Incluir novos padrões de regex para formatos diferentes de:
     - Valor apostado
     - Retorno potencial
     - Bônus
     - Nomes de torneios ou descrições de tipo de aposta (Simples, Múltipla etc.).
3. **Extração de Linhas de Apostas** (`src/pipeline/extractRawBets.ts`)
   - Adicionar palavras-chave de mercados usados pela nova casa (ex.: "cantos", "escanteios asiáticos", etc.).

A etapa LLM permanece a mesma, pois recebe sempre um conjunto de linhas já filtradas que representam apostas, independente da origem.

## Exemplo obrigatório

Entrada OCR (ParsedText):

```text
Jogador ressaltos → Flagg, Cooper 7+ (DAL)
Jogador assistências → Flagg, Cooper 5+
```

Execução local com `npm start` usa exatamente esse exemplo de entrada e retorna um JSON que inclui, entre outros campos, algo equivalente a:

- **Aposta**:
  - `Flagg, Cooper - Mais de 7+ Ressaltos / Flagg, Cooper - Mais de 5+ Assistências`
- **Mercado**:
  - `Ressaltos / Assistências`

A reconstrução dessa string é feita em `src/pipeline/formatterFinal.ts` a partir das apostas semânticas retornadas pela camada de LLM (mock).

## Integração com BackTrack e RealTrack

- **BackTrack (backend)**: você pode criar um endpoint HTTP que receba o JSON do OCR.space, construa um `NormalizationInput` e chame `processBilhete(...)` exposto por `src/index.ts`. Esse endpoint poderia, por exemplo, salvar os bilhetes normalizados em banco (via Prisma/BackTrack) e orquestrar as chamadas ao LLM real.
- **RealTrack (frontend)**: o frontend pode consumir o resultado já padronizado (schema `BilheteFinal`), exibindo sempre os mesmos campos independentes da casa de aposta ou do layout original.

## Como rodar o projeto

### Desenvolvimento (Mock/Testes)

Dentro da pasta `bilhete-tracker`:

```bash
npm install
npm start
```

O comando `npm start` executa o exemplo padrão definido em `src/index.ts`, usando **MockLlmClient** (sem precisar de chave Groq).

### Produção (Groq Real)

Para usar o **Groq API real** em vez do mock:

1. **Obtenha uma chave API Groq**:
   - Visite https://console.groq.com
   - Crie uma account gratuita
   - Copie a chave API

2. **Configure a chave**:
   ```bash
   # Opção 1: Variável de ambiente
   export GROQ_API_KEY="sua_chave_aqui"
   
   # Opção 2: Arquivo .env
   cp .env.example .env
   # Edite .env e substitua "sua_chave_groq_aqui" pela sua chave real
   ```

3. **Execute com Groq**:
   ```bash
   # A partir de agora, o sistema usará GroqClient real
   npm start
   
   # Ou execute o exemplo específico
   npx ts-node example-groq.ts
   ```

### Testes

```bash
npm test           # Roda todos os testes (usa MockLlmClient automaticamente)
npm test -- --watch  # Modo watch
```

O `MockLlmClient` é usado automaticamente durante testes, mesmo que `GROQ_API_KEY` esteja definida, pois é mais rápido e não consome quotas da API.
