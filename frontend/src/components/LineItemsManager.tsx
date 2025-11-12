import { useState } from 'react';
import type { CostLineItem } from '../types';
import { CapexAutocomplete } from './CapexAutocomplete';
import { OpexAutocomplete } from './OpexAutocomplete';
import '../styles/LineItems.css';

interface LineItemsManagerProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  capexItems: CostLineItem[];
  opexItems: CostLineItem[];
  onCapexItemsChange: (items: CostLineItem[]) => void;
  onOpexItemsChange: (items: CostLineItem[]) => void;
}

export function LineItemsManager({
  enabled,
  onToggle,
  capexItems,
  opexItems,
  onCapexItemsChange,
  onOpexItemsChange,
}: LineItemsManagerProps) {
  const [activeTab, setActiveTab] = useState<'capex' | 'opex'>('capex');
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');

  const isCapexTab = activeTab === 'capex';
  const currentItems = isCapexTab ? capexItems : opexItems;
  const setCurrentItems = isCapexTab ? onCapexItemsChange : onOpexItemsChange;

  const totalCapex = capexItems.reduce((sum, item) => sum + item.amount, 0);
  const totalOpex = opexItems.reduce((sum, item) => sum + item.amount, 0);

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      return;
    }

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
      };
    }

    setCurrentItems([...currentItems, newItem]);

    // Reset form
    setNewItemName('');
    setNewItemAmount('');
    setNewItemQuantity('');
  };

  const handleDeleteItem = (index: number) => {
    const updatedItems = currentItems.filter((_, i) => i !== index);
    setCurrentItems(updatedItems);
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
              className={`tab-button ${activeTab === 'capex' ? 'active' : ''}`}
              onClick={() => setActiveTab('capex')}
            >
              CapEx Items ({capexItems.length})
            </button>
            <button
              className={`tab-button ${activeTab === 'opex' ? 'active' : ''}`}
              onClick={() => setActiveTab('opex')}
            >
              OpEx Items ({opexItems.length})
            </button>
          </div>

          <div className="line-items-list">
            {currentItems.length > 0 ? (
              <>
                <div className="line-item-header">
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
                  <div></div>
                </div>
                {currentItems.map((item, index) => (
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
                      className="line-item-delete"
                      onClick={() => handleDeleteItem(index)}
                      title="Delete item"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </>
            ) : (
              <div className="line-items-empty">
                No {isCapexTab ? 'CapEx' : 'OpEx'} items added yet. Add your first item below.
              </div>
            )}
          </div>

          <div style={{ marginTop: 'var(--spacing-lg)', marginBottom: 'var(--spacing-sm)' }}>
            <div className="line-item-header" style={{ borderBottom: '1px solid var(--color-border)', gridTemplateColumns: isCapexTab ? '4fr 1.2fr 0.8fr 1.2fr auto' : '2fr 1.5fr auto' }}>
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
          </div>

          <div className="line-items-add-form" style={{ gridTemplateColumns: isCapexTab ? '4fr 1.2fr 0.8fr 1.2fr auto' : '2fr 1.5fr auto' }}>
            {isCapexTab ? (
              <CapexAutocomplete
                value={newItemName}
                onChange={setNewItemName}
                placeholder="Type to search or enter custom name"
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              />
            ) : (
              <OpexAutocomplete
                value={newItemName}
                onChange={setNewItemName}
                placeholder="Type to search or enter custom name"
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              />
            )}
            <input
              type="number"
              placeholder={isCapexTab ? 'Price per item' : 'Total amount'}
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              min="0"
              step={isCapexTab ? '100' : '1000'}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
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
                  onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
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
            <button
              className="line-items-add-button"
              onClick={handleAddItem}
              disabled={!newItemName.trim() || !newItemAmount || (isCapexTab && !newItemQuantity)}
            >
              Add Item
            </button>
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
