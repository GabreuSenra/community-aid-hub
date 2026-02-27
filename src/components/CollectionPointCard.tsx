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

    // --- Card Central ---
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.roundRect(50, 250, 980, 1400, 40);
    ctx.fill();

    // --- Header / Logo ---
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 90px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🆘 Ajude JF", 540, 180);

    // --- Função para Quebra de Linha (Word Wrap) ---
    function wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
      const words = text.split(' ');
      let line = '';
      let currentY = y;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
          context.fillText(line, x, currentY);
          line = words[n] + ' ';
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      context.fillText(line, x, currentY);
      return currentY; // Retorna a posição Y final para sabermos onde desenhar o próximo elemento
    }

    // --- Nome do Local ---
    ctx.font = "bold 70px sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    // Chama a função de quebra de linha. 840 é a largura máxima permitida no card.
    const finalNameY = wrapText(ctx, point.name, 120, 380, 840, 80);

    // --- Endereço ---
    ctx.font = "40px sans-serif";
    ctx.fillStyle = "#94a3b8"; // Slate 400
    // O endereço agora é desenhado baseado na posição final do nome
    ctx.fillText(point.neighborhood, 120, finalNameY + 70);
    
    // --- Título Necessidades ---
    ctx.font = "bold 50px sans-serif";
    ctx.fillStyle = "#ffffff";
    // O título "Precisa de:" também desce se o nome for grande
    ctx.fillText("Precisa de:", 120, finalNameY + 200);

    // --- Lista de Necessidades com "Badges" ---
    // A lista começa abaixo do título
    let listY = finalNameY + 300; 
    
    // Mostra até 8 necessidades. Mudamos de point.needs para regularNeeds 
    // se você quiser filtrar a necessidade "Vagas" do story, mas deixarei o código original.
    const activeNeeds = point.needs?.filter(n => n.is_active).slice(0, 8) || [];
    
    activeNeeds.forEach(n => {
      const label = n.category === 'Outros' && n.custom_label ? n.custom_label : n.category;
      
      // Cor baseada na urgência
      let badgeColor = "#eab308"; // Amarelo (Baixo)
      if (n.urgency === 'urgent') badgeColor = "#ef4444"; // Vermelho
      if (n.urgency === 'excess') badgeColor = "#3b82f6"; // Azul

      // Desenha o marcador
      ctx.fillStyle = badgeColor;
      ctx.beginPath();
      ctx.arc(140, listY - 15, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "45px sans-serif";
      ctx.fillText(label, 180, listY);
      listY += 90;
    });

    // --- Footer / Link informativo ---
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 45px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Veja mais informações em:", 540, 1750);
    ctx.fillStyle = "#38bdf8"; // Sky 400
    ctx.font = "bold 55px sans-serif";
    ctx.fillText(window.location.origin, 540, 1830);

    // --- Processo de Compartilhamento ---
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "ajude-jf-ponto.png", { type: "image/png" });

      if (!isMobile) {
        // No Desktop: Baixa a imagem
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `ajude-jf-${point.name.replace(/\s+/g, '-').toLowerCase()}.png`;
        link.click();
        toast({ description: "Imagem baixada! Poste no seu Story." });
      } else if (navigator.canShare && navigator.canShare({ files: [file] })) {
        // No Mobile: Abre o menu de compartilhar (Instagram, WhatsApp, etc)
        try {
          await navigator.share({
            files: [file],
            title: "Ajude JF - " + point.name,
            text: `Confira as necessidades para ${point.name}. Acesse: ${window.location.href}`
          });
        } catch (err) {
          console.error("Erro ao compartilhar", err);
        }
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
                  Aproximadamente a {point.distance.toFixed(1)} km
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

    </div>
  );
}