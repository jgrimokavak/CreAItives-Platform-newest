// Car data utilities

// Define the car data structure
export interface CarData {
  vehicle_id: string;
  make: string;
  model: string;
  body_style: string;
  trim: string;
}

// In-memory cache for CSV data
let cachedCarData: CarData[] | null = null;

// Function to load and parse the CSV data
export async function loadCarData(): Promise<CarData[]> {
  // Return cached data if available
  if (cachedCarData) {
    return cachedCarData;
  }

  try {
    // Fetch the CSV file
    const response = await fetch(
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vQc5Sd7xctNiRi0VSuBBW00QIyx-0bg_9bg6Ut4b-7gxsqLsxtKFxXFwrnYynzLnaOpGeandg1BckbA/pub?gid=0&single=true&output=csv"
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV data: ${response.statusText}`);
    }
    
    // Get the CSV text
    const csvText = await response.text();
    
    // Parse the CSV data
    const rows = csvText.split('\n');
    const headers = rows[0].split(',');
    
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
    
    // Cache the data
    cachedCarData = carData;
    return carData;
  } catch (error) {
    console.error("Error loading car data:", error);
    return [];
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