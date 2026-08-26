/**
 * Traz os posts do WordPress atual para dentro do repositório.
 *
 * O blog vivia em parket.com.br/wp-json. Buscar de lá a cada build deixaria o
 * site novo dependente de o WordPress estar no ar, e entregaria o HTML como o
 * editor do WP deixou — <span style>, <b> no lugar de <strong>, parágrafos
 * vazios. Este script roda uma vez: baixa os posts, converte para Markdown,
 * traz a imagem destacada para src/assets/blog e escreve um arquivo por post
 * em src/content/blog. Daí em diante o conteúdo é do repositório.
 *
 *   node scripts/importar-blog.mjs
 *
 * É seguro rodar de novo: reescreve os arquivos com o que estiver no WP hoje.
 * Só não invente de rodá-lo depois de editar um post aqui — ele sobrescreve.
 */
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const API = 'https://parket.com.br/wp-json/wp/v2';
const RAIZ = path.resolve(import.meta.dirname, '..');
const DIR_POSTS = path.join(RAIZ, 'src/content/blog');
const DIR_IMGS = path.join(RAIZ, 'src/assets/blog');

/* Um post foi publicado sem título no WP e ficou com o slug automático do id.
   O slug é a URL do post no site novo e precisa dizer do que ele trata — para
   quem lê o link e para a busca. */
const SLUGS = {
  '828-2': 'a-vida-util-real-de-um-piso-de-madeira',
};
const slugDe = (p) => SLUGS[p.slug] ?? p.slug;

/* ─── HTML do WordPress → Markdown ───
   O conteúdo usa só p, b, i e span, então não é preciso um conversor de
   verdade. O que dá trabalho são as entidades e o lixo de editor: span com
   style, &nbsp; que viram parágrafos "vazios", e negrito em linha solta que
   na prática é subtítulo. */
const ENTIDADES = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"',
  '&#8217;': '’', '&#8216;': '‘', '&#8220;': '“', '&#8221;': '”',
  '&#8211;': '–', '&#8212;': '—', '&#8230;': '…', '&#039;': "'", '&hellip;': '…',
};

const entidades = (t) =>
  t.replace(/&#(\d+);/g, (m, n) => ENTIDADES[m] ?? String.fromCharCode(+n))
   .replace(/&[a-z]+;/gi, (m) => ENTIDADES[m] ?? m);

const semTags = (t) => entidades(t.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

function paraMarkdown(html) {
  const blocos = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);

  const linhas = [];
  for (const bruto of blocos) {
    let t = bruto
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?span[^>]*>/gi, '')
      .replace(/<(b|strong)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, txt) => `**${txt.trim()}**`)
      .replace(/<(i|em)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, __, txt) => `*${txt.trim()}*`)
      .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href, txt) => `[${txt}](${href})`)
      .replace(/<[^>]+>/g, '');

    t = entidades(t).replace(/[ \t ]+/g, ' ').trim();
    if (!t) continue;

    /* Parágrafo que é só negrito é subtítulo, não ênfase: o editor do WP não
       tem H2 configurado e quem escreveu usou negrito para separar as partes
       do texto. Vira ## para o post ter estrutura de verdade. */
    const soNegrito = /^\*\*[^*]+\*\*$/.test(t);
    linhas.push(soNegrito ? `## ${t.slice(2, -2).trim()}` : t);
  }
  return linhas.join('\n\n');
}

/* ─── Utilidades ─── */
const escapar = (t) => t.replace(/"/g, '\\"');

/** Primeira frase inteira até ~180 caracteres, para descrição e SEO. */
function resumir(texto) {
  const limpo = texto.replace(/\s+/g, ' ').trim();
  if (limpo.length <= 180) return limpo;
  const corte = limpo.slice(0, 180);
  const ponto = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? '), corte.lastIndexOf('! '));
  return ponto > 90 ? corte.slice(0, ponto + 1) : `${corte.slice(0, corte.lastIndexOf(' '))}…`;
}

/** Minutos de leitura a 200 palavras por minuto, arredondado para cima. */
const minutos = (texto) => Math.max(1, Math.ceil(texto.split(/\s+/).length / 200));

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} em ${url}`);
  return r.json();
}

/* ─── Imagem destacada ─── */
async function baixarImagem(id, slug) {
  if (!id) return null;
  const midia = await json(`${API}/media/${id}?_fields=source_url,alt_text,media_details`);

  /* A maior versão que o WP guardou, e não a "full": em muitos posts a full é
     a original de 4000px que ninguém precisa, e o WP já gerou uma 2048 boa. */
  const tamanhos = Object.values(midia.media_details?.sizes ?? {});
  const grande = tamanhos.sort((a, b) => b.width - a.width)[0];
  const url = grande?.source_url ?? midia.source_url;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`imagem ${r.status}: ${url}`);
  const bruto = Buffer.from(await r.arrayBuffer());

  /* Tudo entra como WebP. Metade das capas veio em PNG do WP — uma delas com
     4,5 MB — e PNG de fotografia é peso puro num repositório que carrega o
     arquivo para sempre. O build reencoda para AVIF de qualquer jeito, então
     o que importa aqui é guardar a maior resolução no formato mais enxuto.
     Qualidade 92: a diferença para o original não sobrevive à conversão
     seguinte, o tamanho sim. */
  const arquivo = `${slug}.webp`;
  const destino = path.join(DIR_IMGS, arquivo);
  await sharp(bruto).webp({ quality: 92 }).toFile(destino);

  return {
    arquivo,
    alt: semTags(midia.alt_text || '') || null,
    largura: grande?.width ?? null,
  };
}

/* ─── Principal ─── */
const posts = await json(
  `${API}/posts?per_page=100&_fields=slug,title,date,modified,excerpt,content,featured_media`,
);
console.log(`${posts.length} posts no WordPress`);

await mkdir(DIR_POSTS, { recursive: true });
await mkdir(DIR_IMGS, { recursive: true });

for (const p of posts) {
  const slug = slugDe(p);
  const titulo = semTags(p.title.rendered);
  const corpo = paraMarkdown(p.content.rendered);
  const texto = corpo.replace(/[#*]/g, '');

  const resumoWP = semTags(p.excerpt.rendered);
  const resumo = resumir(resumoWP || texto);

  let img = null;
  try {
    img = await baixarImagem(p.featured_media, slug);
  } catch (e) {
    console.warn(`  ! imagem de ${slug}: ${e.message}`);
  }

  const frente = [
    '---',
    `titulo: "${escapar(titulo)}"`,
    `resumo: "${escapar(resumo)}"`,
    `data: ${p.date.slice(0, 10)}`,
    `leitura: ${minutos(texto)}`,
    img ? `capa: "blog/${img.arquivo}"` : null,
    img?.alt ? `capaAlt: "${escapar(img.alt)}"` : `capaAlt: "${escapar(titulo)}"`,
    '---',
  ].filter(Boolean).join('\n');

  await writeFile(path.join(DIR_POSTS, `${slug}.md`), `${frente}\n\n${corpo}\n`, 'utf8');
  console.log(`  ✓ ${slug}${img ? '' : ' (sem capa)'}`);
}

const escritos = (await readdir(DIR_POSTS)).filter((f) => f.endsWith('.md'));
console.log(`\n${escritos.length} arquivos em src/content/blog`);
if (existsSync(DIR_IMGS)) {
  console.log(`${(await readdir(DIR_IMGS)).length} imagens em src/assets/blog`);
}
