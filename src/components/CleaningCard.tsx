import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle2, Package } from 'lucide-react';
import { memo, useMemo } from 'react';

const TEAL = '#00BCD4';

// ✅ OPTIMIZACIÓN 1: Formato de fecha memoizado y reutilizable
const MONTHS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

const formatDate = (dateString?: string): string => {
  if (!dateString) return '--/--';
  const [, month, day] = (dateString.split('T')[0]).split('-');
  return `${parseInt(day)} ${MONTHS[parseInt(month) - 1]}`;
};

const formatTimeOnly = (timeValue: any): string | null => {
  if (!timeValue) return null;
  try {
    const date = new Date(timeValue);
    if (!isNaN(date.getTime()) && date.getFullYear() > 2020) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } catch { return null; }
  return null;
};

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'In Progress':  return 'bg-blue-500 text-white';
    case 'Scheduled':    return 'bg-amber-400 text-white';
    case 'Programmed':   return 'bg-amber-400 text-white';
    case 'Done':         return 'bg-emerald-500 text-white';
    default:             return 'bg-slate-400 text-white';
  }
};

// ✅ OPTIMIZACIÓN 2: Props typing para mejor tree-shaking
interface CleaningCardProps {
  cleaning: {
    id: string;
    status?: string;
    attachments?: Array<{ url?: string; thumbnails?: { large?: { url?: string } } }>;
    propertyText?: string;
    address?: string;
    scheduledTime?: string;
    date?: string;
    staffList?: string[];
    equipmentCount?: number;
  };
  onClick: (cleaning: any) => void;
}

// ✅ OPTIMIZACIÓN 3: Componente memo con comparación personalizada
const CleaningCard = memo<CleaningCardProps>(({ cleaning, onClick }) => {
  const isDone = cleaning.status === 'Done';
  
  // ✅ OPTIMIZACIÓN 4: Memoizar URL de imagen
  const imageUrl = useMemo(
    () => cleaning.attachments?.[0]?.thumbnails?.large?.url || cleaning.attachments?.[0]?.url,
    [cleaning.attachments]
  );

  // ✅ OPTIMIZACIÓN 5: Memoizar color de status
  const statusColorClass = useMemo(
    () => getStatusColor(cleaning.status),
    [cleaning.status]
  );

  // ✅ OPTIMIZACIÓN 6: Memoizar fecha y hora formateadas
  const formattedDate = useMemo(
    () => formatDate(cleaning.date),
    [cleaning.date]
  );

  const formattedTime = useMemo(
    () => formatTimeOnly(cleaning.scheduledTime),
    [cleaning.scheduledTime]
  );

  // ✅ OPTIMIZACIÓN 7: Memoizar arrays para evitar recrearlos
  const staffList: string[] = useMemo(
    () => Array.isArray(cleaning.staffList) ? cleaning.staffList : [],
    [cleaning.staffList]
  );

  const equipmentCount: number = cleaning.equipmentCount ?? 0;

  // ✅ OPTIMIZACIÓN 8: Memoizar clases CSS dinámicas
  const cardClassName = useMemo(
    () => `cursor-pointer transition-all duration-300 overflow-hidden border rounded-[28px] w-full flex flex-col h-full ${
      isDone
        ? 'bg-slate-50 border-slate-100 shadow-none opacity-70'
        : 'bg-white border-slate-100 hover:shadow-xl hover:border-[#00BCD4]/30 shadow-md'
    }`,
    [isDone]
  );

  const imageClassName = useMemo(
    () => `w-full h-full object-cover transition-transform duration-500 hover:scale-105 ${isDone ? 'opacity-50 grayscale-[0.4]' : ''}`,
    [isDone]
  );

  const titleClassName = useMemo(
    () => `font-extrabold text-[17px] tracking-tight leading-tight line-clamp-1 mb-1 ${isDone ? 'text-slate-400' : 'text-slate-900'}`,
    [isDone]
  );

  const addressClassName = useMemo(
    () => `text-[11px] font-medium leading-snug line-clamp-1 mb-3 ${isDone ? 'text-slate-300' : 'text-slate-400'}`,
    [isDone]
  );

  return (
    <Card className={cardClassName} onClick={onClick}>
      {/* Photo */}
      <div className="relative h-44 bg-slate-100 overflow-hidden shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            className={imageClassName}
            alt="Property"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-xs uppercase tracking-widest">
            Sin Foto
          </div>
        )}
        {cleaning.status && (
          <Badge className={`absolute top-3 right-3 px-2.5 py-1 text-[10px] font-black tracking-wider shadow border-none z-10 ${statusColorClass}`}>
            {isDone && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
            {cleaning.status.toUpperCase()}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 flex flex-col flex-grow">

        {/* Title */}
        <h3 className={titleClassName}>
          {cleaning.propertyText || 'Propiedad'}
        </h3>

        {/* Address */}
        {cleaning.address && (
          <p className={addressClassName}>
            📍 {cleaning.address}
          </p>
        )}

        <div className="mt-auto space-y-2.5">

          {/* Time + Date */}
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight border-t border-slate-100 pt-2.5">
            <div className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3 h-3" style={{ color: TEAL }} />
              <span>SCHED: <span className="text-slate-700">{formattedTime || '--:--'}</span></span>
            </div>
            <div className="flex items-center gap-1 text-slate-400 border-l border-slate-200 pl-3">
              <Calendar className="w-3 h-3" style={{ color: TEAL }} />
              <span className="text-slate-700">{formattedDate}</span>
            </div>
          </div>

          {/* Staff initials + Equipment count */}
          <div className="flex items-center justify-between border-t border-slate-50 pt-2">
            {/* Staff avatars */}
            <div className="flex items-center gap-1">
              {staffList.length > 0 ? (
                staffList.slice(0, 4).map((initials, i) => (
                  <div
                    key={`${initials}-${i}`}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: '#9C7FE8', marginLeft: i > 0 ? '-4px' : 0 }}
                  >
                    {initials}
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-slate-300 font-medium">Sin staff</span>
              )}
              {staffList.length > 4 && (
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black text-white bg-slate-300 -ml-1">
                  +{staffList.length - 4}
                </div>
              )}
            </div>

            {/* Equipment count */}
            {equipmentCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <Package className="w-3 h-3" style={{ color: TEAL }} />
                <span className="text-slate-600">{equipmentCount} equipo{equipmentCount !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

        </div>
      </CardContent>
    </Card>
  );
}, 
// ✅ OPTIMIZACIÓN 9: Comparación personalizada para memo
(prevProps, nextProps) => {
  // Solo re-renderizar si cambió el ID o el status (lo más común)
  return prevProps.cleaning.id === nextProps.cleaning.id &&
         prevProps.cleaning.status === nextProps.cleaning.status;
});

CleaningCard.displayName = 'CleaningCard';

export default CleaningCard;
