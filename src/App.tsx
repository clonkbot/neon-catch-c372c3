import { useState, useRef, useCallback, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Text, Float, RoundedBox, Sphere, Plane } from '@react-three/drei'
import * as THREE from 'three'

// Types
interface Ball {
  id: number
  position: [number, number, number]
  velocity: [number, number, number]
  color: string
  scale: number
}

interface GameState {
  score: number
  lives: number
  level: number
  gameOver: boolean
  started: boolean
  highScore: number
}

// Neon colors palette
const NEON_COLORS = ['#ff00ff', '#00ffff', '#ff6b6b', '#4ecdc4', '#ffe66d', '#a855f7']

// Paddle component - player controlled
function Paddle({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x = THREE.MathUtils.lerp(
        meshRef.current.position.x,
        position[0],
        0.15
      )
    }
  })

  return (
    <group>
      <RoundedBox
        ref={meshRef}
        args={[3, 0.3, 1.5]}
        radius={0.1}
        smoothness={4}
        position={[0, position[1], position[2]]}
      >
        <meshStandardMaterial
          color="#00ffff"
          emissive="#00ffff"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </RoundedBox>
      {/* Glow effect */}
      <pointLight
        position={[position[0], position[1] + 0.5, position[2]]}
        color="#00ffff"
        intensity={2}
        distance={5}
      />
    </group>
  )
}

// Falling ball component
function FallingBall({
  ball,
  onCatch,
  onMiss,
  paddleX
}: {
  ball: Ball
  onCatch: (id: number, points: number) => void
  onMiss: (id: number) => void
  paddleX: number
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const positionRef = useRef(ball.position)
  const velocityRef = useRef(ball.velocity)
  const caughtRef = useRef(false)

  useFrame((_, delta) => {
    if (!meshRef.current || caughtRef.current) return

    // Update position with velocity
    positionRef.current = [
      positionRef.current[0] + velocityRef.current[0] * delta,
      positionRef.current[1] + velocityRef.current[1] * delta,
      positionRef.current[2] + velocityRef.current[2] * delta
    ]

    // Apply gravity
    velocityRef.current[1] -= 4 * delta

    meshRef.current.position.set(...positionRef.current)
    meshRef.current.rotation.x += delta * 2
    meshRef.current.rotation.z += delta * 3

    // Check paddle collision
    const paddleY = -3
    const paddleWidth = 1.5
    if (
      positionRef.current[1] <= paddleY + 0.5 &&
      positionRef.current[1] >= paddleY - 0.3 &&
      Math.abs(positionRef.current[0] - paddleX) < paddleWidth
    ) {
      caughtRef.current = true
      onCatch(ball.id, Math.round(ball.scale * 100))
    }

    // Check if missed (fell below paddle)
    if (positionRef.current[1] < -5) {
      onMiss(ball.id)
    }
  })

  return (
    <group>
      <Sphere ref={meshRef} args={[ball.scale * 0.3, 16, 16]} position={ball.position}>
        <meshStandardMaterial
          color={ball.color}
          emissive={ball.color}
          emissiveIntensity={0.6}
          metalness={0.3}
          roughness={0.4}
        />
      </Sphere>
    </group>
  )
}

// Grid floor with synthwave aesthetic
function SynthwaveFloor() {
  const gridRef = useRef<THREE.GridHelper>(null!)

  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.position.z = (state.clock.elapsedTime * 2) % 2
    }
  })

  return (
    <group position={[0, -4, 0]}>
      <gridHelper
        ref={gridRef}
        args={[40, 40, '#ff00ff', '#4a0080']}
        rotation={[0, 0, 0]}
      />
      <Plane args={[40, 40]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <meshStandardMaterial color="#0a001a" />
      </Plane>
    </group>
  )
}

// Score display in 3D
function ScoreDisplay({ score, lives, level }: { score: number; lives: number; level: number }) {
  return (
    <group position={[0, 5, -5]}>
      <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
        <Text
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
          fontSize={0.5}
          color="#ff00ff"
          position={[-5, 0, 0]}
          anchorX="left"
        >
          {`SCORE: ${score}`}
        </Text>
        <Text
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
          fontSize={0.5}
          color="#00ffff"
          position={[0, 0, 0]}
          anchorX="center"
        >
          {`LEVEL: ${level}`}
        </Text>
        <Text
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
          fontSize={0.5}
          color="#ff6b6b"
          position={[5, 0, 0]}
          anchorX="right"
        >
          {`${'❤'.repeat(lives)}`}
        </Text>
      </Float>
    </group>
  )
}

