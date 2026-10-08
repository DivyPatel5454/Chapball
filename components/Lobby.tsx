'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { GameRoom, Team } from '../lib/types';
import { BallAvatar } from './BallAvatar';
import { getPlayerColor } from '../lib/colors';

interface LobbyProps {
  room: GameRoom;
  myPlayerId: string;
  onSelectTeam: (team: Team) => void;
  onStartGame: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  room,
  myPlayerId,
  onSelectTeam,
  onStartGame,
}) => {
  const me = room.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost;
  const canStart = isHost && room.players.length >= 2;
  const myColor = me ? getPlayerColor(me, room) : '#0a0a0c';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f7f7f9',
        padding: '0 4vw',
        zIndex: 100,
      }}
    >
      {/* Left Section: My Ball Avatar + Name */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.2rem',
        }}
      >
        <motion.div layoutId="main-ball-avatar" transition={{ type: 'spring', stiffness: 260, damping: 25 }}>
          <BallAvatar size={340} followMouse={true} color={myColor} />
        </motion.div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', textAlign: 'center' }}>
          {me?.name || 'My Name'}
        </h2>
      </div>

      {/* Center Section: Room code + Start button */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '1px', color: '#111' }}>
          # {room.id}
        </span>
        {isHost ? (
          <button
            className="save-btn"
            onClick={onStartGame}
            disabled={!canStart}
            style={{
              padding: '0.7rem 2.2rem',
              fontSize: '0.95rem',
              opacity: canStart ? 1 : 0.8,
              cursor: canStart ? 'pointer' : 'not-allowed',
            }}
          >
            {canStart ? 'Start game' : 'Waiting...'}
          </button>
        ) : (
          <span
            className="btn-black-pill"
            style={{
              padding: '0.7rem 2.2rem',
              fontSize: '0.95rem',
              opacity: 0.8,
              cursor: 'default',
              display: 'inline-block',
            }}
          >
            Waiting...
          </span>
        )}
      </div>

      {/* Right Section: Player list with colored ball avatars */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: 'max-content' }}>
          {room.players.map((player) => {
            const color = getPlayerColor(player, room);
            const isMe = player.id === myPlayerId;
            return (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                {/* Small colored ball avatar per player */}
                <div style={{ width: 52, height: 52, flexShrink: 0 }}>
                  <BallAvatar size={52} followMouse={false} color={color} />
                </div>
                <span
                  style={{
                    fontSize: '1rem',
                    fontWeight: isMe ? 700 : 500,
                    color: '#111',
                  }}
                >
                  {player.name}
                  {player.isHost && (
                    <span style={{ marginLeft: '0.4rem', fontSize: '0.75rem', color: '#888' }}>
                      (host)
                    </span>
                  )}
                </span>
              </div>
            );
          })}

          {/* Empty placeholder slots */}
          {Array.from({ length: Math.max(0, room.maxPlayers - room.players.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                opacity: 0.3,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#e5e5e8',
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: '1rem', color: '#999' }}>Waiting...</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
