# Hexagonal Architecture Design

## TaskFlow - 헥사고널 아키텍처 리팩토링

---

**Version:** 1.0
**Created:** 2026-01-12
**Status:** In Progress
**Branch:** feature/hexagonal-architecture

---

## 개요

현재 TaskFlow의 데이터 저장 로직을 헥사고널 아키텍처(Ports & Adapters)로 리팩토링하여,
다양한 저장소 백엔드(File, SQLite, PostgreSQL 등)로 유연하게 확장 가능한 구조를 만듭니다.

### 목표

1. **저장소 독립성**: 비즈니스 로직이 특정 저장소 구현에 의존하지 않음
2. **확장성**: SQLite, PostgreSQL 등 새로운 저장소를 쉽게 추가
3. **테스트 용이성**: Mock Repository로 단위 테스트 가능
4. **점진적 마이그레이션**: 기존 코드를 단계적으로 전환

---

## 현재 구조 분석

### 데이터 저장 현황

| 데이터 | 저장 방식 | 파일/위치 |
|--------|----------|-----------|
| Config (Sources, Theme, AI Worker) | JSON 파일 | `.taskflow.config.json` |
| Tasks | 마크다운 파일 | `{source.path}/*.md` |

### 현재 의존 관계

```
┌─────────────────────────────────────────────────────────────┐
│                      API Routes / Hooks                      │
│   (app/api/*, hooks/useConfig.ts, hooks/useTasks.ts)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Library Functions                        │
│       (lib/config.ts, lib/fileSystem.ts)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    File System (fs)                          │
│     (.taskflow.config.json, tasks/*.md)                     │
└─────────────────────────────────────────────────────────────┘
```

**문제점**:
- 비즈니스 로직이 파일 시스템에 직접 의존
- 다른 저장소로 전환하려면 대규모 수정 필요
- 테스트 시 실제 파일 시스템 필요

---

## 헥사고널 아키텍처 설계

### 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              Driving Side                                │
│                    (API Routes, Hooks, Components)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            INPUT PORTS                                   │
│                         (Use Case Interfaces)                            │
│   ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐   │
│   │ IConfigService  │ │ ISourceService  │ │ IAIWorkerConfigService  │   │
│   └─────────────────┘ └─────────────────┘ └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          APPLICATION CORE                                │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      DOMAIN LAYER                                │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │    │
│  │  │SourceEntity  │ │ ConfigEntity │ │ AIWorkerConfigEntity     │ │    │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    APPLICATION SERVICES                          │    │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │    │
│  │  │ConfigService │ │SourceService│ │ AIWorkerConfigService    │ │    │
│  │  └──────────────┘ └──────────────┘ └──────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           OUTPUT PORTS                                   │
│                      (Repository Interfaces)                             │
│   ┌─────────────────────┐ ┌─────────────────────────────────────────┐   │
│   │ IConfigRepository   │ │ ISourceRepository                       │   │
│   └─────────────────────┘ └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              ADAPTERS                                    │
│                         (Driven Side)                                    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    File Adapter (Current)                        │    │
│  │  ┌─────────────────────────┐ ┌─────────────────────────────┐    │    │
│  │  │ FileConfigRepository    │ │ FileSourceRepository        │    │    │
│  │  │ (.taskflow.config.json) │ │ (.taskflow.config.json)     │    │    │
│  │  └─────────────────────────┘ └─────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    SQLite Adapter (Future)                       │    │
│  │  ┌─────────────────────────┐ ┌─────────────────────────────┐    │    │
│  │  │ SQLiteConfigRepository  │ │ SQLiteSourceRepository      │    │    │
│  │  └─────────────────────────┘ └─────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                  PostgreSQL Adapter (Future)                     │    │
│  │  ┌─────────────────────────┐ ┌─────────────────────────────┐    │    │
│  │  │ PgConfigRepository      │ │ PgSourceRepository          │    │    │
│  │  └─────────────────────────┘ └─────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 디렉토리 구조

