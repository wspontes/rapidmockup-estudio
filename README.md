# Mockup Local

Gerador de mockups 3D local, reconstruido a partir da engenharia reversa do
bundle de `alpha.rapidmockup.net` (Rapid Mockup). Roda offline no navegador.

**Stack:** Babylon.js 5.57.1 (3D) + Fabric.js 5.3 (composicao 2D do design).
Sem Vue, sem build step, sem backend obrigatorio.

---

## Rodar

```bash
node server.mjs . 8099
# abre http://localhost:8099
```

Qualquer servidor estatico serve. `server.mjs` e um servidor minimo sem dependencias.

---

## O que da para fazer

| Recurso | Status |
|---|---|
| 64 templates (55 `mugs` + 11 `chopp_mugs`) | pronto |
| 50 modelos 3D (`.obj`) | espelhados |
| 11 HDR env + 11 skybox cubemap | espelhados |
| Upload de design e composicao na area de impressao | pronto |
| **Editor de design em tela cheia** (4x, zoom, mover, redimensionar) | pronto |
| Rotacao do design ao longo do wrap | pronto |
| Cores do produto (malhas coloriveis) | pronto |
| Export PNG ate 8000px | pronto |
| Export "folha de estudio" (fundo branco, 3 views, artwork plano) | pronto |
| Efeitos "magic ink" / "glitter" | nao implementado |
| Video, links, login, saves | server-side, fora do escopo |

### Marca d'agua

Arquivos em `assets/watermarks/` aparecem no seletor "Marca d'agua".
Mecanismo identico ao do original:

```js
// AddWatermark: um GUI.Image sobre um AdvancedDynamicTexture fullscreen
gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("watermarkUI", true, scene)
img.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT
img.verticalAlignment   = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
```

Por ser GUI (e nao mesh), fica acima de tudo, nao depende de geometria e
nao e afetada por luz. Aparece na cena, no export "Cena 3D" (que usa o canvas,
e nao um RTT) e no export "Folha de estudio" (composta uma vez em 2D, no
canto superior esquerdo, como na referencia).

O tamanho e proporcional a resolucao do render (slider de 3% a 40%, padrao 13%).

### Cores do produto

Os `colorMeshNames` do catalogo vem no plural ("handles", "prints") enquanto as
malhas do OBJ sao no singular com sufixo de duplicata ("handle", "handle.001").
O renderer resolve o grupo e aplica a cor em todas as malhas correspondentes:

```
handles  -> handle, handle.001, handle.002
prints   -> print,  print.001,  print.002
```

**Grupo de area de impressao (`prints`)** funciona diferente: o mesh `print` e a
superficie que carrega a arte, entao tintar o `albedoColor` escureceria o
design. Nesses grupos a cor vira a **COR BASE** da textura (o design e impresso
por cima, sem tintagem) - exatamente como o original faz com
`baseTexture`/`background` no canvas do Fabric:

```js
// _printTextureURL
g.fillStyle = p.baseColor || "#ffffff"   // ceramic base
g.fillRect(0, 0, c.width, c.height)
g.drawImage(el, 0, 0)                     // artwork por cima
```

Na UI esse grupo aparece rotulado como "cor base".

### Formatos de export

**Cena 3D** - a viewport como esta, com o fundo da cena (HDRI) e a mesa de madeira.

**Folha de estudio** - o formato de referencia do Rapid Mockup:
- canvas 4:3, fundo branco
- o artwork plano no topo-esquerda, grande, inclinado, com drop shadow forte
- 3 views do produto em diagonal (baixo-esq / centro-alto / direita), com
  rotações diferentes (o design gira junto, porque e wrap)
- sombra de contato suave em cada uma (via `ShadowOnlyMaterial` da materials library)
- rodape (~15%) vazio

As regras de composicao foram medidas nas duas referencias do site (a de canecas
e a de paineis). O enquadramento de cada view e calculado pelo **bounding box
projetado** do produto (nao por raio fixo), entao funciona para qualquer template
sem ajuste manual. A cena ao vivo e restaurada ao final do export.

### Editor de design

