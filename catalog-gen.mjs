import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"

// uso: node catalog-gen.mjs <dir-do-bundle> [catalog.json] [--scope=mugs,chopp_mugs]
const __args = process.argv.slice(2)
const scopeArg = (__args.find((a) => a.startsWith("--scope=")) || "").slice(8)
const dir = process.env.REA_BUNDLE || __args[0]
const outFile = __args[1] && !__args[1].startsWith("--") ? __args[1] : "catalog.json"
const scope = (scopeArg || "mugs,chopp_mugs").split(",").map((s) => s.trim())

const tp = JSON.parse(readFileSync(`${dir}/templates.raw.json`, "utf8"))
const ms = JSON.parse(readFileSync(`${dir}/meshsettings.raw.json`, "utf8"))

// mapa categoria -> template (extraido do bundle)
const app = readFileSync(`${dir}/app.js`, "utf8")
const anchor = app.indexOf('chopp_mug:"chopp_mugs"')
let start = app.lastIndexOf("{", anchor)
let depth = 0, end = -1, inStr = false, q = ""
for (let k = start; k < app.length; k++) {
  const c = app[k]
  if (inStr) { if (c === "\\") { k++; continue } if (c === q) inStr = false; continue }
  if (c === '"' || c === "'") { inStr = true; q = c; continue }
  if (c === "{") depth++
  else if (c === "}") { depth--; if (depth === 0) { end = k; break } }
}
const categories = eval("(" + app.slice(start, end + 1) + ")")

const msByType = new Map(ms.map((m) => [m.type, m]))

function deepMerge(base, over) {
  if (!over || typeof over !== "object" || Array.isArray(over)) return over === undefined ? base : over
  const out = { ...(base && typeof base === "object" ? base : {}) }
  for (const [k, v] of Object.entries(over)) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) ? deepMerge(out[k], v) : v
  }
  return out
}

// --- materiais (extraidos das classes do bundle) ---
const MATERIALS = {
  pbrMaterial:      { metallic: 0.1,  roughness: 0.15,  envIntensity: 0.77, specularIntensity: 0.05, alpha: 1 },
  decal:            { alpha: 0.5, alphaFromDiffuseTexture: true, clampTexture: true, emissiveFactor: 0.85 },
  translucent_decal:{ emissiveFactor: 0.77, isDecal: true },
  cloth:            { metallic: 0,    roughness: 1,     envIntensity: 0.84, specularIntensity: 0 },
  paper:            { metallic: 0,    roughness: 0.9,   envIntensity: 1.2,  specularIntensity: 0.025 },
  mirror:           { metallic: 1,    roughness: 0,     envIntensity: 0.4 },
  chrome:           { metallic: 0.9,  roughness: 0.15,  envIntensity: 0.8 },
  plastic:          { metallic: 0,    roughness: 0.2,   envIntensity: 0.8 },
  silicone:         { metallic: 0,    roughness: 0.6,   envIntensity: 0.9,  specularIntensity: 0.025 },
  aluminum:         { metallic: 0.9,  roughness: 0.2,   envIntensity: 0.9 },
  porcelain:        { metallic: 0,    roughness: 0,     envIntensity: 0.8 },
  dark_cloth:       { metallic: 0,    roughness: 1,     envIntensity: 0.3 },
  brighter_plastic: { metallic: 0,    roughness: 0.2,   envIntensity: 0.83 },
  brighter_plastic2:{ metallic: 0,    roughness: 0.2,   envIntensity: 1.1 },
  transparent_glass:{ metallic: 0.4,  roughness: 0.162, envIntensity: 1.05, alpha: 0.45, withRefraction: true, refractionIndex: 0.1 },
  transparent_glass2:{metallic: 0.4,  roughness: 0.159, envIntensity: 0.225, alpha: 0.25, withRefraction: true, refractionIndex: 0.1 },
  transparent_glass3:{metallic: 0.3,  roughness: 0.7,   envIntensity: 0.85, alpha: 0.25, withRefraction: true, refractionIndex: 0.005 },
  transparent_glass4:{metallic: 0.4,  roughness: 0.197, envIntensity: 0.72, alpha: 0.122, withRefraction: true, refractionIndex: 0.1 },
  transparent_plastic:{metallic: 0.1, roughness: 0.3,   envIntensity: 0.7,  alpha: 0.45 },
  reflective_plastic:{metallic: 0,    roughness: 0.1,   envIntensity: 0.7 },
  reflective_cloth: { metallic: 0.3,  roughness: 1,     envIntensity: 1 },
  etched_glass:     { metallic: 0.4,  roughness: 0.3,   envIntensity: 1.05, alpha: 0.77, withRefraction: false, refractionIndex: 0.1 },
  satin:            { metallic: 0.42, roughness: 0.471, envIntensity: 0.83, specularIntensity: 0.025 },
  glitter:          { metallic: 1.1,  roughness: 0.7,   envIntensity: 2 },
  matte_plastic:    { metallic: 0,    roughness: 0.3,   envIntensity: 1.1 },
  polyester:        { metallic: 0.6,  roughness: 1,     envIntensity: 1 },
  matte_aluminum:   { metallic: 0.9,  roughness: 0.425, envIntensity: 0.55 },
  wood:             { metallic: 0,    roughness: 0.9,   envIntensity: 0.75, specularIntensity: 0.025 },
  varnished_wood:   { metallic: 0,    roughness: 0.07,  envIntensity: 0.75, specularIntensity: 0.025 },
  gold:             { metallic: 0.9,  roughness: 0.2,   envIntensity: 1.3, albedoColor: [1, 0.8, 0.4] },
  stainless_steel: { metallic: 0.9,  roughness: 0.25,  envIntensity: 1.0 },
  better_decal:     { alpha: 0.5, alphaFromDiffuseTexture: true, clampTexture: true, emissiveFactor: 0.85 },
}

