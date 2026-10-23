"use strict"

const $ = (s) => document.querySelector(s)

let CATALOG, RENDERER, CURRENT = null, ACTIVE_PRINT = null, DESIGN_URL = null
let EDITOR_OPEN = false
const DEFAULT_TEMPLATE = "three_mugs"

async function boot() {
  CATALOG = await (await fetch("catalog.json")).json()
  RENDERER = new MockupRenderer.Renderer($("#scene"), CATALOG)
  window.__R = RENDERER

  const sc = $("#sceneSel")
  const bg = document.createElement("optgroup")
  bg.label = "fundos 2D"
  for (const b of CATALOG.backgrounds || []) {
    const o = document.createElement("option")
    o.value = "bg:" + b.id
    o.textContent = b.name
    bg.appendChild(o)
  }
  if (CATALOG.backgrounds && CATALOG.backgrounds.length) sc.appendChild(bg)
  const hg = document.createElement("optgroup")
  hg.label = "HDRI"
  for (const s of CATALOG.skyboxes) {
    const o = document.createElement("option")
    o.value = s
    o.textContent = s
    hg.appendChild(o)
  }
  sc.appendChild(hg)
  // default: fundo 2D (primeiro background), senao photostudio
  sc.value = CATALOG.backgrounds && CATALOG.backgrounds.length ? "bg:" + CATALOG.backgrounds[0].id : "photostudio"

  const wm = $("#wmSel")
  const wnone = document.createElement("option")
  wnone.value = ""
  wnone.textContent = "(sem marca d'agua)"
  wm.appendChild(wnone)
  for (const w of CATALOG.watermarks || []) {
    const o = document.createElement("option")
    o.value = w.id
    o.textContent = w.name
    wm.appendChild(o)
  }
  wm.value = CATALOG.watermarks && CATALOG.watermarks.length ? CATALOG.watermarks[0].id : ""
  $("#wmSize").value = 0.13
  $("#wmSizeVal").textContent = "13%"

  buildTemplateList("")
  $("#tplSearch").addEventListener("input", (e) => buildTemplateList(e.target.value))
  sc.addEventListener("change", () => applyScene(sc.value))
  $("#wmSel").addEventListener("change", () => applyWatermark($("#wmSel").value))
  $("#wmOn").addEventListener("change", (e) => {
    RENDERER.toggleWatermark(e.target.checked)
  })
  $("#wmSize").addEventListener("input", (e) => {
    $("#wmSizeVal").textContent = Math.round(e.target.value * 100) + "%"
    RENDERER.setWatermarkScale(parseFloat(e.target.value))
  })
  $("#wmFile").addEventListener("change", onWatermarkFile)
  $("#file").addEventListener("change", onFile)
  $("#edFile").addEventListener("change", onFile)
  $("#clearBtn").addEventListener("click", clearDesign)
  $("#edClear").addEventListener("click", clearDesign)
  $("#fitBtn").addEventListener("click", fitDesign)
  $("#edFit").addEventListener("click", fitDesign)
  $("#exportBtn").addEventListener("click", onExport)
  $("#rot").addEventListener("input", onRotate)
  $("#edRot").addEventListener("input", onRotate)
  $("#editBtn").addEventListener("click", openEditor)
  $("#edClose").addEventListener("click", closeEditor)
  $("#edZoom").addEventListener("input", onZoom)
  $("#editor").addEventListener("click", (e) => { if (e.target.id === "editor") closeEditor() })
  $("#designWrap").addEventListener("click", () => { if (!EDITOR_OPEN) openEditor() })
  $("#designWrap").style.cursor = "zoom-in"
  $("#designWrap").title = "clique para abrir o editor em tela cheia"
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && EDITOR_OPEN) closeEditor() })

  await loadTemplate(DEFAULT_TEMPLATE)
  await applyScene($("#sceneSel").value)
  await applyWatermark($("#wmSel").value)
  $("#log").style.display = "none"
}

