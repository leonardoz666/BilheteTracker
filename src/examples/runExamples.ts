import fs from "fs";
import path from "path";
import { NormalizationInput } from "../schema/bilhete.schema";
import { processBilhete } from "..";

async function runFromFile(filePath: string): Promise<void> {
  const abs = path.resolve(filePath);
  const content = fs.readFileSync(abs, "utf8");

  const input: NormalizationInput = {
    kind: "parsedText",
    payload: content,
  };

  const result = await processBilhete(input);
  console.log(`\n==== Resultado para ${path.basename(filePath)} ====\n`);
  console.log(JSON.stringify(result, null, 2));
}

async function main(): Promise<void> {
  const baseDir = path.resolve(__dirname, "../../examples");
  const files = fs.readdirSync(baseDir).filter((f) => f.endsWith(".txt"));

  if (!files.length) {
    console.log("Nenhum exemplo encontrado em ./examples");
    return;
  }

  for (const file of files) {
    await runFromFile(path.join(baseDir, file));
  }
}

main().catch((err) => {
  console.error("Erro ao rodar exemplos:", err);
  process.exitCode = 1;
});
