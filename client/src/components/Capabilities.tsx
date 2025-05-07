import { 
  Image as ImageIcon, 
  Crop as CropIcon, 
  Square as SquareIcon, 
  Car as CarIcon, 
  Grid as GridIcon,
  Sparkles as SparklesIcon
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface CapabilityCardProps {
  title: string;
  icon: React.ElementType;
  description: string;
  link: string;
  gradient: string;
}

const items: CapabilityCardProps[] = [
  { 
    title: "Text-to-Image", 
    icon: ImageIcon, 
    description: "Transform your ideas into stunning images with 3 powerful AI models", 
    link: "/create",
    gradient: "from-rose-500 to-orange-500"
  },
  { 
    title: "Image Editing", 
    icon: CropIcon, 
    description: "Erase, replace, and remix existing images with precision", 
    link: "/create",
    gradient: "from-blue-500 to-cyan-500"
  },
  { 
    title: "Upscale", 
    icon: SquareIcon, 
    description: "Enhance resolution and quality for sharper, larger outputs", 
    link: "/upscale",
    gradient: "from-violet-500 to-purple-500"
  },
  { 
    title: "Car Generator", 
    icon: CarIcon, 
    description: "Create realistic car renders with single requests or CSV batches", 
    link: "/car",
    gradient: "from-green-500 to-emerald-500"
  },
  { 
    title: "Live Gallery", 
    icon: GridIcon, 
    description: "Browse and manage your creations with real-time updates", 
    link: "/gallery",
    gradient: "from-amber-500 to-yellow-500"
  },
  { 
    title: "AI Prompt Helper", 
    icon: SparklesIcon, 
    description: "Smart autocomplete and prompt polish to perfect your ideas", 
    link: "/create",
    gradient: "from-pink-500 to-rose-500"
  },
];

function CapabilityCard({ title, icon: Icon, description, link, gradient }: CapabilityCardProps) {
  return (
    <Link to={link}>
      <div className="group relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border border-transparent hover:border-primary/20">
        <div className="p-6">
          <div className={cn(
            "absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br",
            gradient
          )} />
          
          <div className="relative">
            <div className={cn(
              "w-12 h-12 mb-4 rounded-full flex items-center justify-center bg-gradient-to-br text-white",
              gradient
            )}>
              <Icon className="h-6 w-6" />
            </div>
            
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function Capabilities() {
  return (
    <section className="py-16 bg-slate-50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
      <div className="container px-4 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Platform Capabilities</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Explore the powerful features of our AI image generation platform
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <CapabilityCard key={item.title} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
}