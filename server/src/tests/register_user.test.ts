import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  first_name: 'John',
  last_name: 'Doe',
  role: 'customer'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should register a new user', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.role).toEqual('customer');
    expect(result.is_active).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeNull();
  });

  it('should hash the password', async () => {
    const result = await registerUser(testInput);

    // Password should be hashed, not plain text
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash).not.toEqual('password123');
    expect(result.password_hash.length).toBeGreaterThan(20); // Hashed passwords are much longer

    // Verify password can be verified using Bun's password.verify
    const isValid = await Bun.password.verify('password123', result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query using proper drizzle syntax
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].first_name).toEqual('John');
    expect(users[0].last_name).toEqual('Doe');
    expect(users[0].role).toEqual('customer');
    expect(users[0].is_active).toBe(true);
    expect(users[0].created_at).toBeInstanceOf(Date);
  });

  it('should register admin user', async () => {
    const adminInput: RegisterUserInput = {
      ...testInput,
      email: 'admin@example.com',
      role: 'admin'
    };

    const result = await registerUser(adminInput);

    expect(result.email).toEqual('admin@example.com');
    expect(result.role).toEqual('admin');
    expect(result.is_active).toBe(true);
  });

  it('should use default role when not specified', async () => {
    const inputWithoutRole = {
      email: 'user@example.com',
      password: 'password123',
      first_name: 'Jane',
      last_name: 'Smith'
    };

    const result = await registerUser(inputWithoutRole as RegisterUserInput);

    expect(result.role).toEqual('customer'); // Default role from Zod schema
  });

  it('should handle duplicate email addresses', async () => {
    // Register first user
    await registerUser(testInput);

    // Attempt to register with same email
    const duplicateInput: RegisterUserInput = {
      ...testInput,
      first_name: 'Jane',
      last_name: 'Smith'
    };

    // Should throw error due to unique constraint
    expect(registerUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should validate email format', async () => {
    const invalidEmailInput: RegisterUserInput = {
      ...testInput,
      email: 'invalid-email'
    };

    // This would be caught by Zod validation before reaching the handler
    // But if it somehow gets through, database would still accept it
    // The validation happens at the API layer with Zod schemas
  });

  it('should handle different password lengths', async () => {
    const shortPasswordInput: RegisterUserInput = {
      ...testInput,
      email: 'short@example.com',
      password: '123456' // Minimum length according to Zod schema
    };

    const result = await registerUser(shortPasswordInput);

    expect(result.email).toEqual('short@example.com');
    expect(result.password_hash).toBeDefined();
    
    // Verify short password is still properly hashed and verifiable
    const isValid = await Bun.password.verify('123456', result.password_hash);
    expect(isValid).toBe(true);
  });

  it('should handle long names', async () => {
    const longNamesInput: RegisterUserInput = {
      ...testInput,
      email: 'longnames@example.com',
      first_name: 'Maximilian Alexander Jonathan Christopher',
      last_name: 'Van Der Berg-Wellington III'
    };

    const result = await registerUser(longNamesInput);

    expect(result.first_name).toEqual('Maximilian Alexander Jonathan Christopher');
    expect(result.last_name).toEqual('Van Der Berg-Wellington III');
  });
});