import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CollectionPointWithNeeds, fetchCollectionPoints } from '@/lib/disaster';
import AdminLogin from '@/components/AdminLogin';
import PointEditor from '@/components/PointEditor';
import { LogOut, Plus, Loader2, ArrowLeft } from 'lucide-react';

const STATUSES = [
  { value: 'open', label: 'Aberto' },
  { value: 'temporarily_closed', label: 'Temp. Fechado' },
  { value: 'closed', label: 'Encerrado' },
];

export default function Admin() {
  const [session, setSession] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CollectionPointWithNeeds[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // New point form
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newHours, setNewHours] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadPoints();
  }, [session]);

  const loadPoints = async () => {
    try { setPoints(await fetchCollectionPoints()); } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newAddress || !newNeighborhood || !newResponsible || !newPhone || !newHours) {
      setCreateError('Preencha todos os campos.');
      return;
    }
    setCreating(true);
    setCreateError('');
    const { error } = await supabase.from('collection_points').insert({
      name: newName, address: newAddress, neighborhood: newNeighborhood,
      responsible: newResponsible, phone: newPhone, hours: newHours,
    });
    if (error) { setCreateError('Erro ao criar ponto.'); }
    else {
      setShowCreate(false);
      setNewName(''); setNewAddress(''); setNewNeighborhood('');
      setNewResponsible(''); setNewPhone(''); setNewHours('');
      await loadPoints();
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <AdminLogin onLogin={() => {}} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground sticky top-0 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-base">Painel Administrativo</h1>
            <p className="text-xs opacity-75">Gerenciar Pontos de Coleta</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="p-2 rounded-lg hover:bg-primary-foreground/10">
              <ArrowLeft className="w-4 h-4" />
            </a>
            <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-primary-foreground/10">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Novo Ponto de Coleta
        </button>

        {showCreate && (
          <form onSubmit={handleCreate} className="bg-card rounded-xl border border-border p-4 space-y-3">
            <p className="font-bold text-foreground text-sm">Novo Ponto</p>
            {[
              { label: 'Nome *', value: newName, set: setNewName, ph: 'Nome do local' },
              { label: 'Endereço *', value: newAddress, set: setNewAddress, ph: 'Rua, número' },
              { label: 'Bairro *', value: newNeighborhood, set: setNewNeighborhood, ph: 'Bairro' },
              { label: 'Responsável *', value: newResponsible, set: setNewResponsible, ph: 'Nome do responsável' },
              { label: 'Telefone *', value: newPhone, set: setNewPhone, ph: '(32) 99999-9999' },
              { label: 'Horário *', value: newHours, set: setNewHours, ph: '8h às 18h' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{f.label}</label>
                <input
                  type="text" value={f.value} onChange={e => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
            {createError && <p className="text-xs text-destructive font-medium">{createError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="flex-1 bg-primary text-primary-foreground text-sm font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-60">
                {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                Criar Ponto
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 text-sm font-semibold text-muted-foreground border border-border rounded-lg">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {points.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Nenhum ponto cadastrado ainda.</p>
          </div>
        ) : (
          points.map(point => (
            <PointEditor key={point.id} point={point} onUpdated={loadPoints} />
          ))
        )}
      </main>
    </div>
  );
}
