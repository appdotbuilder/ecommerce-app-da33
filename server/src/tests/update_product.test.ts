import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update product with all fields', async () => {
    // Create a category first
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create a product to update
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        code: 'ORIG001',
        description: 'Original description',
        price: '10.00',
        stock: 50,
        category_id: category.id,
        image_url: 'original.jpg'
      })
      .returning()
      .execute();

    const originalProduct = productResult[0];

    // Create another category for the update
    const newCategoryResult = await db.insert(categoriesTable)
      .values({
        name: 'New Category',
        description: 'A new test category'
      })
      .returning()
      .execute();

    const newCategory = newCategoryResult[0];

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Updated Product',
      code: 'UPD001',
      description: 'Updated description',
      price: 25.99,
      stock: 75,
      category_id: newCategory.id,
      image_url: 'updated.jpg'
    };

    const result = await updateProduct(updateInput);

    // Verify the returned product
    expect(result.id).toEqual(originalProduct.id);
    expect(result.name).toEqual('Updated Product');
    expect(result.code).toEqual('UPD001');
    expect(result.description).toEqual('Updated description');
    expect(result.price).toEqual(25.99);
    expect(typeof result.price).toEqual('number');
    expect(result.stock).toEqual(75);
    expect(result.category_id).toEqual(newCategory.id);
    expect(result.image_url).toEqual('updated.jpg');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toEqual(originalProduct.created_at);
  });

  it('should update product with partial fields', async () => {
    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create a product to update
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        code: 'ORIG001',
        description: 'Original description',
        price: '10.00',
        stock: 50,
        category_id: category.id,
        image_url: 'original.jpg'
      })
      .returning()
      .execute();

    const originalProduct = productResult[0];

    // Update only name and price
    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Partially Updated',
      price: 15.50
    };

    const result = await updateProduct(updateInput);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Partially Updated');
    expect(result.price).toEqual(15.50);
    expect(result.code).toEqual('ORIG001'); // Should remain unchanged
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.stock).toEqual(50); // Should remain unchanged
    expect(result.category_id).toEqual(category.id); // Should remain unchanged
    expect(result.image_url).toEqual('original.jpg'); // Should remain unchanged
  });

  it('should update nullable fields to null', async () => {
    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create a product with nullable fields set
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Original description',
        price: '10.00',
        stock: 50,
        category_id: category.id,
        image_url: 'original.jpg'
      })
      .returning()
      .execute();

    const originalProduct = productResult[0];

    // Update nullable fields to null
    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      description: null,
      image_url: null
    };

    const result = await updateProduct(updateInput);

    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
  });

  it('should persist changes to database', async () => {
    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create a product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Original Product',
        code: 'ORIG001',
        description: 'Original description',
        price: '10.00',
        stock: 50,
        category_id: category.id
      })
      .returning()
      .execute();

    const originalProduct = productResult[0];

    const updateInput: UpdateProductInput = {
      id: originalProduct.id,
      name: 'Updated Product',
      price: 20.00
    };

    await updateProduct(updateInput);

    // Verify the changes were persisted
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, originalProduct.id))
      .execute();

    expect(updatedProducts).toHaveLength(1);
    expect(updatedProducts[0].name).toEqual('Updated Product');
    expect(parseFloat(updatedProducts[0].price)).toEqual(20.00);
    expect(updatedProducts[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent product', async () => {
    const updateInput: UpdateProductInput = {
      id: 99999,
      name: 'Updated Product'
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product not found/i);
  });

  it('should throw error for duplicate product code', async () => {
    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create two products
    await db.insert(productsTable)
      .values([
        {
          name: 'Product 1',
          code: 'PROD001',
          price: '10.00',
          stock: 10,
          category_id: category.id
        },
        {
          name: 'Product 2',
          code: 'PROD002',
          price: '15.00',
          stock: 15,
          category_id: category.id
        }
      ])
      .execute();

    // Try to update second product with first product's code
    const products = await db.select().from(productsTable).execute();
    const product2 = products.find(p => p.code === 'PROD002');

    const updateInput: UpdateProductInput = {
      id: product2!.id,
      code: 'PROD001' // This code already exists
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Product code already exists/i);
  });

  it('should throw error for non-existent category', async () => {
    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create a product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        price: '10.00',
        stock: 10,
        category_id: category.id
      })
      .returning()
      .execute();

    const product = productResult[0];

    const updateInput: UpdateProductInput = {
      id: product.id,
      category_id: 99999 // Non-existent category
    };

    await expect(updateProduct(updateInput)).rejects.toThrow(/Category not found/i);
  });

  it('should allow updating code to same value', async () => {
    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    const category = categoryResult[0];

    // Create a product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        price: '10.00',
        stock: 10,
        category_id: category.id
      })
      .returning()
      .execute();

    const product = productResult[0];

    // Update with same code (should not throw error)
    const updateInput: UpdateProductInput = {
      id: product.id,
      code: 'TEST001', // Same code
      name: 'Updated Product'
    };

    const result = await updateProduct(updateInput);

    expect(result.code).toEqual('TEST001');
    expect(result.name).toEqual('Updated Product');
  });
});