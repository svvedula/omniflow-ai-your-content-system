import { useState } from "react";
import { CreatorInput } from "@/components/CreatorInput";
import { CreatorOutput } from "@/components/CreatorOutput";
import { generateMockSystem } from "@/lib/mockData";
import type { ContentSystem } from "@/lib/types";

const Index = () => {
  const [result, setResult] = useState<ContentSystem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async (data: { niche: string; audience: string; platform: string }) => {
    setIsLoading(true);
    // Simulate AI processing time
    await new Promise((r) => setTimeout(r, 2000));
    const system = generateMockSystem(data.niche, data.audience, data.platform);
    setResult(system);
    setIsLoading(false);
  };

  return (
    <div className="p-6 md:p-10">
      {result ? (
        <div>
          <button
            onClick={() => setResult(null)}
            className="mb-6 text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
          >
            ← New System
          </button>
          <CreatorOutput data={result} />
        </div>
      ) : (
        <div className="flex items-center justify-center min-h-[calc(100vh-6rem)]">
          <CreatorInput onGenerate={handleGenerate} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
};

export default Index;
