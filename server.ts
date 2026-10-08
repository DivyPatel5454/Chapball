import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import next from 'next';
import { GameManager } from './server/game/GameManager';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(() => {
  const app = express();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
    },
  });

  const gameManager = new GameManager(io);

  io.on('connection', (socket) => {
    socket.on('createRoom', ({ name, settings }) => {
      gameManager.createRoom(socket, name, settings);
    });

    socket.on('joinRoom', ({ roomCode, name }) => {
      gameManager.joinRoom(socket, roomCode, name);
    });

    socket.on('updatePlacement', ({ roomCode, x, y, laserAngle }) => {
      const room = gameManager.getRoom(roomCode);
      if (room) {
        room.updatePlacement(socket.id, x, y, laserAngle);
      }
    });

    socket.on('setReady', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (room) {
        room.setReady(socket.id);
      }
    });

    socket.on('selectTeam', ({ roomCode, team }) => {
      const room = gameManager.getRoom(roomCode);
      if (room) {
        room.selectTeam(socket.id, team);
      }
    });

    socket.on('startGame', ({ roomCode }) => {
      const room = gameManager.getRoom(roomCode);
      if (room) {
        room.startGame(socket.id);
      }
    });

    socket.on('requestPlayAgain', ({ roomCode }) => {
      gameManager.requestPlayAgain(socket, roomCode);
    });

    socket.on('getPublicRooms', () => {
      socket.emit('publicRoomsList', gameManager.getPublicRooms());
    });

    socket.on('disconnect', () => {
      gameManager.handleDisconnect(socket);
    });
  });

  app.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(port, () => {
    console.log(`> Chapball server running at http://${hostname}:${port}`);
  });
});
