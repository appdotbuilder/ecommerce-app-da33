import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { transactionsTable, ordersTable, usersTable, categoriesTable, productsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashedpassword',
  first_name: 'Test',
  last_name: 'User',
  role: 'customer' as const
};

const testCategory = {
  name: 'Electronics',
  description: 'Electronic products'
};

const testProduct = {
  name: 'Test Product',
  code: 'TEST-001',
  description: 'A test product',
  price: '99.99',
  stock: 10,
  category_id: 1
};

const testOrder = {
  user_id: 1,
  total_amount: '199.98',
  status: 'pending' as const,
  shipping_address: '123 Test St, Test City, TC 12345',
  shipping_method: 'standard'
};

const testTransactionInput: CreateTransactionInput = {
  order_id: 1,
  payment_method: 'credit_card',
  amount: 199.98
};

describe('createTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createPrerequisiteData = async () => {
    // Create user
    const users = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Create category
    const categories = await db.insert(categoriesTable)
      .values(testCategory)
      .returning()
      .execute();

    // Create product
    const products = await db.insert(productsTable)
      .values({
        ...testProduct,
        category_id: categories[0].id
      })
      .returning()
      .execute();

    // Create order
    const orders = await db.insert(ordersTable)
      .values({
        ...testOrder,
        user_id: users[0].id
      })
      .returning()
      .execute();

    return {
      user: users[0],
      category: categories[0],
      product: products[0],
      order: orders[0]
    };
  };

  it('should create a transaction with valid input', async () => {
    await createPrerequisiteData();
    
    const result = await createTransaction(testTransactionInput);

    // Verify transaction fields
    expect(result.order_id).toEqual(1);
    expect(result.payment_method).toEqual('credit_card');
    expect(result.amount).toEqual(199.98);
    expect(typeof result.amount).toBe('number'); // Verify numeric conversion
    expect(result.payment_status).toMatch(/^(pending|completed|failed)$/);
    expect(result.transaction_id).toBeDefined();
    expect(result.transaction_id).toMatch(/^txn_/);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should save transaction to database', async () => {
    await createPrerequisiteData();
    
    const result = await createTransaction(testTransactionInput);

    // Query database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    const dbTransaction = transactions[0];
    expect(dbTransaction.order_id).toEqual(1);
    expect(dbTransaction.payment_method).toEqual('credit_card');
    expect(parseFloat(dbTransaction.amount)).toEqual(199.98); // Verify numeric storage
    expect(dbTransaction.payment_status).toMatch(/^(pending|completed|failed)$/);
    expect(dbTransaction.transaction_id).toMatch(/^txn_/);
  });

  it('should update order status to paid when payment is completed', async () => {
    await createPrerequisiteData();
    
    // Create multiple transactions to eventually get a completed one
    let completedTransaction;
    let attempts = 0;
    
    while (!completedTransaction && attempts < 20) {
      const input = {
        ...testTransactionInput,
        payment_method: 'credit_card' // Higher chance of completion
      };
      
      const transaction = await createTransaction(input);
      
      if (transaction.payment_status === 'completed') {
        completedTransaction = transaction;
        break;
      }
      attempts++;
    }

    // If we got a completed transaction, verify order was updated
    if (completedTransaction) {
      const orders = await db.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, testTransactionInput.order_id))
        .execute();

      expect(orders).toHaveLength(1);
      expect(orders[0].status).toEqual('paid');
      expect(orders[0].updated_at).toBeInstanceOf(Date);
    }
  });

  it('should generate unique transaction IDs', async () => {
    await createPrerequisiteData();
    
    const transaction1 = await createTransaction(testTransactionInput);
    const transaction2 = await createTransaction(testTransactionInput);

    expect(transaction1.transaction_id).not.toEqual(transaction2.transaction_id);
    expect(transaction1.transaction_id).toMatch(/^txn_\d+_[a-z0-9]+$/);
    expect(transaction2.transaction_id).toMatch(/^txn_\d+_[a-z0-9]+$/);
  });

  it('should handle different payment methods appropriately', async () => {
    await createPrerequisiteData();
    
    const paymentMethods = ['credit_card', 'paypal', 'bank_transfer', 'debit_card'];
    
    for (const method of paymentMethods) {
      const input: CreateTransactionInput = {
        ...testTransactionInput,
        payment_method: method
      };
      
      const result = await createTransaction(input);
      
      expect(result.payment_method).toEqual(method);
      expect(result.payment_status).toMatch(/^(pending|completed|failed)$/);
      expect(result.transaction_id).toBeDefined();
    }
  });

  it('should throw error when order does not exist', async () => {
    const input: CreateTransactionInput = {
      order_id: 999, // Non-existent order
      payment_method: 'credit_card',
      amount: 199.98
    };

    expect(createTransaction(input)).rejects.toThrow(/Order with id 999 not found/i);
  });

  it('should throw error when trying to create transaction for cancelled order', async () => {
    const data = await createPrerequisiteData();
    
    // Update order status to cancelled
    await db.update(ordersTable)
      .set({ status: 'cancelled' })
      .where(eq(ordersTable.id, data.order.id))
      .execute();

    const input: CreateTransactionInput = {
      order_id: data.order.id,
      payment_method: 'credit_card',
      amount: 199.98
    };

    expect(createTransaction(input)).rejects.toThrow(/Cannot create transaction for cancelled order/i);
  });

  it('should throw error when trying to create transaction for completed order', async () => {
    const data = await createPrerequisiteData();
    
    // Update order status to completed
    await db.update(ordersTable)
      .set({ status: 'completed' })
      .where(eq(ordersTable.id, data.order.id))
      .execute();

    const input: CreateTransactionInput = {
      order_id: data.order.id,
      payment_method: 'credit_card',
      amount: 199.98
    };

    expect(createTransaction(input)).rejects.toThrow(/Cannot create transaction for completed order/i);
  });

  it('should handle large monetary amounts correctly', async () => {
    await createPrerequisiteData();
    
    const input: CreateTransactionInput = {
      order_id: 1,
      payment_method: 'wire_transfer',
      amount: 9999.99
    };

    const result = await createTransaction(input);

    expect(result.amount).toEqual(9999.99);
    expect(typeof result.amount).toBe('number');
    
    // Verify in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(transactions[0].amount)).toEqual(9999.99);
  });

  it('should handle decimal amounts with precision', async () => {
    await createPrerequisiteData();
    
    const input: CreateTransactionInput = {
      order_id: 1,
      payment_method: 'credit_card',
      amount: 123.45
    };

    const result = await createTransaction(input);

    expect(result.amount).toEqual(123.45);
    
    // Verify precision is maintained in database
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(parseFloat(transactions[0].amount)).toEqual(123.45);
  });
});