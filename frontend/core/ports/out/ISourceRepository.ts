/**
 * ISourceRepository - Source 저장소 인터페이스 (Output Port)
 *
 * Source 엔티티의 영속성을 담당하는 저장소 인터페이스
 * 구현체: FileSourceRepository, SQLiteSourceRepository, PgSourceRepository 등
 */

import type { Source } from '@/core/domain/entities/Source';
import type { SourceValidationResult } from '@/core/ports/in/ISourceService';
import type { GitHubSourceConfig, GitHubValidationResult } from '@/core/domain/entities/GitHubSourceConfig';

export interface ISourceRepository {
  /**
   * 모든 Source 조회
   */
  findAll(): Promise<Source[]>;

  /**
   * ID로 Source 조회
   */
  findById(id: string): Promise<Source | null>;

  /**
   * 활성화된 Source 조회
   */
  findActive(): Promise<Source | null>;

  /**
   * Source 저장 (생성 또는 업데이트)
   */
  save(source: Source): Promise<void>;

  /**
   * Source 삭제
   */
  delete(id: string): Promise<void>;

  /**
   * 특정 경로의 Source가 존재하는지 확인
   */
  existsByPath(path: string): Promise<boolean>;

  /**
   * 특정 ID의 Source가 존재하는지 확인
   */
  existsById(id: string): Promise<boolean>;

  /**
   * 경로 유효성 검증 (파일시스템 작업)
   */
  validatePath(path: string): Promise<SourceValidationResult>;

  /**
   * 디렉토리 생성 (파일시스템 작업)
   */
  createDirectory(path: string): Promise<void>;

  /**
   * 기본 tasks 디렉토리 경로 반환 (파일시스템 작업)
   */
  getDefaultTasksPath(): string;

  /**
   * GitHub 소스 연결 유효성 검증
   */
  validateGitHubSource(config: GitHubSourceConfig): Promise<GitHubValidationResult>;
}
