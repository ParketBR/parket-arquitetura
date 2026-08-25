/**
 * Calcula o tom médio de cada textura e devolve a ordem do mais claro ao mais
 * escuro, em L* (CIELAB) — que é onde "mais claro" corresponde ao que o olho vê,
 * diferente da média de RGB.
 *
 *   node scripts/tons.mjs > src/data/tons.json
 */
import sharp from 'sharp';
import { readdirSync } from 'node:fs';

const DIR = 'src/assets/texturas';

const srgb = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const f = (t) => (t > (6 / 29) ** 3 ? Math.cbrt(t) : t / (3 * (6 / 29) ** 2) + 4 / 29);

function lab(r, g, b) {
  const [R, G, B] = [srgb(r), srgb(g), srgb(b)];
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const [fx, fy, fz] = [f(X), f(Y), f(Z)];
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

const saida = [];
for (const arquivo of readdirSync(DIR).filter((n) => n.endsWith('.webp'))) {
  const { channels } = await sharp(`${DIR}/${arquivo}`).stats();
  const [r, g, b] = channels.map((c) => c.mean);
  const { L, a, b: bb } = lab(r, g, b);
  saida.push({
    id: arquivo.replace('.webp', ''),
    hex: '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase(),
    L: +L.toFixed(1),
    croma: +Math.hypot(a, bb).toFixed(1),
  });
}

saida.sort((x, y) => y.L - x.L);   // do mais claro ao mais escuro
process.stdout.write(JSON.stringify(saida, null, 2));
