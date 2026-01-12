import { CAPEX_FIELDS } from '../data/capexFields';
import { OPEX_FIELDS } from '../data/opexFields';

/**
 * Get the category for a given CAPEX item name
 * @param itemName The name of the CAPEX item
 * @returns The category name, or "Uncategorized" if not found
 */
export function getCapexItemCategory(itemName: string): string {
  for (const categoryObj of CAPEX_FIELDS) {
    if (categoryObj.fields.includes(itemName)) {
      return categoryObj.title;
    }
  }
  return "Uncategorized";
}

/**
 * Get the category for a given OPEX item name
 * @param itemName The name of the OPEX item
 * @returns The category name, or "Uncategorized" if not found
 */
export function getOpexItemCategory(itemName: string): string {
  for (const categoryObj of OPEX_FIELDS) {
    if (categoryObj.fields.includes(itemName)) {
      return categoryObj.title;
    }
  }
  return "Uncategorized";
}
