import { GameRoom, Player } from './types';

export const HOST_COLOR = '#0a0a0c';

export const NON_HOST_COLORS = [
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#10b981', // Emerald Green
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

export function getPlayerColor(player: Player, room: GameRoom): string {
  if (room.teamMode && room.phase !== 'lobby') {
    return player.team === 'A' ? '#8b5cf6' : '#ef4444';
  }
  if (player.isHost) {
    return HOST_COLOR;
  }
  const nonHostPlayers = room.players.filter((p) => !p.isHost);
  const nonHostIndex = nonHostPlayers.findIndex((p) => p.id === player.id);
  const idx = nonHostIndex >= 0 ? nonHostIndex : 0;
  return NON_HOST_COLORS[idx % NON_HOST_COLORS.length];
}
