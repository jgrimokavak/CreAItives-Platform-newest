import Papa from 'papaparse';

// CSV URLs from the requirements
const GLOBAL_PROMPTS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb-bDvaNqOTOJXonaHf_VfzGZSW8BraE_tGoFAsJortqGRG6UVyA7MoxdN8Muvap_BrprDBT8n4V2B/pub?gid=1909445017&single=true&output=csv';
const ANGLE_PRESETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb-bDvaNqOTOJXonaHf_VfzGZSW8BraE_tGoFAsJortqGRG6UVyA7MoxdN8Muvap_BrprDBT8n4V2B/pub?gid=375187395&single=true&output=csv';
const COLOR_PRESETS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQb-bDvaNqOTOJXonaHf_VfzGZSW8BraE_tGoFAsJortqGRG6UVyA7MoxdN8Muvap_BrprDBT8n4V2B/pub?gid=41565075&single=true&output=csv';

export interface GlobalPrompt {
  angle_generation?: string | boolean;
  colorization?: string | boolean;
  prompt_template: string;
  variables?: string;
}

export interface AnglePreset {
  angle_key: string;
  angle_label: string;
  angle_desc: string;
  order: number;
  enabled: boolean;
}

export interface ColorPreset {
  color_key: string;
  color_label: string;
  prompt_value: string;
  enabled: boolean;
}

// Cache for parsed data
let globalPromptsCache: GlobalPrompt[] | null = null;
let anglePresetsCache: AnglePreset[] | null = null;
let colorPresetsCache: ColorPreset[] | null = null;

// Helper function to fetch and parse CSV
async function fetchCSV<T>(url: string): Promise<T[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }
    
    const csvText = await response.text();
    const parseResult = Papa.parse<T>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim()
    });
    
    if (parseResult.errors.length > 0) {
      console.warn('CSV parsing errors:', parseResult.errors);
    }
    
    return parseResult.data || [];
  } catch (error) {
    console.error(`Error fetching CSV from ${url}:`, error);
    return [];
  }
}

export async function loadGlobalPrompts(): Promise<GlobalPrompt[]> {
  if (globalPromptsCache) {
    return globalPromptsCache;
  }
  
  try {
    globalPromptsCache = await fetchCSV<GlobalPrompt>(GLOBAL_PROMPTS_URL);
    console.log(`Loaded ${globalPromptsCache.length} global prompts`);
    return globalPromptsCache;
  } catch (error) {
    console.error('Error loading global prompts:', error);
    return [];
  }
}

export async function loadAnglePresets(): Promise<AnglePreset[]> {
  if (anglePresetsCache) {
    return anglePresetsCache;
  }
  
  try {
    const rawData = await fetchCSV<any>(ANGLE_PRESETS_URL);
    anglePresetsCache = rawData
      .filter((row: any) => row.enabled === 'TRUE' || row.enabled === true)
      .map((row: any) => ({
        angle_key: row.angle_key || '',
        angle_label: row.angle_label || '',
        angle_desc: row.angle_desc || '',
        order: parseInt(row.order) || 0,
        enabled: true
      }))
      .sort((a, b) => a.order - b.order);
    
    console.log(`Loaded ${anglePresetsCache.length} angle presets`);
    return anglePresetsCache;
  } catch (error) {
    console.error('Error loading angle presets:', error);
    return [];
  }
}

export async function loadColorPresets(): Promise<ColorPreset[]> {
  if (colorPresetsCache) {
    return colorPresetsCache;
  }
  
  try {
    const rawData = await fetchCSV<any>(COLOR_PRESETS_URL);
    colorPresetsCache = rawData
      .filter((row: any) => row.enabled === 'TRUE' || row.enabled === true)
      .map((row: any) => ({
        color_key: row.color_key || '',
        color_label: row.color_label || '',
        prompt_value: row.prompt_value || '',
        enabled: true
      }));
    
    console.log(`Loaded ${colorPresetsCache.length} color presets`);
    return colorPresetsCache;
  } catch (error) {
    console.error('Error loading color presets:', error);
    return [];
  }
}

// Helper functions to get specific prompt templates
export async function getAngleGenerationPrompt(): Promise<string> {
  const prompts = await loadGlobalPrompts();
  const anglePrompt = prompts.find(p => p.angle_generation === 'TRUE' || p.angle_generation === 'true' || p.angle_generation === true);
  return anglePrompt?.prompt_template || '';
}

export async function getColorizationPrompt(): Promise<string> {
  const prompts = await loadGlobalPrompts();
  const colorPrompt = prompts.find(p => p.colorization === 'TRUE' || p.colorization === 'true' || p.colorization === true);
  return colorPrompt?.prompt_template || '';
}

// Clear cache function for refreshing data
export function clearMarketplaceCache(): void {
  globalPromptsCache = null;
  anglePresetsCache = null;
  colorPresetsCache = null;
}