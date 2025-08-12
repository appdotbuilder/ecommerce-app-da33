import { db } from '../db';
import { productsTable, categoriesTable } from '../db/schema';
import { type UpdateProductInput, type Product } from '../schema';
import { eq, and, ne } from 'drizzle-orm';

export const updateProduct = async (input: UpdateProductInput): Promise<Product> => {
  try {
    // First, verify the product exists
    const existingProduct = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, input.id))
      .execute();

    if (existingProduct.length === 0) {
      throw new Error('Product not found');
    }

    // If code is being updated, check for uniqueness
    if (input.code) {
      const codeCheck = await db.select()
        .from(productsTable)
        .where(
          and(
            eq(productsTable.code, input.code),
            ne(productsTable.id, input.id)
          )
        )
        .execute();

      if (codeCheck.length > 0) {
        throw new Error('Product code already exists');
      }
    }

    // If category_id is being updated, verify it exists
    if (input.category_id) {
      const categoryCheck = await db.select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, input.category_id))
        .execute();

      if (categoryCheck.length === 0) {
        throw new Error('Category not found');
      }
    }

    // Build the update object, only including defined fields
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.code !== undefined) updateData.code = input.code;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.price !== undefined) updateData.price = input.price.toString();
    if (input.stock !== undefined) updateData.stock = input.stock;
    if (input.category_id !== undefined) updateData.category_id = input.category_id;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;
    
    // Always update the timestamp
    updateData.updated_at = new Date();

    // Perform the update
    const result = await db.update(productsTable)
      .set(updateData)
      .where(eq(productsTable.id, input.id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const product = result[0];
    return {
      ...product,
      price: parseFloat(product.price)
    };
  } catch (error) {
    console.error('Product update failed:', error);
    throw error;
  }
};