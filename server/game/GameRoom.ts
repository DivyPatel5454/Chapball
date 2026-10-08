import { Server } from 'socket.io';
import { GameRoom, Player, Team, GamePhase, RoomSettings } from '../../lib/types';
import { calculateHits, calculateArenaScale, remapPlayerPosition } from './collision';

export class Room {
  public data: GameRoom;
  public originalSettings: RoomSettings;
  public rematchRoomCode: string | null = null; // code of the staged rematch room
  private io: Server;
  private timer: NodeJS.Timeout | null = null;

  constructor(id: string, hostPlayer: Player, settings: RoomSettings, io: Server) {
    this.io = io;
    this.originalSettings = settings;
    this.data = {
      id,
      visibility: settings.visibility,
      hostId: hostPlayer.id,
      maxPlayers: settings.maxPlayers,
      teamMode: settings.teamMode,
      rounds: settings.rounds,
      currentRound: 1,
      countdownSeconds: settings.countdownSeconds,
      remainingCountdown: settings.countdownSeconds,
      phase: 'lobby',
      players: [hostPlayer],
      arena: {
        scale: 1.0,
        centerX: 0.5,
        centerY: 0.5,
        width: 1.0,
        height: 1.0,
      },
      createdAt: Date.now(),
    };
  }

  public addPlayer(player: Player): boolean {
    if (this.data.players.length >= this.data.maxPlayers) {
      return false;
    }
    if (this.data.phase !== 'lobby') {
      return false;
    }

    // Assign team if in team mode
    if (this.data.teamMode) {
      const countA = this.data.players.filter((p) => p.team === 'A').length;
      const countB = this.data.players.filter((p) => p.team === 'B').length;
      player.team = countA <= countB ? 'A' : 'B';
    }

    this.data.players.push(player);
    this.broadcastState();
    return true;
  }

  public removePlayer(playerId: string): void {
    const playerIndex = this.data.players.findIndex((p) => p.id === playerId);
    if (playerIndex !== -1) {
      const isHost = this.data.players[playerIndex].isHost;
      this.data.players.splice(playerIndex, 1);

      // Reassign host if host left
      if (isHost && this.data.players.length > 0) {
        this.data.players[0].isHost = true;
        this.data.hostId = this.data.players[0].id;
      }

      this.broadcastState();

      if (this.data.phase !== 'lobby') {
        this.checkWinConditions();
      }
    }
  }

  public updatePlacement(playerId: string, x: number, y: number, laserAngle: number): void {
    if (this.data.phase !== 'placement') return;
    const player = this.data.players.find((p) => p.id === playerId);
    if (!player || player.ready || player.eliminated) return;

    // Clamped normalized inside box [0, 1]
    player.x = Math.max(0.02, Math.min(0.98, x));
    player.y = Math.max(0.02, Math.min(0.98, y));
    player.laserAngle = laserAngle;

    // Send placement update only to this player or emit hidden state to room
    this.broadcastState();
  }


  public setReady(playerId: string): void {
    if (this.data.phase !== 'placement') return;
    const player = this.data.players.find((p) => p.id === playerId);
    if (!player || player.eliminated) return;

    player.ready = true;
    this.broadcastState();

    const activePlayers = this.data.players.filter((p) => !p.eliminated);
    const allReady = activePlayers.every((p) => p.ready);

    if (allReady) {
      this.clearCountdown();
      this.startReveal();
    }
  }

  public selectTeam(playerId: string, team: Team): void {
    if (this.data.phase !== 'lobby' || !this.data.teamMode) return;
    const player = this.data.players.find((p) => p.id === playerId);
    if (player) {
      player.team = team;
      this.broadcastState();
    }
  }

  public resetToLobby(): void {
    this.clearCountdown();
    this.data.phase = 'lobby';
    this.data.currentRound = 1;
    this.data.winnerTeam = undefined;
    this.data.winnerPlayerId = undefined;
    this.data.lastHits = undefined;
    this.data.arena = {
      scale: 1.0,
      centerX: 0.5,
      centerY: 0.5,
      width: 1.0,
      height: 1.0,
    };
    this.data.players.forEach((p) => {
      p.eliminated = false;
      p.ready = false;
      p.x = 0.5;
      p.y = 0.5;
      p.laserAngle = 0;
    });
    this.broadcastState();
  }

