// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/* O site tem dois destinos: parket.com.br, na raiz do domínio, e o GitHub
   Pages do repositório, que serve em /parket-arquitetura/. Quem manda são as
   variáveis que o workflow do Pages define a partir do próprio ambiente — sem
   elas, o build é o de produção e nada muda. */
const SITE = process.env.SITE ?? 'https://parket.com.br';
const BASE = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: SITE,
  base: BASE,
  // O harness de preview atribui a porta via PORT; sem isso o dev server
  // sobe em 4321+1 e o preview aponta para o lugar errado.
  server: { port: process.env.PORT ? Number(process.env.PORT) : 4321 },
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'auto' },
  image: {
    // As fotos ainda vêm do WordPress atual. Autorizar o domínio permite que o
    // pipeline do Astro gere AVIF/WebP + srcset a partir delas.
    domains: ['parket.com.br'],
    remotePatterns: [{ protocol: 'https', hostname: 'parket.com.br' }],
  },
  integrations: [
    sitemap({
      // Duas páginas. A home carrega o conteúdo todo; /contato é o destino da
      // conversão e continua valendo indexar por conta própria.
      serialize: (item) => ({
        ...item,
        priority: item.url.replace(/\/$/, '').endsWith('/contato') ? 0.8 : 1.0,
        changefreq: 'monthly',
      }),
    }),
  ],
  devToolbar: { enabled: false },
});
