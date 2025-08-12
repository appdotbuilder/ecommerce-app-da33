import { db } from '../db';
import { transactionsTable, ordersTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const createTransaction = async (input: CreateTransactionInput): Promise<Transaction> => {
  try {
    // First verify the order exists and is in valid state for payment
    const orders = await db.select()
      .from(ordersTable)
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (orders.length === 0) {
      throw new Error(`Order with id ${input.order_id} not found`);
    }

    const order = orders[0];
    
    // Check if order is in a valid state for payment
    if (order.status === 'cancelled') {
      throw new Error('Cannot create transaction for cancelled order');
    }

    if (order.status === 'completed') {
      throw new Error('Cannot create transaction for completed order');
    }

    // Simulate payment gateway integration - generate a transaction ID
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Simulate payment processing based on payment method
    let paymentStatus: 'pending' | 'completed' | 'failed' = 'pending';
    
    // Simple simulation logic for different payment methods
    if (input.payment_method.toLowerCase().includes('credit_card')) {
      // Credit card payments are usually processed immediately
      paymentStatus = Math.random() > 0.1 ? 'completed' : 'failed'; // 90% success rate
    } else if (input.payment_method.toLowerCase().includes('paypal')) {
      // PayPal might have pending status more often
      const rand = Math.random();
      if (rand > 0.15) {
        paymentStatus = 'completed';
      } else if (rand > 0.05) {
        paymentStatus = 'pending';
      } else {
        paymentStatus = 'failed';
      }
    } else if (input.payment_method.toLowerCase().includes('bank_transfer')) {
      // Bank transfers usually stay pending initially
      paymentStatus = 'pending';
    }

    // Insert transaction record
    const result = await db.insert(transactionsTable)
      .values({
        order_id: input.order_id,
        payment_method: input.payment_method,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_status: paymentStatus,
        transaction_id: transactionId
      })
      .returning()
      .execute();

    // If payment is completed, update order status to 'paid'
    if (paymentStatus === 'completed') {
      await db.update(ordersTable)
        .set({ 
          status: 'paid',
          updated_at: new Date()
        })
        .where(eq(ordersTable.id, input.order_id))
        .execute();
    }

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
};