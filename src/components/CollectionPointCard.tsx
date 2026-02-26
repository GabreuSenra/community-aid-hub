import React from 'react';
import { MapPin, Phone, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { CollectionPointWithNeeds, getMapsUrl, getStatusLabel, getStatusClass } from '@/lib/disaster';

interface Props {
  point: CollectionPointWithNeeds;
}

const NeedBadge = ({ urgency, label }: { urgency: string; label: string }) => (
  <span
    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
      urgency === 'urgent'
        ? 'badge-urgent border-destructive/20'
        : 'badge-low border-border'
    }`}
  >
    <span>{urgency === 'urgent' ? '🔴' : '🟡'}</span>
    {label}
    <span className="ml-1 opacity-60 text-[10px]">
      {urgency === 'urgent' ? 'Urgente' : 'Baixo'}
    </span>
  </span>
);

export default function CollectionPointCard({ point }: Props) {
  // 🔥 começa aberto
  const [expanded, setExpanded] = React.useState(true);

  const activeNeeds = point.needs?.filter(n => n.is_active) || [];

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-foreground">
              {point.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {point.neighborhood}
            </p>
          </div>

          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusClass(point.status)}`}
          >
            {getStatusLabel(point.status)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
          <span className="text-foreground">{point.address}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
          <a
            href={`tel:${point.phone}`}
            className="text-primary font-medium"
          >
            {point.phone}
          </a>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground">{point.hours}</span>
        </div>

        {point.responsible && (
          <div className="text-sm text-muted-foreground">
            Responsável:{' '}
            <span className="text-foreground font-medium">
              {point.responsible}
            </span>
          </div>
        )}

        {/* Needs Section */}
        <div className="border-t border-border pt-3 mt-3">

          {/* Título + toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <p className="text-xs font-bold text-foreground">
              Necessidades Atuais ({activeNeeds.length})
            </p>

            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Legenda */}
          <div className="flex items-center gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <span>🟡</span>
              <span className="text-muted-foreground">Baixo</span>
            </div>
            <div className="flex items-center gap-1">
              <span>🔴</span>
              <span className="text-muted-foreground">Urgente</span>
            </div>
          </div>

          {/* Lista */}
          {expanded && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeNeeds.length > 0 ? (
                activeNeeds.map(need => (
                  <NeedBadge
                    key={need.id}
                    urgency={need.urgency}
                    label={
                      need.category === 'Outros' && need.custom_label
                        ? need.custom_label
                        : need.category
                    }
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Sem necessidades registradas no momento
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="px-4 pb-4">
        <a
          href={getMapsUrl(`${point.address}, ${point.neighborhood}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground text-sm font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity"
        >
          <MapPin className="w-4 h-4" />
          Abrir no Google Maps
        </a>
      </div>
    </div>
  );
}