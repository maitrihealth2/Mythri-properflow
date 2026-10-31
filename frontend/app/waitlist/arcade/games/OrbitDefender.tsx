'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { CommonGameProps } from '../types'
import { sounds } from '../sound'
import { Trophy, Shield, RotateCcw, Play, Pause } from 'lucide-react'

interface Asteroid {
  x: number
  y: number
  radius: number
  vx: number
  vy: number
  rotation: number
  vRot: number
}

interface Stardust {
  x: number
  y: number
  radius: number
  vy: number
  pulse: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  color: string
}

export function OrbitDefender({ onGameOver, onScoreUpdate, isPaused, soundEnabled }: CommonGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const [score, setScore] = useState<number>(0)
  const [shields, setShields] = useState<number>(3)
  const [isPlaying, setIsPlaying] = useState<boolean>(true)
  const [gameOver, setGameOver] = useState<boolean>(false)

  // Player position
  const playerRef = useRef({
    x: 160,
    y: 280,
    radius: 16,
    targetX: 160,
    targetY: 280,
  })

  // Game entities
  const asteroidsRef = useRef<Asteroid[]>([])
  const stardustRef = useRef<Stardust[]>([])
  const particlesRef = useRef<Particle[]>([])

  const animFrameRef = useRef<number | null>(null)
  const lastSpawnRef = useRef<number>(0)
  const lastStarSpawnRef = useRef<number>(0)
  const scoreRef = useRef<number>(0)
  const shieldsRef = useRef<number>(3)

  const startNewGame = useCallback(() => {
    setScore(0)
    scoreRef.current = 0
    setShields(3)
    shieldsRef.current = 3
    setGameOver(false)
    setIsPlaying(true)

    playerRef.current = {
      x: 160,
      y: 280,
      radius: 16,
      targetX: 160,
      targetY: 280,
    }

    asteroidsRef.current = []
    stardustRef.current = []
    particlesRef.current = []
    onScoreUpdate?.(0)
  }, [onScoreUpdate])

  // Spawn Asteroid
  const spawnAsteroid = (width: number) => {
    const radius = Math.random() * 12 + 10
    const x = Math.random() * (width - radius * 2) + radius
    const y = -radius
    const speed = Math.random() * 1.5 + 1.2 + Math.min(scoreRef.current / 400, 3)
    const angle = (Math.random() - 0.5) * 0.4
    asteroidsRef.current.push({
      x,
      y,
      radius,
      vx: Math.sin(angle) * speed,
      vy: Math.cos(angle) * speed,
      rotation: 0,
      vRot: (Math.random() - 0.5) * 0.05,
    })
  }

  // Spawn Stardust
  const spawnStardust = (width: number) => {
    const x = Math.random() * (width - 40) + 20
    stardustRef.current.push({
      x,
      y: -15,
      radius: 8,
      vy: Math.random() * 1.2 + 1.0,
      pulse: 0,
    })
  }

  // Create explosion particles
  const addExplosion = (x: number, y: number, color: string) => {
    for (let i = 0; i < 16; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 3 + 1
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: Math.random() * 20 + 20,
        color,
      })
    }
  }

  // Game Loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      if (!isPaused && isPlaying && !gameOver) {
        const width = canvas.width
        const height = canvas.height

        // 1. Spawning
        if (now - lastSpawnRef.current > Math.max(500, 1400 - scoreRef.current * 2)) {
          spawnAsteroid(width)
          lastSpawnRef.current = now
        }
        if (now - lastStarSpawnRef.current > 2200) {
          spawnStardust(width)
          lastStarSpawnRef.current = now
        }

        // 2. Smooth player interpolation
        const player = playerRef.current
        player.x += (player.targetX - player.x) * 0.2
        player.y += (player.targetY - player.y) * 0.2
        player.x = Math.max(player.radius, Math.min(width - player.radius, player.x))
        player.y = Math.max(player.radius, Math.min(height - player.radius, player.y))

        // 3. Update & render Asteroids
        ctx.clearRect(0, 0, width, height)

        // Draw faint sanctuary starfield
        ctx.fillStyle = '#29211B'
        ctx.fillRect(0, 0, width, height)

        ctx.fillStyle = 'rgba(255, 252, 247, 0.2)'
        for (let i = 0; i < 20; i++) {
          const sx = (i * 47) % width
          const sy = ((i * 73 + now * 0.02) % height)
          ctx.fillRect(sx, sy, 1.5, 1.5)
        }

        // Update Asteroids
        for (let i = asteroidsRef.current.length - 1; i >= 0; i--) {
          const ast = asteroidsRef.current[i]
          ast.x += ast.vx
          ast.y += ast.vy
          ast.rotation += ast.vRot

          // Draw asteroid
          ctx.save()
          ctx.translate(ast.x, ast.y)
          ctx.rotate(ast.rotation)
          ctx.fillStyle = '#8C7355'
          ctx.strokeStyle = '#DFD3C4'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(0, 0, ast.radius, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
          ctx.restore()

          // Check collision with player
          const dist = Math.hypot(ast.x - player.x, ast.y - player.y)
          if (dist < ast.radius + player.radius) {
            // Collision!
            addExplosion(player.x, player.y, '#F87171')
            if (soundEnabled) sounds.playExplosion()

            shieldsRef.current -= 1
            setShields(shieldsRef.current)
            asteroidsRef.current.splice(i, 1)

            if (shieldsRef.current <= 0) {
              setGameOver(true)
              onGameOver({
                gameId: 'orbit-defender',
                score: scoreRef.current,
                summary: `Surviving deep orbit! Final Score: ${scoreRef.current}`,
                isWin: scoreRef.current >= 400,
                metrics: {
                  'Score': scoreRef.current,
                  'Debris Evaded': Math.floor(scoreRef.current / 15),
                  'Rank': scoreRef.current > 600 ? 'Orb Master' : 'Cosmic Scout',
                },
              })
            }
            continue
          }

          // Offscreen
          if (ast.y > height + 40) {
            asteroidsRef.current.splice(i, 1)
            scoreRef.current += 10
            setScore(scoreRef.current)
            onScoreUpdate?.(scoreRef.current)
          }
        }

        // Update Stardust
        for (let i = stardustRef.current.length - 1; i >= 0; i--) {
          const star = stardustRef.current[i]
          star.y += star.vy
          star.pulse += 0.1

          // Draw radiant stardust
          const glow = Math.sin(star.pulse) * 3 + 8
          ctx.fillStyle = '#F59E0B'
          ctx.shadowColor = '#FDE68A'
          ctx.shadowBlur = 10
          ctx.beginPath()
          ctx.arc(star.x, star.y, glow, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0

          // Check pickup
          const dist = Math.hypot(star.x - player.x, star.y - player.y)
          if (dist < star.radius + player.radius) {
            addExplosion(star.x, star.y, '#FBBF24')
            if (soundEnabled) sounds.playLaser()
            scoreRef.current += 50
            setScore(scoreRef.current)
            onScoreUpdate?.(scoreRef.current)
            stardustRef.current.splice(i, 1)
            continue
          }

          if (star.y > height + 20) {
            stardustRef.current.splice(i, 1)
          }
        }

        // Draw Player Orb
        ctx.save()
        ctx.shadowColor = 'rgba(255, 252, 247, 0.8)'
        ctx.shadowBlur = 16
        ctx.fillStyle = '#FFFCF7'
        ctx.beginPath()
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Shield aura
        ctx.strokeStyle = shieldsRef.current > 1 ? '#38BDF8' : '#F87171'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()

        // Particles
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
          const p = particlesRef.current[i]
          p.x += p.vx
          p.y += p.vy
          p.life -= 0.05
          if (p.life <= 0) {
            particlesRef.current.splice(i, 1)
            continue
          }
          ctx.fillStyle = p.color
          ctx.globalAlpha = p.life
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }

      animFrameRef.current = requestAnimationFrame(loop)
    }

    animFrameRef.current = requestAnimationFrame(loop)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isPaused, isPlaying, gameOver, soundEnabled, onGameOver, onScoreUpdate])

  // Mouse / Touch Controls
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameOver || isPaused) return
    const rect = e.currentTarget.getBoundingClientRect()
    const scaleX = 320 / rect.width
    const scaleY = 400 / rect.height
    playerRef.current.targetX = (e.clientX - rect.left) * scaleX
    playerRef.current.targetY = (e.clientY - rect.top) * scaleY
  }

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || isPaused) return
      const step = 24
      if (e.key === 'ArrowLeft' || e.key === 'a') playerRef.current.targetX -= step
      if (e.key === 'ArrowRight' || e.key === 'd') playerRef.current.targetX += step
      if (e.key === 'ArrowUp' || e.key === 'w') playerRef.current.targetY -= step
      if (e.key === 'ArrowDown' || e.key === 's') playerRef.current.targetY += step
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameOver, isPaused])

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto p-4 gap-4">
      {/* HUD Stats */}
      <div className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl bg-[#F3EDE3] dark:bg-[#1D1713] border border-[#DFD3C4] dark:border-[#493A30] text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-[#80523B] dark:text-[#D1A184]">
          <Trophy className="w-4 h-4" />
          <span>Score: {score}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-sky-500" />
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full ${
                  i < shields ? 'bg-sky-500 shadow-sm' : 'bg-[#DFD3C4] dark:bg-[#382820]'
                }`}
              />
            ))}
          </div>
        </div>

        <button
          onClick={startNewGame}
          className="flex items-center gap-1 text-[11px] text-[#80523B] dark:text-[#D1A184] hover:underline cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Restart</span>
        </button>
      </div>

      {/* HTML5 Canvas Area */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-[#DFD3C4] dark:border-[#493A30] shadow-md touch-none select-none">
        <canvas
          ref={canvasRef}
          width={320}
          height={400}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          className="block w-[300px] h-[375px] sm:w-[320px] sm:h-[400px] cursor-crosshair"
        />

        {/* In-game Overlay if Game Over */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white gap-3 animate-fadeIn">
            <h4 className="font-serif text-2xl font-bold">Orbit Interrupted</h4>
            <p className="text-xs text-[#EAE0D2]">
              Final Stardust Score: <strong className="text-amber-300 font-mono text-base">{score}</strong>
            </p>
            <button
              onClick={startNewGame}
              className="mt-2 px-6 py-2 rounded-full bg-[#80523B] hover:bg-[#6A422F] text-white text-xs font-semibold shadow-md active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Launch Again</span>
            </button>
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#726056] dark:text-[#C2B1A0] text-center">
        Drag your mouse or finger across the canvas, or use WASD / Arrow keys to dodge space debris.
      </p>
    </div>
  )
}
