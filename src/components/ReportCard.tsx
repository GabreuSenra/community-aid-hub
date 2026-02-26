import { MapPin, Clock } from 'lucide-react';
import { Report, getMapsUrl } from '@/lib/disaster';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  report: Report;
}

export default function ReportCard({ report }: Props) {
  const isFlooding = report.type === 'flooding';
  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex gap-3">
      <div className={`text-2xl shrink-0`}>{isFlooding ? '🌊' : '⛰️'}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isFlooding ? 'type-flooding' : 'type-landslide'}`}>
            {isFlooding ? 'Alagamento' : 'Deslizamento'}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <p className="font-semibold text-sm text-foreground mt-1 truncate">{report.address}</p>
        <p className="text-xs text-muted-foreground">{report.neighborhood}</p>
        {report.description && (
          <p className="text-xs text-foreground mt-1 line-clamp-2">{report.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(report.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <a
            href={getMapsUrl(`${report.address}, ${report.neighborhood}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-primary font-semibold"
          >
            <MapPin className="w-3 h-3" />
            Ver no Maps
          </a>
        </div>
      </div>
    </div>
  );
}
