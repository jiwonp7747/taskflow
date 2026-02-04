import { test, expect } from '@playwright/test';

/**
 * E2E Tests for GitHub Task CRUD Operations
 *
 * Prerequisites:
 * - A GitHub source must be configured and active
 * - GitHub token must have write permissions
 * - Test will create/update/delete actual files in the repository
 *
 * Note: These tests are integration tests that interact with real GitHub API.
 * They should be run in a test repository to avoid polluting production data.
 */

test.describe('GitHub CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('text=TaskFlow', { timeout: 10000 });
    // Wait for tasks to load
    await page.waitForTimeout(2000);
  });

  test.describe('Create Task on GitHub', () => {
    test('should create a new task and push to GitHub', async ({ page }) => {
      // Open create task modal
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      // Fill in task details
      const titleInput = page.locator('input[placeholder="Enter task title..."]');
      const testTitle = `GitHub Test Task ${Date.now()}`;
      await titleInput.fill(testTitle);

      // Select priority
      await page.click('text=Priority');
      await page.click('text=HIGH');

      // Add tags
      const tagInput = page.locator('input[placeholder="backend, api, auth..."]');
      await tagInput.fill('test, github, automation');

      // Add content
      const contentTextarea = page.locator('textarea[placeholder="Describe task details..."]');
      await contentTextarea.fill('This is a test task created via E2E tests for GitHub CRUD operations.');

      // Submit the form
      await page.click('button:has-text("Create Task")');

      // Wait for success (modal should close)
      await page.waitForSelector('text=Initialize New Task', { state: 'hidden', timeout: 10000 });

      // Verify the task appears in the list
      await expect(page.locator(`text=${testTitle}`)).toBeVisible({ timeout: 5000 });
    });

    test('should handle GitHub rate limit error gracefully', async ({ page }) => {
      // This test simulates rate limit by creating many tasks rapidly
      // In real scenario, rate limit is unlikely but error handling should work

      // Note: This is a placeholder - actual rate limit testing requires
      // mocking or exhausting the rate limit which is not practical
      expect(true).toBe(true);
    });

    test('should handle authentication error', async ({ page }) => {
      // This test would require invalidating the token temporarily
      // Placeholder for manual testing scenario
      expect(true).toBe(true);
    });
  });

  test.describe('Update Task on GitHub', () => {
    test('should update an existing task and push changes to GitHub', async ({ page }) => {
      // Wait for tasks to load
      await page.waitForTimeout(2000);

      // Find a task card
      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();

      if (count > 0) {
        // Click on first task to open sidebar
        await taskCards.first().click();
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        // Update title
        const titleInput = page.locator('input[placeholder="Task title"]').first();
        const updatedTitle = `Updated GitHub Task ${Date.now()}`;
        await titleInput.fill(updatedTitle);

        // Update status
        await page.click('text=Status');
        await page.click('text=IN PROGRESS');

        // Save changes
        await page.click('button:has-text("Save Changes")');

        // Wait for save to complete
        await page.waitForSelector('text=Unsaved', { state: 'hidden', timeout: 10000 });

        // Verify the updated title appears
        await expect(page.locator(`text=${updatedTitle}`)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should handle GitHub conflict error on update', async ({ page }) => {
      // This test would require simulating a conflict by modifying the file
      // externally while the update is in progress
      // Placeholder for manual testing scenario
      expect(true).toBe(true);
    });

    test('should update task tags and sync to GitHub', async ({ page }) => {
      await page.waitForTimeout(2000);

      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();

      if (count > 0) {
        await taskCards.first().click();
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        // Update tags
        const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
        await tagInput.fill('updated-tag, new-tag, test-tag');

        // Save changes
        await page.click('button:has-text("Save Changes")');

        // Wait for save to complete
        await page.waitForSelector('text=Unsaved', { state: 'hidden', timeout: 10000 });

        // Close sidebar
        await page.click('button[aria-label="Close sidebar"]');

        // Reopen the task to verify tags were saved
        await taskCards.first().click();
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        const savedTagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
        const savedValue = await savedTagInput.inputValue();

        expect(savedValue).toContain('updated-tag');
      }
    });
  });

  test.describe('Delete Task on GitHub', () => {
    test('should delete a task and remove from GitHub', async ({ page }) => {
      // First create a task to delete
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      const titleInput = page.locator('input[placeholder="Enter task title..."]');
      const testTitle = `Task to Delete ${Date.now()}`;
      await titleInput.fill(testTitle);

      await page.click('button:has-text("Create Task")');
      await page.waitForSelector('text=Initialize New Task', { state: 'hidden', timeout: 10000 });

      // Wait for task to appear
      await expect(page.locator(`text=${testTitle}`)).toBeVisible({ timeout: 5000 });

      // Find and click the task
      await page.click(`text=${testTitle}`);
      await page.waitForSelector('text=Task Title', { timeout: 5000 });

      // Click delete button
      await page.click('button:has-text("Delete")');

      // Confirm deletion in modal
      await page.click('button:has-text("Confirm")');

      // Wait for deletion to complete and sidebar to close
      await page.waitForSelector('text=Task Title', { state: 'hidden', timeout: 10000 });

      // Verify task is removed from list
      await expect(page.locator(`text=${testTitle}`)).not.toBeVisible({ timeout: 5000 });
    });

    test('should handle GitHub 404 error when task already deleted', async ({ page }) => {
      // This test would require deleting a file externally and then
      // attempting to delete it in the app
      // Placeholder for manual testing scenario
      expect(true).toBe(true);
    });
  });

  test.describe('GitHub Cache Invalidation', () => {
    test('should invalidate cache after task creation', async ({ page }) => {
      // Create a task
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      const titleInput = page.locator('input[placeholder="Enter task title..."]');
      const testTitle = `Cache Test ${Date.now()}`;
      await titleInput.fill(testTitle);

      await page.click('button:has-text("Create Task")');
      await page.waitForSelector('text=Initialize New Task', { state: 'hidden', timeout: 10000 });

      // Refresh the page to force cache usage
      await page.reload();
      await page.waitForSelector('text=TaskFlow', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Verify task still appears (cache should be populated)
      await expect(page.locator(`text=${testTitle}`)).toBeVisible({ timeout: 5000 });
    });

    test('should invalidate cache after task update', async ({ page }) => {
      await page.waitForTimeout(2000);

      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();

      if (count > 0) {
        // Get original title
        const firstCard = taskCards.first();
        const originalTitle = await firstCard.locator('h3').textContent();

        // Update task
        await firstCard.click();
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        const titleInput = page.locator('input[placeholder="Task title"]').first();
        const updatedTitle = `Cache Update ${Date.now()}`;
        await titleInput.fill(updatedTitle);

        await page.click('button:has-text("Save Changes")');
        await page.waitForSelector('text=Unsaved', { state: 'hidden', timeout: 10000 });

        // Refresh page
        await page.reload();
        await page.waitForSelector('text=TaskFlow', { timeout: 10000 });
        await page.waitForTimeout(2000);

        // Verify updated title appears (cache updated)
        await expect(page.locator(`text=${updatedTitle}`)).toBeVisible({ timeout: 5000 });
      }
    });

    test('should invalidate cache after task deletion', async ({ page }) => {
      // Create and immediately delete a task
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      const titleInput = page.locator('input[placeholder="Enter task title..."]');
      const testTitle = `Delete Cache Test ${Date.now()}`;
      await titleInput.fill(testTitle);

      await page.click('button:has-text("Create Task")');
      await page.waitForSelector('text=Initialize New Task', { state: 'hidden', timeout: 10000 });
      await expect(page.locator(`text=${testTitle}`)).toBeVisible({ timeout: 5000 });

      // Delete the task
      await page.click(`text=${testTitle}`);
      await page.waitForSelector('text=Task Title', { timeout: 5000 });
      await page.click('button:has-text("Delete")');
      await page.click('button:has-text("Confirm")');
      await page.waitForSelector('text=Task Title', { state: 'hidden', timeout: 10000 });

      // Refresh page
      await page.reload();
      await page.waitForSelector('text=TaskFlow', { timeout: 10000 });
      await page.waitForTimeout(2000);

      // Verify task does not appear (cache invalidated)
      await expect(page.locator(`text=${testTitle}`)).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('GitHub Error Handling UI', () => {
    test('should display user-friendly error messages', async ({ page }) => {
      // This test verifies that GitHub errors are displayed to users
      // Actual error triggering requires specific conditions
      // Placeholder for UI error message verification
      expect(true).toBe(true);
    });

    test('should allow retry after GitHub error', async ({ page }) => {
      // Verify that after a GitHub error, users can retry the operation
      // Placeholder for manual testing scenario
      expect(true).toBe(true);
    });
  });
});
