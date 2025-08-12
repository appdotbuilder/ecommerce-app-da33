import { db } from '../db';
import { ordersTable } from '../db/schema';
import { type GetOrdersInput, type Order } from '../schema';
import { eq, and, desc, SQL, count } from 'drizzle-orm';

export async function getOrders(input: GetOrdersInput = {}, userId?: number): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  try {
    // Apply defaults
    const page = input.page || 1;
    const limit = input.limit || 20;
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Filter by status if provided
    if (input.status) {
      conditions.push(eq(ordersTable.status, input.status));
    }

    // Filter by user if customer (non-admin)
    if (userId) {
      conditions.push(eq(ordersTable.user_id, userId));
    }

    // Build queries in single chains to avoid TypeScript issues
    const whereClause = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;

    // Execute main query
    const ordersQuery = whereClause
      ? db.select()
          .from(ordersTable)
          .where(whereClause)
          .orderBy(desc(ordersTable.created_at))
          .limit(limit)
          .offset(offset)
      : db.select()
          .from(ordersTable)
          .orderBy(desc(ordersTable.created_at))
          .limit(limit)
          .offset(offset);

    // Execute count query
    const countQuery = whereClause
      ? db.select({ count: count() })
          .from(ordersTable)
          .where(whereClause)
      : db.select({ count: count() })
          .from(ordersTable);

    // Execute queries
    const [orders, countResult] = await Promise.all([
      ordersQuery.execute(),
      countQuery.execute()
    ]);

    // Convert numeric fields
    const formattedOrders: Order[] = orders.map(order => ({
      ...order,
      total_amount: parseFloat(order.total_amount)
    }));

    return {
      orders: formattedOrders,
      total: countResult[0].count,
      page,
      limit
    };
  } catch (error) {
    console.error('Get orders failed:', error);
    throw error;
  }
}