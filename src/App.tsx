import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Button } from './components/ui/button'
import { Card } from './components/ui/card'

interface Position {
  x: number
  y: number
}

interface GameObject extends Position {
  width: number
  height: number
  velocity: Position
}

interface Bullet extends GameObject {
  color: string
}

interface AlienBullet extends GameObject {
  color: string
  damage: number
}

interface Enemy extends GameObject {
  health: number
  color: string
  type: 'scout' | 'heavy' | 'boss'
  animationFrame: number
  lastShot: number
  shootCooldown: number
}

interface Player extends GameObject {
  health: number
  maxHealth: number
  shield: number
  maxShield: number
  shieldRegenCooldown: number
  lastDamaged: number
  animationFrame: number
}

interface Particle extends Position {
  velocity: Position
  life: number
  maxLife: number
  color: string
  size: number
}

interface GameState {
  player: Player
  bullets: Bullet[]
  alienBullets: AlienBullet[]
  enemies: Enemy[]
  particles: Particle[]
  score: number
  gameOver: boolean
  paused: boolean
  wave: number
}

const CANVAS_WIDTH = 900
const CANVAS_HEIGHT = 700
const PLAYER_SPEED = 6
const BULLET_SPEED = 8
const ENEMY_SPEED = 1.5
const ALIEN_BULLET_SPEED = 4

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const keysRef = useRef<Set<string>>(new Set())
  const lastShotRef = useRef<number>(0)
  const animationRef = useRef<number>(0)

  const [gameState, setGameState] = useState<GameState>({
    player: {
      x: CANVAS_WIDTH / 2 - 20,
      y: CANVAS_HEIGHT - 120,
      width: 40,
      height: 60,
      velocity: { x: 0, y: 0 },
      health: 100,
      maxHealth: 100,
      shield: 100,
      maxShield: 100,
      shieldRegenCooldown: 0,
      lastDamaged: 0,
      animationFrame: 0
    },
    bullets: [],
    alienBullets: [],
    enemies: [],
    particles: [],
    score: 0,
    gameOver: false,
    paused: false,
    wave: 1
  })

  const resetGame = useCallback(() => {
    setGameState({
      player: {
        x: CANVAS_WIDTH / 2 - 20,
        y: CANVAS_HEIGHT - 120,
        width: 40,
        height: 60,
        velocity: { x: 0, y: 0 },
        health: 100,
        maxHealth: 100,
        shield: 100,
        maxShield: 100,
        shieldRegenCooldown: 0,
        lastDamaged: 0,
        animationFrame: 0
      },
      bullets: [],
      alienBullets: [],
      enemies: [],
      particles: [],
      score: 0,
      gameOver: false,
      paused: false,
      wave: 1
    })
  }, [])

  const createParticle = (x: number, y: number, color: string): Particle => ({
    x,
    y,
    velocity: {
      x: (Math.random() - 0.5) * 6,
      y: (Math.random() - 0.5) * 6
    },
    life: 30 + Math.random() * 20,
    maxLife: 30 + Math.random() * 20,
    color,
    size: 2 + Math.random() * 3
  })

  const spawnEnemy = useCallback(() => {
    const types: Enemy['type'][] = ['scout', 'scout', 'heavy', 'boss']
    const type = types[Math.floor(Math.random() * (gameState.wave > 3 ? types.length : 2))]
    
    let enemy: Enemy
    switch (type) {
      case 'heavy':
        enemy = {
          x: Math.random() * (CANVAS_WIDTH - 60),
          y: -60,
          width: 60,
          height: 50,
          velocity: { x: (Math.random() - 0.5) * 1, y: ENEMY_SPEED * 0.7 },
          health: 3,
          color: '#dc2626',
          type,
          animationFrame: 0,
          lastShot: 0,
          shootCooldown: 0
        }
        break
      case 'boss':
        enemy = {
          x: Math.random() * (CANVAS_WIDTH - 80),
          y: -80,
          width: 80,
          height: 70,
          velocity: { x: (Math.random() - 0.5) * 0.5, y: ENEMY_SPEED * 0.5 },
          health: 5,
          color: '#7c2d12',
          type,
          animationFrame: 0,
          lastShot: 0,
          shootCooldown: 0
        }
        break
      default: // scout
        enemy = {
          x: Math.random() * (CANVAS_WIDTH - 40),
          y: -40,
          width: 40,
          height: 35,
          velocity: { x: (Math.random() - 0.5) * 2, y: ENEMY_SPEED },
          health: 1,
          color: '#16a34a',
          type,
          animationFrame: 0,
          lastShot: 0,
          shootCooldown: 0
        }
    }
    return enemy
  }, [gameState.wave])

  const checkCollision = (obj1: GameObject, obj2: GameObject): boolean => {
    return obj1.x < obj2.x + obj2.width &&
           obj1.x + obj1.width > obj2.x &&
           obj1.y < obj2.y + obj2.height &&
           obj1.y + obj1.height > obj2.y
  }

  const updateGame = useCallback(() => {
    if (gameState.gameOver || gameState.paused) return

    animationRef.current++

    setGameState(prevState => {
      const newState = { ...prevState }
      
      // Update player animation
      newState.player.animationFrame = animationRef.current
      
      // Update player position
      newState.player.velocity.x = 0
      if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) {
        newState.player.velocity.x = -PLAYER_SPEED
      }
      if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) {
        newState.player.velocity.x = PLAYER_SPEED
      }
      
      newState.player.x += newState.player.velocity.x
      newState.player.x = Math.max(0, Math.min(CANVAS_WIDTH - newState.player.width, newState.player.x))

      // Shooting
      const now = Date.now()
      if ((keysRef.current.has(' ') || keysRef.current.has('w') || keysRef.current.has('ArrowUp')) && 
          now - lastShotRef.current > 120) {
        newState.bullets.push({
          x: newState.player.x + newState.player.width / 2 - 2,
          y: newState.player.y,
          width: 4,
          height: 12,
          velocity: { x: 0, y: -BULLET_SPEED },
          color: '#fbbf24'
        })
        lastShotRef.current = now
      }

      // Update bullets
      newState.bullets = newState.bullets
        .map(bullet => ({
          ...bullet,
          y: bullet.y + bullet.velocity.y
        }))
        .filter(bullet => bullet.y > -15)

      // Spawn enemies
      const spawnRate = 0.015 + newState.wave * 0.003
      if (Math.random() < spawnRate) {
        newState.enemies.push(spawnEnemy())
      }

      // Update enemies
      newState.enemies = newState.enemies
        .map(enemy => ({
          ...enemy,
          x: enemy.x + enemy.velocity.x,
          y: enemy.y + enemy.velocity.y,
          animationFrame: animationRef.current
        }))
        .filter(enemy => {
          if (enemy.y > CANVAS_HEIGHT) return false
          
          // Keep enemies within bounds
          if (enemy.x <= 0 || enemy.x >= CANVAS_WIDTH - enemy.width) {
            enemy.velocity.x *= -1
          }
          
          // Check collision with player
          if (checkCollision(enemy, newState.player)) {
            newState.player.health -= enemy.type === 'boss' ? 40 : enemy.type === 'heavy' ? 25 : 15
            // Create explosion particles
            for (let i = 0; i < 10; i++) {
              newState.particles.push(createParticle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#ef4444'))
            }
            return false
          }
          return true
        })

      // Check bullet-enemy collisions
      newState.bullets = newState.bullets.filter(bullet => {
        for (let i = newState.enemies.length - 1; i >= 0; i--) {
          if (checkCollision(bullet, newState.enemies[i])) {
            const enemy = newState.enemies[i]
            enemy.health--
            
            // Create hit particles
            for (let j = 0; j < 5; j++) {
              newState.particles.push(createParticle(bullet.x, bullet.y, '#fbbf24'))
            }
            
            if (enemy.health <= 0) {
              // Create explosion particles
              for (let j = 0; j < 15; j++) {
                newState.particles.push(createParticle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color))
              }
              
              const points = enemy.type === 'boss' ? 50 : enemy.type === 'heavy' ? 25 : 10
              newState.score += points
              newState.enemies.splice(i, 1)
            }
            return false
          }
        }
        return true
      })

      // Update alien bullets
      newState.alienBullets = newState.alienBullets
        .map(alienBullet => ({
          ...alienBullet,
          y: alienBullet.y + alienBullet.velocity.y
        }))
        .filter(alienBullet => {
          // Remove bullets that are off screen
          if (alienBullet.y > CANVAS_HEIGHT) return false
          
          // Check collision with player
          if (checkCollision(alienBullet, newState.player)) {
            const currentTime = Date.now()
            newState.player.lastDamaged = currentTime
            newState.player.shieldRegenCooldown = 180 // 3 seconds at 60fps
            
            if (newState.player.shield > 0) {
              newState.player.shield -= alienBullet.damage
              if (newState.player.shield < 0) {
                // Overflow damage goes to health
                newState.player.health += newState.player.shield
                newState.player.shield = 0
              }
            } else {
              newState.player.health -= alienBullet.damage
            }
            
            if (newState.player.health < 0) {
              newState.player.health = 0
            }
            
            // Create hit particles
            for (let j = 0; j < 8; j++) {
              newState.particles.push(createParticle(alienBullet.x, alienBullet.y, '#ef4444'))
            }
            return false // Remove the bullet
          }
          return true
        })

      // Enemy shooting logic
      newState.enemies.forEach(enemy => {
        const currentTime = Date.now()
        let shootChance = 0
        let cooldown = 0
        
        switch (enemy.type) {
          case 'scout':
            shootChance = 0.003
            cooldown = 2000
            break
          case 'heavy':
            shootChance = 0.008
            cooldown = 1500
            break
          case 'boss':
            shootChance = 0.015
            cooldown = 800
            break
        }
        
        if (currentTime - enemy.lastShot > cooldown && Math.random() < shootChance) {
          const alienBullet: AlienBullet = {
            x: enemy.x + enemy.width / 2 - 2,
            y: enemy.y + enemy.height,
            width: 4,
            height: 8,
            velocity: { x: 0, y: ALIEN_BULLET_SPEED },
            color: enemy.type === 'boss' ? '#dc2626' : enemy.type === 'heavy' ? '#f97316' : '#eab308',
            damage: enemy.type === 'boss' ? 25 : enemy.type === 'heavy' ? 15 : 8
          }
          newState.alienBullets.push(alienBullet)
          enemy.lastShot = currentTime
        }
      })

      // Update player shield regen
      if (newState.player.shieldRegenCooldown > 0) {
        newState.player.shieldRegenCooldown--
      }
      if (newState.player.shield < newState.player.maxShield && newState.player.shieldRegenCooldown === 0) {
        newState.player.shield++
        if (newState.player.shield > newState.player.maxShield) {
          newState.player.shield = newState.player.maxShield
        }
        newState.player.shieldRegenCooldown = 30
      }

      // Update particles
      newState.particles = newState.particles
        .map(particle => ({
          ...particle,
          x: particle.x + particle.velocity.x,
          y: particle.y + particle.velocity.y,
          life: particle.life - 1,
          velocity: {
            x: particle.velocity.x * 0.95,
            y: particle.velocity.y * 0.95
          }
        }))
        .filter(particle => particle.life > 0)

      // Check for wave progression
      if (newState.score > 0 && newState.score % 250 === 0 && newState.score !== prevState.score) {
        newState.wave++
      }

      // Check game over
      if (newState.player.health <= 0) {
        newState.gameOver = true
      }

      return newState
    })
  }, [gameState.gameOver, gameState.paused, spawnEnemy])

  const drawMoonSurface = (ctx: CanvasRenderingContext2D) => {
    // Moon surface gradient
    const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - 100, 0, CANVAS_HEIGHT)
    gradient.addColorStop(0, '#4b5563')
    gradient.addColorStop(1, '#374151')
    ctx.fillStyle = gradient
    ctx.fillRect(0, CANVAS_HEIGHT - 100, CANVAS_WIDTH, 100)
    
    // Moon craters and rocks
    ctx.fillStyle = '#6b7280'
    for (let i = 0; i < 8; i++) {
      const x = (i * 120 + 50) % CANVAS_WIDTH
      const y = CANVAS_HEIGHT - 90 + Math.sin(i) * 10
      ctx.beginPath()
      ctx.arc(x, y, 8 + Math.sin(i * 2) * 4, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Surface texture
    ctx.fillStyle = '#9ca3af'
    for (let i = 0; i < 20; i++) {
      const x = (i * 45) % CANVAS_WIDTH
      const y = CANVAS_HEIGHT - 20 + Math.sin(i * 0.5) * 5
      ctx.fillRect(x, y, 2, 3)
    }
  }

  const drawStarfield = (ctx: CanvasRenderingContext2D) => {
    // Distant stars
    ctx.fillStyle = '#e5e7eb'
    for (let i = 0; i < 80; i++) {
      const x = (i * 137 + animationRef.current * 0.01) % CANVAS_WIDTH
      const y = (i * 211) % (CANVAS_HEIGHT - 100)
      const brightness = 0.3 + Math.sin(i + animationRef.current * 0.05) * 0.2
      ctx.globalAlpha = brightness
      ctx.fillRect(x, y, 1, 1)
    }
    
    // Brighter stars
    ctx.fillStyle = '#f9fafb'
    for (let i = 0; i < 30; i++) {
      const x = (i * 171 + animationRef.current * 0.005) % CANVAS_WIDTH
      const y = (i * 193) % (CANVAS_HEIGHT - 100)
      const brightness = 0.6 + Math.sin(i * 2 + animationRef.current * 0.03) * 0.3
      ctx.globalAlpha = brightness
      ctx.fillRect(x, y, 2, 2)
    }
    ctx.globalAlpha = 1
  }

  const drawEarth = (ctx: CanvasRenderingContext2D) => {
    // Earth in the background
    const earthX = CANVAS_WIDTH - 120
    const earthY = 80
    const earthRadius = 60
    
    // Earth glow
    const earthGlow = ctx.createRadialGradient(earthX, earthY, earthRadius * 0.8, earthX, earthY, earthRadius * 1.3)
    earthGlow.addColorStop(0, 'rgba(59, 130, 246, 0.3)')
    earthGlow.addColorStop(1, 'rgba(59, 130, 246, 0)')
    ctx.fillStyle = earthGlow
    ctx.beginPath()
    ctx.arc(earthX, earthY, earthRadius * 1.3, 0, Math.PI * 2)
    ctx.fill()
    
    // Earth body
    const earthGradient = ctx.createRadialGradient(earthX - 20, earthY - 20, 0, earthX, earthY, earthRadius)
    earthGradient.addColorStop(0, '#3b82f6')
    earthGradient.addColorStop(0.7, '#1d4ed8')
    earthGradient.addColorStop(1, '#1e3a8a')
    ctx.fillStyle = earthGradient
    ctx.beginPath()
    ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2)
    ctx.fill()
    
    // Earth continents
    ctx.fillStyle = '#22c55e'
    ctx.beginPath()
    ctx.arc(earthX - 15, earthY - 10, 20, 0, Math.PI)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(earthX + 10, earthY + 15, 15, 0, Math.PI * 1.5)
    ctx.fill()
  }

  const drawPlayer = (ctx: CanvasRenderingContext2D) => {
    const player = gameState.player
    const bounce = Math.sin(player.animationFrame * 0.1) * 2
    
    // Draw shield effect if shield is active
    if (player.shield > 0) {
      const shieldAlpha = (player.shield / player.maxShield) * 0.6 + 0.2
      const shieldRadius = 25 + Math.sin(player.animationFrame * 0.15) * 3
      
      // Shield outer glow
      const shieldGradient = ctx.createRadialGradient(
        player.x + player.width/2, player.y + player.height/2 + bounce, 
        shieldRadius * 0.7, 
        player.x + player.width/2, player.y + player.height/2 + bounce, 
        shieldRadius
      )
      shieldGradient.addColorStop(0, `rgba(59, 130, 246, ${shieldAlpha * 0.8})`)
      shieldGradient.addColorStop(0.6, `rgba(147, 197, 253, ${shieldAlpha * 0.4})`)
      shieldGradient.addColorStop(1, `rgba(59, 130, 246, 0)`)
      
      ctx.fillStyle = shieldGradient
      ctx.beginPath()
      ctx.arc(player.x + player.width/2, player.y + player.height/2 + bounce, shieldRadius, 0, Math.PI * 2)
      ctx.fill()
      
      // Shield border
      ctx.strokeStyle = `rgba(59, 130, 246, ${shieldAlpha})`
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(player.x + player.width/2, player.y + player.height/2 + bounce, shieldRadius - 2, 0, Math.PI * 2)
      ctx.stroke()
    }
    
    // Astronaut body
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(player.x + 12, player.y + 20 + bounce, 16, 25)
    
    // Astronaut helmet
    ctx.fillStyle = '#e5e7eb'
    ctx.beginPath()
    ctx.arc(player.x + 20, player.y + 15 + bounce, 12, 0, Math.PI * 2)
    ctx.fill()
    
    // Helmet visor
    ctx.fillStyle = '#1e293b'
    ctx.beginPath()
    ctx.arc(player.x + 20, player.y + 15 + bounce, 8, 0, Math.PI * 2)
    ctx.fill()
    
    // Helmet reflection
    ctx.fillStyle = '#60a5fa'
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.arc(player.x + 17, player.y + 12 + bounce, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    
    // Arms
    ctx.fillStyle = '#f9fafb'
    ctx.fillRect(player.x + 5, player.y + 25 + bounce, 8, 12)
    ctx.fillRect(player.x + 27, player.y + 25 + bounce, 8, 12)
    
    // Legs
    ctx.fillRect(player.x + 10, player.y + 40 + bounce, 6, 15)
    ctx.fillRect(player.x + 24, player.y + 40 + bounce, 6, 15)
    
    // Weapon
    ctx.fillStyle = '#64748b'
    ctx.fillRect(player.x + 18, player.y + 10 + bounce, 4, 15)
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(player.x + 17, player.y + 8 + bounce, 6, 4)
  }

  const drawEnemy = (ctx: CanvasRenderingContext2D, enemy: Enemy) => {
    const hover = Math.sin(enemy.animationFrame * 0.08 + enemy.x * 0.01) * 3
    
    switch (enemy.type) {
      case 'scout':
        // Small green alien scout
        ctx.fillStyle = enemy.color
        ctx.beginPath()
        ctx.arc(enemy.x + enemy.width/2, enemy.y + enemy.height/2 + hover, enemy.width/3, 0, Math.PI * 2)
        ctx.fill()
        
        // Eyes
        ctx.fillStyle = '#dc2626'
        ctx.beginPath()
        ctx.arc(enemy.x + enemy.width/2 - 4, enemy.y + enemy.height/2 - 2 + hover, 2, 0, Math.PI * 2)
        ctx.arc(enemy.x + enemy.width/2 + 4, enemy.y + enemy.height/2 - 2 + hover, 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Tentacles
        ctx.fillStyle = '#15803d'
        for (let i = 0; i < 4; i++) {
          const x = enemy.x + 8 + i * 6
          const y = enemy.y + enemy.height/2 + 8 + hover + Math.sin(enemy.animationFrame * 0.1 + i) * 3
          ctx.fillRect(x, y, 2, 8)
        }
        break
        
      case 'heavy':
        // Medium red alien with armor
        ctx.fillStyle = enemy.color
        ctx.fillRect(enemy.x + 10, enemy.y + 10 + hover, enemy.width - 20, enemy.height - 20)
        
        // Armor plating
        ctx.fillStyle = '#7f1d1d'
        ctx.fillRect(enemy.x + 5, enemy.y + 5 + hover, enemy.width - 10, 10)
        ctx.fillRect(enemy.x + 5, enemy.y + enemy.height - 15 + hover, enemy.width - 10, 10)
        
        // Eyes/sensors
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.arc(enemy.x + 20, enemy.y + 20 + hover, 3, 0, Math.PI * 2)
        ctx.arc(enemy.x + 40, enemy.y + 20 + hover, 3, 0, Math.PI * 2)
        ctx.fill()
        break
        
      case 'boss':
        // Large brown alien boss
        ctx.fillStyle = enemy.color
        ctx.fillRect(enemy.x + 5, enemy.y + 15 + hover, enemy.width - 10, enemy.height - 30)
        
        // Head
        ctx.beginPath()
        ctx.arc(enemy.x + enemy.width/2, enemy.y + 20 + hover, 20, 0, Math.PI * 2)
        ctx.fill()
        
        // Multiple eyes
        ctx.fillStyle = '#ef4444'
        for (let i = 0; i < 3; i++) {
          const eyeX = enemy.x + 25 + i * 10
          const eyeY = enemy.y + 15 + hover + Math.sin(enemy.animationFrame * 0.05 + i) * 2
          ctx.beginPath()
          ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2)
          ctx.fill()
        }
        
        // Spikes
        ctx.fillStyle = '#451a03'
        for (let i = 0; i < 5; i++) {
          const spikeX = enemy.x + 10 + i * 12
          const spikeY = enemy.y + enemy.height - 15 + hover
          ctx.fillRect(spikeX, spikeY, 3, 10)
        }
        break
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas with space background
    const spaceGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT)
    spaceGradient.addColorStop(0, '#0c0a1b')
    spaceGradient.addColorStop(1, '#1a1625')
    ctx.fillStyle = spaceGradient
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw background elements
    drawStarfield(ctx)
    drawEarth(ctx)
    drawMoonSurface(ctx)

    if (gameState.gameOver) return

    // Draw particles
    gameState.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife
      ctx.globalAlpha = alpha
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    // Draw player
    drawPlayer(ctx)

    // Draw bullets with glow effect
    gameState.bullets.forEach(bullet => {
      // Bullet glow
      ctx.shadowColor = bullet.color
      ctx.shadowBlur = 15
      ctx.fillStyle = bullet.color
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      
      // Bullet trail
      ctx.shadowBlur = 0
      ctx.globalAlpha = 0.6
      ctx.fillRect(bullet.x, bullet.y + bullet.height, bullet.width, bullet.height * 2)
      ctx.globalAlpha = 1
    })

    // Draw alien bullets
    gameState.alienBullets.forEach(alienBullet => {
      // Bullet glow
      ctx.shadowColor = alienBullet.color
      ctx.shadowBlur = 15
      ctx.fillStyle = alienBullet.color
      ctx.fillRect(alienBullet.x, alienBullet.y, alienBullet.width, alienBullet.height)
      
      // Bullet trail
      ctx.shadowBlur = 0
      ctx.globalAlpha = 0.6
      ctx.fillRect(alienBullet.x, alienBullet.y + alienBullet.height, alienBullet.width, alienBullet.height * 2)
      ctx.globalAlpha = 1
    })

    // Draw enemies
    gameState.enemies.forEach(enemy => {
      drawEnemy(ctx, enemy)
    })

    // Reset shadow effects
    ctx.shadowBlur = 0

  }, [gameState])

  const gameLoop = useCallback(() => {
    updateGame()
    draw()
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [updateGame, draw])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key)
      if (e.key === 'p' || e.key === 'P') {
        setGameState(prev => ({ ...prev, paused: !prev.paused }))
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  useEffect(() => {
    if (!gameState.gameOver && !gameState.paused) {
      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameLoop, gameState.gameOver, gameState.paused])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            🌙 Lunar Defense
          </h1>
          <p className="text-gray-300 text-lg">Defend Earth from the alien invasion on the Moon!</p>
        </div>

        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="border-2 border-blue-500/30 rounded-xl bg-slate-950 shadow-2xl shadow-blue-500/20"
          />
          
          {/* Game UI Overlay */}
          <div className="absolute top-4 left-4 right-4 flex justify-between text-white">
            <div className="space-y-1 bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="text-sm font-medium">Score: <span className="text-yellow-400">{gameState.score}</span></div>
              <div className="text-sm font-medium">Wave: <span className="text-blue-400">{gameState.wave}</span></div>
              <div className="text-xs text-gray-300">Enemies: {gameState.enemies.length}</div>
            </div>
            <div className="space-y-1 bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="text-sm font-medium">Health</div>
              <div className="w-28 h-3 bg-red-900 rounded-full overflow-hidden border border-red-700">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all duration-300"
                  style={{ width: `${(gameState.player.health / gameState.player.maxHealth) * 100}%` }}
                />
              </div>
              <div className="text-xs text-center text-gray-300">
                {gameState.player.health}/{gameState.player.maxHealth}
              </div>
            </div>
            <div className="space-y-1 bg-black/40 px-3 py-2 rounded-lg backdrop-blur-sm">
              <div className="text-sm font-medium">Shield</div>
              <div className="w-28 h-3 bg-blue-900 rounded-full overflow-hidden border border-blue-700">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${(gameState.player.shield / gameState.player.maxShield) * 100}%` }}
                />
              </div>
              <div className="text-xs text-center text-gray-300">
                {gameState.player.shield}/{gameState.player.maxShield}
              </div>
            </div>
          </div>

          {/* Game Over Overlay */}
          {gameState.gameOver && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-xl">
              <Card className="p-8 bg-slate-900/95 border-red-500/30 text-center space-y-4 backdrop-blur-sm">
                <h2 className="text-3xl font-bold text-red-400">Mission Failed!</h2>
                <p className="text-gray-300">The aliens have overrun the lunar base...</p>
                <p className="text-gray-300">Final Score: <span className="text-yellow-400 font-bold">{gameState.score}</span></p>
                <p className="text-gray-300">Waves Survived: <span className="text-blue-400 font-bold">{gameState.wave}</span></p>
                <Button onClick={resetGame} className="bg-blue-600 hover:bg-blue-700">
                  Restart Mission
                </Button>
              </Card>
            </div>
          )}

          {/* Pause Overlay */}
          {gameState.paused && !gameState.gameOver && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
              <Card className="p-6 bg-slate-900/95 border-blue-500/30 text-center backdrop-blur-sm">
                <h2 className="text-2xl font-bold text-blue-400">Mission Paused</h2>
                <p className="text-gray-300 mt-2">Press P to resume the fight</p>
              </Card>
            </div>
          )}
        </div>

        {/* Controls */}
        <Card className="p-6 bg-slate-900/90 border-blue-500/30 max-w-2xl backdrop-blur-sm">
          <h3 className="text-xl font-bold text-white mb-4">🎮 Mission Controls</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
            <div>
              <span className="text-yellow-400 font-mono">← →</span> or <span className="text-yellow-400 font-mono">A D</span> Move Astronaut
            </div>
            <div>
              <span className="text-yellow-400 font-mono">↑</span> or <span className="text-yellow-400 font-mono">W SPACE</span> Fire Weapon
            </div>
            <div>
              <span className="text-yellow-400 font-mono">P</span> Pause Mission
            </div>
            <div>
              <span className="text-blue-400">🛡️ Shield regenerates when not taking damage</span>
            </div>
            <div className="col-span-2">
              <span className="text-green-400">🛸 Scout: 10pts | 🛡️ Heavy: 25pts | 👾 Boss: 50pts</span>
              <br />
              <span className="text-red-400">⚠️ Aliens shoot back! Avoid their projectiles!</span>
            </div>
          </div>
        </Card>

        {!gameState.gameOver && (
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => setGameState(prev => ({ ...prev, paused: !prev.paused }))}
              variant="outline" 
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              {gameState.paused ? '▶️ Resume' : '⏸️ Pause'}
            </Button>
            <Button 
              onClick={resetGame}
              variant="outline" 
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              🔄 Restart
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}