/**
 * A casa como modelo de dados.
 *
 * Hoje alimenta o explorador de ambientes em /casa. Amanhã alimenta o mesmo
 * conteúdo dentro de um modelo 3D navegável: a troca é do componente de
 * visualização (`Casa3D`), não deste arquivo.
 *
 * O contrato que o visualizador 3D precisa respeitar:
 *   - cada malha/ambiente do modelo carrega o `id` daqui como nome do nó;
 *   - clicar num ambiente emite `ambiente:selecionado` com esse id;
 *   - o painel lateral já sabe renderizar o resto a partir do id.
 */
import dados from '../data/ambientes.json';
import { referenciasDaCategoria, categoriaPor, type Referencia } from './catalogo';

export interface Ambiente {
  id: string;
  nome: string;
  grupo: string;
  categorias: string[];
  /** Área do ambiente no contrato de referência, em m². 0 = não se aplica. */
  area: number;
  /** Área molhada ou de exposição direta — muda a recomendação de espécie. */
  molhado: boolean;
  ordem: number;
}
export interface Grupo { id: string; nome: string }

export const ambientes = (dados.ambientes as Ambiente[])
  .slice()
  .sort((a, b) => a.ordem - b.ordem);

export const grupos = dados.grupos as Grupo[];

export const ambientePor = (id: string) => ambientes.find((a) => a.id === id);

export const ambientesDoGrupo = (grupo: string) =>
  ambientes.filter((a) => a.grupo === grupo);

/** Nome legível das famílias de produto que cabem no ambiente. */
export const categoriasDo = (a: Ambiente) =>
  a.categorias.map((c) => categoriaPor(c)).filter(Boolean) as NonNullable<ReturnType<typeof categoriaPor>>[];

/** Referências que podem ser especificadas neste ambiente. */
export function referenciasDo(a: Ambiente, limite = 8): Referencia[] {
  const vistas = new Set<string>();
  const saida: Referencia[] = [];
  // Intercala as categorias para o ambiente não ficar dominado por uma só.
  const filas = a.categorias.map((c) => referenciasDaCategoria(c).filter((r) => r.fotos.length));
  let i = 0;
  while (saida.length < limite && filas.some((f) => f[i])) {
    for (const fila of filas) {
      const r = fila[i];
      if (r && !vistas.has(r.id) && saida.length < limite) {
        vistas.add(r.id);
        saida.push(r);
      }
    }
    i++;
  }
  return saida;
}

/**
 * Capa do ambiente. Atenção: a foto ilustra o **produto** recomendado para o
 * ambiente, não é uma foto daquele cômodo — o acervo atual não tem as fotos
 * marcadas por ambiente. Por isso a legenda nomeia a referência, e não o
 * cômodo. Com o modelo 3D isso deixa de ser um problema.
 */
export function capaDo(a: Ambiente): { src: string; referencia: Referencia } | null {
  const principal = referenciasDaCategoria(a.categorias[0]).filter((r) => r.fotos.length);
  const r = principal[0];
  return r ? { src: r.fotos[0], referencia: r } : null;
}
