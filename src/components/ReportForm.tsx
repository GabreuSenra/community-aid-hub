import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X, Upload, Loader2 } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReportForm({ onClose, onSuccess }: Props) {
  const [type, setType] = useState<'flooding' | 'landslide'>('flooding');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim() || !neighborhood.trim() || !description.trim()) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let photo_url: string | null = null;
      if (photo) {
        const ext = photo.name.split('.').pop();
        const filename = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(filename, photo);
        if (!uploadError) {
          const { data } = supabase.storage.from('report-photos').getPublicUrl(filename);
          photo_url = data.publicUrl;
        }
      }

      const { error: insertError } = await supabase.from('reports').insert({
        type,
        address: address.trim(),
        neighborhood: neighborhood.trim(),
        reference: reference.trim() || null,
        description: description.trim(),
        photo_url,
      });

      if (insertError) throw insertError;
      onSuccess();
    } catch (err: unknown) {
      setError('Erro ao enviar reporte. Tente novamente.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card">
          <h2 className="font-bold text-lg text-foreground">Reportar Ocorrência</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('flooding')}
              className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                type === 'flooding'
                  ? 'border-[hsl(200,85%,40%)] type-flooding'
                  : 'border-border text-muted-foreground'
              }`}
            >
              🌊 Alagamento
            </button>
            <button
              type="button"
              onClick={() => setType('landslide')}
              className={`py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                type === 'landslide'
                  ? 'border-[hsl(25,85%,45%)] type-landslide'
                  : 'border-border text-muted-foreground'
              }`}
            >
              ⛰️ Deslizamento
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Endereço completo *
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Rua, número..."
              maxLength={200}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Bairro *
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={e => setNeighborhood(e.target.value)}
              placeholder="Bairro"
              maxLength={100}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Ponto de referência (opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Próximo à escola, igreja..."
              maxLength={150}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Descrição *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva a situação..."
              maxLength={500}
              rows={3}
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-foreground mb-1">
              Foto (opcional)
            </label>
            <label className="flex items-center gap-2 border-2 border-dashed border-border rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {photo ? photo.name : 'Anexar foto'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => setPhoto(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-destructive text-destructive-foreground font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enviar Reporte
          </button>
        </form>
      </div>
    </div>
  );
}
