import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { type GetProductsInput } from '../schema';
import { getProducts } from '../handlers/get_products';

describe('getProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty results when no products exist', async () => {
    const input: GetProductsInput = {};
    const result = await getProducts(input);

    expect(result.products).toEqual([]);
    expect(result.total).toEqual(0);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);
  });

  it('should return all products without filters', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Laptop',
          code: 'LAPTOP-001',
          description: 'Gaming laptop',
          price: '999.99',
          stock: 10,
          category_id: categoryId,
          image_url: null
        },
        {
          name: 'Mouse',
          code: 'MOUSE-001',
          description: 'Wireless mouse',
          price: '29.99',
          stock: 50,
          category_id: categoryId,
          image_url: null
        }
      ])
      .execute();

    const result = await getProducts();

    expect(result.products).toHaveLength(2);
    expect(result.total).toEqual(2);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);
    
    // Verify numeric conversion
    expect(typeof result.products[0].price).toBe('number');
    expect(result.products[0].price).toEqual(999.99);
    expect(result.products[1].price).toEqual(29.99);

    // Verify product fields
    expect(result.products[0].name).toEqual('Laptop');
    expect(result.products[0].code).toEqual('LAPTOP-001');
    expect(result.products[0].stock).toEqual(10);
    expect(result.products[0].category_id).toEqual(categoryId);
  });

  it('should filter products by search term', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Gaming Laptop',
          code: 'LAPTOP-001',
          description: 'High-performance laptop',
          price: '999.99',
          stock: 10,
          category_id: categoryId,
          image_url: null
        },
        {
          name: 'Wireless Mouse',
          code: 'MOUSE-001',
          description: 'Bluetooth mouse',
          price: '29.99',
          stock: 50,
          category_id: categoryId,
          image_url: null
        }
      ])
      .execute();

    const input: GetProductsInput = {
      search: 'laptop'
    };

    const result = await getProducts(input);

    expect(result.products).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.products[0].name).toEqual('Gaming Laptop');
  });

  it('should filter products by category', async () => {
    // Create test categories
    const [electronics, clothing] = await Promise.all([
      db.insert(categoriesTable)
        .values({
          name: 'Electronics',
          description: 'Electronic products'
        })
        .returning()
        .execute(),
      db.insert(categoriesTable)
        .values({
          name: 'Clothing',
          description: 'Clothing items'
        })
        .returning()
        .execute()
    ]);

    const electronicsId = electronics[0].id;
    const clothingId = clothing[0].id;

    // Create test products in different categories
    await db.insert(productsTable)
      .values([
        {
          name: 'Laptop',
          code: 'LAPTOP-001',
          description: 'Gaming laptop',
          price: '999.99',
          stock: 10,
          category_id: electronicsId,
          image_url: null
        },
        {
          name: 'T-Shirt',
          code: 'TSHIRT-001',
          description: 'Cotton t-shirt',
          price: '19.99',
          stock: 100,
          category_id: clothingId,
          image_url: null
        }
      ])
      .execute();

    const input: GetProductsInput = {
      category_id: electronicsId
    };

    const result = await getProducts(input);

    expect(result.products).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.products[0].name).toEqual('Laptop');
    expect(result.products[0].category_id).toEqual(electronicsId);
  });

  it('should handle pagination correctly', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create multiple test products
    const products = Array.from({ length: 25 }, (_, i) => ({
      name: `Product ${i + 1}`,
      code: `PROD-${String(i + 1).padStart(3, '0')}`,
      description: `Description for product ${i + 1}`,
      price: (10 + i).toString(),
      stock: 10,
      category_id: categoryId,
      image_url: null
    }));

    await db.insert(productsTable)
      .values(products)
      .execute();

    // Test first page
    const firstPage = await getProducts({ page: 1, limit: 10 });
    expect(firstPage.products).toHaveLength(10);
    expect(firstPage.total).toEqual(25);
    expect(firstPage.page).toEqual(1);
    expect(firstPage.limit).toEqual(10);

    // Test second page
    const secondPage = await getProducts({ page: 2, limit: 10 });
    expect(secondPage.products).toHaveLength(10);
    expect(secondPage.total).toEqual(25);
    expect(secondPage.page).toEqual(2);
    expect(secondPage.limit).toEqual(10);

    // Test third page (partial)
    const thirdPage = await getProducts({ page: 3, limit: 10 });
    expect(thirdPage.products).toHaveLength(5);
    expect(thirdPage.total).toEqual(25);
    expect(thirdPage.page).toEqual(3);
    expect(thirdPage.limit).toEqual(10);

    // Verify different products on different pages
    expect(firstPage.products[0].name).not.toEqual(secondPage.products[0].name);
  });

  it('should combine search and category filters', async () => {
    // Create test categories
    const [electronics, clothing] = await Promise.all([
      db.insert(categoriesTable)
        .values({
          name: 'Electronics',
          description: 'Electronic products'
        })
        .returning()
        .execute(),
      db.insert(categoriesTable)
        .values({
          name: 'Clothing',
          description: 'Clothing items'
        })
        .returning()
        .execute()
    ]);

    const electronicsId = electronics[0].id;
    const clothingId = clothing[0].id;

    // Create test products
    await db.insert(productsTable)
      .values([
        {
          name: 'Gaming Laptop',
          code: 'LAPTOP-001',
          description: 'High-performance laptop',
          price: '999.99',
          stock: 10,
          category_id: electronicsId,
          image_url: null
        },
        {
          name: 'Laptop Bag',
          code: 'BAG-001',
          description: 'Protective laptop bag',
          price: '49.99',
          stock: 25,
          category_id: clothingId,
          image_url: null
        },
        {
          name: 'Wireless Mouse',
          code: 'MOUSE-001',
          description: 'Bluetooth mouse',
          price: '29.99',
          stock: 50,
          category_id: electronicsId,
          image_url: null
        }
      ])
      .execute();

    const input: GetProductsInput = {
      search: 'laptop',
      category_id: electronicsId
    };

    const result = await getProducts(input);

    expect(result.products).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.products[0].name).toEqual('Gaming Laptop');
    expect(result.products[0].category_id).toEqual(electronicsId);
  });

  it('should handle case-insensitive search', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test product
    await db.insert(productsTable)
      .values({
        name: 'Gaming LAPTOP',
        code: 'LAPTOP-001',
        description: 'High-performance laptop',
        price: '999.99',
        stock: 10,
        category_id: categoryId,
        image_url: null
      })
      .execute();

    const input: GetProductsInput = {
      search: 'laptop'
    };

    const result = await getProducts(input);

    expect(result.products).toHaveLength(1);
    expect(result.products[0].name).toEqual('Gaming LAPTOP');
  });

  it('should return empty results for non-existent category', async () => {
    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const categoryId = categoryResult[0].id;

    // Create test product
    await db.insert(productsTable)
      .values({
        name: 'Laptop',
        code: 'LAPTOP-001',
        description: 'Gaming laptop',
        price: '999.99',
        stock: 10,
        category_id: categoryId,
        image_url: null
      })
      .execute();

    const input: GetProductsInput = {
      category_id: 999 // Non-existent category
    };

    const result = await getProducts(input);

    expect(result.products).toEqual([]);
    expect(result.total).toEqual(0);
  });

  it('should use default values when input is undefined', async () => {
    const result = await getProducts();

    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);
    expect(result.products).toEqual([]);
    expect(result.total).toEqual(0);
  });
});