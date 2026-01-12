/**
 * Source Entity
 *
 * 태스크 파일들이 저장되는 디렉토리 소스를 나타내는 도메인 엔티티
 */

export interface SourceProps {
  id: string;
  name: string;
  path: string;
  isActive: boolean;
  createdAt: Date;
  lastAccessed?: Date;
}

export interface CreateSourceInput {
  name: string;
  path: string;
  isActive?: boolean;
}

export class Source {
  private constructor(private props: SourceProps) {}

  /**
   * 새 Source 엔티티 생성
   */
  static create(input: CreateSourceInput): Source {
    return new Source({
      id: `source-${Date.now()}`,
      name: input.name,
      path: input.path,
      isActive: input.isActive ?? false,
      createdAt: new Date(),
    });
  }

  /**
   * 저장소에서 복원된 Source 엔티티 생성
   */
  static fromPersistence(props: SourceProps): Source {
    return new Source(props);
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get path(): string {
    return this.props.path;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get lastAccessed(): Date | undefined {
    return this.props.lastAccessed;
  }

  // Domain Methods
  activate(): void {
    this.props.isActive = true;
    this.props.lastAccessed = new Date();
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Source name cannot be empty');
    }
    this.props.name = name.trim();
  }

  updatePath(path: string): void {
    if (!path || path.trim().length === 0) {
      throw new Error('Source path cannot be empty');
    }
    this.props.path = path.trim();
  }

  touchLastAccessed(): void {
    this.props.lastAccessed = new Date();
  }

  /**
   * 직렬화를 위한 JSON 변환
   */
  toJSON(): SourceProps {
    return { ...this.props };
  }

  /**
   * 저장소 저장용 직렬화 (Date를 ISO string으로 변환)
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this.props.id,
      name: this.props.name,
      path: this.props.path,
      isActive: this.props.isActive,
      createdAt: this.props.createdAt.toISOString(),
      lastAccessed: this.props.lastAccessed?.toISOString(),
    };
  }
}
