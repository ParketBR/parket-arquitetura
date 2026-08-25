# Relatório de dados — o que a Parket precisa revisar

Gerado a partir de `catalogo.js` dos repositórios de catálogo, normalizado por
`scripts/normalizar.mjs`. Nada aqui foi inventado: onde o dado não existe, o site
mostra **"A confirmar"** em vez de preencher com estimativa.

## O que foi extraído

| Entidade | Qtd. | Origem |
|---|---:|---|
| Categorias | 6 | `catalogo.js` |
| Coleções | 12 | `catalogo.js` |
| Espécies | 22 (20 publicadas) | derivadas do nome das fotos |
| Acabamentos | 21 | derivados do nome das fotos |
| Referências | 67 | espécie × acabamento |
| Páginas geradas | 105 | — |

## 1. Decisões que precisam da Parket

### 1.1 Eurodeck e Kebony não são espécies
Chegam do catálogo na posição do nome da madeira, mas **Eurodeck é linha comercial**
e **Kebony é tecnologia de modificação** (norueguesa). Ficaram fora de `/madeiras`
e seguem válidos como referência em `/produtos/decks`.

→ **Confirmar:** Kebony deve aparecer como tecnologia dentro da espécie real
(Momoki?) ou continuar como linha própria?

### 1.2 Três "Perobas" separadas
O catálogo traz **Peroba**, **Peroba do Campo** e **Peroba Mica** como nomes
distintos. Olhando as referências de cada uma, o quadro é este:

| Espécie | Refs | O que são |
|---|---:|---|
| Peroba | 2 | Ambas "Peroba Demolição" — um deck e um forro |
| Peroba do Campo | 1 | Um forro |
| Peroba Mica | 1 | Um piso |

Não é erro de taxonomia: a **Peroba genérica é madeira de demolição** cuja
espécie botânica não foi registrada na origem. É também a única das 20 espécies
publicadas **sem textura** no banco do catálogo.

→ **Confirmar:** a Peroba de demolição é do Campo, é Mica, ou fica como
categoria própria por ser reaproveitamento? Se ficar, precisa de uma textura.

### 1.3 Sete fotos sem espécie identificável
Estas fotos são rotuladas apenas por paginação ou acabamento, sem a madeira no
nome. Não viraram referência — seria inventar dado — mas seguem disponíveis para
galeria:

`Chevron` · `Chevron Naturale` · `Chevron Smoked` · `Paginação especial` ·
`Laca Branca` · `Shou Sugi Ban` · `Milano`

→ **Pedir:** em que espécie cada uma foi executada.

### 1.4 Nomenclatura divergente entre sistemas
| Site atual | Catálogo | Adotado aqui |
|---|---|---|
| Wood + Mármore | Wood + Stone | **Wood + Stone** |
| Brazil | Brasil | **Brazil** |
| Carvalhos Europeu | Carvalho Europeu | **Carvalho Europeu** |

→ **Confirmar** os três nomes canônicos antes da publicação.

### 1.5 Nove espécies com uma única referência
Bambu · Cabreúva Branca · Cabreúva Dourada · Lapacho · Nogueira · Pau Ferro ·
Peroba do Campo · Peroba Mica · Sucupira

Cada uma gera uma página de espécie com um só produto. Funciona, mas fica magra.

→ **Pedir:** mais fotos e acabamentos, ou confirmar que o portfólio é esse mesmo.

## 2. Dados que faltam para a página de produto ficar completa

A tabela de especificação já está no ar; estes campos aparecem como
**"A confirmar"** até serem entregues:

- **Espessura, largura, comprimento e capa nobre** — por referência
- **Construção** — engenheirado, maciço, multilaminado
- **Método de instalação** — colada, flutuante, pregada
- **Compatibilidade com piso radiante**
- **Garantia**
- **Dureza Janka e estabilidade dimensional** — por espécie
- **Tonalidade e uso** (interno/externo) — por espécie

Assim que chegarem, entram em `src/data/` e as 67 páginas se completam sozinhas.

## 3. Imagens

Nesta rodada as fotos vêm das URLs de `parket.com.br` e passam pelo pipeline do
Astro (AVIF + `srcset`). Duas consequências:

- **Ganho já realizado:** o hero saiu de 1,13 MB JPEG para ~140 KB AVIF; a home
  inteira carrega ~455 KB contra 16,3 MB do site atual.
