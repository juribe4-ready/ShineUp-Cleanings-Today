import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Home, Play, BarChart2, Flag, Camera, Star, BookOpen, Package, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from 'zite-file-upload-sdk';
import {
  getCleaningTasks,
  GetCleaningTasksOutputType,
  updateCleaningTime,
  uploadCleaningPhotos,
  GetCleaningsOutputType,
} from 'zite-endpoints-sdk';

type CleaningType = GetCleaningsOutputType[0];
type CleaningDetailsType = GetCleaningTasksOutputType['cleaning'];
type TaskType = GetCleaningTasksOutputType['tasks'][0];

interface Props {
  cleaning: CleaningType;
  onBack: () => void;
}

const TEAL = '#00BCD4';
const TEAL_DARK = '#0097A7';
const TEAL_LIGHT = '#E0F7FA';
const GREEN_ACTIVE = '#4CAF50';

type TabType = 'detalle' | 'inicio' | 'reporte' | 'cierre';

const fontLink = document.createElement('link');
fontLink.rel = 'stylesheet';
fontLink.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap';
if (!document.querySelector('link[href*="Poppins"]')) document.head.appendChild(fontLink);

export default function CleaningChecklist({ cleaning, onBack }: Props) {
  const [details, setDetails] = useState<CleaningDetailsType | null>(null);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('detalle');

  const detalleRef = useRef<HTMLDivElement>(null);
  const inicioRef = useRef<HTMLDivElement>(null);
  const reporteRef = useRef<HTMLDivElement>(null);
  const cierreRef = useRef<HTMLDivElement>(null);

  // Inicio
  const [videoThumb, setVideoThumb] = useState<string>('');
  const [rating, setRating] = useState<number>(0);
  const [isInProgress, setIsInProgress] = useState(false);
  const [startingCleaning, setStartingCleaning] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Reporte
  const [incidentComments, setIncidentComments] = useState('');
  const [inventoryComments, setInventoryComments] = useState('');
  const incidentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inventoryTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cierre
  const [closingPhotos, setClosingPhotos] = useState<{ url: string; name: string }[]>([]);
  const [uploadingClosing, setUploadingClosing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const closingInputRef = useRef<HTMLInputElement>(null);

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  useEffect(() => { loadDetails(); }, [cleaning.id]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const result = await getCleaningTasks({ cleaningId: cleaning.id });
      setDetails(result.cleaning);
      setTasks(result.tasks);
      setIsInProgress(result.cleaning.status === 'In Progress');
      if (result.cleaning.rating) setRating(result.cleaning.rating);
      if (result.cleaning.incidentComments) setIncidentComments(result.cleaning.incidentComments);
      if (result.cleaning.inventoryComments) setInventoryComments(result.cleaning.inventoryComments);
      if (result.cleaning.videoInicial) setVideoThumb(result.cleaning.videoInicial);
      if (result.cleaning.photosVideos?.length) {
        setClosingPhotos(result.cleaning.photosVideos.map((p: any) => ({ url: p.url || p, name: p.filename || 'archivo' })));
      }
    } catch {
      toast.error('Error al cargar la limpieza');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (tab: TabType) => {
    setActiveTab(tab);
    const refMap: Record<TabType, React.RefObject<HTMLDivElement>> = {
      detalle: detalleRef, inicio: inicioRef, reporte: reporteRef, cierre: cierreRef,
    };
    refMap[tab].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      toast.info('Subiendo archivo...');
      const result = await uploadFile({ data: file, filename: file.name });
      setVideoThumb(result.fileUrl);
      await updateCleaningTime({ cleaningId: cleaning.id, videoInicial: result.fileUrl } as any);
      toast.success('Video inicial guardado');
    } catch { toast.error('Error al subir'); }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleRating = async (value: number) => {
    setRating(value);
    try { await updateCleaningTime({ cleaningId: cleaning.id, rating: value } as any); }
    catch { toast.error('Error al guardar calificación'); }
  };

  const handleStart = async () => {
    setStartingCleaning(true);
    try {
      await updateCleaningTime({ cleaningId: cleaning.id, startTime: new Date().toISOString(), status: 'In Progress' });
      setIsInProgress(true);
      toast.success('¡Limpieza iniciada!');
      await loadDetails();
    } catch { toast.error('Error al iniciar'); }
    finally { setStartingCleaning(false); }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await updateCleaningTime({ cleaningId: cleaning.id, endTime: new Date().toISOString(), status: 'Done' });
      toast.success('¡Limpieza finalizada!');
      onBack();
    } catch { toast.error('Error al finalizar'); }
    finally { setFinishing(false); }
  };

  const handleIncidentChange = (val: string) => {
    setIncidentComments(val);
    if (incidentTimeout.current) clearTimeout(incidentTimeout.current);
    incidentTimeout.current = setTimeout(async () => {
      try { await updateCleaningTime({ cleaningId: cleaning.id, incidentComments: val } as any); } catch {}
    }, 1000);
  };

  const handleInventoryChange = (val: string) => {
    setInventoryComments(val);
    if (inventoryTimeout.current) clearTimeout(inventoryTimeout.current);
    inventoryTimeout.current = setTimeout(async () => {
      try { await updateCleaningTime({ cleaningId: cleaning.id, inventoryComments: val } as any); } catch {}
    }, 1000);
  };

  const handleClosingPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    // Capture file list immediately before any async work (the FileList can become null)
    const fileArray = Array.from(files);
    setUploadingClosing(true);
    try {
      const uploads = await Promise.all(fileArray.map(f => uploadFile({ data: f, filename: f.name })));
      const urls = uploads.map(r => r.fileUrl);
      await uploadCleaningPhotos({ cleaningId: cleaning.id, photoUrls: urls });
      setClosingPhotos(prev => [...prev, ...urls.map((url, i) => ({ url, name: fileArray[i]?.name || 'archivo' }))]);
      toast.success(`${fileArray.length} archivo(s) subido(s)`);
    } catch { toast.error('Error al subir'); }
    finally {
      setUploadingClosing(false);
      if (closingInputRef.current) closingInputRef.current.value = '';
    }
  };

  const toggleTask = (id: string) => {
    setCompletedTasks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const totalTasks = tasks.length;
  const doneTasks = completedTasks.size;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const formatTime = (v?: string) => {
    if (!v) return '--:--';
    try { return new Date(v).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); }
    catch { return '--:--'; }
  };

  const starLabels = ['Malo', 'Regular', 'Bueno'];

  const tabs: { key: TabType; label: string; Icon: any }[] = [
    { key: 'detalle', label: 'DETALLE',  Icon: Home },
    { key: 'inicio',  label: 'INICIO',   Icon: Play },
    { key: 'reporte', label: 'REPORTE',  Icon: BarChart2 },
    { key: 'cierre',  label: 'CIERRE',   Icon: Flag },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${TEAL_DARK}, ${TEAL})` }}>
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8]" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* ── STICKY HEADER ─────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-50 rounded-b-3xl shadow-xl"
        style={{ background: `linear-gradient(145deg, ${TEAL_DARK} 0%, ${TEAL} 60%, #26C6DA 100%)` }}
      >
        <div className="flex items-center justify-between px-4 pt-10 pb-3">
          {/* BOTÓN VOLVER MÁS NOTORIO */}
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95"
            style={{ background: 'rgba(255,255,255,0.95)', color: TEAL }}
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            <span>Volver</span>
          </button>
          
          {/* PROPERTY TEXT A LA DERECHA */}
          <div className="text-right">
            <span className="text-white font-black text-base tracking-tight block leading-tight">
              {(details?.propertyText || 'DILINI').toUpperCase()}
            </span>
            {/* CLEANING TYPE DEBAJO */}
            <p className="text-white/80 text-[10px] font-semibold uppercase tracking-wide mt-0.5">
              {details?.cleaningTypeText || 'Standard STR Turnover'}
            </p>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex justify-between text-white/80 text-[10px] font-bold mb-1 uppercase tracking-wide">
            <span>Progreso de Tareas</span>
            <span>{doneTasks} / {totalTasks}</span>
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%`, background: progress === 100 ? '#00E676' : 'rgba(255,255,255,0.9)' }} />
          </div>
        </div>

        <div className="grid grid-cols-4">
          {tabs.map(({ key, label, Icon }) => {
            const active = activeTab === key;
            return (
              <button key={key} onClick={() => scrollToSection(key)} className="flex flex-col items-center py-2.5 transition-all">
                <Icon className="w-5 h-5 mb-0.5" style={{ color: active ? 'white' : 'rgba(255,255,255,0.4)', strokeWidth: active ? 2.5 : 1.5 }} />
                <span className="text-[9px] font-black tracking-widest" style={{ color: active ? 'white' : 'rgba(255,255,255,0.4)' }}>{label}</span>
                {active && <div className="w-6 h-0.5 rounded-full mt-1" style={{ background: '#00E676' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-24 space-y-6">

        {/* DETALLE */}
        <div ref={detalleRef}>
          <SectionTitle>DETALLE</SectionTitle>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-base mt-0.5">📍</span>
                <p className="font-bold text-slate-800 text-[14px] leading-snug">{details?.address || 'Sin dirección'}</p>
              </div>
              {details?.googleMapsUrl && (
                <a 
                  href={details.googleMapsUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 transition-all active:scale-95 shadow-sm"
                  style={{ background: TEAL, color: 'white' }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="text-[11px] font-black tracking-wide">IR</span>
                </a>
              )}
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-100">
              {[
                { label: 'HORA SCHEDULED', value: formatTime(details?.scheduledTime), bold: true },
                { label: 'INICIO REAL',    value: formatTime(details?.startTime) },
                { label: 'TÉRMINO REAL',   value: formatTime(details?.endTime) },
              ].map(({ label, value, bold }) => (
                <div key={label} className="flex justify-between items-center px-4 py-3 border-b border-slate-50 last:border-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                  <span className={`text-[14px] ${bold ? 'font-black text-slate-900' : 'font-bold text-slate-500'}`}>{value}</span>
                </div>
              ))}
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full text-[12px] font-black" style={{ background: TEAL_LIGHT, color: TEAL }}>
                {details?.cleaningTypeText || 'Standard STR Turnover'}
              </span>
            </div>

            {details?.assignedStaffNames?.length ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: TEAL_LIGHT }}>
                  <span style={{ color: TEAL }}>👥</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Personal Asignado</p>
                  <p className="font-bold text-slate-800 text-[14px]">{details.assignedStaffNames.join(', ')}</p>
                </div>
              </div>
            ) : null}

            {details?.equipment?.length ? (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: TEAL_LIGHT }}>
                  <Package className="w-4 h-4" style={{ color: TEAL }} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Equipamiento</p>
                  <div className="space-y-2">
                    {details.equipment.map((eq, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: '#F3F0FF' }}>
                        <span className="text-[13px] font-semibold text-slate-700">{eq.text}</span>
                        <span className="text-[12px] font-black" style={{ color: '#9C7FE8' }}>{eq.code}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* INICIO */}
        <div ref={inicioRef}>
          <SectionTitle>INICIO</SectionTitle>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-6">

            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px]" style={{ background: TEAL }}>1</div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[15px] mb-0.5">Sube el video inicial</p>
                <p className="text-[12px] text-slate-400 mb-3">Registra cómo encontraste la propiedad al ingresar</p>
                {videoThumb && (
                  <div className="mb-3">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-100" style={{ borderColor: TEAL }}>
                      <img src={videoThumb} alt="video" className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="text-xl">🎥</span></div>
                      <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  </div>
                )}
                <input ref={videoInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleVideoUpload} />
                <button onClick={() => videoInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-[13px] font-bold transition-all"
                  style={{ borderColor: TEAL, color: TEAL, background: videoThumb ? TEAL_LIGHT : 'transparent' }}>
                  <Camera className="w-4 h-4" /> Seleccionar video / foto
                </button>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px]"
                style={{ background: rating > 0 ? GREEN_ACTIVE : TEAL }}>
                {rating > 0 ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[15px] mb-0.5">Califica el estado de la propiedad</p>
                <p className="text-[12px] text-slate-400 mb-3">Selecciona de 1 a 3 estrellas según las condiciones al llegar</p>
                <div className="flex items-center gap-4">
                  {[1, 2, 3].map(v => (
                    <button key={v} onClick={() => handleRating(v)} className="flex flex-col items-center gap-1 transition-transform active:scale-90">
                      <Star className="w-10 h-10"
                        fill={rating >= v ? '#FFD700' : 'none'}
                        stroke={rating >= v ? '#FFD700' : '#CBD5E1'}
                        strokeWidth={1.5} />
                      <span className="text-[11px] text-slate-400 font-semibold">{starLabels[v - 1]}</span>
                    </button>
                  ))}
                  {rating > 0 && <span className="text-[20px] font-black ml-1" style={{ color: TEAL }}>{rating}/3</span>}
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px]"
                style={{ background: isInProgress ? GREEN_ACTIVE : TEAL }}>
                {isInProgress ? '✓' : '3'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[15px] mb-3">Inicia la limpieza</p>
                {!isInProgress ? (
                  <button onClick={handleStart} disabled={startingCleaning}
                    className="w-full py-4 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    style={{ background: '#00E676' }}>
                    {startingCleaning
                      ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <><Play className="w-4 h-4" fill="white" /> EMPEZAR LIMPIEZA</>}
                  </button>
                ) : (
                  <div className="w-full py-3 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-2" style={{ background: '#00C853' }}>
                    <CheckCircle2 className="w-4 h-4" /> Limpieza en progreso
                  </div>
                )}
              </div>
            </div>
          </div>

          {isInProgress && tasks.length > 0 && (
            <div className="mt-3">
              <TaskChecklist tasks={tasks} completedTasks={completedTasks} onToggle={toggleTask} />
            </div>
          )}
        </div>

        {/* REPORTE */}
        <div ref={reporteRef}>
          <SectionTitle>REPORTE</SectionTitle>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <p className="font-bold text-slate-800 text-[14px] leading-snug">
              Reportar los faltantes de inventario y las incidencias en cada una de sus respectivas casillas
            </p>
            {details?.bookUrl && (
              <a href={details.bookUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-bold transition-all active:scale-95"
                style={{ background: TEAL_LIGHT, color: TEAL }}>
                <BookOpen className="w-4 h-4" /> Ver Book de la propiedad
              </a>
            )}
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reportar Incidentes</p>
              <textarea value={incidentComments} onChange={e => handleIncidentChange(e.target.value)}
                disabled={!isInProgress}
                placeholder="Describe aquí cualquier incidente o novedad encontrada..."
                rows={4}
                className="w-full p-3 text-[13px] rounded-xl border border-slate-200 bg-white outline-none focus:border-teal-400 transition-all resize-none"
                style={{ fontFamily: "'Poppins', sans-serif", color: '#334155' }} />
              {!isInProgress && <p className="text-[11px] text-slate-400 mt-1 text-center">Inicia la limpieza para reportar incidentes</p>}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Reportar Inventario</p>
              <textarea value={inventoryComments} onChange={e => handleInventoryChange(e.target.value)}
                disabled={!isInProgress}
                placeholder="Registra faltantes o novedades de inventario..."
                rows={4}
                className="w-full p-3 text-[13px] rounded-xl border border-slate-200 bg-white outline-none focus:border-teal-400 transition-all resize-none"
                style={{ fontFamily: "'Poppins', sans-serif", color: '#334155' }} />
              {!isInProgress && <p className="text-[11px] text-slate-400 mt-1 text-center">Inicia la limpieza para reportar inventario</p>}
            </div>
          </div>
        </div>

        {/* CIERRE */}
        <div ref={cierreRef}>
          <SectionTitle>CIERRE</SectionTitle>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <p className="font-bold text-slate-800 text-[15px] leading-snug">
              Antes de terminar la limpieza, verifica que todo esté conforme al Book.
            </p>
            <div className="space-y-2">
              {[
                'Carga foto o video dependiendo de la propiedad, este detalle lo dice el book',
                'Cierra la limpieza (Botón rojo finish)',
              ].map((text, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[12px]" style={{ background: TEAL }}>{i + 1}</div>
                  <p className="text-[13px] text-slate-500 pt-1 leading-snug">{text}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fotos y Videos</p>
              {closingPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {closingPhotos.map((photo, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-100" style={{ borderColor: TEAL }}>
                      <img src={photo.url} alt={photo.name} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="text-xl">📷</span></div>
                      <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <input ref={closingInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleClosingPhotos} />
              <button
                onClick={() => isInProgress && closingInputRef.current?.click()}
                disabled={!isInProgress || uploadingClosing}
                className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-[13px] font-bold transition-all"
                style={{
                  borderColor: isInProgress ? '#94A3B8' : '#CBD5E1',
                  color: isInProgress ? '#64748B' : '#CBD5E1',
                  background: 'transparent',
                  cursor: isInProgress ? 'pointer' : 'not-allowed',
                }}>
                <Camera className="w-4 h-4" />
                {uploadingClosing ? 'Subiendo...' : 'Subir fotos / videos'}
              </button>
              {!isInProgress && <p className="text-[11px] text-slate-400 mt-1 text-center">Inicia la limpieza para subir fotos</p>}
            </div>

            <button onClick={handleFinish} disabled={!isInProgress || finishing}
              className="w-full py-4 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              style={{ background: isInProgress ? '#F44336' : '#BDBDBD', cursor: isInProgress ? 'pointer' : 'not-allowed' }}>
              {finishing
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : '🏁 FINISH LIMPIEZA'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded-full" style={{ background: '#00BCD4' }} />
      <span className="text-[13px] font-black tracking-widest uppercase" style={{ color: '#00BCD4' }}>{children}</span>
    </div>
  );
}

function TaskChecklist({ tasks, completedTasks, onToggle }: {
  tasks: TaskType[];
  completedTasks: Set<string>;
  onToggle: (id: string) => void;
}) {
  const grouped = tasks.reduce<Record<string, TaskType[]>>((acc, t) => {
    const g = t.taskGroup || 'General';
    if (!acc[g]) acc[g] = [];
    acc[g].push(t);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100">
        <span className="font-black text-slate-800 text-[13px]">Checklist — {completedTasks.size}/{tasks.length} completadas</span>
      </div>
      <div className="px-4 py-3 space-y-4">
        {Object.entries(grouped).map(([group, groupTasks]) => (
          <div key={group}>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{group}</p>
            <div className="space-y-1">
              {groupTasks.map(task => {
                const done = completedTasks.has(task.id);
                return (
                  <label key={task.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <div onClick={() => onToggle(task.id)}
                      className="w-5 h-5 rounded-md border-2 shrink-0 mt-0.5 flex items-center justify-center transition-all"
                      style={{ borderColor: done ? '#00E676' : '#CBD5E1', background: done ? '#00E676' : 'white' }}>
                      {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-[13px] leading-snug ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                      {task.taskName}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}