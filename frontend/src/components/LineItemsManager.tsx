import { useState } from 'react';
import type { CostLineItem } from '../types';
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
  const [newItemEscalation, setNewItemEscalation] = useState('0.01');

  const isCapexTab = activeTab === 'capex';
  const currentItems = isCapexTab ? capexItems : opexItems;
  const setCurrentItems = isCapexTab ? onCapexItemsChange : onOpexItemsChange;

  const totalCapex = capexItems.reduce((sum, item) => sum + item.amount, 0);
  const totalOpex = opexItems.reduce((sum, item) => sum + item.amount, 0);

  const handleAddItem = () => {
    const amount = parseFloat(newItemAmount);
    if (!newItemName.trim() || isNaN(amount) || amount <= 0) {
      return;
    }

    const newItem: CostLineItem = {
      name: newItemName.trim(),
      amount,
      is_capex: isCapexTab,
      escalation_rate: isCapexTab ? 0 : parseFloat(newItemEscalation),
    };

    setCurrentItems([...currentItems, newItem]);

    // Reset form
    setNewItemName('');
    setNewItemAmount('');
    setNewItemEscalation('0.01');
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

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
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
                  <div>Amount (€)</div>
                  <div>{isCapexTab ? '' : 'Escalation'}</div>
                  <div></div>
                </div>
                {currentItems.map((item, index) => (
                  <div key={index} className="line-item">
                    <div className="line-item-name">{item.name}</div>
                    <div className="line-item-amount">{formatCurrency(item.amount)}</div>
                    <div className="line-item-escalation">
                      {!isCapexTab && item.escalation_rate !== 0 ? (
                        <span className="escalation-badge">
                          {formatPercent(item.escalation_rate)}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
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
            <div className="line-item-header" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>Item Name</div>
              <div>Amount (€)</div>
              <div>{isCapexTab ? 'Escalation (N/A)' : 'Escalation (%/year)'}</div>
              <div>Action</div>
            </div>
          </div>

          <div className="line-items-add-form">
            <input
              type="text"
              placeholder={`${isCapexTab ? 'CapEx' : 'OpEx'} item name (e.g., Solar panels, Maintenance)`}
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <input
              type="number"
              placeholder="Amount (€)"
              value={newItemAmount}
              onChange={(e) => setNewItemAmount(e.target.value)}
              min="0"
              step="1000"
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <input
              type="number"
              placeholder={isCapexTab ? 'N/A' : '0.01'}
              value={newItemEscalation}
              onChange={(e) => setNewItemEscalation(e.target.value)}
              min="-0.1"
              max="0.2"
              step="0.01"
              disabled={isCapexTab}
              className={isCapexTab ? 'opex-only' : ''}
              onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
              title={isCapexTab ? 'CapEx items do not escalate (one-time cost)' : 'Annual escalation rate (e.g., 0.01 = 1%)'}
            />
            <button
              className="line-items-add-button"
              onClick={handleAddItem}
              disabled={!newItemName.trim() || !newItemAmount}
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
              Note: OpEx escalation is applied annually. Year 1 amount shown above.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
