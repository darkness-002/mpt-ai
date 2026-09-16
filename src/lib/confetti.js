// Lightweight canvas confetti burst effect

export function fireConfetti(durationMs = 2500) {
  if (typeof window === 'undefined') return

  const canvas = document.createElement('canvas')
  canvas.style.position = 'fixed'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100vw'
  canvas.style.height = '100vh'
  canvas.style.pointerEvents = 'none'
  canvas.style.zIndex = '99999'
  document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    canvas.remove()
    return
  }

  const resize = () => {
    canvas.width = window.innerWidth * window.devicePixelRatio
    canvas.height = window.innerHeight * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
  }
  resize()

  const colors = ['#58cc02', '#1cb0f6', '#ffc800', '#ff4b4b', '#a855f7', '#ec4899']
  const count = 75
  const particles = []

  for (let i = 0; i < count; i++) {
    particles.push({
      x: window.innerWidth / 2,
      y: window.innerHeight * 0.4,
      w: Math.random() * 8 + 6,
      h: Math.random() * 6 + 4,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.7) * 18,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      color: colors[Math.floor(Math.random() * colors.length)],
      gravity: 0.35,
      opacity: 1,
    })
  }

  const start = performance.now()

  function frame(now) {
    const elapsed = now - start
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    let alive = 0
    particles.forEach((p) => {
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.vx *= 0.98
      p.rotation += p.vRot
      p.opacity = Math.max(0, 1 - elapsed / durationMs)

      if (p.opacity > 0 && p.y < window.innerHeight + 50) {
        alive++
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.globalAlpha = p.opacity
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      }
    })

    if (elapsed < durationMs && alive > 0) {
      requestAnimationFrame(frame)
    } else {
      canvas.remove()
    }
  }

  requestAnimationFrame(frame)
}
