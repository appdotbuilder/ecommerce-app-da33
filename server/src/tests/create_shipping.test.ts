import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { shippingTable, ordersTable, usersTable, categoriesTable, productsTable } from '../db/schema';
import { type CreateShippingInput } from '../schema';
import { createShipping } from '../handlers/create_shipping';
import { eq } from 'drizzle-orm';

describe('createShipping', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createPrerequisiteData = async () => {
    // Create a user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer'
      })
      .returning()
      .execute();

    // Create a category
    const categoryResult = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'A test category'
      })
      .returning()
      .execute();

    // Create an order
    const orderResult = await db.insert(ordersTable)
      .values({
        user_id: userResult[0].id,
        total_amount: '199.99',
        shipping_address: '123 Test Street, Test City',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    return {
      user: userResult[0],
      category: categoryResult[0],
      order: orderResult[0]
    };
  };

  it('should create a shipping record', async () => {
    const { order } = await createPrerequisiteData();

    const testInput: CreateShippingInput = {
      order_id: order.id,
      courier: 'DHL Express',
      cost: 29.99
    };

    const result = await createShipping(testInput);

    // Basic field validation
    expect(result.order_id).toEqual(order.id);
    expect(result.courier).toEqual('DHL Express');
    expect(result.cost).toEqual(29.99);
    expect(typeof result.cost).toEqual('number');
    expect(result.shipping_status).toEqual('pending');
    expect(result.tracking_number).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should save shipping record to database', async () => {
    const { order } = await createPrerequisiteData();

    const testInput: CreateShippingInput = {
      order_id: order.id,
      courier: 'FedEx Ground',
      cost: 15.50
    };

    const result = await createShipping(testInput);

    // Query database to verify shipping record was saved
    const shippingRecords = await db.select()
      .from(shippingTable)
      .where(eq(shippingTable.id, result.id))
      .execute();

    expect(shippingRecords).toHaveLength(1);
    const savedShipping = shippingRecords[0];
    
    expect(savedShipping.order_id).toEqual(order.id);
    expect(savedShipping.courier).toEqual('FedEx Ground');
    expect(parseFloat(savedShipping.cost)).toEqual(15.50);
    expect(savedShipping.shipping_status).toEqual('pending');
    expect(savedShipping.tracking_number).toBeNull();
    expect(savedShipping.created_at).toBeInstanceOf(Date);
    expect(savedShipping.updated_at).toBeNull();
  });

  it('should handle different courier services correctly', async () => {
    const { order } = await createPrerequisiteData();

    const couriers = [
      { name: 'UPS Standard', cost: 12.99 },
      { name: 'USPS Priority', cost: 8.75 },
      { name: 'DHL International', cost: 45.00 }
    ];

    for (const courier of couriers) {
      const testInput: CreateShippingInput = {
        order_id: order.id,
        courier: courier.name,
        cost: courier.cost
      };

      const result = await createShipping(testInput);

      expect(result.courier).toEqual(courier.name);
      expect(result.cost).toEqual(courier.cost);
      expect(typeof result.cost).toEqual('number');
      expect(result.shipping_status).toEqual('pending');
    }
  });

  it('should handle decimal costs correctly', async () => {
    const { order } = await createPrerequisiteData();

    const testCosts = [9.99, 25.50, 100.00, 0.01, 999.99];

    for (const cost of testCosts) {
      const testInput: CreateShippingInput = {
        order_id: order.id,
        courier: 'Test Courier',
        cost: cost
      };

      const result = await createShipping(testInput);

      expect(result.cost).toEqual(cost);
      expect(typeof result.cost).toEqual('number');

      // Verify in database
      const savedShipping = await db.select()
        .from(shippingTable)
        .where(eq(shippingTable.id, result.id))
        .execute();

      expect(parseFloat(savedShipping[0].cost)).toEqual(cost);
    }
  });

  it('should throw error when order does not exist', async () => {
    const testInput: CreateShippingInput = {
      order_id: 99999, // Non-existent order ID
      courier: 'Test Courier',
      cost: 25.00
    };

    await expect(createShipping(testInput)).rejects.toThrow(/Order with id 99999 not found/i);
  });

  it('should create multiple shipping records for different orders', async () => {
    const { order } = await createPrerequisiteData();

    // Create another user and order
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'test2@example.com',
        password_hash: 'hashed_password2',
        first_name: 'Test2',
        last_name: 'User2',
        role: 'customer'
      })
      .returning()
      .execute();

    const order2Result = await db.insert(ordersTable)
      .values({
        user_id: user2Result[0].id,
        total_amount: '299.99',
        shipping_address: '456 Another Street, Another City',
        shipping_method: 'express'
      })
      .returning()
      .execute();

    const order2 = order2Result[0];

    // Create shipping for both orders
    const shipping1Input: CreateShippingInput = {
      order_id: order.id,
      courier: 'UPS Ground',
      cost: 12.99
    };

    const shipping2Input: CreateShippingInput = {
      order_id: order2.id,
      courier: 'FedEx Express',
      cost: 24.99
    };

    const result1 = await createShipping(shipping1Input);
    const result2 = await createShipping(shipping2Input);

    // Verify both shipping records were created correctly
    expect(result1.order_id).toEqual(order.id);
    expect(result1.courier).toEqual('UPS Ground');
    expect(result1.cost).toEqual(12.99);

    expect(result2.order_id).toEqual(order2.id);
    expect(result2.courier).toEqual('FedEx Express');
    expect(result2.cost).toEqual(24.99);

    // Verify different IDs
    expect(result1.id).not.toEqual(result2.id);

    // Verify in database
    const allShipping = await db.select()
      .from(shippingTable)
      .execute();

    expect(allShipping).toHaveLength(2);
  });

  it('should handle edge case with minimum cost', async () => {
    const { order } = await createPrerequisiteData();

    const testInput: CreateShippingInput = {
      order_id: order.id,
      courier: 'Local Pickup',
      cost: 0.01 // Minimum positive cost
    };

    const result = await createShipping(testInput);

    expect(result.cost).toEqual(0.01);
    expect(typeof result.cost).toEqual('number');

    // Verify precision is maintained in database
    const savedShipping = await db.select()
      .from(shippingTable)
      .where(eq(shippingTable.id, result.id))
      .execute();

    expect(parseFloat(savedShipping[0].cost)).toEqual(0.01);
  });
});