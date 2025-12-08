import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Store,
  User,
  Phone,
  MapPin,
  Moon,
  Sun,
  Package,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Save,
  MessageCircle,
  Info,
} from 'lucide-react';

export default function Settings() {
  const { settings, updateSettings, theme, toggleTheme } = useApp();
  const [shopInfo, setShopInfo] = useState({
    shopName: settings.shopName,
    ownerName: settings.ownerName,
    phone: settings.phone,
    address: settings.address,
  });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({ name: '', unit: '', price: '' });
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [saved, setSaved] = useState(false);
  const [whatsappTemplate, setWhatsappTemplate] = useState(settings.whatsappTemplate || '');
  const [whatsappSaved, setWhatsappSaved] = useState(false);

  const handleSaveShopInfo = () => {
    updateSettings(shopInfo);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveWhatsappTemplate = () => {
    updateSettings({ whatsappTemplate });
    setWhatsappSaved(true);
    setTimeout(() => setWhatsappSaved(false), 2000);
  };

  const handleUpdateProduct = (productId: string, updates: Partial<typeof settings.products[0]>) => {
    const updatedProducts = settings.products.map(p =>
      p.id === productId ? { ...p, ...updates } : p
    );
    updateSettings({ products: updatedProducts });
    setEditingProduct(null);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || !newProduct.unit || !newProduct.price) return;

    const product = {
      id: Date.now().toString(),
      name: newProduct.name,
      unit: newProduct.unit,
      price: Number(newProduct.price),
      isActive: true,
    };

    updateSettings({ products: [...settings.products, product] });
    setNewProduct({ name: '', unit: '', price: '' });
    setShowAddProduct(false);
  };

  const handleDeleteProduct = (productId: string) => {
    const updatedProducts = settings.products.filter(p => p.id !== productId);
    updateSettings({ products: updatedProducts });
  };

  const handleToggleProduct = (productId: string) => {
    const updatedProducts = settings.products.map(p =>
      p.id === productId ? { ...p, isActive: !p.isActive } : p
    );
    updateSettings({ products: updatedProducts });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Shop Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-500" />
          Shop Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shop Name
            </label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={shopInfo.shopName}
                onChange={(e) => setShopInfo({ ...shopInfo, shopName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Owner Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={shopInfo.ownerName}
                onChange={(e) => setShopInfo({ ...shopInfo, ownerName: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                value={shopInfo.phone}
                onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                value={shopInfo.address}
                onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
          </div>

          <button
            onClick={handleSaveShopInfo}
            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors"
          >
            {saved ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-blue-500" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium text-gray-800 dark:text-white">Theme</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                theme === 'dark' ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Products & Pricing */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Products & Pricing
          </h2>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        <div className="space-y-3">
          {settings.products.map((product) => (
            <div
              key={product.id}
              className={`p-4 rounded-xl border ${
                product.isActive
                  ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 opacity-60'
              }`}
            >
              {editingProduct === product.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      defaultValue={product.name}
                      id={`name-${product.id}`}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-white text-sm"
                      placeholder="Name"
                    />
                    <input
                      type="text"
                      defaultValue={product.unit}
                      id={`unit-${product.id}`}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-white text-sm"
                      placeholder="Unit"
                    />
                    <input
                      type="number"
                      defaultValue={product.price}
                      id={`price-${product.id}`}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-800 dark:text-white text-sm"
                      placeholder="Price"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const name = (document.getElementById(`name-${product.id}`) as HTMLInputElement).value;
                        const unit = (document.getElementById(`unit-${product.id}`) as HTMLInputElement).value;
                        const price = Number((document.getElementById(`price-${product.id}`) as HTMLInputElement).value);
                        handleUpdateProduct(product.id, { name, unit, price });
                      }}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 text-sm rounded-lg"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800 dark:text-white">{product.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ₹{product.price} / {product.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleProduct(product.id)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        product.isActive
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {product.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button
                      onClick={() => setEditingProduct(product.id)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Product Form */}
        {showAddProduct && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <h3 className="font-medium text-gray-800 dark:text-white mb-3">Add New Product</h3>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                placeholder="Name"
              />
              <input
                type="text"
                value={newProduct.unit}
                onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                placeholder="Unit"
              />
              <input
                type="number"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white text-sm"
                placeholder="Price"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddProduct}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
              >
                Add Product
              </button>
              <button
                onClick={() => {
                  setShowAddProduct(false);
                  setNewProduct({ name: '', unit: '', price: '' });
                }}
                className="flex-1 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Message Template */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-green-500" />
          WhatsApp Message Template
        </h2>

        {/* Placeholders Info */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Available Placeholders:</p>
              <ul className="space-y-1 text-xs">
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{shopName}'}</code> - Your shop name</li>
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{shopPhone}'}</code> - Your phone number</li>
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{customerName}'}</code> - Customer's name</li>
                <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{dueAmount}'}</code> - Customer's pending dues</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Message Template
            </label>
            <textarea
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500 font-mono text-sm"
              rows={8}
              placeholder="Enter your WhatsApp message template..."
            />
          </div>

          <button
            onClick={handleSaveWhatsappTemplate}
            className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl transition-colors"
          >
            {whatsappSaved ? (
              <>
                <Check className="w-5 h-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Save Template
              </>
            )}
          </button>
        </div>
      </div>
      {/* About DMS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-purple-500" />
          About DMS
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-600 dark:text-gray-300">Version</span>
            <span className="font-semibold text-gray-800 dark:text-white">2.0</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-600 dark:text-gray-300">Created By</span>
            <span className="font-semibold text-gray-800 dark:text-white">Vishal Dhangar</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span className="text-gray-600 dark:text-gray-300">App Name</span>
            <span className="font-semibold text-gray-800 dark:text-white">Dairy Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
