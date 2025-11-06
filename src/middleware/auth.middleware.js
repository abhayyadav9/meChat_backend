import jwt from 'jsonwebtoken';

// Middleware to verify JWT from cookie
export const verifyToken = (req, res, next) => {
  try {
    // try cookie first (recommended), fall back to Authorization header (Bearer <token>)
    let token = req.cookies?.token;
    if (!token) {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) {
      console.warn("verifyToken: no token found in cookies or Authorization header");
      return res.status(401).json({ message: 'Unauthorized, token missing' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user info to req for next middleware or controller
    req.user = decoded; // contains { userId, email, iat, exp }

    next(); // move to next route/controller
  } catch (err) {
    console.error(err);
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
