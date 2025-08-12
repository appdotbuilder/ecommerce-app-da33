import { db } from '../db';
import { shippingTable } from '../db/schema';
import { type UpdateShippingInput, type Shipping } from '../schema';
import { eq } from 'drizzle-orm';

export const updateShipping = async (input: UpdateShippingInput): Promise<Shipping> => {
  try {
    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.tracking_number !== undefined) {
      updateData.tracking_number = input.tracking_number || null;
    }

    if (input.shipping_status !== undefined) {
      updateData.shipping_status = input.shipping_status;
    }

    // Update shipping record
    const result = await db.update(shippingTable)
      .set(updateData)
      .where(eq(shippingTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Shipping record with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const shipping = result[0];
    return {
      ...shipping,
      cost: parseFloat(shipping.cost) // Convert string back to number
    };
  } catch (error) {
    console.error('Shipping update failed:', error);
    throw error;
  }
};