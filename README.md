# Site Parket

Uma página. Um pedido.

O site é uma landing de conversão em Astro — estático, sem framework de UI no
cliente — mais uma segunda página que existe só para receber o formulário.
São duas rotas, `/` e `/contato`, e nada além disso.

## Rodar

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npm run preview  # serve o dist
```

O primeiro `build` baixa e converte as fotos de `parket.com.br` para AVIF —
leva alguns minutos. Os seguintes usam cache e levam ~20 s.

## A decisão que manda em todas as outras

**A página persegue uma ação só: falar com um especialista.** O público é o
arquiteto que especifica, não o consumidor final.

Disso decorre o resto. Não há página de produto, de espécie, de categoria nem
institucional — o que era rota virou seção com âncora, e o que era link para
uma rota virou link para o formulário. Clicar em "Carvalho Europeu Mont Blanc"
não abre uma ficha: abre `/contato?ref=pisos-carvalho-europeu-mont-blanc`, e o
formulário mostra o campo "Referência de interesse" já preenchido. O nome
clicado vira assunto do e-mail.

`urlPedido()` em `src/lib/catalogo.ts` é o único lugar que monta esse endereço.

### A ordem das seções é um funil, não um índice

| # | Seção | Papel |
|---|---|---|
| 1 | Hero | Promessa + CTA primário |
| 2 | Números | Prova antes de qualquer argumento |
| 3 | Manifesto | Posicionamento, em bloco escuro |
| 4 | `#superficies` | O que existe — 6 famílias, com o catálogo de cada |
| 5 | `#madeiras` | A matéria-prima, no visualizador de texturas |
| 6 | `#projetos` | Obra pronta |
| 7 | Clientes | Avaliações reais do Google |
| 8 | `#acervo` | O que tira atrito: catálogo, textura, amostra |
| 9 | Pedido | O CTA final, em bloco escuro |

## Estrutura

```
src/
  data/catalogo-bruto.json   extração crua do catalogo.js da Parket
  data/catalogo.json         modelo de conteúdo normalizado
  lib/catalogo.ts            acesso tipado + urlPedido + âncoras
  lib/catalogos.ts           os 13 catálogos publicados
  lib/casa.ts                dados da casa 3D (órfão — ver "A casa 3D — removida")
  lib/texturas.ts            texturas por espécie, ordem de tom, descrições
  lib/casa3d-cliente.ts      a cena three.js (órfã — nada mais importa)
  lib/imagens.ts             resolve foto local vs remota
  styles/tokens.css          design system — cor, tipo, espaço, motion
  layouts/Base.astro         head, SEO, JSON-LD, reveal
  components/                Header, Footer, Foto, HeroVideo, GaleriaArco,
                             Texturas, Formulario, BotaoWhatsApp
                             (Casa3D.astro segue no disco, mas fora da página)
  pages/index.astro          a one page
  pages/contato.astro        o formulário
scripts/
  extrair-catalogo.mjs       lê o catalogo.js do repositório de catálogo
  normalizar.mjs             espécie × acabamento → referência
```

O catálogo continua sendo a fonte de conteúdo: os números de referência por
família, as 20 espécies e as fotos de obra saem todos dele. O que mudou é que
ele não gera mais rota — alimenta as seções.

## Regenerar o catálogo

```bash
node scripts/extrair-catalogo.mjs \
  "/Users/parket/Documents/catalogo atualizado/pisos geral/Catalogo-Pisos-geral/catalogo.js" \
  src/data/catalogo-bruto.json
node scripts/normalizar.mjs src/data/catalogo-bruto.json src/data/catalogo.json
```

O normalizador imprime os nomes que não conseguiu classificar — eles nunca são
descartados em silêncio. Ver [`RELATORIO-DADOS.md`](RELATORIO-DADOS.md).

## Decisões que valem a pena conhecer

**Dado que não existe não é inventado.** Campos ainda não fornecidos pela
fábrica aparecem como "A confirmar".

