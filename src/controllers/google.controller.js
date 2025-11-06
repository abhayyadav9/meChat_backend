import { google } from 'googleapis';
import dotenv from 'dotenv';
import User from '../model/user.model.js';
import Contact from '../model/contact.model.js';
import Suggestion from '../model/suggestion.model.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google/callback'
);

// Redirect the user to Google's OAuth 2.0 consent screen
const googleAuthRedirect = (req, res) => {
  try {
    const scopes = ['https://www.googleapis.com/auth/contacts.readonly'];
    // allow a state param to be forwarded (used to tie the callback to a user)
    // Prefer state provided by the frontend, otherwise try to generate one
    // from the logged-in user's cookie (convenience for direct redirects).
    let state = req.query.state;
    if (!state) {
      try {
        const cookie = req.cookies?.token;
        if (cookie) {
          const decoded = jwt.verify(cookie, process.env.JWT_SECRET);
          if (decoded?.userId) {
            state = jwt.sign({ userId: decoded.userId, purpose: 'googleState' }, process.env.JWT_SECRET, { expiresIn: '10m' });
          }
        }
      } catch (err) {
        // ignore cookie/state generation errors — proceed without state
      }
    }

    const urlOptions = {
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
    };
    if (state) urlOptions.state = state;
    const url = oauth2Client.generateAuthUrl(urlOptions);
    return res.redirect(url);
  } catch (err) {
    console.error('Google auth redirect error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Generate a short-lived state token for a logged-in user
const generateStateForUser = (req, res) => {
  try {
    const { userId } = req.user; // set by verifyToken middleware
    const payload = { userId, purpose: 'googleState' };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
    return res.status(200).json({ state: token });
  } catch (err) {
    console.error('Error generating state token', err);
    return res.status(500).json({ message: 'Could not create state token' });
  }
};

// Handle callback from Google, exchange code for tokens, fetch contacts, and match users
const googleAuthCallback = async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ message: 'Missing code' });

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const people = google.people({ version: 'v1', auth: oauth2Client });
    const response = await people.people.connections.list({
      resourceName: 'people/me',
      pageSize: 2000,
      personFields: 'names,emailAddresses,phoneNumbers,photos',
    });

    const connections = response.data.connections || [];

    // Map to simple contacts
    const contacts = connections.map((c) => ({
      resourceName: c.resourceName,
      names: c.names?.map((n) => n.displayName) || [],
      emails: c.emailAddresses?.map((e) => e.value) || [],
      phones: c.phoneNumbers?.map((p) => p.value) || [],
      photo: c.photos?.[0]?.url || null,
    }));

    // Determine the owner (user who initiated the sync). Try state token first, then cookie JWT.
    let linkedUser = null;
    let ownerId = null; // will be set from state or cookie

    // If a state token was supplied (preferred), decode it and use the userId inside
    if (state) {
      try {
        const decoded = jwt.verify(state, process.env.JWT_SECRET);
        if (decoded?.purpose === 'googleState' && decoded.userId) {
          ownerId = decoded.userId;
          linkedUser = await User.findById(ownerId);
        }
      } catch (err) {
        console.warn('Invalid or expired state token provided');
      }
    }

    // If no owner from state, try decoding cookie (fallback)
    if (!ownerId) {
      try {
        const cookie = req.cookies?.token;
        if (cookie) {
          const decoded = jwt.verify(cookie, process.env.JWT_SECRET);
          if (decoded?.userId) {
            ownerId = decoded.userId;
            linkedUser = await User.findById(ownerId);
          }
        }
      } catch (err) {
        // ignore cookie decode errors
      }
    }

    // If we still don't have an owner, require login before storing contacts.
    if (!ownerId) {
      return res.status(400).json({ message: 'User not identified. Please log in before syncing contacts.' });
    }

    // Persist all fetched contacts to the database under the owner's account.
    await Contact.findOneAndUpdate(
      { userId: ownerId },
      { $set: { contacts } },
      { upsert: true, new: true }
    );

    // Collect emails and phones for matching
    const emails = contacts.flatMap((c) => c.emails || []);
    const phones = contacts.flatMap((c) => c.phones || []);

    // Find users in our database with matching emails or phones
    const matchedByEmail = emails.length
      ? await User.find({ email: { $in: emails } }).select('-password')
      : [];

    const matchedByPhone = phones.length
      ? await User.find({ phoneNumber: { $in: phones } }).select('-password')
      : [];

    // Merge and dedupe matched users
    const matched = [...matchedByEmail, ...matchedByPhone];
    const unique = [];
    const seen = new Set();
    matched.forEach((u) => {
      const id = String(u._id);
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(u);
      }
    });

    // Create a one-time suggestion token and store it (so frontend can fetch suggestions securely)
    const token = crypto.randomBytes(24).toString('hex');
    const suggestionDoc = new Suggestion({
      token,
      userId: linkedUser?._id || null,
      suggestions: unique.map((u) => u._id),
      contactsCount: contacts.length,
    });
    await suggestionDoc.save();

    // Redirect back to frontend with the token so the frontend can fetch the saved suggestions
    const frontend = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
    const redirectUrl = `${frontend.replace(/\/$/, '')}/contacts/sync?token=${token}`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('Google auth callback error:', err?.response?.data || err);
    return res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

// (exports at end of file)
// Controller to return a saved suggestion by token
const getSuggestionByToken = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ message: 'Missing token' });

    const suggestion = await Suggestion.findOne({ token }).populate('suggestions', '-password');
    if (!suggestion) return res.status(404).json({ message: 'Token not found or expired' });

    // If suggestion is linked to a user, require that the requester is logged in as that user
    if (suggestion.userId) {
      // check cookie JWT
      try {
        const cookie = req.cookies?.token;
        if (!cookie) return res.status(401).json({ message: 'Unauthorized' });
        const decoded = jwt.verify(cookie, process.env.JWT_SECRET);
        if (String(decoded.userId) !== String(suggestion.userId)) {
          return res.status(403).json({ message: 'Forbidden' });
        }
      } catch (err) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }

    // Return suggestions and a flag whether they were saved to the user's contacts
    return res.status(200).json({
      suggestions: suggestion.suggestions,
      contactsCount: suggestion.contactsCount,
      savedForUser: !!suggestion.userId,
    });
  } catch (err) {
    console.error('Error fetching suggestion', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export { googleAuthRedirect, googleAuthCallback, generateStateForUser, getSuggestionByToken };
