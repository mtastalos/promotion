import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { userRepository } from '../repositories/user.repository';
import { User } from '../types/models';

const BCRYPT_ROUNDS = 12;

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface TokenPayload {
  sub: string;
  email: string;
}

function signAccess(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions);
}

function signRefresh(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
}

export const authService = {
  async register(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw Object.assign(new Error('Email already in use'), { statusCode: 409 });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await userRepository.create(email, passwordHash);

    const payload: TokenPayload = { sub: user.id, email: user.email };
    const tokens: AuthTokens = {
      access_token: signAccess(payload),
      refresh_token: signRefresh(payload),
    };

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  },

  async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; tokens: AuthTokens }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw Object.assign(new Error('Invalid credentials'), { statusCode: 401 });
    }

    const payload: TokenPayload = { sub: user.id, email: user.email };
    const tokens: AuthTokens = {
      access_token: signAccess(payload),
      refresh_token: signRefresh(payload),
    };

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, tokens };
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: TokenPayload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as TokenPayload;
    } catch {
      throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 });
    }

    const user = await userRepository.findById(payload.sub);
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 401 });
    }

    const newPayload: TokenPayload = { sub: user.id, email: user.email };
    return {
      access_token: signAccess(newPayload),
      refresh_token: signRefresh(newPayload),
    };
  },

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch {
      throw Object.assign(new Error('Invalid access token'), { statusCode: 401 });
    }
  },
};
