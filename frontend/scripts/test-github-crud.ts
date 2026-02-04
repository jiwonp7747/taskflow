/**
 * GitHub CRUD Test Script
 *
 * Tests Create, Update, Delete operations against a real GitHub repository
 * using the same logic as tasks.ipc.ts
 *
 * Usage: GITHUB_TOKEN=your_token npx tsx scripts/test-github-crud.ts
 */

import { Octokit } from '@octokit/rest';
import { parseTaskContent, generateTaskContent, updateTaskFrontmatter } from '../lib/taskParser';

// Test configuration
const TEST_CONFIG = {
  owner: 'jiwonp7747',
  repo: 'docs',
  branch: 'main',
  rootPath: '/schedule',
  token: process.env.GITHUB_TOKEN || '',
};

// Test state
let testTaskId: string;
let testFilePath: string;
let testFileSha: string;

// Helper: Generate unique task ID
function generateTaskId(): string {
  return `test-task-${Date.now()}`;
}

// Helper: Build full file path
function buildFilePath(taskId: string): string {
  const fileName = `${taskId}.md`;
  const rootPathPrefix = TEST_CONFIG.rootPath === '/' ? '' : TEST_CONFIG.rootPath.replace(/^\//, '');
  return rootPathPrefix ? `${rootPathPrefix}/${fileName}` : fileName;
}

// Helper: Print test result
function printResult(step: string, passed: boolean, message: string): void {
  const emoji = passed ? '✅' : '❌';
  const status = passed ? 'PASS' : 'FAIL';
  console.log(`[${step}] ${emoji} ${status} - ${message}`);
}

// Test 1: Create a test task
async function testCreate(octokit: Octokit): Promise<boolean> {
  console.log('[CREATE] Creating test task...');

  try {
    testTaskId = generateTaskId();
    testFilePath = buildFilePath(testTaskId);
    const now = new Date().toISOString();

    const taskContent = generateTaskContent({
      id: testTaskId,
      title: 'GitHub CRUD Test Task',
      status: 'TODO',
      priority: 'MEDIUM',
      assignee: 'ai-agent',
      created_at: now,
      updated_at: now,
      tags: ['test', 'github-crud'],
      content: 'This is a test task created by the GitHub CRUD test script.',
    });

    const { data: result } = await octokit.repos.createOrUpdateFileContents({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      message: `Test: Create task ${testTaskId}`,
      content: Buffer.from(taskContent, 'utf-8').toString('base64'),
      branch: TEST_CONFIG.branch,
    });

    testFileSha = result.content?.sha || '';
    printResult('CREATE', true, `Task created: ${testTaskId}`);
    return true;
  } catch (error: any) {
    printResult('CREATE', false, error.message);
    return false;
  }
}

// Test 2: Verify create (fetch the file)
async function testVerifyCreate(octokit: Octokit): Promise<boolean> {
  console.log('[VERIFY CREATE] Fetching created task...');

  try {
    const { data } = await octokit.repos.getContent({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      ref: TEST_CONFIG.branch,
    });

    if (Array.isArray(data)) {
      printResult('VERIFY CREATE', false, 'Expected file, got directory');
      return false;
    }

    if (!('content' in data)) {
      printResult('VERIFY CREATE', false, 'Invalid response: no content field');
      return false;
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const task = parseTaskContent(content, testTaskId + '.md');

    // Verify task properties
    const isValid =
      task.id === testTaskId &&
      task.title === 'GitHub CRUD Test Task' &&
      task.status === 'TODO' &&
      task.priority === 'MEDIUM' &&
      task.assignee === 'ai-agent' &&
      task.tags.includes('test') &&
      task.tags.includes('github-crud');

    if (isValid) {
      // Update SHA for next test
      testFileSha = data.sha;
      printResult('VERIFY CREATE', true, 'Task verified and parsed correctly');
      return true;
    } else {
      printResult('VERIFY CREATE', false, 'Task properties mismatch');
      return false;
    }
  } catch (error: any) {
    printResult('VERIFY CREATE', false, error.message);
    return false;
  }
}

// Test 3: Update the task
async function testUpdate(octokit: Octokit): Promise<boolean> {
  console.log('[UPDATE] Updating task status to IN_PROGRESS...');

  try {
    // Fetch current content
    const { data: currentFile } = await octokit.repos.getContent({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      ref: TEST_CONFIG.branch,
    });

    if (Array.isArray(currentFile)) {
      printResult('UPDATE', false, 'Expected file, got directory');
      return false;
    }

    if (!('content' in currentFile)) {
      printResult('UPDATE', false, 'Invalid response: no content field');
      return false;
    }

    const currentContent = Buffer.from(currentFile.content, 'base64').toString('utf-8');

    // Update frontmatter
    const updatedContent = updateTaskFrontmatter(currentContent, {
      status: 'IN_PROGRESS',
      assignee: 'user',
    });

    // Commit update
    const { data: result } = await octokit.repos.createOrUpdateFileContents({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      message: `Test: Update task ${testTaskId}`,
      content: Buffer.from(updatedContent, 'utf-8').toString('base64'),
      branch: TEST_CONFIG.branch,
      sha: currentFile.sha,
    });

    testFileSha = result.content?.sha || '';
    printResult('UPDATE', true, 'Task updated successfully');
    return true;
  } catch (error: any) {
    printResult('UPDATE', false, error.message);
    return false;
  }
}

// Test 4: Verify update
async function testVerifyUpdate(octokit: Octokit): Promise<boolean> {
  console.log('[VERIFY UPDATE] Verifying task update...');

  try {
    const { data } = await octokit.repos.getContent({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      ref: TEST_CONFIG.branch,
    });

    if (Array.isArray(data)) {
      printResult('VERIFY UPDATE', false, 'Expected file, got directory');
      return false;
    }

    if (!('content' in data)) {
      printResult('VERIFY UPDATE', false, 'Invalid response: no content field');
      return false;
    }

    const content = Buffer.from(data.content, 'base64').toString('utf-8');
    const task = parseTaskContent(content, testTaskId + '.md');

    // Verify update
    const isValid =
      task.status === 'IN_PROGRESS' &&
      task.assignee === 'user';

    if (isValid) {
      // Update SHA for delete test
      testFileSha = data.sha;
      printResult('VERIFY UPDATE', true, 'Update verified (status=IN_PROGRESS, assignee=user)');
      return true;
    } else {
      printResult('VERIFY UPDATE', false, `Update verification failed (status=${task.status}, assignee=${task.assignee})`);
      return false;
    }
  } catch (error: any) {
    printResult('VERIFY UPDATE', false, error.message);
    return false;
  }
}

// Test 5: Delete the task
async function testDelete(octokit: Octokit): Promise<boolean> {
  console.log('[DELETE] Deleting test task...');

  try {
    await octokit.repos.deleteFile({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      message: `Test: Delete task ${testTaskId}`,
      sha: testFileSha,
      branch: TEST_CONFIG.branch,
    });

    printResult('DELETE', true, 'Task deleted successfully');
    return true;
  } catch (error: any) {
    printResult('DELETE', false, error.message);
    return false;
  }
}

// Test 6: Verify delete
async function testVerifyDelete(octokit: Octokit): Promise<boolean> {
  console.log('[VERIFY DELETE] Confirming task is gone...');

  try {
    await octokit.repos.getContent({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      ref: TEST_CONFIG.branch,
    });

    // If we reach here, file still exists
    printResult('VERIFY DELETE', false, 'File still exists after delete');
    return false;
  } catch (error: any) {
    if (error.status === 404) {
      printResult('VERIFY DELETE', true, 'File confirmed deleted (404)');
      return true;
    } else {
      printResult('VERIFY DELETE', false, `Unexpected error: ${error.message}`);
      return false;
    }
  }
}

// Cleanup function (run even if tests fail)
async function cleanup(octokit: Octokit): Promise<void> {
  if (!testFilePath) return;

  console.log('\n[CLEANUP] Ensuring test file is removed...');

  try {
    // Try to fetch the file to get its SHA
    const { data } = await octokit.repos.getContent({
      owner: TEST_CONFIG.owner,
      repo: TEST_CONFIG.repo,
      path: testFilePath,
      ref: TEST_CONFIG.branch,
    });

    if (!Array.isArray(data) && 'sha' in data) {
      // File exists, delete it
      await octokit.repos.deleteFile({
        owner: TEST_CONFIG.owner,
        repo: TEST_CONFIG.repo,
        path: testFilePath,
        message: `Cleanup: Delete test task ${testTaskId}`,
        sha: data.sha,
        branch: TEST_CONFIG.branch,
      });
      console.log('[CLEANUP] ✅ Test file removed');
    }
  } catch (error: any) {
    if (error.status === 404) {
      console.log('[CLEANUP] ✅ No cleanup needed (file already deleted)');
    } else {
      console.log(`[CLEANUP] ⚠️  Cleanup failed: ${error.message}`);
    }
  }
}

// Main test runner
async function runTests(): Promise<void> {
  console.log('=== GitHub CRUD Test ===\n');

  // Validate token
  if (!TEST_CONFIG.token) {
    console.error('❌ ERROR: GITHUB_TOKEN environment variable not set');
    console.error('Usage: GITHUB_TOKEN=your_token npx tsx scripts/test-github-crud.ts');
    process.exit(1);
  }

  console.log(`Repository: ${TEST_CONFIG.owner}/${TEST_CONFIG.repo}`);
  console.log(`Branch: ${TEST_CONFIG.branch}`);
  console.log(`Root Path: ${TEST_CONFIG.rootPath}\n`);

  const octokit = new Octokit({ auth: TEST_CONFIG.token });

  try {
    // Run tests sequentially
    const results: boolean[] = [];

    results.push(await testCreate(octokit));
    if (results[results.length - 1]) {
      results.push(await testVerifyCreate(octokit));
    } else {
      console.log('[VERIFY CREATE] ⏭️  SKIPPED - Create failed\n');
    }

    if (results.every(r => r)) {
      results.push(await testUpdate(octokit));
    } else {
      console.log('[UPDATE] ⏭️  SKIPPED - Previous tests failed\n');
    }

    if (results.every(r => r)) {
      results.push(await testVerifyUpdate(octokit));
    } else {
      console.log('[VERIFY UPDATE] ⏭️  SKIPPED - Previous tests failed\n');
    }

    if (results.every(r => r)) {
      results.push(await testDelete(octokit));
    } else {
      console.log('[DELETE] ⏭️  SKIPPED - Previous tests failed\n');
    }

    if (results.every(r => r)) {
      results.push(await testVerifyDelete(octokit));
    } else {
      console.log('[VERIFY DELETE] ⏭️  SKIPPED - Previous tests failed\n');
    }

    // Summary
    const passed = results.filter(r => r).length;
    const total = results.length;

    console.log('\n=== Test Summary ===');
    console.log(`Passed: ${passed}/${total}`);

    if (results.every(r => r)) {
      console.log('\n🎉 === All tests passed! ===');
      process.exit(0);
    } else {
      console.log('\n❌ === Some tests failed ===');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error.message);
    process.exit(1);
  } finally {
    // Always cleanup
    await cleanup(octokit);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
