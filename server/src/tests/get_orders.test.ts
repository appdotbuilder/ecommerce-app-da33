import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, ordersTable } from '../db/schema';
import { type GetOrdersInput } from '../schema';
import { getOrders } from '../handlers/get_orders';

describe('getOrders', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testAdmin: any;
  let testOrders: any[];

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'customer@test.com',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'Customer',
          role: 'customer'
        },
        {
          email: 'admin@test.com',
          password_hash: 'hashedpassword',
          first_name: 'Test',
          last_name: 'Admin',
          role: 'admin'
        }
      ])
      .returning()
      .execute();

    testUser = users[0];
    testAdmin = users[1];

    // Create test orders with slight delays to ensure different timestamps
    const order1 = await db.insert(ordersTable)
      .values({
        user_id: testUser.id,
        total_amount: '99.99',
        status: 'pending',
        shipping_address: '123 Test St',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const order2 = await db.insert(ordersTable)
      .values({
        user_id: testUser.id,
        total_amount: '149.99',
        status: 'paid',
        shipping_address: '123 Test St',
        shipping_method: 'express'
      })
      .returning()
      .execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const order3 = await db.insert(ordersTable)
      .values({
        user_id: testAdmin.id,
        total_amount: '299.99',
        status: 'shipped',
        shipping_address: '456 Admin Ave',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    testOrders = [order1[0], order2[0], order3[0]];
  });

  it('should get all orders when no filters applied', async () => {
    const result = await getOrders({});

    expect(result.orders).toHaveLength(3);
    expect(result.total).toEqual(3);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);

    // Check numeric conversion
    result.orders.forEach(order => {
      expect(typeof order.total_amount).toBe('number');
    });

    // Verify orders are sorted by creation date (newest first)
    // Since we created them in sequence with delays, the newest should be last inserted
    const orderIds = result.orders.map(o => o.id);
    expect(orderIds[0]).toEqual(testOrders[2].id); // Most recent
    expect(orderIds[1]).toEqual(testOrders[1].id); // Middle
    expect(orderIds[2]).toEqual(testOrders[0].id); // Oldest
  });

  it('should filter orders by status', async () => {
    const input: GetOrdersInput = {
      status: 'pending'
    };

    const result = await getOrders(input);

    expect(result.orders).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.orders[0].status).toEqual('pending');
    expect(result.orders[0].total_amount).toEqual(99.99);
  });

  it('should filter orders by user when userId provided', async () => {
    const result = await getOrders({}, testUser.id);

    expect(result.orders).toHaveLength(2);
    expect(result.total).toEqual(2);
    result.orders.forEach(order => {
      expect(order.user_id).toEqual(testUser.id);
    });
  });

  it('should combine status filter and user filter', async () => {
    const input: GetOrdersInput = {
      status: 'paid'
    };

    const result = await getOrders(input, testUser.id);

    expect(result.orders).toHaveLength(1);
    expect(result.total).toEqual(1);
    expect(result.orders[0].status).toEqual('paid');
    expect(result.orders[0].user_id).toEqual(testUser.id);
    expect(result.orders[0].total_amount).toEqual(149.99);
  });

  it('should handle pagination correctly', async () => {
    const input: GetOrdersInput = {
      page: 2,
      limit: 2
    };

    const result = await getOrders(input);

    expect(result.orders).toHaveLength(1);
    expect(result.total).toEqual(3);
    expect(result.page).toEqual(2);
    expect(result.limit).toEqual(2);
    
    // The third page (offset 2) should contain the oldest order
    expect(result.orders[0].id).toEqual(testOrders[0].id);
  });

  it('should return empty results when no orders match filter', async () => {
    const input: GetOrdersInput = {
      status: 'cancelled'
    };

    const result = await getOrders(input);

    expect(result.orders).toHaveLength(0);
    expect(result.total).toEqual(0);
    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);
  });

  it('should return empty results for user with no orders', async () => {
    // Create another user with no orders
    const newUser = await db.insert(usersTable)
      .values({
        email: 'noorders@test.com',
        password_hash: 'hashedpassword',
        first_name: 'No',
        last_name: 'Orders',
        role: 'customer'
      })
      .returning()
      .execute();

    const result = await getOrders({}, newUser[0].id);

    expect(result.orders).toHaveLength(0);
    expect(result.total).toEqual(0);
  });

  it('should apply default pagination values when not provided', async () => {
    const result = await getOrders({});

    expect(result.page).toEqual(1);
    expect(result.limit).toEqual(20);
  });

  it('should handle edge case with page beyond available data', async () => {
    const input: GetOrdersInput = {
      page: 10,
      limit: 5
    };

    const result = await getOrders(input);

    expect(result.orders).toHaveLength(0);
    expect(result.total).toEqual(3);
    expect(result.page).toEqual(10);
    expect(result.limit).toEqual(5);
  });

  it('should validate order data structure', async () => {
    const result = await getOrders({});

    expect(result.orders.length).toBeGreaterThan(0);
    const order = result.orders[0];

    // Check all required fields exist
    expect(order.id).toBeDefined();
    expect(order.user_id).toBeDefined();
    expect(typeof order.total_amount).toBe('number');
    expect(order.status).toBeDefined();
    expect(order.shipping_address).toBeDefined();
    expect(order.shipping_method).toBeDefined();
    expect(order.created_at).toBeInstanceOf(Date);
  });

  it('should verify ordering is consistent', async () => {
    // Get orders multiple times to ensure consistent ordering
    const result1 = await getOrders({});
    const result2 = await getOrders({});

    expect(result1.orders.map(o => o.id)).toEqual(result2.orders.map(o => o.id));
  });
});