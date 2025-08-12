import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, categoriesTable, productsTable, ordersTable, transactionsTable } from '../db/schema';
import { type UpdateTransactionInput } from '../schema';
import { updateTransaction } from '../handlers/update_transaction';
import { eq } from 'drizzle-orm';

describe('updateTransaction', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create prerequisite data
  const createTestData = async () => {
    // Create user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        first_name: 'Test',
        last_name: 'User'
      })
      .returning()
      .execute();

    // Create category
    const [category] = await db.insert(categoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test category description'
      })
      .returning()
      .execute();

    // Create product
    const [product] = await db.insert(productsTable)
      .values({
        name: 'Test Product',
        code: 'TEST001',
        description: 'Test product description',
        price: '99.99',
        stock: 10,
        category_id: category.id
      })
      .returning()
      .execute();

    // Create order
    const [order] = await db.insert(ordersTable)
      .values({
        user_id: user.id,
        total_amount: '99.99',
        status: 'pending',
        shipping_address: '123 Test St',
        shipping_method: 'standard'
      })
      .returning()
      .execute();

    // Create transaction
    const [transaction] = await db.insert(transactionsTable)
      .values({
        order_id: order.id,
        payment_method: 'Credit Card',
        amount: '99.99',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    return { user, category, product, order, transaction };
  };

  it('should update transaction payment status', async () => {
    const { transaction } = await createTestData();

    const updateInput: UpdateTransactionInput = {
      id: transaction.id,
      payment_status: 'completed'
    };

    const result = await updateTransaction(updateInput);

    // Verify the returned transaction
    expect(result.id).toEqual(transaction.id);
    expect(result.payment_status).toEqual('completed');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(typeof result.amount).toBe('number');
    expect(result.amount).toEqual(99.99);
  });

  it('should update transaction status and transaction_id', async () => {
    const { transaction } = await createTestData();

    const updateInput: UpdateTransactionInput = {
      id: transaction.id,
      payment_status: 'completed',
      transaction_id: 'txn_12345'
    };

    const result = await updateTransaction(updateInput);

    expect(result.payment_status).toEqual('completed');
    expect(result.transaction_id).toEqual('txn_12345');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated transaction to database', async () => {
    const { transaction } = await createTestData();

    const updateInput: UpdateTransactionInput = {
      id: transaction.id,
      payment_status: 'failed',
      transaction_id: 'txn_failed_67890'
    };

    await updateTransaction(updateInput);

    // Verify the transaction was updated in the database
    const updatedTransactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, transaction.id))
      .execute();

    expect(updatedTransactions).toHaveLength(1);
    const updatedTransaction = updatedTransactions[0];
    expect(updatedTransaction.payment_status).toEqual('failed');
    expect(updatedTransaction.transaction_id).toEqual('txn_failed_67890');
    expect(updatedTransaction.updated_at).toBeInstanceOf(Date);
    expect(updatedTransaction.updated_at).not.toEqual(transaction.updated_at);
  });

  it('should update only payment status when transaction_id is not provided', async () => {
    const { transaction } = await createTestData();

    // First, set a transaction_id
    await db.update(transactionsTable)
      .set({ transaction_id: 'existing_txn_123' })
      .where(eq(transactionsTable.id, transaction.id))
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transaction.id,
      payment_status: 'refunded'
    };

    const result = await updateTransaction(updateInput);

    // Should update status but keep existing transaction_id
    expect(result.payment_status).toEqual('refunded');
    expect(result.transaction_id).toEqual('existing_txn_123');
  });

  it('should handle different payment statuses', async () => {
    const { transaction } = await createTestData();

    // Test each valid payment status
    const statuses = ['pending', 'completed', 'failed', 'refunded'] as const;

    for (const status of statuses) {
      const updateInput: UpdateTransactionInput = {
        id: transaction.id,
        payment_status: status
      };

      const result = await updateTransaction(updateInput);
      expect(result.payment_status).toEqual(status);
    }
  });

  it('should throw error when transaction does not exist', async () => {
    const updateInput: UpdateTransactionInput = {
      id: 99999, // Non-existent ID
      payment_status: 'completed'
    };

    await expect(updateTransaction(updateInput)).rejects.toThrow(/Transaction with id 99999 not found/);
  });

  it('should preserve all other transaction fields when updating', async () => {
    const { transaction } = await createTestData();

    const updateInput: UpdateTransactionInput = {
      id: transaction.id,
      payment_status: 'completed',
      transaction_id: 'new_txn_id'
    };

    const result = await updateTransaction(updateInput);

    // Verify other fields are preserved
    expect(result.order_id).toEqual(transaction.order_id);
    expect(result.payment_method).toEqual(transaction.payment_method);
    expect(result.amount).toEqual(parseFloat(transaction.amount));
    expect(result.created_at).toEqual(transaction.created_at);
  });

  it('should handle numeric amount conversion correctly', async () => {
    const { order } = await createTestData();

    // Create transaction with different amount
    const [transaction] = await db.insert(transactionsTable)
      .values({
        order_id: order.id,
        payment_method: 'PayPal',
        amount: '1234.56',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const updateInput: UpdateTransactionInput = {
      id: transaction.id,
      payment_status: 'completed'
    };

    const result = await updateTransaction(updateInput);

    expect(typeof result.amount).toBe('number');
    expect(result.amount).toEqual(1234.56);
  });
});