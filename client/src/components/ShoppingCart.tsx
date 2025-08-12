import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { CartItem, Product, UpdateCartItemInput } from '../../../server/src/schema';

interface ShoppingCartProps {
  onCheckout: () => void;
}

// Extended cart item type with product details
interface CartItemWithProduct extends CartItem {
  product?: Product;
}

export function ShoppingCart({ onCheckout }: ShoppingCartProps) {
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  const loadCartItems = useCallback(async () => {
    try {
      const items = await trpc.getCartItems.query();
      setCartItems(items);
    } catch (error) {
      console.error('Failed to load cart items:', error);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query();
      setProducts(result.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, []);

  useEffect(() => {
    loadCartItems();
    loadProducts();
  }, [loadCartItems, loadProducts]);

  // Combine cart items with product details
  const cartItemsWithProducts: CartItemWithProduct[] = cartItems.map(item => {
    const product = products.find(p => p.id === item.product_id);
    return {
      ...item,
      product
    };
  });

  const handleUpdateQuantity = async (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) return;

    setUpdatingItems(prev => new Set([...prev, itemId]));
    
    try {
      const updateData: UpdateCartItemInput = {
        id: itemId,
        quantity: newQuantity
      };
      await trpc.updateCartItem.mutate(updateData);
      await loadCartItems(); // Refresh cart items
    } catch (error) {
      console.error('Failed to update cart item:', error);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await trpc.removeCartItem.mutate(itemId);
      await loadCartItems(); // Refresh cart items
    } catch (error) {
      console.error('Failed to remove cart item:', error);
    }
  };

  const calculateSubtotal = () => {
    return cartItemsWithProducts.reduce((total, item) => {
      if (item.product) {
        return total + (item.product.price * item.quantity);
      }
      return total;
    }, 0);
  };

  const calculateTax = (subtotal: number) => subtotal * 0.08; // 8% tax
  const calculateShipping = () => 10.00; // Fixed shipping cost
  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal + calculateTax(subtotal) + calculateShipping();
  };

  const totalItems = cartItemsWithProducts.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = calculateSubtotal();
  const tax = calculateTax(subtotal);
  const shipping = calculateShipping();
  const total = calculateTotal();

  if (cartItemsWithProducts.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">🛒 Shopping Cart</h2>
        
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-4">
              <p className="text-6xl">🛒</p>
              <h3 className="text-xl font-medium">Your cart is empty</h3>
              <p className="text-gray-600">
                Add some products to your cart to get started
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          🛒 Shopping Cart ({totalItems} item{totalItems !== 1 ? 's' : ''})
        </h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cartItemsWithProducts.map((item: CartItemWithProduct) => {
            const isUpdating = updatingItems.has(item.id);
            
            if (!item.product) {
              return (
                <Card key={item.id} className="opacity-50">
                  <CardContent className="p-4">
                    <p className="text-red-500">Product not found</p>
                  </CardContent>
                </Card>
              );
            }

            const itemTotal = item.product.price * item.quantity;
            const isOutOfStock = item.product.stock === 0;
            const isOverStock = item.quantity > item.product.stock;

            return (
              <Card key={item.id} className={isOutOfStock || isOverStock ? 'border-red-200' : ''}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                      {item.product.image_url ? (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Product Details */}
                    <div className="flex-1">
                      <h3 className="font-semibold">{item.product.name}</h3>
                      <p className="text-sm text-gray-600">Code: {item.product.code}</p>
                      <p className="text-sm text-gray-600">${item.product.price.toFixed(2)} each</p>
                      
                      {isOutOfStock && (
                        <p className="text-sm text-red-600 font-medium">Out of Stock</p>
                      )}
                      {isOverStock && (
                        <p className="text-sm text-red-600 font-medium">
                          Only {item.product.stock} available
                        </p>
                      )}
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || isUpdating}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newQuantity = parseInt(e.target.value) || 1;
                            if (newQuantity !== item.quantity) {
                              handleUpdateQuantity(item.id, newQuantity);
                            }
                          }}
                          className="w-20 text-center"
                          min="1"
                          max={item.product.stock}
                          disabled={isUpdating}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock || isUpdating}
                        >
                          +
                        </Button>
                      </div>
                      
                      <p className="font-semibold">${itemTotal.toFixed(2)}</p>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            Remove
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Item</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove "{item.product.name}" from your cart?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveItem(item.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal ({totalItems} items)</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Tax (8%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping</span>
                <span>${shipping.toFixed(2)}</span>
              </div>
              
              <hr />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              
              <Button
                onClick={onCheckout}
                className="w-full"
                disabled={
                  isLoading || 
                  cartItemsWithProducts.some(item => 
                    !item.product || 
                    item.product.stock === 0 || 
                    item.quantity > item.product.stock
                  )
                }
              >
                {isLoading ? 'Processing...' : '🚀 Proceed to Checkout'}
              </Button>
              
              {cartItemsWithProducts.some(item => 
                !item.product || item.product.stock === 0 || item.quantity > item.product.stock
              ) && (
                <p className="text-sm text-red-600 text-center">
                  Please resolve stock issues before checkout
                </p>
              )}
            </CardContent>
          </Card>

          {/* Shopping Protection */}
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">
                🔒 Secure checkout<br />
                💳 Multiple payment options<br />
                📦 Free returns within 30 days
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}