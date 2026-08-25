/**
 * Textura de superfície por espécie — macros de veio e tom, vindas do catálogo
 * de pisos (src/assets/texturas/). Passam pelo pipeline do Astro como qualquer
 * imagem, então saem em AVIF com srcset.
 *
 * 19 das 20 espécies publicadas têm textura. A exceção é "Peroba", que é um
 * genérico do catálogo de origem e provavelmente deveria virar Peroba do Campo
 * ou Peroba Mica — ver RELATORIO-DADOS.md. Quem chama precisa aguentar o null.
 */
import type { ImageMetadata } from 'astro';
import revestimentos from '../data/revestimentos.json';

const arquivos = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/texturas/*.webp',
  { eager: true },
);

/** O catálogo nomeia duas espécies com sobrenome; o site usa o nome curto. */
export const ALIAS: Record<string, string> = {
  ipe: 'ipe-tabaco',
  sucupira: 'sucupira-negra',
};

export function texturaDaEspecie(idEspecie: string): ImageMetadata | null {
  const arquivo = ALIAS[idEspecie] ?? idEspecie;
  return arquivos[`/src/assets/texturas/${arquivo}.webp`]?.default ?? null;
}

export const temTextura = (idEspecie: string) => texturaDaEspecie(idEspecie) !== null;

/**
 * As sete espécies que o revestimentos.json não cobre, com o texto que o
 * catálogo de pisos já publica (Catalogo-Pisos-geral/catalogo.js, seção
 * TEXTURAS). É a mesma cópia oficial da seção Revestimentos do parket.com.br —
 * só não tinha vindo junto porque não existe foto de revestimento para elas.
 *
 * Existe porque o visualizador mostra um parágrafo grande por vez: na faixa de
 * cartões antiga a ausência só encurtava o cartão, aqui abriria um buraco.
 */
const DESCRICOES_TEXTURA: Record<string, string> = {
  'pinho-de-riga': 'Clara e de tom amarelado suave, com nós marcantes que remetem à madeira das construções históricas brasileiras.',
  bambu:           'Fibras finas e paralelas em tom palha, de desenho regular e contemporâneo, com leveza que ilumina o ambiente.',
  'peroba-mica':   'Alaranjada e luminosa, de veios longos e bem marcados, imprime calor e vivacidade ao ambiente.',
  canela:          'De tom castanho-acobreado e desenho macio, traz aconchego e um ar naturalmente acolhedor ao ambiente.',
  lapacho:         'Castanho-avermelhada e vibrante, de veios longos e contínuos, revela força e um desenho de grande presença.',
  momoki:          'De coloração terrosa e desenho sereno, oferece um fundo neutro e sofisticado para qualquer projeto.',
  sucupira:        'A mais escura da seleção, de tom quase ébano e veios densos, traz peso visual e dramaticidade ao ambiente.',
};

/**
 * Descrição da espécie escrita pela Parket, capturada do site oficial.
 * O revestimentos.json manda — é o dado curado, com foto. O record acima só
 * preenche o que falta. Juntos, cobrem as 19 espécies de ORDEM_TOM.
 */
export function descricaoDaEspecie(idEspecie: string): string | null {
  return revestimentos.find((r) => r.especie === idEspecie)?.descricao
      ?? DESCRICOES_TEXTURA[idEspecie]
      ?? null;
}

/** Foto de revestimento curada pela Parket, quando existir. */
export function fotoDoRevestimento(idEspecie: string): string | null {
  const r = revestimentos.find((x) => x.especie === idEspecie);
  return r ? `https://parket.com.br/wp-content/uploads/2025/10/${r.arquivo}` : null;
}

/**
 * A carta de tons da home: as espécies ordenadas da mais clara à mais escura.
 * Os L* foram medidos com `node scripts/tons.mjs`, que lê os arquivos reais —
 * não são estimativa. Regerar o script depois de trocar qualquer textura.
 *
 * A ordem é por luminância porque é o único eixo que o olho lê sem legenda.
 * O maior degrau da série (teca 49,9 → cumaru 29,9) é real: o portfólio não
 * tem espécie entre 30 e 42.
 */
export const ORDEM_TOM: string[] = [
  'cabreuva-branca',     // L* 87,3
  'pinho-de-riga',       // L* 78,8
  'tauari',              // L* 77,9
  'carvalho-europeu',    // L* 74,2
  'freijo',              // L* 71,1
  'bambu',               // L* 69,7
  'peroba-do-campo',     // L* 60,2
  'cabreuva-dourada',    // L* 55,6
  'peroba-mica',         // L* 52,5
  'teca',                // L* 49,9
  'canela',              // L* 47
  'lapacho',             // L* 44,2
  'momoki',              // L* 43,8
  'pau-ferro',           // L* 43,7
  'itauba',              // L* 42,2
  'cumaru',              // L* 29,9
  'nogueira',            // L* 27,6
  'ipe',                 // L* 27
  'sucupira',            // L* 19,5
];