```
frontend/
├── core/                           # 헥사고널 아키텍처 핵심
│   ├── domain/                     # 도메인 레이어
│   │   ├── entities/               # 도메인 엔티티
│   │   │   ├── Source.ts
│   │   │   ├── Config.ts
│   │   │   └── AIWorkerConfig.ts
│   │   └── index.ts
│   │
│   ├── ports/                      # 포트 (인터페이스)
│   │   ├── in/                     # Input Ports (Use Cases)
│   │   │   ├── IConfigService.ts
│   │   │   ├── ISourceService.ts
│   │   │   └── index.ts
│   │   ├── out/                    # Output Ports (Repositories)
│   │   │   ├── IConfigRepository.ts
│   │   │   ├── ISourceRepository.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── application/                # 애플리케이션 서비스
│   │   ├── ConfigService.ts
│   │   ├── SourceService.ts
│   │   └── index.ts
│   │
│   └── index.ts
│
├── adapters/                       # 어댑터 (구현체)
│   ├── persistence/                # 저장소 어댑터
│   │   ├── file/                   # 파일 기반 (현재)
│   │   │   ├── FileConfigRepository.ts
│   │   │   ├── FileSourceRepository.ts
│   │   │   └── index.ts
│   │   ├── sqlite/                 # SQLite (향후)
│   │   │   ├── SQLiteConfigRepository.ts
│   │   │   ├── SQLiteSourceRepository.ts
│   │   │   └── index.ts
│   │   ├── postgresql/             # PostgreSQL (향후)
│   │   │   └── ...
│   │   └── index.ts
│   └── index.ts
│
├── infrastructure/                 # 인프라 설정
│   ├── container.ts                # DI 컨테이너
│   ├── factory.ts                  # Repository Factory
│   └── index.ts
│
├── lib/                            # 기존 라이브러리 (점진적 마이그레이션)
├── hooks/                          # React Hooks
├── components/                     # UI 컴포넌트
└── app/                            # Next.js App Router
```

---

## 상세 설계

### 1. Domain Entities

#### Source Entity

```typescript
// core/domain/entities/Source.ts

export interface SourceProps {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessed?: Date;
}

export class Source {
  private constructor(private props: SourceProps) {}

  static create(props: Omit<SourceProps, 'id' | 'createdAt'>): Source {
    return new Source({
      ...props,
      id: `source-${Date.now()}`,
      createdAt: new Date(),
    });
  }

  static fromPersistence(props: SourceProps): Source {
    return new Source(props);
  }

  get id(): string { return this.props.id; }
  get name(): string { return this.props.name; }
  get path(): string { return this.props.path; }
  get isActive(): boolean { return this.props.isActive; }
  get createdAt(): Date { return this.props.createdAt; }
  get lastAccessed(): Date | undefined { return this.props.lastAccessed; }

  activate(): void {
    this.props.isActive = true;
    this.props.lastAccessed = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  updateName(name: string): void {
    this.props.name = name;
  }

  toJSON(): SourceProps {
    return { ...this.props };
  }
}
```

#### Config Entity

```typescript
// core/domain/entities/Config.ts

export interface ConfigProps {
  activeSourceId: string | null;
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
}

export class Config {
  private constructor(private props: ConfigProps) {}

  static create(props?: Partial<ConfigProps>): Config {
    return new Config({
      activeSourceId: props?.activeSourceId ?? null,
      theme: props?.theme ?? 'dark',
      sidebarCollapsed: props?.sidebarCollapsed ?? false,
    });
  }

  get activeSourceId(): string | null { return this.props.activeSourceId; }
  get theme(): 'dark' | 'light' { return this.props.theme; }
  get sidebarCollapsed(): boolean { return this.props.sidebarCollapsed; }

  setActiveSource(sourceId: string | null): void {
    this.props.activeSourceId = sourceId;
  }

  toggleSidebar(): void {
    this.props.sidebarCollapsed = !this.props.sidebarCollapsed;
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.props.theme = theme;
  }

  toJSON(): ConfigProps {
    return { ...this.props };
  }
}
```

### 2. Output Ports (Repository Interfaces)

```typescript
// core/ports/out/ISourceRepository.ts

import { Source } from '@/core/domain/entities/Source';

export interface ISourceRepository {
  findAll(): Promise<Source[]>;
  findById(id: string): Promise<Source | null>;
  findActive(): Promise<Source | null>;
  save(source: Source): Promise<void>;
  delete(id: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

```typescript
// core/ports/out/IConfigRepository.ts

import { Config } from '@/core/domain/entities/Config';
import { AIWorkerConfig } from '@/core/domain/entities/AIWorkerConfig';

export interface IConfigRepository {
  load(): Promise<Config>;
  save(config: Config): Promise<void>;

  // AI Worker Config
  loadAIWorkerConfig(): Promise<AIWorkerConfig>;
  saveAIWorkerConfig(config: AIWorkerConfig): Promise<void>;
}
```

### 3. Input Ports (Use Case Interfaces)

```typescript
// core/ports/in/ISourceService.ts

import { Source } from '@/core/domain/entities/Source';

export interface AddSourceDTO {
  name: string;
  path: string;
}

export interface UpdateSourceDTO {
  name?: string;
  path?: string;
}

export interface SourceValidationResult {
  valid: boolean;
  path: string;
  exists: boolean;
  isDirectory: boolean;
  taskCount: number;
  error?: string;
}

