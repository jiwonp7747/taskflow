/**
 * Safe Console Utilities
 *
 * EPIPE 에러 방지를 위한 안전한 콘솔 출력 유틸리티
 * stdout/stderr 파이프가 닫힌 상태에서 console.log/error 호출 시
 * 발생하는 EPIPE 에러를 gracefully 처리
 */

export function safeLog(...args: unknown[]): void {
  try {
    console.log(...args);
  } catch {
    // Ignore EPIPE errors when stdout is closed
  }
}

export function safeError(...args: unknown[]): void {
  try {
    console.error(...args);
  } catch {
    // Ignore EPIPE errors when stderr is closed
  }
}
