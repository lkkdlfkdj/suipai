import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Settings, RefreshCcw, Image as ImageIcon, Zap, Grid as GridIcon, Sliders, Minus, Plus, X, ChevronUp } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import ProOverlay from './components/ProOverlay';
import { SceneType, GridType, CameraParameters, GuidanceHint } from './types';
import { SCENES } from './constants';

// --- Constants for Manual Adjustments ---
const ISO_OPTIONS = [50, 100, 200, 400, 800, 1600, 3200, 6400];
const SHUTTER_OPTIONS = [
  '1/8000s', '1/4000s', '1/2000s', '1/1000s', '1/500s', '1/250s', 
  '1/125s', '1/60s', '1/30s', '1/15s', '1/8s', '1/4s', '1/2s', '1s', '2s', '4s', '8s', '15s', '30s'
];
const APERTURE_OPTIONS = ['f/1.4', 'f/1.8', 'f/2.0', 'f/2.2', 'f/2.8', 'f/4.0', 'f/5.6', 'f/8.0', 'f/11', 'f/16'];
const EV_OPTIONS = Array.from({ length: 41 }, (_, i) => parseFloat(((i - 20) / 10).toFixed(1))); // -2.0 to +2.0

type AdjustableParam = 'iso' | 'shutterSpeed' | 'aperture' | 'ev';

