import { ApostaSemantica } from "../../schema/bilhete.schema";
import { formatNBA } from "./formatterNBA";
import { formatFutebol } from "./formatterFutebol";
import { formatNFL } from "./formatterNFL";
import { formatDefault } from "./formatterDefault";

/**
 * Router de formatação por esporte
 * Distribui apostas para o formatter correto
 */
export function formatAposta(
  aposta: ApostaSemantica,
  esporte?: string
): string {
  const esporteNormalizado = (esporte || "").toLowerCase().trim();

  switch (esporteNormalizado) {
    case "nba":
    case "basquete":
    case "basketball":
      return formatNBA(aposta);

    case "futebol":
    case "soccer":
    case "football":
      return formatFutebol(aposta);

    case "futebol americano":
    case "nfl":
    case "american football":
      return formatNFL(aposta);

    default:
      return formatDefault(aposta);
  }
}
