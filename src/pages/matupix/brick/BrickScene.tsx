import { Edges, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { BackSide, Camera, Fog, GridHelper, InstancedMesh, LineBasicMaterial, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3, WebGLRenderer } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { cloneColoredPart, disposePartMaterials, loadBrickTemplate, peekBrickTemplate, PART_ROLL, PART_TILT, type PartAlign } from './brickPartModel'
import { brickPlacementY, brickTopHeight, hasOverlap, localSize, partMount, partOrigin, snapPlacement, type Brick, type BrickType } from './brickTypes'

const CLICK_MAX_PX = 5
const FALLBACK_DANGER = '#BE4040'
const DOLLY_RATIO = 0.8
const PAD_GAP = 12
const PAD_MARGIN = 4
// 站在底板正前方（X=0），近边在画面下方，左右边与窗口基本平行。垂直 fov 40 时，16:9 下绿板约占画面宽度的七成，上下都能看见底板外的网格。
const INITIAL_CAMERA: [number, number, number] = [0, 46, 54]
const INITIAL_TARGET: [number, number, number] = [0, 0, 0]
const INITIAL_FOV = 40
const MIN_ORBIT_DISTANCE = 8
const PLATE_MIN_SCREEN_FRACTION = 1 / 5
const BASEPLATE_COLOR = '#5DBB46'
export const BRICK_FLOOR_COLOR = '#f4f6f4'
const FLOOR_GRID_LINE = '#c9d3ca'
const FLOOR_GRID_MAJOR = '#7EB4D8'
const MAJOR_STUD_SPAN = 10
const FLOOR_GRID_SIZE = 4000
const FOG_COLOR = '#ffffff'
const SKY_RADIUS = 2000
const PLATE_STUDS = 48
const STUD_DIAMETER = 0.6
const STUD_HEIGHT = 0.16
const STUD_TOP = -0.012
const PLATE_THICKNESS = 0.4
const PLATE_TOP = STUD_TOP - STUD_HEIGHT
const PLATE_CENTER_Y = PLATE_TOP - PLATE_THICKNESS / 2
const STUD_CENTER_Y = (PLATE_TOP + STUD_TOP) / 2
const forwardScratch = new Vector3()
const normalScratch = new Vector3()
const dragRaycaster = new Raycaster()
const dragPointer = new Vector2()
const dragPlane = new Plane(new Vector3(0, 1, 0), 0)
const dragHit = new Vector3()
const plateCam = new PerspectiveCamera(INITIAL_FOV, 1, 0.1, 4000)
const plateCorner = new Vector3()
const plateView = new Vector3()
const plateDir = new Vector3()

export type BrickPreview = {
  x: number
  y: number
  z: number
  layer: number
  conflict: boolean
}

export type CameraForward = { x: number; y: number; z: number }

export type BrickPointerMode = 'select' | 'build' | 'erase'

type BrickSceneProps = {
  bricks: Brick[]
  selectedId: string | null
  part: BrickType
  color: string
  tool: BrickPointerMode | null
  onPlace: (x: number, z: number, basePlates: number) => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onDrop: (id: string, x: number, z: number) => void
  onClearSelection: () => void
  onCamera: (csv: string) => void
  onForward: (forward: CameraForward) => void
  onGesture: (distance: number, accepted: boolean) => void
  onPreview: (preview: BrickPreview | null) => void
  onModelError?: (message: string) => void
  onNudge: (key: NudgeKey) => void
  onLayer: (delta: 1 | -1) => void
  onBrickScreen?: (point: { x: number; y: number } | null) => void
  reveal?: BrickReveal
  frozen?: boolean
}

export type BrickReveal =
  | { mode: 'all' }
  | { mode: 'guide'; step: number; showFinished: boolean }
  | { mode: 'build'; count: number }

export type CameraPose = {
  position: [number, number, number]
  target: [number, number, number]
}

export type BrickSceneHandle = {
  resetView: () => void
  zoomIn: () => void
  zoomOut: () => void
  getCanvas: () => HTMLCanvasElement | null
  getPose: () => CameraPose | null
  setPose: (pose: CameraPose) => void
  setControlsEnabled: (enabled: boolean) => void
}

export type NudgeKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

type GhostSpot = { sx: number; sz: number; layer: number }

function cssColorToHex(raw: string) {
  const value = raw.trim()
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  const match = value.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i)
  if (!match) return null
  const channels = [match[1], match[2], match[3]].map((part) => {
    const channel = Math.round(Number(part))
    if (!Number.isFinite(channel)) return null
    return Math.min(255, Math.max(0, channel)).toString(16).padStart(2, '0')
  })
  if (channels.some((channel) => channel === null)) return null
  return `#${channels.join('')}`
}

function useDangerColor(hostRef: RefObject<HTMLElement | null>) {
  const [danger, setDanger] = useState(FALLBACK_DANGER)
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    setDanger(cssColorToHex(getComputedStyle(host).getPropertyValue('--danger')) ?? FALLBACK_DANGER)
  }, [hostRef])
  return danger
}

