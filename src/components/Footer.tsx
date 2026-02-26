import { Github, Instagram, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-border bg-card">
      <div className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Top */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Projeto */}
          <div>
            <h3 className="font-bold text-foreground text-sm mb-2">
              Ajude Juiz de Fora!!
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sistema colaborativo para divulgação de pontos de coleta e necessidades
              em tempo real durante desastres naturais em Juiz de Fora.
            </p>
          </div>

          {/* Desenvolvedores */}
          <div>
            <h3 className="font-bold text-foreground text-sm mb-2">
              Entre em contato com a gente!
            </h3>

            <div className="space-y-2 text-sm">
              
              {/* Gabriel */}
              <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                <span className="font-medium text-foreground">
                  Gabriel Senra
                </span>

                <a
                  href="https://instagram.com/gabreu_soaress"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:opacity-80 transition-opacity"
                >
                  <Instagram className="w-4 h-4" />
                  @gabreu_soaress
                </a>
              </div>

              {/* João */}
              <div className="flex items-center justify-between bg-background border border-border rounded-lg px-3 py-2">
                <span className="font-medium text-foreground">
                  João Antônio Fonseca
                </span>
                <a
                  href="https://instagram.com/j.aum_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:opacity-80 transition-opacity"
                >
                  <Instagram className="w-4 h-4" />
                  @j.aum_
                </a>
              </div>

            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} • Desenvolvido para ajudar Juiz de Fora
        </div>
      </div>
    </footer>
  );
}