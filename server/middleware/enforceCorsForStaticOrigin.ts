import cors from "cors";

const parseAllowed = (raw?: string) =>
  (raw ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

export function enforceCorsForStaticOrigin() {
  const allowed = parseAllowed(process.env.Allowed_Web_Origins);
  return cors({
    origin(origin, cb) {
      if (!origin) return cb(null, true); // health checks / server-to-server
      return allowed.includes(origin) ? cb(null, true) : cb(null, false);
    },
    credentials: true,
    methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allowedHeaders: ["Content-Type","Authorization"],
  });
}