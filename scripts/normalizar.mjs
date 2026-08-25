/**
 * Converte o catálogo bruto no modelo de conteúdo da Parte 02 do documento:
 * Categoria · Coleção · Espécie · Acabamento · Referência.
 *
 * Uma "referência" é o que o arquiteto especifica: espécie + acabamento.
 * O nome que vem das fotos ("Carvalho Europeu Mont Blanc") carrega os dois.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const bruto = JSON.parse(readFileSync(process.argv[2], 'utf8'));

export const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')
   .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* ─── Espécies reconhecidas · mais longas primeiro para casar antes das curtas ─── */
const ESPECIES = [
  ['Carvalho Europeu', ['carvalho europeu', 'carvalhos europeu', 'carvalho', 'european oak', 'oak']],
  ['Cabreúva Dourada', ['cabreuva dourada']],
  ['Cabreúva Branca',  ['cabreuva branca']],
  ['Peroba do Campo',  ['peroba do campo']],
  ['Peroba Mica',      ['peroba mica']],
  ['Peroba',           ['peroba']],
  ['Pinho de Riga',    ['pinho de riga']],
  ['Sucupira',         ['sucupira']],
  ['Pau Ferro',        ['pau ferro']],
  ['Ipê',              ['ipe tabaco', 'ipe']],
  ['Itaúba',           ['itauba']],
  ['Cumaru',           ['cumaru']],
  ['Tauari',           ['tauari']],
  ['Catuaba',          ['catuaba']],
  ['Nogueira',         ['nogueira']],
  ['Freijó',           ['freijo']],
  ['Lapacho',          ['lapacho']],
  ['Momoki',           ['momoki']],
  ['Kebony',           ['kebony']],
  ['Canela',           ['canela']],
  ['Bambu',            ['bambu']],
  ['Teca',             ['teca']],
  ['Eurodeck',         ['eurodeck']],
];

/* ─── Acabamentos · o segundo termo da referência ─── */
const ACABAMENTOS = [
  ['Shou Sugi Ban', ['shou sugi ban']],
  ['Mont Blanc',    ['mont blanc']],
  ['Wild Grey',     ['wild grey']],
  ['Cappuccino',    ['cappuccino', 'capuccino']],
  ['Light Brown',   ['light brown']],
  ['Naturalle',     ['naturalle', 'naturale', 'natural']],
  ['Demolição',     ['demolicao']],
  ['Oxidado',       ['oxidado', 'oxidada']],
  ['Customizado',   ['customizado', 'customizada']],
  ['Rústica',       ['rustica', 'rustico']],
  ['Smoke',         ['smoked', 'smoke']],
  ['Marrone',       ['marrone']],
  ['Milano',        ['milano']],
  ['Nevado',        ['nevado']],
  ['Batman',        ['batman']],
  ['Armani',        ['armani']],
  ['Clear',         ['clear']],
  ['Black',         ['black', 'all black', 'preto']],
  ['Marrom',        ['marrom']],
  ['Cinza',         ['cinza']],
  ['Giz',           ['giz']],
];

/* ─── Paginações ─── */
const PAGINACOES = [
  ['Espinha de Peixe', ['espinha de peixe']],
  ['Chevron',          ['chevron']],
  ['Pétala',           ['petala']],
  ['Mosaico',          ['mosaico']],
  ['Versalhes',        ['versalles', 'versalhes']],
  ['Muxarabi',         ['muxarabi', 'muxarabie']],
  ['Ripado',           ['ripado']],
  ['Toblerone',        ['toblerone']],
];

const limpar = (s) =>
  s.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim();

