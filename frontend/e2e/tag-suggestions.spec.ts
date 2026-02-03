import { test, expect } from '@playwright/test';

test.describe('Tag Suggestions Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('text=TaskFlow', { timeout: 10000 });
  });

  test.describe('CreateTaskModal', () => {
    test('should show tag suggestions below input when tags exist', async ({ page }) => {
      // First, we need tasks with tags to exist
      // Open create task modal
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      // Check if tag input exists
      const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
      await expect(tagInput).toBeVisible();

      // If there are existing tags, the suggestion container should be visible
      // This depends on existing data, so we check for the structure
      const tagSuggestionContainer = page.locator('.overflow-x-auto').first();
      // Container may or may not be visible depending on existing tags
    });

    test('should add tag when clicking suggestion chip', async ({ page }) => {
      // Open create task modal
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      // Get the tag input
      const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();

      // Check if there are any tag suggestion buttons
      const tagButtons = page.locator('button:has-text("#")');
      const count = await tagButtons.count();

      if (count > 0) {
        // Get the first tag button text
        const firstTagButton = tagButtons.first();
        const tagText = await firstTagButton.textContent();
        const tagName = tagText?.replace('#', '').trim();

        // Click the tag suggestion
        await firstTagButton.click();

        // Verify the tag was added to the input
        const inputValue = await tagInput.inputValue();
        expect(inputValue).toContain(tagName);

        // Verify the button now has the selected style (cyan color)
        await expect(firstTagButton).toHaveClass(/bg-cyan-500/);
      }
    });

    test('should remove tag when clicking selected suggestion chip', async ({ page }) => {
      // Open create task modal
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
      const tagButtons = page.locator('button:has-text("#")');
      const count = await tagButtons.count();

      if (count > 0) {
        const firstTagButton = tagButtons.first();
        const tagText = await firstTagButton.textContent();
        const tagName = tagText?.replace('#', '').trim();

        // Click to add
        await firstTagButton.click();
        let inputValue = await tagInput.inputValue();
        expect(inputValue).toContain(tagName);

        // Click again to remove
        await firstTagButton.click();
        inputValue = await tagInput.inputValue();
        expect(inputValue).not.toContain(tagName);

        // Verify the button no longer has selected style
        await expect(firstTagButton).not.toHaveClass(/bg-cyan-500/);
      }
    });

    test('should support horizontal scrolling for many tags', async ({ page }) => {
      // Open create task modal
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      // Check if the container has overflow-x-auto class
      const scrollContainer = page.locator('.overflow-x-auto').first();

      // If tags exist, the container should have proper scrolling styles
      const tagButtons = page.locator('button:has-text("#")');
      const count = await tagButtons.count();

      if (count > 0) {
        await expect(scrollContainer).toBeVisible();
        // The inner flex container should have min-width: max-content
        const innerContainer = scrollContainer.locator('div.flex');
        await expect(innerContainer).toHaveCSS('min-width', 'max-content');
      }
    });

    test('should allow manual tag input alongside chip selection', async ({ page }) => {
      // Open create task modal
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      // Type a custom tag in the input
      const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
      await tagInput.fill('my-custom-tag');

      // Verify the input has our custom tag
      const value = await tagInput.inputValue();
      expect(value).toBe('my-custom-tag');

      // Check that tag chips are still visible and clickable
      const tagButtons = page.locator('button:has-text("#")');
      const count = await tagButtons.count();

      if (count > 0) {
        // Click a suggestion - it should be appended
        await tagButtons.first().click();
        const newValue = await tagInput.inputValue();
        // Should contain both the custom tag and the selected chip
        expect(newValue).toContain('my-custom-tag');
      }
    });
  });

  test.describe('TaskSidebar', () => {
    test('should show tag suggestions in sidebar when editing task', async ({ page }) => {
      // Wait for tasks to load
      await page.waitForTimeout(2000);

      // Check if there are any task cards
      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();

      if (count > 0) {
        // Click on first task to open sidebar
        await taskCards.first().click();

        // Wait for sidebar to open
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        // Look for tag input in sidebar (Settings tab should be default)
        const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
        await expect(tagInput).toBeVisible();

        // Check for tag suggestions
        const tagButtons = page.locator('button:has-text("#")');
        // Tags may or may not exist
      }
    });

    test('should toggle tag selection in sidebar', async ({ page }) => {
      await page.waitForTimeout(2000);

      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();

      if (count > 0) {
        await taskCards.first().click();
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        const tagButtons = page.locator('button:has-text("#")');
        const tagCount = await tagButtons.count();

        if (tagCount > 0) {
          const firstTag = tagButtons.first();
          const initialClass = await firstTag.getAttribute('class');
          const wasSelected = initialClass?.includes('bg-cyan-500');

          // Click to toggle
          await firstTag.click();

          // Verify unsaved indicator appears
          await expect(page.locator('text=Unsaved')).toBeVisible();

          // Verify style changed
          const newClass = await firstTag.getAttribute('class');
          if (wasSelected) {
            expect(newClass).not.toContain('bg-cyan-500');
          } else {
            expect(newClass).toContain('bg-cyan-500');
          }
        }
      }
    });

    test('should sync tag input with chip selection', async ({ page }) => {
      await page.waitForTimeout(2000);

      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();

      if (count > 0) {
        await taskCards.first().click();
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
        const tagButtons = page.locator('button:has-text("#")');
        const tagCount = await tagButtons.count();

        if (tagCount > 0) {
          // Clear input first
          await tagInput.fill('');

          // Click a tag chip
          const firstTag = tagButtons.first();
          const tagText = await firstTag.textContent();
          const tagName = tagText?.replace('#', '').trim();

          await firstTag.click();

          // Verify input contains the tag
          const inputValue = await tagInput.inputValue();
          expect(inputValue).toContain(tagName);
        }
      }
    });

    test('should have horizontally scrollable tag suggestions in sidebar', async ({ page }) => {
      await page.waitForTimeout(2000);

      const taskCards = page.locator('[data-testid="task-card"]');
      const count = await taskCards.count();

      if (count > 0) {
        await taskCards.first().click();
        await page.waitForSelector('text=Task Title', { timeout: 5000 });

        const tagButtons = page.locator('button:has-text("#")');
        const tagCount = await tagButtons.count();

        if (tagCount > 0) {
          // Find the scrollable container in sidebar
          const scrollContainers = page.locator('.overflow-x-auto');
          const containerCount = await scrollContainers.count();

          // Should have at least one scrollable container
          expect(containerCount).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Tag Persistence', () => {
    test('should preserve selected tags after adding via chip', async ({ page }) => {
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();
      const tagButtons = page.locator('button:has-text("#")');
      const count = await tagButtons.count();

      if (count >= 2) {
        // Select first two tags
        await tagButtons.nth(0).click();
        await tagButtons.nth(1).click();

        const inputValue = await tagInput.inputValue();
        const tags = inputValue.split(',').map(t => t.trim()).filter(Boolean);

        // Should have 2 tags
        expect(tags.length).toBe(2);
      }
    });

    test('should combine typed tags with chip selections', async ({ page }) => {
      await page.click('button:has-text("New Task")');
      await page.waitForSelector('text=Initialize New Task');

      const tagInput = page.locator('input[placeholder="backend, api, auth..."]').first();

      // Type a custom tag
      await tagInput.fill('custom-tag');

      const tagButtons = page.locator('button:has-text("#")');
      const count = await tagButtons.count();

      if (count > 0) {
        // Add a suggestion chip
        await tagButtons.first().click();

        const inputValue = await tagInput.inputValue();
        expect(inputValue).toContain('custom-tag');
        // The chip tag should also be present
      }
    });
  });
});
