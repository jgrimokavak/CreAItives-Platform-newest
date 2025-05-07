import { 
  Image as ImageIcon, 
  Crop as CropIcon, 
  Square as SquareIcon, 
  Car as CarIcon, 
  Grid as GridIcon,
  Sparkles as SparklesIcon
} from "lucide-react";

const items = [
  { title: "Text-to-Image",     icon: ImageIcon,    desc: "3 powerful models" },
  { title: "Image Editing",     icon: CropIcon,     desc: "Erase, replace, remix" },
  { title: "Upscale",           icon: SquareIcon,   desc: "Sharper, larger output" },
  { title: "Car Generator",     icon: CarIcon,      desc: "Single & CSV batch" },
  { title: "Live Gallery",      icon: GridIcon,     desc: "Updates in real time" },
  { title: "AI Prompt Helper",  icon: SparklesIcon, desc: "Smart autocomplete & polish" },
];

export function Capabilities() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-800">
      <div className="container grid sm:grid-cols-3 gap-8">
        {items.map(({ title, icon: Icon, desc }) => (
          <div key={title} className="flex flex-col items-center text-center">
            <Icon className="h-10 w-10 text-indigo-600 mb-4" />
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}