A area de impressao e uma faixa 251x95 pt (que vira um wrap de 360 graus no
produto). Como isso e pequeno para trabalhar, o botao **"Abrir editor de design"**
abre um overlay em tela cheia com o canvas em 4x (1004x380 px, mesma resolucao
da textura exportada):

- arraste para mover o design
- arraste os cantos para redimensionar
- roda do mouse ou slider **Zoom** (0.1x - 8x) para aumentar/diminuir
- **Ajustar** volta ao design preenchendo a area
- **Rotacao no produto** desloca o design ao longo do wrap (sincronizado com o
  slider da sidebar)
- `Esc` fecha e devolve o canvas para o preview miniatura da sidebar

O mesmo objeto Fabric e movido entre o preview (1x) e o editor (4x) - o
backing store nao muda, so o display.

---

## Estrutura

```
catalog.json          templates + config de materiais + setup de cena
                       (extraido do bundle original por reverse engineering)
renderer.js           motor: cena, materiais, impressao, export
ui.js                 interface
server.mjs            servidor estatico
assets/
  objects/models/<tpl>/model.obj        geometria
  objects/hdr/v1/<skybox>/*.dds         env prefiltrado (IBL)
  objects/skybox/v3/<skybox>/*.jpg      cubemap do fundo
  backgrounds/fundo.jpg                 fundos 2D proprios
  textures/                             wood8.jpg, reflectivity.png, metallic/*
vendor/               babylon.min.js, babylonjs.materials.min.js,
                      babylonjs.loaders.min.js, fabric.min.js
```

## Defaults

- **Produto:** `three_mugs` (era template **Pro** no original)
- **Cena:** `fundo.jpg` (fundo 2D)

### Fundos 2D

Qualquer imagem em `assets/backgrounds/` aparece automaticamente no seletor de
cena, num grupo "fundos 2D". O original usa o mesmo mecanismo: um
`BABYLON.Layer` com `isBackground = true`, com a imagem recortada em "cover"
para o aspect da viewport.

Quando ha um fundo 2D ativo a mesa de madeira sai de cena e fica so a sombra de
contato (via `ShadowOnlyMaterial`) - no `fundo.jpg` a propria foto ja tem a mesa.
O cubemap do HDRI continua carregado, so que invisivel: ele segue alimentando o
IBL (reflexoes) do PBR.

Para adicionar outro fundo: so jogar o arquivo em `assets/backgrounds/` e
regerar o catalogo.

---

## Como o original funciona (notas de RE)

Extraido do `app.js` do Rapid Mockup (minificado, 1.5 MB):

**Paywall** - e 100% client-side. Nenhuma checagem de entitlement no servidor.
```js
App.plan.name          = "free" | "pro" | "ultimate" | "business"   // injetado no HTML
App.plan.limits        = { all_mockups, humanized_mockups, scenes, poses, ... }
template.onlyPro       = true   // em 27 dos 299 templates, hardcoded no bundle
```
Gates: `if (e.onlyPro && this.isFreePlan) return toastr.warning(...)`,
`proBlockModal.openModal()`, `limitBlockModal.openModal()`.

**Render 100% no browser.** O servidor so tem 3 chamadas no app inteiro:
```js
App.videosApi + "/api/upload?token=" + App.videosApiToken   // conversao de video
App.videosApi + "/api/check?token=" + App.videosApiToken    // status
App.v3Url + "/api/scenes/" + App.lang + "?email="            // catalogo de cenas
```
O export e `BABYLON.Tools.CreateScreenshot(engine, camera, {width, height})` no cliente.

**Materiais** - 23 tipos PBR extraidos das classes do bundle, ex.:
```js
porcelain:   { metallic: 0,   roughness: 0,     envIntensity: 0.8 }
cloth:       { metallic: 0,   roughness: 1,     envIntensity: 0.84, specularIntensity: 0 }
aluminum:    { metallic: 0.9, roughness: 0.2,   envIntensity: 0.9 }
transparent_glass: { metallic: 0.4, roughness: 0.162, envIntensity: 1.05, alpha: 0.45 }
```

