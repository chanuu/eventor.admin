/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hand-authored Lottie (bodymovin) animation data, themed to the app's palette.
 * Ported from the design system's micro-interaction spec.
 *
 * Built from helpers rather than exported JSON so the shapes stay readable and
 * the palette can be adjusted in one place.
 */

const DGREEN    = [0.106, 0.290, 0.243, 1];
const LIME      = [0.663, 0.796, 0.235, 1];
const LIMELIGHT = [0.925, 0.957, 0.878, 1];
const GRAY      = [0.82, 0.85, 0.87, 1];
const REDLIGHT  = [0.95, 0.85, 0.83, 1];

type Entry = { t: number; v: number | number[] };

function st(v: any) { return { a: 0, k: v }; }

/** Keyframe segment with symmetric easing between entries. */
function seg(entries: Entry[]) {
  const dim = Array.isArray(entries[0].v) ? (entries[0].v as number[]).length : 1;
  const ei = { x: Array(dim).fill(0.4), y: Array(dim).fill(1) };
  const eo = { x: Array(dim).fill(0.4), y: Array(dim).fill(0) };
  return {
    a: 1,
    k: entries.map((e, i) => {
      const s = Array.isArray(e.v) ? e.v : [e.v];
      const k: any = { t: e.t, s };
      if (i < entries.length - 1) {
        const nx = entries[i + 1].v;
        k.e = Array.isArray(nx) ? nx : [nx];
        k.i = ei; k.o = eo;
      }
      return k;
    }),
  };
}

function defTr(overrides?: any) {
  return Object.assign(
    { ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100) },
    overrides,
  );
}
function group(items: any[], trOverrides?: any) { return { ty: 'gr', it: [...items, defTr(trOverrides)] }; }
function fill(c: number[], o?: number) { return { ty: 'fl', c: st(c), o: st(o == null ? 100 : o) }; }
function stroke(c: number[], w: number, o?: number) {
  return { ty: 'st', c: st(c), o: st(o == null ? 100 : o), w: st(w), lc: 2, lj: 2 };
}
function ellipse(p: number[], s: number[]) { return { ty: 'el', p: st(p), s: st(s) }; }
function rect(p: number[], s: number[], r?: number) { return { ty: 'rc', p: st(p), s: st(s), r: st(r || 0) }; }
function path(v: number[][], closed?: boolean) {
  return { ty: 'sh', ks: st({ i: v.map(() => [0, 0]), o: v.map(() => [0, 0]), v, c: !!closed }) };
}
function trim(sProp: any, eProp: any) { return { ty: 'tm', s: sProp, e: eProp, o: st(0), m: 1 }; }
function baseKs(overrides?: any) {
  return Object.assign({ o: st(100), r: st(0), p: st([0, 0]), a: st([0, 0]), s: st([100, 100]) }, overrides || {});
}
function shapeLayer(ind: number, nm: string, ks: any, shapes: any[], ip?: number, op?: number) {
  return { ddd: 0, ind, ty: 4, nm, sr: 1, ks, ao: 0, shapes, ip: ip || 0, op: op || 9999, st: 0, bm: 0 };
}

// ── Empty state (loops) ──────────────────────────────────────────────────────
export const emptyAnim = {
  v: '5.9.0', fr: 30, ip: 0, op: 150, w: 240, h: 240, nm: 'empty', ddd: 0, assets: [],
  layers: [
    shapeLayer(1, 'magnifier', baseKs({
      p: st([174, 74]),
      r: seg([{ t: 0, v: -8 }, { t: 75, v: 8 }, { t: 150, v: -8 }]),
    }), [
      group([ellipse([0, 0], [30, 30]), stroke(DGREEN, 6)]),
      group([rect([0, 0], [20, 5], 2), stroke(DGREEN, 6)], { p: st([18, 18]), r: st(45) }),
    ], 0, 150),
    shapeLayer(2, 'dash3', baseKs({
      p: seg([{ t: 0, v: [118, 150] }, { t: 45, v: [118, 138] }, { t: 105, v: [118, 150] }, { t: 150, v: [118, 150] }]),
    }), [group([rect([0, 0], [24, 6], 3), fill(GRAY, 100)])], 0, 150),
    shapeLayer(3, 'dash2', baseKs({
      p: seg([{ t: 0, v: [142, 134] }, { t: 90, v: [142, 120] }, { t: 150, v: [142, 134] }]),
    }), [group([rect([0, 0], [24, 6], 3), fill(GRAY, 100)])], 0, 150),
    shapeLayer(4, 'dash1', baseKs({
      p: seg([{ t: 0, v: [100, 126] }, { t: 60, v: [100, 112] }, { t: 120, v: [100, 126] }, { t: 150, v: [100, 126] }]),
    }), [group([rect([0, 0], [24, 6], 3), fill(GRAY, 100)])], 0, 150),
    shapeLayer(5, 'box', baseKs({
      p: seg([{ t: 0, v: [120, 132] }, { t: 75, v: [120, 124] }, { t: 150, v: [120, 132] }]),
      r: seg([{ t: 0, v: -2 }, { t: 75, v: 2 }, { t: 150, v: -2 }]),
    }), [group([
      path([[-46, -8], [46, -8], [34, 36], [-34, 36]], true),
      ellipse([0, -8], [92, 16]),
      stroke(DGREEN, 7),
    ])], 0, 150),
    shapeLayer(6, 'bgBlob', baseKs({
      p: st([120, 120]),
      s: seg([{ t: 0, v: [100, 100] }, { t: 75, v: [112, 112] }, { t: 150, v: [100, 100] }]),
    }), [group([ellipse([0, 0], [170, 170]), fill(LIME, 14)])], 0, 150),
  ],
};

