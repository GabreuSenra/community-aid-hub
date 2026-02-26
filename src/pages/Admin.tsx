import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { CollectionPointWithNeeds, NEED_CATEGORIES, fetchUserCollectionPoints } from '@/lib/disaster';
import AdminLogin from '@/components/AdminLogin';
import PointEditor from '@/components/PointEditor';
import { LogOut, Plus, Loader2, ArrowLeft } from 'lucide-react';

export default function Admin() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState<CollectionPointWithNeeds[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  // Form states
  const [newName, setNewName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNeighborhood, setNewNeighborhood] = useState('');
  const [newResponsible, setNewResponsible] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newHours, setNewHours] = useState('');
  type TempNeed = {
    category: string;
    urgency: 'low' | 'urgent';
  };

  const [newNeeds, setNewNeeds] = useState<TempNeed[]>([]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((_, s) => setSession(s));

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user?.id) loadPoints();
  }, [session]);

  const loadPoints = async () => {
    if (!session?.user?.id) return;
    try {
      const data = await fetchUserCollectionPoints(session.user.id);
      setPoints(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const toggleNewNeed = (category: string) => {
    setNewNeeds(prev => {
      const existing = prev.find(n => n.category === category);

      if (!existing) {
        // adiciona como low
        return [...prev, { category, urgency: 'low' }];
      }

      if (existing.urgency === 'low') {
        // vira urgente
        return prev.map(n =>
          n.category === category ? { ...n, urgency: 'urgent' } : n
        );
      }

      // se já for urgent, remove
      return prev.filter(n => n.category !== category);
    });
  };

  const resetForm = () => {
    setNewName('');
    setNewAddress('');
    setNewNeighborhood('');
    setNewResponsible('');
    setNewPhone('');
    setNewHours('');
    setNewNeeds([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) return;

    if (!newName || !newAddress || !newNeighborhood || !newResponsible || !newPhone || !newHours) {
      setCreateError('Preencha todos os campos.');
      return;
    }

    if (newNeeds.length === 0) {
      setCreateError('Selecione pelo menos uma necessidade.');
      return;
    }

    setCreating(true);
    setCreateError('');

    const { data, error } = await supabase
      .from('collection_points')
      .insert({
        name: newName,
        address: newAddress,
        neighborhood: newNeighborhood,
        responsible: newResponsible,
        phone: newPhone,
        hours: newHours,
        new_uuid: session.user.id,
      })
      .select()
      .single();

    if (error || !data) {
      setCreateError('Erro ao criar ponto.');
      setCreating(false);
      return;
    }

const needsToInsert = newNeeds.map(need => ({
  collection_point_id: data.id,
  category: need.category,
  urgency: need.urgency,
  is_active: true,
}));

    await supabase.from('needs').insert(needsToInsert);

    resetForm();
    setShowCreate(false);
    await loadPoints();
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
    return <AdminLogin onLogin={() => { }} />;
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
          <form onSubmit={handleCreate} className="bg-card rounded-xl border border-border p-4 space-y-4">
            <p className="font-bold text-foreground text-sm">Novo Ponto</p>

            {[{
              label: 'Nome *', value: newName, set: setNewName
            }, {
              label: 'Endereço *', value: newAddress, set: setNewAddress
            }, {
              label: 'Bairro *', value: newNeighborhood, set: setNewNeighborhood
            }, {
              label: 'Responsável *', value: newResponsible, set: setNewResponsible
            }, {
              label: 'Telefone *', value: newPhone, set: setNewPhone
            }, {
              label: 'Horário *', value: newHours, set: setNewHours
            }].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">{f.label}</label>
                <input
                  type="text"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}

            {/* Needs selection */}
            <div className="border-t border-border pt-3">
              <p className="text-xs font-bold text-foreground mb-2">
                Necessidades Iniciais
              </p>

              {/* Legenda */}
              <div className="flex items-center gap-4 text-xs mb-2">
                <div className="flex items-center gap-1">
                  <span>🟡</span>
                  <span className="text-muted-foreground">Baixo</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>🔴</span>
                  <span className="text-muted-foreground">Urgente</span>
                </div>
                <span className="text-muted-foreground opacity-70">
                  (Clique para adicionar → urgente → remover)
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {NEED_CATEGORIES.map(cat => {
                  const existing = newNeeds.find(n => n.category === cat);

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleNewNeed(cat)}
                      className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition ${existing
                          ? existing.urgency === 'urgent'
                            ? 'badge-urgent border-destructive/20'
                            : 'badge-low border-border'
                          : 'bg-muted text-muted-foreground border-border hover:bg-secondary'
                        }`}
                    >
                      {existing && (
                        <span>
                          {existing.urgency === 'urgent' ? '🔴' : '🟡'}
                        </span>
                      )}
                      {cat}
                      {existing && (
                        <span className="ml-auto text-[10px] opacity-60">
                          {existing.urgency === 'urgent' ? 'Urgente' : 'Baixo'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {createError && (
              <p className="text-xs text-destructive font-medium">{createError}</p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {creating && <Loader2 className="w-4 h-4 animate-spin" />}
              Criar Ponto
            </button>
          </form>
        )}

        {points.map(point => (
          <PointEditor key={point.id} point={point} onUpdated={loadPoints} />
        ))}
      </main>
    </div>
  );
}