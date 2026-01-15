/**
 * PaneTree Component
 *
 * Recursive rendering of pane tree structure
 * Handles both terminal panes and split containers
 */

import { TerminalPane } from './TerminalPane';
import { ResizeHandle } from './ResizeHandle';
import type { PaneTreeProps, PaneNode, TerminalPaneData, SplitPaneData } from './types';

export function PaneTree({
  node,
  activePaneId,
  isTabActive,
  isVisible,
  onPaneFocus,
  onPtyCreated,
  onPtyExited,
  onSplitRequest,
  onClosePane,
  onPaneResize,
}: PaneTreeProps) {
  // Terminal pane (leaf node)
  if (node.type === 'terminal') {
    const terminalNode = node as TerminalPaneData;
    return (
      <div className="relative h-full w-full group/pane">
        <TerminalPane
          paneId={terminalNode.id}
          cwd={terminalNode.cwd}
          isActive={terminalNode.id === activePaneId && isTabActive}
          isVisible={isVisible && isTabActive}
          onPtyCreated={(ptyId) => onPtyCreated(terminalNode.id, ptyId)}
          onPtyExited={(exitCode) => onPtyExited(terminalNode.id, exitCode)}
          onFocus={() => onPaneFocus(terminalNode.id)}
          onSplitRequest={(direction, position) => onSplitRequest(terminalNode.id, direction, position)}
          onClosePane={() => onClosePane(terminalNode.id)}
        />
      </div>
    );
  }

  // Split container (branch node)
  const splitNode = node as SplitPaneData;
  const isHorizontal = splitNode.direction === 'horizontal';
  const { children, sizes } = splitNode;

  return (
    <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} h-full w-full`}>
      {children.map((child, index) => (
        <div
          key={child.id}
          className="relative"
          style={{
            [isHorizontal ? 'width' : 'height']: `${sizes[index]}%`,
            flex: 'none',
            minWidth: isHorizontal ? '150px' : undefined,
            minHeight: !isHorizontal ? '80px' : undefined,
          }}
        >
          {/* Recursive render */}
          <PaneTree
            node={child}
            activePaneId={activePaneId}
            isTabActive={isTabActive}
            isVisible={isVisible}
            onPaneFocus={onPaneFocus}
            onPtyCreated={onPtyCreated}
            onPtyExited={onPtyExited}
            onSplitRequest={onSplitRequest}
            onClosePane={onClosePane}
            onPaneResize={onPaneResize}
          />

          {/* Resize handle between panes */}
          {index < children.length - 1 && (
            <ResizeHandle
              direction={isHorizontal ? 'horizontal' : 'vertical'}
              onResize={(delta) => onPaneResize(splitNode.id, index, delta)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
