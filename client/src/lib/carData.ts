// Car data utilities

// Define the car data structure
export interface CarData {
  vehicle_id: string;
  make: string;
  model: string;
  body_style: string;
  trim: string;
}

// In-memory cache for CSV data with timestamp
let carDataCache: {
  data: CarData[] | null;
  timestamp: number;
  loading: boolean;
} = {
  data: null,
  timestamp: 0,
  loading: false
};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

// Google Sheets CSV URL
const GOOGLE_SHEETS_URL = 
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQc5Sd7xctNiRi0VSuBBW00QIyx-0bg_9bg6Ut4b-7gxsqLsxtKFxXFwrnYynzLnaOpGeandg1BckbA/pub?gid=0&single=true&output=csv";

// Function to fetch and parse the CSV data directly from Google Sheets
async function fetchCarDataFromSheets(): Promise<CarData[]> {
  try {
    // Add a cache-busting parameter to ensure we get fresh data
    const cacheBuster = new Date().getTime();
    const url = `${GOOGLE_SHEETS_URL}&_cb=${cacheBuster}`;
    
    // Fetch the CSV file
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV data: ${response.statusText}`);
    }
    
    // Get the CSV text
    const csvText = await response.text();
    
    // Parse the CSV data
    const rows = csvText.split('\n');
    
    // Create array of car data objects
    const carData: CarData[] = [];
    
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue; // Skip empty rows
      
      const values = rows[i].split(',');
      if (values.length >= 5) {
        carData.push({
          vehicle_id: values[0],
          make: values[1],
          model: values[2],
          body_style: values[3],
          trim: values[4].replace(/[\r\n]+$/, '') // Remove trailing newlines
        });
      }
    }
    
    return carData;
  } catch (error) {
    console.error("Error loading car data from Google Sheets:", error);
    throw error;
  }
}

// Load car data with smart caching (will refresh data if cache expired)
export async function loadCarData(forceRefresh = false): Promise<CarData[]> {
  const now = Date.now();
  const isCacheExpired = (now - carDataCache.timestamp) > CACHE_EXPIRATION;
  
  // Use cache if available and not expired, unless force refresh is requested
  if (carDataCache.data && !isCacheExpired && !forceRefresh) {
    console.log("Using cached car data");
    return carDataCache.data;
  }
  
  // Return cached data if currently loading to prevent multiple simultaneous requests
  if (carDataCache.loading && carDataCache.data) {
    console.log("Already loading car data, using cached data for now");
    return carDataCache.data;
  }
  
  try {
    carDataCache.loading = true;
    console.log("Fetching fresh car data from Google Sheets");
    
    const freshData = await fetchCarDataFromSheets();
    
    // Update cache
    carDataCache = {
      data: freshData,
      timestamp: now,
      loading: false
    };
    
    console.log(`Loaded ${freshData.length} car records from Google Sheets`);
    return freshData;
  } catch (error) {
    carDataCache.loading = false;
    
    // If cache exists but refresh failed, return cached data with a warning
    if (carDataCache.data) {
      console.warn("Failed to refresh car data, using cached data instead");
      return carDataCache.data;
    }
    
    throw error;
  }
}

// Get unique makes
export async function getCarMakes(): Promise<string[]> {
  const carData = await loadCarData();
  const makes = new Set<string>();
  
  carData.forEach(car => {
    if (car.make) {
      makes.add(car.make);
    }
  });
  
  return Array.from(makes).sort();
}

// Get models for a specific make
export async function getCarModels(make: string): Promise<string[]> {
  const carData = await loadCarData();
  const models = new Set<string>();
  
  carData.forEach(car => {
    if (car.make === make && car.model) {
      models.add(car.model);
    }
  });
  
  return Array.from(models).sort();
}

// Get body styles for a specific make and model
export async function getBodyStyles(make: string, model: string): Promise<string[]> {
  const carData = await loadCarData();
  const bodyStyles = new Set<string>();
  
  carData.forEach(car => {
    if (car.make === make && car.model === model && car.body_style) {
      bodyStyles.add(car.body_style);
    }
  });
  
  return Array.from(bodyStyles).sort();
}

// Get trims for a specific make, model, and body style
export async function getTrims(make: string, model: string, bodyStyle: string): Promise<string[]> {
  const carData = await loadCarData();
  const trims = new Set<string>();
  
  carData.forEach(car => {
    if (car.make === make && car.model === model && car.body_style === bodyStyle && car.trim) {
      trims.add(car.trim);
    }
  });
  
  return Array.from(trims).sort();
}

// Normalize body style (convert to consistent format)
export function normalizeBodyStyle(bodyStyle: string): string {
  const style = bodyStyle.toUpperCase();
  
  // Map similar body styles to a common format
  switch (style) {
    case 'SEDAN':
    case 'Sedan':
      return 'SEDAN';
    case 'HATCHBACK':
    case 'Hatchback':
      return 'HATCHBACK';
    default:
      return style;
  }
}