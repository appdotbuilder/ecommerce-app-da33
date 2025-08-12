import { db } from '../db';
import { categoriesTable } from '../db/schema';
import { type Category } from '../schema';

export async function getCategories(): Promise<Category[]> {
  try {
    const categories = await db.select()
      .from(categoriesTable)
      .execute();

    return categories;
  } catch (error) {
    console.error('Failed to fetch categories:', error);
    throw error;
  }
}