import { db } from '../db';
import { cartItemsTable, productsTable } from '../db/schema';
import { type UpdateCartItemInput, type CartItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateCartItem(input: UpdateCartItemInput, userId: number): Promise<CartItem> {
  try {
    // First, verify the cart item exists and belongs to the user
    const existingCartItems = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.id, input.id),
        eq(cartItemsTable.user_id, userId)
      ))
      .execute();

    if (existingCartItems.length === 0) {
      throw new Error('Cart item not found or does not belong to user');
    }

    const existingCartItem = existingCartItems[0];

    // Get product information to validate stock
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, existingCartItem.product_id))
      .execute();

    if (products.length === 0) {
      throw new Error('Product not found');
    }

    const product = products[0];

    // Validate stock availability
    if (input.quantity > product.stock) {
      throw new Error(`Insufficient stock. Available: ${product.stock}, requested: ${input.quantity}`);
    }

    // Update the cart item
    const updatedCartItems = await db.update(cartItemsTable)
      .set({
        quantity: input.quantity,
        updated_at: new Date()
      })
      .where(eq(cartItemsTable.id, input.id))
      .returning()
      .execute();

    return updatedCartItems[0];
  } catch (error) {
    console.error('Cart item update failed:', error);
    throw error;
  }
}