const App: React.FC = () => {
  // --- State ---
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isFlashing, setIsFlashing] = useState(false);
  
  // Logic State
  const [currentSceneId, setCurrentSceneId] = useState<SceneType>('auto');
  const [currentParams, setCurrentParams] = useState<CameraParameters>(SCENES[0].defaultParams);
  const [grid, setGrid] = useState<GridType>('none');
  const [isProMode, setIsProMode] = useState(false); // Toggle for manual parameter override
  const [activeParam, setActiveParam] = useState<AdjustableParam | null>(null);

  // Guidance State
  const [activeHint, setActiveHint] = useState<GuidanceHint | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hintTimeoutRef = useRef<number | null>(null);

  // --- Camera Lifecycle ---
  useEffect(() => {
    let isMounted = true;
    const stopTracks = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };

    const initCamera = async () => {
      stopTracks();

      try {
        const constraints = {
          video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        };
        const newStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          newStream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = newStream;
        setHasPermission(true);
        if (videoRef.current) videoRef.current.srcObject = newStream;
      } catch (err) {
        console.error("Camera Error:", err);
        if (isMounted) setHasPermission(false);
      }
    };
    initCamera();
    return () => {
      isMounted = false;
      stopTracks();
    };
  }, [facingMode]);

  // --- Scene & Parameter Logic ---
  
  // Effect: Update parameters based on current scene (Only if NOT in Pro Mode)
  useEffect(() => {
    const sceneConfig = SCENES.find(s => s.id === currentSceneId) || SCENES[0];
    if (!isProMode) {
        setCurrentParams(sceneConfig.defaultParams);
        setActiveParam(null); // Reset active param when exiting pro mode logic implicitly
    }
  }, [currentSceneId, isProMode]);

  // Effect: Reset active param when Pro Mode is toggled off
  useEffect(() => {
      if (!isProMode) {
          setActiveParam(null);
      }
  }, [isProMode]);


  // Effect: AI Scene Recognition
  useEffect(() => {
    // Only run if stream is active, not in pro mode (manual override)
    if (isProMode || !hasPermission || !streamRef.current) {
        // Clear hints if we exit auto mode
        if (activeHint?.id === 'scanning' || activeHint?.id === 'fallback') {
            setActiveHint(null);
        }
        return;
    }

    let isCancelled = false;
    let analysisInterval: ReturnType<typeof setInterval>;

    const analyzeScene = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Use smaller dimension for faster processing
      const analysisWidth = 320; 
      const analysisHeight = Math.round((analysisWidth / video.videoWidth) * video.videoHeight);
      
      canvas.width = analysisWidth;
      canvas.height = analysisHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, analysisWidth, analysisHeight);
      
      // Get Base64
      const base64Data = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];

      try {
         // If currently in auto, show scanning to indicate activity
         if (currentSceneId === 'auto' && !activeHint) {
             setActiveHint({
                 id: 'scanning',
                 text: '正在智能识别场景...',
                 type: 'system',
                 priority: 1
             });
         }

         // Call Gemini API
         const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
         const response = await ai.models.generateContent({
             model: 'gemini-2.5-flash-latest', 
             contents: {
                 parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: "Analyze the image. Return exactly one of these words: portrait, landscape, night, food, macro, sport, document. If the scene is ambiguous or none fit well, return 'auto'." }
                 ]
             }
         });
         
         if (isCancelled) return;

         const result = response.text?.trim().toLowerCase();
         const validScenes: SceneType[] = ['portrait', 'landscape', 'night', 'food', 'macro', 'sport', 'document'];
         
         if (validScenes.includes(result as SceneType)) {
             // Scene recognized
             if (currentSceneId !== result) {
                 setCurrentSceneId(result as SceneType);
                 
                 // Show scene specific hint
                 const sceneConfig = SCENES.find(s => s.id === result);
                 if (sceneConfig) {
                     const guides = sceneConfig.guides;
                     const allTips = [...guides.composition, ...guides.lighting, ...guides.operation];
                     const randomTip = allTips[Math.floor(Math.random() * allTips.length)];
                     
                     setActiveHint({
                         id: `scene-${Date.now()}`,
                         text: randomTip || `${sceneConfig.name}模式已激活`,
                         type: 'scene',
                         priority: 2
                     });
                     
                     // Hide scene hint after 4s
                     if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
                     hintTimeoutRef.current = window.setTimeout(() => setActiveHint(null), 4000);
                 }
             } else {
                 // Same scene, maybe just clear scanning if present
                 if (activeHint?.id === 'scanning') setActiveHint(null);
             }
         } else {
             // Unclear / Auto
             if (currentSceneId !== 'auto' || activeHint?.id === 'scanning') {
                 setCurrentSceneId('auto');
                 
                 // Show fallback prompt
                 setActiveHint({
                     id: 'fallback',
                     text: '场景未明确，已切换至通用模式，可手动调整',
                     type: 'system',
                     priority: 1
                 });
                 
                 // Hide fallback after 3.5s
                 if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
                 hintTimeoutRef.current = window.setTimeout(() => setActiveHint(null), 3500);
             }
         }

      } catch (error) {
          console.warn("Scene analysis skipped", error);
          // If error (e.g. rate limit), keep quiet or stay in auto
      }
    };

    // Trigger analysis periodically
    const intervalTime = 3000; // Check every 3 seconds
    // Initial check
    const t = setTimeout(analyzeScene, 500); 
    analysisInterval = setInterval(analyzeScene, intervalTime);

    return () => {
        isCancelled = true;
        clearTimeout(t);
        clearInterval(analysisInterval);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [currentSceneId, isProMode, hasPermission]);


  // --- Actions ---
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // 1. Visual Feedback
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 150);

    // 2. Capture and Save
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      
      // Direct download simulation for "Save to Gallery"
      const dataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `LumiCam_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [facingMode]);

  // --- Manual Adjustment Helpers ---
  const getParamOptions = (param: AdjustableParam) => {
      switch(param) {
          case 'iso': return ISO_OPTIONS;
          case 'shutterSpeed': return SHUTTER_OPTIONS;
          case 'aperture': return APERTURE_OPTIONS;
          case 'ev': return EV_OPTIONS;
          default: return [];
      }
  };

  const getParamLabel = (param: AdjustableParam) => {
    switch(param) {
      case 'iso': return 'ISO';
      case 'shutterSpeed': return '快门';
      case 'aperture': return '光圈';
      case 'ev': return 'EV';
      default: return '';
    }
  };

  const getCurrentValueIndex = (param: AdjustableParam) => {
      const options = getParamOptions(param);
      const val = currentParams[param];
      // @ts-ignore - Value types match implicitly but TS logic for union is strict
      return options.indexOf(val); 
  };

  const updateParamValue = (param: AdjustableParam, index: number) => {
      const options = getParamOptions(param);
      if (index >= 0 && index < options.length) {
          setCurrentParams(prev => ({
              ...prev,
              [param]: options[index]
          }));
      }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!activeParam) return;
      updateParamValue(activeParam, parseInt(e.target.value));
  };

  const handleStep = (step: number) => {
      if (!activeParam) return;
      const currentIndex = getCurrentValueIndex(activeParam);
      updateParamValue(activeParam, currentIndex + step);
  };

  if (hasPermission === false) {
    return (
      <div className="h-screen bg-black text-white flex flex-col items-center justify-center p-8 text-center">
        <Camera className="w-16 h-16 mb-4 text-gray-500" />
        <h2 className="text-xl font-bold mb-2">需要相机权限</h2>
        <button onClick={() => setFacingMode(prev => prev)} className="bg-yellow-500 text-black px-6 py-2 rounded-full font-bold">重试</button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black relative flex flex-col overflow-hidden text-white font-sans">
      <canvas ref={canvasRef} className="hidden" />

      {/* --- Viewfinder Layer --- */}
      <div className="flex-1 relative bg-gray-900 overflow-hidden">
        <video 
          ref={videoRef}
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
        />
        <ProOverlay gridType={grid} sceneId={currentSceneId} hint={activeHint} />
        
        {/* Flash Overlay */}
        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${isFlashing ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* --- Top Bar --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-30 pt-safe bg-gradient-to-b from-black/50 to-transparent">
         <button onClick={() => setIsProMode(!isProMode)} className={`p-2 rounded-full backdrop-blur-md transition-colors ${isProMode ? 'bg-yellow-500 text-black' : 'bg-black/30 text-white'}`}>
           <Sliders className="w-6 h-6" />
         </button>
         <div className="flex gap-4">
           <button onClick={() => setGrid(g => g === 'none' ? 'thirds' : g === 'thirds' ? 'golden' : 'none')} className="p-2 rounded-full bg-black/30 backdrop-blur-md">
              <GridIcon className="w-6 h-6" />
           </button>
           <button className="p-2 rounded-full bg-black/30 backdrop-blur-md">
              <Zap className="w-6 h-6 text-white" />
           </button>
         </div>
      </div>

      {/* --- Manual Adjustment Slider Overlay --- */}
      {isProMode && activeParam && (
          <div className="absolute bottom-[230px] left-0 w-full px-8 z-40 animate-fade-in flex flex-col items-center">
             <div className="flex items-center gap-4 w-full bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl">
                 <button onClick={() => handleStep(-1)} className="p-2 rounded-full bg-gray-700 active:bg-gray-600">
                     <Minus className="w-4 h-4" />
                 </button>
                 
                 <div className="flex-1 flex flex-col items-center gap-1">
                     <span className="text-yellow-400 font-bold text-lg uppercase">{activeParam}</span>
                     <input 
                        type="range" 
                        min={0} 
                        max={getParamOptions(activeParam).length - 1} 
                        value={getCurrentValueIndex(activeParam)}
                        onChange={handleSliderChange}
                        className="w-full accent-yellow-500 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                     />
                     <div className="flex justify-between w-full text-[10px] text-gray-400 mt-1">
                        <span>{getParamOptions(activeParam)[0]}</span>
                        <span className="text-white font-mono">{currentParams[activeParam]}</span>
                        <span>{getParamOptions(activeParam)[getParamOptions(activeParam).length-1]}</span>
                     </div>
                 </div>

                 <button onClick={() => handleStep(1)} className="p-2 rounded-full bg-gray-700 active:bg-gray-600">
                     <Plus className="w-4 h-4" />
                 </button>

                 <button onClick={() => setActiveParam(null)} className="ml-2 p-1 text-gray-400">
                     <X className="w-4 h-4" />
                 </button>
             </div>
          </div>
      )}

      {/* --- Parameters Info Strip --- */}
      <div className="absolute bottom-[160px] left-0 w-full z-30 px-4">
        <div className={`flex justify-between items-center bg-black/40 backdrop-blur-md rounded-lg p-2 border transition-colors ${isProMode ? 'border-yellow-500/30' : 'border-white/10'}`}>
            
            {/* ISO */}
            <div 
                onClick={() => isProMode && setActiveParam('iso')}
                className={`flex flex-col items-center w-1/4 border-r border-white/10 transition-colors cursor-pointer ${activeParam === 'iso' ? 'bg-white/10 rounded' : ''}`}
            >
                <div className="flex items-center gap-1">
                    <span className={`text-[10px] uppercase ${activeParam === 'iso' ? 'text-yellow-400' : 'text-gray-400'}`}>ISO</span>
                    {isProMode && <ChevronUp className={`w-3 h-3 ${activeParam === 'iso' ? 'text-yellow-400' : 'text-gray-400'}`} />}
                </div>
                <span className={`text-xs font-bold ${isProMode ? 'text-yellow-400' : 'text-white'}`}>{currentParams.iso}</span>
            </div>

            {/* Shutter */}
            <div 
                onClick={() => isProMode && setActiveParam('shutterSpeed')}
                className={`flex flex-col items-center w-1/4 border-r border-white/10 transition-colors cursor-pointer ${activeParam === 'shutterSpeed' ? 'bg-white/10 rounded' : ''}`}
            >
                <div className="flex items-center gap-1">
                    <span className={`text-[10px] uppercase ${activeParam === 'shutterSpeed' ? 'text-yellow-400' : 'text-gray-400'}`}>Shutter</span>
                    {isProMode && <ChevronUp className={`w-3 h-3 ${activeParam === 'shutterSpeed' ? 'text-yellow-400' : 'text-gray-400'}`} />}
                </div>
                <span className={`text-xs font-bold ${isProMode ? 'text-yellow-400' : 'text-white'}`}>{currentParams.shutterSpeed}</span>
            </div>

            {/* Aperture */}
            <div 
                onClick={() => isProMode && setActiveParam('aperture')}
                className={`flex flex-col items-center w-1/4 border-r border-white/10 transition-colors cursor-pointer ${activeParam === 'aperture' ? 'bg-white/10 rounded' : ''}`}
            >
                <div className="flex items-center gap-1">
                    <span className={`text-[10px] uppercase ${activeParam === 'aperture' ? 'text-yellow-400' : 'text-gray-400'}`}>Aperture</span>
                    {isProMode && <ChevronUp className={`w-3 h-3 ${activeParam === 'aperture' ? 'text-yellow-400' : 'text-gray-400'}`} />}
                </div>
                <span className={`text-xs font-bold ${isProMode ? 'text-yellow-400' : 'text-white'}`}>{currentParams.aperture}</span>
            </div>

            {/* EV */}
            <div 
                onClick={() => isProMode && setActiveParam('ev')}
                className={`flex flex-col items-center w-1/4 transition-colors cursor-pointer ${activeParam === 'ev' ? 'bg-white/10 rounded' : ''}`}
            >
                <div className="flex items-center gap-1">
                    <span className={`text-[10px] uppercase ${activeParam === 'ev' ? 'text-yellow-400' : 'text-gray-400'}`}>EV</span>
                    {isProMode && <ChevronUp className={`w-3 h-3 ${activeParam === 'ev' ? 'text-yellow-400' : 'text-gray-400'}`} />}
                </div>
                <span className={`text-xs font-bold ${isProMode ? 'text-yellow-400' : 'text-white'}`}>{currentParams.ev > 0 ? `+${currentParams.ev}` : currentParams.ev}</span>
            </div>
        </div>
        
        {/* Helper text for parameter adjustment */}
        <div className="text-center mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-sm ${isProMode ? 'bg-yellow-500/90 text-black' : 'bg-black/50 text-white'}`}>
                {isProMode ? (activeParam ? `滑动调整${getParamLabel(activeParam)}值` : '点击上方参数进行调整') : `场景识别：${SCENES.find(s => s.id === currentSceneId)?.name}`}
            </span>
        </div>
      </div>

      {/* --- Scene Selector --- */}
      <div className={`absolute bottom-[100px] left-0 w-full z-30 transition-opacity duration-300 ${isProMode ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex overflow-x-auto gap-6 px-1/2 no-scrollbar px-[40vw] snap-x">
             {SCENES.map(scene => (
                 <button 
                    key={scene.id}
                    onClick={() => setCurrentSceneId(scene.id)}
                    className={`whitespace-nowrap text-sm font-medium transition-all duration-300 snap-center ${currentSceneId === scene.id ? 'text-yellow-400 scale-110 shadow-glow' : 'text-gray-400'}`}
                 >
                    {scene.name}
                 </button>
             ))}
          </div>
          {/* Active Indicator Triangle */}
          <div className="flex justify-center -mt-1">
             <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-yellow-400"></div>
          </div>
      </div>

      {/* --- Bottom Trigger Area --- */}
      <div className="bg-black/90 pt-4 pb-8 px-6 rounded-t-3xl z-40 flex justify-between items-center h-[100px]">
          <div className="w-12 h-12 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center opacity-50">
             <ImageIcon className="w-6 h-6 text-gray-500" />
          </div>

          <button 
            onClick={takePhoto}
            className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
          >
            <div className="w-14 h-14 bg-white rounded-full"></div>
          </button>

          <button 
            onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
            className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center active:rotate-180 transition-transform duration-500"
          >
            <RefreshCcw className="w-5 h-5 text-white" />
          </button>
      </div>
    </div>
  );
};

export default App;