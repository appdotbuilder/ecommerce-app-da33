import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type UpdateCategoryInput, type CreateCategoryInput } from '../schema';
import { updateCategory } from '../handlers/update_category';
import { eq } from 'drizzle-orm';

// Helper function to create a test category
const createTestCategory = async (categoryData: CreateCategoryInput) => {
  const result = await db.insert(categoriesTable)
    .values({
      name: categoryData.name,
      description: categoryData.description
    })
    .returning()
    .execute();
  return result[0];
};

describe('updateCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update category name', async () => {
    // Create a test category
    const testCategory = await createTestCategory({
      name: 'Original Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      name: 'Updated Category Name'
    };

    const result = await updateCategory(updateInput);

    // Verify response
    expect(result.id).toEqual(testCategory.id);
    expect(result.name).toEqual('Updated Category Name');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at).not.toEqual(result.created_at);
  });

  it('should update category description', async () => {
    // Create a test category
    const testCategory = await createTestCategory({
      name: 'Test Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      description: 'Updated description'
    };

    const result = await updateCategory(updateInput);

    // Verify response
    expect(result.id).toEqual(testCategory.id);
    expect(result.name).toEqual('Test Category'); // Should remain unchanged
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both name and description', async () => {
    // Create a test category
    const testCategory = await createTestCategory({
      name: 'Original Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      name: 'Updated Category',
      description: 'Updated description'
    };

    const result = await updateCategory(updateInput);

    // Verify response
    expect(result.id).toEqual(testCategory.id);
    expect(result.name).toEqual('Updated Category');
    expect(result.description).toEqual('Updated description');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null when explicitly provided', async () => {
    // Create a test category with a description
    const testCategory = await createTestCategory({
      name: 'Test Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      description: null
    };

    const result = await updateCategory(updateInput);

    // Verify response
    expect(result.id).toEqual(testCategory.id);
    expect(result.name).toEqual('Test Category'); // Should remain unchanged
    expect(result.description).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes in database', async () => {
    // Create a test category
    const testCategory = await createTestCategory({
      name: 'Original Category',
      description: 'Original description'
    });

    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      name: 'Database Update Test',
      description: 'Updated in database'
    };

    await updateCategory(updateInput);

    // Query database directly to verify persistence
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, testCategory.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Database Update Test');
    expect(categories[0].description).toEqual('Updated in database');
    expect(categories[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateCategoryInput = {
      id: 999999, // Non-existent ID
      name: 'Updated Category'
    };

    await expect(updateCategory(updateInput)).rejects.toThrow(/Category with id 999999 not found/i);
  });

  it('should update only provided fields', async () => {
    // Create a test category
    const testCategory = await createTestCategory({
      name: 'Original Category',
      description: 'Original description'
    });

    // Update only name, leaving description unchanged
    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      name: 'Only Name Updated'
    };

    const result = await updateCategory(updateInput);

    // Verify only name was updated
    expect(result.name).toEqual('Only Name Updated');
    expect(result.description).toEqual('Original description');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, testCategory.id))
      .execute();

    expect(dbCategory[0].name).toEqual('Only Name Updated');
    expect(dbCategory[0].description).toEqual('Original description');
  });

  it('should handle category with null description', async () => {
    // Create a test category with null description
    const testCategory = await createTestCategory({
      name: 'Category with null desc',
      description: null
    });

    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      name: 'Updated Name'
    };

    const result = await updateCategory(updateInput);

    // Verify response
    expect(result.name).toEqual('Updated Name');
    expect(result.description).toBeNull(); // Should remain null
  });

  it('should update updated_at timestamp', async () => {
    // Create a test category
    const testCategory = await createTestCategory({
      name: 'Timestamp Test',
      description: 'Testing timestamps'
    });

    const originalUpdatedAt = testCategory.updated_at;

    // Wait a bit to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 1));

    const updateInput: UpdateCategoryInput = {
      id: testCategory.id,
      name: 'Updated for timestamp test'
    };

    const result = await updateCategory(updateInput);

    // Verify updated_at changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at).not.toEqual(originalUpdatedAt);
    expect(result.updated_at).not.toBeNull();
    expect(result.updated_at!.getTime()).toBeGreaterThan(result.created_at.getTime());
  });
});