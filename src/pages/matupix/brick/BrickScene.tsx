import { Edges, OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react'
import { BackSide, Box3, Camera, Fog, GridHelper, Group, InstancedMesh, LineBasicMaterial, Material, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, Plane, Raycaster, Vector2, Vector3, WebGLRenderer } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { cloneColoredPart, disposePartMaterials, loadBrickTemplate, peekBrickTemplate, PART_LDRAW_ROT, PART_ROLL, PART_SPIN, PART_TILT, type PartAlign } from './brickPartModel'
import { BrickPartThumb } from './BrickPartThumb'
import { brickPlacementY, brickTopHeight, canSpinBrick, hasOverlap, localSize, partBounds, partHeight, partInfo, partMount, partOrigin, partPinCount, partSpinAxis, snapPlacement, spinAngle, type Brick, type BrickType } from './brickTypes'

const CLICK_MAX_PX = 5
const FALLBACK_DANGER = '#BE4040'
const DOLLY_RATIO = 0.8
const PAD_GAP = 12
const PAD_MARGIN = 4
// 展示机位：站在底板正前方（X=0），俯视整块底板，俯角约 30.7°。
// 这组参数是照参考图反解出来的：底板远边落在画面 27% 高处、横向占画面宽度 48%，
// 底板左边线在屏幕上每往下 1 像素往左偏 0.7 像素，底板外的细网格一直铺到画面上沿。
// 俯角是死的，取景只改镜头远近和高低，画布宽高比一变就按新比例重算。
//
// 俯角是拿底板左边线的屏幕斜率反解出来的：近边的位置和宽度只定出近边的深度，
// 定不出俯角；左右两边线张开的方向才把俯角钉死。
const INITIAL_PITCH = 30.7 * (Math.PI / 180)
// 轨道目标的高度（世界坐标）。
const TARGET_HEIGHT = 2.5
const INITIAL_FOV = 40
// 底板近边（离镜头最近的那条边）在画面里的宽度占比和高度位置，都是从参考图量出来的。
// 宽度占比决定镜头退多远，高度位置决定机位抬多高。
// 近边比画面还宽一点（1.01），所以底板左右两侧顶出画面，看得见的是远边和两条边线。
const PLATE_SCREEN_FRACTION = 1.01
const PLATE_NEAR_NDC_Y = -0.826
// 初始机位。距离按参考图的宽高比算的，真实距离在画布内按实际宽高比重算。
const INITIAL_CAMERA: [number, number, number] = [0, 29.15, 50.94]
// 初始机位的视线方向（从轨道目标指向镜头）。自动取景只改距离和轨道目标，方向不动，
// 所以画面角度和默认机位保持一致。
const INITIAL_DIRECTION = new Vector3(0, Math.sin(INITIAL_PITCH), Math.cos(INITIAL_PITCH)).normalize()
const MIN_ORBIT_DISTANCE = 8
const PLATE_MIN_SCREEN_FRACTION = 1 / 5
const BASEPLATE_COLOR = '#6DDE6D'
export const BRICK_FLOOR_COLOR = '#eaf0f1'
// 地面网格分两层，和参考图一样：
// 一格一钉的细线是很淡的绿，只把大片白地织出一点网格感；
// 每 8 格一道的主线才是实打实的绿，是地面上唯一抢眼的东西。
// 反过来（一格一钉就画实线）会让整块地面糊成一片绿网，和参考图差很远。
const FLOOR_GRID_LINE = '#d5e3d8'
const FLOOR_GRID_MAJOR = '#6bad79'
const MAJOR_STUD_SPAN = 8
const FLOOR_GRID_SIZE = 4000
const FOG_COLOR = '#ffffff'
const SKY_RADIUS = 2000
const PLATE_STUDS = 48
// 网格与地面的淡出边界（世界格）。用轨道半径（镜头到轨道目标的距离）做基准：
// 轨道半径决定画面能铺开多大一片地面，镜头退得越远、地面上沿也退得越远，
// 淡出半径跟着退，天际线的位置就不跟着窗口大小变。
// 不用「镜头到原点的水平距离」：那个量在俯角变大（镜头几乎垂直往下看）时会缩得很小，
// 淡出边界会缩进画面里，地面凭空缺一块。
//
// 系数是照默认机位反解的：那个机位下画面上沿看到的地面在 107 格开外，
// 淡出必须从画面上沿之外开始，初始画面顶部才是地面网格，而不是一条参考图没有的天空带。
//
// 但也不能太晚：天地交接处（视线刚好水平的那个方向）上，网格主线在屏幕上会挤成
// 连续几条像素宽的线，一片主线绿 #6BAD79 糊成一条绿带。所以淡出起点要压在
// 天地交接之前，让那片密集网格先褪成雾白，交接处才是白色的。
// 1.6 倍起步：底板边缘（24 格）到起点之间不淡出，底板外那圈网格保持满强度。
const FADE_NEAR_RATIO = 1.6
const FADE_FAR_RATIO = 3.0
const fadeUniforms = {
  uFadeNear: { value: 83.6 },
  uFadeFar: { value: 156.7 },
}
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
const outlineBox = new Box3()
const outlineSize = new Vector3()
const outlineCenter = new Vector3()
const outlineInv = new Matrix4()
const outlineLocal = new Matrix4()
const outlineGeoBox = new Box3()

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
  /** 绕插销旋转选中的零件（每次 15°）。 */
  onSpin: () => void
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
  /** 把镜头对准一块内容（魔法模型的包围盒，单位是格）。 */
  frameBounds: (bounds: { x: number; y: number; z: number }, safe?: FrameSafe) => void
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
varying vec3 vViewPos;
void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vViewPos = (viewMatrix * worldPos).xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

// 天空色按「相机空间的竖直斜率」tilt 分层。
//
// 分层参数不能是「视线仰角」。仰角相同的方向构成一个圆锥，透视投影到屏幕是曲线
// —— 天际线会弯成弧。tilt 相同的方向落在一个垂直于视线的平面上，它与地面的交线
// 是一条平行于相机右向量的水平直线，投影到屏幕仍然是水平直线。
// 所以天际线是平着横过画面的，不会随模型大小或位置弯成弧。
//
// tilt 与屏幕纵向位置一一对应（tilt = ndcY * tan(fov/2)），
// 所以阈值直接按「占画面多高」来标。
//
// 这里返回的是 sRGB 数值：天空球是自定义 shaderMaterial，three 不会给它加
// tonemapping / colorspace 转换，写什么就直出什么。地面那边不一样，见 brickSrgbToLinear。
//
// 画面顶部是很淡的蓝 #E5F0FB，从顶上一路平滑收到地平线的雾白 #EAF0F1；
// 雾白同时也是远处地面的底色，两者接缝处看不出界。
//
// 这个蓝要「亮」「淡」不要「深」：蓝分量给足（251），红分量压到 229，
// 颜色就亮起来、再淡一点，是接近白的淡蓝。把蓝分量也压下去会发灰，
// 把红分量留太满会看着是块蓝布，都不对。
//
// 过渡带要窄、要贴地平线：地平线以上如果拖太长一段淡蓝到雾白，整个天空看起来就是灰蓝的。
// 现在从 tilt 0.04（地平线上方一点点）才开始变蓝，0.14 就完全是蓝的 ——
// 换算到画面上，过渡带只占高度的一成多，画面上三分之一就全是蓝的，
// 地平线上方那一圈纯雾白留着，天地交接处的白色才有宽度。
const SKY_COLOR_GLSL = `
vec3 brickSkyColor(float tilt) {
  vec3 skyColor = vec3(0.89804, 0.94118, 0.98431);
  vec3 mistColor = vec3(0.91765, 0.93725, 0.94510);
  return mix(mistColor, skyColor, smoothstep(0.04, 0.14, tilt));
}

// 地面与网格线用的是标准材质，工作空间是线性 RGB，最后会被转回 sRGB 输出。
// 淡出目标色是从天空那边拿来的 sRGB 数值，混色前要先转成线性值，
// 否则和天空球那一侧对不上，地面上会留一道色差。
vec3 brickSrgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
`

const SKY_FRAGMENT = `
varying vec3 vViewPos;
${SKY_COLOR_GLSL}
void main() {
  float tilt = vViewPos.y / max( -vViewPos.z, 1e-4 );
  gl_FragColor = vec4(brickSkyColor(tilt), 1.0);
}
`

function fadeWithFog(material: Material) {
  if (!(material instanceof LineBasicMaterial) && !(material instanceof MeshBasicMaterial)) return
  material.transparent = true
  material.depthWrite = false
  material.fog = true
  // 地面和网格线不参与 tone mapping：three 默认给标准材质挂 ACES，
  // 会把写进去的颜色压暗压灰，而天空球是自定义 shaderMaterial、three 不给它挂，
  // 两边不在同一个色彩空间，地面和天空接不上，颜色也对不准。
  // 去掉 tone mapping 后，写什么色就输出什么色。
  material.toneMapped = false
  // 场景里还有一块不改色的透明放置面，也是 Basic 材质。不单独给缓存键的话，雾的透明淡出会被那份程序盖掉。
  material.customProgramCacheKey = () => 'brick-fog-fade'
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uFadeNear = fadeUniforms.uFadeNear
    shader.uniforms.uFadeFar = fadeUniforms.uFadeFar
    // 淡出量按世界坐标算：到 48×48 底板边界的切比雪夫距离。
    // 用切比雪夫而不是欧氏距离，底板四角才和底板边缘同时开始淡出。
    //
    // 淡出的目标色是「那个方向的天空色」（和天空球共用 brickSkyColor），
    // 不是白色：远处地面半透明地叠在淡蓝天上，白色会把天空混成灰蓝。
    // 淡成同方向天空色后，网格线、地面、天空三者之间没有硬边，也没有灰调。
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWorld;')
      .replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\nvFadeWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;',
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vFadeWorld;
uniform float uFadeNear;
uniform float uFadeFar;
${SKY_COLOR_GLSL}`,
      )
      .replace(
        '#include <fog_fragment>',
        `// 不走 three 自带的雾：它是按到相机的距离算的，会跟着自动取景一起漂。
  // 这里只看世界坐标，淡出量与相机位置无关。
  // 目标色用和天空球同一个 tilt 分层，所以远处地面和天空天衣无缝。
  vec3 fadeView = ( viewMatrix * vec4( vFadeWorld, 1.0 ) ).xyz;
  float fadeTilt = fadeView.y / max( -fadeView.z, 1e-4 );
  float fadeFactor = smoothstep( uFadeNear, uFadeFar, max( abs( vFadeWorld.x ), abs( vFadeWorld.z ) ) );
  gl_FragColor.rgb = mix( gl_FragColor.rgb, brickSkyColor( fadeTilt ), fadeFactor );
  gl_FragColor.a *= 1.0 - fadeFactor;`,
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
  const camera = useThree((state) => state.camera)
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.raycast = () => undefined
  }, [])
  // 天空球跟着相机平移，只平移不跟着转，球心始终压在相机上：
  // 这样无论镜头推到哪儿，天空都不会被甩在身后，也不会有近距离的视差。
  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    mesh.position.copy(camera.position)
  })
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

// 场景雾，给普通材质（零件等）用。
// 网格与地面的淡出不走这里：那部分在 fadeWithFog 里按底板边界的切比雪夫距离算，
// 基准与相机远近无关。three 自带的雾是按到相机的距离算的，会跟着自动取景一起漂，
// 天空露出的比例和色相就会随模型形状变。
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

// 网格与地面的淡出半径按轨道半径缩放。
// 参考图里网格铺到多远才化进天空，是按机位退到哪算的；固定的世界半径在窄画布上
// 会让网格铺不到那么远，天际线的高低跟着窗口大小变。
// 负优先级：在这一帧渲染之前就把半径写好。
function GridFade({ controlsRef }: { controlsRef: RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((state) => state.camera)
  useFrame(() => {
    const target = controlsRef.current?.target
    const radius = target ? camera.position.distanceTo(target) : 0
    if (radius < 1) return
    fadeUniforms.uFadeNear.value = radius * FADE_NEAR_RATIO
    fadeUniforms.uFadeFar.value = radius * FADE_FAR_RATIO
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

/**
 * 取景安全区。
 *
 * 左侧工具卡片是浮在画布上的，卡片盖住的那一块虽然画布还在渲染，
 * 但用户看不到。取景时把内容摆到没被遮住的那一半里。
 */
export type FrameSafe = {
  /** 可见区中心的归一化 X（0 = 画布左边，1 = 画布右边）。 */
  centerX: number
  /** 可见区宽度占画布宽度的比例。 */
  widthRatio: number
}

/** 整块画布都可见时的安全区。 */
const FULL_FRAME: FrameSafe = { centerX: 0.5, widthRatio: 1 }

/**
 * 按参考图的构图算展示机位。
 *
 * 参考图是站在底板正前方、俯视整块底板的机位：底板远边落在画面 27% 高处，
 * 横向占画面宽度的 48%，近边比画面还宽一点；底板外的网格一直铺到画面上沿。
 *
 * 取景只留两个自由度：俯角是死的（INITIAL_PITCH），
 * 镜头退多远由「底板近边在画面里占多宽」反推，机位抬多高由「近边落在画面多高」反推。
 * 画布宽高比一变，这两个量跟着换算，构图始终和参考图一致。
 *
 * 模型比底板高时（比如铁塔），还要退到模型整个装得下为止。
 */
function showcaseFrame(
  camera: PerspectiveCamera,
  bounds: { x: number; y: number; z: number } | null,
  safe: FrameSafe,
) {
  const tanV = Math.tan((camera.fov * Math.PI) / 360)
  const tanH = tanV * camera.aspect
  const sinP = Math.sin(INITIAL_PITCH)
  const cosP = Math.cos(INITIAL_PITCH)
  const half = PLATE_STUDS / 2
  // 底板近边的深度。近边是投影最宽的一条边，按它定距，底板在画面里的占比就固定住了。
  const depth = half / (PLATE_SCREEN_FRACTION * tanH)
  // 近边在画面里的纵向位置，换算成相机上下方向上的偏移量。
  const vert = PLATE_NEAR_NDC_Y * depth * tanV
  // 由这两个量解出：近边的水平距离、机位高出底板面的高度。
  const nearS = depth * cosP + vert * sinP
  const nearH = depth * sinP - vert * cosP
  // 轨道目标高度固定，轨道半径和目标的 Z 据此推出来。
  let distance = (nearH + PLATE_TOP - TARGET_HEIGHT) / sinP
  const targetZ = nearS + half - distance * cosP
  // 安全区中心在 ndc 里的位置。底板要摆到安全区中心，而不是画布中心
  // （左边被工具卡片盖着）。
  const centerNdc = 2 * safe.centerX - 1
  let offsetX = 0
  for (let pass = 0; pass < 3; pass += 1) {
    let need = distance
    // 模型：整个装进画面
    if (bounds) {
      for (const x of [-bounds.x / 2, bounds.x / 2]) {
        for (const y of [0, bounds.y]) {
          for (const z of [-bounds.z / 2, bounds.z / 2]) {
            const py = PLATE_TOP + y
            // 相机上下方向上的偏移量。相机沿视线平移，这个量不变。
            const vertical = Math.abs((py - TARGET_HEIGHT) * cosP + (targetZ - z) * sinP)
            const lateral = Math.abs(x - offsetX)
            // 轨道半径要退到多深，才装得下这个角点
            const base = (TARGET_HEIGHT - py) * sinP + (targetZ - z) * cosP
            need = Math.max(
              need,
              lateral / (0.86 * tanH) - base,
              vertical / (0.72 * tanV) - base,
            )
          }
        }
      }
    }
    distance = need
    // 横向偏移把底板摆到安全区中心。偏移量和距离互相影响，迭代三轮。
    const edgeDepth = distance + (TARGET_HEIGHT - PLATE_TOP) * sinP + (targetZ - half) * cosP
    offsetX = -centerNdc * edgeDepth * tanH
  }
  return { distance, offsetX, targetZ }
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

// 首帧把机位按画布宽高比退到位。
//
// 画布外面算取景的时候还不知道真实宽高比，进来再算一次才准。
// 用 useFrame 而不是 useLayoutEffect：R3F 的画布尺寸和相机投影矩阵是在
// 自己的 effect 里更新的，布局阶段拿到的还是旧比例。
// 默认优先级（非正）会在这一帧渲染之前执行，第一帧就是最终构图。
//
// 用户自己动过镜头，或者已经按某个模型取过景，就不再自动接管。
function InitialCamera({
  controlsRef,
  autoFrame,
}: {
  controlsRef: RefObject<OrbitControlsImpl | null>
  autoFrame: MutableRefObject<{ touched: boolean; modelFramed: boolean }>
}) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const lastSize = useRef('')
  useFrame(() => {
    if (autoFrame.current.touched || autoFrame.current.modelFramed) return
    if (!(camera instanceof PerspectiveCamera)) return
    const controls = controlsRef.current
    if (!controls) return
    if (size.width < 2 || size.height < 2) return
    const key = `${size.width}x${size.height}`
    if (key === lastSize.current) return
    lastSize.current = key
    const frame = showcaseFrame(camera, null, FULL_FRAME)
    const damping = controls.enableDamping
    controls.enableDamping = false
    controls.target.set(frame.offsetX, TARGET_HEIGHT, frame.targetZ)
    camera.position
      .set(frame.offsetX, TARGET_HEIGHT, frame.targetZ)
      .addScaledVector(INITIAL_DIRECTION, frame.distance)
    camera.lookAt(controls.target)
    controls.update()
    controls.enableDamping = damping
  })
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

/**
 * 在 root 局部坐标里量 target 的 AABB。
 * 必须走子 mesh 几何 + 世界矩阵反变换：setFromObject 是世界轴对齐盒，
 * 再转回局部会胀一圈；这里直接得到贴合 ldraw.rot / tilt / roll 后的紧包围盒。
 */
function measureLocalBox(target: Object3D, root: Object3D, out: Box3) {
  out.makeEmpty()
  target.updateWorldMatrix(true, true)
  root.updateWorldMatrix(true, false)
  outlineInv.copy(root.matrixWorld).invert()
  target.traverse((child) => {
    if (!(child instanceof Mesh) || !child.geometry) return
    const geom = child.geometry
    if (!geom.boundingBox) geom.computeBoundingBox()
    if (!geom.boundingBox || geom.boundingBox.isEmpty()) return
    outlineLocal.copy(outlineInv).multiply(child.matrixWorld)
    outlineGeoBox.copy(geom.boundingBox).applyMatrix4(outlineLocal)
    out.union(outlineGeoBox)
  })
  return out
}

/**
 * 选中框：跟真实零件网格走，不再用目录里的 studs×plates 占位盒。
 * 单位盒按测得的局部 AABB 平移+缩放；Edges 仍叫 selection-outline，探测逻辑不用改。
 */
function SelectionOutline({ targetRef }: { targetRef: { current: Object3D | null } }) {
  const meshRef = useRef<Mesh>(null)
  useFrame(() => {
    const target = targetRef.current
    const mesh = meshRef.current
    const parent = mesh?.parent
    if (!target || !mesh || !parent) return
    measureLocalBox(target, parent, outlineBox)
    if (outlineBox.isEmpty()) {
      mesh.visible = false
      return
    }
    outlineBox.getSize(outlineSize)
    outlineBox.getCenter(outlineCenter)
    if (outlineSize.x < 1e-6 || outlineSize.y < 1e-6 || outlineSize.z < 1e-6) {
      mesh.visible = false
      return
    }
    mesh.visible = true
    mesh.position.copy(outlineCenter)
    mesh.scale.copy(outlineSize)
  })
  return (
    <mesh ref={meshRef} raycast={() => undefined} visible={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      <Edges name="selection-outline" color="#ffffff" threshold={15} />
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
  // 摆角、滚角、插销旋转写在零件内部的 part-tilt / part-roll / part-spin 上，
  // 作用在 LDraw 坐标里，支点是零件自己的原点，缩放之前就转完了，不会被各向异性缩放拉歪。
  // LDraw 矩阵件走 part-ldraw-rot 那层：官方模型的姿态是任意角度的矩阵，转向/摆角/滚角表达不了。
  // spin 在矩阵内侧绕局部销轴，再经 ldraw.rot 变到世界，水平插销上的桨才会像风扇一样转。
  useEffect(() => {
    if (!instance) return
    const rollGroup = instance.getObjectByName(PART_ROLL)
    const tiltGroup = instance.getObjectByName(PART_TILT)
    const spinGroup = instance.getObjectByName(PART_SPIN)
    const ldrawGroup = instance.getObjectByName(PART_LDRAW_ROT)
    if (ldrawGroup && brick.ldraw) {
      const r = brick.ldraw.rot
      ldrawGroup.matrixAutoUpdate = false
      ldrawGroup.matrix.set(
        r[0], r[1], r[2], 0,
        r[3], r[4], r[5], 0,
        r[6], r[7], r[8], 0,
        0, 0, 0, 1,
      )
      ldrawGroup.matrixWorldNeedsUpdate = true
    }
    if (rollGroup) rollGroup.rotation.z = ((brick.roll ?? 0) * Math.PI) / 180
    if (tiltGroup) tiltGroup.rotation.x = ((brick.tilt ?? 0) * Math.PI) / 180
    if (spinGroup) {
      const rad = ((brick.spin ?? 0) * Math.PI) / 180
      const axis = partSpinAxis(brick.type)
      spinGroup.rotation.set(
        axis === 'x' ? rad : 0,
        axis === 'y' ? rad : 0,
        axis === 'z' ? rad : 0,
      )
    }
  }, [brick.roll, brick.tilt, brick.spin, brick.type, brick.ldraw, instance])
  // 零件的 LDraw 原点就是它的连接点。单连接点的零件（头、手臂、手）绕这个点转，
  // 位置也对到这一点，所以它们不会掉在两个凸点中间。
  const origin = partOrigin(brick.type)
  const anchor = brick.anchor ?? [0, 0, 0]
  const point = partMount(brick.type) === 'point'
  // 魔法螺旋桨等：仍按网格/AABB 中心落点（避免改 mount 弄歪官方矩阵），
  // 但 90° 转向要绕 LDraw 原点（插销），不能绕 AABB 中心转。
  // spin 已在零件内部绕局部销轴，外层只保留竖直转向。
  const spinAroundPin = !point && partPinCount(brick.type) === 1
  const yaw = (brick.rotation * Math.PI) / 180
  const bodyRef = useRef<Group>(null)
  const body = (
    <group ref={bodyRef}>
      {instance ? (
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
      )}
    </group>
  )
  const outline = selected ? <SelectionOutline targetRef={bodyRef} /> : null
  const spunBody = point ? (
    // 连接点挂在支点上：把 LDraw 原点从零件自身的偏移里挪回支点。
    <group rotation={[0, yaw, 0]}>
      <group position={[-origin[0], -origin[1], -origin[2]]}>
        {body}
        {outline}
      </group>
    </group>
  ) : spinAroundPin ? (
    // 落点仍是 AABB 中心，转向轴挪到插销：先走到原点，再转，再走回。
    <group position={[origin[0], origin[1], origin[2]]}>
      <group rotation={[0, yaw, 0]}>
        <group position={[-origin[0], -origin[1], -origin[2]]}>
          {body}
          {outline}
        </group>
      </group>
    </group>
  ) : (
    // 网格多卡点件：零件本身已经带了对齐偏移，直接绕脚印中心转。
    <group rotation={[0, yaw, 0]}>
      {body}
      {outline}
    </group>
  )
  return (
    <group
      position={position ?? brick.position}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    >
      <group position={anchor}>
        {/* 外层只做 90° 竖直转向；绕插销的 spin 在零件内部 part-spin 层。 */}
        {spunBody}
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

/**
 * 零件在世界坐标里的包围盒角点。
 *
 * 网格件的支点在脚印中心，单连接点零件的支点是它自己的连接点（LDraw 原点），
 * 两者相对零件自身的位置不一样，所以要按真实的角点算，弹窗才知道该让开多远。
 */
function brickBoxCorners(brick: Brick): [number, number, number][] {
  const origin = partOrigin(brick.type)
  const bounds = partBounds(brick.type)
  const height = partHeight(brick.type)
  const anchor = brick.anchor ?? [0, 0, 0]
  const pivot: [number, number, number] = [
    brick.position[0] + anchor[0],
    brick.position[1] + anchor[1],
    brick.position[2] + anchor[2],
  ]
  // 支点在零件自身坐标里的位置：网格件是脚印中心，单连接点件是连接点。
  const localPivot: [number, number, number] =
    partMount(brick.type) === 'point' ? [origin[0], origin[1] - height / 2, origin[2]] : [0, 0, 0]
  const lo: [number, number, number] = [
    bounds[0] + origin[0] - localPivot[0],
    bounds[1] + origin[1] - height / 2 - localPivot[1],
    bounds[2] + origin[2] - localPivot[2],
  ]
  const hi: [number, number, number] = [
    bounds[3] + origin[0] - localPivot[0],
    bounds[4] + origin[1] - height / 2 - localPivot[1],
    bounds[5] + origin[2] - localPivot[2],
  ]
  // 外层只绕竖直轴做 90° 转向；spin 在局部销轴上，对弹窗避让用 AABB 近似即可忽略。
  const angle = (brick.rotation * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const corners: [number, number, number][] = []
  for (const x of [lo[0], hi[0]]) {
    for (const y of [lo[1], hi[1]]) {
      for (const z of [lo[2], hi[2]]) {
        // 绕支点的竖直轴转，渲染端外层 yaw 和这里用同一个式子。
        corners.push([
          pivot[0] + x * cos + z * sin,
          pivot[1] + y,
          pivot[2] - x * sin + z * cos,
        ])
      }
    }
  }
  return corners
}

/**
 * 弹窗的落位。
 *
 * 横着放时贴着零件在屏幕上的边缘，不压住零件；右边放不下就翻到零件左边。
 */
function placeMovePad(
  localY: number,
  width: number,
  height: number,
  padWidth: number,
  padHeight: number,
  boxLeft: number,
  boxRight: number,
) {
  let left = boxRight + PAD_GAP
  let top = localY - padHeight - PAD_GAP
  if (left + padWidth > width - PAD_MARGIN) left = boxLeft - padWidth - PAD_GAP
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
  corners,
  hostRef,
  padRef,
  onScreen,
}: {
  position: [number, number, number] | null
  corners: [number, number, number][] | null
  hostRef: RefObject<HTMLDivElement | null>
  padRef: RefObject<HTMLDivElement | null>
  onScreen?: (point: { x: number; y: number } | null) => void
}) {
  const camera = useThree((state) => state.camera)
  const positionRef = useRef(position)
  const cornersRef = useRef(corners)
  const onScreenRef = useRef(onScreen)
  positionRef.current = position
  cornersRef.current = corners
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
    // 零件在屏幕上的左右边界：弹窗贴着边放，就不会盖住零件。
    let boxLeft = localX
    let boxRight = localX
    const box = cornersRef.current
    if (box && box.length > 0) {
      let min = Infinity
      let max = -Infinity
      for (const corner of box) {
        projected.set(corner[0], corner[1], corner[2]).project(camera)
        if (projected.z < -1 || projected.z > 1) continue
        const x = (projected.x * 0.5 + 0.5) * width
        if (x < min) min = x
        if (x > max) max = x
      }
      if (min !== Infinity) {
        boxLeft = min
        boxRight = max
      }
    }
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
    const next = placeMovePad(localY, width, height, padWidth, padHeight, boxLeft, boxRight)
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

function RotateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 4v5h-5" />
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

/** 升降层的两个绿虚线键：跟十字方向键分开，位置不一样一眼能认出来。 */
function LayerKey({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 border-dashed border-[#43C17A] bg-[#F1FBF5] text-[#2FA84A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
    >
      {children}
    </button>
  )
}

/**
 * 选中零件后的操作弹窗。
 *
 * 卡片式：标题行（零件缩略图 + 型号名 + 关闭）→ 虚线 → 十字方向键和绿色升降键
 * → 虚线 → 绕插销旋转的黄色按钮。
 */
function MovePad({
  brick,
  onNudge,
  onLayer,
  onSpin,
  onClose,
}: {
  brick: Brick
  onNudge: (key: NudgeKey) => void
  onLayer: (delta: 1 | -1) => void
  onSpin: () => void
  onClose: () => void
}) {
  const info = partInfo(brick.type)
  const angle = spinAngle(brick)
  // 多个卡点的零件转了会对不上网格，按钮置灰。
  const spinable = canSpinBrick(brick)
  return (
    <div
      className="pointer-events-auto w-max max-w-[180px] rounded-[20px] border border-[#E4E9F0] bg-white/95 p-2 shadow-pop"
      role="group"
      aria-label="移动选中积木"
    >
      <div className="flex items-center gap-2 px-0.5 pb-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F1F5F9] ring-1 ring-[#E4E9F0]">
          <BrickPartThumb type={brick.type} color={brick.color} className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold leading-4 text-ink">{info.label}</span>
          <span className="block truncate text-[10px] leading-3 text-ink-soft">#{info.ldraw}</span>
        </span>
        <button
          type="button"
          aria-label="关闭零件操作"
          title="关闭"
          onClick={onClose}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[15px] font-bold leading-none text-ink-soft transition-colors hover:bg-[#F1F5F9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          ×
        </button>
      </div>
      <div aria-hidden="true" data-separator="thick-dash" className="border-t-2 border-dashed border-[#C5CED6]" />
      <div className="flex items-center gap-1.5 py-2">
        <div className="grid grid-cols-3 grid-rows-3 gap-1">
          <span className="col-start-2 row-start-1">
            <MoveKey label="向前" onClick={() => onNudge('ArrowUp')}>
              <MoveArrow>
                <path d="M12 19V6" />
                <path d="m7 11 5-5 5 5" />
              </MoveArrow>
            </MoveKey>
          </span>
          <span className="col-start-1 row-start-2">
            <MoveKey label="向左" onClick={() => onNudge('ArrowLeft')}>
              <MoveArrow>
                <path d="M19 12H6" />
                <path d="m11 7-5 5 5 5" />
              </MoveArrow>
            </MoveKey>
          </span>
          <span className="col-start-2 row-start-2" aria-hidden="true">
            <span className="block h-8 w-8 rounded-lg bg-[#F1F5F9] ring-1 ring-[#E4E9F0]" />
          </span>
          <span className="col-start-3 row-start-2">
            <MoveKey label="向右" onClick={() => onNudge('ArrowRight')}>
              <MoveArrow>
                <path d="M5 12h13" />
                <path d="m13 7 5 5-5 5" />
              </MoveArrow>
            </MoveKey>
          </span>
          <span className="col-start-2 row-start-3">
            <MoveKey label="向后" onClick={() => onNudge('ArrowDown')}>
              <MoveArrow>
                <path d="M12 5v13" />
                <path d="m7 13 5 5 5-5" />
              </MoveArrow>
            </MoveKey>
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <LayerKey label="升高" onClick={() => onLayer(1)}>
            <MoveArrow>
              <path d="M12 15V6" />
              <path d="m8 9 4-4 4 4" />
              <path d="M7 19h10" />
            </MoveArrow>
          </LayerKey>
          <LayerKey label="降低" onClick={() => onLayer(-1)}>
            <MoveArrow>
              <path d="M12 9v9" />
              <path d="m8 15 4 4 4-4" />
              <path d="M7 5h10" />
            </MoveArrow>
          </LayerKey>
        </div>
      </div>
      <div aria-hidden="true" data-separator="thick-dash" className="border-t-2 border-dashed border-[#C5CED6]" />
      <button
        type="button"
        aria-label={`旋转 ${angle}°`}
        title={spinable ? '绕插销旋转 15°' : '多个卡点的零件不能绕插销旋转'}
        disabled={!spinable}
        onClick={onSpin}
        className={`mt-2 flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-[13px] font-bold transition-transform ${
          spinable
            ? 'bg-gradient-to-b from-[#FFD562] to-[#F0A81B] text-[#6B4300] shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_3px_0_#C9820A,0_8px_14px_rgba(190,130,20,0.26)] hover:brightness-[1.03] active:translate-y-[2px] active:shadow-[inset_0_2px_4px_rgba(120,80,0,0.25),0_1px_0_#C9820A]'
            : 'cursor-not-allowed border border-[#DCE2E9] bg-[#EDF0F4] text-[#A3ADB8]'
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2`}
      >
        <RotateIcon />
        <span>旋转 {angle}°</span>
        <span className={`rounded-[5px] px-1.5 py-[2px] text-[10px] font-black leading-none ${spinable ? 'bg-white/75 text-[#8A5A00]' : 'bg-white/60 text-[#A9B3BD]'}`}>R</span>
      </button>
      {spinable ? null : (
        <p className="mt-1 text-center text-[10px] leading-4 text-[#9AA6B2]">多个卡点，不能绕插销转</p>
      )}
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
    onSpin,
    onBrickScreen,
    reveal = { mode: 'all' },
    frozen = false,
  },
  ref,
) {
  const hostRef = useRef<HTMLDivElement>(null)
  const padRef = useRef<HTMLDivElement>(null)
  const controlsRef = useRef<OrbitControlsImpl>(null)
  // 自动取景的状态：用户动过镜头、或者已经按某个模型取过景，就不再自动接管机位。
  const autoFrame = useRef({ touched: false, modelFramed: false })
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
      const camera = controls.object
      if (!(camera instanceof PerspectiveCamera)) return
      // 重置视角拉回展示机位。距离按当前画布宽高比重算，
      // 构图才和刚打开页面时一样。
      const frame = showcaseFrame(camera, null, FULL_FRAME)
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.update()
      controls.target.set(frame.offsetX, TARGET_HEIGHT, frame.targetZ)
      camera.position
        .set(frame.offsetX, TARGET_HEIGHT, frame.targetZ)
        .addScaledVector(INITIAL_DIRECTION, frame.distance)
      camera.zoom = 1
      camera.updateProjectionMatrix()
      camera.lookAt(controls.target)
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
    frameBounds(bounds, safe) {
      const controls = controlsRef.current
      if (!controls) return
      const camera = controls.object
      if (!(camera instanceof PerspectiveCamera)) return
      autoFrame.current.modelFramed = true
      const frame = showcaseFrame(camera, bounds, safe ?? FULL_FRAME)
      // 展示机位的目标高度是固定的，横向偏移只为了躲开被工具卡片盖住的那一块。
      const target = new Vector3(frame.offsetX, TARGET_HEIGHT, frame.targetZ)
      const distance = frame.distance
      const damping = controls.enableDamping
      controls.enableDamping = false
      controls.target.copy(target)
      camera.position.copy(target).addScaledVector(INITIAL_DIRECTION, distance)
      camera.lookAt(target)
      controls.update()
      controls.enableDamping = damping
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

  // 弹窗要显示选中零件的型号、缩略图和已转过的角度。
  const selectedBrick = selectedId ? bricks.find((item) => item.id === selectedId) ?? null : null

  // 弹窗按零件在屏幕上的实际宽度让位，拖动时跟着拖动位置走。
  const padCorners = useMemo(() => {
    if (!selectedBrick) return null
    const live = dragPreview?.id === selectedBrick.id ? { ...selectedBrick, position: dragPreview.position } : selectedBrick
    return brickBoxCorners(live)
  }, [selectedBrick, dragPreview])

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
        <GridFade controlsRef={controlsRef} />
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
        <InitialCamera controlsRef={controlsRef} autoFrame={autoFrame} />
        <OrbitControls
          ref={controlsRef}
          makeDefault
          minDistance={MIN_ORBIT_DISTANCE}
          maxPolarAngle={Math.PI / 2 - 0.04}
          target={[0, 0, 0]}
          onStart={() => {
            autoFrame.current.touched = true
          }}
          onChange={(event) => {
            const object = (event?.target as { object?: Camera } | undefined)?.object
            if (object) publishRef.current(object)
          }}
        />
        <ViewBridge onView={(object) => publishRef.current(object)} />
        <OutlineReport selectedId={selectedId} outline="#ffffff" hostRef={hostRef} />
        <ModelFacts hostRef={hostRef} />
        <BrickScreenAnchor position={padAnchor} corners={padCorners} hostRef={hostRef} padRef={padRef} onScreen={onBrickScreen} />
      </Canvas>
      {padAnchor && selectedBrick ? (
        <div
          ref={padRef}
          className="absolute z-30"
          style={{ left: 0, top: 0, visibility: 'hidden', pointerEvents: 'none' }}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <MovePad
            brick={selectedBrick}
            onNudge={onNudge}
            onLayer={onLayer}
            onSpin={onSpin}
            onClose={onClearSelection}
          />
        </div>
      ) : null}
    </div>
  )
})
