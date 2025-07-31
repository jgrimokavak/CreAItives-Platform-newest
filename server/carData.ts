import NodeCache from "node-cache";
import axios from "axios";
import Papa from "papaparse";
import cron from "node-cron";

// Reduce cache time to 2 minutes and add last fetch timestamp
const cache = new NodeCache({ stdTTL: 120 });   // 2 min
let lastFetchTime: Date | null = null;

type Row = { make:string; model:string; body_style:string; trim:string };
type ColorRow = { "Color List": string };

// Color Sheets configuration
const COLOR_SHEET_ID = "1ftpeFWjClvZINpJMxae1qrNRS1a7XPKAC0FUGizfgzs";
const COLOR_SHEET_GID = "1643991184";

// Setup auto-refresh of car data and colors every 5 minutes
export function setupCarDataAutoRefresh(): void {
  // Immediately fetch the data once
  loadCarData(true).catch(err => console.error("Initial car data load failed:", err));
  loadColorData(true).catch(err => console.error("Initial color data load failed:", err));
  
  // Schedule refresh every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Auto-refreshing car data from Google Sheets...');
    try {
      await loadCarData(true);
      await loadColorData(true);
      console.log('Car data refreshed successfully at', new Date().toISOString());
    } catch (error) {
      console.error('Error during scheduled car data refresh:', error);
    }
  });
}

export async function loadCarData(forceRefresh: boolean = false): Promise<Row[]> {
  // Only use cache if not forcing refresh
  const cached = cache.get<Row[]>("carRows");
  if (cached && !forceRefresh) return cached;

  try {
    if (!process.env.CAR_SHEET_CSV) {
      console.warn("CAR_SHEET_CSV environment variable not set");
      return [];
    }

    console.log(`Fetching car data from ${forceRefresh ? 'source (forced refresh)' : 'source (cache expired)'}`);
    const response = await axios.get(process.env.CAR_SHEET_CSV, { 
      responseType:"text",
      // Add cache busting parameter to avoid browser/CDN caching
      params: { _t: Date.now() }
    });
    
    const csvText = response.data as string;
    
    const parseResult = Papa.parse<Row>(csvText, { 
      header: true, 
      skipEmptyLines: true 
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn("CSV parsing errors:", parseResult.errors);
    }
    
    const rows = parseResult.data || [];
    cache.set("carRows", rows);
    lastFetchTime = new Date();
    console.log(`Car data refreshed: ${rows.length} entries loaded at ${lastFetchTime.toISOString()}`);
    return rows;
  } catch (error) {
    console.error("Error loading car data:", error);
    return cached || []; // Fall back to cached data if available on error
  }
}

export async function listMakes(): Promise<string[]> {
  const rows = await loadCarData();
  const makeSet = new Set<string>();
  rows.forEach(r => {
    if (r.make) makeSet.add(r.make);
  });
  return Array.from(makeSet).sort();
}

export async function listModels(make:string): Promise<string[]> {
  const rows = await loadCarData();
  const modelSet = new Set<string>();
  rows.filter(r => r.make === make).forEach(r => {
    if (r.model) modelSet.add(r.model);
  });
  return Array.from(modelSet).sort();
}

export async function listBodyStyles(make:string, model:string): Promise<string[]> {
  const rows = await loadCarData();
  const bodyStyleSet = new Set<string>();
  let hasEmptyBodyStyle = false;
  
  rows.filter(r => r.make === make && r.model === model).forEach(r => {
    if (r.body_style && r.body_style.trim()) {
      bodyStyleSet.add(r.body_style);
    } else {
      hasEmptyBodyStyle = true;
    }
  });
  
  const result = Array.from(bodyStyleSet).sort();
  
  // Add "None" at the beginning if there are cars with empty body_style
  if (hasEmptyBodyStyle) {
    result.unshift("None");
  }
  
  return result;
}

export async function listTrims(make:string, model:string, body_style:string): Promise<string[]> {
  const rows = await loadCarData();
  const trimSet = new Set<string>();
  let hasEmptyTrim = false;
  
  // Handle "None" body_style as filter for empty body_style values
  const bodyStyleFilter = body_style === "None" ? "" : body_style;
  
  rows.filter(r => {
    const matchesMake = r.make === make;
    const matchesModel = r.model === model;
    const matchesBodyStyle = body_style === "None" 
      ? (!r.body_style || !r.body_style.trim()) 
      : r.body_style === body_style;
    
    return matchesMake && matchesModel && matchesBodyStyle;
  }).forEach(r => {
    if (r.trim && r.trim.trim()) {
      trimSet.add(r.trim);
    } else {
      hasEmptyTrim = true;
    }
  });
  
  const result = Array.from(trimSet).sort();
  
  // Add "None" at the beginning if there are cars with empty trim
  if (hasEmptyTrim) {
    result.unshift("None");
  }
  
  return result;
}

// Color data loading
export async function loadColorData(forceRefresh: boolean = false): Promise<ColorRow[]> {
  const cached = cache.get<ColorRow[]>("colorRows");
  if (cached && !forceRefresh) return cached;

  try {
    // Build CSV export URL for Google Sheets with specific gid
    const colorSheetUrl = `https://docs.google.com/spreadsheets/d/${COLOR_SHEET_ID}/export?format=csv&gid=${COLOR_SHEET_GID}`;
    
    console.log(`Fetching color data from ${forceRefresh ? 'source (forced refresh)' : 'source (cache expired)'}`);
    const response = await axios.get(colorSheetUrl, { 
      responseType: "text",
      params: { _t: Date.now() }
    });
    
    const csvText = response.data as string;
    
    const parseResult = Papa.parse<ColorRow>(csvText, { 
      header: true, 
      skipEmptyLines: true 
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn("Color CSV parsing errors:", parseResult.errors);
    }
    
    const rows = parseResult.data || [];
    cache.set("colorRows", rows);
    console.log(`Color data refreshed: ${rows.length} colors loaded`);
    return rows;
  } catch (error) {
    console.error("Error loading color data:", error);
    return cached || [];
  }
}

export async function listColors(): Promise<string[]> {
  const rows = await loadColorData();
  const colors: string[] = [];
  rows.forEach(r => {
    const colorValue = r["Color List"];
    if (colorValue && colorValue.trim()) {
      colors.push(colorValue.trim());
    }
  });
  // Return colors in the order they appear in the sheet (maintaining color wheel order)
  return colors;
}

export function flushCarCache() { 
  cache.flushAll(); 
  console.log('Car data and color cache flushed, will be fetched fresh on next request');
}

export function getLastFetchTime(): Date | null {
  return lastFetchTime;
}