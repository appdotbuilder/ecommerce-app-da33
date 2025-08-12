import { z } from 'zod';

// User Management Schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.enum(['admin', 'customer']),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type User = z.infer<typeof userSchema>;

export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  first_name: z.string(),
  last_name: z.string(),
  role: z.enum(['admin', 'customer']).default('customer')
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

export const updateUserInputSchema = z.object({
  id: z.number(),
  email: z.string().email().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  is_active: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;

// Category Schemas
export const categorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Category = z.infer<typeof categorySchema>;

export const createCategoryInputSchema = z.object({
  name: z.string(),
  description: z.string().nullable()
});

export type CreateCategoryInput = z.infer<typeof createCategoryInputSchema>;

export const updateCategoryInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  description: z.string().nullable().optional()
});

export type UpdateCategoryInput = z.infer<typeof updateCategoryInputSchema>;

// Product Schemas
export const productSchema = z.object({
  id: z.number(),
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  stock: z.number().int().nonnegative(),
  category_id: z.number(),
  image_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Product = z.infer<typeof productSchema>;

export const createProductInputSchema = z.object({
  name: z.string(),
  code: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  stock: z.number().int().nonnegative(),
  category_id: z.number(),
  image_url: z.string().nullable()
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

export const updateProductInputSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  code: z.string().optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  category_id: z.number().optional(),
  image_url: z.string().nullable().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

export const getProductsInputSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  category_id: z.number().optional()
});

export type GetProductsInput = z.infer<typeof getProductsInputSchema>;

// Shopping Cart Schemas
export const cartItemSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type CartItem = z.infer<typeof cartItemSchema>;

export const addToCartInputSchema = z.object({
  product_id: z.number(),
  quantity: z.number().int().positive()
});

export type AddToCartInput = z.infer<typeof addToCartInputSchema>;

export const updateCartItemInputSchema = z.object({
  id: z.number(),
  quantity: z.number().int().positive()
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemInputSchema>;

// Order Schemas
export const orderSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  total_amount: z.number(),
  status: z.enum(['pending', 'paid', 'shipped', 'completed', 'cancelled']),
  shipping_address: z.string(),
  shipping_method: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Order = z.infer<typeof orderSchema>;

export const createOrderInputSchema = z.object({
  shipping_address: z.string(),
  shipping_method: z.string()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

export const updateOrderStatusInputSchema = z.object({
  id: z.number(),
  status: z.enum(['pending', 'paid', 'shipped', 'completed', 'cancelled'])
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

export const getOrdersInputSchema = z.object({
  status: z.enum(['pending', 'paid', 'shipped', 'completed', 'cancelled']).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional()
});

export type GetOrdersInput = z.infer<typeof getOrdersInputSchema>;

// Order Item Schemas
export const orderItemSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  product_id: z.number(),
  quantity: z.number().int().positive(),
  price_at_purchase: z.number(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Transaction Schemas
export const transactionSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  payment_method: z.string(),
  amount: z.number(),
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  transaction_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z.object({
  order_id: z.number(),
  payment_method: z.string(),
  amount: z.number().positive()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const updateTransactionInputSchema = z.object({
  id: z.number(),
  payment_status: z.enum(['pending', 'completed', 'failed', 'refunded']),
  transaction_id: z.string().optional()
});

export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

// Shipping Schemas
export const shippingSchema = z.object({
  id: z.number(),
  order_id: z.number(),
  courier: z.string(),
  tracking_number: z.string().nullable(),
  cost: z.number(),
  shipping_status: z.enum(['pending', 'in_transit', 'delivered', 'returned']),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date().nullable()
});

export type Shipping = z.infer<typeof shippingSchema>;

export const createShippingInputSchema = z.object({
  order_id: z.number(),
  courier: z.string(),
  cost: z.number().positive()
});

export type CreateShippingInput = z.infer<typeof createShippingInputSchema>;

export const updateShippingInputSchema = z.object({
  id: z.number(),
  tracking_number: z.string().optional(),
  shipping_status: z.enum(['pending', 'in_transit', 'delivered', 'returned']).optional()
});

export type UpdateShippingInput = z.infer<typeof updateShippingInputSchema>;

export const calculateShippingInputSchema = z.object({
  destination_address: z.string(),
  total_weight: z.number().positive()
});

export type CalculateShippingInput = z.infer<typeof calculateShippingInputSchema>;