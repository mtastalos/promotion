import { User } from '../types/models';
import { BaseRepository } from './base.repository';

export class UserRepository extends BaseRepository {
  async findById(id: string): Promise<User | null> {
    return this.queryOne<User>(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.queryOne<User>(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
  }

  async create(email: string, passwordHash: string): Promise<User> {
    const user = await this.queryOne<User>(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING *`,
      [email, passwordHash]
    );
    return user!;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [passwordHash, id]
    );
  }
}

export const userRepository = new UserRepository();
