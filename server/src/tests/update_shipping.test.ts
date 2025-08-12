import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shippingTable, ordersTable, usersTable, categoriesTable, productsTable } from '../db/schema';
import { type UpdateShippingInput } from '../schema';
import { updateShipping } from '../handlers/update_shipping';
import { eq } from 'drizzle-orm';

describe('updateShipping', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestShipping = async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description'
      })
      .returning()
      .execute();

    // Create product
    const productResult = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Test product',
        price: '19.99',
        stock: 100,
        category_id: categoryResult[0].id
      })
      .returning()
      .execute();

    // Create order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userResult[0].id,
        total_amount: '29.99',
        status: 'paid',
        shipping_address: '123 Test St',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    // Create shipping record
    const shippingResult = await db.insert(shippingTable)
      .values({
        order_id: orderResult[0].id,
        courier: 'Test Courier',
        tracking_number: null,
        cost: '10.00',
        shipping_status: 'pending'
      })
      .returning()
      .execute();

    return {
      user: userResult[0],
      category: categoryResult[0],
      product: productResult[0],
      order: orderResult[0],
      shipping: shippingResult[0]
    };
  };

  it('should update tracking number', async () => {
    const testData = await createTestShipping();
    
    const input: UpdateShippingInput = {
      id: testData.shipping.id,
      tracking_number: 'TRK123456789'
    };

    const result = await updateShipping(input);

    // Verify returned data
    expect(result.id).toEqual(testData.shipping.id);
    expect(result.tracking_number).toEqual('TRK123456789');
    expect(result.shipping_status).toEqual('pending'); // Should remain unchanged
    expect(result.courier).toEqual('Test Courier');
    expect(result.cost).toEqual(10.00); // Numeric conversion
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at).not.toEqual(testData.shipping.created_at);
  });

  it('should update shipping status', async () => {
    const testData = await createTestShipping();
    
    const input: UpdateShippingInput = {
      id: testData.shipping.id,
      shipping_status: 'in_transit'
    };

    const result = await updateShipping(input);

    // Verify returned data
    expect(result.id).toEqual(testData.shipping.id);
    expect(result.shipping_status).toEqual('in_transit');
    expect(result.tracking_number).toBeNull(); // Should remain unchanged
    expect(result.courier).toEqual('Test Courier');
    expect(result.cost).toEqual(10.00); // Numeric conversion
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both tracking number and status', async () => {
    const testData = await createTestShipping();
    
    const input: UpdateShippingInput = {
      id: testData.shipping.id,
      tracking_number: 'TRK987654321',
      shipping_status: 'delivered'
    };

    const result = await updateShipping(input);

    // Verify returned data
    expect(result.id).toEqual(testData.shipping.id);
    expect(result.tracking_number).toEqual('TRK987654321');
    expect(result.shipping_status).toEqual('delivered');
    expect(result.courier).toEqual('Test Courier');
    expect(result.cost).toEqual(10.00); // Numeric conversion
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updates to database', async () => {
    const testData = await createTestShipping();
    
    const input: UpdateShippingInput = {
      id: testData.shipping.id,
      tracking_number: 'TRK111222333',
      shipping_status: 'in_transit'
    };

    await updateShipping(input);

    // Query database to verify updates
    const updatedShipping = await db.select()
      .from(shippingTable)
      .where(eq(shippingTable.id, testData.shipping.id))
      .execute();

    expect(updatedShipping).toHaveLength(1);
    expect(updatedShipping[0].tracking_number).toEqual('TRK111222333');
    expect(updatedShipping[0].shipping_status).toEqual('in_transit');
    expect(updatedShipping[0].updated_at).toBeInstanceOf(Date);
    expect(updatedShipping[0].updated_at).not.toEqual(testData.shipping.created_at);
  });

  it('should handle clearing tracking number with empty string', async () => {
    // First create shipping with tracking number
    const testData = await createTestShipping();
    
    // Update to add tracking number
    await db.update(shippingTable)
      .set({ tracking_number: 'TRK123456789' })
      .where(eq(shippingTable.id, testData.shipping.id))
      .execute();

    // Now clear tracking number by setting to empty string
    // Handler will convert empty string to null
    const input: UpdateShippingInput = {
      id: testData.shipping.id,
      tracking_number: ''
    };

    const result = await updateShipping(input);

    expect(result.tracking_number).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update to all valid shipping statuses', async () => {
    const testData = await createTestShipping();
    
    const statuses: Array<'pending' | 'in_transit' | 'delivered' | 'returned'> = [
      'pending', 'in_transit', 'delivered', 'returned'
    ];

    for (const status of statuses) {
      const input: UpdateShippingInput = {
        id: testData.shipping.id,
        shipping_status: status
      };

      const result = await updateShipping(input);
      expect(result.shipping_status).toEqual(status);
    }
  });

  it('should preserve other fields when updating', async () => {
    const testData = await createTestShipping();
    
    const input: UpdateShippingInput = {
      id: testData.shipping.id,
      tracking_number: 'TRK999888777'
    };

    const result = await updateShipping(input);

    // Verify other fields are preserved
    expect(result.order_id).toEqual(testData.shipping.order_id);
    expect(result.courier).toEqual(testData.shipping.courier);
    expect(result.cost).toEqual(parseFloat(testData.shipping.cost));
    expect(result.created_at).toEqual(testData.shipping.created_at);
  });

  it('should throw error for non-existent shipping record', async () => {
    const input: UpdateShippingInput = {
      id: 999999, // Non-existent ID
      tracking_number: 'TRK123456789'
    };

    await expect(updateShipping(input)).rejects.toThrow(/not found/i);
  });

  it('should handle numeric cost conversion correctly', async () => {
    const testData = await createTestShipping();
    
    const input: UpdateShippingInput = {
      id: testData.shipping.id,
      shipping_status: 'delivered'
    };

    const result = await updateShipping(input);

    // Verify cost is returned as number, not string
    expect(typeof result.cost).toBe('number');
    expect(result.cost).toEqual(10.00);
  });
});