/** Aplica a marca d'agua escolhida (ou nenhuma). */
async function applyWatermark(value) {
  const list = CATALOG.watermarks || []
  if (!value) {
    await RENDERER.setWatermark(null)
    $("#wmOn").checked = false
    return
  }
  const w = list.find((x) => x.id === value)
  if (!w) return
  await RENDERER.setWatermark(`assets/${w.file}`)
  $("#wmOn").checked = RENDERER.watermarkOn
  $("#wmSize").value = RENDERER.watermarkScale ?? 0.13
  $("#wmSizeVal").textContent = Math.round($("#wmSize").value * 100) + "%"
}

function onWatermarkFile(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  const rd = new FileReader()
  rd.onload = async () => {
    await RENDERER.setWatermark(rd.result)
    $("#wmOn").checked = RENDERER.watermarkOn
  }
  rd.readAsDataURL(f)
}

/** Aplica a cena escolhida: fundo 2D (Layer) ou HDRI (skybox + env). */
async function applyScene(value) {
  if (!value) return
  if (value.startsWith("bg:")) {
    const b = (CATALOG.backgrounds || []).find((x) => x.id === value.slice(3))
    if (b) {
      await RENDERER.setBackgroundImage(`assets/${b.file}`)
      return
    }
  }
  await RENDERER.setBackgroundImage(null)
  await RENDERER.setSkybox(value)
}

function buildTemplateList(filter) {
  const wrap = $("#tplList")
  wrap.innerHTML = ""
  const q = filter.trim().toLowerCase()
  const cats = [...new Set(CATALOG.templates.map((t) => t.category))]
  for (const c of cats) {
    const items = CATALOG.templates.filter(
      (t) => t.category === c && (!q || t.name.toLowerCase().includes(q))
    )
    if (!items.length) continue
    const h = document.createElement("div")
    h.style.cssText = "padding:6px 9px;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#6b7480;background:#14181d"
    h.textContent = c
    wrap.appendChild(h)
    for (const t of items) {
      const d = document.createElement("div")
      d.className = "tpl" + (CURRENT && CURRENT.name === t.name ? " on" : "")
      d.dataset.name = t.name
      const label = document.createElement("span")
      label.textContent = t.name
      d.appendChild(label)
      if (t.pro) {
        const tag = document.createElement("span")
        tag.className = "tag"
        tag.textContent = "PRO"
        d.appendChild(tag)
      }
      d.onclick = () => loadTemplate(t.name)
      wrap.appendChild(d)
    }
  }
}

async function loadTemplate(name) {
  const t = CATALOG.templates.find((x) => x.name === name)
  if (!t) return
  CURRENT = t
  $("#log").style.display = "grid"
  $("#log").textContent = "carregando " + name + "..."
  buildTemplateList($("#tplSearch").value)
  try {
    const info = await RENDERER.loadTemplate(t)
    $("#sceneSel").value = $("#sceneSel").value
    buildPrintTabs(info)
    buildColors(info)
    $("#info").innerHTML = `
      <div><b>template</b> ${t.name}</div>
      <div><b>objeto</b> ${t.object}</div>
      <div><b>categoria</b> ${t.category}</div>
      <div><b>material base</b> ${t.settings.baseMaterial || "-"}</div>
      <div><b>plankAltitude</b> ${t.plankAltitude}</div>
      <div><b>cena padrao</b> ${t.defaultScene}</div>
      <div><b>meshes</b> ${info.meshes.length}</div>
      <div><b>impressoes</b> ${info.prints.map((p) => p.name).join(", ") || "-"}</div>
      <div><b>pro (pago no original)</b> ${t.pro ? "sim" : "nao"}</div>`
  } catch (e) {
    $("#log").textContent = "erro: " + e.message
    console.error(e)
    return
  }
  $("#log").style.display = "none"
}

function buildPrintTabs(info) {
  const wrap = $("#printTabs")
  wrap.innerHTML = ""
  ACTIVE_PRINT = null
  for (const p of info.prints) {
    const b = document.createElement("button")
    b.textContent = `${p.name} (${p.size.width}x${p.size.height})`
    b.onclick = () => selectPrint(p.name)
    wrap.appendChild(b)
  }
  if (info.prints.length) selectPrint(info.prints[0].name)
}

