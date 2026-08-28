/**
 * Os dois showrooms — endereço de exibição e endereço estruturado.
 *
 * Moravam dentro do Footer.astro, que era o único lugar que os mostrava. Vieram
 * para cá quando o dado estruturado da Organization passou a declará-los
 * também: dois endereços escritos em dois arquivos divergem no dia em que a
 * Parket mudar de sala, e o que o Google leria seria o antigo.
 *
 * ─── Por que dois formatos do mesmo endereço ───
 * `linhas` é como o rodapé imprime: quebras onde o olho espera, com o "·" e o
 * "—" que a página usa em toda parte. `postal` é o que o schema.org entende,
 * campo a campo. Um não deriva do outro sem adivinhação — separar "Torre 1,
 * Edifício Capital · Cj. 201" em rua, número e complemento por regex seria
 * pedir para errar —, então os dois são escritos à mão e revisados juntos.
 *
 * Não há CEP porque não temos o dado. `PostalAddress` sem `postalCode` é
 * válido; inventar um seria pior que omitir.
 */

export interface Showroom {
  cidade: string;
  /** Como o rodapé imprime, uma linha por <span>. */
  linhas: string[];
  /** Como o schema.org lê. */
  postal: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
  };
}

export const SHOWROOMS: Showroom[] = [
  {
    cidade: 'São Paulo',
    linhas: [
      'Avenida Magalhães de Castro, 4800',
      'Torre 1, Edifício Capital · Cj. 201',
      'Jardim Panorama — São Paulo · SP',
    ],
    postal: {
      streetAddress: 'Avenida Magalhães de Castro, 4800 — Torre 1, Edifício Capital, Cj. 201, Jardim Panorama',
      addressLocality: 'São Paulo',
      addressRegion: 'SP',
    },
  },
  {
    cidade: 'Brasília',
    linhas: [
      'SHIS QI 21 BL B, Ed. IAS 06/58',
      'Lago Sul — Brasília · DF',
    ],
    postal: {
      streetAddress: 'SHIS QI 21 BL B, Ed. IAS 06/58, Lago Sul',
      addressLocality: 'Brasília',
      addressRegion: 'DF',
    },
  },
];

/**
 * Os showrooms como `Place[]`, para a propriedade `location` da Organization.
 *
 * `location` e não `address`: `address` é um só, e a Parket atende em dois
 * endereços — declarar apenas um deles diria ao buscador que o outro não
 * existe.
 */
export const showroomsEmSchema = SHOWROOMS.map((s) => ({
  '@type': 'Place',
  name: `Parket — Showroom ${s.cidade}`,
  address: { '@type': 'PostalAddress', ...s.postal, addressCountry: 'BR' },
}));
