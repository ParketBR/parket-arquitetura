/**
 * As fotos das coleções Brazil, Eternos e Únicos são arquivos locais em
 * src/assets/colecoes/. Passam pelo pipeline do Astro (AVIF/WebP + srcset).
 * As demais são URLs remotas de parket.com.br, autorizadas em astro.config.mjs.
 */
import type { ImageMetadata } from 'astro';

/* Duas pastas, e não uma glob de src/assets inteira: as texturas têm o
   próprio caminho de importação no Texturas.astro, e varrer tudo aqui faria o
   Astro carregar as 22 em qualquer página que use uma foto de coleção. */
const locais = import.meta.glob<{ default: ImageMetadata }>(
  ['/src/assets/colecoes/**/*.webp', '/src/assets/blog/**/*.webp'],
  { eager: true },
);

export const ehRemota = (src: string) => /^https?:\/\//.test(src);

/** Aceita "colecoes/brazil/01.webp" e devolve o asset importado. */
export function assetLocal(src: string): ImageMetadata | null {
  return locais[`/src/assets/${src}`]?.default ?? null;
}

/** Primeira foto utilizável de uma lista, priorizando as locais otimizadas. */
export function primeiraFoto(fotos: string[]): string | null {
  return fotos.find((f) => !ehRemota(f)) ?? fotos[0] ?? null;
}
