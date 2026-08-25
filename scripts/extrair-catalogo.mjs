/**
 * Lê o catalogo.js dos repositórios de catálogo e extrai o dataset bruto
 * (categorias, coleções, specs e fotos com o nome da referência).
 * Fonte: ~/Documents/catalogo atualizado/pisos geral/Catalogo-Pisos-geral/catalogo.js
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.argv[2];
const OUT = process.argv[3];

const raw = readFileSync(SRC, 'utf8');
const start = raw.indexOf('const ALL_PRODUCTS = [');
const open = raw.indexOf('[', start);

// varredura equilibrando colchetes, ignorando strings e comentários
let depth = 0, i = open, inStr = null, inLine = false, inBlock = false;
for (; i < raw.length; i++) {
  const c = raw[i], n = raw[i + 1];
  if (inLine) { if (c === '\n') inLine = false; continue; }
  if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
  if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
  if (c === '/' && n === '/') { inLine = true; i++; continue; }
  if (c === '/' && n === '*') { inBlock = true; i++; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) break; }
}

const literal = raw.slice(open, i + 1);
const products = new Function(`return ${literal}`)();

writeFileSync(OUT, JSON.stringify(products, null, 2));

const conta = (p) =>
  (p.images?.length ?? 0) +
  (p.collections ?? []).reduce((a, c) => a + (c.images?.length ?? 0), 0);

console.log(`${products.length} categorias extraídas`);
for (const p of products) {
  const cols = p.collections?.length ?? 0;
  console.log(`  ${p.key.padEnd(10)} ${String(cols).padStart(2)} coleções  ${String(conta(p)).padStart(3)} fotos`);
}
