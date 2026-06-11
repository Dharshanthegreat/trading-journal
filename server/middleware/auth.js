import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tradezella_secret_key_change_in_production';

export function authenticateToken(req, res, next) {
  // Check cookie first, then Authorization header
  const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, displayName: user.display_name },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export { JWT_SECRET };
