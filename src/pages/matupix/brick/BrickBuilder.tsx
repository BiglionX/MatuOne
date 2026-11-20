import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrickGuideBar } from './BrickGuideBar'
import { BrickInspector, type BrickLook } from './BrickInspector'
import { BrickMagicDialog } from './BrickMagicDialog'
import { BrickPartBar } from './BrickPartBar'
import { BrickPartDialog } from './BrickPartDialog'
import { BrickVideoDialog } from './BrickVideoDialog'
import { bricksFromMagic, type MagicModel } from './brickMagicModels'
import { frameModel, orbitPose, paintAspect, recordCanvas, videoPlan, type ShotFps, type ShotStyle } from './brickVideo'
import { rememberPart } from './brickPartMemory'
import { BrickScene, BRICK_FLOOR_COLOR, type BrickPointerMode, type BrickPreview, type BrickReveal, type BrickSceneHandle, type CameraForward, type CameraPose } from './BrickScene'
import { BrickToolbar } from './BrickToolbar'
import { cardToneVars, type Brick3dStyle, type BrickCardTone } from './brickCardTone'
import './brickCard.css'
import { loadBrickDraft, saveBrickDraft } from './brickDraft'
import { toLDraw } from './brickLdraw'
import {
  centerForPlates,
  createBrickId,
  hasOverlap,
  initialPartColor,
  partHeight,
  partInfo,
  plateIndex,
  rotateBrick,
  snapPosition,
  type Brick,
  type BrickType,
} from './brickTypes'

const HISTORY_LIMIT = 50
const REJECT_MS = 2000
const HINT_DISMISS_KEY = 'matupix.brick.hint.dismissed'

function readHintOpen() {
  try {
    return sessionStorage.getItem(HINT_DISMISS_KEY) !== '1'
  } catch {
    return true
  }
}

type Snapshot = { bricks: Brick[]; selectedId: string | null }
type Step = { dx: number; dz: number }

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true
  return target instanceof HTMLElement && target.isContentEditable
}

function cloneBricks(bricks: Brick[]) {
  return bricks.map((brick) => {
    const [x, y, z] = brick.position
    return { ...brick, position: [x, y, z] as [number, number, number] }
  })
}

function workHeight(bricks: readonly Brick[]) {
  if (bricks.length === 0) return 0
  let maxTop = 0
  for (const brick of bricks) {
    const top = brick.position[1] + partHeight(brick.type) / 2
    if (top > maxTop) maxTop = top
  }
  return maxTop * 1.2
}

function quantizeStep(x: number, z: number): Step {
  if (Math.abs(x) >= Math.abs(z)) return { dx: x >= 0 ? 1 : -1, dz: 0 }
  return { dx: 0, dz: z >= 0 ? 1 : -1 }
}

function arrowDelta(key: string, forward: CameraForward | null): Step | null {
  const world: Record<string, Step> = {
    ArrowLeft: { dx: -1, dz: 0 },
    ArrowRight: { dx: 1, dz: 0 },
    ArrowUp: { dx: 0, dz: -1 },
    ArrowDown: { dx: 0, dz: 1 },
  }
  const fallback = world[key]
  if (!fallback) return null
  if (!forward) return fallback
  const xz = Math.hypot(forward.x, forward.z)
  if (xz < 0.25) return fallback
  const fx = forward.x / xz
  const fz = forward.z / xz
  const rightLen = Math.hypot(-fz, fx) || 1
  const forwardStep = quantizeStep(fx, fz)
  const rightStep = quantizeStep(-fz / rightLen, fx / rightLen)
  if (key === 'ArrowUp') return forwardStep
  if (key === 'ArrowDown') return { dx: -forwardStep.dx, dz: -forwardStep.dz }
  if (key === 'ArrowRight') return rightStep
  return { dx: -rightStep.dx, dz: -rightStep.dz }
}

