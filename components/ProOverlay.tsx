import React from 'react';
import { GridType, SceneType, GuidanceHint } from '../types';
import { Maximize, ScanLine, Wind, Info, Sparkles } from 'lucide-react';
import { SCENES } from '../constants';

interface ProOverlayProps {
  gridType: GridType;
  sceneId: SceneType;
  hint: GuidanceHint | null;
}

const ProOverlay: React.FC<ProOverlayProps> = ({ gridType, sceneId, hint }) => {
  // Determine what text to display:
  // 1. If parent passes a hint (e.g. system status, temporary scene alert), show it.
  // 2. Otherwise, show the primary composition guide for the current scene.
  
  const sceneConfig = SCENES.find(s => s.id === sceneId);
  const compositionGuide = sceneConfig?.guides.composition?.[0];

  const displayHint = hint || (compositionGuide ? {
      text: compositionGuide,
      type: 'scene' as const,
      id: 'static-guide'
  } : null);

  return (
    <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
      
      {/* --- 1. Dynamic Floating Hint Bubble --- */}
      {displayHint && (
        <div className="absolute bottom-40 left-0 w-full flex justify-center items-center z-50 animate-fade-in-up px-8">
           <div className={`backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 max-w-xs border transition-all duration-300
               ${displayHint.type === 'system' ? 'bg-gray-800/80 border-white/20' : 'bg-black/60 border-yellow-500/50'}`}>
              
              {displayHint.type === 'system' ? (
                 <Info className="w-4 h-4 text-blue-400" />
              ) : (
                 <Sparkles className="w-4 h-4 text-yellow-400" />
              )}
              
              <span className="text-sm font-medium tracking-wide leading-tight text-center">
                {displayHint.text}
              </span>
           </div>
        </div>
      )}

      {/* --- 2. Composition Grids --- */}
      {gridType === 'thirds' && (
        <div className="w-full h-full border-2 border-white/20 flex flex-col opacity-50">
          <div className="flex-1 border-b border-white/20 flex">
            <div className="flex-1 border-r border-white/20"></div>
            <div className="flex-1 border-r border-white/20"></div>
            <div className="flex-1"></div>
          </div>
          <div className="flex-1 border-b border-white/20 flex">
            <div className="flex-1 border-r border-white/20"></div>
            <div className="flex-1 border-r border-white/20"></div>
            <div className="flex-1"></div>
          </div>
          <div className="flex-1 flex">
             <div className="flex-1 border-r border-white/20"></div>
             <div className="flex-1 border-r border-white/20"></div>
             <div className="flex-1"></div>
          </div>
        </div>
      )}

      {gridType === 'golden' && (
        <div className="w-full h-full relative opacity-40">
           <div className="absolute top-0 left-[38%] w-[1px] h-full bg-white shadow-sm"></div>
           <div className="absolute top-0 left-[62%] w-[1px] h-full bg-white shadow-sm"></div>
           <div className="absolute top-[38%] left-0 w-full h-[1px] bg-white shadow-sm"></div>
           <div className="absolute top-[62%] left-0 w-full h-[1px] bg-white shadow-sm"></div>
        </div>
      )}
      
      {gridType === 'center' && (
        <div className="w-full h-full flex items-center justify-center opacity-60">
            <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
            <div className="absolute w-12 h-12 border border-white rounded-full"></div>
        </div>
      )}

      {/* --- 3. Scene Specific Auxiliary Frames --- */}
      
      {/* Portrait: Face Area */}
      {sceneId === 'portrait' && (
        <div className="absolute inset-0 flex items-center justify-center opacity-40">
           <div className="relative w-48 h-64 border-2 border-dashed border-yellow-400 rounded-[45%] -mt-16"></div>
        </div>
      )}

      {/* Food/Macro: Focus Circle */}
      {(sceneId === 'food' || sceneId === 'macro') && (
        <div className="absolute inset-0 flex items-center justify-center opacity-50">
           <div className="relative w-56 h-56 border-2 border-dashed border-white rounded-full flex items-center justify-center">
              <Maximize className="w-6 h-6 text-white/50" />
           </div>
        </div>
      )}
      
      {/* Landscape: Horizon */}
      {sceneId === 'landscape' && (
         <div className="absolute inset-0 flex items-center justify-center opacity-50">
            <div className="w-full h-px bg-yellow-400 shadow-sm"></div>
            <div className="absolute w-full h-full flex justify-between px-[33%] pointer-events-none opacity-20">
                 <div className="w-px h-full bg-white"></div>
                 <div className="w-px h-full bg-white"></div>
            </div>
         </div>
      )}
      
      {/* Document: Rectangular alignment */}
      {sceneId === 'document' && (
          <div className="absolute inset-12 border-2 border-dashed border-blue-400/50 rounded flex items-center justify-center opacity-60">
             <ScanLine className="w-12 h-12 text-blue-400 animate-pulse" />
          </div>
      )}
      
      {/* Sport: Motion Lines */}
      {sceneId === 'sport' && (
         <div className="absolute inset-0 flex items-center justify-center opacity-30">
            <Wind className="w-24 h-24 text-white" />
         </div>
      )}
      
      {/* Night: Stability Cross */}
      {sceneId === 'night' && (
         <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-l-2 border-t-2 border-yellow-500 absolute top-[40%] left-[40%]"></div>
            <div className="w-8 h-8 border-r-2 border-t-2 border-yellow-500 absolute top-[40%] right-[40%]"></div>
            <div className="w-8 h-8 border-l-2 border-b-2 border-yellow-500 absolute bottom-[40%] left-[40%]"></div>
            <div className="w-8 h-8 border-r-2 border-b-2 border-yellow-500 absolute bottom-[40%] right-[40%]"></div>
         </div>
      )}

    </div>
  );
};

export default ProOverlay;