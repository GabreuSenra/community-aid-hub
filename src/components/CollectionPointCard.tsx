import React from 'react';
import { MapPin, Phone, Clock, ChevronDown, ChevronUp, MessageCircle, Copy } from 'lucide-react';
import { CollectionPointWithNeeds, getMapsUrl, getStatusLabel, getStatusClass } from '@/lib/disaster';
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Share2 } from "lucide-react";

interface Props {
  point: CollectionPointWithNeeds;
}

const NeedBadge = ({ urgency, label }: { urgency: string; label: string }) => {
  const isUrgent = urgency === 'urgent';
  const isExcess = urgency === 'excess';

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${isUrgent
        ? 'bg-red-50 text-red-600 border-red-200'
        : isExcess
          ? 'bg-blue-50 text-blue-600 border-blue-200'
          : 'bg-yellow-50 text-yellow-600 border-yellow-200'
        }`}
    >
      <span>
        {isUrgent ? '🔴' : isExcess ? '🔵' : '🟡'}
      </span>

      {label}

      <span className="ml-1 opacity-60 text-[10px]">
        {isUrgent
          ? 'Urgente'
          : isExcess
            ? 'Em excesso'
            : 'Baixo'}
      </span>
    </span>
  );
};

export default function CollectionPointCard({ point }: Props) {
  const [expanded, setExpanded] = React.useState(true);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const activeNeeds = point.needs?.filter(n => n.is_active) || [];

  const normalize = (value?: string) =>
    value?.trim().toLowerCase();

  const shelterStatusNeed = activeNeeds.find(n => {
    const category = normalize(n.category);
    return category === "vagas" || category === "sem vagas" || category === "com vagas";
  });

  const regularNeeds = activeNeeds.filter(n => {
    const category = normalize(n.category);
    return category !== "vagas" &&
      category !== "sem vagas" &&
      category !== "com vagas";
  });

  const isShelter = point.description === "Abrigo";

  // Tratamento do número para WhatsApp
  const cleanPhone = point.phone.replace(/\D/g, '');
  const whatsappNumber = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;

  async function shareStoryImage(point) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;

    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 1080, 1920);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 80px Arial";
    ctx.fillText("AjudeJF", 350, 200);

    ctx.font = "50px Arial";
    ctx.fillText(point.name, 200, 500);

    ctx.font = "40px Arial";
    ctx.fillText("Precisa de:", 200, 650);

    let y = 750;
    point.needs.forEach(n => {
      ctx.fillText(`• ${n.category}`, 200, y);
      y += 80;
    });

    canvas.toBlob(async (blob) => {
      const file = new File([blob], "story-ajudejf.png", { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "AjudeJF"
        });
      }
    });
  }

  const copyToClipboard = async (text: string, description: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast({ description });
    } catch (err) {
      toast({
        variant: "destructive",
        description: "Erro ao copiar. Por favor, copie manualmente."
      });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-base text-foreground">{point.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{point.neighborhood}</p>
              {/* Exibição da Distância */}
              {point.distance !== undefined && (
                <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                  a {point.distance.toFixed(1)} km
                </span>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusClass(point.status)}`}>
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

          <DropdownMenu>
            <DropdownMenuTrigger className="text-primary font-medium hover:underline cursor-pointer outline-none text-left">
              {point.phone}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="start" className="w-56">
              {isMobile ? (
                <DropdownMenuItem asChild>
                  <a href={`tel:${point.phone}`} className="flex items-center gap-2 cursor-pointer w-full">
                    <Phone className="w-4 h-4" />
                    Ligar via operadora
                  </a>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => copyToClipboard(point.phone, "Telefone copiado!")} className="flex items-center gap-2 cursor-pointer">
                  <Copy className="w-4 h-4" />
                  Copiar número
                </DropdownMenuItem>
              )}

              <DropdownMenuItem asChild>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 cursor-pointer w-full"
                >
                  <MessageCircle className="w-4 h-4 text-green-600" />
                  Conversar no WhatsApp
                </a>
              </DropdownMenuItem>

              {isMobile && (
                <DropdownMenuItem onClick={() => copyToClipboard(point.phone, "Telefone copiado!")} className="flex items-center gap-2 cursor-pointer">
                  <Copy className="w-4 h-4" />
                  Copiar número
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground">{point.hours}</span>
        </div>

        {point.responsible && (
          <div className="text-sm text-muted-foreground">
            Responsável: <span className="text-foreground font-medium">{point.responsible}</span>
          </div>
        )}

        

        {/* Needs Section */}
        <div className="border-t border-border pt-3 mt-3">
          <button onClick={() => setExpanded(!expanded)} className="flex items-center justify-between w-full text-left">
            <p className="text-xs font-bold text-foreground">
              Necessidades Atuais ({regularNeeds.length})
            </p>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>

          <div className="flex items-center gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <span>🟡</span>
              <span className="text-muted-foreground">Baixo</span>
            </div>

            <div className="flex items-center gap-1">
              <span>🔴</span>
              <span className="text-muted-foreground">Urgente</span>
            </div>

            <div className="flex items-center gap-1">
              <span>🔵</span>
              <span className="text-muted-foreground">Em excesso - disponível para distribuição!</span>
            </div>
          </div>

          {expanded && (
            <div className="flex flex-wrap gap-2 mt-3">
              {regularNeeds.length > 0 ? (
                regularNeeds.map(need => (
                  <NeedBadge
                    key={need.id}
                    urgency={need.urgency}
                    label={need.category === 'Outros' && need.custom_label ? need.custom_label : need.category}
                  />
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">Sem necessidades registradas no momento</p>
              )}
            </div>
          )}
        </div>
      </div>

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

      <div className="px-4 pb-4">
        <button
          onClick={shareStoryImage.bind(null, point)}
          className="flex items-center justify-center gap-2 w-full 
               bg-gradient-to-r from-pink-500 to-purple-600 
               text-white text-sm font-semibold 
               py-2.5 px-4 rounded-lg 
               hover:opacity-90 transition-opacity"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar no Instagram
        </button>
      </div>

    </div>
  );
}