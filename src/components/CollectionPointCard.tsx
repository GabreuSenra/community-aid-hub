import React from 'react';
import { RefreshCw, MapPin, Phone, Clock, ChevronDown, ChevronUp, MessageCircle, Copy } from 'lucide-react';
import { formatLastUpdated, CollectionPointWithNeeds, getMapsUrl, getStatusLabel, getStatusClass } from '@/lib/disaster';
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

  async function shareStoryImage(point: CollectionPointWithNeeds) {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // --- Fundo com Gradiente ---
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, "#1e293b"); // Slate 800
    gradient.addColorStop(1, "#0f172a"); // Slate 900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);

    // --- Header / Logo (Movido para a Esquerda) ---
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 90px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("🆘 Ajude JF", 60, 140);

    // --- Legenda (Canto Superior Direito) ---
    const legendX = 680;
    let legendY = 70;

    // Box da legenda
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.roundRect(legendX - 20, legendY - 35, 370, 140, 20);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.font = "26px sans-serif";

    // Item 1: Crítico
    ctx.fillStyle = "#ef4444";
    ctx.beginPath(); ctx.arc(legendX, legendY - 7, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Estoque crítico", legendX + 25, legendY);

    // Item 2: Baixo
    legendY += 40;
    ctx.fillStyle = "#eab308";
    ctx.beginPath(); ctx.arc(legendX, legendY - 7, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Estoque baixo", legendX + 25, legendY);

    // Item 3: Excesso
    legendY += 40;
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath(); ctx.arc(legendX, legendY - 7, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Estoque em excesso", legendX + 25, legendY);


    // --- Card Central ---
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.roundRect(50, 240, 980, 1430, 40);
    ctx.fill();

    // --- Função para Quebra de Linha (Word Wrap) ---
    function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
      const words = text.split(' ');
      let line = '';
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          context.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      context.fillText(line, x, currentY);
      return currentY;
    }

    // --- Nome do Local ---
    ctx.font = "bold 70px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    // Chama a função de quebra e salva onde o nome terminou
    const finalNameY = wrapText(ctx, point.name, 120, 360, 840, 80);

    // --- Endereço ---
    ctx.font = "40px sans-serif";
    ctx.fillStyle = "#94a3b8"; // Slate 400
    ctx.fillText(point.neighborhood, 120, finalNameY + 70);

    // --- Separação das Listas (Necessidades vs Excesso) ---
    const needsNeeded = regularNeeds.filter(n => n.urgency !== 'excess');
    const needsExcess = regularNeeds.filter(n => n.urgency === 'excess');

    let currentY = finalNameY + 180;

    // BLOCO 1: O que precisa
    if (needsNeeded.length > 0) {
      ctx.font = "bold 50px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Precisa de:", 120, currentY);
      currentY += 80;

      // Limita a 5 se houver excesso, ou 8 se não houver (para caber na tela)
      const limit = needsExcess.length > 0 ? 5 : 8;

      needsNeeded.slice(0, limit).forEach(n => {
        const label = n.category === 'Outros' && n.custom_label ? n.custom_label : n.category;

        ctx.fillStyle = n.urgency === 'urgent' ? "#ef4444" : "#eab308";
        ctx.beginPath();
        ctx.arc(140, currentY - 15, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "45px sans-serif";
        ctx.fillText(label, 180, currentY);
        currentY += 75;
      });

      currentY += 40;
    }

    // BLOCO 2: Excesso (Pode doar)
    if (needsExcess.length > 0) {
      ctx.font = "bold 50px sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Em Excesso (Pode doar para outros):", 120, currentY);
      currentY += 80;

      needsExcess.slice(0, 5).forEach(n => {
        const label = n.category === 'Outros' && n.custom_label ? n.custom_label : n.category;

        ctx.fillStyle = "#3b82f6"; // Azul
        ctx.beginPath();
        ctx.arc(140, currentY - 15, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "45px sans-serif";
        ctx.fillText(label, 180, currentY);
        currentY += 75;
      });
    }

    // --- Footer / Link informativo ---
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 45px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Veja mais informações em:", 540, 1750);
    ctx.fillStyle = "#38bdf8"; // Sky 400
    ctx.font = "bold 55px sans-serif";
    ctx.fillText(window.location.origin, 540, 1830);

    // --- Processo de Compartilhamento Seguro ---
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "ajude-jf-ponto.png", { type: "image/png" });

      const downloadFallback = () => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ajude-jf-${point.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
        toast({ description: "Imagem salva! Poste no seu Story." });
      };

      if (isMobile) {
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: "Ajude JF - " + point.name,
            });
            toast({ description: "Abrindo menu de compartilhamento..." });
          } catch (err: any) {
            if (err.name !== "AbortError") downloadFallback();
          }
        } else {
          downloadFallback();
        }
      } else {
        downloadFallback();
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
                  Aproximadamente a {point.distance.toFixed(1)} km da localização informada.
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${getStatusClass(point.status)}`}>
              {getStatusLabel(point.status)}
            </span>

            {/* Exibição da última atualização baseada na coluna updated_at */}
            {(point as any).updated_at && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <RefreshCw className="w-3 h-3" />
                {formatLastUpdated((point as any).updated_at)}
              </span>
            )}
          </div>
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
          onClick={() => shareStoryImage(point)}
          className="flex items-center justify-center gap-2 w-full 
               bg-gradient-to-r from-pink-500 via-purple-600 to-orange-500 
               text-white text-sm font-bold 
               py-3 px-4 rounded-lg 
               hover:opacity-90 active:scale-[0.98] transition-all shadow-md"
        >
          <Share2 className="w-4 h-4" />
          {isMobile ? "Compartilhar Story" : "Baixar Imagem para Story"}
        </button>
      </div>

    </div >
  );
}