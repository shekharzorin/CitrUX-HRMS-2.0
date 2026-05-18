import { Server as SocketServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export class SocketService {
    private static io: SocketServer;
    // Map userId to their connected socket IDs to handle multiple tabs/devices
    private static userSockets = new Map<string, Set<string>>();

    static initialize(server: HttpServer) {
        this.io = new SocketServer(server, {
            cors: {
                origin: process.env.CLIENT_URL || 'http://localhost:5173',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });

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
            logger.info(`[SocketService] User Connected: ${userId} (Socket: ${socket.id})`);

            // Track user's active connections
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(socket.id);

            // Join Company Room (for company-wide broadcasts)
            const companyId = socket.data.user?.companyId;
            if (companyId) {
                socket.join(`company_${companyId}`);
            }

            socket.on('disconnect', () => {
                logger.info(`[SocketService] User Disconnected: ${userId} (Socket: ${socket.id})`);
                const userSocketSet = this.userSockets.get(userId);
                if (userSocketSet) {
                    userSocketSet.delete(socket.id);
                    if (userSocketSet.size === 0) {
                        this.userSockets.delete(userId);
                    }
                }
            });
        });

        logger.info('[SocketService] WebSocket server initialized and ready.');
    }

    /**
     * Send real-time notification to a specific user across all their active devices.
     */
    static sendToUser(userId: string, event: string, payload: any) {
        if (!this.io) return;
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            socketIds.forEach(socketId => {
                this.io.to(socketId).emit(event, payload);
            });
        }
    }

    /**
     * Broadcast an event to all connected users within a specific company.
     */
    static broadcastToCompany(companyId: string, event: string, payload: any) {
        if (!this.io) return;
        this.io.to(`company_${companyId}`).emit(event, payload);
    }
}
