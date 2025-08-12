import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, cartItemsTable } from '../db/schema';
import { getCartItems } from '../handlers/get_cart_items';

describe('getCartItems', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for user with no cart items', async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'customer'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getCartItems(userId);

    expect(result).toEqual([]);
  });

  it('should return cart items for user', async () => {
    // Create test data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'customer'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST-001',
        description: 'A test product',
        price: '19.99',
        stock: 100,
        category_id: categoryResult[0].id,
        image_url: null
      })
      .returning()
      .execute();

    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: userResult[0].id,
        product_id: productResult[0].id,
        quantity: 2
      })
      .returning()
      .execute();

    const result = await getCartItems(userResult[0].id);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: cartItemResult[0].id,
      user_id: userResult[0].id,
      product_id: productResult[0].id,
      quantity: 2
    });
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeNull();
  });

  it('should return multiple cart items for user', async () => {
    // Create test data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'customer'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const product1Result = await db.insert(productsTable)
      .values({
        name: 'Product 1',
        code: 'TEST-001',
        description: 'First test product',
        price: '19.99',
        stock: 100,
        category_id: categoryResult[0].id,
        image_url: null
      })
      .returning()
      .execute();

    const product2Result = await db.insert(productsTable)
      .values({
        name: 'Product 2',
        code: 'TEST-002',
        description: 'Second test product',
        price: '29.99',
        stock: 50,
        category_id: categoryResult[0].id,
        image_url: null
      })
      .returning()
      .execute();

    await db.insert(cartItemsTable)
      .values([
        {
          user_id: userResult[0].id,
          product_id: product1Result[0].id,
          quantity: 2
        },
        {
          user_id: userResult[0].id,
          product_id: product2Result[0].id,
          quantity: 1
        }
      ])
      .execute();

    const result = await getCartItems(userResult[0].id);

    expect(result).toHaveLength(2);
    
    // Check that all items belong to the correct user
    result.forEach(item => {
      expect(item.user_id).toEqual(userResult[0].id);
      expect(item.created_at).toBeInstanceOf(Date);
    });

    // Check specific products are included
    const productIds = result.map(item => item.product_id);
    expect(productIds).toContain(product1Result[0].id);
    expect(productIds).toContain(product2Result[0].id);
  });

  it('should only return cart items for specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed_password',
        first_name: 'John',
        last_name: 'Doe',
        role: 'customer'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'customer'
      })
      .returning()
      .execute();

    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic products'
      })
      .returning()
      .execute();

    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST-001',
        description: 'A test product',
        price: '19.99',
        stock: 100,
        category_id: categoryResult[0].id,
        image_url: null
      })
      .returning()
      .execute();

    // Add cart items for both users
    await db.insert(cartItemsTable)
      .values([
        {
          user_id: user1Result[0].id,
          product_id: productResult[0].id,
          quantity: 2
        },
        {
          user_id: user2Result[0].id,
          product_id: productResult[0].id,
          quantity: 3
        }
      ])
      .execute();

    const result1 = await getCartItems(user1Result[0].id);
    const result2 = await getCartItems(user2Result[0].id);

    // Each user should only see their own cart items
    expect(result1).toHaveLength(1);
    expect(result1[0].user_id).toEqual(user1Result[0].id);
    expect(result1[0].quantity).toEqual(2);

    expect(result2).toHaveLength(1);
    expect(result2[0].user_id).toEqual(user2Result[0].id);
    expect(result2[0].quantity).toEqual(3);
  });

  it('should handle non-existent user gracefully', async () => {
    const nonExistentUserId = 999999;

    const result = await getCartItems(nonExistentUserId);

    expect(result).toEqual([]);
  });
});