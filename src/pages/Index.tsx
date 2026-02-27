import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  CollectionPointWithNeeds, 
  fetchPublicCollectionPoints, 
  fetchReports, 
  Report,
  calculateDistance, 
  getCoordinatesFromAddress 
} from '@/lib/disaster';
import CollectionPointCard from '@/components/CollectionPointCard';
import ReportCard from '@/components/ReportCard';
import ReportForm from '@/components/ReportForm';
import { CloudSun, AlertTriangle, Package, Search, MapPin, Loader2, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Footer from '@/components/Footer';

const PREFEITURA_UUID = 'df93d2fb-8638-458e-93d3-c9d50071130c';

export default function Index() {
  const { toast } = useToast();
  const [tab, setTab] = useState<'points' | 'alerts' | 'shelters'>('points');
  const [pointsSubTab, setPointsSubTab] = useState<'prefeitura' | 'outros'>('prefeitura');

  const [points, setPoints] = useState<CollectionPointWithNeeds[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [hoursFilter] = useState<6 | 12 | 24>(24);
  const [search, setSearch] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportType, setReportType] = useState<'flooding' | 'landslide'>('flooding');
  const [pixCopied, setPixCopied] = useState(false);

  // Novos estados para Localização
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [manualLocation, setManualLocation] = useState('');
  const [pointsWithCoords, setPointsWithCoords] = useState<CollectionPointWithNeeds[]>([]);

  const loadPoints = async () => {
    try { 
      const data = await fetchPublicCollectionPoints();
      setPoints(data);
      setPointsWithCoords(data);
    } catch (e) { console.error(e); }
  };

  const loadReports = async () => {
    try { setReports(await fetchReports(hoursFilter)); }
    catch (e) { console.error(e); }
  };

  useEffect(() => { loadPoints(); }, []);
  useEffect(() => { loadReports(); }, [hoursFilter]);

  useEffect(() => {
    const channel = supabase.channel('reports-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, loadReports)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hoursFilter]);

  // Lógica para enriquecer os pontos com coordenadas para o cálculo
  const enrichPointsWithCoordinates = async (userPos: {lat: number, lng: number}) => {
    const enriched = await Promise.all(points.map(async (p) => {
      let pLat = (p as any).latitude;
      let pLng = (p as any).longitude;

      if (!pLat || !pLng) {
        const pCoords = await getCoordinatesFromAddress(`${p.address}, ${p.neighborhood}`);
        pLat = pCoords?.lat;
        pLng = pCoords?.lng;
      }

      if (pLat && pLng) {
        const dist = calculateDistance(userPos.lat, userPos.lng, pLat, pLng) + 1;
        return { ...p, distance: dist, latitude: pLat, longitude: pLng };
      }
      return p;
    }));
    setPointsWithCoords(enriched);
  };

  const handleSortByLocation = async () => {
    setIsLocating(true);
    // Se o input manual tiver texto, usa ele (Desktop)
    if (manualLocation.trim() !== '') {
      const coords = await getCoordinatesFromAddress(manualLocation);
      if (coords) {
        setUserCoords(coords);
        await enrichPointsWithCoordinates(coords);
        toast({ description: "Distâncias calculadas!" });
      } else {
        toast({ variant: "destructive", description: "Local não encontrado." });
      }
    } 
    // Se estiver vazio, tenta GPS (Mobile)
    else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserCoords(coords);
          await enrichPointsWithCoordinates(coords);
          toast({ description: "Localização GPS obtida!" });
        },
        () => {
          toast({ variant: "destructive", description: "GPS negado. Digite seu local manualmente." });
        }
      );
    }
    setIsLocating(false);
  };

  const processedPoints = useMemo(() => {
    let result = [...pointsWithCoords].filter(p =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      p.address.toLowerCase().includes(search.toLowerCase())
    );

    if (userCoords) {
      return result.sort((a, b) => (a.distance || 999) - (b.distance || 999));
    }
    return result;
  }, [pointsWithCoords, search, userCoords]);

  const prefeituraPoints = processedPoints.filter(
    p => p.new_uuid === PREFEITURA_UUID && p.description !== 'Abrigo'
  );

  const outrosPoints = processedPoints.filter(
    p => p.new_uuid !== PREFEITURA_UUID && p.description !== 'Abrigo'
  );

  const shelterPoints = processedPoints.filter(
    p => p.description === 'Abrigo' && p.new_uuid === PREFEITURA_UUID
  );

  const handleReportSuccess = () => {
    setShowReportForm(false);
    setReportSuccess(true);
    loadReports();
    setTimeout(() => setReportSuccess(false), 4000);
  };

  const handleCopyPix = async () => {
    const pixKey = 'contribua@pjf.mg.gov.br';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pixKey);
      } else {
        const textArea = document.body.appendChild(document.createElement("textarea"));
        textArea.value = pixKey;
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setPixCopied(true);
      toast({ description: "Chave PIX copiada!" });
      setTimeout(() => setPixCopied(false), 2000);
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-bold text-lg leading-tight">🆘 Ajude JF</h1>
            <p className="text-xs opacity-75">Juiz de Fora</p>
          </div>

          <div onClick={handleCopyPix} className="bg-card border border-primary/30 rounded-xl px-4 py-3 shadow-sm cursor-pointer w-full sm:w-auto active:scale-95 transition-transform">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pix Oficial Prefeitura</p>
            <p className="font-bold text-primary mt-1 break-all">{pixCopied ? '✅ PIX copiado!' : 'contribua@pjf.mg.gov.br'}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Clique para copiar</p>
          </div>

          <a href="https://www.climatempo.com.br/previsao-do-tempo/cidade/152/juizdefora-mg" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg transition-colors"><CloudSun className="w-4 h-4" /> Previsão</a>
        </div>
      </header>

      <div className="bg-destructive text-destructive-foreground">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3 items-start">
          <span className="text-lg">⚠️</span>
          <div className="text-xs sm:text-sm font-medium">
            <p className="font-bold uppercase tracking-wide">Atenção: Cuidado com golpes</p>
            <p className="opacity-90 mt-1">Sempre confirme a autenticidade dos pontos antes de doar.</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-500 text-destructive-foreground">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3 items-start">
          <span className="text-lg">⚠️</span>
          <div className="text-xs sm:text-sm font-medium">
            <p className="font-bold opacity-90 mt-1">Atenção: Muitos dos pontos cadastrados da prefeitura estão atualmente sem um supervisor, precisamos de supervisores para manter as informações mais atualizadas possíveis!</p>
          </div>
        </div>
      </div>

      <div className="bg-destructive/10 border-b border-destructive/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2 flex-col sm:flex-row">
          <button onClick={() => { setReportType('flooding'); setShowReportForm(true); }} className="flex-1 bg-flooding text-flooding-foreground text-sm font-bold py-2.5 px-3 rounded-xl hover:opacity-90">🌊 Reportar Alagamento</button>
          <button onClick={() => { setReportType('landslide'); setShowReportForm(true); }} className="flex-1 bg-landslide text-landslide-foreground text-sm font-bold py-2.5 px-3 rounded-xl hover:opacity-90">⛰️ Reportar Deslizamento</button>
          <button onClick={() => window.location.href = '/admin'} className="flex-1 bg-primary text-primary-foreground text-sm font-bold py-2.5 px-3 rounded-xl hover:opacity-90">🚩 Cadastrar/Acessar Ponto</button>
        </div>
      </div>

      {reportSuccess && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-secondary border border-border text-sm p-3 rounded-xl">✅ Reporte enviado com sucesso!</div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-muted p-1 rounded-xl">
          <button onClick={() => setTab('points')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'points' ? 'bg-card shadow' : 'text-muted-foreground'}`}><Package className="w-4 h-4 inline mr-1" /> Pontos</button>
          <button onClick={() => setTab('shelters')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'shelters' ? 'bg-card shadow' : 'text-muted-foreground'}`}>🏠 Abrigos</button>
          <button onClick={() => setTab('alerts')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'alerts' ? 'bg-card shadow' : 'text-muted-foreground'}`}><AlertTriangle className="w-4 h-4 inline mr-1" /> Ocorrências</button>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {tab === 'points' && (
          <>
            {/* BOX DE LOCALIZAÇÃO ADICIONADO */}
            <div className="bg-card border border-border rounded-2xl p-4 mb-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <MapPin className="w-4 h-4" />
                  <p className="text-xs font-bold uppercase tracking-wider">Pontos próximos</p>
                </div>
                {userCoords && (
                  <button onClick={() => {setUserCoords(null); setPointsWithCoords(points); setManualLocation('');}} className="text-[10px] text-destructive font-bold uppercase hover:underline">Limpar</button>
                )}
              </div>
              <input 
                type="text" 
                placeholder="Seu bairro ou rua em JF..." 
                value={manualLocation}
                onChange={(e) => setManualLocation(e.target.value)}
                className="w-full p-3 border border-input rounded-xl text-sm bg-background outline-none"
              />
              <button 
                onClick={handleSortByLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isLocating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                {isLocating ? "Localizando..." : userCoords ? "Atualizar Distâncias" : "Calcular Distância ou usar GPS"}
              </button>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, bairro ou endereço..." className="w-full pl-9 pr-4 py-2.5 border border-input rounded-xl text-sm bg-card outline-none" />
            </div>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setPointsSubTab('prefeitura')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${pointsSubTab === 'prefeitura' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>🏛 Prefeitura</button>
              <button onClick={() => setPointsSubTab('outros')} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${pointsSubTab === 'outros' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>🤝 Outros Pontos</button>
            </div>

            <div className="space-y-3">
              {(pointsSubTab === 'prefeitura' ? prefeituraPoints : outrosPoints).map(point => (
                <CollectionPointCard key={point.id} point={point} />
              ))}
            </div>
          </>
        )}

        {tab === 'shelters' && (
          <div className="space-y-3">
            {shelterPoints.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">Nenhum abrigo encontrado.</div>}
            {shelterPoints.map(point => <CollectionPointCard key={point.id} point={point} />)}
          </div>
        )}

        {tab === 'alerts' && (
          <div className="space-y-3">
            {reports.length === 0 && <div className="text-sm text-muted-foreground text-center py-12">Nenhuma ocorrência registrada.</div>}
            {reports.map(report => <ReportCard key={report.id} report={report} />)}
          </div>
        )}
      </main>

      {showReportForm && <ReportForm initialType={reportType} onClose={() => setShowReportForm(false)} onSuccess={handleReportSuccess} />}

        <Footer />
    </div>
  );
}