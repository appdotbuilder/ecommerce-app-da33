import { db } from '../db';
import { cartItemsTable, ordersTable, orderItemsTable, productsTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createOrder(input: CreateOrderInput, userId: number): Promise<Order> {
  try {
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // Get user's cart items with product details
      const cartItems = await tx.select({
        id: cartItemsTable.id,
        product_id: cartItemsTable.product_id,
        quantity: cartItemsTable.quantity,
        product_price: productsTable.price,
        product_stock: productsTable.stock,
        product_name: productsTable.name
      })
      .from(cartItemsTable)
      .innerJoin(productsTable, eq(cartItemsTable.product_id, productsTable.id))
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

      // Check if cart is empty
      if (cartItems.length === 0) {
        throw new Error('Cart is empty');
      }

      // Validate stock availability and calculate total
      let totalAmount = 0;
      for (const item of cartItems) {
        if (item.quantity > item.product_stock) {
          throw new Error(`Insufficient stock for product ${item.product_name}. Available: ${item.product_stock}, Requested: ${item.quantity}`);
        }
        totalAmount += parseFloat(item.product_price) * item.quantity;
      }

      // Create the order
      const orderResult = await tx.insert(ordersTable)
        .values({
          user_id: userId,
          total_amount: totalAmount.toString(),
          status: 'pending',
          shipping_address: input.shipping_address,
          shipping_method: input.shipping_method
        })
        .returning()
        .execute();

      const order = orderResult[0];

      // Create order items and update product stock
      for (const item of cartItems) {
        // Create order item
        await tx.insert(orderItemsTable)
          .values({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            price_at_purchase: item.product_price
          })
          .execute();

        // Update product stock
        await tx.update(productsTable)
          .set({ stock: item.product_stock - item.quantity })
          .where(eq(productsTable.id, item.product_id))
          .execute();
      }

      // Clear user's cart
      await tx.delete(cartItemsTable)
        .where(eq(cartItemsTable.user_id, userId))
        .execute();

      // Return the created order with proper type conversion
      return {
        ...order,
        total_amount: parseFloat(order.total_amount)
      };
    });
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
}