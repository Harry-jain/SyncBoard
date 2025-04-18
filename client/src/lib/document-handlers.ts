import { Document } from "./types";

export const createNewDocument = (
  type: "powerpoint" | "word" | "onenote", 
  name: string = "",
  userId: string
): Document => {
  const defaultName = type === "powerpoint" 
    ? "New Presentation" 
    : type === "word" 
      ? "New Document" 
      : "New Notebook";
  
  const docName = name || defaultName;
  
  const document: Document = {
    id: `temp-${Date.now()}`,
    name: docName,
    type,
    content: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: userId,
    size: "0 KB",
  };
  
  if (type === "powerpoint") {
    document.slides = [
      {
        layout: "title",
        title: docName,
        subtitle: "Created with SyncBoard",
      },
      {
        layout: "bullets",
        title: "Agenda",
        bullets: [
          "Introduction",
          "Key Points",
          "Discussion",
          "Next Steps",
        ],
      },
    ];
    document.department = "Your Department";
  }
  
  if (type === "onenote") {
    document.sections = [
      "<h1>Welcome to your new notebook</h1><p>Start taking notes here.</p>",
    ];
  }
  
  if (type === "word") {
    document.content = "<h1>New Document</h1><p>Start typing here...</p>";
  }
  
  return document;
};

export const getDocumentIcon = (type: string): string => {
  switch (type.toLowerCase()) {
    case "powerpoint":
      return "slideshow";
    case "word":
      return "description";
    case "onenote":
      return "event_note";
    default:
      return "insert_drive_file";
  }
};
