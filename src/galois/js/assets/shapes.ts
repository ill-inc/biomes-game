import * as l from "@/galois/lang";

function write(v0: [number, number, number], v1: [number, number, number]) {
  return l.BoxMask([[v0, v1]]);
}

function union(masks: l.Mask[]): l.Mask {
  if (masks.length == 0) {
    return l.EmptyMask();
  } else {
    return l.Union(masks.pop()!, union(masks));
  }
}

const full = write([0, 0, 0], [8, 8, 8]);
const slab = write([0, 0, 0], [8, 4, 8]);
const step = union([write([0, 0, 0], [8, 4, 8]), write([0, 4, 4], [8, 8, 8])]);
const log = union([write([1, 0, 0], [7, 8, 8]), write([0, 0, 1], [8, 8, 7])]);
const fence = union([
  write([0, 0, 3], [2, 8, 5]),
  write([6, 0, 3], [8, 8, 5]),
  write([0, 1, 3], [8, 3, 5]),
  write([0, 5, 3], [8, 7, 5]),
]);
const table = union([
  write([0, 7, 0], [8, 8, 8]),
  write([0, 0, 0], [1, 8, 1]),
  write([7, 0, 0], [8, 8, 1]),
  write([0, 0, 7], [1, 8, 8]),
  write([7, 0, 7], [8, 8, 8]),
]);
const wall = union([write([0, 0, 0], [4, 8, 8])]);
const path = union([write([0, 0, 0], [8, 7, 8])]);
const inset = union([write([0, 0, 0], [7, 8, 8])]);
const outset = union([write([0, 0, 0], [1, 8, 8])]);
const frame = union([
  write([0, 0, 0], [8, 1, 2]),
  write([0, 7, 0], [8, 8, 2]),
  write([0, 0, 0], [1, 8, 2]),
  write([7, 0, 0], [8, 8, 2]),
]);
const slice = union([write([0, 0, 0], [8, 1, 8])]);
const peg = union([write([3, 0, 3], [5, 8, 5])]);
const corner = union([
  write([0, 0, 0], [8, 4, 8]),
  write([0, 0, 0], [4, 8, 8]),
  write([0, 0, 0], [8, 8, 4]),
]);
const knob = union([write([0, 0, 0], [8, 4, 8]), write([0, 4, 0], [4, 8, 4])]);
const window = union([
  write([0, 0, 0], [8, 1, 4]),
  write([0, 7, 0], [8, 8, 4]),
  write([0, 0, 0], [1, 8, 4]),
  write([7, 0, 0], [8, 8, 4]),
]);
const stool = union([write([3, 0, 3], [5, 8, 5]), write([0, 6, 0], [8, 8, 8])]);
const stub = union([write([3, 0, 3], [5, 4, 5])]);
const beam = union([write([0, 3, 3], [8, 5, 5])]);
const track = union([
  write([0, 0, 0], [1, 2, 8]),
  write([7, 0, 0], [8, 2, 8]),
  write([1, 1, 1], [7, 2, 3]),
  write([1, 1, 5], [7, 2, 7]),
]);
const shaft = union([write([2, 0, 2], [6, 8, 6])]);
// ell shape: left face -> front face
const ellBeam = union([
  write([0, 3, 3], [5, 5, 5]),
  write([3, 3, 0], [5, 5, 5]),
]);
// ell shape: bottom face -> front face
const ellPeg = union([
  write([3, 0, 3], [5, 5, 5]),
  write([3, 3, 0], [5, 5, 5]),
]);

export const shapeIDs = {
  full: 1,
  slab: 2,
  step: 3,
  log: 4,
  fence: 5,
  table: 6,
  wall: 7,
  path: 8,
  window: 9,
  frame: 10,
  slice: 11,
  peg: 12,
  corner: 13,
  knob: 14,
  stool: 16,
  inset: 17,
  outset: 18,
  stub: 19,
  beam: 20,
  track: 21,
  shaft: 22,
  ellBeam: 23,
  ellPeg: 24,
};

const shapeDefs = [
  [shapeIDs.full, "full", l.ToBlockShape(full)],
  [shapeIDs.slab, "slab", l.ToBlockShape(slab)],
  [shapeIDs.step, "step", l.ToBlockShape(step)],
  [shapeIDs.log, "log", l.ToBlockShape(log)],
  [shapeIDs.fence, "fence", l.ToBlockShape(fence)],
  [shapeIDs.table, "table", l.ToBlockShape(table)],
  [shapeIDs.wall, "wall", l.ToBlockShape(wall)],
  [shapeIDs.path, "path", l.ToBlockShape(path)],
  [shapeIDs.window, "window", l.ToBlockShape(window)],
  [shapeIDs.frame, "frame", l.ToBlockShape(frame)],
  [shapeIDs.slice, "slice", l.ToBlockShape(slice)],
  [shapeIDs.peg, "peg", l.ToBlockShape(peg)],
  [shapeIDs.corner, "corner", l.ToBlockShape(corner)],
  [shapeIDs.knob, "knob", l.ToBlockShape(knob)],
  [shapeIDs.stool, "stool", l.ToBlockShape(stool)],
  [shapeIDs.inset, "inset", l.ToBlockShape(inset)],
  [shapeIDs.outset, "outset", l.ToBlockShape(outset)],
  [shapeIDs.stub, "stub", l.ToBlockShape(stub)],
  [shapeIDs.beam, "beam", l.ToBlockShape(beam)],
  [shapeIDs.track, "track", l.ToBlockShape(track)],
  [shapeIDs.shaft, "shaft", l.ToBlockShape(shaft)],
  [shapeIDs.ellBeam, "ellBeam", l.ToBlockShape(ellBeam)],
  [shapeIDs.ellPeg, "ellPeg", l.ToBlockShape(ellPeg)],
] as const;

export const shapeIndex = l.ToBlockShapeIndex(shapeDefs);

export function getAssets(): Record<string, l.Asset> {
  return {
    "indices/shapes": shapeIndex,
    "definitions/shapes": l.ToBlockShapeTable(shapeDefs),
    "definitions/isomorphisms": l.ToBlockIsomorphismTable(shapeIndex),
  };
}
