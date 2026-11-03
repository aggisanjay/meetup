import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js'

const SCREENS = ['meeting', 'notes', 'board', 'code']

/* ───────── helpers ───────── */
function tex(loader, name, renderer) {
  const t = loader.load(`/screens/${name}.webp`)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = renderer.capabilities.getMaxAnisotropy()
  return t
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  draw(c.getContext('2d'), w, h)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

const roundRect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.closePath() }

function keysTexture() {
  return canvasTex(1024, 640, (g, w, h) => {
    g.fillStyle = '#1b1b2e'; g.fillRect(0, 0, w, h)
    const rows = [14, 14, 14, 13, 12], rh = 96
    rows.forEach((n, r) => { const kw = (w - 40) / n - 6; for (let i = 0; i < n; i++) { g.fillStyle = '#2b2b45'; roundRect(g, 20 + i * (kw + 6), 24 + r * (rh + 6), kw, rh, 10); g.fill() } })
  })
}

function iconTexture(kind, bg) {
  return canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256); g.fillStyle = bg; roundRect(g, 0, 0, 256, 256, 70); g.fill()
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round'
    if (kind === 'video') { roundRect(g, 58, 86, 100, 84, 18); g.stroke(); g.beginPath(); g.moveTo(166, 116); g.lineTo(204, 94); g.lineTo(204, 162); g.lineTo(166, 140); g.closePath(); g.fill() }
    if (kind === 'mic') { roundRect(g, 100, 54, 56, 96, 28); g.stroke(); g.beginPath(); g.arc(128, 128, 54, 0.1 * Math.PI, 0.9 * Math.PI); g.stroke(); g.beginPath(); g.moveTo(128, 186); g.lineTo(128, 208); g.stroke() }
    if (kind === 'chat') { roundRect(g, 54, 66, 148, 100, 26); g.stroke(); g.beginPath(); g.moveTo(90, 166); g.lineTo(90, 200); g.lineTo(124, 166); g.stroke() }
    if (kind === 'share') { roundRect(g, 54, 70, 148, 96, 14); g.stroke(); g.beginPath(); g.moveTo(128, 148); g.lineTo(128, 96); g.moveTo(104, 118); g.lineTo(128, 94); g.lineTo(152, 118); g.stroke() }
  })
}

function maskTexture(w, h, r) { return canvasTex(w, h, (g) => { g.fillStyle = '#fff'; roundRect(g, 0, 0, w, h, r); g.fill() }) }

/* ───────── models ───────── */
function buildLaptop(screens) {
  const W = 3.4, D = 2.2, g = new THREE.Group()
  const alu = new THREE.MeshPhysicalMaterial({ color: '#d6d8e8', metalness: 0.85, roughness: 0.3, clearcoat: 0.25 })
  const base = new THREE.Mesh(new RoundedBoxGeometry(W, 0.1, D, 5, 0.05), alu); base.position.y = 0.05; base.castShadow = base.receiveShadow = true; g.add(base)
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.5, D * 0.58), new THREE.MeshStandardMaterial({ map: keysTexture(), roughness: 0.6 }))
  deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0.101, -0.2); g.add(deck)
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.72), new THREE.MeshStandardMaterial({ color: '#c5c8dc', metalness: 0.6, roughness: 0.4 }))
  pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.101, 0.7); g.add(pad)
  const lid = new THREE.Group(); lid.position.set(0, 0.1, -D / 2); g.add(lid)
  const shell = new THREE.Mesh(new RoundedBoxGeometry(W, 0.07, D, 5, 0.035), alu); shell.position.set(0, 0.035, D / 2); shell.castShadow = true; lid.add(shell)
  const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.14, D - 0.12), new THREE.MeshBasicMaterial({ color: '#0b0b14' }))
  bezel.rotation.x = Math.PI / 2; bezel.position.set(0, -0.0005, D / 2); lid.add(bezel)
  const sw = W - 0.34, sh = sw / 1.6
  const mats = screens.map((t, i) => { const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: i === 0 ? 1 : 0, toneMapped: false, depthWrite: false }); const p = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), m); p.rotation.x = Math.PI / 2; p.position.set(0, -0.001 - i * 0.0002, D / 2 - 0.02); lid.add(p); return m })
  lid.rotation.x = -Math.PI * 0.58
  g.userData = { lid, mats }
  return g
}