// ── Loading / photography (loops) ────────────────────────────────────────────
export const cameraAnim = {
  v: '5.9.0', fr: 30, ip: 0, op: 90, w: 200, h: 200, nm: 'camera-loading', ddd: 0, assets: [],
  layers: [
    shapeLayer(1, 'iris', baseKs({
      p: st([100, 108]),
      s: seg([{ t: 0, v: [100, 100] }, { t: 30, v: [38, 38] }, { t: 60, v: [100, 100] }, { t: 90, v: [100, 100] }]),
      r: seg([{ t: 0, v: 0 }, { t: 90, v: 90 }]),
    }), [group([ellipse([0, 0], [26, 26]), fill(DGREEN, 100)])], 0, 90),
    shapeLayer(2, 'lensRing', baseKs({ p: st([100, 108]) }), [
      group([ellipse([0, 0], [64, 64]), stroke(DGREEN, 7)]),
    ], 0, 90),
    shapeLayer(3, 'body', baseKs({ p: st([100, 100]) }), [group([
      rect([0, 4], [128, 78], 12),
      rect([-30, -32], [46, 16], 4),
      stroke(DGREEN, 7),
    ])], 0, 90),
    shapeLayer(4, 'bgBlob', baseKs({
      p: st([100, 100]),
      s: seg([{ t: 0, v: [100, 100] }, { t: 45, v: [112, 112] }, { t: 90, v: [100, 100] }]),
    }), [group([ellipse([0, 0], [170, 170]), fill(LIME, 14)])], 0, 90),
  ],
};

// ── Success / record created (plays once) ────────────────────────────────────
export const successAnim = {
  v: '5.9.0', fr: 30, ip: 0, op: 60, w: 180, h: 180, nm: 'success', ddd: 0, assets: [],
  layers: [
    shapeLayer(1, 'checkmark', baseKs({ p: st([90, 90]) }), [group([
      path([[-24, 2], [-7, 20], [26, -18]], false),
      stroke(DGREEN, 11),
      trim(st(0), seg([{ t: 16, v: 0 }, { t: 34, v: 100 }])),
    ])], 0, 60),
    shapeLayer(2, 'circleBg', baseKs({
      p: st([90, 90]),
      s: seg([{ t: 0, v: [0, 0] }, { t: 14, v: [112, 112] }, { t: 22, v: [100, 100] }]),
    }), [group([ellipse([0, 0], [110, 110]), fill(LIMELIGHT, 100)])], 0, 60),
  ],
};

// ── Delete / record deleted (plays once) ─────────────────────────────────────
export const deleteAnim = {
  v: '5.9.0', fr: 30, ip: 0, op: 75, w: 180, h: 180, nm: 'delete', ddd: 0, assets: [],
  layers: [
    shapeLayer(1, 'lid', baseKs({
      p: st([64, 66]), a: st([0, 0]),
      r: seg([{ t: 0, v: 0 }, { t: 16, v: -35 }, { t: 50, v: -35 }, { t: 65, v: 0 }]),
    }), [
      group([rect([26, 0], [62, 9], 3), fill(DGREEN, 100)]),
      group([rect([26, -8], [20, 5], 2), fill(DGREEN, 100)]),
    ], 0, 75),
    shapeLayer(2, 'can', baseKs({
      p: st([90, 100]),
      r: seg([{ t: 0, v: 0 }, { t: 28, v: 0 }, { t: 33, v: -8 }, { t: 38, v: 8 }, { t: 43, v: -6 }, { t: 48, v: 6 }, { t: 53, v: 0 }, { t: 75, v: 0 }]),
    }), [
      group([rect([0, 10], [52, 54], 8), fill(DGREEN, 100)]),
      group([rect([-12, 10], [3, 30], 1), fill(LIMELIGHT, 90)]),
      group([rect([0, 10], [3, 30], 1), fill(LIMELIGHT, 90)]),
      group([rect([12, 10], [3, 30], 1), fill(LIMELIGHT, 90)]),
    ], 0, 75),
    shapeLayer(3, 'bgCircle', baseKs({
      p: st([90, 90]),
      o: seg([{ t: 0, v: 0 }, { t: 10, v: 100 }]),
    }), [group([ellipse([0, 0], [110, 110]), fill(REDLIGHT, 100)])], 0, 75),
  ],
};

export const ANIMATIONS = {
  empty: emptyAnim,
  loading: cameraAnim,
  success: successAnim,
  delete: deleteAnim,
} as const;

export type AnimationKind = keyof typeof ANIMATIONS;