export function BrickBuilder() {
  const [bricks, setBricks] = useState<Brick[]>(() => loadBrickDraft())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [part, setPart] = useState<BrickType>('2x2')
  const [color, setColor] = useState(initialPartColor('2x2'))
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [rejectNotice, setRejectNotice] = useState('')
  const [modelNotice, setModelNotice] = useState('')
  const [showHint, setShowHint] = useState(readHintOpen)
  const [partPulse, setPartPulse] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [partsOpen, setPartsOpen] = useState(false)
  const [tool, setTool] = useState<BrickPointerMode | null>(null)
  const [magicOpen, setMagicOpen] = useState(false)
  const [videoOpen, setVideoOpen] = useState(false)
  const [guide, setGuide] = useState<{ step: number; showFinished: boolean } | null>(null)
  const [revealCount, setRevealCount] = useState<number | null>(null)
  const [recording, setRecording] = useState(false)
  const navigate = useNavigate()
  const rootRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<BrickSceneHandle>(null)
  const bricksRef = useRef(bricks)
  const selectedRef = useRef(selectedId)
  const partRef = useRef(part)
  const colorRef = useRef(color)
  const dirtyRef = useRef(false)
  const undoRef = useRef<Snapshot[]>([])
  const redoRef = useRef<Snapshot[]>([])
  const forwardRef = useRef<CameraForward | null>(null)
  const guideRef = useRef(guide)
  const magicOpenRef = useRef(magicOpen)
  const videoOpenRef = useRef(videoOpen)
  const recordingRef = useRef(recording)
  const cancelRef = useRef(false)
  guideRef.current = guide
  magicOpenRef.current = magicOpen
  videoOpenRef.current = videoOpen
  recordingRef.current = recording
  const rejectTimer = useRef<number | null>(null)
  const partAnchorRef = useRef<HTMLDivElement>(null)
  const pulseTimer = useRef<number | null>(null)
  bricksRef.current = bricks
  selectedRef.current = selectedId
  partRef.current = part
  colorRef.current = color

  function commit(next: Brick[]) {
    dirtyRef.current = true
    bricksRef.current = next
    setBricks(next)
  }

  function syncHistory() {
    setCanUndo(undoRef.current.length > 0)
    setCanRedo(redoRef.current.length > 0)
  }

  function currentSnapshot(): Snapshot {
    return { bricks: cloneBricks(bricksRef.current), selectedId: selectedRef.current }
  }

  function pushHistory() {
    undoRef.current.push(currentSnapshot())
    if (undoRef.current.length > HISTORY_LIMIT) undoRef.current.shift()
    redoRef.current = []
    syncHistory()
  }

  function applySnapshot(snap: Snapshot) {
    const next = cloneBricks(snap.bricks)
    selectedRef.current = snap.selectedId
    commit(next)
    setSelectedId(snap.selectedId)
  }

  function undo() {
    const previous = undoRef.current.pop()
    if (!previous) return
    redoRef.current.push(currentSnapshot())
    applySnapshot(previous)
    syncHistory()
  }

  function redo() {
    const next = redoRef.current.pop()
    if (!next) return
    undoRef.current.push(currentSnapshot())
    if (undoRef.current.length > HISTORY_LIMIT) undoRef.current.shift()
    applySnapshot(next)
    syncHistory()
  }

  function showStatus(text: string) {
    setRejectNotice(text)
    if (rejectTimer.current !== null) window.clearTimeout(rejectTimer.current)
    rejectTimer.current = window.setTimeout(() => {
      setRejectNotice('')
      rejectTimer.current = null
    }, REJECT_MS)
  }

  function place(x: number, z: number, basePlates: number) {
    const [sx, sz] = snapPosition(x, z, partRef.current, 0)
    const nextBrick: Brick = {
      id: createBrickId(),
      type: partRef.current,
      color: colorRef.current,
      position: [sx, centerForPlates(basePlates, partRef.current), sz],
      rotation: 0,
    }
    if (hasOverlap(bricksRef.current, nextBrick)) {
      showStatus('这里放不下')
      return
    }
    pushHistory()
    selectedRef.current = null
    commit([...bricksRef.current, nextBrick])
    setSelectedId(null)
  }

  function deleteBrick(id: string) {
    const current = bricksRef.current
    if (!current.some((brick) => brick.id === id)) return
    pushHistory()
    const nextSelected = selectedRef.current === id ? null : selectedRef.current
    selectedRef.current = nextSelected
    commit(current.filter((brick) => brick.id !== id))
    setSelectedId(nextSelected)
  }

  function rotateSelected(id: string) {
    const current = bricksRef.current
    const brick = current.find((item) => item.id === id)
    if (!brick) return
    const rotated = rotateBrick(brick)
    if (hasOverlap(current, rotated)) {
      showStatus('这里放不下')
      return
    }
    pushHistory()
    commit(current.map((item) => (item.id === id ? rotated : item)))
  }

  function moveSelected(id: string, dx: number, dz: number) {
    const current = bricksRef.current
    const brick = current.find((item) => item.id === id)
    if (!brick) return
    const [x, y, z] = brick.position
    const moved: Brick = { ...brick, position: [x + dx, y, z + dz] }
    if (hasOverlap(current, moved)) {
      showStatus('这里放不下')
      return
    }
    pushHistory()
    commit(current.map((item) => (item.id === id ? moved : item)))
  }

  function moveByKey(key: string) {
    const id = selectedRef.current
    if (!id) return false
    const step = arrowDelta(key, forwardRef.current)
    if (!step) return false
    moveSelected(id, step.dx, step.dz)
    return true
  }

  function layerSelected(delta: 1 | -1) {
    const id = selectedRef.current
    if (!id) return
    changeLayer(id, delta)
  }

  function dropSelected(id: string, x: number, z: number) {
    const current = bricksRef.current
    const brick = current.find((item) => item.id === id)
    if (!brick) return
    const [ox, y, oz] = brick.position
    const [sx, sz] = snapPosition(x, z, brick.type, brick.rotation)
    if (sx === ox && sz === oz) return
    const moved: Brick = { ...brick, position: [sx, y, sz] }
    if (hasOverlap(current, moved)) {
      showStatus('这里放不下')
      return
    }
    pushHistory()
    commit(current.map((item) => (item.id === id ? moved : item)))
  }

  function changeLayer(id: string, delta: 1 | -1) {
    const current = bricksRef.current
    const brick = current.find((item) => item.id === id)
    if (!brick) return
    const nextPlates = plateIndex(brick.position[1], brick.type) + delta
    if (nextPlates < 0) return
    const [x, , z] = brick.position
    const moved: Brick = { ...brick, position: [x, centerForPlates(nextPlates, brick.type), z] }
    if (hasOverlap(current, moved)) {
      showStatus('这里放不下')
      return
    }
    pushHistory()
    commit(current.map((item) => (item.id === id ? moved : item)))
  }

  function clearAll() {
    if (bricksRef.current.length === 0) return
    pushHistory()
    selectedRef.current = null
    commit([])
    setSelectedId(null)
  }

  function selectBrick(id: string) {
    selectedRef.current = id
    setSelectedId(id)
  }

  function clearSelection() {
    selectedRef.current = null
    setSelectedId(null)
  }

  useEffect(() => {
    if (!dirtyRef.current) return
    const timer = window.setTimeout(() => {
      saveBrickDraft(bricksRef.current)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [bricks])

  useEffect(() => {
    function flush() {
      if (!dirtyRef.current) return
      saveBrickDraft(bricksRef.current)
    }
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [])

  useEffect(() => {
    return () => {
      if (rejectTimer.current !== null) window.clearTimeout(rejectTimer.current)
      if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current)
    }
  }, [])

  const actionsRef = useRef({ undo, redo, rotateSelected, moveByKey, changeLayer })
  actionsRef.current = { undo, redo, rotateSelected, moveByKey, changeLayer }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) return
      if (magicOpenRef.current) {
        if (event.key === 'Escape') setMagicOpen(false)
        return
      }
      if (videoOpenRef.current) {
        if (event.key === 'Escape') {
          cancelRef.current = recordingRef.current
          setVideoOpen(false)
        }
        return
      }
      if (guideRef.current) {
        if (event.key === 'Escape') {
          event.preventDefault()
          setGuide(null)
          return
        }
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
          event.preventDefault()
          const delta = event.key === 'ArrowRight' ? 1 : -1
          setGuide((current) => {
            if (!current) return current
            const next = Math.min(bricksRef.current.length, Math.max(0, current.step + delta))
            return next === current.step ? current : { ...current, step: next }
          })
        }
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) actionsRef.current.redo()
        else actionsRef.current.undo()
        return
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key === 'Escape') {
        selectedRef.current = null
        setSelectedId(null)
        return
      }
      const id = selectedRef.current
      if (!id) return
      if (event.key.toLowerCase() === 'r') {
        actionsRef.current.rotateSelected(id)
        return
      }
      if (event.shiftKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        actionsRef.current.changeLayer(id, event.key === 'ArrowUp' ? 1 : -1)
        return
      }
      if (actionsRef.current.moveByKey(event.key)) event.preventDefault()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const screenKey = useRef('')

  function reportCamera(csv: string) {
    rootRef.current?.setAttribute('data-camera', csv)
  }

  function reportBrickScreen(point: { x: number; y: number } | null) {
    const next = point ? `${point.x.toFixed(1)},${point.y.toFixed(1)}` : ''
    if (screenKey.current === next) return
    screenKey.current = next
    const root = rootRef.current
    if (!root) return
    if (next) root.setAttribute('data-brick-screen', next)
    else root.removeAttribute('data-brick-screen')
  }

  function reportForward(forward: CameraForward) {
    forwardRef.current = forward
    rootRef.current?.setAttribute('data-forward', `${forward.x.toFixed(3)},${forward.y.toFixed(3)},${forward.z.toFixed(3)}`)
  }

  function reportGesture(distance: number, accepted: boolean) {
    const root = rootRef.current
    if (!root) return
    root.setAttribute('data-last-pointer-px', distance.toFixed(2))
    root.setAttribute('data-last-pointer-kind', accepted ? 'click' : 'drag')
  }

  function reportPreview(preview: BrickPreview | null) {
    const root = rootRef.current
    if (!root) return
    root.setAttribute('data-preview', preview ? JSON.stringify(preview) : '')
  }

  function exportLDraw() {
    const { text, fallbackCount } = toLDraw(bricksRef.current)
    rootRef.current?.setAttribute('data-last-ldr', text)
    if (fallbackCount > 0) showStatus(`${fallbackCount} 块非预设色已映射为默认色`)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'matupix-brick.ldr'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  function soon() {
    showStatus('这个入口还在做')
  }

  function applyMagic(model: MagicModel) {
    let next: Brick[]
    try {
      next = bricksFromMagic(model.pieces)
    } catch {
      showStatus('这个模型排不开')
      return
    }
    pushHistory()
    selectedRef.current = null
    commit(next)
    setSelectedId(null)
    setTool('build')
    setGuide(null)
    setMagicOpen(false)
  }

  function openGuide() {
    if (recordingRef.current) return
    if (bricksRef.current.length === 0) {
      showStatus('先放几块积木，再跟着拼搭指南做')
      return
    }
    selectedRef.current = null
    setSelectedId(null)
    setMagicOpen(false)
    setVideoOpen(false)
    setGuide({ step: 0, showFinished: false })
  }

  function closeVideo() {
    if (recordingRef.current) cancelRef.current = true
    setVideoOpen(false)
  }

  async function generateVideo(choice: { style: ShotStyle; fps: ShotFps; orientation: 'portrait' | 'landscape' }) {
    const current = bricksRef.current
    if (current.length === 0) {
      showStatus('先放几块积木，再生成视频')
      return
    }
    const live = sceneRef.current?.getCanvas() ?? null
    const pose = sceneRef.current?.getPose() ?? null
    if (!live || !pose) {
      showStatus('这个浏览器不能生成视频')
      return
    }
    const picture = document.createElement('canvas')
    if (choice.orientation === 'portrait') {
      picture.width = 720
      picture.height = 1280
    } else {
      picture.width = 1280
      picture.height = 720
    }
    const output = picture.getContext('2d') ? picture : live
    const plan = videoPlan(choice.style, current.length)
    const bounds = frameModel(current)
    const saved: CameraPose = pose
    cancelRef.current = false
    setRecording(true)
    setGuide(null)
    selectedRef.current = null
    setSelectedId(null)
    sceneRef.current?.setControlsEnabled(false)
    const hold = choice.style === 'quick' ? 0.35 : 0.7
    sceneRef.current?.setPose(orbitPose(bounds, hold))
    setRevealCount(choice.style === 'quick' ? current.length : 0)
    paintAspect(live, picture)
    try {
      const result = await recordCanvas({
        canvas: output,
        fps: choice.fps,
        durationMs: plan.seconds * 1000,
        cancelled: cancelRef,
        onTick: (t) => {
          if (choice.style === 'quick') sceneRef.current?.setPose(orbitPose(bounds, hold + t * Math.PI * 2))
          else {
            const count = Math.min(current.length, Math.ceil(t * current.length))
            setRevealCount((previous) => (previous === count ? previous : count))
          }
          paintAspect(live, picture)
        },
      })
      if (!result.ok) {
        if (result.message) showStatus(result.message)
        return
      }
      const url = URL.createObjectURL(result.blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `matupix-brick.${result.ext}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      rootRef.current?.setAttribute('data-video-bytes', String(result.blob.size))
      rootRef.current?.setAttribute('data-video-ext', result.ext)
      showStatus(`已下载 matupix-brick.${result.ext}`)
      setVideoOpen(false)
    } finally {
      setRevealCount(null)
      setRecording(false)
      sceneRef.current?.setPose(saved)
      sceneRef.current?.setControlsEnabled(true)
    }
  }

  function selectPart(type: BrickType) {
    setPart(type)
    clearSelection()
    rememberPart(type)
  }

  function choosePart(type: BrickType) {
    selectPart(type)
    setTool('build')
    setPartsOpen(false)
  }

  function selectColor(next: string) {
    setColor(next)
    clearSelection()
  }

  function resetView() {
    sceneRef.current?.resetView()
  }

  function setLook(view: BrickLook) {
    if (view === 'oblique') {
      sceneRef.current?.setPose({ position: [0, 16, 10], target: [0, 0, 0] })
      return
    }
    const pose = sceneRef.current?.getPose()
    const distance = (() => {
      if (!pose) return Math.hypot(16, 10)
      const [x, y, z] = pose.position
      const [tx, ty, tz] = pose.target
      const next = Math.hypot(x - tx, y - ty, z - tz)
      return Number.isFinite(next) && next >= 8 ? next : 8
    })()
    if (view === 'top') {
      const z = Math.max(0.05, distance * 0.01)
      const y = Math.sqrt(Math.max(distance * distance - z * z, 0.01))
      sceneRef.current?.setPose({ position: [0, y, z], target: [0, 0, 0] })
      return
    }
    const lift = Math.sin(0.08)
    const reach = Math.cos(0.08)
    if (view === 'side') {
      sceneRef.current?.setPose({ position: [distance * reach, distance * lift, 0], target: [0, 0, 0] })
      return
    }
    sceneRef.current?.setPose({ position: [0, distance * lift, distance * reach], target: [0, 0, 0] })
  }

  function dismissHint() {
    setShowHint(false)
    try {
      sessionStorage.setItem(HINT_DISMISS_KEY, '1')
    } catch {
      // 隐私模式写失败时，这次挂载里不再显示。
    }
  }

  function focusPartPicker() {
    setTool('build')
    setPanelOpen(true)
    setPartsOpen(true)
    window.requestAnimationFrame(() => {
      partAnchorRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
    setPartPulse(true)
    if (pulseTimer.current !== null) window.clearTimeout(pulseTimer.current)
    pulseTimer.current = window.setTimeout(() => {
      setPartPulse(false)
      pulseTimer.current = null
    }, 1400)
  }

  const colorCount = new Set(bricks.map((brick) => brick.color.toLowerCase())).size
  const height = workHeight(bricks)
  const reveal: BrickReveal = recording && revealCount !== null
    ? { mode: 'build', count: revealCount }
    : guide
      ? { mode: 'guide', step: Math.min(guide.step, bricks.length), showFinished: guide.showFinished }
      : { mode: 'all' }
  const frozen = guide !== null || recording
  const guideLabel = guide && guide.step < bricks.length ? partInfo(bricks[guide.step].type).label : ''

  const notice = rejectNotice || modelNotice

  return (
    <div
      ref={rootRef}
      className="relative flex h-dvh min-h-0 flex-col overflow-hidden text-ink"
      style={{ backgroundColor: BRICK_FLOOR_COLOR }}
      data-selected-id={selectedId ?? ''}
      data-brick-count={bricks.length}
      data-part={part}
      data-color={color}
      data-pointer={tool ?? 'none'}
      data-panel={panelOpen ? 'open' : 'closed'}
      data-bricks={JSON.stringify(bricks)}
    >
      <div className="relative w-full shrink-0 max-md:h-[max(240px,46vh)] max-md:min-h-[240px] md:absolute md:inset-0">
        <BrickScene
          ref={sceneRef}
          bricks={bricks}
          selectedId={selectedId}
          part={part}
          color={color}
          tool={tool}
          onPlace={place}
          onSelect={selectBrick}
          onDelete={deleteBrick}
          onDrop={dropSelected}
          onClearSelection={clearSelection}
          onCamera={reportCamera}
          onForward={reportForward}
          onGesture={reportGesture}
          onPreview={reportPreview}
          onModelError={setModelNotice}
          onNudge={moveByKey}
          onLayer={layerSelected}
          onBrickScreen={reportBrickScreen}
          reveal={reveal}
          frozen={frozen}
        />
        {bricks.length === 0 ? (
          <div className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 pb-16 ${panelOpen ? 'md:pl-[19rem]' : ''}`}>
            <div
              className="brick3d-card pointer-events-auto w-full max-w-[19rem] px-6 py-7 text-center"
              style={
                {
                  '--brick3d-from': '#FFFFFF',
                  '--brick3d-to': '#F1FAF3',
                  '--brick3d-edge': '#C9E7D4',
                  '--brick3d-lip': '#2FA84A',
                  '--brick3d-glow': 'rgba(47, 168, 74, 0.26)',
                  '--brick3d-ring': 'rgba(47, 168, 74, 0.24)',
                  '--brick3d-radius': '24px',
                  '--brick3d-depth': '6px',
                } as Brick3dStyle
              }
            >
              <EmptyBrickMark />
              <p className="mt-3 text-lg font-bold leading-6">来放第一块积木吧？</p>
              <p className="mt-2 text-[13px] leading-5 text-ink-soft">选一个零件和一种颜色，然后点一下底板。</p>
              <p className="text-[13px] leading-5 text-ink-soft">拖动背景可以旋转视角。</p>
              <button
                type="button"
                onClick={focusPartPicker}
                className="mt-5 inline-flex items-center gap-1 rounded-full bg-gradient-to-b from-[#4FCB6C] to-[#1F8C36] px-5 py-2 text-sm font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#166C28,0_8px_16px_rgba(24,110,48,0.28)]"
              >
                选一个零件
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>
        ) : null}
        <p
          role="status"
          className="pointer-events-none absolute inset-x-0 top-3 z-30 flex min-h-6 justify-center px-3 text-center text-sm font-semibold leading-6 text-danger"
        >
          {notice ? <span className="rounded-full bg-white px-3 shadow-card">{notice}</span> : null}
        </p>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex flex-col items-center gap-2 px-3">
          {showHint ? (
            <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full bg-white/95 py-1 pl-3 pr-1 text-xs leading-5 text-ink shadow-pop">
              <p>选择：拖动零件 · 方向键：移动选中的零件（Shift 升高）· 摇杆：点击放置 · Shift+点击删除 · R 旋转</p>
              <button
                type="button"
                aria-label="关闭提示"
                onClick={dismissHint}
                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-ink-soft"
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
        {panelOpen ? null : (
          <button
            type="button"
            aria-label="展开工具箱"
            aria-expanded="false"
            onClick={() => setPanelOpen(true)}
            className="absolute left-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#5E6A75] shadow-[0_2px_8px_rgba(30,42,46,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--art-purple)] focus-visible:ring-offset-2"
          >
            <Chevron direction="right" />
          </button>
        )}
      </div>
      {panelOpen ? (
        <aside
          className="relative z-20 flex min-h-0 w-full flex-1 flex-col overflow-hidden border-t border-line bg-white shadow-pop md:absolute md:bottom-auto md:left-3 md:top-3 md:max-h-[calc(100%-1.5rem)] md:w-[300px] md:flex-none md:overflow-visible md:rounded-[28px] md:border"
          aria-label="积木工具"
        >
          <button
            type="button"
            aria-label="收起工具箱"
            aria-expanded="true"
            onClick={() => setPanelOpen(false)}
            className="absolute right-2.5 top-2.5 z-30 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#5E6A75] shadow-[0_4px_14px_rgba(30,42,46,0.18)] ring-1 ring-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--art-purple)] focus-visible:ring-offset-2 md:right-[-18px] md:top-3.5"
          >
            <Chevron direction="left" />
          </button>
          <div className="flex shrink-0 items-center gap-2.5 px-3 pb-1 pr-12 pt-3 md:pr-3">
            <StudioLogo />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-6 tracking-tight">积木搭建</h1>
              <p className="text-[13px] leading-4 text-ink-soft">创意工作室</p>
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5 px-3 pb-2">
            <IconButton label="回到 MatuPix 首页" onClick={() => navigate('/matupix')}>
              <HomeIcon />
            </IconButton>
            <IconButton label="调色板" onClick={soon}>
              <PaletteIcon />
            </IconButton>
            <IconButton label="图鉴" onClick={soon}>
              <BookIcon />
            </IconButton>
            <IconButton label="语言" onClick={soon}>
              <FlagIcon />
            </IconButton>
            <IconButton label="时钟" onClick={soon}>
              <ClockIcon />
            </IconButton>
            <button
              type="button"
              aria-label="帮助"
              onClick={soon}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#2F6FED] text-white shadow-[0_3px_8px_rgba(30,70,180,0.28)]"
            >
              <HelpIcon />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-2.5">
            <ToolFace tone="purple" onClick={() => setMagicOpen(true)}>
              <WandIcon />
              <span className="text-[16px] font-extrabold">魔法模型</span>
            </ToolFace>
            <div ref={partAnchorRef}>
              <BrickPartBar part={part} emphasized={partPulse} open={partsOpen} onOpen={() => setPartsOpen(true)} />
            </div>
            <div aria-hidden="true" data-separator="thick-dash" className="w-full shrink-0 border-t-2 border-dashed border-[#C5CED6]" />
            <ToolFace tone="blue" onClick={openGuide}>
              <StepsIcon />
              <span className="text-[16px] font-extrabold">跟着拼搭指南做</span>
            </ToolFace>
            <ToolFace tone="red" onClick={() => setVideoOpen(true)}>
              <FilmIcon />
              <span className="text-[16px] font-extrabold">视频</span>
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-[#C42323]">抖音和视频号 · 免费</span>
            </ToolFace>
            <div aria-hidden="true" data-separator="thick-dash" className="w-full shrink-0 border-t-2 border-dashed border-[#C5CED6]" />
            {guide ? (
              <BrickGuideBar
                step={Math.min(guide.step, bricks.length)}
                total={bricks.length}
                label={guideLabel}
                showFinished={guide.showFinished}
                onPrev={() => setGuide((current) => current ? { ...current, step: Math.max(0, current.step - 1) } : current)}
                onNext={() => setGuide((current) => current ? { ...current, step: Math.min(bricks.length, current.step + 1) } : current)}
                onToggleFinished={() => setGuide((current) => current ? { ...current, showFinished: !current.showFinished } : current)}
                onClose={() => setGuide(null)}
              />
            ) : null}
            <div className="border-t border-dashed border-line pt-2">
              <PointerModes mode={tool} onChange={setTool} />
            </div>
            <BrickInspector
              color={color}
              count={bricks.length}
              colorCount={colorCount}
              height={height}
              onSelectColor={selectColor}
              onLook={setLook}
              onZoomIn={() => sceneRef.current?.zoomIn()}
              onZoomOut={() => sceneRef.current?.zoomOut()}
            />
            <div className="border-t border-dashed border-line pt-2">
              <BrickToolbar
                canUndo={canUndo}
                canRedo={canRedo}
                canClear={bricks.length > 0}
                onUndo={undo}
                onRedo={redo}
                onExport={exportLDraw}
                onResetView={resetView}
                onClear={clearAll}
              />
            </div>
          </div>
        </aside>
      ) : null}
      {magicOpen ? <BrickMagicDialog onClose={() => setMagicOpen(false)} onPick={applyMagic} /> : null}
      {videoOpen ? (
        <BrickVideoDialog count={bricks.length} busy={recording} onClose={closeVideo} onGenerate={(choice) => void generateVideo(choice)} />
      ) : null}
      {partsOpen ? (
        <BrickPartDialog
          part={part}
          color={color}
          bricks={bricks}
          onClose={() => setPartsOpen(false)}
          onSelect={choosePart}
        />
      ) : null}
    </div>
  )
}

const POINTER_MODES: { id: BrickPointerMode; label: string; tone: BrickCardTone }[] = [
  { id: 'select', label: '选择', tone: { from: '#7A858F', to: '#5E6A75', edge: '#4B565F', lip: '#3E4952', glow: 'rgba(62, 73, 82, 0.3)', ring: 'rgba(94, 106, 117, 0.3)' } },
  { id: 'build', label: '搭建', tone: { from: '#4FCB6C', to: '#2FA84A', edge: '#1F7A34', lip: '#17642A', glow: 'rgba(47, 168, 74, 0.3)', ring: 'rgba(47, 168, 74, 0.3)' } },
  { id: 'erase', label: '橡皮', tone: { from: '#FF6A5C', to: '#E23D3D', edge: '#B01E1E', lip: '#8E1717', glow: 'rgba(226, 61, 61, 0.3)', ring: 'rgba(226, 61, 61, 0.3)' } },
]

const POINTER_OFF: Brick3dStyle = {
  '--brick3d-from': '#FFFFFF',
  '--brick3d-to': '#F4F7FA',
  '--brick3d-edge': '#E3E8EE',
  '--brick3d-lip': '#CED5DD',
  '--brick3d-glow': 'rgba(30, 42, 50, 0.12)',
  '--brick3d-radius': '16px',
  '--brick3d-depth': '4px',
}

function PointerModes({ mode, onChange }: { mode: BrickPointerMode | null; onChange: (mode: BrickPointerMode) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="指针模式">
      {POINTER_MODES.map((item) => {
        const active = item.id === mode
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.id)}
            style={active ? cardToneVars(item.tone) : POINTER_OFF}
            className={`brick3d-card inline-flex h-11 items-center justify-center gap-1 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--art-purple)] focus-visible:ring-offset-2 ${
              active ? 'is-selected text-white' : 'text-ink'
            }`}
          >
            <ModeIcon mode={item.id} />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function ModeIcon({ mode }: { mode: BrickPointerMode }) {
  const common = {
    viewBox: '0 0 24 24',
    width: 16,
    height: 16,
    'aria-hidden': true,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (mode === 'select') {
    return (
      <svg {...common}>
        <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2" />
        <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2" />
        <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
        <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
      </svg>
    )
  }
  if (mode === 'erase') {
    return (
      <svg {...common}>
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  )
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {direction === 'left' ? <path d="M14 6 8 12l6 6" /> : <path d="m10 6 6 6-6 6" />}
    </svg>
  )
}

function EmptyBrickMark() {
  return (
    <svg width="48" height="38" viewBox="0 0 48 38" aria-hidden="true" className="mx-auto">
      <path d="M24 5 43 15 24 25 5 15Z" fill="#F0A04B" />
      <path d="M5 15 24 25v10L5 25Z" fill="#C56A28" />
      <path d="M43 15 24 25v10l19-10Z" fill="#E8893A" />
      <ellipse cx="16.5" cy="13.2" rx="3.1" ry="1.6" fill="#F8D7AE" />
      <ellipse cx="28.5" cy="18.2" rx="3.1" ry="1.6" fill="#F8D7AE" />
    </svg>
  )
}

const TOOL_FACE = {
  purple: 'from-[#C59BFF] to-[#7A3FE4] shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_3px_0_#5C2BB5,0_8px_16px_rgba(92,43,181,0.28)]',
  blue: 'from-[#6CB6FF] to-[#1D74F0] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#1658C4,0_8px_16px_rgba(20,80,180,0.28)]',
  red: 'from-[#FF6A5C] to-[#E01818] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_3px_0_#B10E0E,0_8px_16px_rgba(180,20,20,0.28)]',
} as const

function ToolFace({ tone, onClick, children }: { tone: keyof typeof TOOL_FACE; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[52px] w-full flex-wrap items-center justify-center gap-2 rounded-[18px] bg-gradient-to-b px-3 py-2 text-white active:translate-y-[2px] ${TOOL_FACE[tone]}`}
    >
      {children}
    </button>
  )
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-[0_2px_6px_rgba(30,42,46,0.12)]"
    >
      {children}
    </button>
  )
}

function StudioLogo() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true" className="shrink-0">
      <rect width="42" height="42" rx="12" fill="#E23D3D" />
      <rect x="9" y="18" width="24" height="14" rx="3" fill="#fff" />
      <rect x="12" y="11" width="7" height="8" rx="2" fill="#fff" />
      <rect x="23" y="11" width="7" height="8" rx="2" fill="#fff" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-5H10v5H5a1 1 0 0 1-1-1v-8Z" fill="#F5C518" stroke="#E23D3D" strokeWidth="1.2" />
    </svg>
  )
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M12 3a9 9 0 1 0 0 18h1.2a2.2 2.2 0 0 0 0-4.4h-.6a1.6 1.6 0 0 1 0-3.2H16a5 5 0 0 0 0-10.4H12Z" fill="#FFE08A" stroke="#243140" strokeWidth="1.2" />
      <circle cx="8" cy="9" r="1.2" fill="#E23D3D" />
      <circle cx="12" cy="7.2" r="1.2" fill="#2F6FED" />
      <circle cx="16" cy="9" r="1.2" fill="#2EAD4B" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15Z" fill="#2EAD4B" />
      <path d="M5 18.2A2.5 2.5 0 0 1 7.5 16H19v5H7.5A2.5 2.5 0 0 1 5 18.5v-.3Z" fill="#FE8A18" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M6 3v18" stroke="#243140" strokeWidth="1.6" />
      <path d="M6 4h12l-2 3 2 3H6V4Z" fill="#E23D3D" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="#5E6A75" strokeWidth="1.7">
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8.5V12l2.5 2" strokeLinecap="round" />
    </svg>
  )
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
      <path d="M9.2 9a2.8 2.8 0 1 1 3.6 2.7c-.7.3-1.1.8-1.1 1.5" />
      <path d="M12 17h.01" />
    </svg>
  )
}

function WandIcon() {
  return (
    <svg viewBox="0 0 36 28" width="34" height="26" aria-hidden="true" className="block shrink-0">
      <path d="M6.4 23.4 26.8 7.6" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" />
      <path d="M29.4 1.7 30.7 4.7 33.9 5.8 30.7 6.9 29.4 9.9 28.1 6.9 24.9 5.8 28.1 4.7Z" fill="#fff" />
    </svg>
  )
}

function StepsIcon() {
  return (
    <svg viewBox="3.1 4.1 17.8 15.8" width="34" height="26" aria-hidden="true" className="block shrink-0" fill="none" stroke="#fff" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 12h8M8 15h5" strokeLinecap="round" />
    </svg>
  )
}

function FilmIcon() {
  return (
    <svg viewBox="3 6 18 12" width="34" height="26" aria-hidden="true" className="block shrink-0">
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#fff" />
      <path d="M10 9.2v5.6l5-2.8-5-2.8Z" fill="#E23D3D" />
    </svg>
  )
}
