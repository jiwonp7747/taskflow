/**
 * ISourceService - Source 서비스 인터페이스 (Input Port)
 *
 * Source 관련 유스케이스를 정의하는 인터페이스
 */

import type { Source } from '@/core/domain/entities/Source';
import type { GitHubSourceConfig, GitHubValidationResult } from '@/core/domain/entities/GitHubSourceConfig';

// DTO (Data Transfer Objects)
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

export interface AddGitHubSourceDTO {
  name: string;
  githubConfig: GitHubSourceConfig;
}

export interface ISourceService {
  /**
   * 모든 Source 조회
   */
  getAllSources(): Promise<Source[]>;

  /**
   * ID로 Source 조회
   */
  getSourceById(id: string): Promise<Source | null>;

  /**
   * 활성화된 Source 조회
   */
  getActiveSource(): Promise<Source | null>;

  /**
   * 활성화된 Source의 경로 조회
   */
  getActiveSourcePath(): Promise<string>;

  /**
   * 새 Source 추가
   */
  addSource(dto: AddSourceDTO): Promise<Source>;

  /**
   * Source 업데이트
   */
  updateSource(id: string, dto: UpdateSourceDTO): Promise<Source>;

  /**
   * Source 삭제
   */
  deleteSource(id: string): Promise<void>;

  /**
   * Source 활성화
   */
  setActiveSource(id: string): Promise<void>;

  /**
   * 경로 유효성 검증
   */
  validatePath(path: string): Promise<SourceValidationResult>;

  /**
   * Source 디렉토리 생성
   */
  createSourceDirectory(path: string): Promise<void>;

  /**
   * GitHub 소스 추가
   */
  addGitHubSource(dto: AddGitHubSourceDTO): Promise<Source>;

  /**
   * GitHub 소스 유효성 검증
   */
  validateGitHubSource(config: GitHubSourceConfig): Promise<GitHubValidationResult>;

  /**
   * GitHub 소스 동기화 (pull latest)
   */
  syncGitHubSource(id: string): Promise<void>;
}