// Game Over screen in 3D
function GameOverScreen({ score, highScore, onRestart }: { score: number; highScore: number; onRestart: () => void }) {
  return (
    <group position={[0, 1, 0]}>
      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <Text
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
          fontSize={1}
          color="#ff0066"
          position={[0, 2, 0]}
        >
          GAME OVER
        </Text>
        <Text
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
          fontSize={0.4}
          color="#ffffff"
          position={[0, 0.5, 0]}
        >
          {`FINAL SCORE: ${score}`}
        </Text>
        <Text
          font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
          fontSize={0.3}
          color="#ffd700"
          position={[0, -0.3, 0]}
        >
          {`HIGH SCORE: ${highScore}`}
        </Text>
      </Float>
    </group>
  )
}

// Mouse/Touch tracker for paddle control
function PaddleController({ onMove }: { onMove: (x: number) => void }) {
  const { viewport } = useThree()

  useFrame(({ pointer }) => {
    const x = (pointer.x * viewport.width) / 2
    onMove(THREE.MathUtils.clamp(x, -6, 6))
  })

  return null
}

// Main game scene
function GameScene({
  gameState,
  setGameState,
  balls,
  setBalls,
  paddleX,
  setPaddleX
}: {
  gameState: GameState
  setGameState: React.Dispatch<React.SetStateAction<GameState>>
  balls: Ball[]
  setBalls: React.Dispatch<React.SetStateAction<Ball[]>>
  paddleX: number
  setPaddleX: React.Dispatch<React.SetStateAction<number>>
}) {
  const ballIdRef = useRef(0)

  // Spawn new balls
  useEffect(() => {
    if (!gameState.started || gameState.gameOver) return

    const spawnInterval = Math.max(500, 2000 - gameState.level * 200)

    const interval = setInterval(() => {
      const newBall: Ball = {
        id: ballIdRef.current++,
        position: [
          (Math.random() - 0.5) * 10,
          8,
          0
        ],
        velocity: [
          (Math.random() - 0.5) * 2,
          -1,
          0
        ],
        color: NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)],
        scale: 0.8 + Math.random() * 0.7
      }
      setBalls(prev => [...prev, newBall])
    }, spawnInterval)

    return () => clearInterval(interval)
  }, [gameState.started, gameState.gameOver, gameState.level, setBalls])

  // Level up based on score
  useEffect(() => {
    const newLevel = Math.floor(gameState.score / 500) + 1
    if (newLevel !== gameState.level && newLevel <= 10) {
      setGameState(prev => ({ ...prev, level: newLevel }))
    }
  }, [gameState.score, gameState.level, setGameState])

  const handleCatch = useCallback((id: number, points: number) => {
    setBalls(prev => prev.filter(b => b.id !== id))
    setGameState(prev => ({
      ...prev,
      score: prev.score + points,
      highScore: Math.max(prev.highScore, prev.score + points)
    }))
  }, [setBalls, setGameState])

  const handleMiss = useCallback((id: number) => {
    setBalls(prev => prev.filter(b => b.id !== id))
    setGameState(prev => {
      const newLives = prev.lives - 1
      return {
        ...prev,
        lives: newLives,
        gameOver: newLives <= 0
      }
    })
  }, [setBalls, setGameState])

  const handleRestart = useCallback(() => {
    setBalls([])
    setGameState(prev => ({
      score: 0,
      lives: 3,
      level: 1,
      gameOver: false,
      started: true,
      highScore: prev.highScore
    }))
  }, [setBalls, setGameState])

  return (
    <>
      <PaddleController onMove={setPaddleX} />

      {/* Lighting */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} color="#ff00ff" intensity={1} />
      <pointLight position={[-10, 10, -10]} color="#00ffff" intensity={1} />
      <spotLight
        position={[0, 15, 0]}
        angle={0.5}
        penumbra={1}
        intensity={1}
        color="#ffffff"
      />

      {/* Background */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <SynthwaveFloor />

      {/* Game elements */}
      {gameState.started && !gameState.gameOver && (
        <>
          <ScoreDisplay score={gameState.score} lives={gameState.lives} level={gameState.level} />
          <Paddle position={[paddleX, -3, 0]} />
          {balls.map(ball => (
            <FallingBall
              key={ball.id}
              ball={ball}
              onCatch={handleCatch}
              onMiss={handleMiss}
              paddleX={paddleX}
            />
          ))}
        </>
      )}

      {/* Game Over */}
      {gameState.gameOver && (
        <GameOverScreen
          score={gameState.score}
          highScore={gameState.highScore}
          onRestart={handleRestart}
        />
      )}

      {/* Start screen */}
      {!gameState.started && (
        <group position={[0, 1, 0]}>
          <Float speed={2} rotationIntensity={0.3} floatIntensity={0.8}>
            <Text
              font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
              fontSize={0.8}
              color="#00ffff"
              position={[0, 2, 0]}
            >
              NEON CATCH
            </Text>
            <Text
              font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
              fontSize={0.25}
              color="#ff00ff"
              position={[0, 0.8, 0]}
            >
              Move mouse to control paddle
            </Text>
            <Text
              font="https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nR.woff"
              fontSize={0.25}
              color="#ff00ff"
              position={[0, 0.3, 0]}
            >
              Catch the falling orbs!
            </Text>
          </Float>
        </group>
      )}

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 3}
      />
    </>
  )
}

