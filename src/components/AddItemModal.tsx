import { useState, useEffect } from 'react';
import type { CostLineItem } from '../types';
import { CapexAutocomplete } from './CapexAutocomplete';
import { OpexAutocomplete } from './OpexAutocomplete';
import '../styles/Modal.css';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: CostLineItem) => void;
  category: string;
  isCapex: boolean;
}

export function AddItemModal({ isOpen, onClose, onAdd, category, isCapex }: AddItemModalProps) {
  const [newItemName, setNewItemName] = useState('');
  const [newItemAmount, setNewItemAmount] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewItemName('');
      setNewItemAmount('');
      setNewItemQuantity('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!newItemName.trim()) {
      return;
    }

    let newItem: CostLineItem;

    if (isCapex) {
      const unitPrice = parseFloat(newItemAmount);
      const quantity = parseFloat(newItemQuantity);

      if (isNaN(unitPrice) || unitPrice <= 0 || isNaN(quantity) || quantity <= 0) {
        return;
      }

      newItem = {
        name: newItemName.trim(),
        amount: unitPrice * quantity,
        is_capex: true,
        category: category,
        unit_price: unitPrice,
        quantity: quantity,
      };
    } else {
      const amount = parseFloat(newItemAmount);

      if (isNaN(amount) || amount <= 0) {
        return;
      }

      newItem = {
        name: newItemName.trim(),
        amount,
        is_capex: false,
        category: category,
      };
    }

    onAdd(newItem);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Item to {category}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="modal-form-group">
            <label>Item Name</label>
            {isCapex ? (
              <CapexAutocomplete
                value={newItemName}
                onChange={setNewItemName}
                placeholder="Type to search or enter custom name"
                onKeyPress={handleKeyPress}
              />
            ) : (
              <OpexAutocomplete
                value={newItemName}
                onChange={setNewItemName}
                placeholder="Type to search or enter custom name"
                onKeyPress={handleKeyPress}
              />
            )}
          </div>

          {isCapex ? (
            <>
              <div className="modal-form-group">
                <label>Price per Item (€)</label>
                <input
                  type="number"
                  placeholder="Enter price per item"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value)}
                  onKeyPress={handleKeyPress}
                  min="0"
                  step="100"
                />
              </div>

              <div className="modal-form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  value={newItemQuantity}
                  onChange={(e) => setNewItemQuantity(e.target.value)}
                  onKeyPress={handleKeyPress}
                  min="0"
                  step="1"
                />
              </div>

              <div className="modal-total">
                <span>Total:</span>
                <strong>
                  {newItemAmount && newItemQuantity
                    ? formatCurrency(parseFloat(newItemAmount) * parseFloat(newItemQuantity))
                    : '€0'}
                </strong>
              </div>
            </>
          ) : (
            <div className="modal-form-group">
              <label>Amount (€)</label>
              <input
                type="number"
                placeholder="Enter total amount"
                value={newItemAmount}
                onChange={(e) => setNewItemAmount(e.target.value)}
                onKeyPress={handleKeyPress}
                min="0"
                step="1000"
              />
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="modal-button modal-button-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="modal-button modal-button-primary"
            onClick={handleSubmit}
            disabled={!newItemName.trim() || !newItemAmount || (isCapex && !newItemQuantity)}
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
}
