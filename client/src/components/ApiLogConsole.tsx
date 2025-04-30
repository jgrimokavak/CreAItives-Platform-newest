import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FaEye, FaEyeSlash } from "react-icons/fa";

type LogEntry = {
  ts: string;
  direction: "request" | "response" | "error";
  payload: any;
};

export default function ApiLogConsole() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const tick = () => fetch("/api/logs")
      .then(r => r.json())
      .then(d => setLogs(d.logs));
    
    tick();
    const id = setInterval(tick, 2000);
    return () => clearInterval(id);
  }, []);

  if (!expanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button 
          onClick={() => setExpanded(true)} 
          className="bg-slate-800 hover:bg-slate-700 text-white"
        >
          <FaEye className="mr-2" /> Show API Logs ({logs.length})
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-full md:w-2/3 lg:w-1/2 z-50 bg-gray-900 text-green-500 shadow-lg">
      <div className="flex justify-between items-center p-2 border-b border-gray-700">
        <h3 className="font-mono font-bold">API Logs ({logs.length})</h3>
        <Button 
          onClick={() => setExpanded(false)} 
          variant="ghost" 
          size="sm"
          className="text-gray-400 hover:text-white"
        >
          <FaEyeSlash />
        </Button>
      </div>
      
      <div 
        className="overflow-y-auto font-mono text-xs p-2" 
        style={{maxHeight: "400px", background: "#111", color: "#0f0"}}
      >
        {logs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No logs available</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className={`mb-2 p-2 ${log.direction === 'error' ? 'bg-red-900/30 text-red-400' : 'border-l-4'} ${
              log.direction === 'request' 
                ? 'border-blue-600' 
                : log.direction === 'response' 
                  ? 'border-green-600' 
                  : 'border-red-600'
            }`}>
              <div className="flex justify-between mb-1">
                <span className="font-bold">
                  {log.direction.toUpperCase()}
                </span>
                <span className="text-gray-400">
                  {new Date(log.ts).toLocaleTimeString()}
                </span>
              </div>
              <pre className="whitespace-pre-wrap break-all overflow-x-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}