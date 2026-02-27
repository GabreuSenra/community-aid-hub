import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CollectionPointWithNeeds, Need, NEED_CATEGORIES, getCoordinatesFromAddress } from '@/lib/disaster'; // Importado getCoordinatesFromAddress
import { Plus, Trash2, Save, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  point: CollectionPointWithNeeds;
  onUpdated: () => void;
}

const STATUSES = [
  { value: 'open', label: 'Aberto' },
  { value: 'temporarily_closed', label: 'Temporariamente Fechado' },
  { value: 'closed', label: 'Encerrado' },
];

export default function PointEditor({ point, onUpdated }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(point.name);
  const [address, setAddress] = useState(point.address);
  const [neighborhood, setNeighborhood] = useState(point.neighborhood);
  const [responsible, setResponsible] = useState(point.responsible);
  const [phone, setPhone] = useState(point.phone);
  const [hours, setHours] = useState(point.hours);
  const [status, setStatus] = useState(point.status);
  const [description, setDescription] = useState(point.description || '');
  const [needs, setNeeds] = useState<Need[]>(point.needs || []);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [customNeed, setCustomNeed] = useState('');

  const isShelter = description === 'Abrigo';

  const handleSave = async () => {
    setSaving(true);
    setMsg('Buscando localização...');

    // 1. Busca as coordenadas baseadas no endereço preenchido
    // Adicionamos o bairro e a cidade para garantir precisão no OpenStreetMap
    const coords = await getCoordinatesFromAddress(`${address}, ${neighborhood}`);

    // 2. Atualiza os dados no Supabase, incluindo latitude e longitude
    const { error } = await supabase.from('collection_points').update({
      name,
      address,
      neighborhood,
      responsible,
      phone,
      hours,
      status,
      description: description || null,
      // Se não encontrar as coordenadas, mantém o que já estava ou nulo
      latitude: coords?.lat ?? point?.latitude ?? null,
      longitude: coords?.lng ?? point?.longitude ?? null,
    }).eq('id', point.id);

    if (error) {
      setMsg('Erro ao salvar.');
    } else {
      setMsg(coords ? 'Salvo com localização!' : 'Salvo (endereço não localizado)');
      onUpdated();
    }

    setSaving(false);
    setTimeout(() => setMsg(''), 3000);
  };

  const addNeed = async (category: string) => {
    const { data, error } = await supabase.from('needs').insert({
      collection_point_id: point.id,
      category,
      urgency: 'low',
      is_active: true,
    }).select().single();

    if (!error && data) setNeeds(prev => [...prev, data as Need]);
  };

  const addCustomNeed = async () => {
    if (!customNeed.trim()) return;

    const { data, error } = await supabase.from('needs').insert({
      collection_point_id: point.id,
      category: 'Outros',
      custom_label: customNeed.trim(),
      urgency: 'low',
      is_active: true,
    }).select().single();

    if (!error && data) {
      setNeeds(prev => [...prev, data as Need]);
      setCustomNeed('');
    }
  };

  const toggleNeed = async (need: Need) => {
    let newUrgency: 'low' | 'urgent' | 'excess';

    if (need.urgency === 'low') newUrgency = 'urgent';
    else if (need.urgency === 'urgent') newUrgency = 'excess';
    else newUrgency = 'low';

    await supabase.from('needs')
      .update({ urgency: newUrgency })
      .eq('id', need.id);

    setNeeds(prev =>
      prev.map(n =>
        n.id === need.id ? { ...n, urgency: newUrgency } : n
      )
    );
  };

  const removeNeed = async (needId: string) => {
    await supabase.from('needs').delete().eq('id', needId);
    setNeeds(prev => prev.filter(n => n.id !== needId));
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div>
          <p className="font-bold text-foreground">{point.name}</p>
          <p className="text-xs text-muted-foreground">{point.neighborhood}</p>
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-4 border-t border-border">

          {/* FORM CAMPOS */}
          <div className="grid gap-3">
            {[
              { label: 'Nome', value: name, set: setName },
              { label: 'Endereço', value: address, set: setAddress },
              { label: 'Bairro', value: neighborhood, set: setNeighborhood },
              { label: 'Responsável', value: responsible, set: setResponsible },
              { label: 'Telefone', value: phone, set: setPhone },
              { label: 'Horário', value: hours, set: setHours },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={f.value}
                  onChange={e => f.set(e.target.value)}
                  className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background outline-none focus:ring-2 focus:ring-primary/20"
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Descrição
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                disabled={isShelter}
                className={`w-full border border-input rounded-lg px-3 py-2 text-sm bg-background resize-none outline-none focus:ring-2 focus:ring-primary/20 ${isShelter ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
              />
            </div>
          </div>

          {/* BOTÃO SALVAR */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {saving
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Save className="w-3 h-3" />
              }
              Salvar alterações
            </button>
            {msg && <span className="text-xs font-medium text-primary">{msg}</span>}
          </div>

          {/* NECESSIDADES */}
          <div className="border-t border-border pt-3">
            <p className="text-xs font-bold mb-2">Necessidades Atuais</p>

            <div className="space-y-1.5 mb-3">
              {needs.map(need => (
                <div key={need.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleNeed(need)}
                    className={`flex-1 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${need.urgency === 'urgent'
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : need.urgency === 'excess'
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-yellow-50 text-yellow-600 border-yellow-200'
                      }`}
                  >
                    <span>
                      {need.urgency === 'urgent'
                        ? '🔴'
                        : need.urgency === 'excess'
                          ? '🔵'
                          : '🟡'}
                    </span>

                    {need.category === 'Outros'
                      ? need.custom_label
                      : need.category
                    }

                    <span className="ml-auto text-xs opacity-70">
                      {need.urgency === 'urgent'
                        ? 'Urgente'
                        : need.urgency === 'excess'
                          ? 'Em excesso'
                          : 'Baixo'}
                    </span>
                  </button>

                  <button
                    onClick={() => removeNeed(need.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-muted-foreground mb-2">
              Adicionar necessidade padrão:
            </p>

            <div className="flex flex-wrap gap-1.5 mb-3">
              {NEED_CATEGORIES
                .filter(cat => !needs.find(n => n.category === cat))
                .map(cat => (
                  <button
                    key={cat}
                    onClick={() => addNeed(cat)}
                    className="flex items-center gap-1 text-xs bg-muted hover:bg-secondary px-2.5 py-1 rounded-full border border-border transition-colors"
                  >
                    <Plus className="w-3 h-3" /> {cat}
                  </button>
                ))}
            </div>

            {/* NOVA NECESSIDADE PERSONALIZADA */}
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              Adicionar necessidade personalizada:
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={customNeed}
                onChange={e => setCustomNeed(e.target.value)}
                placeholder="Ex: Fraldas G"
                className="flex-1 border border-input rounded-lg px-3 py-2 text-xs bg-background outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={addCustomNeed}
                className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-2 rounded-lg hover:opacity-90"
              >
                Adicionar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}