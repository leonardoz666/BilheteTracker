// Sistema de rotação de chaves API com backoff/cooldown
// - Round-robin entre chaves disponíveis
// - Marca chave em cooldown ao receber 429/401/403/5xx
// - Respeita tempo de cooldown configurável por tipo de erro

export type KeyRotationOptions = {
  keys: string[];
  defaultCooldownMs?: number; // usado para 5xx ou erros genéricos
  rateLimitCooldownMs?: number; // usado para 429
  authCooldownMs?: number; // usado para 401/403
  maxConsecutiveFailuresPerKey?: number;
};

type KeyState = {
  key: string;
  cooldownUntil: number; // epoch ms
  failures: number;
};

export class KeyRotator {
  private states: KeyState[];
  private callCounter = 0; // Contador atômico para distribuir chaves entre chamadas concorrentes
  private readonly defaultCooldownMs: number;
  private readonly rateLimitCooldownMs: number;
  private readonly authCooldownMs: number;
  private readonly maxConsecutiveFailuresPerKey: number;

  constructor(opts: KeyRotationOptions) {
    const uniqKeys = Array.from(new Set((opts.keys || []).map(k => (k || "").trim()).filter(Boolean)));
    if (uniqKeys.length === 0) {
      throw new Error("KeyRotator: nenhuma chave fornecida");
    }
    this.states = uniqKeys.map(k => ({ key: k, cooldownUntil: 0, failures: 0 }));
    this.defaultCooldownMs = opts.defaultCooldownMs ?? 30_000;
    this.rateLimitCooldownMs = opts.rateLimitCooldownMs ?? 30_000;
    this.authCooldownMs = opts.authCooldownMs ?? 10 * 60_000;
    this.maxConsecutiveFailuresPerKey = opts.maxConsecutiveFailuresPerKey ?? 3;
  }

  // Seleciona a próxima chave disponível (fora de cooldown)
  // Usa contador para distribuir chaves entre chamadas concorrentes
  nextKey(): string {
    const now = Date.now();
    const n = this.states.length;
    const startIdx = this.callCounter++ % n; // Incrementa e usa como ponto de partida
    
    // Procura primeira chave disponível a partir do startIdx
    for (let i = 0; i < n; i++) {
      const idx = (startIdx + i) % n;
      const st = this.states[idx];
      if (st.cooldownUntil <= now) {
        return st.key;
      }
    }
    
    // Se todas em cooldown, pega a que sai primeiro
    let earliestIdx = 0;
    for (let i = 1; i < n; i++) {
      if (this.states[i].cooldownUntil < this.states[earliestIdx].cooldownUntil) {
        earliestIdx = i;
      }
    }
    return this.states[earliestIdx].key;
  }

  // Registra sucesso e reseta falhas
  recordSuccess(key: string) {
    const st = this.states.find(s => s.key === key);
    if (st) st.failures = 0;
  }

  // Registra falha, aplica cooldown apropriado
  recordFailure(key: string, status?: number) {
    const st = this.states.find(s => s.key === key);
    if (!st) return;
    st.failures++;
    // Todos os erros usam o mesmo cooldown (prioriza rateLimitCooldownMs)
    const ms = this.rateLimitCooldownMs ?? this.defaultCooldownMs;
    const now = Date.now();
    // Não ampliar cooldown por falhas consecutivas: sempre aplica ms fixo
    st.cooldownUntil = Math.max(st.cooldownUntil, now + ms);
  }

  // Permite substituir o conjunto de chaves em runtime
  updateKeys(keys: string[]) {
    const uniqKeys = Array.from(new Set((keys || []).map(k => (k || "").trim()).filter(Boolean)));
    if (uniqKeys.length === 0) return;
    const map = new Map(this.states.map(s => [s.key, s]));
    this.states = uniqKeys.map(k => {
      const prev = map.get(k);
      return prev ? prev : { key: k, cooldownUntil: 0, failures: 0 };
    });
    this.callCounter = 0;
  }
}

// Helper para ler múltiplas chaves de env: GROQ_API_KEYS (CSV) fallback para GROQ_API_KEY
export function readKeysFromEnv(env: NodeJS.ProcessEnv): string[] {
  const multi = env.GROQ_API_KEYS || env.GROQ_API_KEYS_CSV;
  if (multi) {
    return multi
      .split(/[,;\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }
  const single = env.GROQ_API_KEY;
  return single ? [single] : [];
}
