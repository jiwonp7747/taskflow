/**
 * Terminal Feature Type Definitions
 */

export interface TerminalTab {
  id: string;
  name: string;
  panes: TerminalPane[];
  layout: PaneLayout;
}

export interface TerminalPane {
  id: string;
  ptyId: string;
  cwd: string;
  isActive: boolean;
}

export type PaneLayout =
  | { type: 'single' }
  | { type: 'horizontal'; sizes: number[] }
  | { type: 'vertical'; sizes: number[] };

export interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onSplitRequest: (direction: 'horizontal' | 'vertical') => void;
}

export interface TerminalViewProps {
  initialCwd?: string;
  onClose: () => void;
  isVisible?: boolean;
}

export interface TerminalPaneProps {
  pane: TerminalPane;
  onFocus: (paneId: string) => void;
}

export interface SplitMenuOption {
  label: string;
  shortcut?: string;
  action: () => void;
  divider?: boolean;
}
