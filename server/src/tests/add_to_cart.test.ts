import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, cartItemsTable } from '../db/schema';
import { type AddToCartInput } from '../schema';
import { addToCart } from '../handlers/add_to_cart';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User',
  role: 'customer' as const,
  is_active: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  password_hash: 'hashed_password',
  first_name: 'Inactive',
  last_name: 'User',
  role: 'customer' as const,
  is_active: false
};

const testCategory = {
  name: 'Test Category',
  description: 'A category for testing'
};

const testProduct = {
  name: 'Test Product',
  code: 'TEST-001',
  description: 'A product for testing',
  price: '29.99',
  stock: 10,
  image_url: null
};

const testInput: AddToCartInput = {
  product_id: 0, // Will be set after product creation
  quantity: 2
};

describe('addToCart', () => {
  let userId: number;
  let inactiveUserId: number;
  let productId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create inactive user
    const inactiveUserResult = await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();
    inactiveUserId = inactiveUserResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        ...testProduct,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();
    productId = productResult[0].id;

    testInput.product_id = productId;
  });

  afterEach(resetDB);

  it('should add item to empty cart', async () => {
    const result = await addToCart(testInput, userId);

    expect(result.user_id).toEqual(userId);
    expect(result.product_id).toEqual(productId);
    expect(result.quantity).toEqual(2);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save cart item to database', async () => {
    const result = await addToCart(testInput, userId);

    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, result.id))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].user_id).toEqual(userId);
    expect(cartItems[0].product_id).toEqual(productId);
    expect(cartItems[0].quantity).toEqual(2);
    expect(cartItems[0].created_at).toBeInstanceOf(Date);
  });

  it('should merge quantities when adding existing item', async () => {
    // First add to cart
    await addToCart(testInput, userId);

    // Add same product again
    const secondAdd = { ...testInput, quantity: 3 };
    const result = await addToCart(secondAdd, userId);

    expect(result.quantity).toEqual(5); // 2 + 3
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify only one cart item exists
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.user_id, userId),
        eq(cartItemsTable.product_id, productId)
      ))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(5);
  });

  it('should reject adding item when insufficient stock', async () => {
    const largeQuantityInput = { ...testInput, quantity: 15 }; // More than stock (10)

    await expect(addToCart(largeQuantityInput, userId)).rejects.toThrow(/insufficient stock/i);

    // Verify no cart item was created
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should reject when total quantity exceeds stock', async () => {
    // First add 8 items
    await addToCart({ ...testInput, quantity: 8 }, userId);

    // Try to add 5 more (total would be 13, exceeding stock of 10)
    await expect(addToCart({ ...testInput, quantity: 5 }, userId)).rejects.toThrow(/total quantity exceeds/i);

    // Verify original quantity remains unchanged
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.user_id, userId),
        eq(cartItemsTable.product_id, productId)
      ))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].quantity).toEqual(8);
  });

  it('should reject when user does not exist', async () => {
    const nonExistentUserId = 99999;

    await expect(addToCart(testInput, nonExistentUserId)).rejects.toThrow(/user not found/i);

    // Verify no cart item was created
    const cartItems = await db.select()
      .from(cartItemsTable)
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should reject when user is inactive', async () => {
    await expect(addToCart(testInput, inactiveUserId)).rejects.toThrow(/user not found or inactive/i);

    // Verify no cart item was created
    const cartItems = await db.select()
      .from(cartItemsTable)
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should reject when product does not exist', async () => {
    const invalidProductInput = { ...testInput, product_id: 99999 };

    await expect(addToCart(invalidProductInput, userId)).rejects.toThrow(/product not found/i);

    // Verify no cart item was created
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should handle multiple users adding same product', async () => {
    // Create second active user
    const secondUser = await db.insert(usersTable)
      .values({
        email: 'second@example.com',
        password_hash: 'hashed_password',
        first_name: 'Second',
        last_name: 'User',
        role: 'customer' as const,
        is_active: true
      })
      .returning()
      .execute();

    // Both users add same product
    const result1 = await addToCart(testInput, userId);
    const result2 = await addToCart(testInput, secondUser[0].id);

    expect(result1.user_id).toEqual(userId);
    expect(result2.user_id).toEqual(secondUser[0].id);
    expect(result1.product_id).toEqual(productId);
    expect(result2.product_id).toEqual(productId);

    // Verify separate cart items exist
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.product_id, productId))
      .execute();

    expect(cartItems).toHaveLength(2);
    expect(cartItems.map(item => item.user_id).sort()).toEqual([userId, secondUser[0].id].sort());
  });
});