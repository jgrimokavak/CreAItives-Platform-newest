import { Capabilities } from "@/components/Capabilities";

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="p-8 space-y-4 bg-white dark:bg-slate-900">
        <h1 className="text-4xl font-bold">CreAItives Platform 2.0</h1>
        <p className="text-muted-foreground text-lg max-w-2xl">
          Use the sidebar to create images, manage your gallery, or upscale existing work.
        </p>
        <ul className="list-disc ml-6 space-y-2 mt-4">
          <li>Start in <strong>Create</strong> to generate any prompt‑based image.</li>
          <li>Try <strong>Car Creation</strong> for automated vehicle renders.</li>
          <li>Browse outputs in <strong>Gallery</strong> or recover deleted items in <strong>Trash</strong>.</li>
        </ul>
      </section>
      
      {/* Capabilities Grid */}
      <Capabilities />
    </div>
  );
}