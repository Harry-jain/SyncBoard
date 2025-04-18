import { useEffect, useRef } from "react";

interface WordEditorProps {
  document: any;
}

export default function WordEditor({ document }: WordEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = document.content;
      editorRef.current.focus();
    }
  }, [document]);
  
  const handleInput = () => {
    // In a real app, this would save the document content
    console.log("Document content changed:", editorRef.current?.innerHTML);
  };
  
  return (
    <div className="flex-1 bg-neutral-200 p-4 flex items-center justify-center overflow-auto">
      <div className="bg-white shadow-lg w-full max-w-3xl min-h-[600px] rounded p-8">
        <div 
          ref={editorRef}
          className="focus:outline-none prose prose-sm max-w-none min-h-[600px]" 
          contentEditable={true}
          onInput={handleInput}
          suppressContentEditableWarning={true}
        ></div>
      </div>
    </div>
  );
}
