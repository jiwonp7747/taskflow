/**
 * IGitHubAdapter - GitHub API Adapter Interface (Output Port)
 *
 * GitHub API 작업을 위한 어댑터 인터페이스
 * 구현체: GitHubApiAdapter (Octokit 사용)
 */

import type {
  GitHubSourceConfig,
  GitHubValidationResult,
  GitHubContent,
  GitHubFileContent,
  GitHubCommitResult,
} from '@/core/domain/entities/GitHubSourceConfig';

export interface IGitHubAdapter {
  /**
   * GitHub 연결 및 저장소 접근 유효성 검증
   */
  validateConnection(config: GitHubSourceConfig): Promise<GitHubValidationResult>;

  /**
   * 특정 경로의 디렉토리 내용 조회
   */
  getContents(config: GitHubSourceConfig, path: string): Promise<GitHubContent[]>;

  /**
   * 파일 내용 조회
   */
  getFileContent(config: GitHubSourceConfig, path: string): Promise<GitHubFileContent>;

  /**
   * 파일 생성 또는 업데이트
   */
  createOrUpdateFile(
    config: GitHubSourceConfig,
    path: string,
    content: string,
    message: string,
    sha?: string, // 업데이트 시 필요
  ): Promise<GitHubCommitResult>;

  /**
   * 파일 삭제
   */
  deleteFile(
    config: GitHubSourceConfig,
    path: string,
    message: string,
    sha: string,
  ): Promise<GitHubCommitResult>;

  /**
   * 브랜치의 최신 커밋 SHA 조회
   */
  getLatestCommitSha(config: GitHubSourceConfig): Promise<string>;

  /**
   * 저장소의 모든 .md 파일 목록 조회 (재귀)
   */
  getMarkdownFiles(config: GitHubSourceConfig): Promise<GitHubContent[]>;

  /**
   * Rate limit 정보 조회
   */
  getRateLimit(token: string): Promise<{
    remaining: number;
    limit: number;
    reset: Date;
  }>;
}