- **Teto de qualidade:** várias capas de categoria têm só 1024 px de largura na
  origem, então as variantes de 1440 e 1920 px são ampliação. Com os originais em
  alta isso se resolve sem tocar em código.

As coleções **Brazil, Eternos e Únicos** não têm foto no WordPress — usam os
arquivos locais em `src/assets/colecoes/`, copiados do repositório de catálogo.

## 4. A casa por ambiente

`/casa` usa a taxonomia de `assets/ambientes.js` da biblioteca (12 ambientes).
Duas pendências:

- **Fotos por ambiente.** O acervo não tem as fotos marcadas por cômodo, então a
  capa de cada ambiente mostra a referência recomendada, e a legenda diz isso.
  Uma sala pode aparecer com foto de quarto. Resolve-se com curadoria — ou some
  quando o modelo 3D entrar.
- **Áreas e categorias por ambiente.** As áreas vieram do contrato de exemplo
  (Residência Alto de Pinheiros). Confirmar se servem como referência genérica.

Para o modelo 3D: o `.glb` precisa das malhas nomeadas com os ids de
`src/data/ambientes.json` e dos materiais separados por superfície, para dar
para trocar a madeira do piso sem trocar a do forro.

## 5. Texturas — inconsistência entre fontes

As 21 texturas alimentam a **carta de tons** da home (as espécies lado a lado,
da mais clara à mais escura). Postas juntas, duas diferenças de origem ficam
óbvias — o que não aparecia enquanto elas eram usadas isoladas:

**Cinco proporções diferentes.** A maioria é 300×515 ou 600×1030 (0,583), mas
`bambu` (0,667), `peroba-mica` (0,711), `pau-mulato` (0,725) e `canela`,
`lapacho`, `momoki` (1030×1030, quadradas) fogem. Recortadas na mesma célula,
**o veio dessas renderiza na metade da escala das vizinhas** — parecem outra
madeira, ou a mesma madeira vista de outra distância.

**Duas famílias fotográficas.** As 300×515 são foscas e naturais. As 1030×1030
(canela, lapacho, momoki) são saturadas e com brilho — parecem laminado, não
madeira. `peroba-mica` é o caso extremo: croma 66,8 contra 51,4 do segundo
colocado, e lê como laranja.

**Duas com pouco veio.** `tauari.webp` tem **2,8 KB** e é quase um degradê;
`cabreuva-branca` e `pinho-de-riga` também têm pouca evidência de fibra.

→ **Pedir:** as 21 texturas reenquadradas na mesma proporção (7/12) e na mesma
escala física de tábua, do mesmo tipo de captura. Se não houver sessão nova,
dá para recortar as maiores em 1:1 — mas `peroba-mica` e `tauari` precisam ser
refeitas.

Enquanto isso a carta está no ar com as 19: funciona como degradê, e as duas
fora de família são visíveis se você procurar.

## 6. Catálogos — lacunas de cobertura

Os 13 catálogos já estão ligados ao site. Faltam dois pares:

- **Portas** tem 4 referências no site e nenhum catálogo publicado.
- **Marcenarias** tem catálogo publicado e nenhuma página de categoria — ela não
  existe em `catalogo.js`, então não há dados para gerar as referências.

Também sem catálogo próprio: a coleção **Únicos** (pisos) e as quatro coleções
de deck (Brazil, Eurodeck, Kebony, Únicos).

## 7. Vídeo do hero

`public/video/hero.mp4` — 3,73 MB, **1280 × 720**, 16 s. Roda com pôster AVIF na
frente, `preload="none"`, e não roda com `prefers-reduced-motion`, em modo de
economia de dados nem em conexão fora de 4G.

720p fica macio num monitor de 1600 px ou mais. Se existir o master em 1080p ou
1440p, vale substituir — e gerar uma versão WebM, que costuma sair 30% menor.

## 8. Conteúdo ainda não migrado

- **Blog** — os 15 artigos do site atual. Fora do rodapé até serem migrados.
- **Projetos** — `/projetos` mostra aplicações reais agrupadas por família de
  produto. O portfólio por obra (nome, escritório, cidade, ano) depende dos
  créditos e da autorização de uso de imagem.
- **Acervo** — texturas 3D, fichas em PDF e blocos DWG têm página, com o status
  real e captura de contato, mas os arquivos ainda não existem.