**Cena**:
```js
camera   = ArcRotateCamera(PI/2, PI/2.5, 140, target 0), fov 0.6
dirLight = DirectionalLight(dir .25,-5,-.25), intensity 3
hemi     = 2x HemisphericLight, groundColor .47, intensity do template
shadow   = ShadowGenerator(128) com PCF
env      = CubeTexture.CreateFromPrefilteredData(/objects/hdr/v1/<sb>/01SpecularHDR.dds)  // BC7
skybox   = CubeTexture(/objects/skybox/v3/<sb>/skybox_{px,py,pz,nx,ny,nz}.jpg)
plank    = PBRMaterial box 200x1x200 em y = plankAltitude, albedo /textures/wood8.jpg
```

**Pipeline da impressao:**
```
design -> fabric canvas (4x resolucao)
       -> compoe SOBRE fundo branco (a ceramica base)
       -> PNG -> BABYLON.Texture -> albedoTexture do mesh "print"
```
O mesh `print` **e a parede externa** do produto (nao existe malha de corpo
atras dele), entao usar o alpha da textura deixaria a caneca transparente onde
o design nao cobre. Por isso o design e composto sobre branco e o material fica
`MATERIAL_OPAQUE` - a cor do produto vem do `albedoColor` (multiplicado pela
textura), sem duplicar tintagem.

So a area de impressao com `transparentBackground: true` (a `decal`) mantem o
alpha e usa `MATERIAL_ALPHABLEND`.

Correcoes de mapeamento descobertas empiricamente:
- `uScale = -1` corrige a mao-pra-obra dos UVs exportados do Blender
  (e `printSettings.invertX = true` desliga essa correcao - vale p/ `glass_chopp_mug/print`)
- `wrapU = WRAP` (nao CLAMP - com `uScale=-1` e CLAMP a coord clampa em 0)
- `invertY = true` (o canvas e top-down, o UV do OBJ cresce de baixo pra cima)
- `uOffset = 0.1465` coloca o centro do design de frente para a camera
- o mesh de impressao e um **cilindro** (`u` percorre 360 graus) - e wrap de
  sublimacao, o design envolve o produto inteiro
- a malha `decal` (geometria coincidente com a `print`) e uma camada de overlay:
  sem artwork ela vira um veu branco sobre o produto, entao so aparece com efeito ativo

**Sombra de contato** - o original usa `BABYLON.ShadowOnlyMaterial` (que nao esta
no core do Babylon, vem em `babylonjs-materials`) num plano invisivel:
```js
shadowOnlyPlane = MeshBuilder.CreateBox("shadowOnlyPlane", {width:200,height:1,depth:200}, scene)
shadowOnlyPlane.material = new BABYLON.ShadowOnlyMaterial("shadowOnlyMaterial", scene)
shadowOnlyPlane.material.alpha = scene.dirLight.intensity / 10   // 3/10 = 0.3
```

---

## Como o catalogo foi gerado

O bundle foi parseado para extrair as definicoes:
- 298 templates (`{name, plankAltitude, objectNames, onlyPro, defaultScene, lights, overwriteSettings, effects}`)
- 279 configuracoes de malha (`{type, baseMaterial, meshMaterials, meshNames, printNames, printSettings, colorMeshNames, scale, position, rotation}`)
- 23 presets de material PBR
- mapa de categoria (299 templates em 16 categorias)

`overwriteSettings` e mesclado por cima das settings do tipo do objeto.

---

## Expandir para os outros 235 templates

```bash
node catalog-gen.mjs --scope mugs,chopp_mugs,cups,clothing,bottles,stationery,others,boxes_packaging,kitchen_home,decoration,tiles_frames,bags,keychains,pillows,mousepads,technology
node download-assets.mjs
```

Os assets sao arquivos estaticos servidos sem autenticacao
(`/objects/models/<tpl>/model.obj?v=7`).

---

## Nota legal

O codigo do Rapid Mockup e os modelos/texturas 3D tem seus proprios donos e
licencas. Este projeto existe para estudo de engenharia reversa e para uso
pessoal. **Nao redistribua os assets, nao use a marca "Rapid Mockup" e nao
comercialize sem autorizacao.** O Babylon.js e o Fabric.js sao MIT.
