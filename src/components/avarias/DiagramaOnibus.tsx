interface DiagramaOnibusProps {
  value?: string;
  onChange?: (local: string) => void;
  readOnly?: boolean;
}

const areas = [
  { id: "Frontal", x: 85, y: 5, w: 70, h: 35, label: "Frontal" },
  { id: "Frontal lado esquerdo", x: 5, y: 5, w: 80, h: 35, label: "Front. Esq." },
  { id: "Frontal lado direito", x: 155, y: 5, w: 80, h: 35, label: "Front. Dir." },
  { id: "Lateral esquerda", x: 5, y: 45, w: 40, h: 110, label: "Lat. Esq." },
  { id: "Lateral direita", x: 195, y: 45, w: 40, h: 110, label: "Lat. Dir." },
  { id: "Teto", x: 50, y: 45, w: 140, h: 110, label: "Teto" },
  { id: "Traseiro lado esquerdo", x: 5, y: 160, w: 80, h: 35, label: "Tras. Esq." },
  { id: "Traseiro", x: 85, y: 160, w: 70, h: 35, label: "Traseiro" },
  { id: "Traseiro lado direito", x: 155, y: 160, w: 80, h: 35, label: "Tras. Dir." },
];

export function DiagramaOnibus({ value, onChange, readOnly }: DiagramaOnibusProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
        Localização no Veículo
      </p>
      <svg viewBox="0 0 240 200" className="w-full max-w-[320px] h-auto">
        {/* Bus outline */}
        <rect
          x="2" y="2" width="236" height="196" rx="20" ry="20"
          fill="none" stroke="hsl(var(--border))" strokeWidth="2"
        />
        {/* Windshield */}
        <path d="M 30 10 Q 120 -5 210 10" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.4" />
        {/* Rear */}
        <path d="M 30 190 Q 120 205 210 190" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.4" />

        {areas.map((area) => {
          const isSelected = value === area.id;
          return (
            <g key={area.id}>
              <rect
                x={area.x}
                y={area.y}
                width={area.w}
                height={area.h}
                rx="4"
                fill={isSelected ? "hsl(0, 84%, 60%)" : "hsl(var(--muted))"}
                fillOpacity={isSelected ? 0.35 : 0.5}
                stroke={isSelected ? "hsl(0, 84%, 50%)" : "hsl(var(--border))"}
                strokeWidth={isSelected ? 2 : 1}
                className={!readOnly ? "cursor-pointer hover:fill-opacity-70 transition-all" : ""}
                onClick={() => !readOnly && onChange?.(area.id)}
              />
              <text
                x={area.x + area.w / 2}
                y={area.y + area.h / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fontWeight={isSelected ? "bold" : "normal"}
                fill={isSelected ? "hsl(0, 84%, 40%)" : "hsl(var(--muted-foreground))"}
                className={!readOnly ? "pointer-events-none" : ""}
              >
                {area.label}
              </text>
            </g>
          );
        })}
      </svg>
      {value && (
        <p className="text-sm font-medium text-primary">{value}</p>
      )}
    </div>
  );
}
