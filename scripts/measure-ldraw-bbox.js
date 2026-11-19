const fs = require("fs")
const path = require("path")
const root = "E:/MatuOne/public/ldraw"
const special = {
  propeller:"6041", "bar-4l":"30374", antenna:"3957a", tyre:"3641", "tyre-small":"6015",
  windscreen:"3823", seat:"4079", door:"60623", window:"60592", flower:"32606", bush:"37695",
  steer:"3829c01", grille:"2412b", canopy:"4474", flag:"4495a", "2x4":"3001", "brick-2x6":"2456"
}
function parse(file, depth=0, matrix=[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], mins, maxs) {
  if (depth > 8) return
  const text = fs.readFileSync(file, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const p = line.trim().split(/\s+/)
    if (p[0]==="1" && p.length>=15) {
      const x=+p[2], y=+p[3], z=+p[4]
      const a=+p[5],b=+p[6],c=+p[7],d=+p[8],e=+p[9],f=+p[10],g=+p[11],h=+p[12],i=+p[13]
      const child = p.slice(14).join(" ").replace(/\\/g,"/")
      const next = [
        matrix[0]*a+matrix[1]*d+matrix[2]*g, matrix[0]*b+matrix[1]*e+matrix[2]*h, matrix[0]*c+matrix[1]*f+matrix[2]*i, 0,
        matrix[4]*a+matrix[5]*d+matrix[6]*g, matrix[4]*b+matrix[5]*e+matrix[6]*h, matrix[4]*c+matrix[5]*f+matrix[6]*i, 0,
        matrix[8]*a+matrix[9]*d+matrix[10]*g, matrix[8]*b+matrix[9]*e+matrix[10]*h, matrix[8]*c+matrix[9]*f+matrix[10]*i, 0,
        matrix[0]*x+matrix[1]*y+matrix[2]*z+matrix[3], matrix[4]*x+matrix[5]*y+matrix[6]*z+matrix[7], matrix[8]*x+matrix[9]*y+matrix[10]*z+matrix[11], 1
      ]
      const candidates = [path.join(root,"parts",child), path.join(root,"p",child), path.join(root,"parts","s",child)]
      const hit = candidates.find(f => fs.existsSync(f))
      if (hit) parse(hit, depth+1, next, mins, maxs)
      else {
        // approximate with origin point
        mins[0]=Math.min(mins[0], next[3]); mins[1]=Math.min(mins[1], next[7]); mins[2]=Math.min(mins[2], next[11])
        maxs[0]=Math.max(maxs[0], next[3]); maxs[1]=Math.max(maxs[1], next[7]); maxs[2]=Math.max(maxs[2], next[11])
      }
    } else if ((p[0]==="2"||p[0]==="3"||p[0]==="4") && p.length>=8) {
      const coords = p.slice(2).map(Number)
      for (let i=0;i+2<coords.length;i+=3) {
        const x=coords[i], y=coords[i+1], z=coords[i+2]
        const X=matrix[0]*x+matrix[1]*y+matrix[2]*z+matrix[3]
        const Y=matrix[4]*x+matrix[5]*y+matrix[6]*z+matrix[7]
        const Z=matrix[8]*x+matrix[9]*y+matrix[10]*z+matrix[11]
        mins[0]=Math.min(mins[0],X); mins[1]=Math.min(mins[1],Y); mins[2]=Math.min(mins[2],Z)
        maxs[0]=Math.max(maxs[0],X); maxs[1]=Math.max(maxs[1],Y); maxs[2]=Math.max(maxs[2],Z)
      }
    }
  }
}
for (const [name, id] of Object.entries(special)) {
  const file = path.join(root, "parts", id + ".dat")
  if (!fs.existsSync(file)) { console.log("MISS", name, id); continue }
  const mins=[1e9,1e9,1e9], maxs=[-1e9,-1e9,-1e9]
  parse(file, 0, [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1], mins, maxs)
  const sx=(maxs[0]-mins[0])/20, sy=(maxs[1]-mins[1])/24, sz=(maxs[2]-mins[2])/20
  console.log(name.padEnd(12), "ldu", [mins,maxs].map(a=>a.map(v=>+v.toFixed(1))), "stud/brick", sx.toFixed(2)+" x "+sy.toFixed(2)+" x "+sz.toFixed(2))
}
