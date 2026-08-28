// @ts-check
import { readdirSync, readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/* ─── Datas dos posts, lidas do frontmatter ───
   O sitemap saía sem `lastmod` nenhum, e é o único campo dele que o Google
   diz usar de verdade — `priority` e `changefreq` ele ignora há anos. Sem
   data, um post revisado ontem tem o mesmo peso de rastreio de um de 2024.

   A leitura é feita com fs, e não pela coleção de conteúdo: o `serialize` do
   sitemap roda na configuração, onde `astro:content` ainda não existe. São
   duas linhas de regex sobre o frontmatter, e o `atualizado` ganha do `data`
   quando existir — a mesma regra da página do post.

   Só os posts entram. Home, contato e índice do blog mudam quando alguém
   mexe no layout, e não há data honesta para declarar: melhor omitir do que
   carimbar a data do build em página que não mudou. */
const PASTA_BLOG = new URL('./src/content/blog/', import.meta.url);

const dataDosPosts = new Map(
  readdirSync(PASTA_BLOG)
    .filter((n) => n.endsWith('.md'))
    .map((nome) => {
      const texto = readFileSync(new URL(nome, PASTA_BLOG), 'utf8');
      const publicado = texto.match(/^data:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
      const revisado = texto.match(/^atualizado:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
      return [`/blog/${nome.replace(/\.md$/, '')}`, revisado ?? publicado];
    })
    .filter(([, data]) => Boolean(data)),
);

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
      serialize: (item) => {
        const caminho = new URL(item.url).pathname.replace(/\/$/, '');
        const lastmod = dataDosPosts.get(caminho);
        return {
          ...item,
          priority: caminho.endsWith('/contato') ? 0.8 : 1.0,
          changefreq: 'monthly',
          ...(lastmod ? { lastmod } : {}),
        };
      },
    }),
  ],
  devToolbar: { enabled: false },
});
