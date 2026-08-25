/**
 * A casa em 3D — cena procedural, sem .glb.
 *
 * Dois modos, um renderer:
 *
 *  'interior'  Primeira pessoa dentro do ambiente (por ora, a Sala de Estar):
 *              câmera na altura dos olhos, arrastar olha ao redor, e o piso
 *              troca de madeira ao vivo entre as espécies da carta de tons.
 *  'casa'      A casa-diagrama em axonometria explodida — o mapa: os 12
 *              ambientes de `src/data/ambientes.json` como grupos nomeados e
 *              clicáveis, com as texturas reais do catálogo.
 *
 * Cumpre o contrato documentado em Casa3D.astro:
 *   ENTRA → selecionar(id) — chamado quando `ambiente:selecionado` dispara
 *   SAI   → onSelecionar(id) — quem monta emite o CustomEvent no document
 *   NÓS   → cada ambiente é um THREE.Group com name = id do ambiente
 *
 * Carregado sob demanda (dynamic import) só quando o bloco entra na tela —
 * a página continua funcionando por completo sem ele.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ─── Planta ───────────────────────────────────────────────────────────────
   Coordenadas em metros. x cresce para a direita, z cresce para a frente
   (em direção à câmera inicial). Térreo em y=0; superior explodido. */

const SUPERIOR = 4.4;   // cota do piso superior (explodido — não é pé-direito)
const LAJE     = 0.16;  // espessura da laje
const PARAPEITO = 0.92; // altura das paredes-diagrama
const PE_DIREITO = 2.9; // pé-direito real, usado no interior

type Faixa = [number, number];
interface Comodo {
  id: string;
  x: Faixa; z: Faixa; y: number;
  piso: 'carvalho' | 'cumaru' | 'itauba' | 'pedra';
  externo?: boolean;
  piscina?: { x: Faixa; z: Faixa };
}

const COMODOS: Comodo[] = [
  { id: 'hall',         x: [-6, -3],    z: [1, 4],      y: 0,        piso: 'carvalho' },
  { id: 'sala-estar',   x: [-3, 2],     z: [-1, 4],     y: 0,        piso: 'carvalho' },
  { id: 'home-theater', x: [2, 6],      z: [0, 4],      y: 0,        piso: 'carvalho' },
  { id: 'cozinha',      x: [2, 6],      z: [-4, 0],     y: 0,        piso: 'pedra'    },
  { id: 'circulacao',   x: [-3, 2],     z: [-4, -1],    y: 0,        piso: 'carvalho' },
  { id: 'escada',       x: [-6, -3],    z: [-4, 1],     y: 0,        piso: 'carvalho' },
  { id: 'suite-master', x: [-6, 0],     z: [-1, 4],     y: SUPERIOR, piso: 'carvalho' },
  { id: 'closet',       x: [-6, -2],    z: [-4, -1],    y: SUPERIOR, piso: 'carvalho' },
  { id: 'banheiro',     x: [-2, 1],     z: [-4, -1],    y: SUPERIOR, piso: 'pedra'    },
  { id: 'varanda',      x: [6.6, 10.6], z: [-4, 1],     y: 0,        piso: 'itauba',  externo: true },
  { id: 'deck-piscina', x: [-6, 6],     z: [4.8, 9.4],  y: 0,        piso: 'cumaru',  externo: true,
    piscina: { x: [-2.5, 3.5], z: [5.6, 8.6] } },
];

/* Cores fora da madeira — derivadas da paleta do site (papel, superfícies). */
const COR = {
  parede:  0xEDE7DB,
  laje:    0xE3DCCE,
  pedra:   0xD8D1C2,
  agua:    0x9FB7AE,
  tanque:  0x76897F,
  escuro:  0x1F1B16,
  tecido:  0xCEC5B4,
};

export type Modo = 'casa' | 'interior';

export interface Casa3DOpcoes {
  texturas: Record<string, string>;         // nome → URL do asset processado
  /** Espécies para o piso do interior, na ordem da carta de tons. */
  pisos: { id: string; nome: string; url: string }[];
  /** Ambientes que já têm interior construído. */
  interiores: string[];
  reduzirMovimento: boolean;
  onSelecionar: (id: string) => void;
  onModo: (m: Modo) => void;
  onPiso: (id: string) => void;
  /** Recebe, por ambiente, a posição 2D do marcador a cada quadro. */
  onMarcadores: (pos: Map<string, { x: number; y: number; atras: boolean }>) => void;
}

export interface Casa3DApi {
  selecionar: (id: string) => void;
  modo: (m: Modo) => void;
  trocarPiso: (id: string) => void;
  destruir: () => void;
}

