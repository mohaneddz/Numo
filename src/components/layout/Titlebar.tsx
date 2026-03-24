import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

export default function Titlebar() {
  const appWindow = getCurrentWindow();

  return (
    <header className="h-10 border-b border-white/5 bg-slate-950/40 backdrop-blur-xl">
      <div data-tauri-drag-region className="h-full px-3 flex items-center justify-end gap-3">
        <div className="flex items-center gap-1.5 translate-y-[1px]">
          <button
            className="h-6 w-8 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            onClick={() => void appWindow.minimize()}
            title="Minimize"
          >
            <Minus size={14} className="mx-auto" />
          </button>
          <button
            className="h-6 w-8 rounded-md hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            onClick={() => void appWindow.toggleMaximize()}
            title="Maximize"
          >
            <Square size={10} className="mx-auto" />
          </button>
          <button
            className="h-6 w-8 rounded-md hover:bg-red-500/80 text-slate-400 hover:text-white transition-colors group"
            onClick={() => void appWindow.close()}
            title="Close"
          >
            <X size={14} className="mx-auto" />
          </button>
        </div>
      </div>
    </header>
  );
}
