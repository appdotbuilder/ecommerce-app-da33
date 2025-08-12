import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Order, UpdateOrderStatusInput } from '../../../server/src/schema';

export function OrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      const result = await trpc.getOrders.query({
        status: statusFilter === 'all' ? undefined : statusFilter as any
      });
      setOrders(result.orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    setIsLoading(true);
    try {
      const updateData: UpdateOrderStatusInput = {
        id: orderId,
        status: newStatus as any
      };
      const updatedOrder = await trpc.updateOrderStatus.mutate(updateData);
      setOrders(prev => prev.map(order => 
        order.id === orderId ? { ...order, status: updatedOrder.status } : order
      ));
    } catch (error) {
      console.error('Failed to update order status:', error);
    } finally {
      setIsLoading(false);
    }
  };

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

  const orderStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Order Management</h2>
        
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

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order: Order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">Order #{order.id}</h3>
                      <Badge 
                        variant={getStatusBadgeVariant(order.status)}
                        className={getStatusColor(order.status)}
                      >
                        {order.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>💰 Total: ${order.total_amount.toFixed(2)}</p>
                      <p>📍 Shipping: {order.shipping_address}</p>
                      <p>🚚 Method: {order.shipping_method}</p>
                      <p>📅 Created: {order.created_at.toLocaleDateString()}</p>
                      {order.updated_at && (
                        <p>🔄 Updated: {order.updated_at.toLocaleDateString()}</p>
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
                          <div>
                            <h4 className="font-medium mb-2">Order Information</h4>
                            <div className="space-y-1 text-sm">
                              <p>Status: <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></p>
                              <p>Total Amount: ${order.total_amount.toFixed(2)}</p>
                              <p>User ID: {order.user_id}</p>
                              <p>Created: {order.created_at.toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Shipping Information</h4>
                            <div className="space-y-1 text-sm">
                              <p>Address: {order.shipping_address}</p>
                              <p>Method: {order.shipping_method}</p>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-medium mb-2">Update Status</h4>
                            <Select
                              value={order.status}
                              onValueChange={(newStatus) => {
                                handleUpdateOrderStatus(order.id, newStatus);
                                setSelectedOrder(null);
                              }}
                              disabled={isLoading}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {orderStatuses.map((status) => (
                                  <SelectItem key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Select
                      value={order.status}
                      onValueChange={(newStatus) => handleUpdateOrderStatus(order.id, newStatus)}
                      disabled={isLoading}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatuses.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Summary Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Order Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
            {orderStatuses.map((status) => {
              const count = orders.filter(order => order.status === status).length;
              const total = orders.filter(order => order.status === status)
                .reduce((sum, order) => sum + order.total_amount, 0);
              
              return (
                <div key={status} className="space-y-1">
                  <p className={`font-semibold text-lg ${getStatusColor(status)}`}>
                    {count}
                  </p>
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                  <p className="text-xs text-gray-500">
                    ${total.toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}