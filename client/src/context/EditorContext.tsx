import React, { createContext, useContext, useState, ReactNode } from "react";

interface EditorContextProps {
  mode: "generate" | "edit";
  sourceImages: string[];          // data-URLs
  setMode: (m: "generate" | "edit") => void;
  setSourceImages: (arr: string[]) => void;
}

const EditorContext = createContext<EditorContextProps | undefined>(undefined);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"generate" | "edit">("generate");
  const [sourceImages, setSourceImages] = useState<string[]>([]);

  return (
    <EditorContext.Provider
      value={{
        mode,
        sourceImages,
        setMode,
        setSourceImages
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor(): EditorContextProps {
  const context = useContext(EditorContext);
  
  if (context === undefined) {
    throw new Error("useEditor must be used within an EditorProvider");
  }
  
  return context;
}