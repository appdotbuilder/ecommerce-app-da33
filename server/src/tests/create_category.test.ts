import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type CreateCategoryInput } from '../schema';
import { createCategory } from '../handlers/create_category';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreateCategoryInput = {
  name: 'Electronics',
  description: 'Electronic devices and accessories'
};

// Test input with null description
const testInputWithoutDescription: CreateCategoryInput = {
  name: 'Books',
  description: null
};

describe('createCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a category with description', async () => {
    const result = await createCategory(testInput);

    // Basic field validation
    expect(result.name).toEqual('Electronics');
    expect(result.description).toEqual('Electronic devices and accessories');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should create a category without description', async () => {
    const result = await createCategory(testInputWithoutDescription);

    // Basic field validation
    expect(result.name).toEqual('Books');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should save category to database', async () => {
    const result = await createCategory(testInput);

    // Query using proper drizzle syntax
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, result.id))
      .execute();

    expect(categories).toHaveLength(1);
    expect(categories[0].name).toEqual('Electronics');
    expect(categories[0].description).toEqual('Electronic devices and accessories');
    expect(categories[0].created_at).toBeInstanceOf(Date);
    expect(categories[0].updated_at).toBeNull();
  });

  it('should handle unique category names properly', async () => {
    // Create first category
    await createCategory(testInput);

    // Attempt to create category with same name should not fail
    // since we don't have unique constraints on name in the schema
    const result2 = await createCategory(testInput);

    expect(result2.name).toEqual('Electronics');
    expect(result2.id).toBeDefined();
  });

  it('should create multiple categories with different names', async () => {
    const category1 = await createCategory(testInput);
    const category2 = await createCategory(testInputWithoutDescription);

    // Verify both categories exist in database
    const allCategories = await db.select()
      .from(categoriesTable)
      .execute();

    expect(allCategories).toHaveLength(2);
    
    // Verify categories have different IDs
    expect(category1.id).not.toEqual(category2.id);
    
    // Verify category names are preserved
    const categoryNames = allCategories.map(cat => cat.name).sort();
    expect(categoryNames).toEqual(['Books', 'Electronics']);
  });

  it('should handle empty string description', async () => {
    const inputWithEmptyDescription: CreateCategoryInput = {
      name: 'Test Category',
      description: ''
    };

    const result = await createCategory(inputWithEmptyDescription);

    expect(result.name).toEqual('Test Category');
    expect(result.description).toEqual('');
    expect(result.id).toBeDefined();
  });
});