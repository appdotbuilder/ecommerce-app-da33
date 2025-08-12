import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Product, Category, AddToCartInput } from '../../../server/src/schema';

interface ProductCatalogProps {
  onAddToCart: () => void;
}

export function ProductCatalog({ onAddToCart }: ProductCatalogProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      const result = await trpc.getProducts.query({
        search: searchTerm || undefined,
        category_id: selectedCategory === 'all' ? undefined : parseInt(selectedCategory)
      });
      setProducts(result.products);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  }, [searchTerm, selectedCategory]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddToCart = async (productId: number, quantity: number = 1) => {
    setIsLoading(true);
    try {
      const addToCartData: AddToCartInput = {
        product_id: productId,
        quantity
      };
      await trpc.addToCart.mutate(addToCartData);
      onAddToCart(); // Notify parent to switch to cart view
    } catch (error) {
      console.error('Failed to add to cart:', error);
      // You could show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const isOutOfStock = (stock: number) => stock <= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">🛍️ Product Catalog</h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="space-y-3">
              <p className="text-4xl">📦</p>
              <h3 className="text-lg font-medium">No products found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Products will appear here when added by administrators'
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product: Product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow group">
              <CardHeader className="pb-3">
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400">
                      📦
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-lg leading-tight">{product.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {getCategoryName(product.category_id)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {product.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600">
                      ${product.price.toFixed(2)}
                    </span>
                    <span className={`text-sm ${isOutOfStock(product.stock) ? 'text-red-500' : 'text-gray-600'}`}>
                      {isOutOfStock(product.stock) ? 'Out of Stock' : `${product.stock} in stock`}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedProduct(product)}
                        >
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>{product.name}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-6xl text-gray-400">
                                📦
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-bold text-green-600">
                                ${product.price.toFixed(2)}
                              </span>
                              <Badge variant="outline">
                                {getCategoryName(product.category_id)}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-gray-600">
                              Code: {product.code}
                            </p>
                            
                            {product.description && (
                              <p className="text-sm">{product.description}</p>
                            )}
                            
                            <p className={`text-sm ${isOutOfStock(product.stock) ? 'text-red-500' : 'text-gray-600'}`}>
                              {isOutOfStock(product.stock) ? 'Out of Stock' : `${product.stock} items available`}
                            </p>
                          </div>
                          
                          <Button
                            onClick={() => {
                              handleAddToCart(product.id);
                              setSelectedProduct(null);
                            }}
                            disabled={isOutOfStock(product.stock) || isLoading}
                            className="w-full"
                          >
                            {isLoading ? 'Adding...' : isOutOfStock(product.stock) ? 'Out of Stock' : '🛒 Add to Cart'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    <Button
                      onClick={() => handleAddToCart(product.id)}
                      disabled={isOutOfStock(product.stock) || isLoading}
                      className="flex-1"
                    >
                      {isLoading ? 'Adding...' : isOutOfStock(product.stock) ? 'Out of Stock' : '🛒 Add to Cart'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Category Overview */}
      {categories.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Shop by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((category) => {
                const categoryProductCount = products.filter(p => p.category_id === category.id).length;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id.toString())}
                    className={`p-3 text-left border rounded-lg hover:bg-gray-50 transition-colors ${
                      selectedCategory === category.id.toString() ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                  >
                    <h3 className="font-medium text-sm">{category.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {categoryProductCount} product{categoryProductCount !== 1 ? 's' : ''}
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}