import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PowerPointEditorProps {
  document: any;
}

export default function PowerPointEditor({ document }: PowerPointEditorProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  
  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Slides Navigation */}
      <div className="w-56 bg-neutral-100 border-r border-neutral-200 overflow-y-auto p-2 space-y-2">
        {document.slides.map((slide: any, index: number) => (
          <div 
            key={index}
            className={cn(
              "bg-white border rounded p-1 cursor-pointer",
              index === activeSlide 
                ? "border-primary" 
                : "border-neutral-300 hover:border-primary"
            )}
            onClick={() => setActiveSlide(index)}
          >
            <div className="h-20 bg-white rounded flex items-center justify-center">
              {slide.layout === "title" && (
                <div className="text-center px-2 py-1">
                  <h3 className="font-bold text-xs">{slide.title}</h3>
                  <p className="text-xs">{slide.subtitle}</p>
                </div>
              )}
              
              {slide.layout === "bullets" && (
                <div className="text-center px-2">
                  <h3 className="font-bold text-xs">{slide.title}</h3>
                  <ul className="text-[10px] text-left list-disc pl-4">
                    {slide.bullets.map((bullet: string, i: number) => (
                      <li key={i}>{bullet}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {slide.layout === "split" && (
                <div className="h-20 bg-white rounded flex">
                  <div className="w-1/2 flex items-center justify-center bg-neutral-100">
                    <span className="material-icons text-neutral-400 text-xs">image</span>
                  </div>
                  <div className="w-1/2 p-1">
                    <h3 className="font-bold text-[10px]">{slide.title}</h3>
                    <div className="text-[8px]">
                      {slide.bullets.map((bullet: string, i: number) => (
                        <div key={i}>{bullet}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="text-xs text-center mt-1 text-neutral-500">Slide {index + 1}</div>
          </div>
        ))}
      </div>
      
      {/* Main Editing Area */}
      <div className="flex-1 bg-neutral-200 p-4 flex items-center justify-center overflow-auto">
        <div className="bg-white shadow-lg w-full max-w-3xl aspect-[16/9] rounded">
          <div className="p-8 h-full flex flex-col">
            {document.slides[activeSlide].layout === "title" && (
              <>
                <h2 className="text-2xl font-bold mb-4">{document.slides[activeSlide].title}</h2>
                <p className="text-lg">{document.slides[activeSlide].subtitle}</p>
              </>
            )}
            
            {document.slides[activeSlide].layout === "bullets" && (
              <>
                <h2 className="text-2xl font-bold mb-4">{document.slides[activeSlide].title}</h2>
                <ul className="list-disc pl-8 space-y-4 text-lg">
                  {document.slides[activeSlide].bullets.map((bullet: string, i: number) => (
                    <li key={i}>
                      {bullet}
                      {i === 1 && document.slides[activeSlide].subBullets && (
                        <ul className="list-circle pl-8 space-y-2 mt-2">
                          {document.slides[activeSlide].subBullets.map((subBullet: string, j: number) => (
                            <li key={j}>{subBullet}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            
            {document.slides[activeSlide].layout === "split" && (
              <div className="flex h-full">
                <div className="w-1/2 flex items-center justify-center bg-neutral-100 mr-4">
                  <span className="material-icons text-neutral-400 text-4xl">image</span>
                </div>
                <div className="w-1/2">
                  <h2 className="text-2xl font-bold mb-4">{document.slides[activeSlide].title}</h2>
                  <div className="space-y-2">
                    {document.slides[activeSlide].bullets.map((bullet: string, i: number) => (
                      <div key={i}>{bullet}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-auto">
              <div className="flex justify-between text-sm text-neutral-500">
                <div>{document.department}</div>
                <div>{activeSlide + 1}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
