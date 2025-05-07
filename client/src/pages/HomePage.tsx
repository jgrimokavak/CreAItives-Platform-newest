export default function HomePage() {
  return (
    <section className="p-6 space-y-4">
      <h1 className="text-3xl font-semibold">Welcome to AIImageCraft</h1>
      <p className="text-muted-foreground">
        Use the sidebar to create images, manage your gallery, or upscale existing work.
      </p>
      <ul className="list-disc ml-6 space-y-1">
        <li>Start in <strong>Create</strong> to generate any prompt‑based image.</li>
        <li>Try <strong>Car Creation</strong> for automated vehicle renders.</li>
        <li>Browse outputs in <strong>Gallery</strong> or recover deleted items in <strong>Trash</strong>.</li>
      </ul>
    </section>
  );
}