function buildPhone(texture) {
  const g = new THREE.Group()
  const body = new THREE.Mesh(new RoundedBoxGeometry(0.92, 1.9, 0.09, 6, 0.14), new THREE.MeshPhysicalMaterial({ color: '#2a2a44', metalness: 0.85, roughness: 0.22, clearcoat: 0.6 })); body.castShadow = true; g.add(body)
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 1.82), new THREE.MeshBasicMaterial({ map: texture, alphaMap: maskTexture(256, 512, 40), transparent: true, toneMapped: false }))
  scr.position.z = 0.0455; g.add(scr)
  return g
}

function buildChip(kind, color, bg) {
  const g = new THREE.Group()
  const b = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.62, 0.16, 5, 0.16), new THREE.MeshPhysicalMaterial({ color, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1 })); b.castShadow = true; g.add(b)
  const ic = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.46), new THREE.MeshBasicMaterial({ map: iconTexture(kind, bg), transparent: true, toneMapped: false })); ic.position.z = 0.082; g.add(ic)
  return g
}

/* ───────── scene ───────── */
export default function Stage3D({ scene: kind = 'hero', index = 0, className = '' }) {
  const host = useRef(null)
  const indexRef = useRef(index)
  indexRef.current = index

  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }) } catch { return }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pm = new THREE.PMREMGenerator(renderer)
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.85
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    const key = new THREE.DirectionalLight('#ffffff', 2.1); key.position.set(4, 7, 5); key.castShadow = true
    key.shadow.mapSize.set(2048, 2048); Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 22 }); key.shadow.radius = 5; key.shadow.bias = -0.0004
    scene.add(key, new THREE.HemisphereLight('#eceaff', '#b9b3ff', 0.55))
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.16 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor)

    const rig = new THREE.Group(); scene.add(rig)
    const loader = new THREE.TextureLoader()
    const clock = new THREE.Clock()
    const disposers = []; const anim = []
    let mixer = null, actions = {}, robot = null, laptop = null

    // laptop (every scene except the robot-only one)
    if (kind !== 'robot') {
      laptop = buildLaptop(SCREENS.map((n) => tex(loader, n, renderer)))
      rig.add(laptop)
    }

    if (kind === 'hero') {
      laptop.position.set(0.55, 0, -0.2); laptop.rotation.y = -0.38
      const phone = buildPhone(tex(loader, 'mobile', renderer)); phone.position.set(2.6, 1.05, 1.2); phone.rotation.set(-0.05, -0.55, 0.06); rig.add(phone)
      anim.push((t) => { phone.position.y = 1.05 + Math.sin(t * 0.9) * 0.08 })
      const chips = [['video', '#6366f1', '#6366f1', [-0.7, 2.55, 1.2]], ['mic', '#10b981', '#10b981', [3.1, 2.7, -0.2]], ['chat', '#f472b6', '#f472b6', [-2.3, 2.2, -0.6]], ['share', '#f59e0b', '#f59e0b', [1.5, 3.15, 0.7]]]
      chips.forEach(([k, c, bg, p], i) => { const ch = buildChip(k, c, bg); ch.position.set(...p); rig.add(ch); anim.push((t) => { ch.position.y = p[1] + Math.sin(t * 0.8 + i * 1.7) * 0.12; ch.rotation.set(Math.sin(t * 0.5 + i) * 0.18, Math.cos(t * 0.4 + i) * 0.35, Math.sin(t * 0.3 + i) * 0.08) }) })
    }
    if (kind === 'tour') { laptop.rotation.y = -0.3; laptop.scale.setScalar(1.12) }

    // real animated glTF host (CC0, Tomas Laulhe / Quaternius, via three.js examples)
    if (kind === 'hero' || kind === 'robot') {
      const plat = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.16, 56), new THREE.MeshPhysicalMaterial({ color: '#f6f4ff', roughness: 0.35, clearcoat: 0.5 })); plat.receiveShadow = plat.castShadow = true
      const holder = new THREE.Group(); holder.add(plat); rig.add(holder)
      if (kind === 'hero') holder.position.set(-2.2, 0.08, 1.2); else holder.position.set(0, 0.08, 0)
      new GLTFLoader().load('/models/host-robot.glb', (gltf) => {
        robot = cloneSkinned(gltf.scene)
        // The skinned model's bounding box is unreliable (armature scaled 100x), so use its known ~3.7 unit height
        robot.scale.setScalar((kind === 'robot' ? 2.6 : 2.0) / 3.7)
        robot.position.y = 0.08; robot.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true } })
        robot.rotation.y = kind === 'hero' ? 0.5 : 0
        holder.add(robot)
        mixer = new THREE.AnimationMixer(robot)
        gltf.animations.forEach((a) => { actions[a.name] = mixer.clipAction(a) })
        const idle = actions.Idle; idle.play()
        const play = (name) => { const a = actions[name]; if (!a) return; a.reset().setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.fadeIn(0.25).play(); idle.crossFadeTo(a, 0.25, false); const back = () => { mixer.removeEventListener('finished', back); idle.reset().play(); a.crossFadeTo(idle, 0.3, false) }; mixer.addEventListener('finished', back) }
        play('Wave')
        let nextWave = 7; anim.push((t) => { if (t > nextWave) { nextWave = t + 8 + Math.random() * 4; play(Math.random() > 0.4 ? 'Wave' : 'ThumbsUp') } })
        host.current.__play = play
        if (reduce) { mixer.update(0.6); renderer.render(scene, camera) }
      })
    }

    // sizing & camera
    const resize = () => {
      const w = el.clientWidth || 600, h = el.clientHeight || 500
      renderer.setSize(w, h); camera.aspect = w / h
      const vw = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect // visible width per unit distance
      if (kind === 'hero') { camera.position.set(0, 2.6, Math.max(9.5, 8.2 / vw)); camera.lookAt(0.1, 1.15, 0) }
      else if (kind === 'tour') { camera.position.set(0, 2.1, Math.max(6.4, 5.2 / vw)); camera.lookAt(0, 0.95, 0) }
      else { camera.position.set(0, 1.5, Math.max(8.4, 5.2 / vw)); camera.lookAt(0, 1.3, 0) }
      camera.updateProjectionMatrix()
    }
    resize(); const ro = new ResizeObserver(resize); ro.observe(el)

    const mouse = { x: 0, y: 0 }
    const onMove = (e) => { const b = el.getBoundingClientRect(); mouse.x = ((e.clientX - b.left) / b.width - 0.5) * 2; mouse.y = ((e.clientY - b.top) / b.height - 0.5) * 2 }
    window.addEventListener('pointermove', onMove)
    let visible = true, raf = 0
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 }); io.observe(el)
    const onClick = () => host.current?.__play?.('ThumbsUp'); el.addEventListener('click', onClick)

    const targetRot = [-0.3, 0.32, -0.22, 0.38]
    const frame = () => {
      raf = requestAnimationFrame(frame)
      if (!visible) return
      const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime
      mixer?.update(dt); anim.forEach((f) => f(t))
      const sc = Math.min(window.scrollY / 900, 1)
      if (kind === 'hero') { rig.rotation.y += ((mouse.x * 0.22 + sc * 0.5) - rig.rotation.y) * 0.05; rig.rotation.x += ((mouse.y * 0.05) - rig.rotation.x) * 0.05; rig.position.y = sc * 0.8 }
      if (kind === 'tour' && laptop) {
        const i = indexRef.current
        laptop.rotation.y += ((targetRot[i] + mouse.x * 0.12) - laptop.rotation.y) * (1 - Math.exp(-dt * 4))
        laptop.position.y = Math.sin(t * 0.8) * 0.05
        const a = 1 - Math.exp(-dt * 7); laptop.userData.mats.forEach((m, k) => { m.opacity += ((k === i ? 1 : 0) - m.opacity) * a })
      }
      if (kind === 'robot') rig.rotation.y += ((mouse.x * 0.4) - rig.rotation.y) * 0.05
      renderer.render(scene, camera)
    }
    if (!reduce) frame(); else renderer.render(scene, camera)

    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove); el.removeEventListener('click', onClick)
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { [].concat(o.material).forEach((m) => { m.map?.dispose?.(); m.dispose() }) } })
      pm.dispose(); renderer.dispose(); renderer.domElement.remove()
    }
  }, [kind])

  return <div ref={host} aria-hidden="true" className={className} />
}
