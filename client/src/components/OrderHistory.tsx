import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Order } from '../../../server/src/schema';

export function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getOrders.query({
        status: statusFilter === 'all' ? undefined : statusFilter as any
      });
      setOrders(result.orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'paid':
        return 'text-blue-600';
      case 'shipped':
        return 'text-purple-600';
      case 'completed':
        return 'text-green-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'paid':
        return '💳';
      case 'shipped':
        return '🚚';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📦';
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Order received and being processed';
      case 'paid':
        return 'Payment confirmed, preparing for shipment';
      case 'shipped':
        return 'Order shipped and on its way';
      case 'completed':
        return 'Order delivered successfully';
      case 'cancelled':
        return 'Order was cancelled';
      default:
        return 'Order status unknown';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">📦 Order History</h2>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">📦 Order History</h2>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <p className="text-6xl">📦</p>
              <h3 className="text-xl font-medium">No orders found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all' 
                  ? "You haven't placed any orders yet. Start shopping to see your order history here!"
                  : `No orders with status "${statusFilter}" found.`
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order: Order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold">Order #{order.id}</h3>
                      <Badge 
                        variant={getStatusBadgeVariant(order.status)}
                        className="flex items-center gap-1"
                      >
                        {getStatusIcon(order.status)} {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Order Total</p>
                        <p className="font-semibold text-green-600 text-lg">${order.total_amount.toFixed(2)}</p>
                      </div>
                      
                      <div>
                        <p className="text-gray-600">Order Date</p>
                        <p className="font-medium">{order.created_at.toLocaleDateString()}</p>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <p className="text-gray-600">Status</p>
                        <p className={`font-medium ${getStatusColor(order.status)}`}>
                          {getStatusDescription(order.status)}
                        </p>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <p className="text-gray-600">Shipping Method</p>
                        <p className="font-medium">{order.shipping_method}</p>
                      </div>
                      
                      <div className="sm:col-span-2">
                        <p className="text-gray-600">Shipping Address</p>
                        <p className="font-medium text-sm">{order.shipping_address}</p>
                      </div>
                      
                      {order.updated_at && (
                        <div className="sm:col-span-2">
                          <p className="text-gray-600">Last Updated</p>
                          <p className="font-medium">{order.updated_at.toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Order #{order.id} Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Status</span>
                            <Badge variant={getStatusBadgeVariant(order.status)} className="flex items-center gap-1">
                              {getStatusIcon(order.status)} {order.status.toUpperCase()}
                            </Badge>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Order Information</h4>
                            <div className="space-y-1 text-sm">
                              <p>Order ID: #{order.id}</p>
                              <p>Total Amount: <span className="font-semibold text-green-600">${order.total_amount.toFixed(2)}</span></p>
                              <p>Order Date: {order.created_at.toLocaleDateString()}</p>
                              {order.updated_at && <p>Last Updated: {order.updated_at.toLocaleDateString()}</p>}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Shipping Information</h4>
                            <div className="space-y-1 text-sm">
                              <p className="font-medium">Method:</p>
                              <p>{order.shipping_method}</p>
                              <p className="font-medium mt-2">Address:</p>
                              <p>{order.shipping_address}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Order Status</h4>
                            <div className="p-3 bg-gray-50 rounded">
                              <p className={`font-medium ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)} {getStatusDescription(order.status)}
                              </p>
                            </div>
                          </div>

                          {/* Order tracking simulation */}
                          <div>
                            <h4 className="font-medium mb-2">Order Timeline</h4>
                            <div className="space-y-2 text-xs">
                              <div className={`flex items-center gap-2 ${order.status !== 'cancelled' ? 'text-green-600' : 'text-gray-500'}`}>
                                <span>✓</span>
                                <span>Order placed - {order.created_at.toLocaleDateString()}</span>
                              </div>
                              <div className={`flex items-center gap-2 ${['paid', 'shipped', 'completed'].includes(order.status) ? 'text-green-600' : order.status === 'cancelled' ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span>{['paid', 'shipped', 'completed'].includes(order.status) ? '✓' : '○'}</span>
                                <span>Payment confirmed</span>
                              </div>
                              <div className={`flex items-center gap-2 ${['shipped', 'completed'].includes(order.status) ? 'text-green-600' : order.status === 'cancelled' ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span>{['shipped', 'completed'].includes(order.status) ? '✓' : '○'}</span>
                                <span>Order shipped</span>
                              </div>
                              <div className={`flex items-center gap-2 ${order.status === 'completed' ? 'text-green-600' : order.status === 'cancelled' ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span>{order.status === 'completed' ? '✓' : '○'}</span>
                                <span>Order delivered</span>
                              </div>
                              {order.status === 'cancelled' && (
                                <div className="flex items-center gap-2 text-red-600">
                                  <span>✗</span>
                                  <span>Order cancelled</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {/* Action buttons based on status */}
                    {order.status === 'pending' && (
                      <Button variant="outline" size="sm" disabled>
                        Cancel Order
                      </Button>
                    )}
                    {order.status === 'shipped' && (
                      <Button variant="outline" size="sm" disabled>
                        Track Package
                      </Button>
                    )}
                    {order.status === 'completed' && (
                      <Button variant="outline" size="sm" disabled>
                        Reorder
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Statistics */}
      {orders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              {['pending', 'paid', 'shipped', 'completed', 'cancelled'].map((status) => {
                const statusOrders = orders.filter(order => order.status === status);
                const count = statusOrders.length;
                const total = statusOrders.reduce((sum, order) => sum + order.total_amount, 0);
                
                return (
                  <div key={status} className="space-y-1">
                    <p className={`font-semibold text-lg ${getStatusColor(status)}`}>
                      {count}
                    </p>
                    <p className="text-sm text-gray-600 capitalize flex items-center justify-center gap-1">
                      {getStatusIcon(status)} {status}
                    </p>
                    <p className="text-xs text-gray-500">
                      ${total.toFixed(2)}
                    </p>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-4 pt-4 border-t text-center">
              <p className="text-sm text-gray-600">
                Total Orders: <span className="font-semibold">{orders.length}</span> | 
                Total Spent: <span className="font-semibold text-green-600">
                  ${orders.reduce((sum, order) => sum + order.total_amount, 0).toFixed(2)}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}