export interface ISourceService {
  getAllSources(): Promise<Source[]>;
  getSourceById(id: string): Promise<Source | null>;
  getActiveSource(): Promise<Source | null>;
  addSource(dto: AddSourceDTO): Promise<Source>;
  updateSource(id: string, dto: UpdateSourceDTO): Promise<Source>;
  deleteSource(id: string): Promise<void>;
  setActiveSource(id: string): Promise<void>;
  validatePath(path: string): Promise<SourceValidationResult>;
}
```

### 4. Application Services

```typescript
// core/application/SourceService.ts

import { Source } from '@/core/domain/entities/Source';
import { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import { ISourceService, AddSourceDTO, UpdateSourceDTO, SourceValidationResult } from '@/core/ports/in/ISourceService';

export class SourceService implements ISourceService {
  constructor(
    private sourceRepository: ISourceRepository,
    private configRepository: IConfigRepository,
  ) {}

  async getAllSources(): Promise<Source[]> {
    return this.sourceRepository.findAll();
  }

  async getActiveSource(): Promise<Source | null> {
    return this.sourceRepository.findActive();
  }

  async addSource(dto: AddSourceDTO): Promise<Source> {
    // 중복 체크
    const exists = await this.sourceRepository.exists(dto.path);
    if (exists) {
      throw new Error('Source with this path already exists');
    }

    const sources = await this.sourceRepository.findAll();
    const source = Source.create({
      name: dto.name,
      path: dto.path,
      isActive: sources.length === 0, // 첫 번째면 활성화
    });

    await this.sourceRepository.save(source);

    // 첫 번째 Source면 Config에도 반영
    if (source.isActive) {
      const config = await this.configRepository.load();
      config.setActiveSource(source.id);
      await this.configRepository.save(config);
    }

    return source;
  }

  async setActiveSource(id: string): Promise<void> {
    const source = await this.sourceRepository.findById(id);
    if (!source) {
      throw new Error('Source not found');
    }

    // 기존 활성 Source 비활성화
    const currentActive = await this.sourceRepository.findActive();
    if (currentActive) {
      currentActive.deactivate();
      await this.sourceRepository.save(currentActive);
    }

    // 새 Source 활성화
    source.activate();
    await this.sourceRepository.save(source);

    // Config 업데이트
    const config = await this.configRepository.load();
    config.setActiveSource(id);
    await this.configRepository.save(config);
  }

  // ... 나머지 메서드들
}
```

### 5. File Adapter (현재 구현)

```typescript
// adapters/persistence/file/FileSourceRepository.ts

import { promises as fs } from 'fs';
import path from 'path';
import { Source, SourceProps } from '@/core/domain/entities/Source';
import { ISourceRepository } from '@/core/ports/out/ISourceRepository';

const CONFIG_FILE = path.join(process.cwd(), '.taskflow.config.json');

interface FileConfig {
  sources: SourceProps[];
  activeSourceId: string | null;
  theme: 'dark' | 'light';
  sidebarCollapsed: boolean;
  aiWorker: object;
}

export class FileSourceRepository implements ISourceRepository {
  private async readConfig(): Promise<FileConfig> {
    try {
      const content = await fs.readFile(CONFIG_FILE, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          sources: [],
          activeSourceId: null,
          theme: 'dark',
          sidebarCollapsed: false,
          aiWorker: {},
        };
      }
      throw error;
    }
  }

  private async writeConfig(config: FileConfig): Promise<void> {
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
  }

  async findAll(): Promise<Source[]> {
    const config = await this.readConfig();
    return config.sources.map(props =>
      Source.fromPersistence({
        ...props,
        createdAt: new Date(props.createdAt),
        lastAccessed: props.lastAccessed ? new Date(props.lastAccessed) : undefined,
      })
    );
  }

  async findById(id: string): Promise<Source | null> {
    const sources = await this.findAll();
    return sources.find(s => s.id === id) || null;
  }

  async findActive(): Promise<Source | null> {
    const config = await this.readConfig();
    if (!config.activeSourceId) return null;
    return this.findById(config.activeSourceId);
  }

  async save(source: Source): Promise<void> {
    const config = await this.readConfig();
    const index = config.sources.findIndex(s => s.id === source.id);

    const sourceData = {
      ...source.toJSON(),
      createdAt: source.createdAt.toISOString(),
      lastAccessed: source.lastAccessed?.toISOString(),
    };

    if (index >= 0) {
      config.sources[index] = sourceData;
    } else {
      config.sources.push(sourceData);
    }

    await this.writeConfig(config);
  }

  async delete(id: string): Promise<void> {
    const config = await this.readConfig();
    config.sources = config.sources.filter(s => s.id !== id);

    if (config.activeSourceId === id) {
      config.activeSourceId = config.sources[0]?.id || null;
    }

    await this.writeConfig(config);
  }

  async exists(path: string): Promise<boolean> {
    const sources = await this.findAll();
    return sources.some(s => s.path === path);
  }
}
```

### 6. Repository Factory & DI

```typescript
// infrastructure/factory.ts

