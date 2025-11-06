import express from 'express';
import { googleAuthRedirect, googleAuthCallback, generateStateForUser, getSuggestionByToken } from '../controllers/google.controller.js';
import { verifyToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Mounting strategy: router defines root ('/') for redirect and '/callback' for callback.
// This lets the router be mounted at '/auth/google' (-> '/auth/google' and '/auth/google/callback')
// or at '/api/google' (-> '/api/google' and '/api/google/callback').
// Primary entry (e.g. GET /api/google)
router.get('/', googleAuthRedirect);
// Backwards-compatible paths some setups use: /api/google/auth
router.get('/auth', googleAuthRedirect);

// Callback handlers
// Do NOT require `verifyToken` here — Google will redirect back to this
// endpoint even when the user's cookie may not yet be present. The
// controller will attempt to identify the owner using the `state` token
// (preferred) and fall back to checking the cookie inside the handler.
router.get('/callback', googleAuthCallback);
// Backwards-compatible callback path: /api/google/auth/callback
router.get('/auth/callback', googleAuthCallback);

// Generate a short-lived state token for the logged-in user (frontend calls this)
// Protect this route so only logged-in users can request a state token.
router.get('/state', verifyToken, generateStateForUser);

// Fetch suggestion by one-time token (used by frontend after redirect)
router.get('/sync', getSuggestionByToken);

export default router;
