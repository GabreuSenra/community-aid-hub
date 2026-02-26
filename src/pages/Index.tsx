import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CollectionPointWithNeeds, fetchCollectionPoints, fetchReports, Report } from '@/lib/disaster';
import CollectionPointCard from '@/components/CollectionPointCard';
import ReportCard from '@/components/ReportCard';
import ReportForm from '@/components/ReportForm';
import { CloudSun, AlertTriangle, Package, Search, RefreshCw } from 'lucide-react';

const HOURS_OPTIONS = [6, 12, 24] as const;

export default function Index() {
  const [tab, setTab] = useState<'points' | 'alerts'>('points');
  const [points, setPoints] = useState<CollectionPointWithNeeds[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [hoursFilter, setHoursFilter] = useState<6 | 12 | 24>(24);
  const [search, setSearch] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [loadingPoints, setLoadingPoints] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [reportSuccess, setReportSuccess] = useState(false);

  const loadPoints = async () => {
    setLoadingPoints(true);
    try { setPoints(await fetchCollectionPoints()); } catch (e) { console.error(e); }
    setLoadingPoints(false);
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try { setReports(await fetchReports(hoursFilter)); } catch (e) { console.error(e); }
    setLoadingReports(false);
  };

  useEffect(() => { loadPoints(); }, []);
  useEffect(() => { loadReports(); }, [hoursFilter]);

  // Realtime for reports
  useEffect(() => {
    const channel = supabase.channel('reports-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => loadReports())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hoursFilter]);

  const filteredPoints = points.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
    p.address.toLowerCase().includes(search.toLowerCase())
  );

  const handleReportSuccess = () => {
    setShowReportForm(false);
    setReportSuccess(true);
    loadReports();
    setTimeout(() => setReportSuccess(false), 4000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground sticky top-0 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg leading-tight">🆘 Ajude JF</h1>
              <p className="text-xs opacity-75">Juiz de Fora</p>
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
        </div>
      </header>

      {/* Emergency Report Buttons */}
      <div className="bg-destructive/10 border-b border-destructive/20">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-2">
          <button
            onClick={() => setShowReportForm(true)}
            className="flex-1 bg-flooding text-flooding-foreground text-sm font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 active:opacity-80"
          >
            🌊 Reportar Alagamento
          </button>
          <button
            onClick={() => setShowReportForm(true)}
            className="flex-1 bg-landslide text-landslide-foreground text-sm font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 active:opacity-80"
          >
            ⛰️ Reportar Deslizamento
          </button>
          <button
            onClick={() => window.location.href = '/admin'}
            className="flex-1 bg-flooding text-flooding-foreground text-sm font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 active:opacity-80"
          >
            🚩 Cadastrar Ponto de Coleta
          </button>
        </div>
      </div>

      {reportSuccess && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-secondary border border-border text-foreground text-sm font-medium p-3 rounded-xl">
            ✅ Reporte enviado com sucesso! Obrigado pela informação.
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-muted p-1 rounded-xl">
          <button
            onClick={() => setTab('points')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'points' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
            }`}
          >
            <Package className="w-4 h-4" />
            Pontos de Coleta
          </button>
          <button
            onClick={() => setTab('alerts')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === 'alerts' ? 'bg-card shadow text-foreground' : 'text-muted-foreground'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Ocorrências
            {reports.length > 0 && (
              <span className="bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                {reports.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4 pb-20">
        {tab === 'points' && (
          <>
            {/* Search */}
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

            {loadingPoints ? (
              <div className="space-y-3">
                {[1,2,3].map(i => (
                  <div key={i} className="bg-card rounded-xl border border-border h-40 animate-pulse" />
                ))}
              </div>
            ) : filteredPoints.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">{search ? 'Nenhum ponto encontrado' : 'Nenhum ponto de coleta cadastrado'}</p>
                <p className="text-sm mt-1">Acesse o painel admin para cadastrar pontos.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredPoints.map(point => (
                  <CollectionPointCard key={point.id} point={point} />
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'alerts' && (
          <>
            {/* Filter */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-muted-foreground font-medium">Período:</span>
              <div className="flex gap-1">
                {HOURS_OPTIONS.map(h => (
                  <button
                    key={h}
                    onClick={() => setHoursFilter(h)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                      hoursFilter === h ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
              <button onClick={loadReports} className="ml-auto p-1.5 rounded-lg hover:bg-muted">
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingReports ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {loadingReports ? (
              <div className="space-y-3">
                {[1,2].map(i => (
                  <div key={i} className="bg-card rounded-xl border border-border h-24 animate-pulse" />
                ))}
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Nenhuma ocorrência nas últimas {hoursFilter}h</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map(report => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Admin link */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-3">
        <div className="max-w-2xl mx-auto">
          <a
            href="/admin"
            className="block text-center text-xs text-muted-foreground hover:text-primary font-medium"
          >
            🔐 CADASTRAR PONTO DE COLETA
          </a>
        </div>
      </div>

      {showReportForm && (
        <ReportForm
          onClose={() => setShowReportForm(false)}
          onSuccess={handleReportSuccess}
        />
      )}
    </div>
  );
}
