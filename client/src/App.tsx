import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, LoginUserInput, RegisterUserInput } from '../../server/src/schema';

import { ProductManagement } from '@/components/ProductManagement';
import { CategoryManagement } from '@/components/CategoryManagement';
import { OrderManagement } from '@/components/OrderManagement';
import { CustomerDashboard } from '@/components/CustomerDashboard';
import { ProductCatalog } from '@/components/ProductCatalog';
import { ShoppingCart } from '@/components/ShoppingCart';
import { Checkout } from '@/components/Checkout';
import { OrderHistory } from '@/components/OrderHistory';
import './App.css';

// Auth Context
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginUserInput) => Promise<void>;
  register: (userData: RegisterUserInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (credentials: LoginUserInput) => {
    try {
      const response = await trpc.loginUser.mutate(credentials);
      // loginUser returns { token, user }, we only need the user part
      setUser(response.user as User);
      localStorage.setItem('user', JSON.stringify(response.user));
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterUserInput) => {
    try {
      const response = await trpc.registerUser.mutate(userData);
      setUser(response);
      localStorage.setItem('user', JSON.stringify(response));
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  // Check for stored user on app load
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('user');
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Login/Register Component
function AuthForm() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState<LoginUserInput>({
    email: '',
    password: ''
  });

  const [registerForm, setRegisterForm] = useState<RegisterUserInput>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'customer'
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(loginForm);
    } catch (error) {
      setError('Invalid credentials. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await register(registerForm);
    } catch (error) {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            🛒 E-Commerce Store
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {isLogin ? 'Login' : 'Register'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={isLogin ? 'login' : 'register'} onValueChange={(value) => setIsLogin(value === 'login')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={loginForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginForm(prev => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={loginForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginForm(prev => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign in'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="First name"
                      value={registerForm.first_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm(prev => ({ ...prev, first_name: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Last name"
                      value={registerForm.last_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm(prev => ({ ...prev, last_name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={registerForm.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm(prev => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Input
                      type="password"
                      placeholder="Password (min. 6 characters)"
                      value={registerForm.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterForm(prev => ({ ...prev, password: e.target.value }))
                      }
                      required
                      minLength={6}
                    />
                  </div>
                  <div>
                    <select
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={registerForm.role}
                      onChange={(e) =>
                        setRegisterForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'customer' }))
                      }
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main Application Component
function MainApp() {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (!user) {
    return <AuthForm />;
  }

  const isAdmin = user.role === 'admin';

  const navigation = isAdmin ? [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'categories', label: 'Categories', icon: '🏷️' },
    { id: 'orders', label: 'Orders', icon: '📋' },
  ] : [
    { id: 'catalog', label: 'Products', icon: '🛍️' },
    { id: 'cart', label: 'Cart', icon: '🛒' },
    { id: 'orders', label: 'My Orders', icon: '📦' },
  ];

  const renderPage = () => {
    if (isAdmin) {
      switch (currentPage) {
        case 'dashboard':
          return <AdminDashboard />;
        case 'products':
          return <ProductManagement />;
        case 'categories':
          return <CategoryManagement />;
        case 'orders':
          return <OrderManagement />;
        default:
          return <AdminDashboard />;
      }
    } else {
      switch (currentPage) {
        case 'catalog':
          return <ProductCatalog onAddToCart={() => setCurrentPage('cart')} />;
        case 'cart':
          return <ShoppingCart onCheckout={() => setCurrentPage('checkout')} />;
        case 'checkout':
          return <Checkout onOrderComplete={() => setCurrentPage('orders')} />;
        case 'orders':
          return <OrderHistory />;
        default:
          return <ProductCatalog onAddToCart={() => setCurrentPage('cart')} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-gray-900">
                🛒 E-Commerce {isAdmin ? 'Admin' : 'Store'}
              </h1>
              <div className="flex space-x-4">
                {navigation.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.id)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon} {item.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Welcome, {user.first_name}!
                </span>
                <Badge variant={isAdmin ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
              <Button onClick={logout} variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {renderPage()}
      </main>
    </div>
  );
}

// Simple Admin Dashboard
function AdminDashboard() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalCategories: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [productsResponse, ordersResponse, categories] = await Promise.all([
          trpc.getProducts.query(),
          trpc.getOrders.query(),
          trpc.getCategories.query()
        ]);
        
        setStats({
          totalProducts: productsResponse.total,
          totalOrders: ordersResponse.total,
          totalCategories: categories.length
        });
      } catch (error) {
        console.error('Failed to load dashboard stats:', error);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <span className="text-2xl">📦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <span className="text-2xl">📋</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <span className="text-2xl">🏷️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Use the navigation menu above to manage products, categories, and orders.
            Monitor your e-commerce operations from this central dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;