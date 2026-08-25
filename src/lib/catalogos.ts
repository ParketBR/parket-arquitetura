/**
 * Ligação entre o site e os catálogos publicados.
 *
 * Os catálogos moram em parket.com.br/catalogo/ — mesmo domínio, mas ainda
 * com identidade própria (Inter sobre fundo preto). Trazê-los para dentro da
 * marca é a etapa 06 do plano; até lá, o site aponta para eles.
 *
 * Nem tudo tem par: Portas não tem catálogo, e Marcenarias tem catálogo sem
 * página de categoria. `catalogoDaCategoria` devolve null nesses casos, e quem
 * chama simplesmente não mostra o link — nunca um link quebrado.
 */
const BASE = 'https://parket.com.br/catalogo';

const POR_CATEGORIA: Record<string, string> = {
  pisos:   `${BASE}/pisos/`,
  decks:   `${BASE}/decks/`,
  forros:  `${BASE}/forros/`,
  paineis: `${BASE}/paineis/`,
  escadas: `${BASE}/escadas/`,
  // portas — sem catálogo publicado
};

/** Chave = `${categoria}--${slug da coleção}`, igual ao id em catalogo.json. */
const POR_COLECAO: Record<string, string> = {
  'pisos--brazil':           `${BASE}/Catalogo_de_pisos_Brasil/`,
  'pisos--carvalhos':        `${BASE}/Catalogo_de_pisos_Carvalho/`,
  'pisos--classicos':        `${BASE}/Catalogo_de_pisos_Classicos/`,
  'pisos--eternos':          `${BASE}/Catalogo_de_pisos_Eternos-/`,
  'pisos--grandiosos':       `${BASE}/Catalogo_de_pisos_Grandiosos/`,
  'pisos--pinho-de-riga':    `${BASE}/Catalogo_de_pisos_Pinho_de_Riga/`,
  'pisos--listone-giordano': `${BASE}/pisos-wood-stone/`,
  // pisos--unicos e as coleções de deck não têm catálogo próprio
};

/** Catálogos sem página de categoria correspondente no site. */
export const CATALOGOS_AVULSOS = [
  { nome: 'Marcenarias', href: `${BASE}/marcenarias/`, desc: 'Peças sob medida em madeira nobre.' },
];

export const catalogoDaCategoria = (id: string): string | null => POR_CATEGORIA[id] ?? null;
export const catalogoDaColecao  = (id: string): string | null => POR_COLECAO[id] ?? null;

export const totalDeCatalogos =
  Object.keys(POR_CATEGORIA).length + Object.keys(POR_COLECAO).length + CATALOGOS_AVULSOS.length;
