/**
 * SQLite Database Initialization
 *
 * 데이터베이스 연결 및 스키마 초기화
 */

import Database from 'better-sqlite3';
import path from 'path';

const DEFAULT_DB_PATH = '.taskflow.db';

let db: Database.Database | null = null;

/**
 * 데이터베이스 스키마 초기화
 */
function initializeSchema(database: Database.Database): void {
  database.exec(`
    -- Sources 테이블
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      last_accessed TEXT
    );

    -- Config 테이블 (단일 행)
    CREATE TABLE IF NOT EXISTS config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      active_source_id TEXT,
      theme TEXT NOT NULL DEFAULT 'dark',
      sidebar_collapsed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (active_source_id) REFERENCES sources(id) ON DELETE SET NULL
    );

    -- AIWorkerConfig 테이블 (단일 행)
    CREATE TABLE IF NOT EXISTS ai_worker_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER NOT NULL DEFAULT 1,
      auto_start INTEGER NOT NULL DEFAULT 0,
      polling_interval INTEGER NOT NULL DEFAULT 30000,
      max_concurrent INTEGER NOT NULL DEFAULT 1,
      timeout INTEGER NOT NULL DEFAULT 600000,
      working_directory TEXT
    );

    -- 기본 Config 행 삽입 (없는 경우)
    INSERT OR IGNORE INTO config (id, theme, sidebar_collapsed) VALUES (1, 'dark', 0);

    -- 기본 AIWorkerConfig 행 삽입 (없는 경우)
    INSERT OR IGNORE INTO ai_worker_config (id, enabled, auto_start, polling_interval, max_concurrent, timeout)
    VALUES (1, 1, 0, 30000, 1, 600000);

    -- 인덱스
    CREATE INDEX IF NOT EXISTS idx_sources_is_active ON sources(is_active);
    CREATE INDEX IF NOT EXISTS idx_sources_path ON sources(path);
  `);
}

/**
 * 데이터베이스 연결 가져오기 (싱글톤)
 */
export function getDatabase(dbPath?: string): Database.Database {
  if (!db) {
    const resolvedPath = dbPath || path.resolve(process.cwd(), DEFAULT_DB_PATH);
    db = new Database(resolvedPath);

    // WAL 모드 활성화 (성능 향상)
    db.pragma('journal_mode = WAL');

    // 외래 키 제약 활성화
    db.pragma('foreign_keys = ON');

    // 스키마 초기화
    initializeSchema(db);
  }

  return db;
}

/**
 * 데이터베이스 연결 닫기
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * 데이터베이스 연결 리셋 (테스트용)
 */
export function resetDatabase(): void {
  closeDatabase();
}

/**
 * 인메모리 데이터베이스 생성 (테스트용)
 */
export function createInMemoryDatabase(): Database.Database {
  const memDb = new Database(':memory:');
  memDb.pragma('foreign_keys = ON');
  initializeSchema(memDb);
  return memDb;
}
