import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CollectionPointWithNeeds, fetchPublicCollectionPoints, fetchReports, Report } from '@/lib/disaster';
import CollectionPointCard from '@/components/CollectionPointCard';
import ReportCard from '@/components/ReportCard';
import ReportForm from '@/components/ReportForm';
import { CloudSun, AlertTriangle, Package, Search, RefreshCw } from 'lucide-react';

const HOURS_OPTIONS = [6, 12, 24] as const;
const PREFEITURA_UUID = 'df93d2fb-8638-458e-93d3-c9d50071130c';

export default function Index() {
  const [tab, setTab] = useState<'points' | 'alerts'>('points');
  const [pointsSubTab, setPointsSubTab] = useState<'prefeitura' | 'outros'>('prefeitura');

  const [points, setPoints] = useState<CollectionPointWithNeeds[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [hoursFilter, setHoursFilter] = useState<6 | 12 | 24>(24);
  const [search, setSearch] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportType, setReportType] = useState<'flooding' | 'landslide'>('flooding');

  const [pixCopied, setPixCopied] = useState(false);

  const loadPoints = async () => {
    setLoadingPoints(true);
    try { setPoints(await fetchPublicCollectionPoints()); }
    catch (e) { console.error(e); }
    setLoadingPoints(false);
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try { setReports(await fetchReports(hoursFilter)); }
    catch (e) { console.error(e); }
    setLoadingReports(false);
  };

  useEffect(() => { loadPoints(); }, []);
  useEffect(() => { loadReports(); }, [hoursFilter]);

  useEffect(() => {
    const channel = supabase.channel('reports-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, loadReports)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hoursFilter]);

  const filteredPoints = points.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  const prefeituraPoints = filteredPoints.filter(
    p => p.new_uuid === PREFEITURA_UUID
  );

  const outrosPoints = filteredPoints.filter(
    p => p.new_uuid !== PREFEITURA_UUID
  );

  const handleReportSuccess = () => {
    setShowReportForm(false);
    setReportSuccess(true);
    loadReports();
    setTimeout(() => setReportSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-background">

      {/* HEADER */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg leading-tight">🆘 Ajude JF</h1>
            <p className="text-xs opacity-75">Juiz de Fora</p>
          </div>

          <div
            onClick={async () => {
              try {
                await navigator.clipboard.writeText('contribua@pjf.mg.gov.br');
                setPixCopied(true);
                setTimeout(() => setPixCopied(false), 2000);
              } catch (err) {
                console.error('Erro ao copiar PIX', err);
              }
            }}
            className="bg-card border border-primary/30 rounded-xl px-4 py-3 shadow-sm min-w-[220px] cursor-pointer hover:scale-[1.02] transition-all"
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pix Oficial Prefeitura
            </p>

            <p className="font-bold text-primary mt-1 break-all">
              {pixCopied ? '✅ PIX copiado!' : 'contribua@pjf.mg.gov.br'}
            </p>

            <p className="text-[10px] text-muted-foreground mt-1">
              Clique para copiar
            </p>
          </div>

          <a
            href="https://www.climatempo.com.br/previsao-do-tempo/cidade/152/juizdefora-mg"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-primary-foreground/15 hover:bg-primary-foreground/25 text-primary-foreground text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
          >
            <CloudSun className="w-4 h-4" />
            Previsão
          </a>
        </div>
      </header>

      {/* ALERTA SEGURANÇA */}
      <div className="bg-destructive text-destructive-foreground">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3 items-start">
          <span className="text-lg">⚠️</span>
          <div className="text-xs sm:text-sm font-medium">
            <p className="font-bold uppercase tracking-wide">
              Atenção: Cuidado com golpes
            </p>
            <p className="opacity-90 mt-1">
              Sempre confirme a autenticidade dos pontos de coleta antes de realizar doações.
            </p>
          </div>
        </div>
      </div>

      {/* BOTÕES DE EMERGÊNCIA */}
      <div className="bg-destructive/10 border-b border-destructive/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
          <button
            onClick={() => { setReportType('flooding'); setShowReportForm(true); }}
            className="flex-1 bg-flooding text-flooding-foreground text-sm font-bold py-2.5 px-3 rounded-xl"
          >
            🌊 Reportar Alagamento
          </button>

          <button
            onClick={() => { setReportType('landslide'); setShowReportForm(true); }}
            className="flex-1 bg-landslide text-landslide-foreground text-sm font-bold py-2.5 px-3 rounded-xl"
          >
            ⛰️ Reportar Deslizamento
          </button>

          <button
            onClick={() => window.location.href = '/admin'}
            className="flex-1 bg-flooding text-flooding-foreground text-sm font-bold py-2.5 px-3 rounded-xl"
          >
            🚩 Cadastrar/Acessar Ponto
          </button>
        </div>
      </div>

      {reportSuccess && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-secondary border border-border text-sm p-3 rounded-xl">
            ✅ Reporte enviado com sucesso!
          </div>
        </div>
      )}

      {/* TABS PRINCIPAIS */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-muted p-1 rounded-xl">
          <button
            onClick={() => setTab('points')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab === 'points' ? 'bg-card shadow' : 'text-muted-foreground'}`}
          >
            <Package className="w-4 h-4 inline mr-1" />
            Pontos
          </button>

          <button
            onClick={() => setTab('alerts')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${tab === 'alerts' ? 'bg-card shadow' : 'text-muted-foreground'}`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Ocorrências
          </button>
        </div>
      </div>

      {/* CONTEÚDO */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">

        {tab === 'points' && (
          <>



            {/* BUSCA */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, bairro ou endereço..."
                className="w-full pl-9 pr-4 py-2.5 border border-input rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* INFO + PIX BANNER */}
            <div className="bg-primary/10 border-b border-primary/20">
              <div className="max-w-2xl mx-auto px-4 py-4 flex flex-col sm:flex-row gap-4 justify-between">

                <div className="text-sm text-foreground leading-relaxed">
                  <p className="font-semibold mb-1">🤝 Ajude Juiz de Fora</p>
                  <p>
                    Aqui você pode encontrar pontos de coleta de doações para vítimas de
                    desastres naturais em Juiz de Fora e suas maiores necessidades em tempo real.
                    Se você souber de algum ponto que não está listado, ou se um ponto listado
                    tiver alguma informação desatualizada, utilize os botões acima para reportar
                    ou cadastrar pontos de coleta.
                  </p>
                  <p className="mt-2 font-medium">
                    Juntos, podemos ajudar nossa comunidade a se recuperar mais rápido!
                  </p>
                </div>



              </div>
            </div>

            {/* SUBTABS */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setPointsSubTab('prefeitura')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold ${pointsSubTab === 'prefeitura'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                  }`}
              >
                🏛 Prefeitura
              </button>

              <button
                onClick={() => setPointsSubTab('outros')}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold ${pointsSubTab === 'outros'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
                  }`}
              >
                🤝 Outros Pontos
              </button>
            </div>

            {/* LISTA */}
            <div className="space-y-3">
              {(pointsSubTab === 'prefeitura'
                ? prefeituraPoints
                : outrosPoints
              ).map(point => (
                <CollectionPointCard key={point.id} point={point} />
              ))}
            </div>
          </>
        )}

        {tab === 'alerts' && (
          <>
            <div className="space-y-3">
              {reports.map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </>
        )}

      </main>

      {showReportForm && (
        <ReportForm
          initialType={reportType}
          onClose={() => setShowReportForm(false)}
          onSuccess={handleReportSuccess}
        />
      )}

    </div>
  );
}