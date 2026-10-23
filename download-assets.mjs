import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs"
import { dirname, join } from "node:path"

const ORIGIN = "https://alpha.rapidmockup.net"
const root = process.argv[2]
const catalog = JSON.parse(readFileSync(join(root, "catalog.json"), "utf8"))
const assets = join(root, "assets")

const log = (...a) => console.log(...a)
let done = 0, failed = 0, bytes = 0

async function fetchBuf(url) {
  const res = await fetch(url, { redirect: "follow" })
  if (!res.ok) return null
  const buf = Buffer.from(await res.arrayBuffer())
  return buf
}

async function grab(relPath, { optional = false } = {}) {
  const localPath = relPath.replace(/^\//, "").replace(/[?#].*$/, "")
  const dest = join(assets, localPath)
  if (existsSync(dest) && statSync(dest).size > 0) {
    done++; bytes += statSync(dest).size
    return true
  }
  const url = ORIGIN + "/" + relPath.replace(/^\//, "")
  try {
    const buf = await fetchBuf(url)
    if (!buf) {
      if (!optional) { failed++; log(`  FALHOU ${relPath}`) }
      return false
    }
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, buf)
    done++; bytes += buf.length
    return true
  } catch (e) {
    if (!optional) { failed++; log(`  ERRO ${relPath}: ${e.message}`) }
    return false
  }
}

async function pool(items, n, fn) {
  let i = 0
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++
        await fn(items[k], k)
      }
    })
  )
}

// ---------- 1. modelos 3D ----------
const objects = [...new Set(catalog.templates.map((t) => t.object))]
log(`[1/5] ${objects.length} modelos 3D`)
await pool(objects, 8, async (obj) => {
  const ok = await grab(`objects/models/${obj}/model.obj?v=7`)
  if (ok) {
    const mtl = await fetchBuf(`${ORIGIN}/objects/models/${obj}/model.mtl`)
    if (mtl) {
      mkdirSync(join(assets, "objects/models", obj), { recursive: true })
      writeFileSync(join(assets, "objects/models", obj, "model.mtl"), mtl)
      // refs map_* dentro do mtl
      const txt = mtl.toString("utf8")
      for (const mm of txt.matchAll(/map_[A-Za-z]+\s+([^\s]+)/g)) {
        await grab(`objects/models/${obj}/${mm[1]}`, { optional: true })
      }
    }
  }
})

// ---------- 2. texturas do catalogo ----------
log(`[2/5] texturas referenciadas no catalogo`)
const texPaths = new Set()
for (const t of catalog.templates) {
  const s = t.settings
  if (s.meshMaterialSettings) {
    for (const p of Object.values(s.meshMaterialSettings)) {
      for (const k of ["normalTextureUrl", "albedoTextureUrl", "metallicTextureUrl", "ambientTextureUrl", "heightTextureUrl", "parallaxTextureUrl"]) {
        if (p[k]) texPaths.add(p[k])
      }
    }
  }
  for (const p of Object.values(s.printSettings || {})) {
    if (p.baseTexture) texPaths.add(p.baseTexture)
    if (p.background) texPaths.add(p.background)
  }
}
for (const p of texPaths) {
  if (p.startsWith("/")) await grab(p, { optional: true })
  else {
    // relativo ao diretorio do modelo do template que referencia
    for (const t of catalog.templates) {
      const ps = Object.values(t.settings.printSettings || {})
      if (ps.some((x) => x.baseTexture === p || x.background === p)) {
        await grab(`objects/models/${t.object}/${p}`, { optional: true })
      }
    }
  }
}

// ---------- 3. HDR (IBL) ----------
log(`[3/5] ${catalog.skyboxes.length} HDR env`)
await pool(catalog.skyboxes, 4, (sb) => grab(`objects/hdr/v1/${sb}/01SpecularHDR.dds`, { optional: true }))

// ---------- 4. skybox cubemap ----------
log(`[4/5] ${catalog.skyboxes.length} skybox cubemap`)
const faces = ["px", "py", "pz", "nx", "ny", "nz"]
await pool(catalog.skyboxes, 4, async (sb) => {
  for (const f of faces) await grab(`objects/skybox/v3/${sb}/skybox_${f}.jpg`, { optional: true })
})

// ---------- 5. texturas globais ----------
log(`[5/5] texturas globais`)
for (const p of ["textures/wood8.jpg", "textures/reflectivity.png", "textures/metallic/glitter.png", "textures/metallic/roughness.png"]) {
  await grab(p)
}

// ---------- vendor ----------
log("[vendor] babylon + fabric")
await pool(
  [
    ["https://cdn.jsdelivr.net/npm/babylonjs@5.57.1/babylon.min.js", "vendor/babylon.min.js"],
    ["https://cdn.jsdelivr.net/npm/babylonjs-loaders@5.57.1/babylonjs.loaders.min.js", "vendor/babylonjs.loaders.min.js"],
    ["https://cdn.jsdelivr.net/npm/fabric@5.3.0/dist/fabric.min.js", "vendor/fabric.min.js"],
  ],
  3,
  async ([url, rel]) => {
    const dest = join(root, rel)
    if (existsSync(dest) && statSync(dest).size > 0) return
    const buf = await fetchBuf(url)
    if (!buf) { failed++; log(`  FALHOU ${url}`); return }
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, buf)
    done++; bytes += buf.length
  }
)

log(`\nOK: ${done} arquivos  ·  FALHAS: ${failed}  ·  ${(bytes / 1048576).toFixed(1)} MB`)
