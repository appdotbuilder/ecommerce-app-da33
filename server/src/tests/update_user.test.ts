import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  // Helper function to create a test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password_123',
        first_name: 'John',
        last_name: 'Doe',
        role: 'customer',
        is_active: true
      })
      .returning()
      .execute();

    testUserId = result[0].id;
    return result[0];
  };

  it('should update user email', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: testUserId,
      email: 'updated@example.com'
    };

    const result = await updateUser(input);

    expect(result.id).toEqual(testUserId);
    expect(result.email).toEqual('updated@example.com');
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.last_name).toEqual('Doe'); // Should remain unchanged
    expect(result.is_active).toEqual(true); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(dbUser[0].email).toEqual('updated@example.com');
    expect(dbUser[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update user first name', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: testUserId,
      first_name: 'Jane'
    };

    const result = await updateUser(input);

    expect(result.first_name).toEqual('Jane');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.last_name).toEqual('Doe'); // Should remain unchanged
  });

  it('should update user last name', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: testUserId,
      last_name: 'Smith'
    };

    const result = await updateUser(input);

    expect(result.last_name).toEqual('Smith');
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
  });

  it('should update user active status', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: testUserId,
      is_active: false
    };

    const result = await updateUser(input);

    expect(result.is_active).toEqual(false);
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    await createTestUser();

    const input: UpdateUserInput = {
      id: testUserId,
      email: 'multi@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      is_active: false
    };

    const result = await updateUser(input);

    expect(result.email).toEqual('multi@example.com');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Smith');
    expect(result.is_active).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify all changes persisted in database
    const dbUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(dbUser[0].email).toEqual('multi@example.com');
    expect(dbUser[0].first_name).toEqual('Jane');
    expect(dbUser[0].last_name).toEqual('Smith');
    expect(dbUser[0].is_active).toEqual(false);
  });

  it('should handle partial updates correctly', async () => {
    await createTestUser();

    // First partial update
    const input1: UpdateUserInput = {
      id: testUserId,
      first_name: 'Updated'
    };

    const result1 = await updateUser(input1);
    expect(result1.first_name).toEqual('Updated');
    expect(result1.email).toEqual('test@example.com'); // Unchanged

    // Second partial update
    const input2: UpdateUserInput = {
      id: testUserId,
      email: 'partial@example.com'
    };

    const result2 = await updateUser(input2);
    expect(result2.email).toEqual('partial@example.com');
    expect(result2.first_name).toEqual('Updated'); // Should persist from previous update
  });

  it('should update timestamp on every update', async () => {
    const originalUser = await createTestUser();
    const originalUpdatedAt = originalUser.updated_at;

    // Wait a moment to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateUserInput = {
      id: testUserId,
      first_name: 'TimestampTest'
    };

    const result = await updateUser(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at?.getTime()).toBeGreaterThan(
      originalUpdatedAt?.getTime() || 0
    );
  });

  it('should throw error when user does not exist', async () => {
    const input: UpdateUserInput = {
      id: 99999, // Non-existent user ID
      email: 'nonexistent@example.com'
    };

    await expect(updateUser(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should preserve password hash and role during update', async () => {
    const originalUser = await createTestUser();

    const input: UpdateUserInput = {
      id: testUserId,
      email: 'preserve@example.com'
    };

    const result = await updateUser(input);

    expect(result.password_hash).toEqual(originalUser.password_hash);
    expect(result.role).toEqual(originalUser.role);
    expect(result.created_at).toEqual(originalUser.created_at);
  });

  it('should handle email uniqueness constraint violation', async () => {
    // Create first user
    await createTestUser();

    // Create second user
    const secondUser = await db.insert(usersTable)
      .values({
        email: 'second@example.com',
        password_hash: 'hashed_password_456',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'customer',
        is_active: true
      })
      .returning()
      .execute();

    // Try to update second user with first user's email
    const input: UpdateUserInput = {
      id: secondUser[0].id,
      email: 'test@example.com' // This email already exists
    };

    await expect(updateUser(input)).rejects.toThrow();
  });
});