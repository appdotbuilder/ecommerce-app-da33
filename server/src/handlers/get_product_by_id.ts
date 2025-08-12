import { db } from '../db';
import { productsTable } from '../db/schema';
import { type Product } from '../schema';
import { eq } from 'drizzle-orm';

export async function getProductById(id: number): Promise<Product | null> {
  try {
    const results = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, id))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const product = results[0];
    
    // Convert numeric fields from string to number
    return {
      ...product,
      price: parseFloat(product.price),
      stock: product.stock // Integer field - no conversion needed
    };
  } catch (error) {
    console.error('Failed to fetch product by ID:', error);
    throw error;
  }
}