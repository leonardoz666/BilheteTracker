"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const __1 = require("..");
async function runFromFile(filePath) {
    const abs = path_1.default.resolve(filePath);
    const content = fs_1.default.readFileSync(abs, "utf8");
    const input = {
        kind: "parsedText",
        payload: content,
    };
    const result = await (0, __1.processBilhete)(input);
    console.log(`\n==== Resultado para ${path_1.default.basename(filePath)} ====\n`);
    console.log(JSON.stringify(result, null, 2));
}
async function main() {
    const baseDir = path_1.default.resolve(__dirname, "../../examples");
    const files = fs_1.default.readdirSync(baseDir).filter((f) => f.endsWith(".txt"));
    if (!files.length) {
        console.log("Nenhum exemplo encontrado em ./examples");
        return;
    }
    for (const file of files) {
        await runFromFile(path_1.default.join(baseDir, file));
    }
}
main().catch((err) => {
    console.error("Erro ao rodar exemplos:", err);
    process.exitCode = 1;
});
