import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowLeft, Clock } from 'lucide-react';
import { useMemo, useCallback } from 'react';

interface CalendarViewProps {
  onBack: () => void;
  onSelectCleaning: (cleaning: any) => void;
  cleanings: any[];
}

export default function CalendarView({ onBack, onSelectCleaning, cleanings = [] }: CalendarViewProps) {
  // ✅ OPTIMIZACIÓN 1: Memoizar cálculo de días de la semana
  const week = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(new Date(now).setDate(diff));
    return [...Array(7)].map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []); // Solo calcular una vez

  // ✅ OPTIMIZACIÓN 2: Constante para labels
  const labels = useMemo(() => ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'], []);

  // ✅ OPTIMIZACIÓN 3: Memoizar fecha de hoy para comparación
  const todayString = useMemo(() => new Date().toDateString(), []);

  // ✅ OPTIMIZACIÓN 4: Memoizar cleanings agrupadas por fecha
  const cleaningsByDate = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    
    // Inicializar todos los días de la semana
    week.forEach(date => {
      const dStr = date.toISOString().split('T')[0];
      grouped[dStr] = [];
    });

    // Agrupar cleanings
    cleanings.forEach((cleaning) => {
      const cDate = (cleaning.date || cleaning.Date || '').split('T')[0];
      if (grouped[cDate]) {
        grouped[cDate].push(cleaning);
      }
    });

    return grouped;
  }, [cleanings, week]);

  // ✅ OPTIMIZACIÓN 5: Memoizar mes/año para header
  const monthYear = useMemo(
    () => week[0].toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
    [week]
  );

  // ✅ OPTIMIZACIÓN 6: useCallback para formatear hora
  const formatTime = useCallback((scheduledTime: string | null) => {
    if (!scheduledTime) return 'TBD';
    try {
      return new Date(scheduledTime).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      }).replace(' ', '');
    } catch {
      return 'TBD';
    }
  }, []);

  // ✅ OPTIMIZACIÓN 7: useCallback para determinar color de status
  const getStatusColor = useCallback((status: string) => {
    if (status === 'Done') return 'bg-green-500';
    if (status === 'In Progress') return 'bg-blue-500';
    return 'bg-slate-300';
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header Estilo Google */}
      <header className="p-4 border-b flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="h-9 w-9 p-0 rounded-full hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Button>
          <div>
            <span className="text-lg font-bold text-slate-900 capitalize">
              {monthYear}
            </span>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mt-1">
              Semana Actual
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><ChevronLeft className="w-4 h-4" /></Button>
             <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      {/* Días de la semana */}
      <div className="grid grid-cols-7 border-b bg-white shadow-sm">
        {labels.map((label, i) => {
          const isToday = week[i].toDateString() === todayString;
          return (
            <div key={label} className={`py-3 text-center border-b-2 ${isToday ? 'border-blue-600' : 'border-transparent'}`}>
              <p className={`text-[9px] font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-slate-400'}`}>{label}</p>
              <div className={`text-sm font-black w-8 h-8 flex items-center justify-center rounded-full mx-auto ${
                isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-900'
              }`}>
                {week[i].getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid de tareas */}
      <div className="grid grid-cols-7 flex-1 divide-x divide-slate-100 overflow-y-auto bg-slate-50/50">
        {week.map((date, i) => {
          const dStr = date.toISOString().split('T')[0];
          const dayTasks = cleaningsByDate[dStr] || [];
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          
          return (
            <div key={dStr} className={`p-1.5 min-h-screen ${isWeekend ? 'bg-slate-50/30' : ''}`}>
              {dayTasks.length > 0 ? (
                dayTasks.map((task: any) => (
                  <div 
                    key={task.id} 
                    onClick={() => onSelectCleaning(task)} 
                    className="bg-white border border-slate-200 shadow-sm p-2 rounded-xl mb-2 active:scale-95 transition-all hover:border-blue-300 group cursor-pointer"
                  >
                    <div className="flex items-center gap-1 mb-1 text-blue-600">
                      <Clock className="w-2.5 h-2.5" />
                      <p className="text-[7px] font-black uppercase">
                        {formatTime(task.scheduledTime)}
                      </p>
                    </div>
                    <p className="text-[9px] font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-blue-600">
                      {task.propertyText || 'Propiedad'}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(task.status)}`} />
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center pt-4 opacity-20">
                  <div className="w-px h-full bg-slate-200 border-dashed" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
