import NodeCache from "node-cache";
import axios from "axios";
import Papa from "papaparse";

const cache = new NodeCache({ stdTTL: 300 });   // 5 min

type Row = { make:string; model:string; body_style:string; trim:string };

export async function loadCarData(): Promise<Row[]> {
  const cached = cache.get<Row[]>("carRows");
  if (cached) return cached;

  try {
    if (!process.env.CAR_SHEET_CSV) {
      console.warn("CAR_SHEET_CSV environment variable not set");
      return [];
    }

    const response = await axios.get(process.env.CAR_SHEET_CSV, { responseType:"text" });
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
    return rows;
  } catch (error) {
    console.error("Error loading car data:", error);
    return [];
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
  rows.filter(r => r.make === make && r.model === model).forEach(r => {
    if (r.body_style) bodyStyleSet.add(r.body_style);
  });
  return Array.from(bodyStyleSet);
}

export async function listTrims(make:string, model:string, body_style:string): Promise<string[]> {
  const rows = await loadCarData();
  const trimSet = new Set<string>();
  rows.filter(r => r.make === make && r.model === model && r.body_style === body_style).forEach(r => {
    if (r.trim) trimSet.add(r.trim);
  });
  return Array.from(trimSet);
}

export function flushCarCache() { cache.flushAll(); }