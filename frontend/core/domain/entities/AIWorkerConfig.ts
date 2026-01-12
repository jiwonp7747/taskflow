/**
 * AIWorkerConfig Entity
 *
 * AI Worker 설정을 나타내는 도메인 엔티티
 */

export interface AIWorkerConfigProps {
  enabled: boolean;
  autoStart: boolean;
  pollingInterval: number;   // ms
  maxConcurrent: number;
  timeout: number;           // ms
  workingDirectory?: string;
}

export interface CreateAIWorkerConfigInput {
  enabled?: boolean;
  autoStart?: boolean;
  pollingInterval?: number;
  maxConcurrent?: number;
  timeout?: number;
  workingDirectory?: string;
}

// 기본값 상수
export const DEFAULT_AI_WORKER_CONFIG_VALUES: AIWorkerConfigProps = {
  enabled: true,
  autoStart: false,
  pollingInterval: 30000,    // 30초
  maxConcurrent: 1,
  timeout: 600000,           // 10분
};

export class AIWorkerConfig {
  private constructor(private props: AIWorkerConfigProps) {}

  /**
   * 새 AIWorkerConfig 엔티티 생성 (기본값 적용)
   */
  static create(input?: CreateAIWorkerConfigInput): AIWorkerConfig {
    return new AIWorkerConfig({
      enabled: input?.enabled ?? DEFAULT_AI_WORKER_CONFIG_VALUES.enabled,
      autoStart: input?.autoStart ?? DEFAULT_AI_WORKER_CONFIG_VALUES.autoStart,
      pollingInterval: input?.pollingInterval ?? DEFAULT_AI_WORKER_CONFIG_VALUES.pollingInterval,
      maxConcurrent: input?.maxConcurrent ?? DEFAULT_AI_WORKER_CONFIG_VALUES.maxConcurrent,
      timeout: input?.timeout ?? DEFAULT_AI_WORKER_CONFIG_VALUES.timeout,
      workingDirectory: input?.workingDirectory,
    });
  }

  /**
   * 저장소에서 복원된 AIWorkerConfig 엔티티 생성
   */
  static fromPersistence(props: Partial<AIWorkerConfigProps>): AIWorkerConfig {
    return new AIWorkerConfig({
      ...DEFAULT_AI_WORKER_CONFIG_VALUES,
      ...props,
    });
  }

  // Getters
  get enabled(): boolean {
    return this.props.enabled;
  }

  get autoStart(): boolean {
    return this.props.autoStart;
  }

  get pollingInterval(): number {
    return this.props.pollingInterval;
  }

  get maxConcurrent(): number {
    return this.props.maxConcurrent;
  }

  get timeout(): number {
    return this.props.timeout;
  }

  get workingDirectory(): string | undefined {
    return this.props.workingDirectory;
  }

  // Domain Methods
  enable(): void {
    this.props.enabled = true;
  }

  disable(): void {
    this.props.enabled = false;
  }

  setAutoStart(autoStart: boolean): void {
    this.props.autoStart = autoStart;
  }

  setPollingInterval(interval: number): void {
    if (interval < 1000) {
      throw new Error('Polling interval must be at least 1000ms');
    }
    this.props.pollingInterval = interval;
  }

  setMaxConcurrent(max: number): void {
    if (max < 1) {
      throw new Error('Max concurrent must be at least 1');
    }
    this.props.maxConcurrent = max;
  }

  setTimeout(timeout: number): void {
    if (timeout < 1000) {
      throw new Error('Timeout must be at least 1000ms');
    }
    this.props.timeout = timeout;
  }

  setWorkingDirectory(dir: string | undefined): void {
    this.props.workingDirectory = dir;
  }

  /**
   * 부분 업데이트
   */
  update(input: CreateAIWorkerConfigInput): void {
    if (input.enabled !== undefined) this.props.enabled = input.enabled;
    if (input.autoStart !== undefined) this.props.autoStart = input.autoStart;
    if (input.pollingInterval !== undefined) this.setPollingInterval(input.pollingInterval);
    if (input.maxConcurrent !== undefined) this.setMaxConcurrent(input.maxConcurrent);
    if (input.timeout !== undefined) this.setTimeout(input.timeout);
    if (input.workingDirectory !== undefined) this.props.workingDirectory = input.workingDirectory;
  }

  /**
   * 직렬화를 위한 JSON 변환
   */
  toJSON(): AIWorkerConfigProps {
    return { ...this.props };
  }

  /**
   * 저장소 저장용 직렬화
   */
  toPersistence(): AIWorkerConfigProps {
    return { ...this.props };
  }
}
