export default function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="mb-6 relative h-16 w-16 mx-auto">
        <div className="absolute inset-0 border-4 border-primary/30 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
      </div>
      <h3 className="text-xl font-medium mb-2">Creating your images...</h3>
      <p className="text-accent">This may take up to 30 seconds</p>
    </div>
  );
}
