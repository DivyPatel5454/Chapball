'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getSocket } from '../lib/socket';
import { GameRoom, RoomSettings, Team } from '../lib/types';
import { EnterNameScreen } from '../components/EnterNameScreen';
import { RoomSetup } from '../components/RoomSetup';
import { Lobby } from '../components/Lobby';
import { GameArena } from '../components/GameArena';
import { BallAvatar } from '../components/BallAvatar';

export default function Home() {
  const [userName, setUserName] = useState<string>('');
  const [hasEnteredName, setHasEnteredName] = useState<boolean>(false);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load saved username from localStorage as default, but always show name screen on start
  useEffect(() => {
    const saved = localStorage.getItem('chapball_username');
    if (saved) {
      setUserName(saved);
    }
  }, []);

  // Connect socket and listen for server events
  useEffect(() => {
    const socket = getSocket();

    socket.on('connect', () => {
      setMyPlayerId(socket.id || '');
    });

    socket.on('roomState', (updatedRoom: GameRoom) => {
      setRoom(updatedRoom);
      setErrorMessage(null);
    });

    socket.on('error', (err: string) => {
      setErrorMessage(err);
    });

    socket.on('rematchJoined', (newRoomCode: string) => {
      // Server will emit a roomState right after; just clear error
      setErrorMessage(null);
    });

    return () => {
      socket.off('roomState');
      socket.off('error');
      socket.off('rematchJoined');
    };
  }, []);

  const handleSaveName = (name: string) => {
    setUserName(name);
    localStorage.setItem('chapball_username', name);
    setHasEnteredName(true);
  };

  const handleCreateRoom = (settings: RoomSettings) => {
    const socket = getSocket();
    socket.emit('createRoom', { name: userName, settings });
  };

  const handleJoinRoom = (roomCode: string) => {
    const socket = getSocket();
    socket.emit('joinRoom', { roomCode, name: userName });
  };

  const handleUpdatePlacement = (x: number, y: number, laserAngle: number) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('updatePlacement', { roomCode: room.id, x, y, laserAngle });
  };

  const handleSetReady = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('setReady', { roomCode: room.id });
  };

  const handleSelectTeam = (team: Team) => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('selectTeam', { roomCode: room.id, team });
  };

  const handleStartGame = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('startGame', { roomCode: room.id });
  };

  const handlePlayAgain = () => {
    if (!room) return;
    const socket = getSocket();
    socket.emit('requestPlayAgain', { roomCode: room.id });
  };

  // 1. First screen: Enter your name screen
  if (!hasEnteredName) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="enter-name"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', height: '100%' }}
        >
          <EnterNameScreen
            initialName={userName}
            onSaveName={handleSaveName}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // 2. Room Setup Screen
  if (!room) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="room-setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', height: '100%' }}
        >
          <RoomSetup
            userName={userName}
            onChangeName={() => setHasEnteredName(false)}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            error={errorMessage}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // 3. Lobby Phase
  if (room.phase === 'lobby') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="lobby"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', height: '100%' }}
        >
          <Lobby
            room={room}
            myPlayerId={myPlayerId}
            onSelectTeam={handleSelectTeam}
            onStartGame={handleStartGame}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // 4. In-Game Phases (Placement, Revealing, Result, Shrinking, GameOver)
  const me = room.players.find((p) => p.id === myPlayerId);

  return (
    <>
      {/* Main Fullscreen Game Arena */}
      <GameArena
        room={room}
        myPlayerId={myPlayerId}
        onUpdatePlacement={handleUpdatePlacement}
        onReady={handleSetReady}
      />

      {/* Spectator Warning Banner */}
      {me?.eliminated && room.phase !== 'gameOver' && (
        <div
          style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.6rem 1.4rem',
            borderRadius: '999px',
            fontSize: '0.9rem',
            fontWeight: 600,
            zIndex: 30,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          You were eliminated! Spectating...
        </div>
      )}

      {/* Game Over Modal */}
      {room.phase === 'gameOver' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '2.5rem',
              maxWidth: '420px',
              width: '90%',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <BallAvatar size={100} followMouse={true} />
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '1.2rem' }}>
              {room.teamMode
                ? room.winnerTeam
                  ? `Team ${room.winnerTeam} Victory!`
                  : 'Draw Game!'
                : room.winnerPlayerId
                ? `${room.players.find((p) => p.id === room.winnerPlayerId)?.name} Wins!`
                : 'Draw Game!'}
            </h2>
            <p style={{ color: '#666', marginTop: '0.5rem', marginBottom: '1rem', fontSize: '0.95rem' }}>
              Do you want to play again?
            </p>
            {room.rematchOptedIn && room.rematchOptedIn.length > 0 && (
              <p style={{
                fontSize: '0.85rem',
                color: '#10b981',
                fontWeight: 600,
                marginBottom: '0.75rem',
                padding: '0.5rem 1rem',
                background: '#f0fdf4',
                borderRadius: '999px',
                border: '1px solid #bbf7d0',
              }}>
                {room.rematchOptedIn.join(', ')} {room.rematchOptedIn.length === 1 ? 'wants' : 'want'} to play again!
              </p>
            )}
            <button
              className="save-btn"
              onClick={handlePlayAgain}
              style={{ width: '100%', padding: '0.8rem' }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

