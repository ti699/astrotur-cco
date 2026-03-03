import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Campo {
  label: string;
  valor: string | number | undefined | null;
  badge?: boolean;
  badgeColor?: string;
}

interface DetalhesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  subtitulo?: string;
  campos: Campo[];
}

export function DetalhesDialog({
  open,
  onOpenChange,
  titulo,
  subtitulo,
  campos,
}: DetalhesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {subtitulo && (
            <p className="text-sm text-muted-foreground">{subtitulo}</p>
          )}
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4 py-4">
            {campos.map((campo, i) => (
              <div key={i} className={campo.label === "Descrição" ? "col-span-2" : ""}>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  {campo.label}
                </p>
                {campo.badge ? (
                  <Badge className={campo.badgeColor || ""}>
                    {campo.valor ?? "N/A"}
                  </Badge>
                ) : (
                  <p className="text-sm font-medium mt-0.5">
                    {campo.valor ?? "N/A"}
                  </p>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