**Classe usada por componente mora em `tokens.css`, não no `<style>` da
página.** O estilo escopado do Astro não alcança o markup de outro componente.
`.sec-cab`, `.sec-tit`, `.sec-acoes` e `.so-desk` estavam escopados na home e
usados também no componente da seção Madeiras — lá a classe existia e a regra não
chegava nela, e o link da seção caía embaixo do título em vez de ir para a
direita. Se dois componentes usam a mesma classe, ela é do sistema.

**Cuidado com `.contexto a` sobre `.btn`.** `.rod a` tem especificidade 0,1,1 e
vence `.btn-on-dark` (0,1,0): o `color: inherit` do rodapé pintou o texto do
botão com a cor do próprio rodapé, que é a cor de fundo do botão — sobrou um
retângulo claro vazio. Por isso a regra de link do rodapé é `.rod a:not(.btn)`.
Vale para qualquer bloco que redefina cor de link e contenha um botão.

**Nunca use `define:vars` num `<script>` com TypeScript.** A diretiva marca o
script como `is:inline`, o Astro para de transpilar e as anotações de tipo vão
cruas para o navegador. O formulário inteiro ficou sem script — sem validação e
sem `mailto`, o envio virava um GET nativo para a própria página e o pedido se
perdia, em silêncio. Valor dinâmico entra por `data-*` e sai por `dataset`.

**O fundo é papel, não branco.** `--paper` é `#F5F2EC`: L\* 95,6, afastado 4,4%
do branco puro, com calor b\* 3,2. Ao mexer no fundo, mexa na escala inteira —
o olho só separa dois claros a partir de ~2,5 de ΔL\*, então `--paper`,
`--surface` e `--surface-2` andam juntos, senão os blocos somem no fundo.

**`[hidden]` é regra global, com `!important`.** O `display` que o navegador dá
a `[hidden]` perde para qualquer seletor de classe — um `.campo { display:flex }`
faz o elemento aparecer mesmo marcado como escondido.

**A Parket não usa itálico.** Em nenhum lugar. O eixo `ital` nem entra no
carregamento da fonte, então o navegador não tem como sintetizar um oblíquo
falso. Contraste dentro de um título se faz com peso e quebra de linha.

**A Parket não arredonda.** `--radius`, `--radius-media` e `--radius-tag` são
todos `0` e existem só para que ninguém precise caçar `border-radius` no CSS.
A **única exceção** é o botão flutuante de WhatsApp, redondo por pedido do
cliente: escreve `border-radius: 50%` direto, sem token, para que nenhum outro
componente herde a exceção. Pelo mesmo motivo não há `box-shadow` no projeto.

**O cabeçalho é uma barra escura translúcida.** Estado padrão, não de hover.
A única exceção é em cima do hero, onde ele fica transparente e sem blur. Fundo,
blur, filete, marca, navegação e CTA saem de nove tokens; cada contexto redefine
os valores e as regras que os consomem não mudam. Vale como princípio: **defina
tokens por contexto em vez de escrever um seletor mais forte para cada estado.**

**A navegação é âncora, e as âncoras se escrevem `/#secao`.** Assim o mesmo
cabeçalho serve as duas páginas — de `/contato` o link volta para a home e
desce até a seção. `scroll-padding-top: 92px` no `html` impede que a barra
fixa cubra o título de quem acabou de clicar.

**Fileira de fotos com larguras diferentes desalinha legenda.** Mesma proporção
com larguras diferentes ainda dá alturas diferentes — só larguras iguais dentro
da fileira alinham. Por isso o ritmo de `#superficies` é 3+3, 2+2+2, 6.

**O vão entre seções é sempre um `--section`, nunca dois.** `.section + .section
{ padding-top: 0 }`. Blocos com fundo próprio — manifesto, escritórios, pedido —
mantêm os dois lados de propósito: ali o padding é preenchimento do bloco.

**Madeira é cor de filete, não de texto.** `#9C8B6E` sobre o fundo claro dá
2,84:1 e reprova em WCAG AA. Para texto em tom de madeira use `#6F6049`
(`--wood-text`), que dá 5,5:1.

