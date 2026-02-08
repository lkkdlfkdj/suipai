import React from 'react';
import { ArrowLeft, Save, Share2, Trash2 } from 'lucide-react';

interface EditorProps {
  imageSrc: string;
  onBack: () => void;
  onSave: () => void;
}

const Editor: React.FC<EditorProps> = ({ imageSrc, onBack, onSave }) => {
  return (
    <div className="flex flex-col h-full bg-black text-white animate-fade-in">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-4 z-20 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={onBack} className="p-3 rounded-full bg-black/40 backdrop-blur-md active:scale-95 transition-transform">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="text-sm font-bold tracking-widest text-gray-400">PREVIEW</div>
        <button 
           onClick={onSave}
           className="px-5 py-2 bg-yellow-500 text-black font-bold rounded-full text-sm flex items-center gap-2 active:scale-95 transition-transform"
        >
          <Save className="w-4 h-4" /> 保存
        </button>
      </div>

      {/* Main Image Area */}
      <div className="flex-1 relative flex items-center justify-center bg-gray-900 p-4">
        <img 
          src={imageSrc} 
          alt="Capture Preview" 
          className="max-w-full max-h-full object-contain rounded-lg shadow-2xl border border-gray-800"
        />
      </div>

      {/* Bottom Actions */}
      <div className="bg-black p-8 flex justify-around items-center pb-safe">
        <button onClick={onBack} className="flex flex-col items-center gap-2 text-gray-400 hover:text-red-500 transition-colors">
            <div className="p-3 rounded-full bg-gray-800">
                <Trash2 className="w-6 h-6" />
            </div>
            <span className="text-xs">删除</span>
        </button>

        <button className="flex flex-col items-center gap-2 text-gray-400 hover:text-blue-400 transition-colors">
            <div className="p-3 rounded-full bg-gray-800">
                <Share2 className="w-6 h-6" />
            </div>
            <span className="text-xs">分享</span>
        </button>
      </div>
    </div>
  );
};

export default Editor;