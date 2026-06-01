import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { connection } from '../queues/index';
import logger from '../utils/logger';

export class SocketService {
    private static io: SocketServer;

    static initialize(server: HttpServer) {
        this.io = new SocketServer(server, {
            cors: {
                origin: process.env.CLIENT_URL?.includes(',')
                    ? process.env.CLIENT_URL.split(',')
                    : (process.env.CLIENT_URL || 'http://localhost:5173'),
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

        // Redis adapter so emits/broadcasts reach clients connected to ANY
        // instance. Without this, rooms only work within a single process and
        // notifications silently fail under horizontal scaling.
        const pubClient = connection.duplicate();
        const subClient = connection.duplicate();
        this.io.adapter(createAdapter(pubClient, subClient));
        pubClient.on('error', (err) => logger.error(`[SocketService] pub client error: ${err.message}`));
        subClient.on('error', (err) => logger.error(`[SocketService] sub client error: ${err.message}`));

        // Socket Authentication Middleware
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.query.token;
            if (!token) {
                return next(new Error('Authentication Error: Token missing'));
            }

            jwt.verify(token, process.env.JWT_SECRET as string, (err: any, decoded: any) => {
                if (err) return next(new Error('Authentication Error: Invalid token'));
                socket.data.user = decoded; // { userId, role, companyId }
                next();
            });
        });

        this.io.on('connection', (socket: Socket) => {
            const userId = socket.data.user?.userId;
            const companyId = socket.data.user?.companyId;
            logger.info(`[SocketService] User Connected: ${userId} (Socket: ${socket.id})`);

            // Join per-user and per-company rooms. Room membership is tracked by
            // the Redis adapter across instances, so we no longer need an
            // in-memory Map (which only knew about this process's sockets).
            if (userId) socket.join(`user_${userId}`);
            if (companyId) socket.join(`company_${companyId}`);

            socket.on('disconnect', () => {
                logger.info(`[SocketService] User Disconnected: ${userId} (Socket: ${socket.id})`);
            });
        });

        logger.info('[SocketService] WebSocket server initialized with Redis adapter.');
    }

    /**
     * Send a real-time event to a specific user across all their devices and
     * across all server instances (delivered via the per-user room).
     */
    static sendToUser(userId: string, event: string, payload: any) {
        if (!this.io) return;
        this.io.to(`user_${userId}`).emit(event, payload);
    }

    /**
     * Broadcast an event to all connected users within a specific company,
     * across all server instances.
     */
    static broadcastToCompany(companyId: string, event: string, payload: any) {
        if (!this.io) return;
        this.io.to(`company_${companyId}`).emit(event, payload);
    }
}
