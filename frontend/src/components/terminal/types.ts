/**
 * Terminal Feature Type Definitions
 *
 * Tree-based pane structure for nested splitting support
 */

// Base pane with terminal - leaf node
export interface TerminalPaneData {
  type: 'terminal';
  id: string;
  ptyId: string;
  cwd: string;
}

// Split container - branch node
export interface SplitPaneData {
  type: 'split';
  id: string;
  direction: 'horizontal' | 'vertical';
  children: PaneNode[];
  sizes: number[];
}

// Union type for tree node
export type PaneNode = TerminalPaneData | SplitPaneData;

// Tab contains a root pane (tree)
export interface TerminalTab {
  id: string;
  name: string;
  rootPane: PaneNode;
}

// Context menu item
export interface ContextMenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  divider?: boolean;
}

// Component Props
export interface TerminalTabBarProps {
  tabs: TerminalTab[];
  activeTabId: string;
  onTabSelect: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onTabRename: (tabId: string, newName: string) => void;
}

export interface TerminalViewProps {
  initialCwd?: string;
  onClose: () => void;
  isVisible?: boolean;
}

// Split position: 'before' = left/up, 'after' = right/down
export type SplitPosition = 'before' | 'after';

export interface TerminalPaneProps {
  paneId: string;
  cwd: string;
  isActive: boolean;
  isVisible?: boolean;
  onPtyCreated: (ptyId: string) => void;
  onPtyExited: (exitCode: number) => void;
  onFocus: () => void;
  onSplitRequest: (direction: 'horizontal' | 'vertical', position: SplitPosition) => void;
  onClosePane: () => void;
}

export interface PaneTreeProps {
  node: PaneNode;
  activePaneId: string;
  isTabActive: boolean;
  isVisible: boolean;
  onPaneFocus: (paneId: string) => void;
  onPtyCreated: (paneId: string, ptyId: string) => void;
  onPtyExited: (paneId: string, exitCode: number) => void;
  onSplitRequest: (paneId: string, direction: 'horizontal' | 'vertical', position: SplitPosition) => void;
  onClosePane: (paneId: string) => void;
  onPaneResize: (splitId: string, index: number, delta: number) => void;
}
