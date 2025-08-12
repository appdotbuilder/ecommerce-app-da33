import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { getCategories } from '../handlers/get_categories';

describe('getCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getCategories();

    expect(result).toEqual([]);
  });

  it('should return all categories', async () => {
    // Create test categories
    await db.insert(categoriesTable)
      .values([
        {
          name: 'Electronics',
          description: 'Electronic gadgets and devices'
        },
        {
          name: 'Books',
          description: 'Fiction and non-fiction books'
        },
        {
          name: 'Clothing',
          description: null
        }
      ])
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(3);
    
    // Check that all fields are present and correct
    const electronics = result.find(cat => cat.name === 'Electronics');
    expect(electronics).toBeDefined();
    expect(electronics?.description).toEqual('Electronic gadgets and devices');
    expect(electronics?.id).toBeDefined();
    expect(electronics?.created_at).toBeInstanceOf(Date);

    const books = result.find(cat => cat.name === 'Books');
    expect(books).toBeDefined();
    expect(books?.description).toEqual('Fiction and non-fiction books');

    const clothing = result.find(cat => cat.name === 'Clothing');
    expect(clothing).toBeDefined();
    expect(clothing?.description).toBeNull();
  });

  it('should preserve order of categories as returned from database', async () => {
    // Insert categories in a specific order
    const category1 = await db.insert(categoriesTable)
      .values({
        name: 'First Category',
        description: 'First description'
      })
      .returning()
      .execute();

    const category2 = await db.insert(categoriesTable)
      .values({
        name: 'Second Category',
        description: 'Second description'
      })
      .returning()
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(2);
    expect(result[0].name).toEqual('First Category');
    expect(result[1].name).toEqual('Second Category');
    expect(result[0].id).toBeLessThan(result[1].id);
  });

  it('should include all required fields for each category', async () => {
    await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description'
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    
    const category = result[0];
    expect(category.id).toBeDefined();
    expect(typeof category.id).toBe('number');
    expect(category.name).toEqual('Test Category');
    expect(category.description).toEqual('Test description');
    expect(category.created_at).toBeInstanceOf(Date);
    expect(category.updated_at).toBeNull();
  });

  it('should handle categories with null descriptions', async () => {
    await db.insert(categoriesTable)
      .values({
        name: 'No Description Category',
        description: null
      })
      .execute();

    const result = await getCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('No Description Category');
    expect(result[0].description).toBeNull();
  });
});