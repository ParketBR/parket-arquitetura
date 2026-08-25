// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://parket.com.br',
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