**`.wrap` precisa de `width: 100%`.** Sem isso ele encolhe para o conteúdo
dentro de pai flex ou grid.

**Alvo de toque tem 44px.** Onde o desenho não permite crescer o padding — o
filete do `.link-action` é um `background-position: 0 100%` e se afastaria do
texto — a área cresce por pseudo-elemento e o desenho fica onde está.

## Orçamento de performance

| Métrica | Site atual | Aqui |
|---|---:|---:|
| Primeira tela | 16,3 MB | **~455 KB** |
| CSS | 119 KB | **16 KB** |
| JS de runtime | 450 KB | **0** |
| Imagens com `srcset` | 0 de 86 | **todas** |

Não há mais exceção: com a casa 3D fora da página, nenhum módulo pesado é
carregado, nem sob demanda. O que sobrou de JS são os scripts inline dos
componentes — navegação do visualizador de texturas, arrasto da galeria em
arco, revelação por IntersectionObserver.

Nenhum asset acima de 200 KB deve entrar no repositório.

## A casa 3D — removida

A seção `#casa` saiu da home em 25/08/2026, a pedido do cliente. Era uma cena
three.js procedural: o visitante começava dentro da sala de estar em primeira
pessoa, trocava a madeira do piso ao vivo pela carta de tons, e podia sair para
uma axonometria explodida com os ambientes clicáveis.

**Os arquivos continuam no repositório**, sem nada importando nenhum deles:
`src/components/Casa3D.astro`, `src/lib/casa3d-cliente.ts`, `src/lib/casa.ts`,
`src/data/ambientes.json`, e as dependências `three` e `@types/three` no
`package.json`. Não entram no bundle — o Astro só compila o que a página
importa —, então não custam nada ao visitante; custam só confusão a quem lê o
projeto. Foram mantidos porque a decisão de apagar 50 KB de cena escrita à mão
é do cliente, não minha.

Se for para voltar: reinserir `<Casa3D />` numa `<section id="casa">` em
`index.astro`, e devolver a entrada `casa` em `ANCORAS` (`src/lib/catalogo.ts`)
e nos menus de `Header.astro` e `Footer.astro`.

## Catálogos

Os 13 catálogos vivem em `parket.com.br/catalogo/`. O mapa está em
`src/lib/catalogos.ts` e liga o site a eles em dois pontos: o cartão de cada
família em `#superficies` e a coluna do rodapé.

Nem tudo tem par, e o mapa é explícito sobre isso: **Portas** não tem catálogo
e **Marcenarias** tem catálogo sem família correspondente.
`catalogoDaCategoria()` devolve `null` nesses casos — o cartão de Portas mostra
"Especificar" e vai para o formulário, nunca um link quebrado.

## O formulário NÃO tem endpoint

`src/components/Formulario.astro` monta um `mailto:` para `contato@parket.com.br`
com os campos preenchidos e abre o cliente de e-mail do visitante. **Não existe
servidor recebendo nada.**

Isso é deliberado: o site é estático e ninguém decidiu o endpoint ainda. O que
**não** se pode fazer é afirmar um recebimento que não aconteceu.

Para ligar num endpoint real: devolver `action`/`method` ao `<form>`, trocar o
corpo do handler por um `fetch` (ou deixar o POST nativo acontecer) e ajustar o
texto de confirmação. **Esta é a pendência mais importante do projeto** — a
página inteira empurra para um formulário que hoje depende do cliente de e-mail
do visitante.

## O que falta

- **Endpoint do formulário.** Ver acima.
- **301 das rotas antigas.** O site anterior tinha ~105 endereços indexáveis
  (`/produtos/*`, `/madeiras/*`, `/casa`, `/projetos`, `/parket`,
  `/arquitetos/*`). Nesta versão eles deixam de existir. Sem redirecionamento
  para `/` e `/contato`, cada um vira 404 e leva junto o que já tinha de
  ranqueamento. Precisa ser configurado no host antes de publicar.
- Portfólio de projetos com créditos de escritório.
- Blog: 15 artigos ainda no WordPress.
