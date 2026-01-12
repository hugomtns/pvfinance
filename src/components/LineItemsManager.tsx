import { useState } from 'react';
import type { CostLineItem } from '../types';
import { CapexAutocomplete } from './CapexAutocomplete';
import { OpexAutocomplete } from './OpexAutocomplete';
import { generateCapexItems, generateOpexItems } from '../utils/designGenerator';
import { getCapexItemCategory, getOpexItemCategory } from '../utils/categoryHelpers';
import '../styles/LineItems.css';

interface LineItemsManagerProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  capexItems: CostLineItem[];
  opexItems: CostLineItem[];
  onCapexItemsChange: (items: CostLineItem[]) => void;
  onOpexItemsChange: (items: CostLineItem[]) => void;
  capacity: number; // System capacity in MW
}

export function LineItemsManager({
  enabled,
  onToggle,
  capexItems,
  opexItems,
  onCapexItemsChange,
  onOpexItemsChange,
  capacity,
}: LineItemsManagerProps) {
  const [activeTab, setActiveTab] = useState<'capex' | 'opex'>('capex');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Per-category add item forms
  const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');

  const handleTabChange = (tab: 'capex' | 'opex') => {
    setActiveTab(tab);
    // Clear form fields when switching tabs
    setNewItemName('');
    setNewItemAmount('');
    setNewItemQuantity('');
    setAddingToCategory(null);
    setShowAddCategoryForm(false);
  };

  const isCapexTab = activeTab === 'capex';
  const currentItems = isCapexTab ? capexItems : opexItems;
  const setCurrentItems = isCapexTab ? onCapexItemsChange : onOpexItemsChange;

  // Migrate items without category to "Uncategorized"
  const migratedItems = currentItems.map(item => ({
    ...item,
    category: item.category || 'Uncategorized',
  }));

  // Extract unique categories from items
  const categories = Array.from(new Set(migratedItems.map(item => item.category)));

  // Get items for a specific category
  const getCategoryItems = (category: string): CostLineItem[] => {
    return migratedItems.filter(item => item.category === category);
  };

  const totalCapex = capexItems.reduce((sum, item) => sum + item.amount, 0);
  const totalOpex = opexItems.reduce((sum, item) => sum + item.amount, 0);

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      return;
    }

    // Check for duplicate (case-insensitive)
    const exists = categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      alert('Category already exists');
      return;
    }

    // Just close the form - category will be created when first item is added
    setNewCategoryName('');
    setShowAddCategoryForm(false);
    setAddingToCategory(trimmedName);
  };

  const handleDeleteCategory = (category: string) => {
    const itemsInCategory = getCategoryItems(category);
    if (itemsInCategory.length > 0) {
      alert(`Cannot delete category "${category}" because it contains ${itemsInCategory.length} item(s)`);
      return;
    }
    // Category will be removed automatically when it has no items
  };

  const handleToggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
    }
    setCollapsedCategories(newCollapsed);
  };

  const handleAddItem = (category: string) => {
    if (!newItemName.trim()) {
      return;
    }

    // Auto-detect category from item name if it's a predefined item
    const detectedCategory = isCapexTab
      ? getCapexItemCategory(newItemName.trim())
      : getOpexItemCategory(newItemName.trim());

    // Use detected category if found, otherwise use the provided category
    const finalCategory = detectedCategory !== "Uncategorized" ? detectedCategory : category;

    let newItem: CostLineItem;

    if (isCapexTab) {
      // CapEx: Calculate amount from unit_price × quantity
      const unitPrice = parseFloat(newItemAmount);
      const quantity = parseFloat(newItemQuantity);

      if (isNaN(unitPrice) || unitPrice <= 0 || isNaN(quantity) || quantity <= 0) {
        return;
      }

      newItem = {
        name: newItemName.trim(),
        amount: unitPrice * quantity,
        is_capex: true,
        category: finalCategory,
        unit_price: unitPrice,
        quantity: quantity,
      };
    } else {
      // OpEx: Use amount directly
      const amount = parseFloat(newItemAmount);

      if (isNaN(amount) || amount <= 0) {
        return;
      }

      newItem = {
        name: newItemName.trim(),
        amount,
        is_capex: false,
        category: finalCategory,
      };
    }

    setCurrentItems([...currentItems, newItem]);

    // Reset form
    setNewItemName('');
    setNewItemAmount('');
    setNewItemQuantity('');
    setAddingToCategory(null);
  };

  const handleDeleteItem = (itemToDelete: CostLineItem) => {
    const updatedItems = currentItems.filter(item => item !== itemToDelete);
    setCurrentItems(updatedItems);
  };

  const handleFillFromDesign = () => {
    // Generate items based on capacity
    if (isCapexTab) {
      const generatedItems = generateCapexItems(capacity);
      onCapexItemsChange(generatedItems);
    } else {
      const generatedItems = generateOpexItems(capacity);
      onOpexItemsChange(generatedItems);
    }

    // Clear form fields and expand all categories
    setNewItemName('');
    setNewItemAmount('');
    setNewItemQuantity('');
    setAddingToCategory(null);
    setCollapsedCategories(new Set());
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="line-items-container">
      <div className="line-items-toggle">
        <label>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          Use Detailed Cost Line Items
        </label>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          (Break down CapEx and OpEx into individual line items)
        </span>
      </div>

      {enabled && (
        <div className="line-items-content">
          <div className="line-items-tabs">
            <button
              type="button"
              className={`tab-button ${activeTab === 'capex' ? 'active' : ''}`}
              onClick={() => handleTabChange('capex')}
            >
              CapEx Items ({capexItems.length})
            </button>
            <button
              type="button"
              className={`tab-button ${activeTab === 'opex' ? 'active' : ''}`}
              onClick={() => handleTabChange('opex')}
            >
              OpEx Items ({opexItems.length})
            </button>
          </div>

          <div style={{
            marginTop: 'var(--spacing-lg)',
            marginBottom: 'var(--spacing-md)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-sm)'
          }}>
            <button
              type="button"
              onClick={handleFillFromDesign}
              disabled={capacity <= 0}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: capacity > 0 ? '#10b981' : '#94a3b8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: capacity > 0 ? 'pointer' : 'not-allowed',
                fontSize: '0.875rem',
                fontWeight: 500,
                transition: 'background-color 0.2s ease'
              }}
              title={capacity <= 0 ? 'Please enter a valid capacity first' : `Generate ${isCapexTab ? 'CapEx' : 'OpEx'} items based on system capacity`}
            >
              Fill from Design
            </button>
          </div>

          {/* Add Category Button/Form */}
          <div style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
            {showAddCategoryForm ? (
              <div className="add-category-form">
                <input
                  type="text"
                  placeholder="Enter category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  autoFocus
                  style={{
                    padding: '0.5rem',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    flex: 1
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: newCategoryName.trim() ? '#3b82f6' : '#94a3b8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategoryForm(false);
                    setNewCategoryName('');
                  }}
                  style={{
                    padding: '0.5rem 1rem',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="add-category-btn"
                onClick={() => setShowAddCategoryForm(true)}
              >
                + Add Category
              </button>
            )}
          </div>

          {/* Categories List */}
          <div className="categories-container">
            {categories.length > 0 ? (
              categories.map(category => {
                const categoryItems = getCategoryItems(category);
                const isCollapsed = collapsedCategories.has(category);
                const canDelete = categoryItems.length === 0;

                return (
                  <div key={category} className="category-section">
                    {/* Category Header */}
                    <div
                      className={`category-header ${isCollapsed ? 'collapsed' : ''}`}
                      onClick={() => handleToggleCategory(category)}
                    >
                      <span className="collapse-icon">{isCollapsed ? '▶' : '▼'}</span>
                      <span className="category-title">
                        {category} ({categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'})
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          className="category-delete-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCategory(category);
                          }}
                          title="Delete empty category"
                        >
                          Delete Category
                        </button>
                      )}
                    </div>

                    {/* Category Items */}
                    {!isCollapsed && (
                      <div className="category-content">
                        {categoryItems.length > 0 && (
                          <>
                            <div className="line-item-header" style={{ gridTemplateColumns: isCapexTab ? '4fr 1.2fr 0.8fr 1.2fr auto' : '2fr 1.5fr auto' }}>
                              <div>Item Name</div>
                              {isCapexTab ? (
                                <>
                                  <div>Price/Item (€)</div>
                                  <div>Quantity</div>
                                  <div>Total (€)</div>
                                </>
                              ) : (
                                <>
                                  <div>Amount (€)</div>
                                </>
                              )}
                              <div>Action</div>
                            </div>
                            {categoryItems.map((item, index) => (
                              <div key={index} className="line-item" style={{ gridTemplateColumns: isCapexTab ? '4fr 1.2fr 0.8fr 1.2fr auto' : '2fr 1.5fr auto' }}>
                                <div className="line-item-name">{item.name}</div>
                                {isCapexTab ? (
                                  <>
                                    <div className="line-item-amount">{formatCurrency(item.unit_price || 0)}</div>
                                    <div className="line-item-amount">{item.quantity || 0}</div>
                                    <div className="line-item-amount" style={{ fontWeight: 600 }}>{formatCurrency(item.amount)}</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="line-item-amount">{formatCurrency(item.amount)}</div>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="line-item-delete"
                                  onClick={() => handleDeleteItem(item)}
                                  title="Delete item"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Add Item Form for this category */}
                        {addingToCategory === category ? (
                          <div className="category-add-item-form">
                            <div className="line-item-header" style={{ borderBottom: '1px solid var(--color-border)', gridTemplateColumns: isCapexTab ? '4fr 1.2fr 0.8fr 1.2fr auto' : '2fr 1.5fr auto', marginTop: '1rem' }}>
                              <div>Item Name</div>
                              {isCapexTab ? (
                                <>
                                  <div>Price/Item (€)</div>
                                  <div>Quantity</div>
                                  <div>Total (€)</div>
                                </>
                              ) : (
                                <>
                                  <div>Amount (€)</div>
                                </>
                              )}
                              <div>Action</div>
                            </div>

                            <div className="line-items-add-form" style={{ gridTemplateColumns: isCapexTab ? '4fr 1.2fr 0.8fr 1.2fr auto' : '2fr 1.5fr auto', marginTop: '0.5rem' }}>
                              {isCapexTab ? (
                                <CapexAutocomplete
                                  value={newItemName}
                                  onChange={setNewItemName}
                                  placeholder="Type to search or enter custom name"
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem(category)}
                                />
                              ) : (
                                <OpexAutocomplete
                                  value={newItemName}
                                  onChange={setNewItemName}
                                  placeholder="Type to search or enter custom name"
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem(category)}
                                />
                              )}
                              <input
                                type="number"
                                placeholder={isCapexTab ? 'Price per item' : 'Total amount'}
                                value={newItemAmount}
                                onChange={(e) => setNewItemAmount(e.target.value)}
                                min="0"
                                step={isCapexTab ? '100' : '1000'}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddItem(category)}
                              />
                              {isCapexTab && (
                                <>
                                  <input
                                    type="number"
                                    placeholder="Qty"
                                    value={newItemQuantity}
                                    onChange={(e) => setNewItemQuantity(e.target.value)}
                                    min="0"
                                    step="1"
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddItem(category)}
                                  />
                                  <div style={{
                                    padding: '0.5rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-end',
                                    fontWeight: 600,
                                    color: 'var(--color-primary)'
                                  }}>
                                    {newItemAmount && newItemQuantity ?
                                      formatCurrency(parseFloat(newItemAmount) * parseFloat(newItemQuantity)) :
                                      '€0'
                                    }
                                  </div>
                                </>
                              )}
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  type="button"
                                  className="line-items-add-button"
                                  onClick={() => handleAddItem(category)}
                                  disabled={!newItemName.trim() || !newItemAmount || (isCapexTab && !newItemQuantity)}
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingToCategory(null);
                                    setNewItemName('');
                                    setNewItemAmount('');
                                    setNewItemQuantity('');
                                  }}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#e5e7eb',
                                    color: '#374151',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem'
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="add-item-to-category-btn"
                            onClick={() => setAddingToCategory(category)}
                          >
                            + Add Item to {category}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="line-items-empty">
                No categories yet. Add a category below to get started.
              </div>
            )}
          </div>

          <div className="line-items-total">
            <span className="line-items-total-label">
              Total {isCapexTab ? 'CapEx' : 'OpEx (Year 1)'}:
            </span>
            <span className="line-items-total-value">
              {formatCurrency(isCapexTab ? totalCapex : totalOpex)}
            </span>
          </div>

          {!isCapexTab && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              Note: OpEx escalation rate is set in Economic Parameters and applied to all OpEx items.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
