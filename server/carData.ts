import NodeCache from "node-cache";
import axios from "axios";
import Papa from "papaparse";

const cache = new NodeCache({ stdTTL: 300 });   // 5 min

type Row = { make:string; model:string; body_style:string; trim:string };

export async function loadCarData(): Promise<Row[]> {
  const cached = cache.get<Row[]>("carRows");
  if (cached) return cached;

  const { data } = await axios.get(process.env.CAR_SHEET_CSV!, { responseType:"text" });
  const { data: rows } = Papa.parse<Row>(data, { header:true, skipEmptyLines:true });
  cache.set("carRows", rows as Row[]);
  return rows as Row[];
}

export async function listMakes() {
  const rows = await loadCarData();
  return [...new Set(rows.map(r=>r.make).filter(Boolean))].sort();
}

export async function listModels(make:string) {
  const rows = await loadCarData();
  return [...new Set(rows.filter(r=>r.make===make).map(r=>r.model).filter(Boolean))].sort();
}

export async function listBodyStyles(make:string, model:string) {
  const rows = await loadCarData();
  return [...new Set(rows.filter(r=>r.make===make && r.model===model).map(r=>r.body_style).filter(Boolean))];
}

export async function listTrims(make:string, model:string, body_style:string) {
  const rows = await loadCarData();
  return [...new Set(rows.filter(r=>r.make===make && r.model===model && r.body_style===body_style).map(r=>r.trim).filter(Boolean))];
}

export function flushCarCache() { cache.flushAll(); }