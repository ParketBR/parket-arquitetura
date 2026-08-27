/**
 * Gera a imagem de prévia do link (Open Graph).
 *
 * Por que um arquivo gerado e não a foto do hero direto: o `og:image` que
 * estava no ar apontava para https://parket.com.br/FOTO%20HERO.jpg — 1,18 MB.
 * O WhatsApp desiste de baixar a prévia acima de ~300 KB e mostra só o texto,
 * que era exatamente o sintoma. Aqui a mesma foto sai em 1200×630 (a proporção
 * 1,91:1 que Facebook, WhatsApp, LinkedIn e Telegram esperam) e abaixo de
 * 200 KB, com a marca e a frase do hero compostas por cima.
 *
 *   node scripts/og.mjs
 *
 * Roda à mão quando a arte mudar; o resultado é versionado em public/.
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const L = 1200, A = 630;
const FONTE = "'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif";

/* Os mesmos scrims do hero, na mesma ordem: base plana para o mínimo, e o
   gradiente de baixo protegendo a zona do texto. */
const camada = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}">
  <defs>
    <linearGradient id="base" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%"   stop-color="#0D0D0D" stop-opacity=".78"/>
      <stop offset="42%"  stop-color="#0D0D0D" stop-opacity=".34"/>
      <stop offset="72%"  stop-color="#0D0D0D" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="topo" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"  stop-color="#0D0D0D" stop-opacity=".44"/>
      <stop offset="26%" stop-color="#0D0D0D" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${L}" height="${A}" fill="#0D0D0D" opacity=".22"/>
  <rect width="${L}" height="${A}" fill="url(#base)"/>
  <rect width="${L}" height="${A}" fill="url(#topo)"/>

  <text x="72" y="86" font-family="${FONTE}" font-size="21" font-weight="300"
        letter-spacing="7.1" fill="#FFFFFF">PARKET</text>

  <text x="72" y="470" font-family="${FONTE}" font-size="72" font-weight="200"
        letter-spacing="-1.8" fill="#E8E4DF">Madeira para</text>
  <text x="72" y="546" font-family="${FONTE}" font-size="72" font-weight="200"
        letter-spacing="-1.8" fill="#E8E4DF">arquitetura.</text>

  <rect x="72" y="576" width="64" height="1" fill="#9C8B6E"/>
</svg>`);

await mkdir('public', { recursive: true });

const info = await sharp('src/assets/hero-poster.webp')
  .resize(L, A, { fit: 'cover', position: 'attention' })
  .composite([{ input: camada, top: 0, left: 0 }])
  .jpeg({ quality: 82, progressive: true, chromaSubsampling: '4:4:4' })
  .toFile('public/og-parket.jpg');

console.log(`public/og-parket.jpg · ${info.width}×${info.height} · ${(info.size / 1024).toFixed(0)} KB`);
