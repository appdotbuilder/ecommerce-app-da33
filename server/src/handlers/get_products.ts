import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type GetProductsInput, type Product } from '../schema';
import { eq, ilike, and, count, SQL } from 'drizzle-orm';

export async function getProducts(input: GetProductsInput = {}): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  try {
    // Set defaults for pagination
    const page = input.page || 1;
    const limit = input.limit || 20;
    const offset = (page - 1) * limit;

    // Build conditions array
    const conditions: SQL<unknown>[] = [];

    // Add search filter if provided
    if (input.search && input.search.trim()) {
      const searchTerm = `%${input.search.trim()}%`;
      conditions.push(
        ilike(productsTable.name, searchTerm)
      );
    }

    // Add category filter if provided
    if (input.category_id !== undefined) {
      conditions.push(eq(productsTable.category_id, input.category_id));
    }

    // Execute queries based on whether conditions exist
    let products, totalResult;

    if (conditions.length > 0) {
      const whereCondition = conditions.length === 1 ? conditions[0] : and(...conditions);
      
      [products, totalResult] = await Promise.all([
        db.select()
          .from(productsTable)
          .where(whereCondition)
          .limit(limit)
          .offset(offset)
          .execute(),
        db.select({ count: count() })
          .from(productsTable)
          .where(whereCondition)
          .execute()
      ]);
    } else {
      [products, totalResult] = await Promise.all([
        db.select()
          .from(productsTable)
          .limit(limit)
          .offset(offset)
          .execute(),
        db.select({ count: count() })
          .from(productsTable)
          .execute()
      ]);
    }

    // Convert numeric fields
    const formattedProducts: Product[] = products.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));

    return {
      products: formattedProducts,
      total: totalResult[0].count,
      page,
      limit
    };
  } catch (error) {
    console.error('Get products failed:', error);
    throw error;
  }
}