function selectPrint(name) {
  ACTIVE_PRINT = name
  document.querySelectorAll("#printTabs button").forEach((b) =>
    b.classList.toggle("on", b.textContent.startsWith(name))
  )
  const p = RENDERER.prints[name]
  const fab = RENDERER.fabricFor(name)

  // preview na sidebar (1x) e editor (4x) usam o mesmo canvas
  if (EDITOR_OPEN) {
    $("#edCanvas").innerHTML = ""
    $("#edCanvas").appendChild(fab.wrapperEl)
    RENDERER.setFabricDisplay(name, p.canvasSize.w, p.canvasSize.h)
    $("#edName").textContent = `${name} (${p.settings.size.width}x${p.settings.size.height} pt)`
  } else {
    $("#designWrap").innerHTML = ""
    $("#designWrap").appendChild(fab.wrapperEl)
    RENDERER.setFabricDisplay(name, p.settings.size.width, p.settings.size.height)
  }

  $("#designMeta").innerHTML =
    `<b>${name}</b> - area ${p.settings.size.width}x${p.settings.size.height} - meshes: <code>${p.meshes.map((m) => m.name).join(", ")}</code>`
  $("#rotRow").style.display = "flex"
  $("#rot").value = p.settings.uOffset ?? 0.1465
  $("#rotVal").textContent = Number($("#rot").value).toFixed(3)
  $("#edRot").value = p.settings.uOffset ?? 0.1465
  $("#edRotVal").textContent = Number($("#edRot").value).toFixed(3)
  $("#edZoom").value = 1
  $("#edZoomVal").textContent = "1.00x"
  if (DESIGN_URL) addImageToFabric(DESIGN_URL)
}

function openEditor() {
  if (!ACTIVE_PRINT) return
  EDITOR_OPEN = true
  $("#editor").classList.add("on")
  const p = RENDERER.prints[ACTIVE_PRINT]
  const fab = RENDERER.fabricFor(ACTIVE_PRINT)
  $("#edCanvas").innerHTML = ""
  $("#edCanvas").appendChild(fab.wrapperEl)
  RENDERER.setFabricDisplay(ACTIVE_PRINT, p.canvasSize.w, p.canvasSize.h)
  $("#edName").textContent = `${ACTIVE_PRINT} (${p.settings.size.width}x${p.settings.size.height} pt)`
  fab.upperCanvasEl.addEventListener("wheel", onWheel, { passive: false })
}

function closeEditor() {
  if (!EDITOR_OPEN) return
  EDITOR_OPEN = false
  $("#editor").classList.remove("on")
  if (!ACTIVE_PRINT) return
  const p = RENDERER.prints[ACTIVE_PRINT]
  const fab = RENDERER.fabricFor(ACTIVE_PRINT)
  fab.upperCanvasEl.removeEventListener("wheel", onWheel)
  $("#designWrap").innerHTML = ""
  $("#designWrap").appendChild(fab.wrapperEl)
  RENDERER.setFabricDisplay(ACTIVE_PRINT, p.settings.size.width, p.settings.size.height)
}

function onRotate() {
  if (!ACTIVE_PRINT) return
  const v = parseFloat($("#rot").value)
  $("#rot").value = v
  $("#edRot").value = v
  $("#rotVal").textContent = v.toFixed(3)
  $("#edRotVal").textContent = v.toFixed(3)
  RENDERER.setPrintOffset(ACTIVE_PRINT, v)
}

function onZoom() {
  if (!ACTIVE_PRINT) return
  const z = parseFloat($("#edZoom").value)
  $("#edZoomVal").textContent = z.toFixed(2) + "x"
  const fab = RENDERER.fabricFor(ACTIVE_PRINT)
  const obj = fab.getActiveObject()
  if (!obj) return
  const p = RENDERER.prints[ACTIVE_PRINT]
  const s = p.fitScale * z
  obj.set({ scaleX: s, scaleY: s })
  obj.setCoords()
  fab.renderAll()
  RENDERER.commitPrint(ACTIVE_PRINT)
}

