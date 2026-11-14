import type { Path, PathPoint, Point } from './types.ts'

// Custom paths between formations. A path's points are stored relative to the straight line from the start spot `a`
// to the end spot `b` (see PathPoint), and turned into stage points here.

/** Direction of travel (`along` 1 = the whole move) and the unit vector to its right. */
function frame(a: Point, b: Point) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  // A dancer who stays put has no direction of travel; measure their path in feet from their spot instead.
  if (length < 1e-6) return { ux: 1, uy: 0, nx: 0, ny: 1 }
  return { ux: dx, uy: dy, nx: -dy / length, ny: dx / length }
}

export function toStage(p: PathPoint, a: Point, b: Point): Point {
  const f = frame(a, b)
  return { x: a.x + p.along * f.ux + p.across * f.nx, y: a.y + p.along * f.uy + p.across * f.ny }
}

export function fromStage(q: Point, a: Point, b: Point): PathPoint {
  const f = frame(a, b)
  const dx = q.x - a.x
  const dy = q.y - a.y
  const r = (v: number) => Math.round(v * 1000) / 1000
  return { along: r((dx * f.ux + dy * f.uy) / (f.ux * f.ux + f.uy * f.uy)), across: r(dx * f.nx + dy * f.ny) }
}

/** Points sampled on each smooth curve segment between two path points. */
const SAMPLES = 16

/** Point at `t` (0–1) between p1 and p2 on a centripetal Catmull-Rom curve, which passes through every point without loops or overshoot. */
function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const knot = (a: Point, b: Point) => Math.max(Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)), 1e-4)
  const t1 = knot(p0, p1)
  const t2 = t1 + knot(p1, p2)
  const t3 = t2 + knot(p2, p3)
  const u = t1 + (t2 - t1) * t
  const mix = (a: Point, b: Point, ta: number, tb: number): Point => {
    const k = (u - ta) / (tb - ta)
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
  }
  const a1 = mix(p0, p1, 0, t1)
  const a2 = mix(p1, p2, t1, t2)
  const a3 = mix(p2, p3, t2, t3)
  return mix(mix(a1, a2, 0, t2), mix(a2, a3, t1, t3), t1, t2)
}

/** The path's stage points, including the start and end spots. */
export const controlPoints = (a: Point, b: Point, path?: Path): Point[] => [a, ...(path?.points ?? []).map((p) => toStage(p, a, b)), b]

/** The route a dancer takes from `a` to `b`, as a polyline: straight without a path, else through the path's points. */
export function route(a: Point, b: Point, path?: Path): Point[] {
  const pts = controlPoints(a, b, path)
  if (pts.length === 2 || path?.corners) return pts
  const out = [pts[0]]
  for (let i = 0; i + 1 < pts.length; i++) {
    const p1 = pts[i]
    const p2 = pts[i + 1]
    // At the ends, extend the curve straight out so it starts and ends naturally.
    const p0 = pts[i - 1] ?? { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y }
    const p3 = pts[i + 2] ?? { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y }
    for (let s = 1; s <= SAMPLES; s++) out.push(catmullRom(p0, p1, p2, p3, s / SAMPLES))
  }
  return out
}

/** Where to show the "drag to bend" handle on each piece of the path: halfway along each piece between its points. */
export function pieceMidpoints(a: Point, b: Point, path?: Path): Point[] {
  const pts = controlPoints(a, b, path)
  if (pts.length === 2 || path?.corners) return pts.slice(1).map((p, i) => ({ x: (pts[i].x + p.x) / 2, y: (pts[i].y + p.y) / 2 }))
  const curve = route(a, b, path)
  return pts.slice(1).map((_, i) => curve[i * SAMPLES + SAMPLES / 2])
}

export function routeLength(points: Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  return length
}

/** The point `distance` feet along a route (clamped to its ends). */
function pointAt(points: Point[], distance: number): Point {
  let left = Math.max(0, distance)
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]
    const b = points[i]
    const step = Math.hypot(b.x - a.x, b.y - a.y)
    if (left <= step && step > 0) return { x: a.x + ((b.x - a.x) * left) / step, y: a.y + ((b.y - a.y) * left) / step }
    left -= step
  }
  return points[points.length - 1]
}

/** The point a `fraction` (0–1) of the way along a route, by distance, so dancers keep an even pace around curves. */
export const pointAlong = (points: Point[], fraction: number) => pointAt(points, routeLength(points) * Math.min(1, Math.max(0, fraction)))

/** The part of a route between `from` and `to` feet along it. */
export function sliceRoute(points: Point[], from: number, to: number): Point[] {
  const out = [pointAt(points, from)]
  let travelled = 0
  for (let i = 1; i < points.length; i++) {
    travelled += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
    if (travelled > from && travelled < to) out.push(points[i])
  }
  out.push(pointAt(points, to))
  return out
}
