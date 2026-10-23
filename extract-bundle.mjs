import { readFileSync, writeFileSync } from "node:fs"

const app = readFileSync(`${process.argv[2]}/app.js`, "utf8")

function balanced(src, start) {
  let depth = 0, end = -1, inStr = false, q = ""
  for (let k = start; k < src.length; k++) {
    const c = src[k]
    if (inStr) { if (c === "\\") { k++; continue } if (c === q) inStr = false; continue }
    if (c === '"' || c === "'") { inStr = true; q = c; continue }
    if (c === "{") depth++
    else if (c === "}") { depth--; if (depth === 0) { end = k; break } }
  }
  return end
}

function collect(re, marker, out) {
  for (const m of app.matchAll(re)) {
    const start = m.index
    const end = balanced(app, start)
    if (end < 0) continue
    const raw = app.slice(start, end + 1)
    if (raw.length > 12000) continue
    let obj
    try { obj = eval("(" + raw + ")") } catch { continue }
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) continue
    if (typeof obj[marker] !== "string") continue
    out.set(obj[marker], obj)
  }
}

const templates = new Map()
const meshSettings = new Map()
collect(/\{name:"[a-z0-9_]+"/g, "name", templates)
collect(/\{type:"[a-z0-9_]+"/g, "type", meshSettings)

console.log(`templates: ${templates.size}`)
console.log(`meshSettings: ${meshSettings.size}`)

const sample = [...templates.values()].find((t) => t.printSettings) || [...templates.values()][0]
console.log("\n--- exemplo de template ---")
console.log(JSON.stringify(sample, null, 2).slice(0, 2200))

const sample2 = [...meshSettings.values()].find((t) => t.printSettings) || [...meshSettings.values()][0]
console.log("\n--- exemplo de meshSettings ---")
console.log(JSON.stringify(sample2, null, 2).slice(0, 1800))

// chaves usadas
const keys = new Map()
for (const t of templates.values()) for (const k of Object.keys(t)) keys.set(k, (keys.get(k) || 0) + 1)
console.log("\n--- chaves de template (freq) ---")
console.log([...keys.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join("  "))

writeFileSync(`${process.argv[2]}/templates.raw.json`, JSON.stringify([...templates.values()], null, 1))
writeFileSync(`${process.argv[2]}/meshsettings.raw.json`, JSON.stringify([...meshSettings.values()], null, 1))
console.log("\n-> templates.raw.json / meshsettings.raw.json gravados")
