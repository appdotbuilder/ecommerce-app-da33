import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { eq } from 'drizzle-orm';

export async function loginUser(input: LoginUserInput): Promise<{ token: string; user: { id: number; email: string; role: string } }> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      throw new Error('Account is deactivated');
    }

    // In a real implementation, you would hash the input password and compare it with the stored hash
    // For now, we'll do a simple string comparison (this is not secure for production)
    // const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);
    const isPasswordValid = input.password === user.password_hash;

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // In a real implementation, you would generate a proper JWT token
    // For this example, we'll create a simple token string
    const token = `jwt_${user.id}_${Date.now()}`;

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}