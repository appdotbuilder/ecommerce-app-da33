import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Product, CreateProductInput, UpdateProductInput, Category } from '../../../server/src/schema';

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [createForm, setCreateForm] = useState<CreateProductInput>({
    name: '',
    code: '',
    description: null,
    price: 0,
    stock: 0,
    category_id: 0,
    image_url: null
  });

  const [editForm, setEditForm] = useState<UpdateProductInput>({
    id: 0,
    name: '',
    code: '',
    description: null,
    price: 0,
    stock: 0,
    category_id: 0,
    image_url: null
  });

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

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newProduct = await trpc.createProduct.mutate(createForm);
      setProducts(prev => [newProduct, ...prev]);
      setCreateForm({
        name: '',
        code: '',
        description: null,
        price: 0,
        stock: 0,
        category_id: 0,
        image_url: null
      });
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    setIsLoading(true);

    try {
      const updatedProduct = await trpc.updateProduct.mutate(editForm);
      setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
      setEditingProduct(null);
    } catch (error) {
      console.error('Failed to update product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    try {
      await trpc.deleteProduct.mutate(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Failed to delete product:', error);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditForm({
      id: product.id,
      name: product.name,
      code: product.code,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category_id: product.category_id,
      image_url: product.image_url
    });
  };

  const getCategoryName = (categoryId: number) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>+ Add New Product</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <Input
                placeholder="Product name"
                value={createForm.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm(prev => ({ ...prev, name: e.target.value }))
                }
                required
              />
              <Input
                placeholder="Product code (unique)"
                value={createForm.code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm(prev => ({ ...prev, code: e.target.value }))
                }
                required
              />
              <Textarea
                placeholder="Description (optional)"
                value={createForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setCreateForm(prev => ({ ...prev, description: e.target.value || null }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Price"
                  value={createForm.price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }
                  step="0.01"
                  min="0.01"
                  required
                />
                <Input
                  type="number"
                  placeholder="Stock"
                  value={createForm.stock}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setCreateForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))
                  }
                  min="0"
                  required
                />
              </div>
              <Select
                value={createForm.category_id.toString()}
                onValueChange={(value) =>
                  setCreateForm(prev => ({ ...prev, category_id: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Image URL (optional)"
                value={createForm.image_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setCreateForm(prev => ({ ...prev, image_url: e.target.value || null }))
                }
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Creating...' : 'Create Product'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
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
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No products found. Create your first product!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {products.map((product: Product) => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{product.name}</h3>
                      <Badge variant="secondary">{product.code}</Badge>
                    </div>
                    {product.description && (
                      <p className="text-gray-600 text-sm mb-2">{product.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>💰 ${product.price.toFixed(2)}</span>
                      <span>📦 Stock: {product.stock}</span>
                      <span>🏷️ {getCategoryName(product.category_id)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {product.created_at.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(product)}
                    >
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Product</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{product.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Product Dialog */}
      {editingProduct && (
        <Dialog open={true} onOpenChange={() => setEditingProduct(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateProduct} className="space-y-4">
              <Input
                placeholder="Product name"
                value={editForm.name || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm(prev => ({ ...prev, name: e.target.value }))
                }
                required
              />
              <Input
                placeholder="Product code"
                value={editForm.code || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm(prev => ({ ...prev, code: e.target.value }))
                }
                required
              />
              <Textarea
                placeholder="Description (optional)"
                value={editForm.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setEditForm(prev => ({ ...prev, description: e.target.value || null }))
                }
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  placeholder="Price"
                  value={editForm.price || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))
                  }
                  step="0.01"
                  min="0.01"
                  required
                />
                <Input
                  type="number"
                  placeholder="Stock"
                  value={editForm.stock || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditForm(prev => ({ ...prev, stock: parseInt(e.target.value) || 0 }))
                  }
                  min="0"
                  required
                />
              </div>
              <Select
                value={editForm.category_id?.toString() || ''}
                onValueChange={(value) =>
                  setEditForm(prev => ({ ...prev, category_id: parseInt(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Image URL (optional)"
                value={editForm.image_url || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditForm(prev => ({ ...prev, image_url: e.target.value || null }))
                }
              />
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? 'Updating...' : 'Update Product'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProduct(null)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}