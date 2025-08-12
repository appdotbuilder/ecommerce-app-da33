import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { Order, CartItem } from '../../../server/src/schema';

interface CustomerDashboardProps {
  onNavigate: (page: string) => void;
}

export function CustomerDashboard({ onNavigate }: CustomerDashboardProps) {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoading(true);
      try {
        const [ordersResponse, cart] = await Promise.all([
          trpc.getOrders.query({ limit: 5 }),
          trpc.getCartItems.query()
        ]);
        
        setRecentOrders(ordersResponse.orders);
        setCartItems(cart);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartValue = cartItems.length; // We'd need to join with products to get real value

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'paid':
        return 'default';
      case 'shipped':
        return 'outline';
      case 'completed':
        return 'default';
      case 'cancelled':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Welcome back! 👋</h2>
      
      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cart Items</CardTitle>
            <span className="text-2xl">🛒</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCartItems}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm"
              onClick={() => onNavigate('cart')}
            >
              View Cart →
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <span className="text-2xl">📦</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentOrders.length}</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm"
              onClick={() => onNavigate('orders')}
            >
              View Orders →
            </Button>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Browse Products</CardTitle>
            <span className="text-2xl">🛍️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Shop</div>
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm"
              onClick={() => onNavigate('catalog')}
            >
              Browse Now →
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onNavigate('catalog')}>
              🛍️ Browse Products
            </Button>
            <Button variant="outline" onClick={() => onNavigate('cart')}>
              🛒 View Cart ({totalCartItems})
            </Button>
            <Button variant="outline" onClick={() => onNavigate('orders')}>
              📦 My Orders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      {recentOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.slice(0, 3).map((order: Order) => (
                <div key={order.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">Order #{order.id}</p>
                    <p className="text-sm text-gray-600">
                      ${order.total_amount.toFixed(2)} • {order.created_at.toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={getStatusBadgeVariant(order.status)}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>
              ))}
              {recentOrders.length > 3 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => onNavigate('orders')}
                >
                  View All Orders
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {recentOrders.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="space-y-3">
              <p className="text-4xl">🛍️</p>
              <h3 className="text-lg font-medium">Start Shopping!</h3>
              <p className="text-gray-600">
                Discover amazing products in our catalog
              </p>
              <Button onClick={() => onNavigate('catalog')}>
                Browse Products
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}