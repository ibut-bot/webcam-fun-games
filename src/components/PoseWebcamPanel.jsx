import { useEffect, useRef, useState } from 'react'
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import * as poseDetection from '@tensorflow-models/pose-detection'
import { playFlapSound } from '../gameAudio.js'

const MIN_CONFIDENCE = 0.3
const FLAP_COOLDOWN_MS = 300
const WRIST_ABOVE_SHOULDER = -0.04
const WRIST_BELOW_SHOULDER = 0.08
const FLAP_ARM_MIN = 0.25

const CLAP_DISTANCE = 0.12
const CLAP_COOLDOWN_MS = 800
const CLAP_MIN_SCORE = 0.5

export default function PoseWebcamPanel({
  enabled,
  flapQueueRef,
  handPositionsRef,
  onClap,
  onError,
  onModelReady,
  statusHint,
}) {
  const panelRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const onClapRef = useRef(onClap)
  const [status, setStatus] = useState('')

  useEffect(() => {
    onClapRef.current = onClap
  }, [onClap])

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let animationId = 0
    let detector = null
    let stream = null

    let lastFlapTime = 0
    let armsWereUp = false
    let lastUpWristY = null
    let lastClapTime = 0
    let handsWereApart = true

    function checkClapNorm(leftWrist, rightWrist) {
      const cb = onClapRef.current
      if (!cb) return
      const lv = leftWrist && (leftWrist.score ?? 0) > CLAP_MIN_SCORE
      const rv = rightWrist && (rightWrist.score ?? 0) > CLAP_MIN_SCORE
      if (!lv || !rv) {
        handsWereApart = true
        return
      }
      const dx = rightWrist.x - leftWrist.x
      const dy = rightWrist.y - leftWrist.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > CLAP_DISTANCE * 1.5) {
        handsWereApart = true
      } else if (dist <= CLAP_DISTANCE && handsWereApart) {
        const now = Date.now()
        if (now - lastClapTime >= CLAP_COOLDOWN_MS) {
          lastClapTime = now
          handsWereApart = false
          cb()
        }
      }
    }

    function armTipY(norm, leftSide) {
      const wi = leftSide ? 9 : 10
      const ei = leftSide ? 7 : 8
      const w = norm[wi]
      const e = norm[ei]
      if (w && (w.score ?? 0) >= FLAP_ARM_MIN) return { y: w.y, ok: true }
      if (e && (e.score ?? 0) >= FLAP_ARM_MIN) return { y: e.y, ok: true }
      return { y: null, ok: false }
    }

    function checkFlapNorm(landmarksNorm) {
      if (!flapQueueRef) return
      const now = Date.now()
      if (now - lastFlapTime < FLAP_COOLDOWN_MS) return

      const leftShoulder = landmarksNorm[5]
      const rightShoulder = landmarksNorm[6]
      if (!leftShoulder || !rightShoulder) return
      const shoulderY = (leftShoulder.y + rightShoulder.y) / 2

      const leftArm = armTipY(landmarksNorm, true)
      const rightArm = armTipY(landmarksNorm, false)
      if (!leftArm.ok && !rightArm.ok) return

      const leftAbove = leftArm.ok && leftArm.y < shoulderY + WRIST_ABOVE_SHOULDER
      const rightAbove = rightArm.ok && rightArm.y < shoulderY + WRIST_ABOVE_SHOULDER
      const leftBelow = leftArm.ok && leftArm.y > shoulderY + WRIST_BELOW_SHOULDER
      const rightBelow = rightArm.ok && rightArm.y > shoulderY + WRIST_BELOW_SHOULDER
      const anyAbove = leftAbove || rightAbove
      const bothBelow =
        (!leftArm.ok || leftBelow) && (!rightArm.ok || rightBelow)

      if (anyAbove && !armsWereUp) {
        armsWereUp = true
      }
      if (armsWereUp && bothBelow) {
        lastFlapTime = now
        flapQueueRef.current += 1
        void playFlapSound()
        armsWereUp = false
      }
      if (bothBelow) {
        armsWereUp = false
      }
    }

    async function start() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

      try {
        setStatus('Starting camera…')
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        video.srcObject = stream
        await video.play()

        setStatus('Loading pose model…')
        await tf.ready()
        await tf.setBackend('webgl')
        detector = await poseDetection.createDetector(
          poseDetection.SupportedModels.MoveNet,
          { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING },
        )
        if (cancelled) {
          detector.dispose()
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        onModelReady?.()
        setStatus(statusHint || 'Raise arms up, then down to flap · Clap hands to restart after game over')

        const connections = poseDetection.util.getAdjacentPairs(
          poseDetection.SupportedModels.MoveNet,
        )

        function resizeCanvas() {
          const vw = video.videoWidth
          const vh = video.videoHeight
          if (!vw || !vh) return
          const panel = panelRef.current
          if (!panel) return
          const { width: pw, height: ph } = panel.getBoundingClientRect()
          const scale = Math.min(pw / vw, ph / vh)
          canvas.width = Math.floor(vw * scale)
          canvas.height = Math.floor(vh * scale)
        }

        let inferring = false

        const cocoNames = [
          'nose',
          'left_eye',
          'right_eye',
          'left_ear',
          'right_ear',
          'left_shoulder',
          'right_shoulder',
          'left_elbow',
          'right_elbow',
          'left_wrist',
          'right_wrist',
          'left_hip',
          'right_hip',
          'left_knee',
          'right_knee',
          'left_ankle',
          'right_ankle',
        ]

        function tick() {
          if (cancelled) return
          animationId = requestAnimationFrame(tick)

          if (video.readyState < 2) return
          resizeCanvas()

          const ctx = canvas.getContext('2d')
          if (!ctx || canvas.width < 10) return

          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

          if (inferring) return
          inferring = true

          detector
            .estimatePoses(video, { flipHorizontal: false })
            .then((poses) => {
              inferring = false
              if (cancelled) return

              const pose = poses?.[0]
              if (!pose?.keypoints?.length) {
                armsWereUp = false
                lastUpWristY = null
                handsWereApart = true
                return
              }

              const kps = pose.keypoints
              const scaleX = canvas.width / video.videoWidth
              const scaleY = canvas.height / video.videoHeight
              const invW = 1 / video.videoWidth
              const invH = 1 / video.videoHeight

              ctx.strokeStyle = '#00ff88'
              ctx.lineWidth = 3
              for (const [i, j] of connections) {
                const a = kps[i]
                const b = kps[j]
                if (
                  (a.score ?? 0) < MIN_CONFIDENCE ||
                  (b.score ?? 0) < MIN_CONFIDENCE
                )
                  continue
                ctx.beginPath()
                ctx.moveTo(a.x * scaleX, a.y * scaleY)
                ctx.lineTo(b.x * scaleX, b.y * scaleY)
                ctx.stroke()
              }
              ctx.fillStyle = '#00ff88'
              for (const k of kps) {
                if ((k.score ?? 0) < MIN_CONFIDENCE) continue
                ctx.beginPath()
                ctx.arc(k.x * scaleX, k.y * scaleY, 4, 0, Math.PI * 2)
                ctx.fill()
              }

              const byName = (name) => {
                const p = kps.find((k) => k.name === name)
                return p && (p.score ?? 0) >= MIN_CONFIDENCE ? p : null
              }

              const normFlap = cocoNames.map((name) => {
                const p = kps.find((k) => k.name === name)
                if (p && (p.score ?? 0) >= FLAP_ARM_MIN) {
                  return { x: p.x * invW, y: p.y * invH, score: p.score }
                }
                return null
              })

              checkFlapNorm(normFlap)

              const lw = byName('left_wrist')
              const rw = byName('right_wrist')
              if (lw && rw) {
                checkClapNorm(
                  { x: lw.x * invW, y: lw.y * invH, score: lw.score },
                  { x: rw.x * invW, y: rw.y * invH, score: rw.score },
                )
              } else {
                handsWereApart = true
              }

              if (handPositionsRef) {
                handPositionsRef.current = {
                  left: lw
                    ? { x: lw.x * invW, y: lw.y * invH, confidence: lw.score ?? 0 }
                    : null,
                  right: rw
                    ? { x: rw.x * invW, y: rw.y * invH, confidence: rw.score ?? 0 }
                    : null,
                }
              }
            })
            .catch(() => {
              inferring = false
            })
        }

        animationId = requestAnimationFrame(tick)
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'Camera or model error'
          onError?.(msg)
          setStatus(msg)
        }
      }
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(animationId)
      detector?.dispose()
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [enabled, flapQueueRef, handPositionsRef, onError, onModelReady, statusHint])

  return (
    <div ref={panelRef} className="pose-panel">
      <video ref={videoRef} className="pose-video" playsInline muted />
      <div className="pose-canvas-wrap">
        <canvas ref={canvasRef} className="pose-canvas" />
      </div>
      {enabled && status && <p className="pose-hint">{status}</p>}
    </div>
  )
}