const SKY_VERTEX = `
varying vec3 vDir;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vDir = worldPos.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

// 仰角着色：画面顶部 #A9CDEE，往下 #B7D4EE、#D8EAF8，地平线收到近白 #F9FBFD，再接到地面 #F4F6F4。雾本身仍是白。数值直接用 sRGB，避免再做一次线性转换把天空压深。
const SKY_FRAGMENT = `
varying vec3 vDir;
void main() {
  float elev = normalize(vDir).y;
  vec3 skyColor = vec3(0.66275, 0.80392, 0.93333);
  vec3 highColor = vec3(0.71765, 0.83137, 0.93333);
  vec3 paleColor = vec3(0.84706, 0.91765, 0.97255);
  vec3 mistColor = vec3(0.97647, 0.98431, 0.99216);
  vec3 groundColor = vec3(0.95686, 0.96471, 0.95686);
  vec3 color = groundColor;
  color = mix(color, mistColor, smoothstep(-0.62, -0.48, elev));
  color = mix(color, paleColor, smoothstep(-0.48, -0.44, elev));
  color = mix(color, highColor, smoothstep(-0.44, -0.40, elev));
  color = mix(color, skyColor, smoothstep(-0.40, -0.37, elev));
  gl_FragColor = vec4(color, 1.0);
}
`

function fadeWithFog(material: Material) {
  if (!(material instanceof LineBasicMaterial) && !(material instanceof MeshBasicMaterial)) return
  material.transparent = true
  material.depthWrite = false
  material.fog = true
  // 场景里还有一块不改色的透明放置面，也是 Basic 材质。不单独给缓存键的话，雾的透明淡出会被那份程序盖掉。
  material.customProgramCacheKey = () => 'brick-fog-fade'
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <fog_fragment>',
      `#include <fog_fragment>
#ifdef USE_FOG
  gl_FragColor.a *= 1.0 - fogFactor;
#endif`,
    )
  }
  material.needsUpdate = true
}

function fadeObject(object: GridHelper | Mesh) {
  object.raycast = () => undefined
  const materials = Array.isArray(object.material) ? object.material : [object.material]
  for (const material of materials) fadeWithFog(material)
}

function plateFarDistance(camera: Camera) {
  const half = PLATE_STUDS / 2
  const { x, y, z } = camera.position
  let far = 0
  for (const cx of [-half, half]) {
    for (const cz of [-half, half]) {
      const distance = Math.hypot(cx - x, -y, cz - z)
      if (distance > far) far = distance
    }
  }
  return far
}

function SkyBackdrop() {
  const meshRef = useRef<Mesh>(null)
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.raycast = () => undefined
  }, [])
  return (
    <mesh ref={meshRef} frustumCulled={false} renderOrder={-10} raycast={() => undefined}>
      <sphereGeometry args={[SKY_RADIUS, 48, 32]} />
      <shaderMaterial
        side={BackSide}
        depthWrite={false}
        depthTest={false}
        fog={false}
        vertexShader={SKY_VERTEX}
        fragmentShader={SKY_FRAGMENT}
      />
    </mesh>
  )
}

// 近距留在底板外侧，远距让网格在白色里消失，避免视野尽头一条硬边。
function EdgeFog() {
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const fog = useMemo(() => new Fog(FOG_COLOR, 100, 140), [])
  useLayoutEffect(() => {
    scene.fog = fog
    return () => {
      if (scene.fog === fog) scene.fog = null
    }
  }, [fog, scene])
  useFrame(() => {
    const farEdge = plateFarDistance(camera)
    const near = farEdge + 6
    fog.near = near
    fog.far = near + 18
  }, -2)
  return null
}

function GroundGrid() {
  const fineRef = useRef<GridHelper>(null)
  const majorRef = useRef<GridHelper>(null)
  const floorRef = useRef<Mesh>(null)
  useLayoutEffect(() => {
    const fine = fineRef.current
    const major = majorRef.current
    const floor = floorRef.current
    if (fine) fadeObject(fine)
    if (major) fadeObject(major)
    if (floor) fadeObject(floor)
  }, [])
  const gridY = PLATE_TOP - PLATE_THICKNESS - 0.03
  return (
    <group>
      <mesh
        ref={floorRef}
        name="floor-plane"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, gridY - 0.04, 0]}
        frustumCulled={false}
        renderOrder={1}
        raycast={() => undefined}
      >
        <planeGeometry args={[FLOOR_GRID_SIZE, FLOOR_GRID_SIZE]} />
        <meshBasicMaterial color={BRICK_FLOOR_COLOR} transparent depthWrite={false} />
      </mesh>
      <gridHelper
        ref={fineRef}
        name="floor-grid"
        args={[FLOOR_GRID_SIZE, FLOOR_GRID_SIZE, FLOOR_GRID_LINE, FLOOR_GRID_LINE]}
        position={[0, gridY, 0]}
        frustumCulled={false}
        renderOrder={2}
        raycast={() => undefined}
      />
      <gridHelper
        ref={majorRef}
        name="floor-grid-major"
        args={[FLOOR_GRID_SIZE, FLOOR_GRID_SIZE / MAJOR_STUD_SPAN, FLOOR_GRID_MAJOR, FLOOR_GRID_MAJOR]}
        position={[0, gridY + 0.012, 0]}
        frustumCulled={false}
        renderOrder={3}
        raycast={() => undefined}
      />
    </group>
  )
}

