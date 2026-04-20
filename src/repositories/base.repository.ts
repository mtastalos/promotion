import { Pool, PoolClient, QueryResult } from 'pg';
import { pool } from '../config/db';

export class BaseRepository {
  protected pool: Pool;

  constructor() {
    this.pool = pool;
  }

  protected async query<T>(
    sql: string,
    params?: unknown[],
    client?: PoolClient
  ): Promise<QueryResult<T>> {
    const executor = client ?? this.pool;
    return executor.query<T>(sql, params);
  }

  protected async queryOne<T>(
    sql: string,
    params?: unknown[],
    client?: PoolClient
  ): Promise<T | null> {
    const result = await this.query<T>(sql, params, client);
    return result.rows[0] ?? null;
  }

  protected async queryMany<T>(
    sql: string,
    params?: unknown[],
    client?: PoolClient
  ): Promise<T[]> {
    const result = await this.query<T>(sql, params, client);
    return result.rows;
  }

  protected async count(
    sql: string,
    params?: unknown[],
    client?: PoolClient
  ): Promise<number> {
    const result = await this.query<{ count: string }>(sql, params, client);
    return parseInt(result.rows[0]?.count ?? '0', 10);
  }
}
