'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RoomSettings } from '../lib/types';
import { BallAvatar } from './BallAvatar';

interface RoomSetupProps {
  userName: string;
  onChangeName: () => void;
  onCreateRoom: (settings: RoomSettings) => void;
  onJoinRoom: (code: string) => void;
  error?: string | null;
}

export const RoomSetup: React.FC<RoomSetupProps> = ({
  userName,
  onChangeName,
  onCreateRoom,
  onJoinRoom,
  error,
}) => {
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [joinCode, setJoinCode] = useState('');

  // Settings state matching Image 1 defaults: Player=8, Team=0, Round=6, Countdown=60s, Room=Private
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [teamMode, setTeamMode] = useState(false);
  const [rounds, setRounds] = useState(6);
  const [countdownSeconds, setCountdownSeconds] = useState(60);
  const [visibility, setVisibility] = useState<'public' | 'private'>('private');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom({
      maxPlayers,
      teamMode,
      rounds,
      countdownSeconds,
      visibility,
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      onJoinRoom(joinCode.trim());
    }
  };

  return (
    <div className="macbook-screen">
      {/* Left Pane: Ball Avatar + User Name below */}
      <div className="left-pane" style={{ flexDirection: 'column', gap: '1.5rem' }}>
        <motion.div layoutId="main-ball-avatar" transition={{ type: 'spring', stiffness: 260, damping: 25 }}>
          <BallAvatar size={340} followMouse={true} color="#0a0a0c" />
        </motion.div>
        <div style={{ textAlign: 'center' }}>
          <h2
            style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111', cursor: 'pointer' }}
            onClick={() => setMode('menu')}
            title="Click to back to menu"
          >
            {userName}
          </h2>
        </div>
      </div>

      {/* Right Pane: Action Buttons, Create Grid, or Join Input */}
      <div className="right-pane">
        {error && (
          <div style={{ position: 'absolute', top: '2rem', right: '8vw', background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1.25rem', borderRadius: '12px', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {/* Initial Menu View */}
        {mode === 'menu' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <button className="btn-black-pill" onClick={() => setMode('join')}>
              Join Room
            </button>
            <button className="btn-white-pill" onClick={() => setMode('create')}>
              Create Room
            </button>
          </div>
        )}

        {/* Create Room View - Image 1 Grid */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="create-room-grid">
            <div className="form-field">
              <label className="field-label">Player</label>
              <div className="select-container">
                <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">Countdown</label>
              <div className="select-container">
                <select value={countdownSeconds} onChange={(e) => setCountdownSeconds(Number(e.target.value))}>
                  <option value={30}>30s</option>
                  <option value={45}>45s</option>
                  <option value={60}>60s</option>
                  <option value={90}>90s</option>
                </select>
              </div>
            </div>

            <div className="form-field" style={{ gridColumn: 'span 2', marginTop: '0.5rem' }}>
              <button type="submit" className="save-btn" style={{ width: '100%', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Create Room
              </button>
            </div>
          </form>
        )}


        {/* Join Room View - Image 2 Horizontal Input */}
        {mode === 'join' && (
          <form onSubmit={handleJoin} className="name-input-group">
            <input
              type="text"
              className="name-input"
              placeholder="Enter room code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              autoFocus
            />
            <button type="submit" className="save-btn" disabled={!joinCode.trim()}>
              Done
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
