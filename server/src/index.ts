import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import all schema types
import {
  registerUserInputSchema,
  loginUserInputSchema,
  updateUserInputSchema,
  createCategoryInputSchema,
  updateCategoryInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  getProductsInputSchema,
  addToCartInputSchema,
  updateCartItemInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema,
  getOrdersInputSchema,
  createTransactionInputSchema,
  updateTransactionInputSchema,
  calculateShippingInputSchema,
  createShippingInputSchema,
  updateShippingInputSchema
} from './schema';

// Import all handlers
import { registerUser } from './handlers/register_user';
import { loginUser } from './handlers/login_user';
import { updateUser } from './handlers/update_user';
import { createCategory } from './handlers/create_category';
import { getCategories } from './handlers/get_categories';
import { updateCategory } from './handlers/update_category';
import { deleteCategory } from './handlers/delete_category';
import { createProduct } from './handlers/create_product';
import { getProducts } from './handlers/get_products';
import { getProductById } from './handlers/get_product_by_id';
import { updateProduct } from './handlers/update_product';
import { deleteProduct } from './handlers/delete_product';
import { addToCart } from './handlers/add_to_cart';
import { getCartItems } from './handlers/get_cart_items';
import { updateCartItem } from './handlers/update_cart_item';
import { removeCartItem } from './handlers/remove_cart_item';
import { createOrder } from './handlers/create_order';
import { getOrders } from './handlers/get_orders';
import { getOrderById } from './handlers/get_order_by_id';
import { updateOrderStatus } from './handlers/update_order_status';
import { createTransaction } from './handlers/create_transaction';
import { updateTransaction } from './handlers/update_transaction';
import { calculateShipping } from './handlers/calculate_shipping';
import { createShipping } from './handlers/create_shipping';
import { updateShipping } from './handlers/update_shipping';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User Management Routes
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  loginUser: publicProcedure
    .input(loginUserInputSchema)
    .mutation(({ input }) => loginUser(input)),

  updateUser: publicProcedure
    .input(updateUserInputSchema)
    .mutation(({ input }) => updateUser(input)),

  // Category Management Routes
  createCategory: publicProcedure
    .input(createCategoryInputSchema)
    .mutation(({ input }) => createCategory(input)),

  getCategories: publicProcedure
    .query(() => getCategories()),

  updateCategory: publicProcedure
    .input(updateCategoryInputSchema)
    .mutation(({ input }) => updateCategory(input)),

  deleteCategory: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteCategory(input)),

  // Product Management Routes
  createProduct: publicProcedure
    .input(createProductInputSchema)
    .mutation(({ input }) => createProduct(input)),

  getProducts: publicProcedure
    .input(getProductsInputSchema.optional())
    .query(({ input }) => getProducts(input)),

  getProductById: publicProcedure
    .input(z.number())
    .query(({ input }) => getProductById(input)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema)
    .mutation(({ input }) => updateProduct(input)),

  deleteProduct: publicProcedure
    .input(z.number())
    .mutation(({ input }) => deleteProduct(input)),

  // Shopping Cart Routes
  addToCart: publicProcedure
    .input(addToCartInputSchema)
    .mutation(({ input }) => addToCart(input, 1)), // TODO: Get userId from auth context

  getCartItems: publicProcedure
    .query(() => getCartItems(1)), // TODO: Get userId from auth context

  updateCartItem: publicProcedure
    .input(updateCartItemInputSchema)
    .mutation(({ input }) => updateCartItem(input, 1)), // TODO: Get userId from auth context

  removeCartItem: publicProcedure
    .input(z.number())
    .mutation(({ input }) => removeCartItem(input, 1)), // TODO: Get userId from auth context

  // Order Management Routes
  createOrder: publicProcedure
    .input(createOrderInputSchema)
    .mutation(({ input }) => createOrder(input, 1)), // TODO: Get userId from auth context

  getOrders: publicProcedure
    .input(getOrdersInputSchema.optional())
    .query(({ input }) => getOrders(input, 1)), // TODO: Get userId from auth context or admin check

  getOrderById: publicProcedure
    .input(z.number())
    .query(({ input }) => getOrderById(input, 1)), // TODO: Get userId from auth context

  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema)
    .mutation(({ input }) => updateOrderStatus(input)),

  // Payment/Transaction Routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  updateTransaction: publicProcedure
    .input(updateTransactionInputSchema)
    .mutation(({ input }) => updateTransaction(input)),

  // Shipping Routes
  calculateShipping: publicProcedure
    .input(calculateShippingInputSchema)
    .query(({ input }) => calculateShipping(input)),

  createShipping: publicProcedure
    .input(createShippingInputSchema)
    .mutation(({ input }) => createShipping(input)),

  updateShipping: publicProcedure
    .input(updateShippingInputSchema)
    .mutation(({ input }) => updateShipping(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();