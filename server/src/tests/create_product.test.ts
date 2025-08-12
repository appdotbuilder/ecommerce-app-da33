import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateProductInput = {
  name: 'Test Product',
  code: 'TEST001',
  description: 'A product for testing',
  price: 19.99,
  stock: 100,
  category_id: 1,
  image_url: 'https://example.com/image.jpg'
};

describe('createProduct', () => {
  let categoryId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create a test category first (required for foreign key constraint)
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    
    categoryId = categoryResult[0].id;
    testInput.category_id = categoryId;
  });

  afterEach(resetDB);

  it('should create a product with all fields', async () => {
    const result = await createProduct(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.code).toEqual('TEST001');
    expect(result.description).toEqual('A product for testing');
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toEqual('number');
    expect(result.stock).toEqual(100);
    expect(result.category_id).toEqual(categoryId);
    expect(result.image_url).toEqual('https://example.com/image.jpg');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should create a product with minimal fields', async () => {
    const minimalInput: CreateProductInput = {
      name: 'Minimal Product',
      code: 'MIN001',
      description: null,
      price: 9.99,
      stock: 50,
      category_id: categoryId,
      image_url: null
    };

    const result = await createProduct(minimalInput);

    expect(result.name).toEqual('Minimal Product');
    expect(result.code).toEqual('MIN001');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(9.99);
    expect(result.stock).toEqual(50);
    expect(result.category_id).toEqual(categoryId);
    expect(result.image_url).toBeNull();
  });

  it('should save product to database correctly', async () => {
    const result = await createProduct(testInput);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    const savedProduct = products[0];
    expect(savedProduct.name).toEqual('Test Product');
    expect(savedProduct.code).toEqual('TEST001');
    expect(savedProduct.description).toEqual('A product for testing');
    expect(parseFloat(savedProduct.price)).toEqual(19.99); // Database stores as string
    expect(savedProduct.stock).toEqual(100);
    expect(savedProduct.category_id).toEqual(categoryId);
    expect(savedProduct.image_url).toEqual('https://example.com/image.jpg');
    expect(savedProduct.created_at).toBeInstanceOf(Date);
  });

  it('should handle numeric price conversion correctly', async () => {
    const priceTestInput: CreateProductInput = {
      name: 'Price Test Product',
      code: 'PRICE001',
      description: 'Testing price conversion',
      price: 123.45,
      stock: 10,
      category_id: categoryId,
      image_url: null
    };

    const result = await createProduct(priceTestInput);

    // Verify the returned price is a number
    expect(typeof result.price).toEqual('number');
    expect(result.price).toEqual(123.45);

    // Verify database storage (as string) and retrieval
    const dbProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(typeof dbProduct[0].price).toEqual('string');
    expect(parseFloat(dbProduct[0].price)).toEqual(123.45);
  });

  it('should throw error for duplicate product code', async () => {
    // Create first product
    await createProduct(testInput);

    // Try to create another product with same code
    const duplicateInput: CreateProductInput = {
      ...testInput,
      name: 'Duplicate Product'
    };

    await expect(createProduct(duplicateInput)).rejects.toThrow(/already exists/i);
  });

  it('should throw error for non-existent category', async () => {
    const invalidInput: CreateProductInput = {
      ...testInput,
      category_id: 999999 // Non-existent category
    };

    await expect(createProduct(invalidInput)).rejects.toThrow(/does not exist/i);
  });

  it('should handle zero stock correctly', async () => {
    const zeroStockInput: CreateProductInput = {
      ...testInput,
      code: 'ZERO001',
      stock: 0
    };

    const result = await createProduct(zeroStockInput);

    expect(result.stock).toEqual(0);
  });

  it('should handle large numbers correctly', async () => {
    const largeNumberInput: CreateProductInput = {
      ...testInput,
      code: 'LARGE001',
      price: 999999.99,
      stock: 999999
    };

    const result = await createProduct(largeNumberInput);

    expect(result.price).toEqual(999999.99);
    expect(result.stock).toEqual(999999);
  });
});