function onWheel(e) {
  e.preventDefault()
  const input = $("#edZoom")
  const dir = e.deltaY < 0 ? 1.1 : 1 / 1.1
  const v = Math.min(8, Math.max(0.1, parseFloat(input.value) * dir))
  input.value = v
  onZoom()
}

function buildColors(info) {
  const wrap = $("#colorRows")
  wrap.innerHTML = ""
  const names = info.colorMeshes || []
  const def = CURRENT.settings.defaultColors || {}
  if (!names.length) {
    wrap.innerHTML = '<div class="meta">sem malhas coloriveis</div>'
    return
  }
  for (const n of names) {
    const row = document.createElement("div")
    row.className = "row"
    const label = document.createElement("span")
    label.className = "meta"
    label.style.minWidth = "78px"
    const info = RENDERER.colorGroupInfo(n)
    const nTargets = RENDERER._colorMeshTargets(n).length
    label.textContent = n
    label.title = nTargets + " malha(s)"
    const picker = document.createElement("input")
    picker.type = "color"
    const initial = info.isPrint
      ? info.current
      : /^#[0-9a-f]{6}$/i.test(def[n] || "") ? def[n] : "#ffffff"
    picker.value = initial
    const sw = document.createElement("div")
    sw.className = "sw"
    sw.style.background = picker.value
    const cnt = document.createElement("span")
    cnt.className = "meta"
    cnt.textContent = info.isPrint ? "cor base" : nTargets ? nTargets + " malha(s)" : "sem malha"
    picker.oninput = () => {
      const hit = RENDERER.setMeshColor(n, picker.value)
      sw.style.background = picker.value
      cnt.textContent = info.isPrint ? "cor base" : hit ? hit + " malha(s)" : "sem malha"
    }
    row.append(label, picker, sw, cnt)
    wrap.appendChild(row)
  }
}

function onFile(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  const rd = new FileReader()
  rd.onload = () => {
    DESIGN_URL = rd.result
    addImageToFabric(DESIGN_URL)
    $("#edZoom").value = 1
    $("#edZoomVal").textContent = "1.00x"
  }
  rd.readAsDataURL(f)
}

function addImageToFabric(url) {
  if (!ACTIVE_PRINT) return
  const fab = RENDERER.fabricFor(ACTIVE_PRINT)
  const p = RENDERER.prints[ACTIVE_PRINT]
  fab.clear()
  fabric.Image.fromURL(url, (img) => {
    const el = fab.getElement()
    // preenche a area de impressao (o design faz o wrap de 360 graus no produto)
    const s = Math.min(el.width / img.width, el.height / img.height)
    p.fitScale = s
    img.set({
      left: el.width / 2,
      top: el.height / 2,
      originX: "center",
      originY: "center",
      scaleX: s,
      scaleY: s,
    })
    fab.add(img)
    fab.setActiveObject(img)
    fab.renderAll()
    RENDERER.commitPrint(ACTIVE_PRINT)
  })
}

function clearDesign() {
  DESIGN_URL = null
  if (!ACTIVE_PRINT) return
  const fab = RENDERER.fabricFor(ACTIVE_PRINT)
  fab.clear()
  fab.renderAll()
  RENDERER.commitPrint(ACTIVE_PRINT)
}

function fitDesign() {
  if (DESIGN_URL && ACTIVE_PRINT) addImageToFabric(DESIGN_URL)
}

async function onExport() {
  const btn = $("#exportBtn")
  btn.disabled = true
  const old = btn.textContent
  btn.textContent = "Gerando..."
  const w = Math.max(100, Math.min(8000, +$("#expW").value || 2000))
  try {
    const data = $("#expMode").value === "studio"
      ? await RENDERER.exportStudio({ width: w })
      : await RENDERER.exportPNG(w)
    const a = document.createElement("a")
    a.href = data
    a.download =
      $("#expMode").value === "studio"
        ? `${CURRENT.name}-studio-${w}px.png`
        : `${CURRENT.name}-${w}px.png`
    a.click()
  } finally {
    btn.disabled = false
    btn.textContent = old
  }
}

boot().catch((e) => {
  $("#log").style.display = "grid"
  $("#log").textContent = "falha: " + e.message
  console.error(e)
})
