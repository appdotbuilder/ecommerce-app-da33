import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { trpc } from '@/utils/trpc';
import type { CartItem, Product, CreateOrderInput, CreateTransactionInput } from '../../../server/src/schema';

interface CheckoutProps {
  onOrderComplete: () => void;
}

interface CartItemWithProduct extends CartItem {
  product?: Product;
}

export function Checkout({ onOrderComplete }: CheckoutProps) {
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'shipping' | 'payment' | 'review'>('shipping');

  // Form state
  const [shippingForm, setShippingForm] = useState({
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    phone: ''
  });

  const [shippingMethod, setShippingMethod] = useState('standard');
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    cardholderName: ''
  });

  const loadCartData = useCallback(async () => {
    try {
      const [items, productsResponse] = await Promise.all([
        trpc.getCartItems.query(),
        trpc.getProducts.query()
      ]);
      
      setCartItems(items);
      setProducts(productsResponse.products);
    } catch (error) {
      console.error('Failed to load cart data:', error);
    }
  }, []);

  useEffect(() => {
    loadCartData();
  }, [loadCartData]);

  // Combine cart items with product details
  const cartItemsWithProducts: CartItemWithProduct[] = cartItems.map(item => {
    const product = products.find(p => p.id === item.product_id);
    return { ...item, product };
  });

  const calculateSubtotal = () => {
    return cartItemsWithProducts.reduce((total, item) => {
      if (item.product) {
        return total + (item.product.price * item.quantity);
      }
      return total;
    }, 0);
  };

  const calculateShippingCost = () => {
    switch (shippingMethod) {
      case 'standard':
        return 5.99;
      case 'express':
        return 12.99;
      case 'overnight':
        return 24.99;
      default:
        return 5.99;
    }
  };

  const calculateTax = (subtotal: number) => subtotal * 0.08;
  
  const subtotal = calculateSubtotal();
  const shippingCost = calculateShippingCost();
  const tax = calculateTax(subtotal);
  const total = subtotal + shippingCost + tax;

  const handleCreateOrder = async () => {
    setIsLoading(true);
    try {
      // Format shipping address
      const fullAddress = `${shippingForm.firstName} ${shippingForm.lastName}, ${shippingForm.address}, ${shippingForm.city}, ${shippingForm.state} ${shippingForm.zipCode}, ${shippingForm.country}`;
      
      // Create order
      const orderData: CreateOrderInput = {
        shipping_address: fullAddress,
        shipping_method: `${shippingMethod} (${getShippingMethodLabel(shippingMethod)})`
      };
      
      const order = await trpc.createOrder.mutate(orderData);
      
      // Create transaction (simulated payment)
      const transactionData: CreateTransactionInput = {
        order_id: order.id,
        payment_method: paymentMethod,
        amount: total
      };
      
      await trpc.createTransaction.mutate(transactionData);
      
      // Redirect to order confirmation
      onOrderComplete();
    } catch (error) {
      console.error('Failed to create order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getShippingMethodLabel = (method: string) => {
    switch (method) {
      case 'standard':
        return '5-7 business days';
      case 'express':
        return '2-3 business days';
      case 'overnight':
        return 'Next business day';
      default:
        return '5-7 business days';
    }
  };

  const isShippingFormValid = () => {
    return shippingForm.firstName && 
           shippingForm.lastName && 
           shippingForm.address && 
           shippingForm.city && 
           shippingForm.state && 
           shippingForm.zipCode;
  };

  const isPaymentFormValid = () => {
    if (paymentMethod === 'credit_card') {
      return paymentForm.cardNumber && 
             paymentForm.expiryMonth && 
             paymentForm.expiryYear && 
             paymentForm.cvv && 
             paymentForm.cardholderName;
    }
    return true; // For other payment methods
  };

  // Redirect if cart is empty
  if (cartItemsWithProducts.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Checkout</h2>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">Your cart is empty. Please add items to proceed with checkout.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">🚀 Checkout</h2>
        
        {/* Progress Steps */}
        <div className="flex items-center space-x-4 text-sm">
          <div className={`px-3 py-1 rounded ${step === 'shipping' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>
            1. Shipping
          </div>
          <div className={`px-3 py-1 rounded ${step === 'payment' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>
            2. Payment
          </div>
          <div className={`px-3 py-1 rounded ${step === 'review' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>
            3. Review
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          {/* Shipping Step */}
          {step === 'shipping' && (
            <Card>
              <CardHeader>
                <CardTitle>📍 Shipping Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First name"
                    value={shippingForm.firstName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setShippingForm(prev => ({ ...prev, firstName: e.target.value }))
                    }
                    required
                  />
                  <Input
                    placeholder="Last name"
                    value={shippingForm.lastName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setShippingForm(prev => ({ ...prev, lastName: e.target.value }))
                    }
                    required
                  />
                </div>
                
                <Textarea
                  placeholder="Street address"
                  value={shippingForm.address}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setShippingForm(prev => ({ ...prev, address: e.target.value }))
                  }
                  required
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    placeholder="City"
                    value={shippingForm.city}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setShippingForm(prev => ({ ...prev, city: e.target.value }))
                    }
                    required
                  />
                  <Input
                    placeholder="State"
                    value={shippingForm.state}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setShippingForm(prev => ({ ...prev, state: e.target.value }))
                    }
                    required
                  />
                  <Input
                    placeholder="ZIP Code"
                    value={shippingForm.zipCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setShippingForm(prev => ({ ...prev, zipCode: e.target.value }))
                    }
                    required
                  />
                </div>
                
                <Input
                  placeholder="Phone number (optional)"
                  value={shippingForm.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setShippingForm(prev => ({ ...prev, phone: e.target.value }))
                  }
                />

                {/* Shipping Method */}
                <div className="space-y-3">
                  <h4 className="font-medium">Shipping Method</h4>
                  <RadioGroup value={shippingMethod} onValueChange={setShippingMethod}>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="standard" id="standard" />
                        <Label htmlFor="standard">Standard Shipping (5-7 days)</Label>
                      </div>
                      <span>$5.99</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="express" id="express" />
                        <Label htmlFor="express">Express Shipping (2-3 days)</Label>
                      </div>
                      <span>$12.99</span>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="overnight" id="overnight" />
                        <Label htmlFor="overnight">Overnight Shipping</Label>
                      </div>
                      <span>$24.99</span>
                    </div>
                  </RadioGroup>
                </div>

                <Button
                  onClick={() => setStep('payment')}
                  className="w-full"
                  disabled={!isShippingFormValid()}
                >
                  Continue to Payment
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <Card>
              <CardHeader>
                <CardTitle>💳 Payment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium">Payment Method</h4>
                  <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="credit_card" id="credit_card" />
                      <Label htmlFor="credit_card">Credit/Debit Card</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="paypal" id="paypal" />
                      <Label htmlFor="paypal">PayPal</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="apple_pay" id="apple_pay" />
                      <Label htmlFor="apple_pay">Apple Pay</Label>
                    </div>
                  </RadioGroup>
                </div>

                {paymentMethod === 'credit_card' && (
                  <div className="space-y-4">
                    <Input
                      placeholder="Cardholder name"
                      value={paymentForm.cardholderName}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPaymentForm(prev => ({ ...prev, cardholderName: e.target.value }))
                      }
                      required
                    />
                    <Input
                      placeholder="Card number (1234 5678 9012 3456)"
                      value={paymentForm.cardNumber}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setPaymentForm(prev => ({ ...prev, cardNumber: e.target.value }))
                      }
                      required
                    />
                    <div className="grid grid-cols-3 gap-4">
                      <Select
                        value={paymentForm.expiryMonth}
                        onValueChange={(value) =>
                          setPaymentForm(prev => ({ ...prev, expiryMonth: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
                              {String(i + 1).padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={paymentForm.expiryYear}
                        onValueChange={(value) =>
                          setPaymentForm(prev => ({ ...prev, expiryYear: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() + i;
                            return (
                              <SelectItem key={year} value={String(year)}>
                                {year}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="CVV"
                        value={paymentForm.cvv}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setPaymentForm(prev => ({ ...prev, cvv: e.target.value }))
                        }
                        maxLength={4}
                        required
                      />
                    </div>
                  </div>
                )}

                {paymentMethod !== 'credit_card' && (
                  <div className="p-4 bg-blue-50 rounded">
                    <p className="text-sm text-blue-700">
                      You will be redirected to {paymentMethod === 'paypal' ? 'PayPal' : 'Apple Pay'} to complete your payment.
                    </p>
                  </div>
                )}

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep('shipping')} className="flex-1">
                    Back to Shipping
                  </Button>
                  <Button
                    onClick={() => setStep('review')}
                    className="flex-1"
                    disabled={!isPaymentFormValid()}
                  >
                    Review Order
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Review Step */}
          {step === 'review' && (
            <Card>
              <CardHeader>
                <CardTitle>📋 Order Review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Shipping Summary */}
                <div>
                  <h4 className="font-medium mb-2">Shipping Address</h4>
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    <p>{shippingForm.firstName} {shippingForm.lastName}</p>
                    <p>{shippingForm.address}</p>
                    <p>{shippingForm.city}, {shippingForm.state} {shippingForm.zipCode}</p>
                    <p>{shippingForm.country}</p>
                    {shippingForm.phone && <p>Phone: {shippingForm.phone}</p>}
                  </div>
                </div>

                {/* Payment Summary */}
                <div>
                  <h4 className="font-medium mb-2">Payment Method</h4>
                  <div className="p-3 bg-gray-50 rounded text-sm">
                    <p className="capitalize">
                      {paymentMethod.replace('_', ' ')}
                      {paymentMethod === 'credit_card' && paymentForm.cardNumber && (
                        <span> ending in {paymentForm.cardNumber.slice(-4)}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Items Summary */}
                <div>
                  <h4 className="font-medium mb-2">Order Items</h4>
                  <div className="space-y-2">
                    {cartItemsWithProducts.map((item: CartItemWithProduct) => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div>
                          <p className="font-medium">{item.product?.name}</p>
                          <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                        </div>
                        <span>${((item.product?.price || 0) * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" onClick={() => setStep('payment')} className="flex-1">
                    Back to Payment
                  </Button>
                  <Button
                    onClick={handleCreateOrder}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Placing Order...' : '🎉 Place Order'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Shipping ({getShippingMethodLabel(shippingMethod)})</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              
              <hr />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center text-sm text-gray-600">
              <p>🔒 Your payment information is secure and encrypted</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}