import { FaImage } from "react-icons/fa";
import { Link } from "wouter";
import { IoMdImages } from "react-icons/io";
import { MdDelete } from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Header() {
  return (
    <header className="border-b border-gray-200 sticky top-0 bg-background z-10">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/">
          <div className="flex items-center space-x-2 cursor-pointer">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <FaImage className="text-white text-lg" />
            </div>
            <h1 className="text-xl font-semibold">AI Image Generator</h1>
          </div>
        </Link>

        <div className="flex items-center space-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/gallery" className="flex items-center space-x-1">
                  <IoMdImages className="text-lg" />
                  <span className="hidden sm:inline">Gallery</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View saved images</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/trash" className="flex items-center space-x-1">
                  <MdDelete className="text-lg" />
                  <span className="hidden sm:inline">Trash</span>
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>View deleted images</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}
