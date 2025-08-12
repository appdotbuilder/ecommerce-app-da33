import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { getProductById } from '../handlers/get_product_by_id';

// Test data
const testCategory = {
  name: 'Electronics',
  description: 'Electronic devices and gadgets'
};

const testProduct = {
  name: 'Smartphone X',
  code: 'PHONE-X-001',
  description: 'Latest smartphone with advanced features',
  price: '599.99',
  stock: 50,
  image_url: 'https://example.com/phone.jpg'
};

describe('getProductById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a product when found', async () => {
    // Create category first (required for product foreign key)
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create product
    const productResult = await db.insert(productsTable)
      .values({
        ...testProduct,
        category_id: categoryId
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Test the handler
    const result = await getProductById(productId);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(productId);
    expect(result!.name).toEqual('Smartphone X');
    expect(result!.code).toEqual('PHONE-X-001');
    expect(result!.description).toEqual('Latest smartphone with advanced features');
    expect(result!.price).toEqual(599.99);
    expect(typeof result!.price).toBe('number'); // Verify numeric conversion
    expect(result!.stock).toEqual(50);
    expect(result!.category_id).toEqual(categoryId);
    expect(result!.image_url).toEqual('https://example.com/phone.jpg');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeNull();
  });

  it('should return null when product not found', async () => {
    const result = await getProductById(999);
    
    expect(result).toBeNull();
  });

  it('should handle products with null description and image_url', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create product with null optional fields
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Basic Product',
        code: 'BASIC-001',
        description: null,
        price: '19.99',
        stock: 10,
        category_id: categoryId,
        image_url: null
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Test the handler
    const result = await getProductById(productId);

    expect(result).not.toBeNull();
    expect(result!.name).toEqual('Basic Product');
    expect(result!.description).toBeNull();
    expect(result!.image_url).toBeNull();
    expect(result!.price).toEqual(19.99);
    expect(typeof result!.price).toBe('number');
  });

  it('should handle products with zero stock', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create product with zero stock
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Out of Stock Product',
        code: 'OOS-001',
        description: 'This product is out of stock',
        price: '29.99',
        stock: 0,
        category_id: categoryId,
        image_url: null
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Test the handler
    const result = await getProductById(productId);

    expect(result).not.toBeNull();
    expect(result!.stock).toEqual(0);
    expect(result!.price).toEqual(29.99);
  });

  it('should handle decimal prices correctly', async () => {
    // Create category first
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create product with decimal price
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Decimal Price Product',
        code: 'DEC-001',
        description: 'Product with decimal pricing',
        price: '123.45',
        stock: 25,
        category_id: categoryId,
        image_url: null
      })
      .returning()
      .execute();
    const productId = productResult[0].id;

    // Test the handler
    const result = await getProductById(productId);

    expect(result).not.toBeNull();
    expect(result!.price).toEqual(123.45);
    expect(typeof result!.price).toBe('number');
    // Verify precision is maintained
    expect(result!.price.toFixed(2)).toEqual('123.45');
  });
});