import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type UpdateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export const updateTransaction = async (input: UpdateTransactionInput): Promise<Transaction> => {
  try {
    // Build update object dynamically based on provided input
    const updateValues: any = {
      payment_status: input.payment_status,
      updated_at: new Date()
    };

    // Only include transaction_id if provided
    if (input.transaction_id !== undefined) {
      updateValues.transaction_id = input.transaction_id;
    }

    // Update the transaction record
    const result = await db.update(transactionsTable)
      .set(updateValues)
      .where(eq(transactionsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Transaction with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const transaction = result[0];
    return {
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert numeric field to number
    };
  } catch (error) {
    console.error('Transaction update failed:', error);
    throw error;
  }
};