import { db } from '../db';
import { cartItemsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function removeCartItem(id: number, userId: number): Promise<{ success: boolean }> {
  try {
    // Remove cart item with user ownership verification
    const result = await db.delete(cartItemsTable)
      .where(and(
        eq(cartItemsTable.id, id),
        eq(cartItemsTable.user_id, userId)
      ))
      .execute();

    // Check if any rows were affected (item existed and belonged to user)
    return { success: (result.rowCount ?? 0) > 0 };
  } catch (error) {
    console.error('Cart item removal failed:', error);
    throw error;
  }
}