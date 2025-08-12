import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, ordersTable, orderItemsTable } from '../db/schema';
import { getOrderById } from '../handlers/get_order_by_id';

describe('getOrderById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testCategory: any;
  let testProduct: any;
  let testOrder: any;
  let otherUser: any;
  let otherOrder: any;

  beforeEach(async () => {
    // Create test user
    const userResults = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer'
      })
      .returning()
      .execute();
    testUser = userResults[0];

    // Create another user for authorization testing
    const otherUserResults = await db.insert(usersTable)
      .values({
        email: 'other@example.com',
        password_hash: 'hashed_password',
        first_name: 'Other',
        last_name: 'User',
        role: 'customer'
      })
      .returning()
      .execute();
    otherUser = otherUserResults[0];

    // Create test category
    const categoryResults = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Category for testing'
      })
      .returning()
      .execute();
    testCategory = categoryResults[0];

    // Create test product
    const productResults = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Product for testing',
        price: '29.99',
        stock: 50,
        category_id: testCategory.id
      })
      .returning()
      .execute();
    testProduct = productResults[0];

    // Create test order for testUser
    const orderResults = await db.insert(ordersTable)
      .values({
        user_id: testUser.id,
        total_amount: '59.98',
        status: 'pending',
        shipping_address: '123 Test Street, Test City, TC 12345',
        shipping_method: 'standard'
      })
      .returning()
      .execute();
    testOrder = orderResults[0];

    // Create test order for otherUser
    const otherOrderResults = await db.insert(ordersTable)
      .values({
        user_id: otherUser.id,
        total_amount: '39.99',
        status: 'paid',
        shipping_address: '456 Other Street, Other City, OC 67890',
        shipping_method: 'express'
      })
      .returning()
      .execute();
    otherOrder = otherOrderResults[0];

    // Create order items
    await db.insert(orderItemsTable)
      .values([
        {
          order_id: testOrder.id,
          product_id: testProduct.id,
          quantity: 2,
          price_at_purchase: '29.99'
        }
      ])
      .execute();
  });

  it('should return order when found with valid user authorization', async () => {
    const result = await getOrderById(testOrder.id, testUser.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testOrder.id);
    expect(result!.user_id).toEqual(testUser.id);
    expect(result!.total_amount).toEqual(59.98);
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.status).toEqual('pending');
    expect(result!.shipping_address).toEqual('123 Test Street, Test City, TC 12345');
    expect(result!.shipping_method).toEqual('standard');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when order does not exist', async () => {
    const result = await getOrderById(99999, testUser.id);
    expect(result).toBeNull();
  });

  it('should return null when user tries to access another users order', async () => {
    const result = await getOrderById(testOrder.id, otherUser.id);
    expect(result).toBeNull();
  });

  it('should allow admin access without userId restriction', async () => {
    // Admin can access any order without specifying userId
    const result = await getOrderById(testOrder.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(testOrder.id);
    expect(result!.user_id).toEqual(testUser.id);
    expect(result!.total_amount).toEqual(59.98);
    expect(typeof result!.total_amount).toBe('number');
  });

  it('should return order with correct data types', async () => {
    const result = await getOrderById(testOrder.id, testUser.id);

    expect(result).not.toBeNull();
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.user_id).toBe('number');
    expect(typeof result!.total_amount).toBe('number');
    expect(typeof result!.status).toBe('string');
    expect(typeof result!.shipping_address).toBe('string');
    expect(typeof result!.shipping_method).toBe('string');
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should handle orders with different statuses', async () => {
    const result = await getOrderById(otherOrder.id, otherUser.id);

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('paid');
    expect(result!.total_amount).toEqual(39.99);
    expect(result!.shipping_method).toEqual('express');
  });

  it('should handle numeric conversion correctly', async () => {
    // Create order with decimal amount
    const decimalOrderResults = await db.insert(ordersTable)
      .values({
        user_id: testUser.id,
        total_amount: '123.45',
        status: 'completed',
        shipping_address: '789 Decimal Ave',
        shipping_method: 'overnight'
      })
      .returning()
      .execute();
    const decimalOrder = decimalOrderResults[0];

    const result = await getOrderById(decimalOrder.id, testUser.id);

    expect(result).not.toBeNull();
    expect(result!.total_amount).toEqual(123.45);
    expect(typeof result!.total_amount).toBe('number');
  });
});