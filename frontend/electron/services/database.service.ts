/**
 * Database Service for Electron Main Process
 *
 * SQLite 데이터베이스 연결 및 관리
 * userData 디렉토리에 DB 파일 저장
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { safeLog } from '../lib/safeConsole';

const DB_FILENAME = 'taskflow.db';

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

    -- WindowState 테이블 (윈도우 상태 저장)
    CREATE TABLE IF NOT EXISTS window_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      x INTEGER,
      y INTEGER,
      width INTEGER NOT NULL DEFAULT 1400,
      height INTEGER NOT NULL DEFAULT 900,
      is_maximized INTEGER NOT NULL DEFAULT 0
    );

    -- 기본 Config 행 삽입 (없는 경우)
    INSERT OR IGNORE INTO config (id, theme, sidebar_collapsed) VALUES (1, 'dark', 0);

    -- 기본 AIWorkerConfig 행 삽입 (없는 경우)
    INSERT OR IGNORE INTO ai_worker_config (id, enabled, auto_start, polling_interval, max_concurrent, timeout)
    VALUES (1, 1, 0, 30000, 1, 600000);

    -- 기본 WindowState 행 삽입 (없는 경우)
    INSERT OR IGNORE INTO window_state (id, width, height, is_maximized)
    VALUES (1, 1400, 900, 0);

    -- 인덱스
    CREATE INDEX IF NOT EXISTS idx_sources_is_active ON sources(is_active);
    CREATE INDEX IF NOT EXISTS idx_sources_path ON sources(path);
  `);
}

/**
 * 데이터베이스 경로 가져오기
 */
export function getDatabasePath(): string {
  // Electron app.getPath는 app ready 후에만 사용 가능
  const userDataPath = app.getPath('userData');
  return path.join(userDataPath, DB_FILENAME);
}

/**
 * 데이터베이스 연결 가져오기 (싱글톤)
 */
export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = getDatabasePath();

    safeLog('[DatabaseService] Initializing database at:', dbPath);

    db = new Database(dbPath);

    // WAL 모드 활성화 (성능 향상)
    db.pragma('journal_mode = WAL');

    // 외래 키 제약 활성화
    db.pragma('foreign_keys = ON');

    // 스키마 초기화
    initializeSchema(db);

    safeLog('[DatabaseService] Database initialized successfully');
  }

  return db;
}

/**
 * 데이터베이스 연결 닫기
 */
export function closeDatabase(): void {
  if (db) {
    safeLog('[DatabaseService] Closing database connection');
    db.close();
    db = null;
  }
}

/**
 * 데이터베이스 연결 상태 확인
 */
export function isDatabaseConnected(): boolean {
  return db !== null;
}

/**
 * 데이터베이스 리셋 (테스트용)
 */
export function resetDatabase(): void {
  closeDatabase();
}

// Export Database type for type hints
export type { Database };