const SKYBOXES = ["photostudio", "lebombo", "autumn", "spruit", "veranda", "entrance", "wooden", "lythwood", "hotel", "bologni", "venice"]

const templates = []
const seen = new Set()
for (const t of tp) {
  const category = categories[t.name]
  if (!category || !scope.includes(category)) continue
  if (seen.has(t.name)) continue
  seen.add(t.name)
  const objName = t.objectNames[0]
  let settings = msByType.get(objName) ? { ...msByType.get(objName) } : null
  if (t.overwriteSettings && t.overwriteSettings[objName]) {
    settings = deepMerge(settings || { type: objName }, t.overwriteSettings[objName])
  }
  if (!settings) continue
  templates.push({
    name: t.name,
    category,
    pro: !!t.onlyPro,
    object: objName,
    plankAltitude: t.plankAltitude ?? 0,
    defaultScene: t.defaultScene || "photostudio",
    lights: t.lights || null,
    frontLight: t.frontLight || null,
    effects: t.effects || [],
    useLegacyMode: !!t.useLegacyMode,
    settings,
  })
}

const catalog = {
  generatedFrom: "rapidmockup alpha bundle (app.js) — extracted constants",
  materials: MATERIALS,
  skyboxes: SKYBOXES,
  // fundos 2D proprios (ficam em assets/backgrounds)
  backgrounds: (() => {
    const dir = join(process.env.REA_ASSETS || "assets", "backgrounds")
    if (!existsSync(dir)) return []
    return readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp)$/i.test(f))
      .map((f) => ({ id: f.replace(/\.[^.]+$/, ""), file: `backgrounds/${f}`, name: f }))
  })(),
  // marcas d'agua proprias (ficam em assets/watermarks)
  watermarks: (() => {
    const dir = join(process.env.REA_ASSETS || "assets", "watermarks")
    if (!existsSync(dir)) return []
    return readdirSync(dir)
      .filter((f) => /\.(jpe?g|png|webp|svg)$/i.test(f))
      .map((f) => ({ id: f.replace(/\.[^.]+$/, ""), file: `watermarks/${f}`, name: f }))
  })(),
  scene: {
    camera: { alpha: Math.PI / 2, beta: Math.PI / 2.5, radius: 140, fov: 0.6, lowerRadius: 50, upperRadius: 300 },
    dirLight: { direction: [0.25, -5, -0.25], intensity: 3, shadowMinZ: -100 },
    legacyDirLight: { direction: [-4, -5, -1], position: [20, 30, 20], intensity: 2.5 },
    hemi: { dir: [[0, 1, 1], [0, 1, -1]], groundColor: [0.47, 0.47, 0.47], defaultIntensity: 0.5 },
    shadow: { mapSize: 128, blurExponential: true, transparencyShadow: true, softTransparent: true },
    woodPlank: { texture: "textures/wood8.jpg", environmentIntensity: 0.5, specularIntensity: 0.001, roughness: 0.9, metallic: 0 },
    reflectivityTexture: "textures/reflectivity.png",
  },
  templates,
}

writeFileSync(outFile, JSON.stringify(catalog, null, 1))
console.log(`catalogo: ${templates.length} templates (${scope.join(", ")})`)
console.log(`  pro: ${templates.filter((t) => t.pro).length}   livres: ${templates.filter((t) => !t.pro).length}`)
console.log(`  categorias: ${[...new Set(templates.map((t) => t.category))].join(", ")}`)
console.log(`-> ${outFile}`)
console.log(`objetos 3D unicos: ${[...new Set(templates.map((t) => t.object))].length}`)
console.log([...new Set(templates.map((t) => t.object))].join(" "))
