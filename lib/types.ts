export type Team = 'A' | 'B' | null;

export type GamePhase =
  | 'lobby'
  | 'placement'
  | 'revealing'
  | 'result'
  | 'shrinking'
  | 'gameOver';

export interface Player {
  id: string;
  name: string;
  team: Team;
  x: number; // normalized 0.0 -> 1.0
  y: number; // normalized 0.0 -> 1.0
  laserAngle: number; // in radians (0 to 2*PI)
  ready: boolean;
  eliminated: boolean;
  connected: boolean;
  isHost: boolean;
}

export interface ArenaState {
  scale: number; // 1.0 = full size
  centerX: number; // 0.5 default
  centerY: number; // 0.5 default
  width: number; // normalized width inside box
  height: number; // normalized height inside box
}

export interface GameRoom {
  id: string;
  visibility: 'public' | 'private';
  hostId: string;
  maxPlayers: number;
  teamMode: boolean;
  rounds: number;
  currentRound: number;
  countdownSeconds: number;
  remainingCountdown: number;
  phase: GamePhase;
  players: Player[];
  arena: ArenaState;
  createdAt: number;
  winnerTeam?: Team;
  winnerPlayerId?: string;
  lastHits?: HitRecord[];
  rematchOptedIn?: string[]; // player names who clicked Play Again
}

export interface HitRecord {
  shooterId: string;
  targetId: string;
  shooterName: string;
  targetName: string;
}

export interface RoomSettings {
  maxPlayers: number;
  teamMode: boolean;
  rounds: number;
  countdownSeconds: number;
  visibility: 'public' | 'private';
}
