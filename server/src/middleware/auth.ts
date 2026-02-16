import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'antigravity-secret-key-1337';

/** Valid user roles */
export type UserRole = 'user' | 'admin' | 'streamer' | 'creator';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
        role: UserRole;
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
 * Middleware factory to restrict access to specific roles.
 */
export const authorizeRole = (...allowedRoles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user?.role || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: `Access restricted to: ${allowedRoles.join(', ')}` });
        }
        next();
    };
};

/** Shortcut: Admin only */
export const authorizeAdmin = authorizeRole('admin');

/**
 * Generate a JWT token for a user.
 */
export const generateUserToken = (user: { id: string; username: string; role: UserRole }) => {
    return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};
