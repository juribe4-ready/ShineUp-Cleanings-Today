import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Home, Play, BarChart2, Flag, Camera, Star, BookOpen, Package, CheckCircle2, MessageSquare, Plus, X, AlertCircle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { uploadFile } from 'zite-file-upload-sdk';
import {
  getCleaningTasks,
  GetCleaningTasksOutputType,
  updateCleaningTime,
  uploadCleaningPhotos,
  GetCleaningsOutputType,
  getIncidents,
  createIncident,
  getInventory,
  addInventory,
} from 'zite-endpoints-sdk';

type CleaningType = GetCleaningsOutputType[0];
type CleaningDetailsType = GetCleaningTasksOutputType['cleaning'];
type TaskType = GetCleaningTasksOutputType['tasks'][0];
type InventoryRecord = { id: string; inventoryId?: string; status: string; comment?: string; date?: string; photoUrls: string[]; reportedBy?: string; };
type Incident = { id: string; name: string; status: string; creationDate?: string; comment?: string; photoUrls: string[]; reportedBy?: string; };

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

  const [videoThumbs, setVideoThumbs] = useState<string[]>([]);
  const [editableInstructions, setEditableInstructions] = useState('');
  const [openComments, setOpenComments] = useState('');
  const [openCommentsSaved, setOpenCommentsSaved] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [isInProgress, setIsInProgress] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [startingCleaning, setStartingCleaning] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [newIncName, setNewIncName] = useState('');
  const [newIncComment, setNewIncComment] = useState('');
  const [newIncPhotos, setNewIncPhotos] = useState<string[]>([]);
  const [savingIncident, setSavingIncident] = useState(false);
  const [uploadingIncPhoto, setUploadingIncPhoto] = useState(false);
  const incPhotoRef = useRef<HTMLInputElement>(null);

  const [inventoryRecords, setInventoryRecords] = useState<InventoryRecord[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<InventoryRecord | null>(null);
  const [showNewInventory, setShowNewInventory] = useState(false);
  const [newInvStatus, setNewInvStatus] = useState<'Low' | 'Out of Stock'>('Low');
  const [newInvComment, setNewInvComment] = useState('');
  const [newInvPhotos, setNewInvPhotos] = useState<string[]>([]);
  const [savingInventory, setSavingInventory] = useState(false);
  const [uploadingInvPhoto, setUploadingInvPhoto] = useState(false);
  const invPhotoRef = useRef<HTMLInputElement>(null);

  const [closingPhotos, setClosingPhotos] = useState<{ url: string; name: string }[]>([]);
  const [uploadingClosing, setUploadingClosing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const closingInputRef = useRef<HTMLInputElement>(null);

  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  useEffect(() => { loadDetails(); }, [cleaning.id]);

  useEffect(() => {
    const onScroll = () => {
      const offset = 220;
      const sections = [
        { key: 'cierre' as TabType, ref: cierreRef },
        { key: 'reporte' as TabType, ref: reporteRef },
        { key: 'inicio' as TabType, ref: inicioRef },
        { key: 'detalle' as TabType, ref: detalleRef },
      ];
      for (const s of sections) {
        if (s.ref.current && s.ref.current.getBoundingClientRect().top <= offset) {
          setActiveTab(s.key);
          break;
        }
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const loadIncidents = async (propId?: string) => {
    setIncidentsLoading(true);
    try {
      const result = await getIncidents({ propertyId: propId });
      setIncidents(result as any);
    } catch { }
    finally { setIncidentsLoading(false); }
  };

  const loadInventory = async (propId?: string) => {
    setInventoryLoading(true);
    try {
      const result = await getInventory({ propertyId: propId });
      setInventoryRecords(result as any);
    } catch { }
    finally { setInventoryLoading(false); }
  };

  const loadDetails = async () => {
    try {
      setLoading(true);
      const result = await getCleaningTasks({ cleaningId: cleaning.id });
      setDetails(result.cleaning);
      setTasks(result.tasks);
      setIsInProgress(result.cleaning.status === 'In Progress');
      setIsDone(result.cleaning.status === 'Done');
      if (result.cleaning.rating) setRating(result.cleaning.rating);
      if (result.cleaning.videoInicial?.length) setVideoThumbs(result.cleaning.videoInicial as any);
      setEditableInstructions((result.cleaning as any).initialComments || '');
      setOpenComments((result.cleaning as any).openComments || '');
      if (result.cleaning.videoInicial?.length) setOpenCommentsSaved(true);
      if (result.cleaning.photosVideos?.length) {
        setClosingPhotos(result.cleaning.photosVideos.map((p: any) => ({ url: p.url || p, name: p.filename || 'archivo' })));
      }
      const propId = (result.cleaning as any).propertyId;
      loadIncidents(propId);
      loadInventory(propId);
    } catch {
      toast.error('Error al cargar la limpieza');
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (tab: TabType) => {
    setActiveTab(tab);
    const refMap: Record<TabType, { current: HTMLDivElement | null }> = {
      detalle: detalleRef, inicio: inicioRef, reporte: reporteRef, cierre: cierreRef,
    };
    const element = refMap[tab].current;
    if (element) {
      const offsetPosition = element.getBoundingClientRect().top + window.pageYOffset - 200;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileArray = Array.from(files);
    try {
      toast.info(`Subiendo ${fileArray.length} archivo(s)...`);
      const uploads = await Promise.all(fileArray.map(f => uploadFile({ data: f, filename: f.name })));
      const urls = uploads.map(r => r.fileUrl);
      await updateCleaningTime({ cleaningId: cleaning.id, videoInicialUrls: urls, status: 'Opened' } as any);
      setVideoThumbs(prev => [...prev, ...urls]);
      toast.success(`${fileArray.length} archivo(s) subido(s)`);
    } catch { toast.error('Error al subir'); }
    if (videoInputRef.current) videoInputRef.current.value = '';
  };

  const handleRating = async (value: number) => {
    setRating(value);
    try { await updateCleaningTime({ cleaningId: cleaning.id, rating: value } as any); }
    catch { toast.error('Error al guardar'); }
  };

  const handleStart = async () => {
    setStartingCleaning(true);
    try {
      await updateCleaningTime({ cleaningId: cleaning.id, startTime: new Date().toISOString(), status: 'In Progress' });
      setIsInProgress(true);
      toast.success('Limpieza iniciada!');
      setTimeout(() => scrollToSection('reporte'), 300);
    } catch { toast.error('Error al iniciar'); }
    finally { setStartingCleaning(false); }
  };

  const handleFinish = async () => {
    setFinishing(true);
    try {
      await updateCleaningTime({ cleaningId: cleaning.id, endTime: new Date().toISOString(), status: 'Done' });
      setIsDone(true);
      toast.success('Limpieza finalizada!');
      onBack();
    } catch { toast.error('Error al finalizar'); }
    finally { setFinishing(false); }
  };

  const handleClosingPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
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

  const handleInvPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileArray = Array.from(files);
    setUploadingInvPhoto(true);
    try {
      const uploads = await Promise.all(fileArray.map(f => uploadFile({ data: f, filename: f.name })));
      setNewInvPhotos(prev => [...prev, ...uploads.map(r => r.fileUrl)]);
    } catch { toast.error('Error al subir foto'); }
    finally {
      setUploadingInvPhoto(false);
      if (invPhotoRef.current) invPhotoRef.current.value = '';
    }
  };

  const handleSaveInventory = async () => {
    setSavingInventory(true);
    const optimistic: InventoryRecord = {
      id: `tmp-${Date.now()}`,
      status: newInvStatus,
      comment: newInvComment.trim(),
      date: new Date().toISOString(),
      photoUrls: newInvPhotos,
      reportedBy: '',
    };
    setInventoryRecords(prev => [optimistic, ...prev]);
    setShowNewInventory(false);
    const savedComment = newInvComment;
    const savedStatus = newInvStatus;
    const savedPhotos = newInvPhotos;
    setNewInvStatus('Low');
    setNewInvComment('');
    setNewInvPhotos([]);
    try {
      await addInventory({
        status: savedStatus,
        comment: savedComment.trim(),
        propertyId: (details as any)?.propertyId || '',
        cleaningId: cleaning.id,
        photoUrls: savedPhotos,
      });
      toast.success('Inventario registrado');
    } catch (err: any) {
      toast.error('Error: ' + (err?.message || 'desconocido'));
      setInventoryRecords(prev => prev.filter(r => r.id !== optimistic.id));
    }
    finally { setSavingInventory(false); }
  };

  const handleIncidentPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const fileArray = Array.from(files);
    setUploadingIncPhoto(true);
    try {
      const uploads = await Promise.all(fileArray.map(f => uploadFile({ data: f, filename: f.name })));
      setNewIncPhotos(prev => [...prev, ...uploads.map(r => r.fileUrl)]);
    } catch { toast.error('Error al subir foto'); }
    finally {
      setUploadingIncPhoto(false);
      if (incPhotoRef.current) incPhotoRef.current.value = '';
    }
  };

  const handleSaveIncident = async () => {
    if (!newIncName.trim()) { toast.error('Escribe un nombre para el incidente'); return; }
    setSavingIncident(true);
    try {
      const propId = (details as any)?.propertyId || '';
      const created = await createIncident({
        name: newIncName.trim(),
        comment: newIncComment.trim(),
        propertyId: propId,
        cleaningId: cleaning.id,
        photoUrls: newIncPhotos,
      }) as any;
      setIncidents(prev => [created, ...prev]);
      setShowNewIncident(false);
      setNewIncName('');
      setNewIncComment('');
      setNewIncPhotos([]);
      toast.success('Incidente registrado');
    } catch { toast.error('Error al guardar incidente'); }
    finally { setSavingIncident(false); }
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
    { key: 'detalle', label: 'DETALLE', Icon: Home },
    { key: 'inicio',  label: 'INICIO',  Icon: Play },
    { key: 'reporte', label: 'REPORTE', Icon: BarChart2 },
    { key: 'cierre',  label: 'CIERRE',  Icon: Flag },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(145deg, ${TEAL_DARK}, ${TEAL})` }}>
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F4F8]" style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* STICKY HEADER */}
      <div className="sticky top-0 z-50 rounded-b-3xl shadow-xl"
        style={{ background: `linear-gradient(145deg, ${TEAL_DARK} 0%, ${TEAL} 60%, #26C6DA 100%)` }}>
        <div className="flex items-center justify-between px-4 pt-10 pb-3">
          <button onClick={onBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-transform active:scale-95"
            style={{ background: 'rgba(255,255,255,0.95)', color: TEAL }}>
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            <span>Volver</span>
          </button>
          <div className="text-right">
            <span className="text-white font-black text-base tracking-tight block leading-tight">
              {(details?.propertyText || 'ShineUP').toUpperCase()}
            </span>
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

      {/* CONTENT */}
      <div className="px-4 pt-5 pb-24 space-y-6">

        {/* DETALLE */}
        <div ref={detalleRef}>
          <SectionTitle>DETALLE</SectionTitle>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-base mt-0.5">📍</span>
                <div>
                  <p className="font-bold text-slate-800 text-[14px] leading-snug">{details?.propertyText || details?.address || 'Sin direccion'}</p>
                  {details?.propertyText && details?.address && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{details.address}</p>
                  )}
                </div>
              </div>
              {details?.googleMapsUrl && (
                <a href={details.googleMapsUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0 transition-all active:scale-95 shadow-sm"
                  style={{ background: TEAL, color: 'white' }}>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="text-[11px] font-black tracking-wide">IR</span>
                </a>
              )}
            </div>
            {details?.bookUrl && (
              <a href={details.bookUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-[13px] font-black transition-all active:scale-95 shadow-md"
                style={{ background: TEAL_LIGHT, color: TEAL }}>
                <BookOpen className="w-4 h-4" /> Ver Book de la Propiedad
              </a>
            )}
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-2 font-bold text-slate-400 uppercase tracking-wide"></th>
                    <th className="text-center px-3 py-2 font-black text-slate-600 uppercase tracking-wide">Progr.</th>
                    <th className="text-center px-3 py-2 font-black text-slate-600 uppercase tracking-wide">Real</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wide">HORA INICIO</td>
                    <td className="px-3 py-3 text-center font-black text-slate-900">{formatTime(details?.scheduledTime)}</td>
                    <td className="px-3 py-3 text-center font-bold text-slate-500">{formatTime(details?.startTime)}</td>
                  </tr>
                  <tr className="border-t border-slate-100">
                    <td className="px-4 py-3 font-semibold text-slate-400 uppercase tracking-wide">HORA FIN</td>
                    <td className="px-3 py-3 text-center font-black text-slate-900">
                      {details?.scheduledTime
                        ? formatTime(new Date(new Date(details.scheduledTime).getTime() + 90 * 60000).toISOString())
                        : '--:--'}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-500">{formatTime(details?.endTime)}</td>
                  </tr>
                </tbody>
              </table>
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
        <div ref={inicioRef} style={{ filter: isDone ? 'grayscale(1)' : 'none', opacity: isDone ? 0.5 : 1, pointerEvents: isDone ? 'none' : 'auto', transition: 'all 0.3s' }}>
          <SectionTitle>INICIO</SectionTitle>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-6">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px]" style={{ background: TEAL }}>1</div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[15px] mb-0.5">Sube el video inicial</p>
                <p className="text-[12px] text-slate-400 mb-3">Registra como encontraste la propiedad al ingresar</p>
                {videoThumbs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {videoThumbs.map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 bg-slate-100" style={{ borderColor: TEAL }}>
                        <img src={url} alt="video" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10"><span className="text-xl">🎥</span></div>
                        <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={videoInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleVideoUpload} />
                <button onClick={() => !isDone && videoInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-[13px] font-bold transition-all"
                  style={{ borderColor: TEAL, color: TEAL, background: videoThumbs.length > 0 ? TEAL_LIGHT : 'transparent' }}>
                  <Camera className="w-4 h-4" /> Seleccionar video / foto
                </button>
              </div>
            </div>
            <div className="h-px bg-slate-100" />

            {/* INSTRUCCIONES */}
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-white" style={{ background: '#FF9800' }}>
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 space-y-2">

                {/* InitialComments - solo lectura */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Instrucciones iniciales</p>
                  <div className="rounded-xl px-3 py-2 bg-slate-50 border border-slate-100">
                    <p className="text-[12px] text-slate-500 leading-relaxed">{editableInstructions || 'Sin instrucciones'}</p>
                  </div>
                </div>

                {/* OpenComments - editable con video */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    Notas de apertura
                    {videoThumbs.length > 0 && !openCommentsSaved && <span className="ml-1 text-amber-400">— se guarda al salir</span>}
                  </p>
                  <textarea
                    value={openComments}
                    onChange={e => { setOpenComments(e.target.value); setOpenCommentsSaved(false); }}
                    onBlur={async () => {
                      if (!openCommentsSaved && videoThumbs.length > 0) {
                        try {
                          await updateCleaningTime({ cleaningId: cleaning.id, initialComments: openComments } as any);
                          setOpenCommentsSaved(true);
                        } catch { toast.error('Error al guardar'); }
                      }
                    }}
                    disabled={videoThumbs.length === 0 || openCommentsSaved}
                    rows={2}
                    placeholder={videoThumbs.length === 0 ? 'Sube el video para habilitar...' : 'Agrega notas...'}
                    className="w-full px-3 py-2 text-[12px] rounded-xl border transition-all resize-none outline-none"
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      borderColor: videoThumbs.length === 0 ? '#E2E8F0' : openCommentsSaved ? '#E2E8F0' : '#FF9800',
                      background: videoThumbs.length === 0 || openCommentsSaved ? '#F8FAFC' : '#FFFBF5',
                      color: videoThumbs.length > 0 ? '#1E293B' : '#94A3B8',
                      cursor: videoThumbs.length === 0 || openCommentsSaved ? 'default' : 'text',
                    }}
                  />
                  {videoThumbs.length > 0 && openCommentsSaved && (
                    <button onClick={() => setOpenCommentsSaved(false)}
                      className="mt-1 px-3 py-1 rounded-lg text-[11px] font-bold transition-all active:scale-95"
                      style={{ background: '#E0F7FA', color: TEAL }}>
                      Modificar
                    </button>
                  )}
                </div>

              </div>
            </div>
            <div className="h-px bg-slate-100" />
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px]"
                style={{ background: rating > 0 ? GREEN_ACTIVE : TEAL }}>
                {rating > 0 ? '✓' : '2'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[15px] mb-0.5">Califica el estado de la propiedad</p>
                <p className="text-[12px] text-slate-400 mb-3">Selecciona de 1 a 3 estrellas</p>
                <div className="flex items-center gap-4">
                  {[1, 2, 3].map(v => (
                    <button key={v} onClick={() => !isDone && handleRating(v)} className="flex flex-col items-center gap-1 transition-transform active:scale-90">
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
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-black text-[13px]"
                style={{ background: isInProgress ? GREEN_ACTIVE : TEAL }}>
                {isInProgress ? '✓' : '3'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800 text-[15px] mb-3">Inicia la limpieza</p>
                {!isInProgress && !isDone ? (
                  <button onClick={handleStart} disabled={startingCleaning}
                    className="w-full py-4 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                    style={{ background: '#00E676' }}>
                    {startingCleaning
                      ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      : <><Play className="w-4 h-4" fill="white" /> EMPEZAR LIMPIEZA</>}
                  </button>
                ) : isDone ? (
                  <div className="w-full py-3 rounded-2xl text-white font-bold text-[13px] flex items-center justify-center gap-2" style={{ background: '#00C853' }}>
                    <CheckCircle2 className="w-4 h-4" /> Limpieza completada
                  </div>
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

          {/* INVENTARIO DEL CLIENTE */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-3">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-[13px] font-black text-slate-800">Inventario del Cliente</span>
              <button onClick={() => isInProgress && setShowNewInventory(true)} disabled={!isInProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[12px] font-bold transition-all active:scale-95"
                style={{ background: isInProgress ? TEAL : '#CBD5E1' }}>
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </button>
            </div>
            <div style={{ pointerEvents: isInProgress ? 'auto' : 'none', opacity: isInProgress ? 1 : 0.55 }}>
              {inventoryLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-400 rounded-full animate-spin" />
                </div>
              ) : inventoryRecords.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <Package className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-[12px]">Sin registros de inventario</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {inventoryRecords.map(rec => (
                    <button key={rec.id} onClick={() => setSelectedInventory(rec)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: rec.status === 'Out of Stock' ? '#EF4444' : '#F59E0B' }} />
                      <span className="flex-1 text-[13px] font-semibold text-slate-700 truncate">{rec.comment || rec.status}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {rec.date && (
                          <span className="text-[10px] text-slate-400">
                            {new Date(rec.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          rec.status === 'Out of Stock' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
                        }`}>{rec.status}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {!isInProgress && <p className="text-[10px] text-slate-400 text-center pb-3">Inicia la limpieza para registrar</p>}
          </div>

          {/* INCIDENTES */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-[13px] font-black text-slate-800">Incidentes</span>
              <button onClick={() => isInProgress && setShowNewIncident(true)} disabled={!isInProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-[12px] font-bold transition-all active:scale-95"
                style={{ background: isInProgress ? TEAL : '#CBD5E1' }}>
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </button>
            </div>
            <div style={{ pointerEvents: isInProgress ? 'auto' : 'none', opacity: isInProgress ? 1 : 0.55 }}>
              {incidentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-teal-400 rounded-full animate-spin" />
                </div>
              ) : incidents.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-slate-400">
                  <AlertCircle className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-[12px]">Sin incidentes registrados</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {incidents.map(inc => {
                    const isOpen = inc.status !== 'Closed';
                    return (
                      <button key={inc.id} onClick={() => setSelectedIncident(inc)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: isOpen ? '#FBA730' : '#CBD5E1' }} />
                        <span className="flex-1 text-[13px] font-semibold text-slate-700 truncate">{inc.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {inc.creationDate && (
                            <span className="text-[10px] text-slate-400">
                              {new Date(inc.creationDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            inc.status === 'Reported' ? 'bg-amber-50 text-amber-600' :
                            inc.status === 'In Progress' ? 'bg-blue-50 text-blue-600' :
                            inc.status === 'Closed' ? 'bg-green-50 text-green-600' :
                            'bg-slate-100 text-slate-400'
                          }`}>{inc.status}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {!isInProgress && <p className="text-[10px] text-slate-400 text-center pb-3">Inicia la limpieza para interactuar</p>}
          </div>
        </div>

        {/* CIERRE */}
        <div ref={cierreRef} style={{ filter: isDone ? 'grayscale(1)' : 'none', opacity: isDone ? 0.5 : 1, pointerEvents: isDone ? 'none' : 'auto', transition: 'all 0.3s' }}>
          <SectionTitle>CIERRE</SectionTitle>
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <p className="font-bold text-slate-800 text-[15px] leading-snug">
              Antes de terminar la limpieza, verifica que todo este conforme al Book.
            </p>
            <div className="space-y-2">
              {[
                'Carga foto o video dependiendo de la propiedad, este detalle lo dice el book',
                'Cierra la limpieza (Boton rojo finish)',
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
              <button onClick={() => isInProgress && !isDone && closingInputRef.current?.click()}
                disabled={!isInProgress || uploadingClosing || isDone}
                className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-[13px] font-bold transition-all"
                style={{
                  borderColor: isInProgress && !isDone ? '#94A3B8' : '#CBD5E1',
                  color: isInProgress && !isDone ? '#64748B' : '#CBD5E1',
                  background: 'transparent',
                  cursor: isInProgress && !isDone ? 'pointer' : 'not-allowed',
                }}>
                <Camera className="w-4 h-4" />
                {uploadingClosing ? 'Subiendo...' : (
                  (details as any)?.closingMediaType?.toLowerCase().includes('photo') ? 'Subir Fotos' :
                  (details as any)?.closingMediaType?.toLowerCase().includes('video') ? 'Subir Videos' :
                  'Subir fotos / videos'
                )}
              </button>
              {!isInProgress && !isDone && <p className="text-[11px] text-slate-400 mt-1 text-center">Inicia la limpieza para subir fotos</p>}
              {isDone && <p className="text-[11px] text-green-500 mt-1 text-center font-bold">Limpieza completada</p>}
            </div>
            <button onClick={handleFinish} disabled={!isInProgress || finishing || isDone}
              className="w-full py-4 rounded-2xl text-white font-black text-[15px] flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
              style={{ background: isDone ? '#00C853' : isInProgress ? '#F44336' : '#BDBDBD', cursor: isInProgress && !isDone ? 'pointer' : 'not-allowed' }}>
              {isDone
                ? <><CheckCircle2 className="w-5 h-5" /> LIMPIEZA TERMINADA</>
                : finishing
                ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : '🏁 TERMINAR LIMPIEZA'}
            </button>
          </div>
        </div>

      </div>

      {/* INCIDENT DETAIL MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSelectedIncident(null)}>
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="relative px-4 pt-4 pb-3" style={{ background: '#F1F5F9' }}>
              <button onClick={() => setSelectedIncident(null)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <X className="w-3 h-3 text-slate-400" />
              </button>
              <p className="font-black text-[15px] pr-7 text-slate-800">{selectedIncident.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedIncident.status === 'Reported' ? 'bg-amber-100 text-amber-600' :
                  selectedIncident.status === 'In Progress' ? 'bg-blue-100 text-blue-600' :
                  selectedIncident.status === 'Closed' ? 'bg-green-100 text-green-600' :
                  'bg-slate-200 text-slate-500'
                }`}>{selectedIncident.status}</span>
                {selectedIncident.creationDate && (
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedIncident.creationDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {selectedIncident.reportedBy && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wide shrink-0" style={{ color: TEAL }}>Reportado por</span>
                  <span className="text-[12px] font-semibold text-slate-700">{selectedIncident.reportedBy}</span>
                </div>
              )}
              {selectedIncident.comment && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide block mb-0.5" style={{ color: TEAL }}>Descripcion</span>
                  <span className="text-[12px] text-slate-600 leading-relaxed">{selectedIncident.comment}</span>
                </div>
              )}
              {selectedIncident.photoUrls.length > 0 && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide block mb-1.5" style={{ color: TEAL }}>Fotos</span>
                  <div className="flex gap-2 flex-wrap">
                    {selectedIncident.photoUrls.map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0"
                        style={{ border: `1.5px solid ${TEAL_LIGHT}` }}>
                        <img src={url} alt="foto" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW INCIDENT MODAL */}
      {showNewIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowNewIncident(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-black text-slate-800 text-[15px]">Nuevo Incidente</span>
              <button onClick={() => setShowNewIncident(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Nombre *</p>
                <input type="text" value={newIncName} onChange={e => setNewIncName(e.target.value)}
                  placeholder="ej. Lavabo roto, Mancha en pared..."
                  className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 outline-none focus:border-teal-400 transition-all"
                  style={{ fontFamily: "'Poppins', sans-serif" }} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Descripcion</p>
                <textarea value={newIncComment} onChange={e => setNewIncComment(e.target.value)}
                  placeholder="Describe el incidente en detalle..."
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 outline-none focus:border-teal-400 transition-all resize-none"
                  style={{ fontFamily: "'Poppins', sans-serif" }} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Fotos</p>
                {newIncPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {newIncPhotos.map((url, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={url} alt="foto" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <button onClick={() => setNewIncPhotos(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={incPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleIncidentPhotoUpload} />
                <button onClick={() => incPhotoRef.current?.click()} disabled={uploadingIncPhoto}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-300 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-slate-400 transition-all">
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingIncPhoto ? 'Subiendo...' : 'Agregar fotos'}
                </button>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button onClick={handleSaveIncident} disabled={savingIncident}
                className="w-full py-3 rounded-xl text-white font-black text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: TEAL }}>
                {savingIncident
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : 'Guardar Incidente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INVENTORY DETAIL MODAL */}
      {selectedInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setSelectedInventory(null)}>
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="relative px-4 pt-4 pb-3" style={{ background: '#F1F5F9' }}>
              <button onClick={() => setSelectedInventory(null)}
                className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                <X className="w-3 h-3 text-slate-400" />
              </button>
              <p className="font-black text-[15px] pr-7 text-slate-800">{selectedInventory.comment || selectedInventory.status}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedInventory.status === 'Out of Stock' ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'
                }`}>{selectedInventory.status}</span>
                {selectedInventory.date && (
                  <span className="text-[10px] text-slate-400">
                    {new Date(selectedInventory.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              {selectedInventory.reportedBy && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wide shrink-0" style={{ color: TEAL }}>Reportado por</span>
                  <span className="text-[12px] font-semibold text-slate-700">{selectedInventory.reportedBy}</span>
                </div>
              )}
              {selectedInventory.comment && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide block mb-0.5" style={{ color: TEAL }}>Comentario</span>
                  <span className="text-[12px] text-slate-600 leading-relaxed">{selectedInventory.comment}</span>
                </div>
              )}
              {selectedInventory.photoUrls.length > 0 && (
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wide block mb-1.5" style={{ color: TEAL }}>Fotos</span>
                  <div className="flex gap-2 flex-wrap">
                    {selectedInventory.photoUrls.map((url, i) => (
                      <div key={i} className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0"
                        style={{ border: `1.5px solid ${TEAL_LIGHT}` }}>
                        <img src={url} alt="foto" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* NEW INVENTORY MODAL */}
      {showNewInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setShowNewInventory(false)}>
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-black text-slate-800 text-[15px]">Nuevo Registro</span>
              <button onClick={() => setShowNewInventory(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Estado *</p>
                <div className="flex gap-2">
                  {(['Low', 'Out of Stock'] as const).map(s => (
                    <button key={s} onClick={() => setNewInvStatus(s)}
                      className={`flex-1 py-2 rounded-xl text-[12px] font-bold border transition-all ${newInvStatus === s
                        ? s === 'Out of Stock' ? 'bg-red-50 border-red-300 text-red-500' : 'bg-amber-50 border-amber-300 text-amber-600'
                        : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Comentario</p>
                <textarea value={newInvComment} onChange={e => setNewInvComment(e.target.value)}
                  placeholder="Que esta faltando o bajo en stock?"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] rounded-xl border border-slate-200 outline-none focus:border-teal-400 transition-all resize-none"
                  style={{ fontFamily: "'Poppins', sans-serif" }} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide mb-1">Foto del almacen</p>
                {newInvPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {newInvPhotos.map((url, i) => (
                      <div key={i} className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                        <img src={url} alt="foto" className="w-full h-full object-cover"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        <button onClick={() => setNewInvPhotos(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={invPhotoRef} type="file" accept="image/*" multiple className="hidden" onChange={handleInvPhotoUpload} />
                <button onClick={() => invPhotoRef.current?.click()} disabled={uploadingInvPhoto}
                  className="w-full py-2 rounded-xl border border-dashed border-slate-300 flex items-center justify-center gap-1.5 text-[12px] font-semibold text-slate-400">
                  <Camera className="w-3.5 h-3.5" />
                  {uploadingInvPhoto ? 'Subiendo...' : 'Agregar foto'}
                </button>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button onClick={handleSaveInventory} disabled={savingInventory}
                className="w-full py-3 rounded-xl text-white font-black text-[13px] flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: TEAL }}>
                {savingInventory
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <span className="font-black text-slate-800 text-[13px]">Checklist - {completedTasks.size}/{tasks.length} completadas</span>
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