export function montarCasa3D(host: HTMLElement, op: Casa3DOpcoes): Casa3DApi {
  const largura = () => host.clientWidth;
  const altura  = () => host.clientHeight;

  /* Render sob demanda: a cena só redesenha quando algo muda — câmera,
     textura recém-carregada, seleção. Parado, o custo de GPU é zero. */
  let suja = true;
  const invalidar = () => { suja = true; };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(largura(), altura());
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  host.appendChild(renderer.domElement);

  /* Luz de ambiente por imagem (IBL): é o que dá aos materiais o rebatimento
     suave de estúdio — o grosso do "acabamento Shapespark" vem daqui. */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ambienteIBL = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ════════════════════════ Texturas ════════════════════════ */
  const carregador = new THREE.TextureLoader();
  const anisotropia = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  function texturaMadeira(url: string, repetir: [number, number], girar = false) {
    const tex = carregador.load(url, invalidar);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(...repetir);
    if (girar) { tex.center.set(0.5, 0.5); tex.rotation = Math.PI / 2; }
    tex.anisotropy = anisotropia;
    return tex;
  }
  const madeira = (nome: string, repetir: [number, number], girar = false) =>
    new THREE.MeshStandardMaterial({
      map: texturaMadeira(op.texturas[nome], repetir, girar),
      roughness: 0.82, metalness: 0,
    });

  const matParede = new THREE.MeshStandardMaterial({ color: COR.parede, roughness: 0.95 });
  const matLaje   = new THREE.MeshStandardMaterial({ color: COR.laje,   roughness: 0.9  });
  const matPedra  = new THREE.MeshStandardMaterial({ color: COR.pedra,  roughness: 0.85 });
  const matEscuro = new THREE.MeshStandardMaterial({ color: COR.escuro, roughness: 0.9  });

  function caixa(w: number, h: number, d: number, mat: THREE.Material,
                 x: number, y: number, z: number, sombra = true) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    if (sombra) { m.castShadow = true; m.receiveShadow = true; }
    return m;
  }

  /* ════════════════════════ Cena 1 · a casa (mapa) ════════════════════════ */
  const cenaCasa = new THREE.Scene();
  cenaCasa.environment = ambienteIBL;
  cenaCasa.environmentIntensity = 0.5;

  const camCasa = new THREE.PerspectiveCamera(32, largura() / altura(), 0.1, 200);
  camCasa.position.set(15.5, 14.5, 18);
  /* Em quadro estreito (celular) a casa não cabe no enquadramento inicial —
     afastar o ponto de partida resolve sem mexer nos limites de órbita. */
  if (camCasa.aspect < 1.1) camCasa.position.multiplyScalar(1.3);

  const ctrCasa = new OrbitControls(camCasa, renderer.domElement);
  ctrCasa.target.set(0.8, 2.2, 1.2);
  ctrCasa.enableDamping = !op.reduzirMovimento;
  ctrCasa.dampingFactor = 0.06;
  ctrCasa.minDistance = 11;
  ctrCasa.maxDistance = 34;
  ctrCasa.maxPolarAngle = 1.42;
  ctrCasa.minPolarAngle = 0.18;
  ctrCasa.enablePan = false;
  /* No toque, um dedo continua rolando a página (touch-action: pan-y no CSS);
     girar e aproximar é gesto de dois dedos, como num mapa embutido. */
  ctrCasa.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
  /* O zoom por roda só liga depois que o visitante pega no modelo — senão o
     canvas sequestra a rolagem da página no caminho até o rodapé. */
  ctrCasa.enableZoom = false;
  renderer.domElement.addEventListener('pointerdown', () => { ctrCasa.enableZoom = true; });
  renderer.domElement.addEventListener('pointerleave', () => { ctrCasa.enableZoom = false; });
  ctrCasa.addEventListener('change', invalidar);
  ctrCasa.update();

  cenaCasa.add(new THREE.HemisphereLight(0xfff8ec, 0xb9a98f, 0.8));
  const sol = new THREE.DirectionalLight(0xffffff, 1.5);
  sol.position.set(9, 16, 7);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.camera.left = -14; sol.shadow.camera.right = 14;
  sol.shadow.camera.top = 14;   sol.shadow.camera.bottom = -14;
  sol.shadow.bias = -0.0004;
  cenaCasa.add(sol);

  /* Chão que só recebe sombra — o fundo continua sendo o papel da página. */
  const chao = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.ShadowMaterial({ opacity: 0.13 }),
  );
  chao.rotation.x = -Math.PI / 2;
  chao.position.y = -0.02;
  chao.receiveShadow = true;
  cenaCasa.add(chao);

  const casa = new THREE.Group();
  cenaCasa.add(casa);

  const alvos: THREE.Mesh[] = [];                       // o que o raycaster olha
  const pisosCasa = new Map<string, THREE.MeshStandardMaterial>(); // p/ destaque

  for (const c of COMODOS) {
    const grupo = new THREE.Group();
    grupo.name = c.id;                                  // ← o contrato dos nós
    const w = c.x[1] - c.x[0], d = c.z[1] - c.z[0];
    const cx = (c.x[0] + c.x[1]) / 2, cz = (c.z[0] + c.z[1]) / 2;

    /* Piso. A madeira repete por metro para o veio manter a escala física. */
    const mat = c.piso === 'pedra'
      ? matPedra.clone()
      : madeira(c.piso, [w / 1.9, d / 1.9], d > w);
    if (c.piscina) {
      /* Deck com o vazio da piscina: contorno com furo, extrudado. */
      const forma = new THREE.Shape()
        .moveTo(c.x[0], c.z[0]).lineTo(c.x[1], c.z[0])
        .lineTo(c.x[1], c.z[1]).lineTo(c.x[0], c.z[1]).closePath();
      const furo = new THREE.Path()
        .moveTo(c.piscina.x[0], c.piscina.z[0]).lineTo(c.piscina.x[1], c.piscina.z[0])
        .lineTo(c.piscina.x[1], c.piscina.z[1]).lineTo(c.piscina.x[0], c.piscina.z[1]).closePath();
      forma.holes.push(furo);
      const geo = new THREE.ExtrudeGeometry(forma, { depth: LAJE, bevelEnabled: false });
      const deck = new THREE.Mesh(geo, mat);
      deck.rotation.x = Math.PI / 2;
      deck.position.y = LAJE;
      deck.castShadow = deck.receiveShadow = true;
      deck.userData.ambiente = c.id;
      grupo.add(deck);
      alvos.push(deck);

      /* Tanque e lâmina d'água, abaixo do nível do deck. */
      const pw = c.piscina.x[1] - c.piscina.x[0], pd = c.piscina.z[1] - c.piscina.z[0];
      const px = (c.piscina.x[0] + c.piscina.x[1]) / 2, pz = (c.piscina.z[0] + c.piscina.z[1]) / 2;
      grupo.add(caixa(pw, 0.1, pd,
        new THREE.MeshStandardMaterial({ color: COR.tanque, roughness: 0.9 }), px, 0.05, pz));
      const agua = new THREE.Mesh(
        new THREE.PlaneGeometry(pw - 0.12, pd - 0.12),
        new THREE.MeshStandardMaterial({ color: COR.agua, roughness: 0.22, metalness: 0.1,
                                         transparent: true, opacity: 0.88 }));
      agua.rotation.x = -Math.PI / 2;
      agua.position.set(px, 0.115, pz);
      grupo.add(agua);
    } else {
      const laje = caixa(w, LAJE, d, mat, cx, c.y + LAJE / 2, cz);
      laje.userData.ambiente = c.id;
      grupo.add(laje);
      alvos.push(laje);
    }
    pisosCasa.set(c.id, mat as THREE.MeshStandardMaterial);

    /* Paredes-diagrama nos internos; nos externos, só uma guia baixa. */
    const h  = c.externo ? 0.1 : PARAPEITO;
    const e  = 0.07;
    const yP = c.y + LAJE + h / 2;
    if (!c.piscina) {
      grupo.add(caixa(w, h, e, c.externo ? matLaje : matParede, cx, yP, c.z[0] + e / 2));
      grupo.add(caixa(w, h, e, c.externo ? matLaje : matParede, cx, yP, c.z[1] - e / 2));
      grupo.add(caixa(e, h, d, c.externo ? matLaje : matParede, c.x[0] + e / 2, yP, cz));
      grupo.add(caixa(e, h, d, c.externo ? matLaje : matParede, c.x[1] - e / 2, yP, cz));
    }

    /* Degraus simbólicos na escada. */
    if (c.id === 'escada') {
      for (let n = 0; n < 7; n++) {
        grupo.add(caixa(2.4, 0.16, 0.5, matLaje,
          cx, LAJE + 0.08 + n * 0.16, c.z[1] - 0.6 - n * 0.5));
      }
    }
    casa.add(grupo);
  }

  /* Face inferior do pavimento superior — uma laje única por baixo dos pisos. */
  casa.add(caixa(7, 0.1, 8, matLaje, -2.5, SUPERIOR - 0.05, 0));

  /* Fachada: o brise de réguas verticais na frente do hall. */
  {
    const grupo = new THREE.Group();
    grupo.name = 'fachada';
    const matBrise = madeira('teca', [0.3, 2.2], true);
    const reguas: THREE.Mesh[] = [];
    for (let n = 0; n < 10; n++) {
      const s = caixa(0.16, 3.1, 0.06, matBrise, -5.75 + n * 0.31, LAJE + 1.55, 4.3);
      s.userData.ambiente = 'fachada';
      reguas.push(s);
      alvos.push(s);
    }
    for (const s of reguas) grupo.add(s);
    pisosCasa.set('fachada', matBrise);
    casa.add(grupo);
  }

  /* ════════════════════════ Cena 2 · dentro da sala ════════════════════════
     Sala de 5 × 5 m em espaço próprio, com acabamento de archviz: IBL, piso
     semi-brilho refletindo o caixilho, spots quentes lavando o painel, oclusão
     falsa nos cantos e sombras de contato sob o mobiliário. A câmera fica na
     altura dos olhos e gira em torno de si — arrastar é olhar ao redor. */

  const cenaInt = new THREE.Scene();
  cenaInt.environment = ambienteIBL;
  cenaInt.environmentIntensity = 0.42;
  cenaInt.fog = new THREE.Fog(0xEFE8DA, 26, 58);

  const camInt = new THREE.PerspectiveCamera(60, largura() / altura(), 0.05, 120);
  /* O enquadramento de chegada é a foto de archviz: sofá em primeiro plano à
     esquerda, tapete e mesa no meio, painel ripado ao fundo e o vão de luz à
     direita. Perto do centro, girando 360°, nenhuma parede cola no nariz. */
  camInt.position.set(-0.75, 1.55, 2.05);

  const ctrInt = new OrbitControls(camInt, renderer.domElement);
  {
    const dir = new THREE.Vector3(0.34, -0.27, -0.9).normalize();
    ctrInt.target.copy(camInt.position).addScaledVector(dir, 0.25);
  }
  ctrInt.enableZoom = false;
  ctrInt.enablePan = false;
  ctrInt.enableDamping = !op.reduzirMovimento;
  ctrInt.dampingFactor = 0.07;
  ctrInt.rotateSpeed = -0.3;           // arrastar "agarra" a vista, como panorama
  ctrInt.minPolarAngle = Math.PI * 0.30;
  ctrInt.maxPolarAngle = Math.PI * 0.62;
  ctrInt.touches = { ONE: null as unknown as THREE.TOUCH, TWO: THREE.TOUCH.DOLLY_ROTATE };
  ctrInt.addEventListener('change', invalidar);
  ctrInt.enabled = false;
  ctrInt.update();

  let interiorPronto = false;
  let matPisoInt: THREE.MeshStandardMaterial | null = null;
  const texturasPiso = new Map<string, THREE.Texture>();
  let pisoAtivo = 'carvalho-europeu';

  function texturaDePiso(url: string) {
    let tex = texturasPiso.get(url);
    if (!tex) {
      tex = texturaMadeira(url, [2.9, 2.9]);
      texturasPiso.set(url, tex);
    }
    return tex;
  }

  /* ─── Fake GI: gradientes desenhados em canvas ───
     A oclusão de canto e a sombra de contato são o que "assenta" um render.
     SSAO custaria um passe inteiro; dois degradês resolvem 80% da leitura. */
  function canvasGradiente(radial: boolean): THREE.CanvasTexture {
    const cv = document.createElement('canvas');
    cv.width = radial ? 128 : 4;
    cv.height = 128;
    const cx = cv.getContext('2d')!;
    if (radial) {
      const g = cx.createRadialGradient(64, 64, 8, 64, 64, 64);
      g.addColorStop(0, 'rgba(0,0,0,0.42)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g; cx.fillRect(0, 0, 128, 128);
    } else {
      const g = cx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.5)');
      cx.fillStyle = g; cx.fillRect(0, 0, 4, 128);
    }
    return new THREE.CanvasTexture(cv);
  }

  function construirInterior() {
    if (interiorPronto) return;
    interiorPronto = true;
    const L = 5, MEIO = L / 2, PD = PE_DIREITO;

    const texAO = canvasGradiente(false);
    const texContato = canvasGradiente(true);

    /* Sombra de contato: mancha suave no chão sob cada volume. */
    const contato = (w: number, d: number, x: number, z: number, forca = 0.8, y = 0.008) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
        new THREE.MeshBasicMaterial({ map: texContato, transparent: true,
          opacity: forca, depthWrite: false }));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x, y, z);
      m.renderOrder = 2;
      cenaInt.add(m);
    };
    /* Oclusão na base das paredes: degradê escuro subindo do rodapé. */
    const oclusao = (w: number, x: number, z: number, ry: number) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.38),
        new THREE.MeshBasicMaterial({ map: texAO, transparent: true,
          opacity: 0.42, depthWrite: false }));
      m.position.set(x, 0.19, z); m.rotation.y = ry;
      m.renderOrder = 1;
      cenaInt.add(m);
    };

    /* ─── Luz: sol baixo pelo vão, spots quentes, IBL faz o resto. ─── */
    cenaInt.add(new THREE.HemisphereLight(0xfff6e8, 0x9a8d7c, 0.22));
    const solInt = new THREE.DirectionalLight(0xffedd6, 2.1);
    solInt.position.set(6.5, 3.1, 0.8);
    solInt.castShadow = true;
    solInt.shadow.mapSize.set(2048, 2048);
    solInt.shadow.camera.left = -5.5; solInt.shadow.camera.right = 5.5;
    solInt.shadow.camera.top = 5.5;   solInt.shadow.camera.bottom = -5.5;
    solInt.shadow.bias = -0.0005;
    solInt.shadow.radius = 4;
    cenaInt.add(solInt);
    const fill = new THREE.DirectionalLight(0xf2ece2, 0.25);
    fill.position.set(-3, 2.8, 5);
    cenaInt.add(fill);

    /* Spots embutidos lavando o painel e a mesa — o clichê bom do archviz. */
    const matSpotCorpo = new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 0.6 });
    const spot = (x: number, z: number, tx: number, tz: number, forca: number) => {
      const s = new THREE.SpotLight(0xffe3c0, forca, 10, 0.58, 0.7, 1.7);
      s.position.set(x, PD - 0.06, z);
      s.target.position.set(tx, 0, tz);
      cenaInt.add(s, s.target);
      const corpo = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 16), matSpotCorpo);
      corpo.position.set(x, PD - 0.028, z);
      cenaInt.add(corpo);
    };
    spot(-0.4, -1.7, -0.4, -2.45, 26);
    spot(0.55, -1.7, 0.55, -2.45, 26);
    spot(1.5, -1.7, 1.5, -2.45, 26);
    spot(-0.45, -0.3, -0.45, -0.35, 15);

    /* ─── Piso — o produto. Verniz semi-brilho: reflete o caixilho. ─── */
    const inicial = op.pisos.find((p) => p.id === pisoAtivo) ?? op.pisos[0];
    matPisoInt = new THREE.MeshStandardMaterial({
      map: texturaDePiso(inicial.url), roughness: 0.5, metalness: 0,
      envMapIntensity: 0.55,
    });
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(L, L), matPisoInt);
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    cenaInt.add(piso);

    /* ─── Paredes: norte recebe o painel, leste é o vão de luz. ─── */
    const matParedeInt = new THREE.MeshStandardMaterial({
      color: 0xEFE9DD, roughness: 0.97, envMapIntensity: 0.5 });
    const parede = (w: number, h: number, x: number, y: number, z: number, ry = 0) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), matParedeInt);
      m.position.set(x, y, z); m.rotation.y = ry;
      m.receiveShadow = true;
      cenaInt.add(m);
    };
    parede(L, PD, 0, PD / 2, -MEIO);                    // norte
    parede(L, PD, -MEIO, PD / 2, 0, Math.PI / 2);       // oeste
    parede(L, PD, 0, PD / 2, MEIO, Math.PI);            // sul (atrás da câmera)
    oclusao(L, 0, -MEIO + 0.01, 0);
    oclusao(L, -MEIO + 0.01, 0, Math.PI / 2);
    oclusao(L, 0, MEIO - 0.01, Math.PI);

    /* Rodapé em filete escuro nas três paredes fechadas. */
    cenaInt.add(caixa(L, 0.07, 0.012, matEscuro, 0, 0.035, -MEIO + 0.006, false));
    cenaInt.add(caixa(0.012, 0.07, L, matEscuro, -MEIO + 0.006, 0.035, 0, false));
    cenaInt.add(caixa(L, 0.07, 0.012, matEscuro, 0, 0.035, MEIO - 0.006, false));

    /* ─── Vão a leste: ombreiras, verga, caixilho e vidro. ─── */
    cenaInt.add(caixa(0.14, PD, 0.5, matParedeInt, MEIO - 0.07, PD / 2, -MEIO + 0.25));
    cenaInt.add(caixa(0.14, PD, 0.5, matParedeInt, MEIO - 0.07, PD / 2, MEIO - 0.25));
    cenaInt.add(caixa(0.14, 0.26, L, matParedeInt, MEIO - 0.07, PD - 0.13, 0));
    const vaoW = L - 1;
    cenaInt.add(caixa(0.05, 0.04, vaoW, matEscuro, MEIO - 0.05, PD - 0.28, 0));
    cenaInt.add(caixa(0.05, 0.03, vaoW, matEscuro, MEIO - 0.05, 0.015, 0));
    for (const zM of [-1, 0, 1]) {
      cenaInt.add(caixa(0.045, PD - 0.29, 0.055, matEscuro, MEIO - 0.05, (PD - 0.26) / 2, zM));
    }
    /* Vidro: um brilho, não uma vidraça — opacidade mínima e reflexo alto. */
    const vidro = new THREE.Mesh(
      new THREE.PlaneGeometry(vaoW, PD - 0.31),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transparent: true, opacity: 0.09,
        roughness: 0.04, metalness: 0, envMapIntensity: 2,
        side: THREE.DoubleSide, depthWrite: false,
      }));
    vidro.rotation.y = -Math.PI / 2;
    vidro.position.set(MEIO - 0.05, (PD - 0.26) / 2, 0);
    vidro.renderOrder = 3;
    cenaInt.add(vidro);

    /* Cortina leve no trecho sul do vão — pregas por deslocamento senoidal. */
    const geoCortina = new THREE.PlaneGeometry(1.25, PD - 0.34, 36, 1);
    {
      const pos = geoCortina.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        pos.setZ(i, Math.sin(pos.getX(i) * 9.5) * 0.04);
      }
      geoCortina.computeVertexNormals();
    }
    const cortina = new THREE.Mesh(geoCortina, new THREE.MeshStandardMaterial({
      color: 0xF6F1E7, transparent: true, opacity: 0.55, roughness: 1,
      side: THREE.DoubleSide, envMapIntensity: 0.35, depthWrite: false,
    }));
    cortina.rotation.y = -Math.PI / 2;
    cortina.position.set(MEIO - 0.17, (PD - 0.3) / 2 + 0.02, 1.6);
    cortina.renderOrder = 4;
    cenaInt.add(cortina);

    /* ─── Lá fora: deck de cumaru, chão quente, domo de céu. ─── */
    const deckFora = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, L + 3),
      madeira('cumaru', [2.4, 4.2]),
    );
    deckFora.rotation.x = -Math.PI / 2;
    deckFora.position.set(MEIO + 2.3, -0.012, 0);
    deckFora.receiveShadow = true;
    cenaInt.add(deckFora);

    const chaoFora = new THREE.Mesh(
      new THREE.PlaneGeometry(90, 90),
      new THREE.MeshStandardMaterial({ color: 0xD5CBB6, roughness: 1 }));
    chaoFora.rotation.x = -Math.PI / 2;
    chaoFora.position.set(30, -0.03, 0);
    cenaInt.add(chaoFora);

    const cvCeu = document.createElement('canvas');
    cvCeu.width = 2; cvCeu.height = 256;
    const cxCeu = cvCeu.getContext('2d')!;
    const gCeu = cxCeu.createLinearGradient(0, 0, 0, 256);
    gCeu.addColorStop(0, '#F5EFE1');
    gCeu.addColorStop(0.55, '#EFE6D2');
    gCeu.addColorStop(0.72, '#E0D5BE');
    gCeu.addColorStop(1, '#D6CBB4');
    cxCeu.fillStyle = gCeu; cxCeu.fillRect(0, 0, 2, 256);
    const texCeu = new THREE.CanvasTexture(cvCeu);
    texCeu.colorSpace = THREE.SRGBColorSpace;
    const ceu = new THREE.Mesh(
      new THREE.SphereGeometry(55, 24, 16),
      new THREE.MeshBasicMaterial({ map: texCeu, side: THREE.BackSide, fog: false }));
    cenaInt.add(ceu);

    /* ─── Forro de réguas com sanca de sombra no perímetro. ─── */
    const forro = new THREE.Mesh(
      new THREE.PlaneGeometry(L, L),
      madeira('itauba', [2.6, 2.6], true),
    );
    forro.rotation.x = Math.PI / 2;
    forro.position.y = PD;
    cenaInt.add(forro);
    for (let n = 0; n < 9; n++) {
      cenaInt.add(caixa(0.045, 0.035, L, matEscuro, -2.2 + n * 0.55, PD - 0.018, 0, false));
    }
    cenaInt.add(caixa(L, 0.05, 0.07, matEscuro, 0, PD - 0.025, -MEIO + 0.035, false));
    cenaInt.add(caixa(L, 0.05, 0.07, matEscuro, 0, PD - 0.025, MEIO - 0.035, false));
    cenaInt.add(caixa(0.07, 0.05, L, matEscuro, -MEIO + 0.035, PD - 0.025, 0, false));

    /* ─── Painel ripado na parede norte — teca sobre fundo escuro. ─── */
    cenaInt.add(caixa(2.8, PD, 0.02, matEscuro, 0.5, PD / 2, -MEIO + 0.03));
    const matRipa = madeira('teca', [0.32, 2.6], true);
    for (let n = 0; n < 18; n++) {
      cenaInt.add(caixa(0.1, PD, 0.05, matRipa, -0.86 + n * 0.152, PD / 2, -MEIO + 0.06));
    }

    /* ─── Porta pivotante em teca na parede sul, com batente escuro. ─── */
    cenaInt.add(caixa(1.16, 2.52, 0.06, matEscuro, 0.9, 1.26, MEIO - 0.02, false));
    cenaInt.add(caixa(1.04, 2.44, 0.05, madeira('teca', [0.5, 1.15], true), 0.9, 1.22, MEIO - 0.05));
    cenaInt.add(caixa(0.016, 1.1, 0.03, matEscuro, 0.48, 1.15, MEIO - 0.09, false));

    /* ─── Mobiliário — proporções de sala de verdade. ─── */
    const matTecido  = new THREE.MeshStandardMaterial({ color: 0xB5AB99, roughness: 1 });
    const matTecido2 = new THREE.MeshStandardMaterial({ color: 0xC4BAA8, roughness: 1 });

    /* O estar fica entre a câmera e o painel — é a foto de chegada:
       sofá à esquerda, tapete e mesa no meio-fundo, banco atrás. */
    const tapete = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5),
      new THREE.MeshStandardMaterial({ color: 0xDCD2BE, roughness: 1 }));
    tapete.rotation.x = -Math.PI / 2;
    tapete.position.set(-0.8, 0.006, -0.35);
    tapete.receiveShadow = true;
    cenaInt.add(tapete);

    /* Sofá na parede oeste, de frente para o vão. */
    cenaInt.add(caixa(0.95, 0.24, 2.0, matTecido, -1.93, 0.22, -0.4));
    cenaInt.add(caixa(0.85, 0.15, 0.9, matTecido2, -1.88, 0.42, -0.86));
    cenaInt.add(caixa(0.85, 0.15, 0.9, matTecido2, -1.88, 0.42, 0.06));
    const costas1 = caixa(0.17, 0.52, 0.88, matTecido2, -2.3, 0.72, -0.86);
    costas1.rotation.z = -0.14;
    const costas2 = caixa(0.17, 0.52, 0.88, matTecido2, -2.3, 0.72, 0.06);
    costas2.rotation.z = -0.14;
    cenaInt.add(costas1, costas2);
    cenaInt.add(caixa(0.95, 0.5, 0.15, matTecido, -1.93, 0.35, 0.55));
    cenaInt.add(caixa(0.95, 0.5, 0.15, matTecido, -1.93, 0.35, -1.35));
    const almofada = caixa(0.14, 0.42, 0.42, new THREE.MeshStandardMaterial({
      color: 0xB89B72, roughness: 1 }), -2.16, 0.62, -0.32);
    almofada.rotation.z = -0.2;
    cenaInt.add(almofada);
    contato(1.5, 2.6, -1.9, -0.4, 0.85);

    /* Mesa de centro: tampo em carvalho, pés em filete, dois livros. */
    cenaInt.add(caixa(1.2, 0.05, 0.7, madeira('carvalho', [0.8, 0.5]), -0.45, 0.375, -0.35));
    for (const [px, pz] of [[-0.98, -0.64], [0.08, -0.64], [-0.98, -0.06], [0.08, -0.06]]) {
      cenaInt.add(caixa(0.04, 0.35, 0.04, matEscuro, px, 0.175, pz));
    }
    cenaInt.add(caixa(0.32, 0.025, 0.24, new THREE.MeshStandardMaterial({
      color: 0xF2EDE2, roughness: 0.9 }), -0.6, 0.412, -0.4, false));
    cenaInt.add(caixa(0.27, 0.02, 0.2, matEscuro, -0.58, 0.435, -0.38, false));
    contato(1.6, 1.05, -0.45, -0.35, 0.6, 0.014);

    /* Banco em cumaru sob o painel. */
    cenaInt.add(caixa(1.9, 0.09, 0.42, madeira('cumaru', [1.2, 0.3]), 0.55, 0.38, -1.95));
    cenaInt.add(caixa(0.06, 0.34, 0.36, matEscuro, -0.25, 0.17, -1.95));
    cenaInt.add(caixa(0.06, 0.34, 0.36, matEscuro, 1.35, 0.17, -1.95));
    contato(2.15, 0.7, 0.55, -1.95, 0.7);

    /* Aparador em itaúba e um quadro na parede sul, à esquerda da porta. */
    cenaInt.add(caixa(1.7, 0.09, 0.4, madeira('itauba', [1.1, 0.28]), -1.1, 0.6, 2.26));
    cenaInt.add(caixa(1.6, 0.5, 0.34, matEscuro, -1.1, 0.3, 2.28));
    cenaInt.add(caixa(0.78, 1.0, 0.02, matEscuro, -1.1, 1.85, 2.47, false));
    cenaInt.add(caixa(0.64, 0.86, 0.012, new THREE.MeshStandardMaterial({
      color: COR.tecido, roughness: 1 }), -1.1, 1.85, 2.462, false));
    contato(1.95, 0.62, -1.1, 2.22, 0.7);

    /* Planta de chão no canto do vão — folhas alongadas em tom oliva. */
    const vaso = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.4, 20), matEscuro);
    vaso.position.set(2.0, 0.2, -1.95);
    vaso.castShadow = true;
    cenaInt.add(vaso);
    for (let n = 0; n < 7; n++) {
      const folha = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 6),
        new THREE.MeshStandardMaterial({
          color: n % 2 ? 0x6E7052 : 0x7B7D5E, roughness: 0.9 }));
      const ang = (n / 7) * Math.PI * 2;
      folha.scale.set(0.05, 0.5 + (n % 3) * 0.12, 0.14);
      folha.position.set(2.0 + Math.cos(ang) * 0.1, 0.75 + (n % 3) * 0.1, -1.95 + Math.sin(ang) * 0.1);
      folha.rotation.z = Math.cos(ang) * 0.35;
      folha.rotation.x = Math.sin(ang) * 0.35;
      folha.castShadow = true;
      cenaInt.add(folha);
    }
    contato(0.7, 0.7, 2.0, -1.95, 0.6);

    invalidar();
  }

  /* ════════════════════════ Modos ════════════════════════ */
  let modo: Modo = 'casa';

  function irPara(novo: Modo) {
    if (novo === 'interior') construirInterior();
    modo = novo;
    ctrCasa.enabled = novo === 'casa';
    ctrInt.enabled = novo === 'interior';
    op.onModo(novo);
    invalidar();
  }

  /* ─── Seleção, destaque e marcadores (modo casa) ─── */
  const ray = new THREE.Raycaster();
  const ponteiro = new THREE.Vector2();
  let selecionado = '';
  let sobre = '';

  function pintar() {
    invalidar();
    for (const [id, m] of pisosCasa) {
      const forca = id === selecionado ? 0.34 : id === sobre ? 0.16 : 0;
      m.emissive.setHex(0x8a734f);
      m.emissiveIntensity = forca;
    }
  }

  function debaixoDoPonteiro(ev: PointerEvent): string {
    const r = renderer.domElement.getBoundingClientRect();
    ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1,
                 -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ponteiro, camCasa);
    const hit = ray.intersectObjects(alvos, false)[0];
    return (hit?.object.userData.ambiente as string) ?? '';
  }

  let arrastou = false;
  renderer.domElement.addEventListener('pointerdown', () => { arrastou = false; });
  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (ev.buttons) { arrastou = true; return; }
    if (modo !== 'casa') { renderer.domElement.style.cursor = 'grab'; return; }
    const id = debaixoDoPonteiro(ev);
    if (id !== sobre) { sobre = id; pintar(); }
    renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
  });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (arrastou || modo !== 'casa') return;
    const id = debaixoDoPonteiro(ev);
    if (id) { selecionado = id; pintar(); op.onSelecionar(id); }
  });

  /* Posição dos marcadores HTML: centro de cada ambiente, projetado. */
  const centros = new Map<string, THREE.Vector3>();
  for (const c of COMODOS) {
    centros.set(c.id, new THREE.Vector3(
      (c.x[0] + c.x[1]) / 2, c.y + (c.externo ? 0.9 : 1.7), (c.z[0] + c.z[1]) / 2));
  }
  centros.set('fachada', new THREE.Vector3(-4.4, 3.4, 4.3));

  const proj = new THREE.Vector3();
  const posicoes = new Map<string, { x: number; y: number; atras: boolean }>();
  function marcar() {
    for (const [id, v] of centros) {
      proj.copy(v).project(camCasa);
      posicoes.set(id, {
        x: (proj.x + 1) / 2 * largura(),
        y: (-proj.y + 1) / 2 * altura(),
        atras: proj.z > 1,
      });
    }
    op.onMarcadores(posicoes);
  }

  /* ─── Laço ─── */
  let vivo = true;
  let visivel = true;
  const io = new IntersectionObserver(([e]) => { visivel = e.isIntersecting; });
  io.observe(host);

  function quadro() {
    if (!vivo) return;
    requestAnimationFrame(quadro);
    if (!visivel) return;
    const mexeu = modo === 'casa' ? ctrCasa.update() : ctrInt.update();
    if (!mexeu && !suja) return;
    suja = false;
    if (modo === 'casa') {
      renderer.render(cenaCasa, camCasa);
      marcar();
    } else {
      renderer.render(cenaInt, camInt);
    }
  }
  quadro();

  const ro = new ResizeObserver(() => {
    for (const cam of [camCasa, camInt]) {
      cam.aspect = largura() / altura();
      cam.updateProjectionMatrix();
    }
    renderer.setSize(largura(), altura());
    invalidar();
  });
  ro.observe(host);

  pintar();

  return {
    selecionar(id: string) {
      const mudou = id !== selecionado;
      selecionado = id;
      if (mudou) pintar();
      /* Ambiente com interior pronto recebe o visitante lá dentro;
         os demais aparecem no mapa da casa. */
      const alvo: Modo = op.interiores.includes(id) ? 'interior' : 'casa';
      if (alvo !== modo || mudou) irPara(alvo);
    },
    modo(m: Modo) {
      if (m === modo) return;
      if (m === 'interior' && !op.interiores.includes(selecionado)) return;
      irPara(m);
    },
    trocarPiso(id: string) {
      const p = op.pisos.find((x) => x.id === id);
      if (!p || !matPisoInt) return;
      pisoAtivo = id;
      matPisoInt.map = texturaDePiso(p.url);
      matPisoInt.needsUpdate = true;
      op.onPiso(id);
      invalidar();
    },
    destruir() {
      vivo = false;
      io.disconnect(); ro.disconnect();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    },
  };
}
