import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable, usersTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { type Order } from '../schema';

export async function getOrderById(id: number, userId?: number): Promise<Order | null> {
  try {
    // Build conditions array
    const conditions = [eq(ordersTable.id, id)];
    
    // If userId is provided, restrict to orders belonging to that user
    // Admins can omit userId to view any order
    if (userId !== undefined) {
      conditions.push(eq(ordersTable.user_id, userId));
    }

    // Build query with all conditions applied at once
    const query = db.select()
      .from(ordersTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const results = await query.execute();

    if (results.length === 0) {
      return null;
    }

    const orderData = results[0];

    // Convert numeric fields back to numbers for the return type
    return {
      ...orderData,
      total_amount: parseFloat(orderData.total_amount)
    };
  } catch (error) {
    console.error('Failed to fetch order:', error);
    throw error;
  }
}