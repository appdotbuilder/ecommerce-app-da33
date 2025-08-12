import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { deleteCategory } from '../handlers/delete_category';
import { eq } from 'drizzle-orm';

describe('deleteCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete a category successfully when no products are assigned', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing deletion'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Delete the category
    const result = await deleteCategory(categoryId);

    // Verify the result
    expect(result.success).toBe(true);

    // Verify the category was deleted from database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);
  });

  it('should throw error when category does not exist', async () => {
    const nonExistentId = 999;

    await expect(deleteCategory(nonExistentId))
      .rejects.toThrow(/Category with id 999 not found/i);
  });

  it('should throw error when products are still assigned to category', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Category with Products',
        description: 'A category that will have products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create a product assigned to this category
    await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST-001',
        description: 'A test product',
        price: '29.99',
        stock: 50,
        category_id: categoryId,
        image_url: null
      })
      .execute();

    // Try to delete the category - should fail
    await expect(deleteCategory(categoryId))
      .rejects.toThrow(/Cannot delete category.*1 product\(s\) are still assigned/i);

    // Verify the category still exists in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should throw error when multiple products are assigned to category', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Category with Multiple Products',
        description: 'A category that will have multiple products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple products assigned to this category
    await db.insert(productsTable)
      .values([
        {
          name: 'Test Product 1',
          code: 'TEST-001',
          description: 'First test product',
          price: '19.99',
          stock: 25,
          category_id: categoryId,
          image_url: null
        },
        {
          name: 'Test Product 2',
          code: 'TEST-002',
          description: 'Second test product',
          price: '39.99',
          stock: 15,
          category_id: categoryId,
          image_url: null
        },
        {
          name: 'Test Product 3',
          code: 'TEST-003',
          description: 'Third test product',
          price: '59.99',
          stock: 10,
          category_id: categoryId,
          image_url: null
        }
      ])
      .execute();

    // Try to delete the category - should fail
    await expect(deleteCategory(categoryId))
      .rejects.toThrow(/Cannot delete category.*3 product\(s\) are still assigned/i);

    // Verify the category still exists in database
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(1);
  });

  it('should delete category after all products are removed', async () => {
    // Create a test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Category to Clean Up',
        description: 'A category that will be cleaned up'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create another category for reassignment
    const otherCategoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Other Category',
        description: 'Another category'
      })
      .returning()
      .execute();

    const otherCategoryId = otherCategoryResult[0].id;

    // Create a product assigned to the first category
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Product to Reassign',
        code: 'REASSIGN-001',
        description: 'A product that will be reassigned',
        price: '25.99',
        stock: 30,
        category_id: categoryId,
        image_url: null
      })
      .returning()
      .execute();

    const productId = productResult[0].id;

    // First deletion attempt should fail
    await expect(deleteCategory(categoryId))
      .rejects.toThrow(/Cannot delete category.*1 product\(s\) are still assigned/i);

    // Reassign the product to another category
    await db.update(productsTable)
      .set({ category_id: otherCategoryId })
      .where(eq(productsTable.id, productId))
      .execute();

    // Now deletion should succeed
    const result = await deleteCategory(categoryId);
    expect(result.success).toBe(true);

    // Verify the category was deleted
    const categories = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .execute();

    expect(categories).toHaveLength(0);

    // Verify the product still exists in the other category
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, productId))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].category_id).toBe(otherCategoryId);
  });
});