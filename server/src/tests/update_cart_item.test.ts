import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, cartItemsTable } from '../db/schema';
import { type UpdateCartItemInput } from '../schema';
import { updateCartItem } from '../handlers/update_cart_item';
import { eq, and } from 'drizzle-orm';

describe('updateCartItem', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data setup helper
  async function setupTestData() {
    // Create a test user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create another user to test ownership validation
    const otherUsers = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        first_name: 'Other',
        last_name: 'User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create a test category
    const categories = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();

    // Create test products with different stock levels
    const products = await db.insert(productsTable)
      .values([
        {
          name: 'High Stock Product',
          code: 'HSP001',
          description: 'Product with high stock',
          price: '19.99',
          stock: 100,
          category_id: categories[0].id
        },
        {
          name: 'Low Stock Product',
          code: 'LSP001',
          description: 'Product with low stock',
          price: '29.99',
          stock: 5,
          category_id: categories[0].id
        },
        {
          name: 'Zero Stock Product',
          code: 'ZSP001',
          description: 'Product with no stock',
          price: '39.99',
          stock: 0,
          category_id: categories[0].id
        }
      ])
      .returning()
      .execute();

    // Create test cart items
    const cartItems = await db.insert(cartItemsTable)
      .values([
        {
          user_id: users[0].id,
          product_id: products[0].id,
          quantity: 2
        },
        {
          user_id: users[0].id,
          product_id: products[1].id,
          quantity: 1
        },
        {
          user_id: otherUsers[0].id,
          product_id: products[0].id,
          quantity: 3
        }
      ])
      .returning()
      .execute();

    return {
      user: users[0],
      otherUser: otherUsers[0],
      category: categories[0],
      products,
      cartItems
    };
  }

  it('should update cart item quantity successfully', async () => {
    const { user, cartItems } = await setupTestData();

    const updateInput: UpdateCartItemInput = {
      id: cartItems[0].id,
      quantity: 5
    };

    const result = await updateCartItem(updateInput, user.id);

    // Verify the returned cart item
    expect(result.id).toEqual(cartItems[0].id);
    expect(result.user_id).toEqual(user.id);
    expect(result.quantity).toEqual(5);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify the database was updated
    const updatedCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItems[0].id))
      .execute();

    expect(updatedCartItems[0].quantity).toEqual(5);
    expect(updatedCartItems[0].updated_at).toBeInstanceOf(Date);
  });

  it('should validate stock availability before updating', async () => {
    const { user, products, cartItems } = await setupTestData();

    // Try to update quantity beyond available stock
    const updateInput: UpdateCartItemInput = {
      id: cartItems[1].id, // Low stock product cart item
      quantity: 10 // More than available stock (5)
    };

    await expect(updateCartItem(updateInput, user.id))
      .rejects
      .toThrow(/insufficient stock/i);

    // Verify the cart item was not updated
    const unchangedCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItems[1].id))
      .execute();

    expect(unchangedCartItems[0].quantity).toEqual(1); // Original quantity
  });

  it('should allow updating to maximum available stock', async () => {
    const { user, cartItems } = await setupTestData();

    const updateInput: UpdateCartItemInput = {
      id: cartItems[1].id, // Low stock product cart item
      quantity: 5 // Exactly the available stock
    };

    const result = await updateCartItem(updateInput, user.id);

    expect(result.quantity).toEqual(5);

    // Verify database update
    const updatedCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItems[1].id))
      .execute();

    expect(updatedCartItems[0].quantity).toEqual(5);
  });

  it('should reject updating cart item that does not belong to user', async () => {
    const { user, cartItems } = await setupTestData();

    // Try to update another user's cart item
    const updateInput: UpdateCartItemInput = {
      id: cartItems[2].id, // Other user's cart item
      quantity: 1
    };

    await expect(updateCartItem(updateInput, user.id))
      .rejects
      .toThrow(/not found or does not belong to user/i);
  });

  it('should reject updating non-existent cart item', async () => {
    const { user } = await setupTestData();

    const updateInput: UpdateCartItemInput = {
      id: 99999, // Non-existent cart item
      quantity: 1
    };

    await expect(updateCartItem(updateInput, user.id))
      .rejects
      .toThrow(/not found or does not belong to user/i);
  });

  it('should handle zero stock products appropriately', async () => {
    const { user, cartItems } = await setupTestData();

    // Try to update to any quantity for zero stock product
    // First, add a cart item for zero stock product
    const zeroStockProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.stock, 0))
      .execute();

    const zeroStockCartItems = await db.insert(cartItemsTable)
      .values({
        user_id: user.id,
        product_id: zeroStockProducts[0].id,
        quantity: 1
      })
      .returning()
      .execute();

    const updateInput: UpdateCartItemInput = {
      id: zeroStockCartItems[0].id,
      quantity: 1
    };

    await expect(updateCartItem(updateInput, user.id))
      .rejects
      .toThrow(/insufficient stock/i);
  });

  it('should handle updating quantity to 1', async () => {
    const { user, cartItems } = await setupTestData();

    const updateInput: UpdateCartItemInput = {
      id: cartItems[0].id,
      quantity: 1
    };

    const result = await updateCartItem(updateInput, user.id);

    expect(result.quantity).toEqual(1);
    expect(result.id).toEqual(cartItems[0].id);

    // Verify database update
    const updatedCartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.id, cartItems[0].id))
      .execute();

    expect(updatedCartItems[0].quantity).toEqual(1);
  });

  it('should preserve other cart item fields during update', async () => {
    const { user, cartItems } = await setupTestData();

    const originalCartItem = cartItems[0];
    const updateInput: UpdateCartItemInput = {
      id: originalCartItem.id,
      quantity: 7
    };

    const result = await updateCartItem(updateInput, user.id);

    // Verify unchanged fields are preserved
    expect(result.id).toEqual(originalCartItem.id);
    expect(result.user_id).toEqual(originalCartItem.user_id);
    expect(result.product_id).toEqual(originalCartItem.product_id);
    expect(result.created_at).toEqual(originalCartItem.created_at);
    
    // Verify changed fields
    expect(result.quantity).toEqual(7);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at).not.toEqual(originalCartItem.updated_at);
  });
});