const chave = (s) =>
  limpar(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function achar(tabela, texto) {
  for (const [canon, aliases] of tabela)
    for (const a of aliases)
      if (new RegExp(`(^|[^a-z])${a}([^a-z]|$)`).test(texto)) return canon;
  return null;
}

/* ─── Percorre o bruto acumulando referências ─── */
const referencias = new Map();
const especies = new Map();
const acabamentos = new Map();
const categorias = [];
const colecoes = [];
const naoParseados = [];

function registrarFoto({ nome, src, categoria, colecao }) {
  const texto = chave(nome || '');
  if (!texto) return null;

  const especie = achar(ESPECIES, texto);
  const acabamento = achar(ACABAMENTOS, texto);
  const paginacao = achar(PAGINACOES, texto);

  if (!especie) {
    // Foto rotulada apenas por paginação ou acabamento, sem espécie no nome de
    // origem. Não vira referência (seria inventar dado), mas segue na galeria.
    naoParseados.push({ nome: limpar(nome), categoria, colecao, src });
    return null;
  }

  const titulo = [especie, acabamento].filter(Boolean).join(' ');
  const id = slug(`${categoria}-${titulo}`);

  if (!referencias.has(id)) {
    referencias.set(id, {
      id, titulo, categoria,
      especie, acabamento: acabamento ?? null, paginacao: paginacao ?? null,
      colecoes: new Set(), fotos: [],
    });
  }
  const ref = referencias.get(id);
  if (colecao) ref.colecoes.add(colecao);
  if (src && !ref.fotos.includes(src)) ref.fotos.push(src);

  if (!especies.has(especie))
    especies.set(especie, { id: slug(especie), nome: especie, categorias: new Set(), referencias: new Set() });
  especies.get(especie).categorias.add(categoria);
  especies.get(especie).referencias.add(id);

  if (acabamento) {
    if (!acabamentos.has(acabamento))
      acabamentos.set(acabamento, { id: slug(acabamento), nome: acabamento, especies: new Set(), referencias: new Set() });
    acabamentos.get(acabamento).especies.add(especie);
    acabamentos.get(acabamento).referencias.add(id);
  }
  return ref;
}

for (const p of bruto) {
  categorias.push({
    id: p.key, nome: p.title, descricao: p.desc ?? null,
    videos: (p.videos ?? []).length,
  });

  for (const foto of p.images ?? [])
    registrarFoto({ nome: foto.name, src: foto.src, categoria: p.key, colecao: null });

  for (const c of p.collections ?? []) {
    const colId = `${p.key}--${c.key}`;
    colecoes.push({
      id: colId, slug: c.key, nome: c.title, categoria: p.key,
      descricao: c.desc ?? null,
      specs: (c.specs ?? []).map((s) => ({ rotulo: s.label, valor: s.value })),
    });
    // Brazil, Eternos e Únicos não têm foto no WordPress: usam arquivos locais
    // numerados, já copiados para src/assets/colecoes/<colecao>/NN.webp.
    const LOCAIS = new Set(['brazil', 'eternos', 'unicos']);
    const nomesLocais = c.names
      ? Object.entries(c.names).map(([n, nome]) => ({
          nome,
          src: LOCAIS.has(c.key)
            ? `colecoes/${c.key}/${String(n).padStart(2, '0')}.webp`
            : null,
        }))
      : [];
    for (const foto of c.images ?? [])
      registrarFoto({ nome: foto.name, src: foto.src, categoria: p.key, colecao: colId });
    for (const { nome, src } of nomesLocais)
      registrarFoto({ nome, src, categoria: p.key, colecao: colId });
  }
}

const desSet = (o) => Object.fromEntries(
  Object.entries(o).map(([k, v]) => [k, v instanceof Set ? [...v] : v]));

const saida = {
  categorias,
  colecoes,
  especies: [...especies.values()].map(desSet).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
  acabamentos: [...acabamentos.values()].map(desSet).sort((a, b) => a.nome.localeCompare(b.nome, 'pt')),
  referencias: [...referencias.values()].map(desSet).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt')),
  // Fotos sem espécie identificável no nome de origem. Ficam disponíveis para a
  // galeria da coleção e listadas em RELATORIO-DADOS.md para revisão da Parket.
  galeriaSemReferencia: naoParseados.filter((n) => n.src),
};

writeFileSync(process.argv[3], JSON.stringify(saida, null, 2));

console.log(`categorias   ${saida.categorias.length}`);
console.log(`coleções     ${saida.colecoes.length}`);
console.log(`espécies     ${saida.especies.length}`);
console.log(`acabamentos  ${saida.acabamentos.length}`);
console.log(`referências  ${saida.referencias.length}`);
const semFoto = saida.referencias.filter((r) => r.fotos.length === 0).length;
console.log(`  sem foto   ${semFoto}`);
if (naoParseados.length) {
  console.log(`\nnomes sem espécie reconhecida (${naoParseados.length}) — revisar:`);
  const u = [...new Set(naoParseados.map((n) => n.nome))];
  u.forEach((n) => console.log(`  · ${n}`));
}
