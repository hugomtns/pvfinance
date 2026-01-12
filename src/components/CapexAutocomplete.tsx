import { useState, useRef, useEffect } from 'react';
import { CAPEX_FIELDS } from '../data/capexFields';
import '../styles/Autocomplete.css';

interface CapexAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyPress?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function CapexAutocomplete({ value, onChange, placeholder, onKeyPress }: CapexAutocompleteProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter fields based on search term (case-insensitive)
  const searchTerm = value.toLowerCase();
  const filteredResults = CAPEX_FIELDS.map(category => ({
    title: category.title,
    fields: category.fields.filter(field =>
      field.toLowerCase().includes(searchTerm)
    ),
  })).filter(category => category.fields.length > 0);

  // Flatten filtered fields for keyboard navigation
  const selectableFields = filteredResults.flatMap(category => category.fields);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setShowDropdown(true);
    setHighlightedIndex(-1);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleFieldSelect = (field: string) => {
    onChange(field);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || selectableFields.length === 0) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < selectableFields.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev > 0 ? prev - 1 : selectableFields.length - 1
        );
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < selectableFields.length) {
          e.preventDefault();
          handleFieldSelect(selectableFields[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Get the current highlighted field's index within its category
  let currentSelectableIndex = -1;

  return (
    <div className="autocomplete-container">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        onKeyPress={onKeyPress}
        placeholder={placeholder || "Type to search or enter custom name"}
        autoComplete="off"
      />

      {showDropdown && (filteredResults.length > 0 || searchTerm) && (
        <div ref={dropdownRef} className="autocomplete-dropdown">
          {filteredResults.length > 0 ? (
            filteredResults.map((category, catIndex) => (
              <div key={catIndex} className="autocomplete-category">
                <div className="autocomplete-category-title">{category.title}</div>
                {category.fields.map((field, fieldIndex) => {
                  currentSelectableIndex++;
                  const isHighlighted = currentSelectableIndex === highlightedIndex;
                  return (
                    <div
                      key={fieldIndex}
                      className={`autocomplete-item ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={() => handleFieldSelect(field)}
                      onMouseEnter={() => setHighlightedIndex(currentSelectableIndex)}
                    >
                      {field}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="autocomplete-no-results">
              No matching fields. Press Enter to use "{value}" as custom name.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
