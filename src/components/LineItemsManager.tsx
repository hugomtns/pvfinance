import { useState } from 'react';
import type { CostLineItem, CostTemplate } from '../types';
import { AddItemModal } from './AddItemModal';
import { TemplateManager } from './TemplateManager';
import { Modal } from './Modal';
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
  globalMargin: number;
  onGlobalMarginChange: (margin: number) => void;
  capacity: number; // System capacity in MW
}

export function LineItemsManager({
  enabled,
  onToggle,
  capexItems,
  opexItems,
  onCapexItemsChange,
  onOpexItemsChange,
  globalMargin,
  onGlobalMarginChange,
  capacity,
}: LineItemsManagerProps) {
  const [activeTab, setActiveTab] = useState<'capex' | 'opex'>('capex');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Separate state for custom categories (persists even when empty)
  const [customCapexCategories, setCustomCapexCategories] = useState<string[]>([]);
  const [customOpexCategories, setCustomOpexCategories] = useState<string[]>([]);

  // Modal state for adding items
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<string>('');

  // Modal states for alerts and confirmations
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm?: () => void;
    confirmButtonStyle?: 'primary' | 'danger' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert'
  });

  const showAlert = (title: string, message: string) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'alert'
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmButtonStyle: 'primary' | 'danger' | 'success' = 'primary') => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'confirm',
      onConfirm,
      confirmButtonStyle
    });
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      title: '',
      message: '',
      type: 'alert'
    });
  };

  const handleTabChange = (tab: 'capex' | 'opex') => {
    setActiveTab(tab);
    // Close modal and forms when switching tabs
    setIsModalOpen(false);
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

  // Extract unique categories from items and merge with custom categories
  const itemCategories = Array.from(new Set(migratedItems.map(item => item.category)));
  const customCategories = isCapexTab ? customCapexCategories : customOpexCategories;
  const allCategories = Array.from(new Set([...itemCategories, ...customCategories]));
  const categories = allCategories;

  // Get items for a specific category
  const getCategoryItems = (category: string): CostLineItem[] => {
    return migratedItems.filter(item => item.category === category);
  };

  // Calculate item total with margin (CAPEX only)
  const calculateItemTotal = (item: CostLineItem): number => {
    const subtotal = item.amount; // Already calculated as unit_price × quantity
    if (!item.is_capex) return subtotal;

    const marginPercent = item.margin_percent ?? globalMargin;
    return subtotal * (1 + marginPercent / 100);
  };

  // Calculate CAPEX totals (before and after margin)
  const calculateCapexTotals = () => {
    const beforeMargin = capexItems.reduce((sum, item) => sum + item.amount, 0);
    const withMargin = capexItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const effectiveMargin = beforeMargin > 0 ? ((withMargin - beforeMargin) / beforeMargin) * 100 : 0;

    return { beforeMargin, withMargin, effectiveMargin };
  };

  const capexTotals = calculateCapexTotals();
  const totalOpex = opexItems.reduce((sum, item) => sum + item.amount, 0);

  const handleAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName) {
      return;
    }

    // Check for duplicate (case-insensitive)
    const exists = categories.some(cat => cat.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      showAlert('Duplicate Category', 'Category already exists');
      return;
    }

    // Add category to custom categories state
    if (isCapexTab) {
      setCustomCapexCategories([...customCapexCategories, trimmedName]);
    } else {
      setCustomOpexCategories([...customOpexCategories, trimmedName]);
    }

    // Just create the category - don't open modal to add item
    setNewCategoryName('');
    setShowAddCategoryForm(false);
  };

  const handleDeleteCategory = (category: string) => {
    const itemsInCategory = getCategoryItems(category);
    if (itemsInCategory.length > 0) {
      showAlert('Cannot Delete', `Cannot delete category "${category}" because it contains ${itemsInCategory.length} item(s)`);
      return;
    }

    // Remove category from custom categories state
    if (isCapexTab) {
      setCustomCapexCategories(customCapexCategories.filter(cat => cat !== category));
    } else {
      setCustomOpexCategories(customOpexCategories.filter(cat => cat !== category));
    }
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

  const handleAddItem = (newItem: CostLineItem) => {
    // Auto-detect category from item name if it's a predefined item
    const detectedCategory = isCapexTab
      ? getCapexItemCategory(newItem.name)
      : getOpexItemCategory(newItem.name);

    // Use detected category if found, otherwise use the provided category
    const finalCategory = detectedCategory !== "Uncategorized" ? detectedCategory : newItem.category;

    setCurrentItems([...currentItems, { ...newItem, category: finalCategory }]);
  };

  const handleOpenAddModal = (category: string) => {
    setModalCategory(category);
    setIsModalOpen(true);
  };

  const handleDeleteItem = (itemToDelete: CostLineItem) => {
    // Use property-based comparison instead of reference equality
    const updatedItems = currentItems.filter(item => {
      // Compare all relevant properties to identify the item
      const isSameName = item.name === itemToDelete.name;
      const isSameAmount = item.amount === itemToDelete.amount;
      const isSameCategory = (item.category || 'Uncategorized') === (itemToDelete.category || 'Uncategorized');
      const isSameUnitPrice = (item.unit_price || 0) === (itemToDelete.unit_price || 0);
      const isSameQuantity = (item.quantity || 0) === (itemToDelete.quantity || 0);

      // Item matches if all properties match
      return !(isSameName && isSameAmount && isSameCategory && isSameUnitPrice && isSameQuantity);
    });
    setCurrentItems(updatedItems);
  };

  const handleUpdateItemMargin = (itemToUpdate: CostLineItem, newMargin: number | undefined) => {
    const updatedItems = currentItems.map(item => {
      // Find matching item using property comparison
      const isSameName = item.name === itemToUpdate.name;
      const isSameAmount = item.amount === itemToUpdate.amount;
      const isSameCategory = (item.category || 'Uncategorized') === (itemToUpdate.category || 'Uncategorized');
      const isSameUnitPrice = (item.unit_price || 0) === (itemToUpdate.unit_price || 0);
      const isSameQuantity = (item.quantity || 0) === (itemToUpdate.quantity || 0);

      if (isSameName && isSameAmount && isSameCategory && isSameUnitPrice && isSameQuantity) {
        return { ...item, margin_percent: newMargin };
      }
      return item;
    });
    setCurrentItems(updatedItems);
  };

  const handleUpdateItemQuantity = (itemToUpdate: CostLineItem, newQuantity: number) => {
    const updatedItems = currentItems.map(item => {
      // Find matching item using property comparison
      const isSameName = item.name === itemToUpdate.name;
      const isSameAmount = item.amount === itemToUpdate.amount;
      const isSameCategory = (item.category || 'Uncategorized') === (itemToUpdate.category || 'Uncategorized');
      const isSameUnitPrice = (item.unit_price || 0) === (itemToUpdate.unit_price || 0);
      const isSameQuantity = (item.quantity || 0) === (itemToUpdate.quantity || 0);

      if (isSameName && isSameAmount && isSameCategory && isSameUnitPrice && isSameQuantity) {
        // Recalculate amount based on new quantity
        const newAmount = (item.unit_price || 0) * newQuantity;
        return { ...item, quantity: newQuantity, amount: newAmount };
      }
      return item;
    });
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

    // Close modal and expand all categories
    setIsModalOpen(false);
    setCollapsedCategories(new Set());
  };

  const handleLoadTemplate = (template: CostTemplate) => {
    const loadTemplateAction = () => {
      // Load template data
      onCapexItemsChange(template.capex_items);
      onOpexItemsChange(template.opex_items);
      onGlobalMarginChange(template.global_margin);

      // Expand all categories
      setCollapsedCategories(new Set());

      showAlert('Success', `Template "${template.name}" loaded successfully!`);
    };

    // Confirm overwrite if items exist
    const hasItems = capexItems.length > 0 || opexItems.length > 0;
    if (hasItems) {
      showConfirm(
        'Confirm Load Template',
        'Loading this template will replace all current CAPEX/OPEX items. Continue?',
        loadTemplateAction,
        'primary'
      );
    } else {
      loadTemplateAction();
    }
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

          {/* 1. Global Margin Input (CAPEX only) */}
          {isCapexTab && (
            <div className="margin-controls" style={{
              marginTop: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--border-radius)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)'
            }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
                Global Margin (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={globalMargin}
                onChange={(e) => onGlobalMarginChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                style={{
                  width: '100px',
                  padding: '0.5rem',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius)',
                  fontSize: '0.875rem'
                }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Applied to all CAPEX items. Can be overridden per item.
              </span>
            </div>
          )}

          {/* 2. Template Manager */}
          <TemplateManager
            capexItems={capexItems}
            opexItems={opexItems}
            globalMargin={globalMargin}
            onLoadTemplate={handleLoadTemplate}
          />

          {/* 3. Add Category Button/Form */}
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
                            <div className="line-item-header" style={{ gridTemplateColumns: isCapexTab ? '2.5fr 1fr 0.7fr 0.8fr 1fr 0.8fr 1fr auto' : '3fr 1fr 1.5fr auto' }}>
                              <div>Item Name</div>
                              {isCapexTab ? (
                                <>
                                  <div>Price/Item (€)</div>
                                  <div>Qty</div>
                                  <div>Unit</div>
                                  <div>Subtotal (€)</div>
                                  <div>Margin %</div>
                                  <div>Total (€)</div>
                                </>
                              ) : (
                                <>
                                  <div>Unit</div>
                                  <div>Amount (€)</div>
                                </>
                              )}
                              <div>Action</div>
                            </div>
                            {categoryItems.map((item, index) => (
                              <div key={index} className="line-item" style={{ gridTemplateColumns: isCapexTab ? '2.5fr 1fr 0.7fr 0.8fr 1fr 0.8fr 1fr auto' : '3fr 1fr 1.5fr auto' }}>
                                <div className="line-item-name">{item.name}</div>
                                {isCapexTab ? (
                                  <>
                                    <div className="line-item-amount">{formatCurrency(item.unit_price || 0)}</div>
                                    <div className="line-item-quantity">
                                      <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={item.quantity || 0}
                                        onChange={(e) => handleUpdateItemQuantity(item, parseFloat(e.target.value) || 0)}
                                        className="quantity-input"
                                        style={{
                                          width: '100px',
                                          padding: '0.25rem',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: '4px',
                                          textAlign: 'right',
                                          fontSize: '0.8125rem'
                                        }}
                                      />
                                    </div>
                                    <div className="line-item-unit">{item.unit || '-'}</div>
                                    <div className="line-item-amount">{formatCurrency(item.amount)}</div>
                                    <div className="line-item-margin">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={item.margin_percent ?? globalMargin}
                                        onChange={(e) => {
                                          const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                          handleUpdateItemMargin(item, value);
                                        }}
                                        placeholder={`${globalMargin}%`}
                                        className="margin-input"
                                        style={{
                                          width: '65px',
                                          padding: '0.25rem',
                                          border: '1px solid var(--color-border)',
                                          borderRadius: '4px',
                                          textAlign: 'right',
                                          fontSize: '0.8125rem'
                                        }}
                                        title={item.margin_percent !== undefined ? "Custom margin (overrides global)" : "Using global margin"}
                                      />
                                    </div>
                                    <div className="line-item-amount" style={{ fontWeight: 600 }}>{formatCurrency(calculateItemTotal(item))}</div>
                                  </>
                                ) : (
                                  <>
                                    <div className="line-item-unit">{item.unit || '-'}</div>
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

                        {/* Add Item Button */}
                        <button
                          type="button"
                          className="add-item-to-category-btn"
                          onClick={() => handleOpenAddModal(category)}
                        >
                          + Add Item to {category}
                        </button>
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

          {/* 4. Add Example Data Button */}
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
              title={capacity <= 0 ? 'Please enter a valid capacity first' : `Generate example ${isCapexTab ? 'CapEx' : 'OpEx'} items based on system capacity`}
            >
              Add Example Data
            </button>
          </div>

          {/* Totals Section */}
          {isCapexTab ? (
            <div className="capex-totals" style={{
              marginTop: 'var(--spacing-lg)',
              padding: 'var(--spacing-md)',
              backgroundColor: 'var(--color-bg-secondary)',
              borderRadius: 'var(--border-radius)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  Total CAPEX (before margin):
                </span>
                <strong style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  {formatCurrency(capexTotals.beforeMargin)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600, color: '#059669' }}>
                  Total CAPEX (with margin):
                </span>
                <strong style={{ fontSize: '1.125rem', fontWeight: 600, color: '#059669' }}>
                  {formatCurrency(capexTotals.withMargin)}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  Effective Margin:
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                  {capexTotals.effectiveMargin.toFixed(2)}%
                </span>
              </div>
            </div>
          ) : (
            <>
              <div className="line-items-total">
                <span className="line-items-total-label">
                  Total OpEx (Year 1):
                </span>
                <span className="line-items-total-value">
                  {formatCurrency(totalOpex)}
                </span>
              </div>
              <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                Note: OpEx escalation rate is set in Economic Parameters and applied to all OpEx items.
              </div>
            </>
          )}

          {/* Add Item Modal */}
          <AddItemModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAdd={handleAddItem}
            category={modalCategory}
            isCapex={isCapexTab}
          />
        </div>
      )}

      {/* Modal for alerts and confirmations */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title={modalState.title}
        showCancel={modalState.type === 'confirm'}
        onConfirm={modalState.type === 'confirm' ? modalState.onConfirm : undefined}
        confirmButtonStyle={modalState.confirmButtonStyle}
      >
        {modalState.message}
      </Modal>
    </div>
  );
}
