/**
 * Camada de acesso ao modelo de conteúdo.
 * Os dados vêm de src/data/catalogo.json, gerado por scripts/normalizar.mjs
 * a partir do catalogo.js dos repositórios de catálogo da Parket.
 */
import dados from '../data/catalogo.json';

export interface Categoria {
  id: string; nome: string; descricao: string | null; videos: number;
}
export interface Colecao {
  id: string; slug: string; nome: string; categoria: string;
  descricao: string | null;
  specs: { rotulo: string; valor: string }[];
}
export interface Especie {
  id: string; nome: string; categorias: string[]; referencias: string[];
}
export interface Acabamento {
  id: string; nome: string; especies: string[]; referencias: string[];
}
export interface Referencia {
  id: string; titulo: string; categoria: string;
  especie: string; acabamento: string | null; paginacao: string | null;
  colecoes: string[]; fotos: string[];
}

export const categorias  = dados.categorias  as Categoria[];
export const colecoes    = dados.colecoes    as Colecao[];
export const especies    = dados.especies    as Especie[];
export const acabamentos = dados.acabamentos as Acabamento[];
export const referencias = dados.referencias as Referencia[];

/* ─── Ordem editorial das categorias — Pisos primeiro, é o carro-chefe ─── */
const ORDEM = ['pisos', 'decks', 'forros', 'paineis', 'escadas', 'portas'];
export const categoriasOrdenadas = [...categorias].sort(
  (a, b) => ORDEM.indexOf(a.id) - ORDEM.indexOf(b.id),
);

export const categoriaPor = (id: string) => categorias.find((c) => c.id === id);
export const especiePor   = (id: string) => especies.find((e) => e.id === id);
export const referenciaPor = (id: string) => referencias.find((r) => r.id === id);

export const referenciasDaCategoria = (categoria: string) =>
  referencias.filter((r) => r.categoria === categoria);

export const referenciasDaEspecie = (nomeEspecie: string) =>
  referencias.filter((r) => r.especie === nomeEspecie);

export const colecoesDaCategoria = (categoria: string) =>
  colecoes.filter((c) => c.categoria === categoria);

export const colecaoPor = (id: string) => colecoes.find((c) => c.id === id);

/** Referências próximas: mesma espécie primeiro, depois mesma categoria. */
export function relacionadas(ref: Referencia, limite = 4): Referencia[] {
  const mesmaEspecie = referencias.filter(
    (r) => r.id !== ref.id && r.especie === ref.especie,
  );
  const mesmaCategoria = referencias.filter(
    (r) => r.id !== ref.id && r.categoria === ref.categoria && r.especie !== ref.especie,
  );
  return [...mesmaEspecie, ...mesmaCategoria].slice(0, limite);
}

/**
 * O site tem duas páginas: a home e o formulário. Não existe mais página por
 * referência, por categoria ou por espécie — o que existia virou seção com
 * âncora na home.
 *
 * Por isso todo nome clicável leva ao formulário com a referência na
 * querystring: `Formulario.astro` lê `?ref=`, formata o slug e mostra o campo
 * "Referência de interesse" preenchido. Clicar em "Carvalho Europeu Mont
 * Blanc" abre o pedido já falando daquela madeira — que é exatamente a
 * conversão que a página persegue.
 */
export const urlPedido = (slug: string) => `/contato?ref=${slug}`;

export const urlReferencia = (r: Referencia) => urlPedido(r.id);
export const urlEspecie    = (e: Especie)    => urlPedido(e.id);

/** As seções da home. Use sempre daqui — âncora escrita à mão desalinha do id. */
export const ANCORAS = {
  superficies: '#superficies',
  madeiras:    '#madeiras',
  projetos:    '#projetos',
  acervo:      '#acervo',
} as const;

/** Categoria não tem mais página própria: o destino é a faixa de superfícies. */
export const urlCategoria = (_id: string) => ANCORAS.superficies;

/**
 * Capas de categoria curadas — as mesmas fotos editoriais que a Parket já
 * escolheu para a home atual. A seleção automática pegava a referência com mais
 * fotos, que nem sempre representa bem a categoria.
 */
const CAPAS: Record<string, string> = {
  pisos:   'https://parket.com.br/wp-content/uploads/2026/04/pisos-scaled.jpeg',
  decks:   'https://parket.com.br/images/decks-home.webp',
  forros:  'https://parket.com.br/wp-content/uploads/2025/11/forro-1024x634.jpg',
  paineis: 'https://parket.com.br/wp-content/uploads/2025/11/paineis-1024x862.jpg',
  escadas: 'https://parket.com.br/wp-content/uploads/2025/11/escada-824x1024.jpeg',
  portas:  'https://parket.com.br/wp-content/uploads/2025/11/portas-1024x683.jpeg',
};

export function capaCategoria(categoria: string): string | null {
  if (CAPAS[categoria]) return CAPAS[categoria];
  const refs = referenciasDaCategoria(categoria)
    .filter((r) => r.fotos.some((f) => f.startsWith('http')))
    .sort((a, b) => b.fotos.length - a.fotos.length);
  return refs[0]?.fotos.find((f) => f.startsWith('http')) ?? null;
}

/**
 * Eurodeck e Kebony chegam do catálogo no lugar da espécie, mas são linha
 * comercial e tecnologia de modificação — não madeira. Ficam fora de /madeiras
 * e continuam válidos como referência. Ver RELATORIO-DADOS.md.
 */
const NAO_SAO_ESPECIE = new Set(['Eurodeck', 'Kebony']);

/** As espécies que de fato vão para /madeiras. */
export const especiesPublicadas = especies.filter(
  (e) => e.referencias.length > 0 && !NAO_SAO_ESPECIE.has(e.nome),
);
