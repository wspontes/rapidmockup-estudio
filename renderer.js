/* Mockup Local â€” renderer limpo (Babylon.js 5.57 + Fabric.js 5.3)
 * ReconstruÃ­do a partir da engenharia reversa do bundle de alpha.rapidmockup.net
 * (app.js): classes de material PBR, setup de cena, e o pipeline
 * fabric canvas -> PNG dataURL -> textura do mesh "print".
 */
"use strict"

const ASSETS = "assets"

/**
 * Layout da folha de estudio (normalizado 0..1).
 * Regras tiradas das referencias do Rapid Mockup:
 *  - card do artwork grande no topo-esquerda, inclinado, com drop shadow forte
 *  - produtos espalhados em diagonal (baixo-esq / centro-alto / direita)
 *  - rodape (~15%) deliberately vazio
 * x e w sao fracao da LARGURA; y e h sao fracao da ALTURA.
 */
const P = Math.PI / 2
const SHEET_VIEWS = [
  { key: "left", x: 0.020, y: 0.360, w: 0.270, h: 0.440,
    rotY: -0.46, tiltZ: -0.20, alpha: P, beta: 1.38, margin: 1.30, lift: -3 },
  { key: "center", x: 0.345, y: 0.335, w: 0.235, h: 0.300,
    rotY: 0.60, tiltZ: 0, alpha: P, beta: 1.34, margin: 1.22, lift: -2 },
  { key: "right", x: 0.660, y: 0.440, w: 0.300, h: 0.400,
    rotY: -0.08, tiltZ: 0, alpha: P, beta: 1.38, margin: 1.14, lift: -3 },
]

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = src
  })
}