// UI Overlay
function UIOverlay({
  gameState,
  onStart,
  onRestart
}: {
  gameState: GameState
  onStart: () => void
  onRestart: () => void
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Start button */}
      {!gameState.started && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <button
            onClick={onStart}
            className="group relative px-8 py-4 md:px-12 md:py-6 bg-transparent border-2 border-cyan-400 text-cyan-400 font-bold text-lg md:text-2xl tracking-wider overflow-hidden transition-all duration-300 hover:text-black hover:border-cyan-400"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            <span className="relative z-10">START GAME</span>
            <div className="absolute inset-0 bg-cyan-400 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="absolute -inset-1 bg-cyan-400/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
      )}

      {/* Restart button */}
      {gameState.gameOver && (
        <div className="absolute inset-0 flex items-center justify-center pt-40 pointer-events-auto">
          <button
            onClick={onRestart}
            className="group relative px-6 py-3 md:px-10 md:py-5 bg-transparent border-2 border-pink-500 text-pink-500 font-bold text-base md:text-xl tracking-wider overflow-hidden transition-all duration-300 hover:text-black hover:border-pink-500"
            style={{ fontFamily: "'Press Start 2P', cursive" }}
          >
            <span className="relative z-10">PLAY AGAIN</span>
            <div className="absolute inset-0 bg-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            <div className="absolute -inset-1 bg-pink-500/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </button>
        </div>
      )}

      {/* Mobile touch hint */}
      {gameState.started && !gameState.gameOver && (
        <div className="absolute bottom-24 left-0 right-0 text-center md:hidden">
          <p className="text-cyan-400/60 text-xs" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            Touch & drag to move
          </p>
        </div>
      )}

      {/* HUD for mobile */}
      {gameState.started && !gameState.gameOver && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-center md:hidden">
          <div className="text-pink-500 text-xs" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            {gameState.score}
          </div>
          <div className="text-cyan-400 text-xs" style={{ fontFamily: "'Press Start 2P', cursive" }}>
            LV{gameState.level}
          </div>
          <div className="text-red-400 text-xs">
            {'❤'.repeat(gameState.lives)}
          </div>
        </div>
      )}
    </div>
  )
}

// Footer component
function Footer() {
  return (
    <footer className="absolute bottom-3 left-0 right-0 text-center z-10">
      <p
        className="text-[10px] md:text-xs tracking-wide"
        style={{
          fontFamily: "'Orbitron', sans-serif",
          color: 'rgba(255, 255, 255, 0.3)'
        }}
      >
        Requested by{' '}
        <a
          href="https://twitter.com/stringer_kade"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-cyan-400/60 transition-colors"
        >
          @stringer_kade
        </a>
        {' · Built by '}
        <a
          href="https://twitter.com/clonkbot"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-pink-400/60 transition-colors"
        >
          @clonkbot
        </a>
      </p>
    </footer>
  )
}

// Main App
export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    lives: 3,
    level: 1,
    gameOver: false,
    started: false,
    highScore: 0
  })
  const [balls, setBalls] = useState<Ball[]>([])
  const [paddleX, setPaddleX] = useState(0)

  const handleStart = useCallback(() => {
    setGameState(prev => ({ ...prev, started: true }))
  }, [])

  const handleRestart = useCallback(() => {
    setBalls([])
    setGameState(prev => ({
      score: 0,
      lives: 3,
      level: 1,
      gameOver: false,
      started: true,
      highScore: prev.highScore
    }))
  }, [])

  return (
    <div className="w-screen h-screen bg-black overflow-hidden relative">
      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(128, 0, 255, 0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(0, 255, 255, 0.1) 0%, transparent 40%)'
        }}
      />

      {/* Scanlines effect */}
      <div
        className="absolute inset-0 pointer-events-none z-20 opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.3) 2px, rgba(0, 0, 0, 0.3) 4px)'
        }}
      />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 3, 12], fov: 60 }}
        className="z-10"
        style={{ touchAction: 'none' }}
      >
        <color attach="background" args={['#050010']} />
        <fog attach="fog" args={['#050010', 10, 50]} />
        <GameScene
          gameState={gameState}
          setGameState={setGameState}
          balls={balls}
          setBalls={setBalls}
          paddleX={paddleX}
          setPaddleX={setPaddleX}
        />
      </Canvas>

      {/* UI Overlay */}
      <UIOverlay
        gameState={gameState}
        onStart={handleStart}
        onRestart={handleRestart}
      />

      {/* Footer */}
      <Footer />
    </div>
  )
}
