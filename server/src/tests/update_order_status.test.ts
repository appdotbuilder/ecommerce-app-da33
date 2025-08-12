import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { ordersTable, usersTable } from '../db/schema';
import { type UpdateOrderStatusInput } from '../schema';
import { updateOrderStatus } from '../handlers/update_order_status';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  first_name: 'Test',
  last_name: 'User',
  role: 'customer' as const,
  is_active: true
};

// Test order data
const testOrder = {
  user_id: 1,
  total_amount: '199.99',
  status: 'pending' as const,
  shipping_address: '123 Main St, City, State 12345',
  shipping_method: 'Standard'
};

describe('updateOrderStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update order status successfully', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test order
    const [createdOrder] = await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();

    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'paid'
    };

    const result = await updateOrderStatus(updateInput);

    // Verify response
    expect(result.id).toEqual(createdOrder.id);
    expect(result.status).toEqual('paid');
    expect(result.user_id).toEqual(1);
    expect(result.total_amount).toEqual(199.99);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.total_amount).toBe('number');
  });

  it('should save updated status to database', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test order
    const [createdOrder] = await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();

    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'shipped'
    };

    await updateOrderStatus(updateInput);

    // Verify database was updated
    const updatedOrders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, createdOrder.id))
      .execute();

    expect(updatedOrders).toHaveLength(1);
    expect(updatedOrders[0].status).toEqual('shipped');
    expect(updatedOrders[0].updated_at).toBeInstanceOf(Date);
    expect(updatedOrders[0].updated_at).not.toEqual(createdOrder.updated_at);
  });

  it('should handle all valid status transitions', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test order
    const [createdOrder] = await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();

    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'] as const;

    for (const status of validStatuses) {
      const updateInput: UpdateOrderStatusInput = {
        id: createdOrder.id,
        status
      };

      const result = await updateOrderStatus(updateInput);
      expect(result.status).toEqual(status);

      // Verify in database
      const [dbOrder] = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, createdOrder.id))
        .execute();
      
      expect(dbOrder.status).toEqual(status);
    }
  });

  it('should throw error when order does not exist', async () => {
    const updateInput: UpdateOrderStatusInput = {
      id: 999,
      status: 'paid'
    };

    await expect(updateOrderStatus(updateInput)).rejects.toThrow(/Order with id 999 not found/);
  });

  it('should preserve other order fields when updating status', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test order
    const [createdOrder] = await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();

    const updateInput: UpdateOrderStatusInput = {
      id: createdOrder.id,
      status: 'completed'
    };

    const result = await updateOrderStatus(updateInput);

    // Verify all fields are preserved except status and updated_at
    expect(result.id).toEqual(createdOrder.id);
    expect(result.user_id).toEqual(createdOrder.user_id);
    expect(result.total_amount).toEqual(parseFloat(createdOrder.total_amount));
    expect(result.shipping_address).toEqual(createdOrder.shipping_address);
    expect(result.shipping_method).toEqual(createdOrder.shipping_method);
    expect(result.created_at).toEqual(createdOrder.created_at);
    expect(result.status).toEqual('completed');
    expect(result.updated_at).not.toEqual(createdOrder.updated_at);
  });

  it('should handle multiple status updates on same order', async () => {
    // Create prerequisite user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test order
    const [createdOrder] = await db.insert(ordersTable)
      .values(testOrder)
      .returning()
      .execute();

    // First update: pending -> paid
    await updateOrderStatus({
      id: createdOrder.id,
      status: 'paid'
    });

    // Second update: paid -> shipped
    await updateOrderStatus({
      id: createdOrder.id,
      status: 'shipped'
    });

    // Third update: shipped -> completed
    const finalResult = await updateOrderStatus({
      id: createdOrder.id,
      status: 'completed'
    });

    expect(finalResult.status).toEqual('completed');

    // Verify final state in database
    const [finalOrder] = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, createdOrder.id))
      .execute();

    expect(finalOrder.status).toEqual('completed');
    expect(finalOrder.updated_at).toBeInstanceOf(Date);
  });
});