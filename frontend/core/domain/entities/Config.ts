/**
 * Config Entity
 *
 * 애플리케이션 전역 설정을 나타내는 도메인 엔티티
 */

export type ThemeType = 'dark' | 'light';

export interface ConfigProps {
  activeSourceId: string | null;
  theme: ThemeType;
  sidebarCollapsed: boolean;
}

export interface CreateConfigInput {
  activeSourceId?: string | null;
  theme?: ThemeType;
  sidebarCollapsed?: boolean;
}

export class Config {
  private constructor(private props: ConfigProps) {}

  /**
   * 새 Config 엔티티 생성 (기본값 적용)
   */
  static create(input?: CreateConfigInput): Config {
    return new Config({
      activeSourceId: input?.activeSourceId ?? null,
      theme: input?.theme ?? 'dark',
      sidebarCollapsed: input?.sidebarCollapsed ?? false,
    });
  }

  /**
   * 저장소에서 복원된 Config 엔티티 생성
   */
  static fromPersistence(props: ConfigProps): Config {
    return new Config(props);
  }

  // Getters
  get activeSourceId(): string | null {
    return this.props.activeSourceId;
  }

  get theme(): ThemeType {
    return this.props.theme;
  }

  get sidebarCollapsed(): boolean {
    return this.props.sidebarCollapsed;
  }

  // Domain Methods
  setActiveSource(sourceId: string | null): void {
    this.props.activeSourceId = sourceId;
  }

  toggleSidebar(): void {
    this.props.sidebarCollapsed = !this.props.sidebarCollapsed;
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.props.sidebarCollapsed = collapsed;
  }

  setTheme(theme: ThemeType): void {
    this.props.theme = theme;
  }

  toggleTheme(): void {
    this.props.theme = this.props.theme === 'dark' ? 'light' : 'dark';
  }

  /**
   * 직렬화를 위한 JSON 변환
   */
  toJSON(): ConfigProps {
    return { ...this.props };
  }

  /**
   * 저장소 저장용 직렬화
   */
  toPersistence(): ConfigProps {
    return { ...this.props };
  }
}
