import http from "http";
import express from 'express';
import connectDb from './src/config/db.js';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Routes
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import googleRoutes from './src/routes/google.routes.js';
import invitationRoutes from './src/routes/invitation.routes.js';
import messageRoutes from './src/routes/message.routes.js';
import chatRoutes from './src/routes/chat.routes.js';

// Socket.IO setup
import { setupSocket } from './src/config/socket.js';

dotenv.config();

const app = express();

// Trust proxy for App Service / reverse proxies
app.set('trust proxy', true);

// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_ORIGIN || 'https://me-chat-one.vercel.app',
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Test route
app.get('/', (req, res) => res.send('Hello World!'));

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/google', googleRoutes);
app.use('/auth/google', googleRoutes); // legacy path if needed

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
setupSocket(server);

// Start server AFTER DB is connected
const PORT = process.env.PORT || 8080;

const startServer = async () => {
    try {
        await connectDb(); // Ensure DB connection before starting server
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to connect to DB:", err);
        process.exit(1); // Exit if DB connection fails
    }
};

startServer();
