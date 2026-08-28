/**
 * Coleções de conteúdo.
 *
 * Só o blog, por enquanto. Catálogo e texturas continuam vindo de src/data e
 * src/lib: são dados exportados de outro sistema, não texto que alguém escreve
 * — e o schema de coleção não acrescentaria nada a eles.
 *
 * Os arquivos nascem de `node scripts/importar-blog.mjs`, que traz os posts do
 * WordPress. Depois da importação são arquivos comuns: editar aqui é o
 * caminho normal de publicar.
 */
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    titulo: z.string(),
    /** Aparece no índice e vira a meta description do post. */
    resumo: z.string(),
    data: z.date(),
    /**
     * Quando o texto foi revisado. Opcional: sem ela, o site diz que a última
     * modificação é a própria publicação, que é a verdade para quem nunca
     * mexeu no post. Preencher só quando o conteúdo mudar de fato — data de
     * revisão inflada é sinal ruim para o buscador, não bom.
     */
    atualizado: z.date().optional(),
    /** Minutos de leitura, calculados na importação a 200 palavras/minuto. */
    leitura: z.number().int().positive(),
    /** Caminho dentro de src/assets — o mesmo formato que o Foto.astro aceita. */
    capa: z.string().optional(),
    capaAlt: z.string(),
    /** Tira o post do ar sem apagar o arquivo. */
    rascunho: z.boolean().default(false),
  }),
});

export const collections = { blog };