const MockupRenderer = (() => {
  const DECAL_TYPES = new Set(["decal", "translucent_decal", "better_decal"])

  class Renderer {
    constructor(canvas, catalog) {
      this.canvas = canvas
      this.catalog = catalog
      this.engine = new BABYLON.Engine(canvas, true, {
        preserveDrawingBuffer: true,
        stencil: true,
        antialias: true,
      })
      this.scene = new BABYLON.Scene(this.engine)
      this.scene.clearColor = new BABYLON.Color4(0, 0, 0, 0)
      this.template = null
      this.prints = {}          // printName -> { settings, meshes[], fabric }
      this.meshByName = new Map()
      this.materialByMesh = new Map()
      this.skybox = null
      this.backgroundImage = null

      // camada de fundo 2D (mesmo mecanismo do original: BABYLON.Layer isBackground)
      this.backgroundLayer = new BABYLON.Layer("background", null, this.scene)
      this.backgroundLayer.isBackground = true
      this.backgroundLayer.texture = null

      this._buildCamera()
      this._buildLights()
      this._buildShadow()
      this.engine.runRenderLoop(() => this.scene.render())
      window.addEventListener("resize", () => this.engine.resize())
      // o fundo 2D precisa ser recortado de novo a cada resize
      this.engine.onResizeObservable.add(() => { this._cropBackground() })
    }

    // ---------- cena ----------
    _buildCamera() {
      const c = this.catalog.scene.camera
      this.camera = new BABYLON.ArcRotateCamera(
        "Camera", c.alpha, c.beta, c.radius, BABYLON.Vector3.Zero(), this.scene
      )
      this.camera.setTarget(BABYLON.Vector3.Zero())
      this.camera.lowerRadiusLimit = c.lowerRadius
      this.camera.upperRadiusLimit = c.upperRadius
      this.camera.fov = c.fov
      this.camera.attachControl(this.canvas, false)
      this.camera.wheelDeltaPercentage = 0.01
      this.camera.panningSensibility = 0
    }

    _buildLights() {
      const L = this.catalog.scene
      const d = L.dirLight
      this.dirLight = new BABYLON.DirectionalLight(
        "DirectionalLight", new BABYLON.Vector3(...d.direction), this.scene
      )
      this.dirLight.diffuse = new BABYLON.Color3(1, 1, 1)
      this.dirLight.specular = new BABYLON.Color3(1, 1, 1)
      this.dirLight.intensity = d.intensity
      this.dirLight.position = new BABYLON.Vector3(...L.legacyDirLight.position)
      this.dirLight.autoUpdateExtends = true
      this.dirLight.autoCalcShadowZBounds = true
      this.dirLight.shadowEnabled = true
    }

    _buildShadow() {
      const s = this.catalog.scene.shadow
      this.shadow = new BABYLON.ShadowGenerator(s.mapSize, this.dirLight)
      this.shadow.usePercentageCloserFiltering = true
      this.shadow.filteringQuality = BABYLON.ShadowGenerator.QUALITY_MEDIUM
      this.shadow.bias = 0.0015
      this.shadow.normalBias = 0.02
      this.shadow.transparencyShadow = true
      this.shadow.enableSoftTransparentShadow = true
    }

    _buildHemi(intensity) {
      const h = this.catalog.scene.hemi
      this.hemiLight = new BABYLON.HemisphericLight(
        "light1", new BABYLON.Vector3(...h.dir[0]), this.scene
      )
      this.hemiLight.groundColor = new BABYLON.Color3(...h.groundColor)
      this.hemiLight.intensity = intensity
      this.hemiLight2 = new BABYLON.HemisphericLight(
        "light2", new BABYLON.Vector3(...h.dir[1]), this.scene
      )
      this.hemiLight2.groundColor = new BABYLON.Color3(...h.groundColor)
      this.hemiLight2.intensity = intensity
    }

    // ---------- materiais ----------
    _materialPreset(type) {
      return this.catalog.materials[type] || this.catalog.materials.pbrMaterial
    }

    _makeMaterial(type, mesh) {
      const p = this._materialPreset(type)
      if (DECAL_TYPES.has(type)) {
        const m = new BABYLON.StandardMaterial(`${type}_${mesh.name}`, this.scene)
        m.diffuseColor = new BABYLON.Color3(1, 1, 1)
        m.specularColor = new BABYLON.Color3(0, 0, 0)
        const f = p.emissiveFactor ?? 0.85
        m.emissiveColor = new BABYLON.Color3(f, f, f)
        m.alpha = p.alpha ?? 0.5
        m.alphaFromDiffuseTexture = !!p.alphaFromDiffuseTexture
        m.backFaceCulling = false
        return m
      }
      const m = new BABYLON.PBRMaterial(`${type}_${mesh.name}`, this.scene)
      m.metallic = p.metallic ?? 0
      m.roughness = p.roughness ?? 0.15
      m.environmentIntensity = p.envIntensity ?? 0.77
      m.specularIntensity = p.specularIntensity ?? 0.05
      m.alpha = p.alpha ?? 1
      if (p.withRefraction) {
        m.subSurface.isRefractionEnabled = true
        m.subSurface.refractionIntensity = 1
        m.subSurface.indexOfRefraction = p.refractionIndex ?? 0.1
        m.subSurface.tintColor = new BABYLON.Color3(1, 1, 1)
        m.alphaMode = BABYLON.Engine.ALPHA_COMBINE
      }
      if (p.albedoColor) m.albedoColor = new BABYLON.Color3(...p.albedoColor)
      return m
    }

    _applyMeshMaterialSettings(mat, meshName) {
      const s = this.template.settings
      const ms = s.meshMaterialSettings?.[meshName]
      if (!ms) return
      const mmm = this._materialPreset("pbrMaterial")
      if (ms.normalTextureUrl) {
        mat.bumpTexture = new BABYLON.Texture(
          `${ASSETS}/objects/models/${this.template.object}${ms.normalTextureUrl.replace(/^\/objects\/models\/[^/]+/, "")}`,
          this.scene
        )
        mat.bumpTexture.uScale = ms.normalTextureSize || 1
        mat.bumpTexture.vScale = ms.normalTextureSize || 1
        mat.bumpTexture.level = ms.normalTextureLevel || 1
      }
      if (ms.albedoTextureUrl) {
        mat.albedoTexture = new BABYLON.Texture(
          `${ASSETS}/objects/models/${this.template.object}${ms.albedoTextureUrl.replace(/^\/objects\/models\/[^/]+/, "")}`,
          this.scene
        )
      }
      void mmm
    }

    // ---------- template ----------
    async loadTemplate(template) {
      this.template = template
      const s = template.settings

      // limpa cena (mantem camera/luzes/sombras)
      for (const m of this.scene.meshes.slice()) {
        if (m.name !== "plane" && m.name !== "shadowOnlyPlane") m.dispose(false, true)
      }
      for (const k of [...this.materialByMesh.keys()]) this.materialByMesh.delete(k)
      this.meshByName.clear()
      this.prints = {}

      // luzes hemifericas conforme o template
      if (!this.hemiLight) {
        const hemi = template.lights?.hemi?.intensity ?? this.catalog.scene.hemi.defaultIntensity
        this._buildHemi(hemi)
      }

      await this._setSkybox(template.defaultScene || "photostudio")
      this._buildPlank(template.plankAltitude ?? -20)

      // carrega o modelo
      const url = `${ASSETS}/objects/models/${template.object}/model.obj`
      const root = await BABYLON.SceneLoader.ImportMeshAsync("", "", url, this.scene)
      void root

      const meshes = this.scene.meshes.filter((m) => m.parent == null || true)
      const all = this.scene.meshes.filter(
        (m) =>
          m.name !== "plane" &&
          m.name !== "shadowOnlyPlane" &&
          m.name !== "skybox" &&
          m.getTotalVertices() > 0
      )
      void meshes

      // instancia e posiciona
      const s0 = s.scale
      const p0 = s.position
      const r0 = s.rotation
      for (const m of all) {
        this.meshByName.set(m.name, m)
        m.receiveShadows = true
        if (s0) m.scaling = new BABYLON.Vector3(s0.x ?? 1, s0.y ?? 1, s0.z ?? 1)
        if (r0) m.rotation = new BABYLON.Vector3(r0.x ?? 0, r0.y ?? 0, r0.z ?? 0)
        if (p0) m.position = new BABYLON.Vector3(p0.x ?? 0, p0.y ?? 0, p0.z ?? 0)
        this.shadow.addShadowCaster(m)
        this._assignMaterial(m, s)
      }

      // sombras: apenas malhas opacas
      this.modelMeshes = all
      this._centerObject(all)
      this._buildPrints(s)
      this._applyDefaultColors(s)

      // malhas "decal" sao uma camada de overlay (geometria coincidente com a print).
      // Sem artwork elas viram um veu branco -> so aparecem com efeito ativo.
      const hasFx = (this.template.effects || []).length > 0
      for (const m of all) {
        if (m.isDecalMesh) m.isVisible = hasFx
      }

      // enquadra o produto (three_mugs e ~2x mais largo que uma caneca)
      this.frameProduct(1.3)

      return this.describe()
    }

    /** Centraliza o objeto no eixo X/Z (equivale ao calculateCentralizedGroups original). */
    _centerObject(meshes) {
      if (!meshes.length) return
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
      for (const m of meshes) {
        const b = m.getBoundingInfo().boundingBox
        minX = Math.min(minX, b.minimumWorld.x); maxX = Math.max(maxX, b.maximumWorld.x)
        minZ = Math.min(minZ, b.minimumWorld.z); maxZ = Math.max(maxZ, b.maximumWorld.z)
      }
      const dx = (minX + maxX) / 2
      const dz = (minZ + maxZ) / 2
      for (const m of meshes) {
        m.position.x -= dx
        m.position.z -= dz
      }
    }

    _assignMaterial(mesh, s) {
      let type = s.meshMaterials?.[mesh.name]
      if (!type) {
        // grupos: meshGroups[group] = [meshes...] -> group pode ser um material
        for (const [group, members] of Object.entries(s.meshGroups || {})) {
          if (Array.isArray(members) && members.includes(mesh.name) && this.catalog.materials[group]) {
            type = group
            break
          }
        }
      }
      type = type || s.baseMaterial || "pbrMaterial"
      const mat = this._makeMaterial(type, mesh)
      mesh.material = mat
      if (type === "decal" || type === "translucent_decal" || type === "better_decal") {
        mesh.isDecalMesh = true
      }
      this.materialByMesh.set(mesh.name, mat)
      this._applyMeshMaterialSettings(mat, mesh.name)
      if (s.seeBackFaces === true) mesh.material.backFaceCulling = false
      else if (Array.isArray(s.seeBackFaces) && s.seeBackFaces.includes(mesh.name)) {
        mesh.material.backFaceCulling = false
      }
      if (s.alphaIndex?.[mesh.name] != null) {
        mesh.alphaIndex = s.alphaIndex[mesh.name]
        mesh.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND
      }
      if (s.hiddenMeshes?.includes(mesh.name)) mesh.setEnabled(false)
    }

    _buildPrints(s) {
      const ps = s.printSettings || {}
      const stemOf = (n) => n.replace(/\.\d+$/, "")
      for (const [printName, cfg] of Object.entries(ps)) {
        const wanted = cfg.meshes || []
        const found = []
        // aceita "print", "prints", "print.001" -> todas as malhas equivalentes
        const stems = new Set()
        for (const w of wanted) {
          stems.add(stemOf(w))
          if (/s$/.test(w)) stems.add(stemOf(w).replace(/s$/, ""))
        }
        for (const [name, mesh] of this.meshByName) {
          if (stems.has(stemOf(name))) found.push(mesh)
        }
        this.prints[printName] = {
          name: printName,
          settings: cfg,
          meshes: found,
          texture: null,
        }
        for (const m of found) m.isPrintMesh = true
      }
    }

    _applyDefaultColors(s) {
      const colors = s.defaultColors || {}
      for (const [meshName, hex] of Object.entries(colors)) {
        for (const m of this._colorMeshTargets(meshName)) {
          // area de impressao: a cor vira a base da textura (nao tint)
          if (m.isPrintMesh) {
            const p = this._printForMesh(m)
            if (p) {
              p.baseColor = hex
              continue
            }
          }
          const mat = m.material
          if (!mat) continue
          if (mat.albedoColor) mat.albedoColor = BABYLON.Color3.FromHexString(hex).toLinearSpace()
          else if (mat.diffuseColor) mat.diffuseColor = BABYLON.Color3.FromHexString(hex)
        }
      }
    }

    // ---------- skybox / plano de fundo / plank ----------
    async setSkybox(name) {
      await this._setSkybox(name)
      if (this.template) this._buildPlank(this.template.plankAltitude ?? -20)
    }

    /** Enquadra o produto na viewport (usado ao carregar um template). */
    frameProduct(margin = 1.3) {
      if (!this.modelMeshes || !this.modelMeshes.length) return
      const aspect = this.engine.getRenderWidth() / this.engine.getRenderHeight()
      this._frameView({ alpha: this.camera.alpha, beta: this.camera.beta, margin, aspect })
    }

    /**
     * Fundo 2D: recorta a imagem com "cover" para o aspect do viewport e
     * usa como BABYLON.Layer isBackground (o original faz o mesmo).
     */
    async setBackgroundImage(url) {
      const plank = this.scene.getMeshByName("plane")
      if (!url) {
        this.backgroundImage = null
        this.backgroundLayer.texture = null
        if (this.skybox) this.skybox.isVisible = true
        if (plank) plank.isVisible = true
        if (this.shadowCatcher) this.shadowCatcher.isVisible = false
        return
      }
      this.backgroundImage = url
      if (this.skybox) this.skybox.isVisible = false
      // com fundo foto a mesa de madeira sai de cena (fica so a sombra de contato)
      if (plank) plank.isVisible = false
      const c = this._shadowCatcher(this.template ? this.template.plankAltitude ?? -20 : -20)
      if (c) c.isVisible = true
      await this._cropBackground()
    }

    async _cropBackground() {
      if (!this.backgroundImage || this._suppressBgCrop) return
      const img = await loadImage(this.backgroundImage)
      const w = Math.max(2, this.engine.getRenderWidth())
      const h = Math.max(2, this.engine.getRenderHeight())
      const c = document.createElement("canvas")
      c.width = w
      c.height = h
      const g = c.getContext("2d")
      const scale = Math.max(w / img.width, h / img.height)   // cover
      const dw = img.width * scale
      const dh = img.height * scale
      g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
      const tex = new BABYLON.Texture(c.toDataURL("image/jpeg", 0.92), this.scene)
      tex.wrapU = BABYLON.Texture.CLAMP_ADDRESSMODE
      tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
      if (this.backgroundLayer.texture) this.backgroundLayer.texture.dispose()
      this.backgroundLayer.texture = tex
    }

    async _setSkybox(name) {
      if (this.skybox) {
        this.skybox.dispose(false, true)
        this.skybox = null
      }
      this.skyboxName = name

      // env HDR prefiltrado (IBL)
      const dds = `${ASSETS}/objects/hdr/v1/${name}/01SpecularHDR.dds`
      try {
        const env = BABYLON.CubeTexture.CreateFromPrefilteredData(dds, this.scene)
        env.gammaSpace = false
        this.scene.environmentTexture = env
      } catch (e) {
        this.scene.environmentTexture = null
        console.warn("HDR indisponivel, usando cubemap como env:", e)
      }

      // cubemap visivel (skybox canonico do Babylon)
      const sky = BABYLON.CubeTexture.CreateFromImages(
        ["px", "py", "pz", "nx", "ny", "nz"].map((f) => `${ASSETS}/objects/skybox/v3/${name}/skybox_${f}.jpg`),
        this.scene
      )
      sky.sphericalPolynomial = new BABYLON.SphericalPolynomial()
      sky.coordinatesMode = BABYLON.Texture.SKYBOX_MODE
      const mat = new BABYLON.StandardMaterial("skyBoxMaterial", this.scene)
      mat.backFaceCulling = false
      mat.reflectionTexture = sky
      mat.diffuseColor = new BABYLON.Color3(0, 0, 0)
      mat.specularColor = new BABYLON.Color3(0, 0, 0)
      mat.disableLighting = true
      this.skybox = BABYLON.Mesh.CreateBox("skybox", 1000, this.scene)
      this.skybox.material = mat
      this.skybox.infiniteDistance = true
      this.skybox.isPickable = false
      // se ha um fundo 2D configurado, o cubemap so serve para reflexao
      this.skybox.isVisible = !this.backgroundImage
    }

    _buildPlank(altitude) {
      const w = this.catalog.scene.woodPlank
      let plank = this.scene.getMeshByName("plane")
      if (!plank) plank = BABYLON.MeshBuilder.CreateBox("plane", { width: 200, height: 1, depth: 200 }, this.scene)
      plank.position.y = altitude
      plank.receiveShadows = true
      plank.isPickable = false

      const mat = new BABYLON.PBRMaterial("woodMaterial", this.scene)
      mat.environmentIntensity = w.environmentIntensity
      mat.specularIntensity = w.specularIntensity
      mat.roughness = w.roughness
      mat.metallic = w.metallic
      if (this.scene.environmentTexture) mat.reflectionTexture = this.scene.environmentTexture
      mat.reflectivityTexture = new BABYLON.Texture(`${ASSETS}/${this.catalog.scene.reflectivityTexture}`, this.scene)
      mat.useMicroSurfaceFromReflectivityMapAlpha = false
      mat.albedoColor = BABYLON.Color3.White()
      mat.albedoTexture = new BABYLON.Texture(`${ASSETS}/${w.texture}`, this.scene)
      plank.material = mat
    }

    // ---------- design ----------
    /** Cria/retorna o canvas fabric de uma area de impressao. */
    fabricFor(printName) {
      const p = this.prints[printName]
      if (!p) return null
      if (!p.fabric) {
        // o canvas logico e 4x a area de impressao: nitidez no wrap e permite
        // exibir em 1x (preview) ou 4x (editor) sem perder precisao
        const S = 4
        p.canvasSize = { w: p.settings.size.width * S, h: p.settings.size.height * S }
        const el = document.createElement("canvas")
        el.width = p.canvasSize.w
        el.height = p.canvasSize.h
        p.fabric = new fabric.Canvas(el, { preserveObjectStacking: true, backgroundColor: "rgba(0,0,0,0)" })
        p.fabric.on("object:modified", () => this.commitPrint(printName))
        p.fabric.wrapperEl.style.position = "relative"
        p.fabric.wrapperEl.style.display = "inline-block"
        p.fitScale = 1
      }
      return p.fabric
    }

    /** Redimensiona apenas a exibicao do canvas (o backing store nao muda). */
    setFabricDisplay(printName, cssW, cssH) {
      const p = this.prints[printName]
      if (!p || !p.fabric) return
      const f = p.fabric
      f.wrapperEl.style.width = cssW + "px"
      f.wrapperEl.style.height = cssH + "px"
      for (const c of [f.lowerCanvasEl, f.upperCanvasEl]) {
        c.style.width = cssW + "px"
        c.style.height = cssH + "px"
      }
      f.calcOffset()
      f.renderAll()
    }

    /**
     * Textura final da impressao.
     * O mesh "print" E a parede externa do produto (nao existe malha de corpo
     * atras dele), entao usar o alpha da textura deixaria a caneca transparente
     * onde o design nao cobre. Por isso o design e composto SOBRE a cor base
     * do produto - igual ao original, que usa baseTexture/background no canvas.
     */
    _printTextureURL(printName) {
      const p = this.prints[printName]
      const el = p.fabric.getElement()
      const c = document.createElement("canvas")
      c.width = el.width
      c.height = el.height
      const g = c.getContext("2d")
      if (!p.settings.transparentBackground) {
        // a cor base da area de impressao (o que o usuario escolheu em
        // "cores do produto"); o design e impresso por cima e nao e tintado
        g.fillStyle = p.baseColor || "#ffffff"
        g.fillRect(0, 0, c.width, c.height)
      }
      g.drawImage(el, 0, 0)
      return c.toDataURL("image/png")
    }

    /** Aplica o conteudo do fabric na textura do mesh de impressao. */
    commitPrint(printName) {
      const p = this.prints[printName]
      if (!p || !p.fabric) return
      const url = this._printTextureURL(printName)
      // invertY=true: a textura vem do canvas (top-down) e o UV do OBJ cresce de baixo p/ cima
      const tex = new BABYLON.Texture(url, this.scene, false, true, BABYLON.Texture.BILINEAR_SAMPLINGMODE)
      const transparent = !!p.settings.transparentBackground
      tex.hasAlpha = transparent
      // o mesh de impressao e um cilindro: u=0..1 percorre 360 graus.
      // uScale=-1 corrige a mao-pra-obra dos UVs do Blender (mesma logica do original);
      // printSettings.invertX=true desliga essa correcao (ex: glass_chopp_mug/print)
      tex.uScale = p.settings.invertX ? 1 : -1
      // uOffset desloca o design ao longo do wrap; 0.1465 coloca o centro do design
      // de frente para a camera (calibrado pela silhueta do produto)
      tex.uOffset = p.settings.uOffset ?? 0.1465
      tex.vScale = 1
      tex.wrapU = BABYLON.Texture.WRAP_ADDRESSMODE
      tex.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
      if (p.texture) p.texture.dispose()
      p.texture = tex

      for (const m of p.meshes) {
        const mat = m.material
        if (!mat) continue
        const isPBR = mat.getClassName() === "PBRMaterial"
        if (isPBR) {
          mat.albedoTexture = tex
          mat.useAlphaFromAlbedoTexture = transparent
        } else {
          mat.diffuseTexture = tex
          mat.useAlphaFromDiffuseTexture = transparent
          if (this._materialPreset(mat.name.replace(/^.*?_/, "")).clampTexture) {
            mat.diffuseTexture.wrapV = BABYLON.Texture.CLAMP_ADDRESSMODE
          }
        }
        mat.alpha = 1
        mat.transparencyMode = transparent
          ? BABYLON.Material.MATERIAL_ALPHABLEND
          : BABYLON.Material.MATERIAL_OPAQUE
      }

      // com efeito ativo, a camada "decal" tambem recebe a artwork (alpha vem da textura)
      if ((this.template.effects || []).length) {
        for (const m of this.modelMeshes || []) {
          if (!m.isDecalMesh) continue
          const mat = m.material
          if (!mat) continue
          mat.diffuseTexture = tex
          mat.useAlphaFromDiffuseTexture = true
          mat.alpha = 1
          m.isVisible = true
        }
      }
    }

    /**
     * Resolve um nome de grupo de cores nas malhas correspondentes.
     * No catalogo os nomes vem no plural ("handles", "prints") e as malhas no
     * singular com sufixo de duplicata ("handle", "handle.001").
     */
    _colorMeshTargets(name) {
      const stem = String(name).replace(/\.\d+$/, "")
      const cands = new Set([stem])
      if (/s$/.test(stem)) cands.add(stem.replace(/s$/, ""))
      const out = []
      for (const [n, m] of this.meshByName) {
        const s = n.replace(/\.\d+$/, "")
        if (cands.has(s)) out.push(m)
      }
      return out
    }

    /** Info de um grupo de cores (para a UI): e area de impressao? cor atual? */
    colorGroupInfo(name) {
      const targets = this._colorMeshTargets(name)
      const isPrint =
        targets.length > 0 && targets.every((m) => m.isPrintMesh) &&
        targets.some((m) => !!this._printForMesh(m))
      if (isPrint) {
        const p = this._printForMesh(targets[0])
        return { isPrint: true, current: (p && p.baseColor) || "#ffffff" }
      }
      return { isPrint: false, current: null }
    }

    /** Encontra a area de impressao que contem a malha. */
    _printForMesh(mesh) {
      for (const p of Object.values(this.prints)) {
        if (p.meshes.includes(mesh)) return p
      }
      return null
    }

    /**
     * Define a cor de um grupo de malhas.
     * Se o grupo for a area de impressao, a cor vira a COR BASE da textura
     * (o design e impresso por cima e nao e tintado) - como o original faz
     * com baseTexture/background no canvas do Fabric.
     */
    setMeshColor(meshName, hex) {
      const targets = this._colorMeshTargets(meshName)
      if (!targets.length) {
        const m = this.meshByName.get(meshName)
        if (m) targets.push(m)
      }
      if (!targets.length) return 0

      const prints = new Set()
      for (const m of targets) {
        if (!m.isPrintMesh) { prints.clear(); break }
        const p = this._printForMesh(m)
        if (p) prints.add(p)
      }

      if (prints.size) {
        for (const p of prints) {
          p.baseColor = hex
          this.commitPrint(p.name)
        }
        return targets.length
      }

      const col = BABYLON.Color3.FromHexString(hex)
      for (const m of targets) {
        const mat = m.material
        if (!mat) continue
        if (mat.albedoColor) mat.albedoColor = col.toLinearSpace()
        else if (mat.diffuseColor) mat.diffuseColor = col
      }
      return targets.length
    }

    /** Rotaciona o design ao longo do wrap do produto. */
    setPrintOffset(printName, offset) {
      const p = this.prints[printName]
      if (!p || !p.texture) return
      p.settings.uOffset = offset
      p.texture.uOffset = offset
    }

    // ---------- marca d'agua ----------
    /**
     * Marca d'agua no canto superior esquerdo.
     * Mesmo mecanismo do original: BABYLON.GUI.Image sobre um
     * AdvancedDynamicTexture fullscreen (nao e um mesh, entao fica acima
     * de tudo e nao depende da geometria).
     */
    async setWatermark(url) {
      this.watermarkUrl = url || null
      if (this.watermarkGui) {
        this.watermarkGui.dispose()
        this.watermarkGui = null
        this.watermarkImage = null
      }
      if (!url) {
        this.watermarkOn = false
        return
      }
      // Babylon 5.57: CreateFullscreenUI(name, foreground, scene, sampling, adaptiveScaling)
      const gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
        "watermarkUI", true, this.scene, BABYLON.Texture.BILINEAR_SAMPLINGMODE
      )
      const img = new BABYLON.GUI.Image("watermark", url)
      img.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT
      img.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP
      img.widthInPixels = 1
      img.heightInPixels = 1
      gui.addControl(img)
      img.onImageLoadedObservable.add(() => this._updateWatermarkSize())
      this.watermarkGui = gui
      this.watermarkImage = img
      this.watermarkOn = true
      await new Promise((res) => {
        if (img.imageWidth) res()
        else img.onImageLoadedObservable.addOnce(() => res())
      })
      this._updateWatermarkSize()
    }

    /** Redimensiona a marca d'agua proporcionalmente a resolucao do render. */
    _updateWatermarkSize() {
      if (!this.watermarkImage) return
      const w = Math.max(2, this.engine.getRenderWidth())
      const h = Math.max(2, this.engine.getRenderHeight())
      const nw = this.watermarkImage.imageWidth || 1
      const nh = this.watermarkImage.imageHeight || 1
      const target = Math.min(nw, w * (this.watermarkScale ?? 0.13))
      this.watermarkImage.widthInPixels = target
      this.watermarkImage.heightInPixels = (target * nh) / nw
    }

    setWatermarkScale(pct) {
      this.watermarkScale = pct
      this._updateWatermarkSize()
    }

    toggleWatermark(on) {
      this.watermarkOn = on
      if (this.watermarkImage) this.watermarkImage.isVisible = on
    }

    /** PNG da marca d'agua (para compor a folha de estudio em 2D). */
    async _watermarkDataURL(refWidth) {
      if (!this.watermarkUrl) return null
      const img = await loadImage(this.watermarkUrl)
      const base = refWidth || this.engine.getRenderWidth()
      const w = Math.round(Math.min(img.width, base * (this.watermarkScale ?? 0.13)))
      const h = Math.round((w * img.height) / img.width)
      const c = document.createElement("canvas")
      c.width = w
      c.height = h
      c.getContext("2d").drawImage(img, 0, 0, w, h)
      return c.toDataURL("image/png")
    }

    // ---------- export ----------
    exportPNG(width) {
      const ratio = this.engine.getRenderHeight() / this.engine.getRenderWidth()
      const h = Math.round(width * ratio)
      // usa o canvas (e nao um RTT) para incluir a GUI da marca d'agua e a Layer de fundo
      return this._snapshot(width, h)
    }

    /** Bounding box do produto em espaco de mundo. */
    _productBounds() {
      const lo = [Infinity, Infinity, Infinity]
      const hi = [-Infinity, -Infinity, -Infinity]
      for (const m of this.modelMeshes || []) {
        m.computeWorldMatrix(true)
        const b = m.getBoundingInfo().boundingBox
        const mn = b.minimumWorld
        const mx = b.maximumWorld
        lo[0] = Math.min(lo[0], mn.x); hi[0] = Math.max(hi[0], mx.x)
        lo[1] = Math.min(lo[1], mn.y); hi[1] = Math.max(hi[1], mx.y)
        lo[2] = Math.min(lo[2], mn.z); hi[2] = Math.max(hi[2], mx.z)
      }
      const min = new BABYLON.Vector3(lo[0], lo[1], lo[2])
      const max = new BABYLON.Vector3(hi[0], hi[1], hi[2])
      return { min, max, center: min.add(max).scale(0.5), size: max.subtract(min) }
    }

    /**
     * Enquadra o produto automaticamente na view. Usa a extensao PROJETADA
     * (e nao o bbox) para a distancia da camera, senao a perspectiva corta o topo.
     * IMPORTANTE: nao usa camera.setTarget() porque ele recalcula alpha/beta/radius.
     */
    _frameView(v) {
      const b = this._productBounds()
      const beta = v.beta ?? this.camera.beta
      const vExtent = b.size.y * Math.sin(beta) + b.size.z * Math.cos(beta)
      const hExtent = Math.max(b.size.x, b.size.z)
      const vFov = this.camera.fov
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (v.aspect || 1))
      const margin = v.margin ?? 1.25
      const distV = (vExtent * 0.5 * margin) / Math.tan(vFov / 2)
      const distH = (hExtent * 0.5 * margin) / Math.tan(hFov / 2)
      const dist = Math.max(distV, distH)
      const target = b.center
      if (v.lift) target.y += v.lift
      // muta o target in-place: setTarget() sobrescreveria alpha/beta/radius
      this.camera.target.copyFrom(target)
      if (v.alpha !== undefined) this.camera.alpha = v.alpha
      this.camera.beta = beta
      this.camera.radius = Math.min(dist, this.camera.upperRadiusLimit)
    }

    /** Snapshot do canvas principal (preserva alpha) em resolucao arbitraria. */
    _snapshot(width, height) {
      const e = this.engine
      e.setSize(width, height)
      this.scene.render()
      const url = this.canvas.toDataURL("image/png")
      e.resize()
      this.scene.render()
      return url
    }

    /** Plano que captura apenas a sombra (o resto fica transparente). */
    _shadowCatcher(altitude) {
      if (!BABYLON.ShadowOnlyMaterial) return null
      if (!this.shadowCatcher) {
        const m = BABYLON.MeshBuilder.CreateBox(
          "shadowOnlyPlane", { width: 200, height: 1, depth: 200 }, this.scene
        )
        m.material = new BABYLON.ShadowOnlyMaterial("shadowOnlyMaterial", this.scene)
        m.receiveShadows = true
        m.isVisible = false
        m.isPickable = false
        this.shadowCatcher = m
      }
      this.shadowCatcher.position.y = altitude
      this.shadowCatcher.material.alpha = this.dirLight.intensity / 10
      return this.shadowCatcher
    }

    /** Rotacao rigida do produto em torno do eixo vertical na base (e do tilt na base). */
    _setSheetTransform(rotY, tiltX = 0, tiltZ = 0) {
      const R = BABYLON.Quaternion.RotationYawPitchRoll(rotY, tiltX, tiltZ)
      const P = new BABYLON.Vector3(0, this.template.plankAltitude ?? -20, 0)
      for (const m of this.modelMeshes || []) {
        const base = m.rotationQuaternion
          ? m.rotationQuaternion.clone()
          : BABYLON.Quaternion.FromEulerAngles(m.rotation.x, m.rotation.y, m.rotation.z)
        m.position = m.position.subtract(P).applyRotationQuaternion(R).add(P)
        m.rotationQuaternion = R.multiply(base)
        m.rotation.set(0, 0, 0)
      }
    }

    _saveObjectTransform() {
      return (this.modelMeshes || []).map((m) => ({
        m,
        pos: m.position.clone(),
        rot: m.rotation.clone(),
        q: m.rotationQuaternion ? m.rotationQuaternion.clone() : null,
      }))
    }

    _restoreObjectTransform(saved) {
      for (const s of saved) {
        s.m.position.copyFrom(s.pos)
        s.m.rotation.copyFrom(s.rot)
        s.m.rotationQuaternion = s.q
      }
    }

    /**
     * Export "folha de estudio": fundo branco, N views do produto com sombra
     * de contato e o artwork plano flutuando (padrao do Rapid Mockup).
     */
    async exportStudio(opts = {}) {
      const o = {
        width: 1600,
        ratio: 0.75,          // 4:3 como nas referencias
        views: SHEET_VIEWS,
        card: true,
        cardAngle: -0.085,
        ...opts,
      }
      const W = o.width
      const H = Math.round(W * o.ratio)
      const sheet = document.createElement("canvas")
      sheet.width = W
      sheet.height = H
      const g = sheet.getContext("2d")
      g.fillStyle = "#ffffff"
      g.fillRect(0, 0, W, H)

      const saved = {
        sky: this.skybox ? this.skybox.isVisible : null,
        plank: this.scene.getMeshByName("plane"),
        plankWasVisible: this.scene.getMeshByName("plane")
          ? this.scene.getMeshByName("plane").isVisible
          : true,
        bgTex: this.backgroundLayer.texture,
        catcher: this.shadowCatcher ? this.shadowCatcher.isVisible : null,
        objects: this._saveObjectTransform(),
        cam: {
          alpha: this.camera.alpha, beta: this.camera.beta,
          radius: this.camera.radius, target: this.camera.target.clone(),
        },
      }
      const catcher = o.shadow === false ? null : this._shadowCatcher(this.template.plankAltitude ?? -20)

      // modo estudio: sem ceu, sem mesa, sem fundo 2D, apenas o catcher de sombra
      if (this.skybox) this.skybox.isVisible = false
      if (saved.plank) saved.plank.isVisible = false
      if (catcher) catcher.isVisible = true
      this.backgroundLayer.texture = null
      // impede que o hook de resize (do _snapshot) recrie o fundo 2D
      this._suppressBgCrop = true
      // a GUI da marca d'agua sai de cena: ela e composta uma vez na folha final
      if (this.watermarkImage) this.watermarkImage.isVisible = false

      try {
        // o slot de cada view se adapta ao aspecto do produto (assim serve
        // tanto pra 1 caneca quanto pro grupo de 3)
        const bb = this._productBounds()
        const prodAspect = Math.max(bb.size.x, bb.size.z) / Math.max(bb.size.y, 1)

        for (const v of o.views) {
          this._setSheetTransform(v.rotY || 0, v.tiltX || 0, v.tiltZ || 0)
          let vw = Math.round(v.w * W)
          let vh = Math.round(vw / prodAspect)
          const maxH = Math.round(v.h * H)
          if (vh > maxH) {
            vh = maxH
            vw = Math.round(vh * prodAspect)
          }
          this._frameView({ ...v, aspect: vw / vh })
          this.scene.render()
          const url = this._snapshot(vw, vh)
          const img = await loadImage(url)
          const cx = (v.x + v.w / 2) * W
          const cy = (v.y + v.h / 2) * H
          g.drawImage(img, Math.round(cx - vw / 2), Math.round(cy - vh / 2), vw, vh)
        }
      } finally {
        // restaura
        this._restoreObjectTransform(saved.objects)
        if (this.skybox && saved.sky !== null) this.skybox.isVisible = saved.sky
        if (saved.plank) saved.plank.isVisible = saved.plankWasVisible
        if (catcher) catcher.isVisible = saved.catcher !== null ? saved.catcher : false
        this.backgroundLayer.texture = saved.bgTex
        this._suppressBgCrop = false
        if (this.watermarkImage) this.watermarkImage.isVisible = this.watermarkOn
        this.camera.target.copyFrom(saved.cam.target)
        this.camera.alpha = saved.cam.alpha
        this.camera.beta = saved.cam.beta
        this.camera.radius = saved.cam.radius
        this.scene.render()
      }

      // artwork plano flutuando (topo-esquerda, inclinado, drop shadow forte)
      if (o.card) {
        const art = await this._artworkDataURL()
        if (art) {
          const img = await loadImage(art)
          const cw = Math.round(0.47 * W)
          const ch = Math.min(Math.round(0.30 * H), Math.round(cw * (img.height / img.width)))
          const cx = 0.035 * W + cw / 2
          const cy = 0.035 * H + ch / 2
          g.save()
          g.translate(cx, cy)
          g.rotate(o.cardAngle)
          g.shadowColor = "rgba(0,0,0,0.26)"
          g.shadowBlur = Math.round(0.030 * W)
          g.shadowOffsetX = Math.round(0.010 * W)
          g.shadowOffsetY = Math.round(0.016 * W)
          g.fillStyle = "#ffffff"
          g.fillRect(-cw / 2, -ch / 2, cw, ch)
          g.shadowColor = "transparent"
          g.drawImage(img, -cw / 2, -ch / 2, cw, ch)
          g.restore()
        }
      }

      // marca d'agua no canto superior esquerdo da folha
      if (o.watermark !== false && this.watermarkOn) {
        const wm = await this._watermarkDataURL(W)
        if (wm) {
          const img = await loadImage(wm)
          const mw = img.width
          const mh = img.height
          g.drawImage(img, Math.round(0.022 * W), Math.round(0.022 * W), mw, mh)
        }
      }

      return sheet.toDataURL("image/png")
    }

    /** PNG do artwork (design) da impressao ativa. */
    async _artworkDataURL() {
      const names = Object.keys(this.prints)
      const p = this.prints[names[0]]
      if (!p || !p.fabric) return null
      const url = p.fabric.toDataURL({ format: "png", quality: 1 })
      const img = await loadImage(url)
      // recorta para o conteudo real (ignora o resto transparente)
      const c = document.createElement("canvas")
      c.width = img.width
      c.height = img.height
      const g = c.getContext("2d")
      g.drawImage(img, 0, 0)
      const d = g.getImageData(0, 0, c.width, c.height).data
      let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          if (d[(y * c.width + x) * 4 + 3] > 8) {
            if (x < x0) x0 = x
            if (x > x1) x1 = x
            if (y < y0) y0 = y
            if (y > y1) y1 = y
          }
        }
      }
      if (x1 <= x0 || y1 <= y0) return null
      const out = document.createElement("canvas")
      out.width = x1 - x0 + 1
      out.height = y1 - y0 + 1
      out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height)
      return out.toDataURL("image/png")
    }

    describe() {
      const s = this.template.settings
      return {
        template: this.template.name,
        object: this.template.object,
        meshes: [...this.meshByName.keys()],
        prints: Object.values(this.prints).map((p) => ({
          name: p.name,
          size: p.settings.size,
          meshes: p.meshes.map((m) => m.name),
        })),
        colorMeshes: s.colorMeshNames || [],
        baseMaterial: s.baseMaterial,
      }
    }
  }

  return { Renderer }
})()
