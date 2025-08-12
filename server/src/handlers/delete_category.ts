import { db } from '../db';
import { categoriesTable, productsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteCategory = async (id: number): Promise<{ success: boolean }> => {
  try {
    // First, check if the category exists
    const existingCategory = await db.select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    if (existingCategory.length === 0) {
      throw new Error(`Category with id ${id} not found`);
    }

    // Check if there are products still assigned to this category
    const productsInCategory = await db.select()
      .from(productsTable)
      .where(eq(productsTable.category_id, id))
      .execute();

    if (productsInCategory.length > 0) {
      throw new Error(`Cannot delete category. ${productsInCategory.length} product(s) are still assigned to this category`);
    }

    // Delete the category
    const result = await db.delete(categoriesTable)
      .where(eq(categoriesTable.id, id))
      .execute();

    return { success: true };
  } catch (error) {
    console.error('Category deletion failed:', error);
    throw error;
  }
};