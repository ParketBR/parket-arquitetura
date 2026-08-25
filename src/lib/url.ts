/**
 * Caminho interno consciente do `base`.
 *
 * Em produção (parket.com.br) o site mora na raiz e `BASE_URL` é "/", então
 * `caminho('/contato')` devolve exatamente o que já estava escrito antes.
 *
 * No GitHub Pages o site mora em /parket-arquitetura/, e todo link absoluto
 * escrito à mão apontaria para a raiz do domínio — que é o 404 de sempre.
 * O Astro reescreve o caminho dos assets que ele mesmo processa (imagens,
 * CSS, JS), mas não toca em href e src escritos no markup: esses passam
 * por aqui.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

export const caminho = (p: string) => `${BASE}${p.startsWith('/') ? p : `/${p}`}`;
