import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  categoriesTable, 
  productsTable, 
  cartItemsTable, 
  ordersTable, 
  orderItemsTable 
} from '../db/schema';
import { eq } from 'drizzle-orm';
import { deleteProduct } from '../handlers/delete_product';

describe('deleteProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a product', async () => {
    // Create test data
    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Test product description',
        price: '19.99',
        stock: 100,
        category_id: category[0].id,
        image_url: null
      })
      .returning()
      .execute();

    const result = await deleteProduct(product[0].id);

    expect(result.success).toBe(true);

    // Verify product is deleted from database
    const deletedProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(deletedProduct).toHaveLength(0);
  });

  it('should throw error when product does not exist', async () => {
    const nonExistentId = 99999;

    expect(deleteProduct(nonExistentId)).rejects.toThrow(/Product with id 99999 not found/i);
  });

  it('should throw error when product is in shopping cart', async () => {
    // Create test data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        is_active: true
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Test product description',
        price: '19.99',
        stock: 100,
        category_id: category[0].id,
        image_url: null
      })
      .returning()
      .execute();

    // Add product to cart
    await db.insert(cartItemsTable)
      .values({
        user_id: user[0].id,
        product_id: product[0].id,
        quantity: 2
      })
      .execute();

    expect(deleteProduct(product[0].id)).rejects.toThrow(/Cannot delete product: it exists in shopping carts/i);

    // Verify product still exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(existingProduct).toHaveLength(1);
  });

  it('should throw error when product is in any orders', async () => {
    // Create test data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        is_active: true
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Test product description',
        price: '19.99',
        stock: 100,
        category_id: category[0].id,
        image_url: null
      })
      .returning()
      .execute();

    // Create pending order
    const order = await db.insert(ordersTable)
      .values({
        user_id: user[0].id,
        total_amount: '39.98',
        status: 'pending',
        shipping_address: '123 Test St',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    // Add product to order
    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        product_id: product[0].id,
        quantity: 2,
        price_at_purchase: '19.99'
      })
      .execute();

    expect(deleteProduct(product[0].id)).rejects.toThrow(/Cannot delete product: it exists in order history/i);

    // Verify product still exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(existingProduct).toHaveLength(1);
  });

  it('should throw error when product is in completed orders', async () => {
    // Create test data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        is_active: true
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Test product description',
        price: '19.99',
        stock: 100,
        category_id: category[0].id,
        image_url: null
      })
      .returning()
      .execute();

    // Create completed order
    const order = await db.insert(ordersTable)
      .values({
        user_id: user[0].id,
        total_amount: '19.99',
        status: 'completed',
        shipping_address: '123 Test St',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    // Add product to completed order
    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        product_id: product[0].id,
        quantity: 1,
        price_at_purchase: '19.99'
      })
      .execute();

    expect(deleteProduct(product[0].id)).rejects.toThrow(/Cannot delete product: it exists in order history/i);

    // Verify product still exists (historical data preserved)
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(existingProduct).toHaveLength(1);
  });

  it('should throw error when product is in cancelled orders', async () => {
    // Create test data
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User',
        role: 'customer',
        is_active: true
      })
      .returning()
      .execute();

    const category = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    const product = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Test product description',
        price: '19.99',
        stock: 100,
        category_id: category[0].id,
        image_url: null
      })
      .returning()
      .execute();

    // Create cancelled order
    const order = await db.insert(ordersTable)
      .values({
        user_id: user[0].id,
        total_amount: '19.99',
        status: 'cancelled',
        shipping_address: '123 Test St',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    // Add product to cancelled order
    await db.insert(orderItemsTable)
      .values({
        order_id: order[0].id,
        product_id: product[0].id,
        quantity: 1,
        price_at_purchase: '19.99'
      })
      .execute();

    expect(deleteProduct(product[0].id)).rejects.toThrow(/Cannot delete product: it exists in order history/i);

    // Verify product still exists (historical data preserved)
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, product[0].id))
      .execute();

    expect(existingProduct).toHaveLength(1);
  });
});