# GitHub CRUD Test Script

This script tests the GitHub CRUD implementation used in `electron/ipc/tasks.ipc.ts` against a real GitHub repository.

## Prerequisites

1. A GitHub Personal Access Token with repository write permissions
2. Access to the target repository (jiwonp7747/docs)

## Usage

```bash
# Set your GitHub token as an environment variable
export GITHUB_TOKEN=your_github_token_here

# Run the test script
npx tsx scripts/test-github-crud.ts
```

Or in one command:

```bash
GITHUB_TOKEN=your_token npx tsx scripts/test-github-crud.ts
```

## Test Configuration

The script is configured to test against:
- **Owner**: jiwonp7747
- **Repo**: docs
- **Branch**: main
- **Root Path**: /schedule

You can modify these values in the `TEST_CONFIG` object at the top of the script.

## What It Tests

The script performs a complete CRUD cycle:

1. **CREATE**: Creates a test task with a unique ID
2. **VERIFY CREATE**: Fetches the file and verifies it exists with correct content
3. **UPDATE**: Updates the task status to IN_PROGRESS and assignee to user
4. **VERIFY UPDATE**: Fetches and verifies the update was applied
5. **DELETE**: Deletes the test task
6. **VERIFY DELETE**: Confirms the file is gone (404 response)

## Expected Output

```
=== GitHub CRUD Test ===

Repository: jiwonp7747/docs
Branch: main
Root Path: /schedule

[CREATE] Creating test task...
[CREATE] ✅ PASS - Task created: test-task-1234567890
[VERIFY CREATE] Fetching created task...
[VERIFY CREATE] ✅ PASS - Task verified and parsed correctly
[UPDATE] Updating task status to IN_PROGRESS...
[UPDATE] ✅ PASS - Task updated successfully
[VERIFY UPDATE] Verifying task update...
[VERIFY UPDATE] ✅ PASS - Update verified (status=IN_PROGRESS, assignee=user)
[DELETE] Deleting test task...
[DELETE] ✅ PASS - Task deleted successfully
[VERIFY DELETE] Confirming task is gone...
[VERIFY DELETE] ✅ PASS - File confirmed deleted (404)

=== Test Summary ===
Passed: 6/6

🎉 === All tests passed! ===

[CLEANUP] ✅ No cleanup needed (file already deleted)
```

## Error Handling

- The script includes cleanup logic that runs even if tests fail
- If a test fails, subsequent tests are skipped
- The cleanup function ensures no test files are left in the repository
- Common GitHub errors (401, 403, 404, 409) are caught and reported clearly

## Exit Codes

- `0`: All tests passed
- `1`: Some tests failed or fatal error occurred

## Files Created During Test

During execution, the script creates a temporary file:
- Path: `/schedule/test-task-{timestamp}.md`

This file is automatically cleaned up at the end of the test, regardless of success or failure.
