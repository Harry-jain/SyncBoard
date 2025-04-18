import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Trash } from "lucide-react";

interface OneNoteEditorProps {
  document: any;
}

export default function OneNoteEditor({ document }: OneNoteEditorProps) {
  const [sections, setSections] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState(0);
  const editorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (document) {
      setSections(document.sections || []);
      
      if (editorRef.current && document.sections && document.sections[activeSection]) {
        editorRef.current.innerHTML = document.sections[activeSection];
        editorRef.current.focus();
      }
    }
  }, [document, activeSection]);
  
  const handleInput = () => {
    if (editorRef.current) {
      // In a real app, this would save the document section content
      const newSections = [...sections];
      newSections[activeSection] = editorRef.current.innerHTML;
      setSections(newSections);
    }
  };
  
  const addSection = () => {
    const newSections = [...sections, "<p>New section</p>"];
    setSections(newSections);
    setActiveSection(newSections.length - 1);
  };
  
  const deleteSection = (index: number) => {
    if (sections.length <= 1) return;
    
    const newSections = sections.filter((_, i) => i !== index);
    setSections(newSections);
    
    if (activeSection >= newSections.length) {
      setActiveSection(newSections.length - 1);
    }
  };
  
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sections Sidebar */}
      <div className="w-56 bg-neutral-100 border-r border-neutral-200 overflow-y-auto p-2">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-sm">Sections</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0" 
            onClick={addSection}
          >
            <span className="material-icons text-neutral-600 text-sm">add</span>
          </Button>
        </div>
        
        {sections.map((section, index) => {
          const titleMatch = section.match(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/);
          const title = titleMatch ? titleMatch[1] : `Section ${index + 1}`;
          
          return (
            <div 
              key={index} 
              className={`p-2 mb-1 rounded cursor-pointer flex justify-between items-center ${
                index === activeSection ? "bg-primary bg-opacity-10" : "hover:bg-neutral-200"
              }`}
              onClick={() => setActiveSection(index)}
            >
              <span className="text-sm truncate">{title}</span>
              {sections.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSection(index);
                  }}
                >
                  <Trash className="h-3 w-3 text-neutral-500" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Main Editing Area */}
      <div className="flex-1 bg-white p-4 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <div 
            ref={editorRef}
            className="focus:outline-none prose prose-sm max-w-none min-h-[600px]" 
            contentEditable={true}
            onInput={handleInput}
            suppressContentEditableWarning={true}
          ></div>
        </div>
      </div>
    </div>
  );
}
