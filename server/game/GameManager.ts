import { Server, Socket } from 'socket.io';
import { Room } from './GameRoom';
import { Player, RoomSettings } from '../../lib/types';

export class GameManager {
  private rooms: Map<string, Room> = new Map();
  private socketToRoom: Map<string, string> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  public createRoom(socket: Socket, playerName: string, settings: RoomSettings): string {
    const roomCode = this.generateRoomCode();
    const player: Player = {
      id: socket.id,
      name: playerName || 'Player 1',
      team: null,
      x: 0.5,
      y: 0.5,
      laserAngle: 0,
      ready: false,
      eliminated: false,
      connected: true,
      isHost: true,
    };

    const room = new Room(roomCode, player, settings, this.io);
    this.rooms.set(roomCode, room);
    this.socketToRoom.set(socket.id, roomCode);

    socket.join(roomCode);
    socket.join(socket.id); // Join individual channel for targeted hidden placement updates

    socket.emit('roomCreated', roomCode);
    room.broadcastState();
    return roomCode;
  }

  public joinRoom(socket: Socket, roomCode: string, playerName: string): boolean {
    const cleanCode = roomCode.trim().toUpperCase();
    const room = this.rooms.get(cleanCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return false;
    }

    const player: Player = {
      id: socket.id,
      name: playerName || `Player ${room.data.players.length + 1}`,
      team: null,
      x: 0.5,
      y: 0.5,
      laserAngle: 0,
      ready: false,
      eliminated: false,
      connected: true,
      isHost: false,
    };

    const success = room.addPlayer(player);
    if (success) {
      this.socketToRoom.set(socket.id, cleanCode);
      socket.join(cleanCode);
      socket.join(socket.id);
      room.broadcastState();
      return true;
    } else {
      socket.emit('error', 'Room is full or game has already started');
      return false;
    }
  }

  public handleDisconnect(socket: Socket): void {
    const roomCode = this.socketToRoom.get(socket.id);
    if (roomCode) {
      const room = this.rooms.get(roomCode);
      if (room) {
        room.removePlayer(socket.id);
        if (room.data.players.length === 0) {
          this.rooms.delete(roomCode);
        }
      }
      this.socketToRoom.delete(socket.id);
    }
  }

  public requestPlayAgain(socket: Socket, roomCode: string): void {
    const cleanCode = roomCode.trim().toUpperCase();
    const oldRoom = this.rooms.get(cleanCode);
    if (!oldRoom || oldRoom.data.phase !== 'gameOver') return;

    const playerInOldRoom = oldRoom.data.players.find((p) => p.id === socket.id);
    if (!playerInOldRoom) return;

    // Track opted-in player names for the Game Over screen counter
    if (!oldRoom.data.rematchOptedIn) oldRoom.data.rematchOptedIn = [];
    if (!oldRoom.data.rematchOptedIn.includes(playerInOldRoom.name)) {
      oldRoom.data.rematchOptedIn.push(playerInOldRoom.name);
      // Broadcast updated opt-in list to remaining players still in old room
      oldRoom.broadcastState();
    }

    // If a rematch room is already staged, join it
    if (oldRoom.rematchRoomCode) {
      const rematchRoom = this.rooms.get(oldRoom.rematchRoomCode);
      if (rematchRoom) {
        const newPlayer: Player = {
          id: socket.id,
          name: playerInOldRoom.name,
          team: null,
          x: 0.5,
          y: 0.5,
          laserAngle: 0,
          ready: false,
          eliminated: false,
          connected: true,
          isHost: false,
        };
        const success = rematchRoom.addPlayer(newPlayer);
        if (success) {
          this.socketToRoom.set(socket.id, oldRoom.rematchRoomCode);
          socket.leave(cleanCode);
          socket.join(oldRoom.rematchRoomCode);
          socket.join(socket.id);
          socket.emit('rematchJoined', oldRoom.rematchRoomCode);
          rematchRoom.broadcastState();
        } else {
          socket.emit('error', 'Rematch room is full');
        }
        return;
      }
    }

    // First clicker — create the rematch room
    const newRoomCode = this.generateRoomCode();
    const hostPlayer: Player = {
      id: socket.id,
      name: playerInOldRoom.name,
      team: null,
      x: 0.5,
      y: 0.5,
      laserAngle: 0,
      ready: false,
      eliminated: false,
      connected: true,
      isHost: true,
    };

    const settings = oldRoom.originalSettings;
    const newRoom = new Room(newRoomCode, hostPlayer, settings, this.io);
    this.rooms.set(newRoomCode, newRoom);
    oldRoom.rematchRoomCode = newRoomCode; // link old room → rematch room

    this.socketToRoom.set(socket.id, newRoomCode);
    socket.leave(cleanCode);
    socket.join(newRoomCode);
    socket.join(socket.id);

    socket.emit('rematchJoined', newRoomCode);
    newRoom.broadcastState();
  }


  public getRoom(roomCode: string): Room | undefined {
    return this.rooms.get(roomCode);
  }

  public getPublicRooms() {
    const list: Array<{ id: string; players: number; maxPlayers: number }> = [];
    this.rooms.forEach((room, code) => {
      if (room.data.visibility === 'public' && room.data.phase === 'lobby') {
        list.push({
          id: code,
          players: room.data.players.length,
          maxPlayers: room.data.maxPlayers,
        });
      }
    });
    return list;
  }
}

