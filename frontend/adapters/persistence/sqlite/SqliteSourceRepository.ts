/**
 * SQLite Source Repository
 *
 * ISourceRepository의 SQLite 구현체
 */

import type { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import type { SourceValidationResult } from '@/core/ports/in/ISourceService';
import { Source } from '@/core/domain/entities/Source';
import type { SourceType } from '@/core/domain/entities/Source';
import type { GitHubSourceConfig, GitHubValidationResult } from '@/core/domain/entities/GitHubSourceConfig';
import { getDatabase } from './database';
import type Database from 'better-sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

interface SourceRow {
  id: string;
  name: string;
  path: string;
  sourceType?: string;
  is_active: number;
  created_at: string;
  last_accessed: string | null;
}

export class SqliteSourceRepository implements ISourceRepository {
  private db: Database.Database;

  constructor(dbPath?: string) {
    this.db = getDatabase(dbPath);
  }

  /**
   * DB 행을 Source 엔티티로 변환
   */
  private rowToSource(row: SourceRow): Source {
    return Source.fromPersistence({
      id: row.id,
      name: row.name,
      path: row.path,
      sourceType: (row.sourceType as SourceType) || 'local',
      isActive: row.is_active === 1,
      createdAt: new Date(row.created_at),
      lastAccessed: row.last_accessed ? new Date(row.last_accessed) : undefined,
    });
  }

  /**
   * Source 엔티티를 DB 파라미터로 변환
   */
  private sourceToParams(source: Source): Record<string, unknown> {
    const json = source.toJSON();
    return {
      id: json.id,
      name: json.name,
      path: json.path,
      is_active: json.isActive ? 1 : 0,
      created_at: json.createdAt.toISOString(),
      last_accessed: json.lastAccessed?.toISOString() ?? null,
    };
  }

  async findAll(): Promise<Source[]> {
    const stmt = this.db.prepare(`
      SELECT id, name, path, is_active, created_at, last_accessed
      FROM sources
      ORDER BY created_at DESC
    `);

    const rows = stmt.all() as SourceRow[];
    return rows.map((row) => this.rowToSource(row));
  }

  async findById(id: string): Promise<Source | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, path, is_active, created_at, last_accessed
      FROM sources
      WHERE id = ?
    `);

    const row = stmt.get(id) as SourceRow | undefined;
    return row ? this.rowToSource(row) : null;
  }

  async findActive(): Promise<Source | null> {
    const stmt = this.db.prepare(`
      SELECT id, name, path, is_active, created_at, last_accessed
      FROM sources
      WHERE is_active = 1
      LIMIT 1
    `);

    const row = stmt.get() as SourceRow | undefined;
    return row ? this.rowToSource(row) : null;
  }

  async save(source: Source): Promise<void> {
    const params = this.sourceToParams(source);

    const stmt = this.db.prepare(`
      INSERT INTO sources (id, name, path, is_active, created_at, last_accessed)
      VALUES (@id, @name, @path, @is_active, @created_at, @last_accessed)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        path = excluded.path,
        is_active = excluded.is_active,
        last_accessed = excluded.last_accessed
    `);

    stmt.run(params);
  }

  async delete(id: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM sources WHERE id = ?');
    stmt.run(id);
  }

  async existsByPath(path: string): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM sources WHERE path = ? LIMIT 1');
    const row = stmt.get(path);
    return !!row;
  }

  async existsById(id: string): Promise<boolean> {
    const stmt = this.db.prepare('SELECT 1 FROM sources WHERE id = ? LIMIT 1');
    const row = stmt.get(id);
    return !!row;
  }

  async validatePath(sourcePath: string): Promise<SourceValidationResult> {
    const result: SourceValidationResult = {
      valid: false,
      path: sourcePath,
      exists: false,
      isDirectory: false,
      taskCount: 0,
    };

    try {
      const stats = await fs.stat(sourcePath);
      result.exists = true;
      result.isDirectory = stats.isDirectory();

      if (!result.isDirectory) {
        result.error = 'Path is not a directory';
        return result;
      }

      const files = await fs.readdir(sourcePath);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      result.taskCount = mdFiles.length;
      result.valid = true;

      return result;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        result.error = 'Directory does not exist';
      } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
        result.error = 'Permission denied';
      } else {
        result.error = String(error);
      }
      return result;
    }
  }

  async createDirectory(sourcePath: string): Promise<void> {
    await fs.mkdir(sourcePath, { recursive: true });
  }

  getDefaultTasksPath(): string {
    return path.join(process.cwd(), 'tasks');
  }

  async validateGitHubSource(config: GitHubSourceConfig): Promise<GitHubValidationResult> {
    const { GitHubApiAdapter } = await import('@/adapters/github/GitHubApiAdapter');
    const adapter = new GitHubApiAdapter();
    return adapter.validateConnection(config);
  }
}
