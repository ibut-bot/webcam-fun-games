// COCO 17-keypoint indices:
// 0:nose 1:left_eye 2:right_eye 3:left_ear 4:right_ear
// 5:left_shoulder 6:right_shoulder 7:left_elbow 8:right_elbow
// 9:left_wrist 10:right_wrist 11:left_hip 12:right_hip
// 13:left_knee 14:right_knee 15:left_ankle 16:right_ankle
//
// Body-centric normalized coordinates:
//   Origin = hip midpoint
//   Scale  = torso length (hip midpoint → shoulder midpoint = 1.0)
//   X+     = person's left (camera-image right)
//   Y+     = down

export const SKELETON = [
  [5, 7], [7, 9],
  [6, 8], [8, 10],
  [5, 6], [11, 12],
  [5, 11], [6, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
]

export const LIMB_SEGMENTS = [
  { from: 5, to: 7 },
  { from: 7, to: 9 },
  { from: 6, to: 8 },
  { from: 8, to: 10 },
  { from: 11, to: 13 },
  { from: 13, to: 15 },
  { from: 12, to: 14 },
  { from: 14, to: 16 },
]

const SH = { 5: { x: 0.45, y: -1 }, 6: { x: -0.45, y: -1 } }

const LEGS = {
  11: { x: 0.35, y: 0 }, 12: { x: -0.35, y: 0 },
  13: { x: 0.35, y: 1.0 }, 14: { x: -0.35, y: 1.0 },
  15: { x: 0.35, y: 2.0 }, 16: { x: -0.35, y: 2.0 },
}

const WIDE_LEGS = {
  11: { x: 0.55, y: 0 }, 12: { x: -0.55, y: 0 },
  13: { x: 0.8, y: 1.0 }, 14: { x: -0.8, y: 1.0 },
  15: { x: 1.0, y: 2.0 }, 16: { x: -1.0, y: 2.0 },
}

const ARMS_AT_SIDES = {
  7: { x: 0.45, y: -0.3 }, 8: { x: -0.45, y: -0.3 },
  9: { x: 0.45, y: 0.3 }, 10: { x: -0.45, y: 0.3 },
}

export const POSES = {
  tPose: {
    name: 'T-Pose',
    joints: { ...SH, 7: { x: 1.2, y: -1 }, 8: { x: -1.2, y: -1 }, 9: { x: 1.8, y: -1 }, 10: { x: -1.8, y: -1 }, ...LEGS },
  },
  armsUp: {
    name: 'Arms Up',
    joints: { ...SH, 7: { x: 0.5, y: -1.7 }, 8: { x: -0.5, y: -1.7 }, 9: { x: 0.5, y: -2.3 }, 10: { x: -0.5, y: -2.3 }, ...LEGS },
  },
  victory: {
    name: 'Victory V',
    joints: { ...SH, 7: { x: 0.85, y: -1.55 }, 8: { x: -0.85, y: -1.55 }, 9: { x: 1.2, y: -2.1 }, 10: { x: -1.2, y: -2.1 }, ...LEGS },
  },
  discoRight: {
    name: 'Disco Right',
    joints: { ...SH, 7: { x: 0.45, y: -0.3 }, 8: { x: -1.0, y: -1.6 }, 9: { x: 0.45, y: 0.3 }, 10: { x: -1.4, y: -2.1 }, ...LEGS },
  },
  discoLeft: {
    name: 'Disco Left',
    joints: { ...SH, 7: { x: 1.0, y: -1.6 }, 8: { x: -0.45, y: -0.3 }, 9: { x: 1.4, y: -2.1 }, 10: { x: -0.45, y: 0.3 }, ...LEGS },
  },
  rightPoint: {
    name: 'Point Right',
    joints: { ...SH, 7: { x: 0.45, y: -0.3 }, 8: { x: -1.2, y: -1 }, 9: { x: 0.45, y: 0.3 }, 10: { x: -1.8, y: -1 }, ...LEGS },
  },
  leftPoint: {
    name: 'Point Left',
    joints: { ...SH, 7: { x: 1.2, y: -1 }, 8: { x: -0.45, y: -0.3 }, 9: { x: 1.8, y: -1 }, 10: { x: -0.45, y: 0.3 }, ...LEGS },
  },
  starJump: {
    name: 'Star Jump',
    joints: { ...SH, 7: { x: 0.85, y: -1.55 }, 8: { x: -0.85, y: -1.55 }, 9: { x: 1.2, y: -2.1 }, 10: { x: -1.2, y: -2.1 }, ...WIDE_LEGS },
  },

  // Macarena-style: hands forward at shoulder height, elbows bent 90°
  macarenaOut: {
    name: 'Macarena Out',
    joints: { ...SH, 7: { x: 0.9, y: -1.3 }, 8: { x: -0.9, y: -1.3 }, 9: { x: 0.9, y: -1.8 }, 10: { x: -0.9, y: -1.8 }, ...LEGS },
  },
  // Macarena cross: arms crossed over chest
  macarenaCross: {
    name: 'Macarena Cross',
    joints: { ...SH, 7: { x: 0.1, y: -0.8 }, 8: { x: -0.1, y: -0.8 }, 9: { x: -0.35, y: -1.1 }, 10: { x: 0.35, y: -1.1 }, ...LEGS },
  },
  // Macarena hips: hands on hips, elbows flared out
  macarenaHips: {
    name: 'Hands on Hips',
    joints: { ...SH, 7: { x: 0.9, y: -0.5 }, 8: { x: -0.9, y: -0.5 }, 9: { x: 0.5, y: -0.1 }, 10: { x: -0.5, y: -0.1 }, ...LEGS },
  },

  // YMCA-style letters
  ymcaY: {
    name: 'YMCA — Y',
    joints: { ...SH, 7: { x: 0.85, y: -1.55 }, 8: { x: -0.85, y: -1.55 }, 9: { x: 1.2, y: -2.1 }, 10: { x: -1.2, y: -2.1 }, ...LEGS },
  },
  ymcaM: {
    name: 'YMCA — M',
    joints: { ...SH, 7: { x: 0.5, y: -1.7 }, 8: { x: -0.5, y: -1.7 }, 9: { x: 0.2, y: -1.3 }, 10: { x: -0.2, y: -1.3 }, ...LEGS },
  },
  ymcaC: {
    name: 'YMCA — C',
    joints: { ...SH, 7: { x: 1.0, y: -1.5 }, 8: { x: -0.45, y: -0.3 }, 9: { x: 1.0, y: -0.7 }, 10: { x: -0.45, y: 0.3 }, ...LEGS },
  },
  ymcaA: {
    name: 'YMCA — A',
    joints: { ...SH, 7: { x: 0.5, y: -1.7 }, 8: { x: -0.5, y: -1.7 }, 9: { x: 0.1, y: -1.4 }, 10: { x: -0.1, y: -1.4 }, ...LEGS },
  },

  // Dab: one arm extended, other bent across face
  dabRight: {
    name: 'Dab Right',
    joints: { ...SH, 7: { x: 0.3, y: -1.5 }, 8: { x: -1.2, y: -1.4 }, 9: { x: -0.1, y: -1.3 }, 10: { x: -1.8, y: -1.8 }, ...LEGS },
  },
  dabLeft: {
    name: 'Dab Left',
    joints: { ...SH, 7: { x: 1.2, y: -1.4 }, 8: { x: -0.3, y: -1.5 }, 9: { x: 1.8, y: -1.8 }, 10: { x: 0.1, y: -1.3 }, ...LEGS },
  },

  // Chicken wings: elbows out, hands touching shoulders
  chickenWings: {
    name: 'Chicken Wings',
    joints: { ...SH, 7: { x: 1.0, y: -0.7 }, 8: { x: -1.0, y: -0.7 }, 9: { x: 0.5, y: -1.0 }, 10: { x: -0.5, y: -1.0 }, ...LEGS },
  },

  // Muscle flex: bicep curl, elbows at shoulder height
  muscleFlex: {
    name: 'Muscle Flex',
    joints: { ...SH, 7: { x: 1.1, y: -1 }, 8: { x: -1.1, y: -1 }, 9: { x: 1.1, y: -1.7 }, 10: { x: -1.1, y: -1.7 }, ...LEGS },
  },

  // Lunge right: right leg forward, arms up
  lungeRight: {
    name: 'Lunge Right',
    joints: {
      ...SH, 7: { x: 0.5, y: -1.7 }, 8: { x: -0.5, y: -1.7 }, 9: { x: 0.5, y: -2.3 }, 10: { x: -0.5, y: -2.3 },
      11: { x: 0.35, y: 0 }, 12: { x: -0.35, y: 0 },
      13: { x: -0.7, y: 0.8 }, 14: { x: 0.3, y: 1.0 },
      15: { x: -0.7, y: 1.8 }, 16: { x: 0.3, y: 2.0 },
    },
  },

  // Lunge left
  lungeLeft: {
    name: 'Lunge Left',
    joints: {
      ...SH, 7: { x: 0.5, y: -1.7 }, 8: { x: -0.5, y: -1.7 }, 9: { x: 0.5, y: -2.3 }, 10: { x: -0.5, y: -2.3 },
      11: { x: 0.35, y: 0 }, 12: { x: -0.35, y: 0 },
      13: { x: -0.3, y: 1.0 }, 14: { x: 0.7, y: 0.8 },
      15: { x: -0.3, y: 2.0 }, 16: { x: 0.7, y: 1.8 },
    },
  },

  /* ── Space Adventure poses ────────────────────────── */

  rocketPose: {
    name: 'Rocket Pose',
    joints: {
      ...SH, 7: { x: 0.08, y: -1.88 }, 8: { x: -0.08, y: -1.88 }, 9: { x: 0.06, y: -2.52 }, 10: { x: -0.06, y: -2.52 },
      ...LEGS,
    },
  },
  meteorMissile: {
    name: 'Meteor Missile',
    joints: {
      ...SH, 7: { x: 0.45, y: -0.55 }, 8: { x: -0.55, y: -1.25 }, 9: { x: 0.85, y: -0.15 }, 10: { x: -1.65, y: -1.55 },
      ...LEGS,
    },
  },
  meteorStrike: {
    name: 'Meteor Strike',
    joints: {
      ...SH, 7: { x: 0.55, y: -1.25 }, 8: { x: -0.45, y: -0.55 }, 9: { x: 1.65, y: -1.55 }, 10: { x: -0.85, y: -0.15 },
      ...LEGS,
    },
  },
  satelliteArms: {
    name: 'Satellite Array',
    joints: { ...SH, 7: { x: 1.2, y: -1 }, 8: { x: -1.2, y: -1 }, 9: { x: 1.8, y: -1 }, 10: { x: -1.8, y: -1 }, ...LEGS },
  },
  orbitStride: {
    name: 'Orbit Stride',
    joints: {
      ...SH, 7: { x: 1.05, y: -1.3 }, 8: { x: -1.05, y: -1.3 }, 9: { x: 1.35, y: -1.65 }, 10: { x: -1.35, y: -1.65 },
      ...WIDE_LEGS,
    },
  },
  tractorBeamUp: {
    name: 'Tractor Beam',
    joints: {
      ...SH, 7: { x: 0.4, y: -1.65 }, 8: { x: -1.05, y: -1.05 }, 9: { x: 0.45, y: -2.28 }, 10: { x: -1.35, y: -1.15 },
      ...LEGS,
    },
  },
  cometTail: {
    name: 'Comet Tail',
    joints: {
      ...SH, 7: { x: -1.05, y: -1.45 }, 8: { x: 0.85, y: -1.28 }, 9: { x: -1.55, y: -2.05 }, 10: { x: 1.25, y: -1.75 },
      ...LEGS,
    },
  },
  lunarDock: {
    name: 'Lunar Dock',
    joints: {
      ...SH, 7: { x: 0.65, y: -1.05 }, 8: { x: -0.65, y: -1.05 }, 9: { x: 0.25, y: -1.55 }, 10: { x: -0.25, y: -1.55 },
      11: { x: 0.48, y: 0 }, 12: { x: -0.48, y: 0 },
      13: { x: 0.88, y: 0.92 }, 14: { x: -0.88, y: 0.92 },
      15: { x: 1.02, y: 1.92 }, 16: { x: -1.02, y: 1.92 },
    },
  },
  hyperdriveBoost: {
    name: 'Hyperdrive Boost',
    joints: { ...SH, 7: { x: 0.85, y: -1.55 }, 8: { x: -0.85, y: -1.55 }, 9: { x: 1.2, y: -2.1 }, 10: { x: -1.2, y: -2.1 }, ...LEGS },
  },
  asteroidBelt: {
    name: 'Asteroid Belt',
    joints: { ...SH, 7: { x: 1.0, y: -0.7 }, 8: { x: -1.0, y: -0.7 }, 9: { x: 0.5, y: -1.0 }, 10: { x: -0.5, y: -1.0 }, ...LEGS },
  },
  supernova: {
    name: 'Supernova',
    joints: { ...SH, 7: { x: 0.85, y: -1.55 }, 8: { x: -0.85, y: -1.55 }, 9: { x: 1.2, y: -2.1 }, 10: { x: -1.2, y: -2.1 }, ...WIDE_LEGS },
  },
  wormholeGate: {
    name: 'Wormhole Gate',
    joints: { ...SH, 7: { x: 0.1, y: -0.82 }, 8: { x: -0.1, y: -0.82 }, 9: { x: -0.32, y: -1.12 }, 10: { x: 0.32, y: -1.12 }, ...LEGS },
  },
}

export const SONGS = [
  {
    id: 'disco',
    name: 'Disco Fever',
    bpm: 120,
    duration: 64,
    choreography: [
      { beat: 0, pose: 'tPose' },
      { beat: 4, pose: 'macarenaOut' },
      { beat: 8, pose: 'macarenaCross' },
      { beat: 12, pose: 'macarenaHips' },
      { beat: 16, pose: 'discoRight' },
      { beat: 20, pose: 'discoLeft' },
      { beat: 24, pose: 'ymcaY' },
      { beat: 28, pose: 'ymcaM' },
      { beat: 32, pose: 'ymcaC' },
      { beat: 36, pose: 'ymcaA' },
      { beat: 40, pose: 'muscleFlex' },
      { beat: 44, pose: 'dabRight' },
      { beat: 48, pose: 'dabLeft' },
      { beat: 52, pose: 'chickenWings' },
      { beat: 56, pose: 'starJump' },
      { beat: 60, pose: 'victory' },
      { beat: 64, pose: 'macarenaOut' },
      { beat: 68, pose: 'macarenaCross' },
      { beat: 72, pose: 'macarenaHips' },
      { beat: 76, pose: 'tPose' },
      { beat: 80, pose: 'discoRight' },
      { beat: 84, pose: 'discoLeft' },
      { beat: 88, pose: 'rightPoint' },
      { beat: 92, pose: 'leftPoint' },
      { beat: 96, pose: 'lungeRight' },
      { beat: 100, pose: 'lungeLeft' },
      { beat: 104, pose: 'armsUp' },
      { beat: 108, pose: 'starJump' },
      { beat: 112, pose: 'ymcaY' },
      { beat: 116, pose: 'ymcaM' },
      { beat: 120, pose: 'ymcaC' },
      { beat: 124, pose: 'ymcaA' },
    ],
  },
  {
    id: 'chill',
    name: 'Chill Groove',
    bpm: 100,
    duration: 60,
    choreography: [
      { beat: 0, pose: 'armsUp' },
      { beat: 6, pose: 'macarenaOut' },
      { beat: 12, pose: 'macarenaCross' },
      { beat: 18, pose: 'macarenaHips' },
      { beat: 24, pose: 'chickenWings' },
      { beat: 30, pose: 'starJump' },
      { beat: 36, pose: 'dabRight' },
      { beat: 42, pose: 'dabLeft' },
      { beat: 48, pose: 'muscleFlex' },
      { beat: 54, pose: 'ymcaY' },
      { beat: 60, pose: 'ymcaM' },
      { beat: 66, pose: 'ymcaC' },
      { beat: 72, pose: 'ymcaA' },
      { beat: 78, pose: 'lungeRight' },
      { beat: 84, pose: 'lungeLeft' },
      { beat: 90, pose: 'victory' },
      { beat: 96, pose: 'tPose' },
    ],
  },
  {
    id: 'space',
    name: 'Space Adventure',
    bpm: 118,
    duration: 62,
    choreography: [
      { beat: 0, pose: 'rocketPose' },
      { beat: 4, pose: 'satelliteArms' },
      { beat: 8, pose: 'meteorMissile' },
      { beat: 12, pose: 'meteorStrike' },
      { beat: 16, pose: 'orbitStride' },
      { beat: 20, pose: 'tractorBeamUp' },
      { beat: 24, pose: 'cometTail' },
      { beat: 28, pose: 'lunarDock' },
      { beat: 32, pose: 'wormholeGate' },
      { beat: 36, pose: 'hyperdriveBoost' },
      { beat: 40, pose: 'asteroidBelt' },
      { beat: 44, pose: 'supernova' },
      { beat: 48, pose: 'rocketPose' },
      { beat: 52, pose: 'meteorMissile' },
      { beat: 56, pose: 'meteorStrike' },
      { beat: 60, pose: 'satelliteArms' },
      { beat: 64, pose: 'tractorBeamUp' },
      { beat: 68, pose: 'orbitStride' },
      { beat: 72, pose: 'lunarDock' },
      { beat: 76, pose: 'cometTail' },
      { beat: 80, pose: 'hyperdriveBoost' },
      { beat: 84, pose: 'asteroidBelt' },
      { beat: 88, pose: 'supernova' },
      { beat: 92, pose: 'wormholeGate' },
      { beat: 96, pose: 'rocketPose' },
      { beat: 100, pose: 'meteorMissile' },
      { beat: 104, pose: 'meteorStrike' },
      { beat: 108, pose: 'tractorBeamUp' },
      { beat: 112, pose: 'satelliteArms' },
      { beat: 116, pose: 'orbitStride' },
      { beat: 120, pose: 'hyperdriveBoost' },
      { beat: 124, pose: 'rocketPose' },
    ],
  },
]
