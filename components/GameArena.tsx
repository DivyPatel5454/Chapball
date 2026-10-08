'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { GameRoom, Player } from '../lib/types';
import { BallAvatar } from './BallAvatar';
import { getPlayerColor } from '../lib/colors';

interface GameArenaProps {
  room: GameRoom;
  myPlayerId: string;
  onUpdatePlacement?: (x: number, y: number, laserAngle: number) => void;
  onReady?: () => void;
}

const PLAYER_COLORS = [
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#10b981', // Emerald Green
  '#3b82f6', // Blue
  '#000000', // Black
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export const GameArena: React.FC<GameArenaProps> = ({
  room,
  myPlayerId,
  onUpdatePlacement,
  onReady,
}) => {
  const me = room.players.find((p) => p.id === myPlayerId);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const arenaBoxRef = useRef<HTMLDivElement | null>(null);


  // Local placement state for smooth responsiveness (client-side prediction)
  const [posX, setPosX] = useState<number>(0.5);
  const [posY, setPosY] = useState<number>(0.5);
  const [angle, setAngle] = useState<number>(0);

  // Refs so Space handler can read latest values without stale closures
  const posXRef = useRef(0.5);
  const posYRef = useRef(0.5);
  const angleRef = useRef(0);

  // Keep refs in sync with state
  useEffect(() => { posXRef.current = posX; }, [posX]);
  useEffect(() => { posYRef.current = posY; }, [posY]);
  useEffect(() => { angleRef.current = angle; }, [angle]);

  // Sync state with server when room state updates or when initializing
  useEffect(() => {
    if (me) {
      setPosX(me.x);
      setPosY(me.y);
      setAngle(me.laserAngle);
    }
  }, [me?.x, me?.y, me?.laserAngle]);

  const keysPressed = useRef<{ [key: string]: boolean }>({});

  // Arena scale from room data (1.0 down to smaller as rounds progress)
  const arenaScale = room.arena?.scale ?? 1.0;

  // Movement bounds: normalized 0.0 to 1.0 within the arena box
  const minBound = 0.02;
  const maxBound = 0.98;


  // Keyboard listeners for WASD movement and Spacebar ready
  useEffect(() => {
    if (room.phase !== 'placement' || me?.ready || me?.eliminated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (e.code === 'Space' || key === ' ') {
        e.preventDefault();
        // Send final position+angle to server ONCE, then signal ready
        onUpdatePlacement?.(posXRef.current, posYRef.current, angleRef.current);
        onReady?.();
        return;
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        keysPressed.current[key] = true;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowleft', 'arrowdown', 'arrowright'].includes(key)) {
        keysPressed.current[key] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [room.phase, me?.ready, me?.eliminated, onReady]);

  // Movement animation loop for continuous WASD movement bounded inside arena
  useEffect(() => {
    if (room.phase !== 'placement' || me?.ready || me?.eliminated) return;

    let animFrameId: number;
    let lastTime = performance.now();

    const updatePosition = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      let dx = 0;
      let dy = 0;
      const speed = 0.45; // Normalized distance per second

      if (keysPressed.current['w'] || keysPressed.current['arrowup']) dy -= 1;
      if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dy += 1;
      if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx -= 1;
      if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx += 1;

      if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy);
        const normDx = (dx / len) * speed * dt;
        const normDy = (dy / len) * speed * dt;

        // Update local state only — no server emit here (client-side prediction)
        setPosX((prevX) => Math.max(minBound, Math.min(maxBound, prevX + normDx)));
        setPosY((prevY) => Math.max(minBound, Math.min(maxBound, prevY + normDy)));
      }

      animFrameId = requestAnimationFrame(updatePosition);
    };

    animFrameId = requestAnimationFrame(updatePosition);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [room.phase, me?.ready, me?.eliminated, minBound, maxBound]);


  // Mouse movement listener to update laser angle targeting cursor
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (room.phase !== 'placement' || me?.ready || me?.eliminated) return;
      if (!arenaBoxRef.current) return;

      const rect = arenaBoxRef.current.getBoundingClientRect();
      const playerPxX = rect.left + posX * rect.width;
      const playerPxY = rect.top + posY * rect.height;

      const deltaX = e.clientX - playerPxX;
      const deltaY = e.clientY - playerPxY;

      const newAngle = Math.atan2(deltaY, deltaX);
      // Update local angle only — no server emit here (client-side prediction)
      setAngle(newAngle);
    },
    [room.phase, me?.ready, me?.eliminated, posX, posY]
  );


  // Helper to calculate laser end line point extending to edge of container
  const getLaserEndpoint = (x: number, y: number, lAngle: number) => {
    const cos = Math.cos(lAngle);
    const sin = Math.sin(lAngle);

    let t = 10;
    if (cos > 0) t = Math.min(t, (1 - x) / cos);
    if (cos < 0) t = Math.min(t, (0 - x) / cos);
    if (sin > 0) t = Math.min(t, (1 - y) / sin);
    if (sin < 0) t = Math.min(t, (0 - y) / sin);

    return {
      endX: (x + cos * t) * 100,
      endY: (y + sin * t) * 100,
    };
  };

  const resolvePlayerColor = (p: Player) => {
    return getPlayerColor(p, room);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#fcfcfc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        userSelect: 'none',
        zIndex: 10,
      }}
    >
      {/* Playable Shrinking Arena Canvas Box */}
      <div
        ref={arenaBoxRef}
        style={{
          position: 'relative',
          width: `${arenaScale * 90}vw`,
          height: `${arenaScale * 90}vh`,
          maxWidth: `${arenaScale * 1400}px`,
          maxHeight: `${arenaScale * 900}px`,
          backgroundColor: '#ffffff',
          borderRadius: '0px',
          boxShadow: '0 0 3.7px rgba(0, 0, 0, 0.15)',
          transition: 'all 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'visible',
        }}
      >

        {/* Laser Lines SVG Overlay */}
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
            overflow: 'visible',
          }}
        >
          <defs>
            <style>{`
              @keyframes laserFlow {
                from { stroke-dashoffset: 24; }
                to   { stroke-dashoffset: 0; }
              }
              .laser-flow { animation: laserFlow 0.2s linear infinite; }
            `}</style>

            {/* Tight, sharp glow filters per color */}
            {room.players.map((p) => {
              if (p.eliminated) return null;
              const color = resolvePlayerColor(p);
              return (
                <filter key={`glow-filter-${p.id}`} id={`glow-${p.id}`} x="-20%" y="-20%" width="140%" height="140%">
                  {/* Very small blur for a clean, sharp edge glow */}
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feFlood floodColor={color} floodOpacity="1" result="color" />
                  <feComposite in="color" in2="blur" operator="in" result="glow" />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              );
            })}
          </defs>

          {room.players.map((p) => {
            const isMe = p.id === myPlayerId;

            if (room.phase === 'placement' && !isMe) return null;
            if (p.eliminated) return null;

            const playerX = isMe ? posX : p.x;
            const playerY = isMe ? posY : p.y;
            const playerAngle = isMe ? angle : p.laserAngle;

            const color = resolvePlayerColor(p);
            const { endX, endY } = getLaserEndpoint(playerX, playerY, playerAngle);

            const x1 = `${playerX * 100}%`;
            const y1 = `${playerY * 100}%`;
            const x2 = `${endX}%`;
            const y2 = `${endY}%`;

            return (
              <g key={`laser-${p.id}`}>
                {/* 1. Outer tight colored edge glow */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={color}
                  strokeWidth={isMe ? 3 : 2.5}
                  strokeLinecap="round"
                  filter={`url(#glow-${p.id})`}
                  opacity={0.85}
                />

                {/* 2. Razor-sharp white-hot inner core */}
                <line
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#ffffff"
                  strokeWidth={isMe ? 1.5 : 1}
                  strokeLinecap="round"
                  opacity={1}
                />

                {/* 3. Fast crisp energy pulse traveling down the line */}
                <line
                  className="laser-flow"
                  x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#ffffff"
                  strokeWidth={isMe ? 1.5 : 1}
                  strokeLinecap="round"
                  strokeDasharray="6 18"
                  opacity={0.9}
                />
              </g>
            );
          })}
        </svg>

        {/* Players DOM Elements */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        >
          {room.players.map((p) => {
            const isMe = p.id === myPlayerId;

            if (room.phase === 'placement' && !isMe) return null;
            if (p.eliminated) return null;

            const curX = isMe ? posX : p.x;
            const curY = isMe ? posY : p.y;
            const color = resolvePlayerColor(p);

            return (
              <div
                key={`player-${p.id}`}
                style={{
                  position: 'absolute',
                  left: `${curX * 100}%`,
                  top: `${curY * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  transition: isMe ? 'none' : 'left 0.15s linear, top 0.15s linear',
                }}
              >
                <div style={{ position: 'relative' }}>
                  <BallAvatar
                    size={80}
                    color={color}
                    followMouse={isMe}
                  />
                </div>

                {/* Player Name Tag */}
                <span
                  style={{
                    marginTop: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: color,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* HUD Top Bar Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          padding: '0.6rem 1.6rem',
          borderRadius: '999px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          zIndex: 20,
        }}
      >
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333' }}>
          Round {room.currentRound}
        </div>


        {room.phase === 'placement' && (
          <div
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              color: room.remainingCountdown <= 5 ? '#ef4444' : '#111',
            }}
          >
            {room.remainingCountdown}s
          </div>
        )}

        <div style={{ fontSize: '0.85rem', color: '#666', fontWeight: 600 }}>
          {room.phase === 'placement' && 'Position & Target Laser'}
          {room.phase === 'revealing' && 'LASERS FIRING!'}
          {room.phase === 'result' && 'Round Results'}
          {room.phase === 'shrinking' && 'ARENA SHRINKING!'}
          {room.phase === 'gameOver' && 'Game Over'}
        </div>
      </div>

      {/* Control Hint / Ready Button Overlay */}
      {room.phase === 'placement' && me && !me.eliminated && (
        <div
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 20,
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#666' }}>
            Use WASD to move • Mouse to aim laser • PRESS SPACE TO LOCK
          </span>
        </div>
      )}
    </div>
  );
};