import { ISourceRepository } from '@/core/ports/out/ISourceRepository';
import { IConfigRepository } from '@/core/ports/out/IConfigRepository';
import { FileSourceRepository } from '@/adapters/persistence/file/FileSourceRepository';
import { FileConfigRepository } from '@/adapters/persistence/file/FileConfigRepository';
// 향후 추가
// import { SQLiteSourceRepository } from '@/adapters/persistence/sqlite/SQLiteSourceRepository';
// import { PgSourceRepository } from '@/adapters/persistence/postgresql/PgSourceRepository';

export type PersistenceType = 'file' | 'sqlite' | 'postgresql';

export function createSourceRepository(type: PersistenceType = 'file'): ISourceRepository {
  switch (type) {
    case 'file':
      return new FileSourceRepository();
    case 'sqlite':
      throw new Error('SQLite adapter not implemented yet');
    case 'postgresql':
      throw new Error('PostgreSQL adapter not implemented yet');
    default:
      throw new Error(`Unknown persistence type: ${type}`);
  }
}

export function createConfigRepository(type: PersistenceType = 'file'): IConfigRepository {
  switch (type) {
    case 'file':
      return new FileConfigRepository();
    case 'sqlite':
      throw new Error('SQLite adapter not implemented yet');
    case 'postgresql':
      throw new Error('PostgreSQL adapter not implemented yet');
    default:
      throw new Error(`Unknown persistence type: ${type}`);
  }
}
```

```typescript
// infrastructure/container.ts

import { SourceService } from '@/core/application/SourceService';
import { ConfigService } from '@/core/application/ConfigService';
import { createSourceRepository, createConfigRepository, PersistenceType } from './factory';

// 환경 변수 또는 설정에서 저장소 타입 결정
const PERSISTENCE_TYPE: PersistenceType =
  (process.env.PERSISTENCE_TYPE as PersistenceType) || 'file';

// 싱글톤 인스턴스
let sourceService: SourceService | null = null;
let configService: ConfigService | null = null;

export function getSourceService(): SourceService {
  if (!sourceService) {
    const sourceRepo = createSourceRepository(PERSISTENCE_TYPE);
    const configRepo = createConfigRepository(PERSISTENCE_TYPE);
    sourceService = new SourceService(sourceRepo, configRepo);
  }
  return sourceService;
}

export function getConfigService(): ConfigService {
  if (!configService) {
    const configRepo = createConfigRepository(PERSISTENCE_TYPE);
    configService = new ConfigService(configRepo);
  }
  return configService;
}

// 테스트용 리셋
export function resetContainer(): void {
  sourceService = null;
  configService = null;
}
```

---

## 마이그레이션 전략

### Phase 1: 인프라 구축
1. 디렉토리 구조 생성
2. Domain Entities 구현
3. Port Interfaces 정의

### Phase 2: File Adapter 구현
1. 기존 `lib/config.ts` 로직을 FileRepository로 이전
2. Repository Factory 구현
3. DI Container 설정

### Phase 3: Application Services
1. SourceService 구현
2. ConfigService 구현
3. 기존 `lib/config.ts`를 Application Service 호출로 전환

### Phase 4: API Routes 연결
1. API Routes에서 Application Service 사용
2. 기존 lib 함수 호출을 Service 호출로 교체
3. 테스트 및 검증

### Phase 5: Hooks 업데이트 (선택)
1. useConfig, useTasks hooks가 새 구조 사용
2. 점진적으로 전환

---

## 환경 변수

```bash
# .env.local
PERSISTENCE_TYPE=file          # file | sqlite | postgresql

# SQLite (향후)
SQLITE_DB_PATH=./data/taskflow.db

# PostgreSQL (향후)
DATABASE_URL=postgresql://user:password@localhost:5432/taskflow
```

---

## 향후 확장: SQLite Adapter (예시)

```typescript
// adapters/persistence/sqlite/SQLiteSourceRepository.ts

import Database from 'better-sqlite3';
import { Source } from '@/core/domain/entities/Source';
import { ISourceRepository } from '@/core/ports/out/ISourceRepository';

export class SQLiteSourceRepository implements ISourceRepository {
  private db: Database.Database;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.initTable();
  }

  private initTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        is_active INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        last_accessed TEXT
      )
    `);
  }

  async findAll(): Promise<Source[]> {
    const rows = this.db.prepare('SELECT * FROM sources').all();
    return rows.map(row => Source.fromPersistence({
      id: row.id,
      name: row.name,
      path: row.path,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at),
      lastAccessed: row.last_accessed ? new Date(row.last_accessed) : undefined,
    }));
  }

  // ... 나머지 메서드들
}
```

---

## Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-12 | Claude | Initial hexagonal architecture design |
