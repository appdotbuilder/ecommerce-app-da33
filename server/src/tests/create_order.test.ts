import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, cartItemsTable, ordersTable, orderItemsTable } from '../db/schema';
import { type CreateOrderInput } from '../schema';
import { createOrder } from '../handlers/create_order';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  first_name: 'Test',
  last_name: 'User',
  role: 'customer' as const
};

const testCategory = {
  name: 'Electronics',
  description: 'Electronic items'
};

const testProduct1 = {
  name: 'Laptop',
  code: 'LAPTOP001',
  description: 'Gaming laptop',
  price: '999.99',
  stock: 10,
  image_url: null
};

const testProduct2 = {
  name: 'Mouse',
  code: 'MOUSE001',
  description: 'Wireless mouse',
  price: '29.99',
  stock: 5,
  image_url: null
};

const testOrderInput: CreateOrderInput = {
  shipping_address: '123 Main St, City, State 12345',
  shipping_method: 'Standard Shipping'
};

describe('createOrder', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create order from cart items', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({ ...testProduct1, category_id: categoryId })
      .returning()
      .execute();
    const product1 = product1Result[0];

    const product2Result = await db.insert(productsTable)
      .values({ ...testProduct2, category_id: categoryId })
      .returning()
      .execute();
    const product2 = product2Result[0];

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        { user_id: userId, product_id: product1.id, quantity: 2 },
        { user_id: userId, product_id: product2.id, quantity: 1 }
      ])
      .execute();

    // Create order
    const result = await createOrder(testOrderInput, userId);

    // Verify order details
    expect(result.user_id).toBe(userId);
    expect(result.total_amount).toBe(2029.97); // (999.99 * 2) + (29.99 * 1)
    expect(result.status).toBe('pending');
    expect(result.shipping_address).toBe(testOrderInput.shipping_address);
    expect(result.shipping_method).toBe(testOrderInput.shipping_method);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create order items correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({ ...testProduct1, category_id: categoryId })
      .returning()
      .execute();
    const product = productResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({ user_id: userId, product_id: product.id, quantity: 3 })
      .execute();

    // Create order
    const order = await createOrder(testOrderInput, userId);

    // Verify order items were created
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, order.id))
      .execute();

    expect(orderItems).toHaveLength(1);
    expect(orderItems[0].product_id).toBe(product.id);
    expect(orderItems[0].quantity).toBe(3);
    expect(parseFloat(orderItems[0].price_at_purchase)).toBe(999.99);
    expect(orderItems[0].created_at).toBeInstanceOf(Date);
  });

  it('should update product stock after order creation', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({ ...testProduct1, category_id: categoryId })
      .returning()
      .execute();
    const product = productResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({ user_id: userId, product_id: product.id, quantity: 3 })
      .execute();

    // Create order
    await createOrder(testOrderInput, userId);

    // Verify product stock was updated
    const updatedProducts = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product.id))
      .execute();

    expect(updatedProducts[0].stock).toBe(7); // 10 - 3 = 7
  });

  it('should clear cart after order creation', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({ ...testProduct1, category_id: categoryId })
      .returning()
      .execute();
    const product = productResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({ user_id: userId, product_id: product.id, quantity: 2 })
      .execute();

    // Create order
    await createOrder(testOrderInput, userId);

    // Verify cart was cleared
    const cartItems = await db.select()
      .from(cartItemsTable)
      .where(eq(cartItemsTable.user_id, userId))
      .execute();

    expect(cartItems).toHaveLength(0);
  });

  it('should save order to database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({ ...testProduct1, category_id: categoryId })
      .returning()
      .execute();
    const product = productResult[0];

    // Add item to cart
    await db.insert(cartItemsTable)
      .values({ user_id: userId, product_id: product.id, quantity: 1 })
      .execute();

    // Create order
    const result = await createOrder(testOrderInput, userId);

    // Verify order was saved to database
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, result.id))
      .execute();

    expect(orders).toHaveLength(1);
    expect(orders[0].user_id).toBe(userId);
    expect(parseFloat(orders[0].total_amount)).toBe(999.99);
    expect(orders[0].status).toBe('pending');
    expect(orders[0].shipping_address).toBe(testOrderInput.shipping_address);
    expect(orders[0].shipping_method).toBe(testOrderInput.shipping_method);
    expect(orders[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when cart is empty', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Try to create order with empty cart
    await expect(createOrder(testOrderInput, userId))
      .rejects.toThrow(/cart is empty/i);
  });

  it('should throw error when insufficient stock', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test product with low stock
    const productResult = await db.insert(productsTable)
      .values({ ...testProduct1, category_id: categoryId, stock: 1 })
      .returning()
      .execute();
    const product = productResult[0];

    // Add item to cart with quantity exceeding stock
    await db.insert(cartItemsTable)
      .values({ user_id: userId, product_id: product.id, quantity: 5 })
      .execute();

    // Try to create order
    await expect(createOrder(testOrderInput, userId))
      .rejects.toThrow(/insufficient stock/i);
  });

  it('should handle multiple products with different quantities', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test category
    const categoryResult = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();
    const categoryId = categoryResult[0].id;

    // Create test products
    const product1Result = await db.insert(productsTable)
      .values({ ...testProduct1, category_id: categoryId })
      .returning()
      .execute();
    const product1 = product1Result[0];

    const product2Result = await db.insert(productsTable)
      .values({ ...testProduct2, category_id: categoryId })
      .returning()
      .execute();
    const product2 = product2Result[0];

    // Add items to cart
    await db.insert(cartItemsTable)
      .values([
        { user_id: userId, product_id: product1.id, quantity: 1 },
        { user_id: userId, product_id: product2.id, quantity: 3 }
      ])
      .execute();

    // Create order
    const order = await createOrder(testOrderInput, userId);

    // Verify total calculation
    expect(order.total_amount).toBe(1089.96); // (999.99 * 1) + (29.99 * 3)

    // Verify order items
    const orderItems = await db.select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.order_id, order.id))
      .execute();

    expect(orderItems).toHaveLength(2);

    // Verify stock updates
    const updatedProduct1 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product1.id))
      .execute();
    expect(updatedProduct1[0].stock).toBe(9); // 10 - 1

    const updatedProduct2 = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product2.id))
      .execute();
    expect(updatedProduct2[0].stock).toBe(2); // 5 - 3
  });
});