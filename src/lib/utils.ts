import { Product } from '../types';

/**
 * Dynamically extracts 1-2 highlight badges based on the farmer's product description.
 * This satisfies the "short info about the product based on what the farmer put in their product descriptions" request.
 */
export function getProductHighlights(description: string, category: string): string[] {
  if (!description) {
    // Elegant fallbacks based on category if there is no description
    if (category === 'Vegetables') return ['Freshly Harvested', 'Local Farm Direct'];
    if (category === 'Fruits') return ['Sweet & Vine-Ripened', 'Rich in Vitamins'];
    if (category === 'Root Crops') return ['Freshly Dug', 'Pesticide-Free'];
    if (category === 'Herbs & Spices') return ['Aromatic', 'Strong Flavor'];
    if (category === 'Grains') return ['Wholesome Grains', 'Natural Crop'];
    return ['Organic Grown', 'Local Direct'];
  }
  
  const descLower = description.toLowerCase();
  const highlights: string[] = [];
  
  // Custom keyword mappings
  if (descLower.includes('organic') || descLower.includes('natural') || descLower.includes('libres') || descLower.includes('sustainable')) {
    highlights.push('🍃 All-Natural');
  }
  if (descLower.includes('pesticide') || descLower.includes('chemical') || descLower.includes('pure')) {
    highlights.push('🛡️ Chemical-Free');
  }
  if (descLower.includes('sweet') || descLower.includes('sugar') || descLower.includes('honey')) {
    highlights.push('🍯 Sweet & Rich');
  }
  if (descLower.includes('fresh') || descLower.includes('harvest') || descLower.includes('today')) {
    highlights.push('✨ Freshly Picked');
  }
  if (descLower.includes('crisp') || descLower.includes('crunchy') || descLower.includes('firm')) {
    highlights.push('⚡ Crisp Texture');
  }
  if (descLower.includes('raw') || descLower.includes('unprocessed') || descLower.includes('whole')) {
    highlights.push('🌾 Pure & Raw');
  }
  if (descLower.includes('premium') || descLower.includes('best') || descLower.includes('high quality') || descLower.includes('select')) {
    highlights.push('⭐ Premium Grade');
  }
  if (descLower.includes('healthy') || descLower.includes('diet') || descLower.includes('nutrient') || descLower.includes('vitamin')) {
    highlights.push('💪 Nutrient-Rich');
  }
  if (descLower.includes('juicy') || descLower.includes('watery')) {
    highlights.push('💦 Juicy & Sweet');
  }
  if (descLower.includes('local') || descLower.includes('backyard') || descLower.includes('community')) {
    highlights.push('🚜 Local Direct');
  }

  // Fallbacks if no keywords matched
  if (highlights.length === 0) {
    if (category === 'Vegetables') highlights.push('🥦 High Fiber', '🚜 Farm Fresh');
    else if (category === 'Fruits') highlights.push('🍎 Vine Ripened', '🍊 Vitamin C');
    else if (category === 'Root Crops') highlights.push('🥔 Earth-Grown', '🍠 High Energy');
    else if (category === 'Herbs & Spices') highlights.push('🌿 Rich Aroma', '🌶️ Bold Tastes');
    else if (category === 'Grains') highlights.push('🌾 Home Grown', '🥣 Pantry Essential');
    else highlights.push('🌱 Fresh Pick', '🚜 Direct Sourced');
  }
  
  return highlights.slice(0, 2); // Return top 2 matching highlights
}
