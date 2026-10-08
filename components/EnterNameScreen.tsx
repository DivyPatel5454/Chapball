'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BallAvatar } from './BallAvatar';

interface EnterNameScreenProps {
  initialName?: string;
  onSaveName: (name: string) => void;
}

export const EnterNameScreen: React.FC<EnterNameScreenProps> = ({
  initialName = '',
  onSaveName,
}) => {
  const [name, setName] = useState(initialName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSaveName(name.trim());
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#f7f7f9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4rem',
        }}
      >
        {/* Left Side: Avatar */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div layoutId="main-ball-avatar" transition={{ type: 'spring', stiffness: 260, damping: 25 }}>
            <BallAvatar size={340} followMouse={true} color="#0a0a0c" />
          </motion.div>
        </div>

        {/* Right Side: Input & Button */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', zIndex: 10, position: 'relative' }}>
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              pointerEvents: 'auto',
            }}
          >
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              maxLength={18}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #dcdce0',
                borderRadius: '999px',
                padding: '0.75rem 1.5rem',
                fontSize: '0.95rem',
                color: '#111111',
                outline: 'none',
                width: '240px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                cursor: 'text',
              }}
            />
            <button
              type="submit"
              onClick={(e) => {
                if (name.trim()) {
                  e.preventDefault();
                  onSaveName(name.trim());
                }
              }}
              disabled={!name.trim()}
              style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '999px',
                padding: '0.75rem 2rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                opacity: name.trim() ? 1 : 0.5,
                transition: 'all 0.2s ease',
              }}
            >
              Save
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};



