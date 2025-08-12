import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, productsTable, categoriesTable, cartItemsTable } from '../db/schema';
import { removeCartItem } from '../handlers/remove_cart_item';
import { eq, and } from 'drizzle-orm';

describe('removeCartItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testUser2: any;
  let testCategory: any;
  let testProduct: any;
  let testCartItem: any;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create second test user for ownership verification
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test2',
        last_name: 'User2',
        role: 'customer'
      })
      .returning()
      .execute();
    testUser2 = user2Result[0];

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    testCategory = categoryResult[0];

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'A product for testing',
        price: '19.99',
        stock: 100,
        category_id: testCategory.id
      })
      .returning()
      .execute();
    testProduct = productResult[0];

    // Create test cart item
    const cartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: testUser.id,
        product_id: testProduct.id,
        quantity: 2
      })
      .returning()
      .execute();
    testCartItem = cartItemResult[0];
  });

  it('should successfully remove cart item for correct user', async () => {
    const result = await removeCartItem(testCartItem.id, testUser.id);

    expect(result.success).toBe(true);

    // Verify item was removed from database
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItem.id))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should return false when cart item does not exist', async () => {
    const nonExistentId = 99999;
    const result = await removeCartItem(nonExistentId, testUser.id);

    expect(result.success).toBe(false);

    // Verify original cart item still exists
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItem.id))
      .execute();

    expect(cartItems).toHaveLength(1);
  });

  it('should return false when user does not own the cart item', async () => {
    const result = await removeCartItem(testCartItem.id, testUser2.id);

    expect(result.success).toBe(false);

    // Verify cart item still exists (not removed by wrong user)
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItem.id))
      .execute();

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].user_id).toBe(testUser.id);
  });

  it('should only remove the specific cart item when user has multiple items', async () => {
    // Create second cart item for same user
    const secondCartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: testUser.id,
        product_id: testProduct.id,
        quantity: 1
      })
      .returning()
      .execute();
    const secondCartItem = secondCartItemResult[0];

    // Remove first cart item
    const result = await removeCartItem(testCartItem.id, testUser.id);

    expect(result.success).toBe(true);

    // Verify only the first item was removed
    const firstItemCheck = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItem.id))
      .execute();

    const secondItemCheck = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, secondCartItem.id))
      .execute();

    expect(firstItemCheck).toHaveLength(0);
    expect(secondItemCheck).toHaveLength(1);
  });

  it('should verify user ownership correctly with multiple users having cart items', async () => {
    // Create cart item for second user
    const user2CartItemResult = await db.insert(cartItemsTable)
      .values({
        user_id: testUser2.id,
        product_id: testProduct.id,
        quantity: 3
      })
      .returning()
      .execute();
    const user2CartItem = user2CartItemResult[0];

    // Try to remove user2's cart item with user1's id
    const result = await removeCartItem(user2CartItem.id, testUser.id);

    expect(result.success).toBe(false);

    // Verify both users' cart items still exist
    const user1CartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, testUser.id))
      .execute();

    const user2CartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, testUser2.id))
      .execute();

    expect(user1CartItems).toHaveLength(1);
    expect(user2CartItems).toHaveLength(1);
  });

  it('should handle removal when cart item has foreign key relationships', async () => {
    // Verify product still exists before removal
    const productsBefore = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct.id))
      .execute();
    expect(productsBefore).toHaveLength(1);

    const result = await removeCartItem(testCartItem.id, testUser.id);

    expect(result.success).toBe(true);

    // Verify cart item was removed but product still exists
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, testCartItem.id))
      .execute();

    const productsAfter = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct.id))
      .execute();

    expect(cartItems).toHaveLength(0);
    expect(productsAfter).toHaveLength(1);
  });
});