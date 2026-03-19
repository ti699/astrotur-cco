/**
 * codigoSocorro.test.cjs
 * Testes unitários do Código de Socorro ASTRO.TRF.XXX-D.
 * Importa codigoSocorroUtils — sem Supabase, sem rede.
 * Rodar de dentro de backend/: node tests/codigoSocorro.test.cjs
 */
"use strict";
require("dotenv").config();
const os = require("os");
const path = require("path");
const fs = require("fs");

const TMP = path.join(os.tmpdir(), "socorro_test_" + Date.now() + ".json");

const {
  calcularDigito, formatarCodigo, chaveAnoMes,
  proximoSeqArquivo, DIGITO_VERIFICADOR_FIXO,
} = require("../services/codigoSocorroUtils");

const seq = (anoMes) => proximoSeqArquivo(anoMes, TMP);

let passou = 0; let falhou = 0;
function assert(desc, ok)    { if(ok){ console.log("  \u2705 "+desc); passou++; } else { console.error("  \u274c "+desc); falhou++; } }
function assertThrows(desc, fn) { try{ fn(); console.error("  \u274c "+desc+" (nao lancou)"); falhou++; } catch{ console.log("  \u2705 "+desc); passou++; } }

console.log("\n\u2550".repeat(46));
console.log(" Testes - Codigo de Socorro ASTRO.TRF.XXX-D");
console.log("\u2550".repeat(46));

console.log("\n\ud83e\uddea chaveAnoMes()");
assert('Jan/2026 = "2026-01"', chaveAnoMes(new Date(2026, 0, 15)) === "2026-01");
assert('Mar/2026 = "2026-03"', chaveAnoMes(new Date(2026, 2, 1)) === "2026-03");
assert('Dez/2025 = "2025-12"', chaveAnoMes(new Date(2025, 11, 31)) === "2025-12");

console.log("\n\ud83e\uddea calcularDigito()");
if (DIGITO_VERIFICADOR_FIXO) {
  assert("Abordagem A: seq 1   -> 0", calcularDigito(1)   === 0);
  assert("Abordagem A: seq 123 -> 0", calcularDigito(123) === 0);
  assert("Abordagem A: seq 999 -> 0", calcularDigito(999) === 0);
} else {
  assert("Abordagem B: seq 1   -> 1", calcularDigito(1)   === 1);
  assert("Abordagem B: seq 123 -> 6", calcularDigito(123) === 6);
  assert("Abordagem B: seq 999 -> 7", calcularDigito(999) === 7);
}

console.log("\n\ud83e\uddea formatarCodigo()");
const c1 = formatarCodigo(1); const c42 = formatarCodigo(42); const c999 = formatarCodigo(999);
assert('seq 1   starts "ASTRO.TRF.001-"', c1.startsWith("ASTRO.TRF.001-"));
assert('seq 42  starts "ASTRO.TRF.042-"', c42.startsWith("ASTRO.TRF.042-"));
assert('seq 999 starts "ASTRO.TRF.999-"', c999.startsWith("ASTRO.TRF.999-"));
assert("comprimento = 15 chars",           c1.length === 15);
assert("digito final 0-9",                 /^\d$/.test(c1.slice(-1)));
assert("regex ASTRO.TRF.NNN-D",            /^ASTRO\.TRF\.\d{3}-\d$/.test(c1));

console.log("\n\ud83e\uddea proximoSeqArquivo() - incremento");
if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
assert("1a chamada = 1", seq("2026-03") === 1);
assert("2a chamada = 2", seq("2026-03") === 2);
assert("3a chamada = 3", seq("2026-03") === 3);

console.log("\n\ud83e\uddea proximoSeqArquivo() - reinicio mensal");
assert("Mes novo 2026-04, 1a = 1", seq("2026-04") === 1);
assert("Mes novo 2026-04, 2a = 2", seq("2026-04") === 2);
assert("Mes novo 2026-05, 1a = 1", seq("2026-05") === 1);

console.log("\n\ud83e\uddea proximoSeqArquivo() - limite 999");
fs.writeFileSync(TMP, JSON.stringify({ anoMes: "2026-06", seq: 999 }));
assertThrows("Seq 1000 no mesmo mes lanca excecao", () => seq("2026-06"));

console.log("\n\ud83e\uddea Codigo completo via fallback");
if (fs.existsSync(TMP)) fs.unlinkSync(TMP);
const cod = formatarCodigo(seq("2026-03"));
assert('"' + cod + '" bate regex ASTRO.TRF.NNN-D', /^ASTRO\.TRF\.\d{3}-\d$/.test(cod));

try { fs.unlinkSync(TMP); } catch {}

console.log("\n" + "\u2550".repeat(46));
console.log("Resultado: " + passou + " passou | " + falhou + " falhou");
if (falhou === 0) { console.log("\u2705 Todos os testes passaram!\n"); }
else { console.error("\u274c " + falhou + " falhou.\n"); process.exit(1); }

