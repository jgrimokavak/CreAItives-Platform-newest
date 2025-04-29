import { FaUserCircle, FaImage } from "react-icons/fa";

export default function Header() {
  return (
    <header className="border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
            <FaImage className="text-white text-lg" />
          </div>
          <h1 className="text-xl font-semibold">AI Image Generator</h1>
        </div>
        <div>
          <button
            className="text-accent hover:text-foreground transition-colors"
            title="User Settings"
          >
            <FaUserCircle className="text-2xl" />
          </button>
        </div>
      </div>
    </header>
  );
}
