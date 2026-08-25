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
  /* Portas não tem catálogo próprio: elas moram dentro do de Marcenarias,
     em `#produto-portas`. Verificado em 25/08/2026 contra o hub de catálogos
     e a lista de repositórios do ParketBR — não existe Catalogo-Portas.
     Cuidado ao checar esse tipo de URL: parket.com.br/catalogo/ devolve 200
     para qualquer caminho, inclusive inventado. Comparar o conteúdo, não o
     código de status. */
  portas:  `${BASE}/marcenarias/#produto-portas`,
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

/* Portas e Marcenarias apontam para o mesmo catálogo, então a soma crua
   contaria esse arquivo duas vezes. O total é de catálogos distintos. */
export const totalDeCatalogos = new Set([
  ...Object.values(POR_CATEGORIA).map((u) => u.split('#')[0]),
  ...Object.values(POR_COLECAO),
  ...CATALOGOS_AVULSOS.map((c) => c.href),
]).size;
