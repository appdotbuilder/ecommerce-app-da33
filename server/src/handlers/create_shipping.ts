import { db } from '../db';
import { shippingTable, ordersTable } from '../db/schema';
import { type CreateShippingInput, type Shipping } from '../schema';
import { eq } from 'drizzle-orm';

export const createShipping = async (input: CreateShippingInput): Promise<Shipping> => {
  try {
    // Verify the order exists before creating shipping record
    const existingOrder = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (existingOrder.length === 0) {
      throw new Error(`Order with id ${input.order_id} not found`);
    }

    // Insert shipping record
    const result = await db.insert(shippingTable)
      .values({
        order_id: input.order_id,
        courier: input.courier,
        cost: input.cost.toString(), // Convert number to string for numeric column
        shipping_status: 'pending' // Default status
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const shipping = result[0];
    return {
      ...shipping,
      cost: parseFloat(shipping.cost) // Convert string back to number
    };
  } catch (error) {
    console.error('Shipping creation failed:', error);
    throw error;
  }
};