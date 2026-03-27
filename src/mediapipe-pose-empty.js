/**
 * @mediapipe/pose is published as a global-script bundle without ESM exports,
 * which breaks Vite/Rolldown. This app only uses MoveNet; BlazePose+MediaPipe
 * is not loaded at runtime.
 */
export class Pose {}
