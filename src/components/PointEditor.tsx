import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CollectionPointWithNeeds, Need, NEED_CATEGORIES } from '@/lib/disaster';
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

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    const { error } = await supabase.from('collection_points').update({
      name, address, neighborhood, responsible, phone, hours, status,
      description: description || null,
    }).eq('id', point.id);
    if (error) { setMsg('Erro ao salvar.'); } else { setMsg('Salvo!'); onUpdated(); }
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

  const toggleNeed = async (need: Need) => {
    const newUrgency = need.urgency === 'low' ? 'urgent' : 'low';
    await supabase.from('needs').update({ urgency: newUrgency }).eq('id', need.id);
    setNeeds(prev => prev.map(n => n.id === need.id ? { ...n, urgency: newUrgency } : n));
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
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="p-4 pt-0 space-y-3 border-t border-border">
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Nome', value: name, set: setName },
              { label: 'Endereço', value: address, set: setAddress },
              { label: 'Bairro', value: neighborhood, set: setNeighborhood },
              { label: 'Responsável', value: responsible, set: setResponsible },
              { label: 'Telefone', value: phone, set: setPhone },
              { label: 'Horário', value: hours, set: setHours },
            ].map(f => (
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

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={2}
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Salvar
            </button>
            {msg && <span className="text-xs font-medium text-primary">{msg}</span>}
          </div>

          {/* Needs management */}
          <div className="border-t border-border pt-3">
            <p className="text-xs font-bold text-foreground mb-2">Necessidades Atuais</p>
            <div className="space-y-1.5 mb-3">
              {needs.map(need => (
                <div key={need.id} className="flex items-center gap-2">
                  <button
                    onClick={() => toggleNeed(need)}
                    className={`flex-1 flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border ${
                      need.urgency === 'urgent' ? 'badge-urgent border-destructive/20' : 'badge-low border-border'
                    }`}
                  >
                    <span>{need.urgency === 'urgent' ? '🔴' : '🟡'}</span>
                    {need.category === 'Outros' && need.custom_label ? need.custom_label : need.category}
                    <span className="ml-auto text-xs opacity-60">{need.urgency === 'urgent' ? 'Urgente' : 'Baixo'}</span>
                  </button>
                  <button onClick={() => removeNeed(need.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Adicionar necessidade:</p>
            <div className="flex flex-wrap gap-1.5">
              {NEED_CATEGORIES.filter(cat => !needs.find(n => n.category === cat && n.is_active)).map(cat => (
                <button
                  key={cat}
                  onClick={() => addNeed(cat)}
                  className="flex items-center gap-1 text-xs bg-muted hover:bg-secondary text-muted-foreground px-2.5 py-1 rounded-full border border-border"
                >
                  <Plus className="w-3 h-3" /> {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
