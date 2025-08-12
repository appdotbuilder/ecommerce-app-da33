import { db } from '../db';
import { cartItemsTable, productsTable, usersTable } from '../db/schema';
import { type AddToCartInput, type CartItem } from '../schema';
import { eq, and } from 'drizzle-orm';

export const addToCart = async (input: AddToCartInput, userId: number): Promise<CartItem> => {
  try {
    // Verify user exists and is active
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (user.length === 0 || !user[0].is_active) {
      throw new Error('User not found or inactive');
    }

    // Verify product exists and has sufficient stock
    const product = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.product_id))
      .execute();

    if (product.length === 0) {
      throw new Error('Product not found');
    }

    if (product[0].stock < input.quantity) {
      throw new Error('Insufficient stock available');
    }

    // Check if item already exists in cart
    const existingCartItem = await db.select()
      .from(cartItemsTable)
      .where(and(
        eq(cartItemsTable.user_id, userId),
        eq(cartItemsTable.product_id, input.product_id)
      ))
      .execute();

    let result;

    if (existingCartItem.length > 0) {
      // Update existing cart item quantity
      const newQuantity = existingCartItem[0].quantity + input.quantity;

      // Check if total quantity exceeds available stock
      if (newQuantity > product[0].stock) {
        throw new Error('Total quantity exceeds available stock');
      }

      result = await db.update(cartItemsTable)
        .set({ 
          quantity: newQuantity,
          updated_at: new Date()
        })
        .where(eq(cartItemsTable.id, existingCartItem[0].id))
        .returning()
        .execute();
    } else {
      // Create new cart item
      result = await db.insert(cartItemsTable)
        .values({
          user_id: userId,
          product_id: input.product_id,
          quantity: input.quantity
        })
        .returning()
        .execute();
    }

    return result[0];
  } catch (error) {
    console.error('Add to cart failed:', error);
    throw error;
  }
};