import { db } from '../db';
import { productsTable, cartItemsTable, orderItemsTable, ordersTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function deleteProduct(id: number): Promise<{ success: boolean }> {
  try {
    // First, check if the product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error(`Product with id ${id} not found`);
    }

    // Check if product is in any cart items
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.product_id, id))
      .execute();

    if (cartItems.length > 0) {
      throw new Error('Cannot delete product: it exists in shopping carts');
    }

    // Check if product is in any order items at all (for data integrity)
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.product_id, id))
      .execute();

    if (orderItems.length > 0) {
      throw new Error('Cannot delete product: it exists in order history');
    }

    // If all checks pass, delete the product
    await db.delete(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Product deletion failed:', error);
    throw error;
  }
}