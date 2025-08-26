import NodeCache from "node-cache";
import axios from "axios";
import Papa from "papaparse";
import cron from "node-cron";
import { ObjectStorageService } from "./objectStorage";

// Reduce cache time to 2 minutes and add last fetch timestamp
const cache = new NodeCache({ stdTTL: 120 });   // 2 min
let lastFetchTime: Date | null = null;

// Object storage service for persistent caching
const objectStorage = new ObjectStorageService();

type Row = { make:string; model:string; body_style:string; trim:string };
type ColorRow = { "Color List": string };

// Color Sheets configuration
const COLOR_SHEET_ID = "1ftpeFWjClvZINpJMxae1qrNRS1a7XPKAC0FUGizfgzs";
const COLOR_SHEET_GID = "1643991184";

// Setup initial car data load - no auto-refresh for performance optimization
export function setupCarDataAutoRefresh(): void {
  // Load data from object storage on startup (or fallback to Google Sheets if not found)
  loadCarData(false).catch(err => console.error("Initial car data load failed:", err));
  loadColorData(false).catch(err => console.error("Initial color data load failed:", err));
  
  // REMOVED: All automatic refresh schedules for performance optimization
  // Data will only be refreshed when "Refresh car data" button is clicked
  console.log('Car data system initialized - using object storage cache with manual refresh only');
}

// Helper function to get object storage paths
function getCarDataStoragePath(): string {
  const envPrefix = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  return `${envPrefix}/car-data/car-database.csv`;
}

function getColorDataStoragePath(): string {
  const envPrefix = process.env.REPLIT_DEPLOYMENT === '1' ? 'prod' : 'dev';
  return `${envPrefix}/car-data/color-database.csv`;
}

// Load car data from object storage first, fallback to Google Sheets only if not found
export async function loadCarData(forceRefresh: boolean = false): Promise<Row[]> {
  // Check in-memory cache first
  const cached = cache.get<Row[]>("carRows");
  if (cached && !forceRefresh) return cached;

  try {
    let csvText: string = "";
    let dataSource = "";

    if (forceRefresh) {
      // Force refresh: Fetch from Google Sheets and update object storage
      csvText = await fetchCarDataFromGoogleSheets();
      await storeCarDataInObjectStorage(csvText);
      dataSource = "Google Sheets (forced refresh)";
    } else {
      // Try to load from object storage first
      try {
        csvText = await loadCarDataFromObjectStorage();
        dataSource = "object storage (cached)";
      } catch (storageError) {
        // Fallback to Google Sheets if object storage fails
        console.log("Car data not found in object storage, fetching from Google Sheets...");
        csvText = await fetchCarDataFromGoogleSheets();
        await storeCarDataInObjectStorage(csvText);
        dataSource = "Google Sheets (object storage fallback)";
      }
    }

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
    console.log(`Car data loaded from ${dataSource}: ${rows.length} entries at ${lastFetchTime.toISOString()}`);
    return rows;
  } catch (error) {
    console.error("Error loading car data:", error);
    return cached || []; // Fall back to cached data if available on error
  }
}

// Fetch car data from Google Sheets
async function fetchCarDataFromGoogleSheets(): Promise<string> {
  if (!process.env.CAR_SHEET_CSV) {
    throw new Error("CAR_SHEET_CSV environment variable not set");
  }

  const response = await axios.get(process.env.CAR_SHEET_CSV, { 
    responseType: "text",
    params: { _t: Date.now() }
  });
  
  return response.data as string;
}

// Load car data from object storage
async function loadCarDataFromObjectStorage(): Promise<string> {
  const storagePath = getCarDataStoragePath();
  const dataBuffer = await objectStorage.downloadData(storagePath);
  return dataBuffer.toString('utf-8');
}

// Store car data in object storage
async function storeCarDataInObjectStorage(csvText: string): Promise<void> {
  const storagePath = getCarDataStoragePath();
  const dataBuffer = Buffer.from(csvText, 'utf-8');
  await objectStorage.uploadData(dataBuffer, storagePath);
  console.log(`Car data stored in object storage: ${storagePath}`);
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

// Color data loading with object storage caching
export async function loadColorData(forceRefresh: boolean = false): Promise<ColorRow[]> {
  const cached = cache.get<ColorRow[]>("colorRows");
  if (cached && !forceRefresh) return cached;

  try {
    let csvText: string = "";
    let dataSource = "";

    if (forceRefresh) {
      // Force refresh: Fetch from Google Sheets and update object storage
      csvText = await fetchColorDataFromGoogleSheets();
      await storeColorDataInObjectStorage(csvText);
      dataSource = "Google Sheets (forced refresh)";
    } else {
      // Try to load from object storage first
      try {
        csvText = await loadColorDataFromObjectStorage();
        dataSource = "object storage (cached)";
      } catch (storageError) {
        // Fallback to Google Sheets if object storage fails
        console.log("Color data not found in object storage, fetching from Google Sheets...");
        csvText = await fetchColorDataFromGoogleSheets();
        await storeColorDataInObjectStorage(csvText);
        dataSource = "Google Sheets (object storage fallback)";
      }
    }
    
    const parseResult = Papa.parse<ColorRow>(csvText, { 
      header: true, 
      skipEmptyLines: true 
    });
    
    if (parseResult.errors && parseResult.errors.length > 0) {
      console.warn("Color CSV parsing errors:", parseResult.errors);
    }
    
    const rows = parseResult.data || [];
    cache.set("colorRows", rows);
    console.log(`Color data loaded from ${dataSource}: ${rows.length} colors`);
    return rows;
  } catch (error) {
    console.error("Error loading color data:", error);
    return cached || [];
  }
}

// Fetch color data from Google Sheets
async function fetchColorDataFromGoogleSheets(): Promise<string> {
  const colorSheetUrl = `https://docs.google.com/spreadsheets/d/${COLOR_SHEET_ID}/export?format=csv&gid=${COLOR_SHEET_GID}`;
  
  const response = await axios.get(colorSheetUrl, { 
    responseType: "text",
    params: { _t: Date.now() }
  });
  
  return response.data as string;
}

// Load color data from object storage
async function loadColorDataFromObjectStorage(): Promise<string> {
  const storagePath = getColorDataStoragePath();
  const dataBuffer = await objectStorage.downloadData(storagePath);
  return dataBuffer.toString('utf-8');
}

// Store color data in object storage
async function storeColorDataInObjectStorage(csvText: string): Promise<void> {
  const storagePath = getColorDataStoragePath();
  const dataBuffer = Buffer.from(csvText, 'utf-8');
  await objectStorage.uploadData(dataBuffer, storagePath);
  console.log(`Color data stored in object storage: ${storagePath}`);
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