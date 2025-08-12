import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'plaintext_password', // In real implementation, this would be hashed
  first_name: 'John',
  last_name: 'Doe',
  role: 'customer' as const,
  is_active: true
};

const testAdmin = {
  email: 'admin@example.com',
  password_hash: 'admin_password',
  first_name: 'Admin',
  last_name: 'User',
  role: 'admin' as const,
  is_active: true
};

const inactiveUser = {
  email: 'inactive@example.com',
  password_hash: 'password123',
  first_name: 'Inactive',
  last_name: 'User',
  role: 'customer' as const,
  is_active: false
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully authenticate valid user credentials', async () => {
    // Create test user
    const createdUsers = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const loginInput: LoginUserInput = {
      email: testUser.email,
      password: testUser.password_hash // Using same value since we're not hashing
    };

    const result = await loginUser(loginInput);

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token).toMatch(/^jwt_\d+_\d+$/); // Format: jwt_{user_id}_{timestamp}
    
    expect(result.user.id).toBe(createdUsers[0].id);
    expect(result.user.email).toBe(testUser.email);
    expect(result.user.role).toBe(testUser.role);
  });

  it('should authenticate admin users correctly', async () => {
    // Create test admin
    const createdAdmins = await db.insert(usersTable)
      .values(testAdmin)
      .returning()
      .execute();

    const loginInput: LoginUserInput = {
      email: testAdmin.email,
      password: testAdmin.password_hash
    };

    const result = await loginUser(loginInput);

    expect(result.user.id).toBe(createdAdmins[0].id);
    expect(result.user.email).toBe(testAdmin.email);
    expect(result.user.role).toBe('admin');
  });

  it('should throw error for non-existent email', async () => {
    const loginInput: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const loginInput: LoginUserInput = {
      email: testUser.email,
      password: 'wrong_password'
    };

    expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for inactive user account', async () => {
    // Create inactive user
    await db.insert(usersTable)
      .values(inactiveUser)
      .returning()
      .execute();

    const loginInput: LoginUserInput = {
      email: inactiveUser.email,
      password: inactiveUser.password_hash
    };

    expect(loginUser(loginInput)).rejects.toThrow(/account is deactivated/i);
  });

  it('should generate unique tokens for different login sessions', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const loginInput: LoginUserInput = {
      email: testUser.email,
      password: testUser.password_hash
    };

    // Login twice
    const result1 = await loginUser(loginInput);
    const result2 = await loginUser(loginInput);

    expect(result1.token).toBeDefined();
    expect(result2.token).toBeDefined();
    expect(result1.token).not.toBe(result2.token); // Tokens should be unique
  });

  it('should handle case-sensitive email matching', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    // Try to login with uppercase email
    const loginInput: LoginUserInput = {
      email: testUser.email.toUpperCase(),
      password: testUser.password_hash
    };

    // Should fail because email matching is case-sensitive
    expect(loginUser(loginInput)).rejects.toThrow(/invalid email or password/i);
  });
});