function Baseplate() {
  const studsRef = useRef<InstancedMesh>(null)
  useLayoutEffect(() => {
    const studs = studsRef.current
    if (!studs) return
    const dummy = new Object3D()
    const origin = -((PLATE_STUDS - 1) / 2)
    let index = 0
    for (let x = 0; x < PLATE_STUDS; x += 1) {
      for (let z = 0; z < PLATE_STUDS; z += 1) {
        dummy.position.set(origin + x, STUD_CENTER_Y, origin + z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        studs.setMatrixAt(index, dummy.matrix)
        index += 1
      }
    }
    studs.instanceMatrix.needsUpdate = true
    studs.computeBoundingSphere()
  }, [])
  return (
    <group name="baseplate">
      <mesh position={[0, PLATE_CENTER_Y, 0]} raycast={() => undefined}>
        <boxGeometry args={[PLATE_STUDS, PLATE_THICKNESS, PLATE_STUDS]} />
        <meshStandardMaterial color={BASEPLATE_COLOR} roughness={0.78} metalness={0.02} />
      </mesh>
      <instancedMesh ref={studsRef} args={[undefined, undefined, PLATE_STUDS * PLATE_STUDS]} frustumCulled={false} raycast={() => undefined}>
        <cylinderGeometry args={[STUD_DIAMETER / 2, STUD_DIAMETER / 2, STUD_HEIGHT, 24]} />
        <meshStandardMaterial color={BASEPLATE_COLOR} roughness={0.42} metalness={0.06} />
      </instancedMesh>
    </group>
  )
}

function formatCamera(position: { x: number; y: number; z: number }) {
  return `${position.x.toFixed(3)},${position.y.toFixed(3)},${position.z.toFixed(3)}`
}

function readForward(object: Object3D): CameraForward {
  object.getWorldDirection(forwardScratch)
  return { x: forwardScratch.x, y: forwardScratch.y, z: forwardScratch.z }
}

function ViewBridge({ onView }: { onView: (camera: Camera) => void }) {
  const onViewRef = useRef(onView)
  onViewRef.current = onView
  const camera = useThree((state) => state.camera)
  const last = useRef('')
  useLayoutEffect(() => {
    onViewRef.current(camera)
  }, [camera])
  // 正数优先级会接管渲染循环，R3F 就不再自动 gl.render。这里只读相机，必须用非正优先级。
  useFrame(() => {
    const forward = readForward(camera)
    const csv = `${formatCamera(camera.position)}|${forward.x.toFixed(3)},${forward.y.toFixed(3)},${forward.z.toFixed(3)}`
    if (csv === last.current) return
    last.current = csv
    onViewRef.current(camera)
  })
  return null
}

// 斜视透视下，底板四角的屏幕水平跨度。相机在目标点背后时返回 Infinity，避免近处投影翻面。
function plateScreenWidthFraction(camera: PerspectiveCamera, target: Vector3, dir: Vector3, radius: number) {
  plateCam.fov = camera.fov
  plateCam.aspect = camera.aspect
  plateCam.near = camera.near
  plateCam.far = camera.far
  plateCam.position.copy(target).addScaledVector(dir, radius)
  plateCam.quaternion.copy(camera.quaternion)
  plateCam.updateProjectionMatrix()
  plateCam.updateMatrixWorld(true)
  const half = PLATE_STUDS / 2
  let minX = Infinity
  let maxX = -Infinity
  for (let ix = 0; ix < 2; ix += 1) {
    for (let iz = 0; iz < 2; iz += 1) {
      plateCorner.set(ix === 0 ? -half : half, 0, iz === 0 ? -half : half)
      plateView.copy(plateCorner).applyMatrix4(plateCam.matrixWorldInverse)
      if (plateView.z >= -1e-3) return Number.POSITIVE_INFINITY
      plateCorner.project(plateCam)
      if (plateCorner.x < minX) minX = plateCorner.x
      if (plateCorner.x > maxX) maxX = plateCorner.x
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) return Number.POSITIVE_INFINITY
  return (maxX - minX) / 2
}

// 沿当前视线把轨道半径拉远，直到底板投影宽度等于视口宽度的 1/5。结果只取决于 fov、宽高比和斜视方向。
function farthestPlateDistance(camera: PerspectiveCamera, target: Vector3) {
  plateDir.copy(camera.position).sub(target)
  const current = plateDir.length()
  if (current < 1e-4) return MIN_ORBIT_DISTANCE
  plateDir.multiplyScalar(1 / current)
  const fractionAt = (radius: number) => plateScreenWidthFraction(camera, target, plateDir, radius)
  let hi = Math.max(current, MIN_ORBIT_DISTANCE)
  let guard = 0
  while (guard < 28) {
    const fraction = fractionAt(hi)
    if (Number.isFinite(fraction) && fraction <= PLATE_MIN_SCREEN_FRACTION) break
    hi *= 1.5
    guard += 1
    if (hi > 1e7) return hi
  }
  let lo = MIN_ORBIT_DISTANCE
  for (let step = 0; step < 24; step += 1) {
    const mid = (lo + hi) / 2
    const fraction = fractionAt(mid)
    if (!Number.isFinite(fraction) || fraction > PLATE_MIN_SCREEN_FRACTION) lo = mid
    else hi = mid
  }
  return Math.max(MIN_ORBIT_DISTANCE, hi)
}

function PlateZoomLimit({ controlsRef }: { controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const apply = () => {
    const controls = controlsRef.current
    if (!controls || !(camera instanceof PerspectiveCamera)) return
    const next = farthestPlateDistance(camera, controls.target)
    controls.minDistance = MIN_ORBIT_DISTANCE
    controls.maxDistance = next
    const neededFar = Math.max(4000, next * 4)
    if (camera.far < neededFar) {
      camera.far = neededFar
      camera.updateProjectionMatrix()
    }
  }
  useLayoutEffect(() => {
    apply()
  }, [camera, size.width, size.height])
  // 负优先级：在 OrbitControls 的 update（-1）之前写好最远距离，且不关掉 R3F 自动渲染。
  useFrame(() => {
    apply()
  }, -2)
  return null
}

function pointerOnPlane(camera: Camera, host: HTMLElement, clientX: number, clientY: number, y: number) {
  const rect = host.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return null
  dragPointer.x = ((clientX - rect.left) / rect.width) * 2 - 1
  dragPointer.y = -((clientY - rect.top) / rect.height) * 2 + 1
  camera.updateMatrixWorld()
  dragRaycaster.setFromCamera(dragPointer, camera)
  dragPlane.constant = -y
  const hit = dragRaycaster.ray.intersectPlane(dragPlane, dragHit)
  if (!hit) return null
  return { x: hit.x, z: hit.z }
}

function worldNormalY(event: ThreeEvent<PointerEvent>) {
  const face = event.face
  if (!face) return null
  normalScratch.copy(face.normal)
  normalScratch.transformDirection(event.object.matrixWorld)
  return normalScratch.y
}

function OutlineReport({
  selectedId,
  outline,
  hostRef,
}: {
  selectedId: string | null
  outline: string
  hostRef: RefObject<HTMLElement | null>
}) {
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let count = 0
    scene.traverse((object) => {
      if (object.name === 'selection-outline') count += 1
    })
    host.setAttribute('data-outline', String(count))
    host.setAttribute('data-outline-color', outline)
  }, [hostRef, outline, scene, selectedId])
  return null
}

const SELECT_SHADE = 0.72

function shadeHex(color: string, factor: number) {
  const body = color.trim().replace(/^#/, '')
  const full = body.length === 3 ? [...body].map((ch) => ch + ch).join('') : body
  if (!/^[0-9a-f]{6}$/i.test(full)) return color
  const value = Number.parseInt(full, 16)
  const channel = (shift: number) => Math.max(0, Math.min(255, Math.round(((value >> shift) & 255) * factor)))
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(channel(16))}${hex(channel(8))}${hex(channel(0))}`
}

function shadePartMaterials(root: Object3D, factor: number) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const material of materials) {
      if (material instanceof MeshStandardMaterial) material.color.multiplyScalar(factor)
    }
  })
}

function GlBridge({ glRef }: { glRef: { current: WebGLRenderer | null } }) {
  const gl = useThree((state) => state.gl)
  useLayoutEffect(() => {
    glRef.current = gl
  }, [gl, glRef])
  return null
}

function NextBrick({ brick }: { brick: Brick }) {
  return (
    <mesh position={brick.position} rotation={[0, (brick.rotation * Math.PI) / 180, 0]} raycast={() => undefined}>
      <boxGeometry args={localSize(brick.type)} />
      <meshBasicMaterial transparent opacity={0.16} color="#E23D3D" depthWrite={false} />
      <Edges color="#E23D3D" threshold={15} />
    </mesh>
  )
}

function fadePart(root: Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
    for (const material of materials) {
      material.transparent = true
      material.opacity = 0.28
      material.depthWrite = false
    }
  })
}

function brickRole(index: number, total: number, reveal: BrickReveal): 'solid' | 'next' | 'fade' | 'hide' {
  if (reveal.mode === 'all') return 'solid'
  if (reveal.mode === 'build') return index < reveal.count ? 'solid' : 'hide'
  if (reveal.step >= total) return 'solid'
  if (index < reveal.step) return 'solid'
  if (index === reveal.step) return 'next'
  return reveal.showFinished ? 'fade' : 'hide'
}

function BrickModel({
  brick,
  position,
  selected,
  faded = false,
  onPointerDown,
  onPointerMove,
  onPointerOut,
  onModelError,
}: {
  brick: Brick
  position?: [number, number, number]
  selected: boolean
  faded?: boolean
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void
  onPointerOut: (event: ThreeEvent<PointerEvent>) => void
  onModelError: (message: string) => void
}) {
  const onModelErrorRef = useRef(onModelError)
  onModelErrorRef.current = onModelError
  const [template, setTemplate] = useState(() => peekBrickTemplate(brick.type))
  useEffect(() => {
    const cached = peekBrickTemplate(brick.type)
    if (cached) {
      setTemplate(cached)
      return
    }
    let cancelled = false
    loadBrickTemplate(brick.type)
      .then((group) => {
        if (!cancelled) setTemplate(group)
      })
      .catch(() => {
        if (!cancelled) onModelErrorRef.current('零件加载失败，暂时显示方块')
      })
    return () => {
      cancelled = true
    }
  }, [brick.type])
  const instance = useMemo(() => {
    if (!template) return null
    const clone = cloneColoredPart(template, brick.color)
    if (selected) shadePartMaterials(clone, SELECT_SHADE)
    if (faded) fadePart(clone)
    return clone
  }, [brick.color, faded, selected, template])
  useEffect(() => {
    if (!instance) return
    return () => disposePartMaterials(instance)
  }, [instance])
  // 摆角和滚角写在零件内部的 part-roll / part-tilt 两层上，作用在 LDraw 坐标里，
  // 支点是零件自己的原点，缩放之前就转完了，不会被各向异性缩放拉歪。
  useEffect(() => {
    if (!instance) return
    const rollGroup = instance.getObjectByName(PART_ROLL)
    const tiltGroup = instance.getObjectByName(PART_TILT)
    if (rollGroup) rollGroup.rotation.z = ((brick.roll ?? 0) * Math.PI) / 180
    if (tiltGroup) tiltGroup.rotation.x = ((brick.tilt ?? 0) * Math.PI) / 180
  }, [brick.roll, brick.tilt, instance])
  // 零件的 LDraw 原点就是它的连接点。单连接点的零件（头、手臂、手）绕这个点转，
  // 位置也对到这一点，所以它们不会掉在两个凸点中间。
  const origin = partOrigin(brick.type)
  const anchor = brick.anchor ?? [0, 0, 0]
  const point = partMount(brick.type) === 'point'
  const body = instance ? (
    <primitive object={instance} />
  ) : (
    <mesh>
      <boxGeometry args={localSize(brick.type)} />
      <meshStandardMaterial
        color={selected ? shadeHex(brick.color, SELECT_SHADE) : brick.color}
        roughness={0.55}
        transparent={faded}
        opacity={faded ? 0.28 : 1}
        depthWrite={!faded}
      />
    </mesh>
  )
  const outline = selected ? (
    <mesh raycast={() => undefined}>
      <boxGeometry args={localSize(brick.type)} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      <Edges name="selection-outline" color="#ffffff" threshold={15} />
    </mesh>
  ) : null
  return (
    <group
      position={position ?? brick.position}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      <group position={anchor}>
        <group rotation={[0, (brick.rotation * Math.PI) / 180, 0]}>
          {point ? (
            // 连接点挂在支点上：把 LDraw 原点从零件自身的偏移里挪回支点。
            <group position={[-origin[0], -origin[1], -origin[2]]}>
              {body}
              {outline}
            </group>
          ) : (
            // 网格件的零件本身已经带了对齐偏移，直接摆在支点上就行。
            <>
              {body}
              {outline}
            </>
          )}
        </group>
      </group>
    </group>
  )
}

function ModelFacts({ hostRef }: { hostRef: RefObject<HTMLElement | null> }) {
  const scene = useThree((state) => state.scene)
  const last = useRef('')
  useFrame(() => {
    const host = hostRef.current
    if (!host) return
    const facts: Record<string, { triangles: number; vertices: number; min: number[]; max: number[]; geometry: string[] }> = {}
    scene.traverse((obj) => {
      const align = obj.userData?.align as PartAlign | undefined
      const partType = obj.userData?.partType
      if (!align || typeof partType !== 'string') return
      const geometry = new Set<string>()
      obj.traverse((child) => {
        if (child instanceof Mesh) geometry.add(child.geometry.uuid)
      })
      const bucket = facts[partType] ?? {
        triangles: align.triangles,
        vertices: align.vertices,
        min: align.min,
        max: align.max,
        geometry: [],
      }
      for (const id of geometry) {
        if (!bucket.geometry.includes(id)) bucket.geometry.push(id)
      }
      facts[partType] = bucket
    })
    const json = JSON.stringify(facts)
    if (json === last.current) return
    last.current = json
    host.setAttribute('data-ldraw', json)
  })
  return null
}

function resolveGhost(spot: GhostSpot, bricks: readonly Brick[], part: BrickType) {
  // 落点高度统一走 brickPlacementY：网格件支点在脚印中心，
  // 单连接点零件的支点是它自己的连接点，底面贴在落点表面上。
  const position: [number, number, number] = [spot.sx, brickPlacementY(spot.layer, part), spot.sz]
  const conflict = hasOverlap(bricks, { id: '__preview__', type: part, rotation: 0, position })
  return { position, conflict, layer: spot.layer }
}

function placeMovePad(localX: number, localY: number, width: number, height: number, padWidth: number, padHeight: number) {
  let left = localX + PAD_GAP
  let top = localY - padHeight - PAD_GAP
  if (left + padWidth > width - PAD_MARGIN) left = localX - padWidth - PAD_GAP
  if (top < PAD_MARGIN) top = localY + PAD_GAP
  const maxLeft = Math.max(PAD_MARGIN, width - padWidth - PAD_MARGIN)
  const maxTop = Math.max(PAD_MARGIN, height - padHeight - PAD_MARGIN)
  return {
    left: Math.min(Math.max(left, PAD_MARGIN), maxLeft),
    top: Math.min(Math.max(top, PAD_MARGIN), maxTop),
  }
}

function BrickScreenAnchor({
  position,
  hostRef,
  padRef,
  onScreen,
}: {
  position: [number, number, number] | null
  hostRef: RefObject<HTMLDivElement | null>
  padRef: RefObject<HTMLDivElement | null>
  onScreen?: (point: { x: number; y: number } | null) => void
}) {
  const camera = useThree((state) => state.camera)
  const positionRef = useRef(position)
  const onScreenRef = useRef(onScreen)
  positionRef.current = position
  onScreenRef.current = onScreen
  const scratch = useRef(new Vector3())
  const reported = useRef('')

  useFrame(() => {
    const host = hostRef.current
    const current = positionRef.current
    if (!host || !current) {
      if (reported.current !== '') {
        reported.current = ''
        host?.removeAttribute('data-brick-screen')
        onScreenRef.current?.(null)
      }
      return
    }
    const width = host.clientWidth
    const height = host.clientHeight
    if (width <= 0 || height <= 0) return
    camera.updateMatrixWorld()
    const projected = scratch.current
    projected.set(current[0], current[1], current[2])
    projected.project(camera)
    if (projected.z < -1 || projected.z > 1) {
      const pad = padRef.current
      if (pad) {
        pad.style.visibility = 'hidden'
        pad.style.pointerEvents = 'none'
      }
      return
    }
    const localX = (projected.x * 0.5 + 0.5) * width
    const localY = (-projected.y * 0.5 + 0.5) * height
    const bounds = host.getBoundingClientRect()
    const clientX = bounds.left + localX
    const clientY = bounds.top + localY
    const key = `${clientX.toFixed(1)},${clientY.toFixed(1)}`
    if (key !== reported.current) {
      reported.current = key
      host.setAttribute('data-brick-screen', key)
      onScreenRef.current?.({ x: clientX, y: clientY })
    }
    const pad = padRef.current
    if (!pad) return
    const padWidth = pad.offsetWidth
    const padHeight = pad.offsetHeight
    if (padWidth <= 0 || padHeight <= 0) return
    const next = placeMovePad(localX, localY, width, height, padWidth, padHeight)
    pad.style.left = `${next.left}px`
    pad.style.top = `${next.top}px`
    pad.style.visibility = 'visible'
    pad.style.pointerEvents = 'auto'
    const projectX = clientX.toFixed(1)
    const projectY = clientY.toFixed(1)
    pad.setAttribute('data-project-x', projectX)
    pad.setAttribute('data-project-y', projectY)
    const labeled = pad.querySelector('[aria-label="移动选中积木"]')
    labeled?.setAttribute('data-project-x', projectX)
    labeled?.setAttribute('data-project-y', projectY)
  })
  return null
}

function MoveArrow({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  )
}

function MoveKey({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-xs font-bold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      {children}
    </button>
  )
}

function MovePad({ onNudge, onLayer }: { onNudge: (key: NudgeKey) => void; onLayer: (delta: 1 | -1) => void }) {
  return (
    <div className="pointer-events-auto grid grid-cols-2 gap-1 rounded-2xl bg-white/95 p-1 shadow-pop" role="group" aria-label="移动选中积木">
      <MoveKey label="向前" onClick={() => onNudge('ArrowUp')}>
        <MoveArrow>
          <path d="M12 19V6" />
          <path d="m7 11 5-5 5 5" />
        </MoveArrow>
      </MoveKey>
      <MoveKey label="升高" onClick={() => onLayer(1)}>
        <MoveArrow>
          <path d="M12 15V6" />
          <path d="m8 9 4-4 4 4" />
          <path d="M7 19h10" />
        </MoveArrow>
      </MoveKey>
      <MoveKey label="向左" onClick={() => onNudge('ArrowLeft')}>
        <MoveArrow>
          <path d="M19 12H6" />
          <path d="m11 7-5 5 5 5" />
        </MoveArrow>
      </MoveKey>
      <MoveKey label="向右" onClick={() => onNudge('ArrowRight')}>
        <MoveArrow>
          <path d="M5 12h13" />
          <path d="m13 7 5 5-5 5" />
        </MoveArrow>
      </MoveKey>
      <MoveKey label="向后" onClick={() => onNudge('ArrowDown')}>
        <MoveArrow>
          <path d="M12 5v13" />
          <path d="m7 13 5 5 5-5" />
        </MoveArrow>
      </MoveKey>
      <MoveKey label="降低" onClick={() => onLayer(-1)}>
        <MoveArrow>
          <path d="M12 9v9" />
          <path d="m8 15 4 4 4-4" />
          <path d="M7 5h10" />
        </MoveArrow>
      </MoveKey>
    </div>
  )
}

export const BrickScene = forwardRef<BrickSceneHandle, BrickSceneProps>(function BrickScene(
  {
    bricks,
    selectedId,
    part,
    color,
    tool,
    onPlace,
    onSelect,
    onDelete,
    onDrop,
    onClearSelection,
    onCamera,
    onForward,
    onGesture,
    onPreview,
    onModelError,
    onNudge,
    onLayer,
    onBrickScreen,
    reveal = { mode: 'all' },
    frozen = false,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const glRef = useRef<WebGLRenderer | null>(null)
  const frozenRef = useRef(frozen)
  frozenRef.current = frozen
  const danger = useDangerColor(hostRef)
  const cancelGesture = useRef<(() => void) | null>(null)
  const handlers = useRef({ onPlace, onSelect, onDelete, onDrop, onClearSelection, onGesture })
  handlers.current = { onPlace, onSelect, onDelete, onDrop, onClearSelection, onGesture }
  const cameraRef = useRef<Camera | null>(null)
  const publishRef = useRef<(object: Camera) => void>(() => undefined)
  publishRef.current = (object) => {
    cameraRef.current = object
    onCamera(formatCamera(object.position))
    onForward(readForward(object))
  }
  const partRef = useRef(part)
  const bricksRef = useRef(bricks)
  const onPreviewRef = useRef(onPreview)
  const toolRef = useRef(tool)
  partRef.current = part
  bricksRef.current = bricks
  onPreviewRef.current = onPreview
  toolRef.current = tool
  const [ghostSpot, setGhostSpot] = useState<GhostSpot | null>(null)
  const [dragPreview, setDragPreview] = useState<{ id: string; position: [number, number, number] } | null>(null)
  const onModelErrorRef = useRef(onModelError)
  onModelErrorRef.current = onModelError

  useEffect(() => {
    let cancelled = false
    loadBrickTemplate(part).catch(() => {
      if (!cancelled) onModelErrorRef.current?.('零件加载失败，暂时显示方块')
    })
    return () => {
      cancelled = true
    }
  }, [part])

  useEffect(() => {
    return () => cancelGesture.current?.()
  }, [])

  useLayoutEffect(() => {
    controlsRef.current?.saveState()
  }, [])

  useImperativeHandle(ref, () => ({
    resetView() {
      const controls = controlsRef.current
      if (!controls) return
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.target.set(INITIAL_TARGET[0], INITIAL_TARGET[1], INITIAL_TARGET[2])
      controls.object.position.set(INITIAL_CAMERA[0], INITIAL_CAMERA[1], INITIAL_CAMERA[2])
      controls.object.zoom = 1
      controls.object.updateProjectionMatrix()
      controls.object.lookAt(INITIAL_TARGET[0], INITIAL_TARGET[1], INITIAL_TARGET[2])
      controls.saveState()
      controls.reset()
      controls.enableDamping = damping
    },
    zoomIn() {
      controlsRef.current?.dollyIn(DOLLY_RATIO)
    },
    zoomOut() {
      controlsRef.current?.dollyOut(DOLLY_RATIO)
    },
    getCanvas() {
      return glRef.current?.domElement ?? null
    },
    getPose() {
      const controls = controlsRef.current
      const camera = controls?.object ?? cameraRef.current
      if (!camera) return null
      const target = controls?.target
      return {
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: target ? [target.x, target.y, target.z] : [0, 0, 0],
      }
    },
    setPose(pose) {
      const controls = controlsRef.current
      const camera = controls?.object ?? cameraRef.current
      if (!camera) return
      const damping = controls ? controls.enableDamping : false
      camera.up.set(0, 1, 0)
      camera.position.set(pose.position[0], pose.position[1], pose.position[2])
      if (controls) {
        controls.target.set(pose.target[0], pose.target[1], pose.target[2])
        controls.enableDamping = false
        controls.update()
        controls.enableDamping = damping
      } else {
        camera.lookAt(pose.target[0], pose.target[1], pose.target[2])
        camera.updateMatrixWorld()
      }
    },
    setControlsEnabled(enabled) {
      const controls = controlsRef.current
      if (controls) controls.enabled = enabled
    },
  }), [])

  const ghost = ghostSpot ? resolveGhost(ghostSpot, bricks, part) : null
  const ghostKey = ghost ? `${ghost.position.join(',')}:${ghost.conflict ? 1 : 0}` : ''
  useEffect(() => {
    if (!ghostSpot) {
      onPreviewRef.current(null)
      return
    }
    const next = resolveGhost(ghostSpot, bricksRef.current, partRef.current)
    onPreviewRef.current({
      x: next.position[0],
      y: next.position[1],
      z: next.position[2],
      layer: next.layer,
      conflict: next.conflict,
    })
  }, [ghostKey, ghostSpot])

  useEffect(() => {
    if (tool !== 'select') {
      cancelGesture.current?.()
      setDragPreview(null)
    }
    if (tool === 'build') return
    onPreviewRef.current(null)
    setGhostSpot((current) => (current ? null : current))
  }, [tool])

  function publishPreview(spot: GhostSpot | null) {
    if (!spot) {
      onPreviewRef.current(null)
      return
    }
    const next = resolveGhost(spot, bricksRef.current, partRef.current)
    onPreviewRef.current({
      x: next.position[0],
      y: next.position[1],
      z: next.position[2],
      layer: next.layer,
      conflict: next.conflict,
    })
  }

  function clearPreview() {
    publishPreview(null)
    setGhostSpot((current) => (current ? null : current))
  }

  function showPreview(x: number, z: number, layer: number) {
    const [sx, sz] = snapPlacement(x, z, partRef.current, 0)
    const spot = { sx, sz, layer }
    publishPreview(spot)
    setGhostSpot((current) => {
      if (current && current.sx === sx && current.sz === sz && current.layer === layer) return current
      return spot
    })
  }

  function setOrbitEnabled(enabled: boolean) {
    const controls = controlsRef.current
    if (controls) controls.enabled = enabled
  }

  function beginGesture(event: ThreeEvent<PointerEvent>, onClick: (shift: boolean) => void) {
    if (event.nativeEvent.button !== 0) return
    event.stopPropagation()
    const startX = event.nativeEvent.clientX
    const startY = event.nativeEvent.clientY
    const pointerId = event.pointerId
    const downShift = event.nativeEvent.shiftKey
    cancelGesture.current?.()

    function finish(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      clear()
      const distance = Math.hypot(ev.clientX - startX, ev.clientY - startY)
      const accepted = distance <= CLICK_MAX_PX
      handlers.current.onGesture(distance, accepted)
      if (!accepted) return
      onClick(ev.shiftKey || downShift)
    }

    function clear() {
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
      if (cancelGesture.current === clear) cancelGesture.current = null
    }

    function cancel(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      clear()
    }

    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
    cancelGesture.current = clear
  }

  function beginSelectDrag(event: ThreeEvent<PointerEvent>, brick: Brick) {
    if (event.nativeEvent.button !== 0) return
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
    const startX = event.nativeEvent.clientX
    const startY = event.nativeEvent.clientY
    const pointerId = event.pointerId
    const originY = brick.position[1]
    const brickId = brick.id
    const brickType = brick.type
    const brickRotation = brick.rotation
    cancelGesture.current?.()
    setOrbitEnabled(false)

    function planePoint(ev: PointerEvent) {
      const camera = cameraRef.current
      const host = hostRef.current
      if (!camera || !host) return null
      const hit = pointerOnPlane(camera, host, ev.clientX, ev.clientY, originY)
      if (!hit) return null
      return snapPlacement(hit.x, hit.z, brickType, brickRotation)
    }

    function showDrag(sx: number, sz: number) {
      setDragPreview((current) => {
        if (current && current.id === brickId && current.position[0] === sx && current.position[1] === originY && current.position[2] === sz) return current
        return { id: brickId, position: [sx, originY, sz] }
      })
    }

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) <= CLICK_MAX_PX) {
        setDragPreview((current) => (current ? null : current))
        return
      }
      const snapped = planePoint(ev)
      if (!snapped) return
      showDrag(snapped[0], snapped[1])
    }

    function finish(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      clear()
      const distance = Math.hypot(ev.clientX - startX, ev.clientY - startY)
      const dragged = distance > CLICK_MAX_PX
      setDragPreview(null)
      handlers.current.onGesture(distance, !dragged)
      if (!dragged) {
        handlers.current.onSelect(brickId)
        return
      }
      const snapped = planePoint(ev)
      if (snapped) handlers.current.onDrop(brickId, snapped[0], snapped[1])
      handlers.current.onSelect(brickId)
    }

    function clear() {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', cancel)
      setOrbitEnabled(true)
      setDragPreview(null)
      if (cancelGesture.current === clear) cancelGesture.current = null
    }

    function cancel(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return
      clear()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', cancel)
    cancelGesture.current = clear
  }

  useEffect(() => {
    if (!frozen) return
    onPreviewRef.current(null)
    setGhostSpot((current) => (current ? null : current))
  }, [frozen])

  function onGroundDown(event: ThreeEvent<PointerEvent>) {
    if (frozenRef.current) return
    const x = event.point.x
    const z = event.point.z
    beginGesture(event, (shift) => {
      if (shift) {
        handlers.current.onClearSelection()
        return
      }
      if (toolRef.current !== 'build') return
      handlers.current.onPlace(x, z, 0)
    })
  }

  function onBrickDown(event: ThreeEvent<PointerEvent>, brick: Brick) {
    if (frozenRef.current) return
    if (toolRef.current === 'select' && event.nativeEvent.button === 0 && !event.nativeEvent.shiftKey) {
      beginSelectDrag(event, brick)
      return
    }
    const ny = worldNormalY(event)
    const x = event.point.x
    const z = event.point.z
    const topPlates = Math.max(0, Math.round(brickTopHeight(brick) * 3))
    beginGesture(event, (shift) => {
      if (shift) {
        handlers.current.onDelete(brick.id)
        return
      }
      const mode = toolRef.current
      if (mode === 'erase') {
        handlers.current.onDelete(brick.id)
        return
      }
      if (mode === 'select') {
        handlers.current.onSelect(brick.id)
        return
      }
      if (mode !== 'build') return
      if (ny !== null && ny > 0.5) {
        handlers.current.onPlace(x, z, topPlates)
        return
      }
      handlers.current.onSelect(brick.id)
    })
  }

  function onGroundMove(event: ThreeEvent<PointerEvent>) {
    if (frozenRef.current || toolRef.current !== 'build') {
      clearPreview()
      return
    }
    showPreview(event.point.x, event.point.z, 0)
  }

  function onBrickMove(event: ThreeEvent<PointerEvent>, brick: Brick) {
    event.stopPropagation()
    if (frozenRef.current || toolRef.current !== 'build') {
      clearPreview()
      return
    }
    const ny = worldNormalY(event)
    if (ny === null || ny <= 0.5) {
      clearPreview()
      return
    }
    showPreview(event.point.x, event.point.z, Math.max(0, Math.round(brickTopHeight(brick) * 3)))
  }

  const padAnchor: [number, number, number] | null = (() => {
    if (tool !== 'select' || !selectedId) return null
    if (dragPreview?.id === selectedId) return dragPreview.position
    const found = bricks.find((item) => item.id === selectedId)
    return found ? found.position : null
  })()

  return (
    <div
      ref={hostRef}
      className="relative h-full w-full"
      role="application"
      aria-label="积木场景"
      onPointerLeave={clearPreview}
    >
      <Canvas
        className="h-full w-full"
        style={{ width: '100%', height: '100%' }}
        gl={{ alpha: true, preserveDrawingBuffer: true }}
        camera={{ position: INITIAL_CAMERA, fov: INITIAL_FOV, near: 0.1, far: 4000 }}
      >
        <color attach="background" args={[BRICK_FLOOR_COLOR]} />
        <SkyBackdrop />
        <EdgeFog />
        <ambientLight intensity={0.5} />
        <hemisphereLight color="#f4f7ee" groundColor="#2f6a32" intensity={0.45} />
        <directionalLight position={[10, 18, 8]} intensity={1.35} />
        <GroundGrid />
        <Baseplate />
        <mesh rotation={[-Math.PI / 2, 0, 0]} onPointerDown={onGroundDown} onPointerMove={onGroundMove} onPointerOut={clearPreview}>
          <planeGeometry args={[PLATE_STUDS, PLATE_STUDS]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
        {bricks.map((brick, index) => {
          const role = brickRole(index, bricks.length, reveal)
          if (role === 'hide') return null
          if (role === 'next') return <NextBrick key={brick.id} brick={brick} />
          return (
            <BrickModel
              key={brick.id}
              brick={brick}
              faded={role === 'fade'}
              position={dragPreview && dragPreview.id === brick.id ? dragPreview.position : undefined}
              selected={brick.id === selectedId && role === 'solid'}
              onPointerDown={(event) => onBrickDown(event, brick)}
              onPointerMove={(event) => onBrickMove(event, brick)}
              onPointerOut={clearPreview}
              onModelError={(message) => onModelErrorRef.current?.(message)}
            />
          )
        })}
        {tool === 'build' && ghost ? (
          <mesh position={ghost.position} raycast={() => undefined}>
            <boxGeometry args={localSize(part)} />
            <meshStandardMaterial
              color={ghost.conflict ? danger : color}
              transparent
              opacity={0.45}
              depthWrite={false}
              roughness={0.55}
            />
          </mesh>
        ) : null}
        <GlBridge glRef={glRef} />
        <PlateZoomLimit controlsRef={controlsRef} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={MIN_ORBIT_DISTANCE}
          maxPolarAngle={Math.PI / 2 - 0.04}
          target={[0, 0, 0]}
          onChange={(event) => {
            const object = (event?.target as { object?: Camera } | undefined)?.object
            if (object) publishRef.current(object)
          }}
        />
        <ViewBridge onView={(object) => publishRef.current(object)} />
        <OutlineReport selectedId={selectedId} outline="#ffffff" hostRef={hostRef} />
        <ModelFacts hostRef={hostRef} />
        <BrickScreenAnchor position={padAnchor} hostRef={hostRef} padRef={padRef} onScreen={onBrickScreen} />
      </Canvas>
      {padAnchor ? (
        <div
          ref={padRef}
          className="absolute z-30"
          style={{ left: 0, top: 0, visibility: 'hidden', pointerEvents: 'none' }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <MovePad onNudge={onNudge} onLayer={onLayer} />
        </div>
      ) : null}
    </div>
  )
})
