import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity-secret-key-1337';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: string;
    };
}

/**
 * Middleware to verify JWT token.
 */
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

/**
 * Middleware to restrict access to Admins only.
 */
export const authorizeAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

/**
 * Generate a JWT token for a user.
 */
export const generateUserToken = (user: { id: string; username: string; role: string }) => {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};