  public startGame(requestorId: string): boolean {
    if (requestorId !== this.data.hostId || this.data.phase !== 'lobby') {
      return false;
    }
    if (this.data.players.length < 2) {
      return false;
    }

    this.data.currentRound = 1;
    this.data.arena.scale = 1.0;
    this.data.players.forEach((p) => {
      p.eliminated = false;
      p.ready = false;
      // Default initial positions spread out in arena
      const angle = (Math.PI * 2 * this.data.players.indexOf(p)) / this.data.players.length;
      p.x = 0.5 + 0.3 * Math.cos(angle);
      p.y = 0.5 + 0.3 * Math.sin(angle);
      p.laserAngle = angle + Math.PI; // point toward center initially
    });

    this.startPlacementPhase();
    return true;
  }

  private startPlacementPhase(): void {
    this.data.phase = 'placement';
    this.data.remainingCountdown = this.data.countdownSeconds;
    this.data.players.forEach((p) => {
      p.ready = false;
    });

    this.broadcastState();
    this.startCountdown();
  }

  private startCountdown(): void {
    this.clearCountdown();
    this.timer = setInterval(() => {
      this.data.remainingCountdown -= 1;

      if (this.data.remainingCountdown <= 0) {
        this.clearCountdown();
        // Fallback for non-ready active players (Rule 12)
        this.data.players.forEach((p) => {
          if (!p.eliminated) {
            p.ready = true;
          }
        });
        this.startReveal();
      } else {
        this.io.to(this.data.id).emit('countdown', this.data.remainingCountdown);
      }
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private startReveal(): void {
    this.data.phase = 'revealing';
    this.broadcastState();

    // Perform collision calculation
    const { hits, eliminatedIds } = calculateHits(this.data.players, this.data.teamMode);
    this.data.lastHits = hits;

    // Apply eliminations simultaneously (Rule 17)
    this.data.players.forEach((p) => {
      if (eliminatedIds.includes(p.id)) {
        p.eliminated = true;
      }
    });

    // Reveal animation duration delay
    setTimeout(() => {
      this.data.phase = 'result';
      this.broadcastState();

      if (this.checkWinConditions()) {
        return;
      }

      // Transition to shrinking after 3 seconds
      setTimeout(() => {
        this.startShrinkingPhase();
      }, 3000);
    }, 2500);
  }

  private startShrinkingPhase(): void {
    this.data.phase = 'shrinking';

    const activeCount = this.data.players.filter((p) => !p.eliminated).length;
    const oldScale = this.data.arena.scale;
    const newScale = calculateArenaScale(activeCount, this.data.currentRound + 1);

    this.data.arena.scale = newScale;


    // Remap positions (Rule 23)
    this.data.players.forEach((p) => {
      if (!p.eliminated) {
        const remapped = remapPlayerPosition(p.x, p.y, oldScale, newScale);
        p.x = remapped.x;
        p.y = remapped.y;
      }
    });

    this.broadcastState();

    // After shrink animation finishes (2 seconds), proceed to next round
    setTimeout(() => {
      this.data.currentRound += 1;
      this.startPlacementPhase();
    }, 2000);
  }

  private checkWinConditions(): boolean {
    const activePlayers = this.data.players.filter((p) => !p.eliminated);

    if (this.data.teamMode) {
      const activeA = activePlayers.filter((p) => p.team === 'A');
      const activeB = activePlayers.filter((p) => p.team === 'B');

      if (activeA.length === 0 && activeB.length === 0) {
        this.endGame(null, undefined);
        return true;
      } else if (activeB.length === 0) {
        this.endGame('A', undefined);
        return true;
      } else if (activeA.length === 0) {
        this.endGame('B', undefined);
        return true;
      }
    } else {
      if (activePlayers.length <= 1) {
        const winner = activePlayers[0] ? activePlayers[0].id : undefined;
        this.endGame(null, winner);
        return true;
      }
    }

    return false;
  }

  private endGame(winnerTeam?: Team, winnerPlayerId?: string): void {
    this.data.phase = 'gameOver';
    this.data.winnerTeam = winnerTeam;
    this.data.winnerPlayerId = winnerPlayerId;
    this.clearCountdown();
    this.broadcastState();
  }

  public broadcastState(): void {
    // Hidden placement security (Rule 8):
    // During placement, each socket gets ONLY their own position/laserAngle!
    if (this.data.phase === 'placement') {
      this.data.players.forEach((p) => {
        const socketId = p.id;
        const sanitizedRoom: GameRoom = {
          ...this.data,
          players: this.data.players.map((other) => {
            if (other.id === p.id) {
              return other;
            }
            // Mask hidden player positions and lasers during placement!
            return {
              ...other,
              x: 0,
              y: 0,
              laserAngle: 0,
            };
          }),
        };
        this.io.to(socketId).emit('roomState', sanitizedRoom);
      });
    } else {
      this.io.to(this.data.id).emit('roomState', this.data);
    }
  }
}
