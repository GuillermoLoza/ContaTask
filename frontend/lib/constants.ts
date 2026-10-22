export interface CodigoPais {
  code: string;
  country: string;
  flag: string;
}

export const CODIGOS_PAIS: CodigoPais[] = [
  { code: "+51", country: "Perú", flag: "🇵🇪" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴" },
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+506", country: "Costa Rica", flag: "🇨🇷" },
  { code: "+53", country: "Cuba", flag: "🇨🇺" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨" },
  { code: "+503", country: "El Salvador", flag: "🇸🇻" },
  { code: "+34", country: "España", flag: "🇪🇸" },
  { code: "+1", country: "EE.UU. / Canadá", flag: "🇺🇸" },
  { code: "+502", country: "Guatemala", flag: "🇬🇹" },
  { code: "+504", country: "Honduras", flag: "🇭🇳" },
  { code: "+52", country: "México", flag: "🇲🇽" },
  { code: "+505", country: "Nicaragua", flag: "🇳🇮" },
  { code: "+507", country: "Panamá", flag: "🇵🇦" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾" },
  { code: "+1787", country: "Puerto Rico", flag: "🇵🇷" },
  { code: "+1809", country: "Rep. Dominicana", flag: "🇩🇴" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+44", country: "Reino Unido", flag: "🇬🇧" },
  { code: "+49", country: "Alemania", flag: "🇩🇪" },
  { code: "+33", country: "Francia", flag: "🇫🇷" },
  { code: "+39", country: "Italia", flag: "🇮🇹" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japón", flag: "🇯🇵" },
];

/**
 * Parsea un teléfono celular separando el código de país del número local
 */
export function parseTelefonoCelular(celularRaw?: string | null): { codigoPais: string; numero: string } {
  if (!celularRaw) {
    return { codigoPais: "+51", numero: "" };
  }
  const clean = celularRaw.trim();
  if (clean.startsWith("+")) {
    // Buscar primero el código más largo para evitar colisiones (ej. +1787 vs +1)
    const ordenados = [...CODIGOS_PAIS].sort((a, b) => b.code.length - a.code.length);
    const encontrado = ordenados.find((p) => clean.startsWith(p.code));
    if (encontrado) {
      return {
        codigoPais: encontrado.code,
        numero: clean.slice(encontrado.code.length).replace(/\D/g, ""),
      };
    }
    const match = clean.match(/^(\+\d{1,4})\s*(.*)$/);
    if (match) {
      return {
        codigoPais: match[1],
        numero: match[2].replace(/\D/g, ""),
      };
    }
  }
  return {
    codigoPais: "+51",
    numero: clean.replace(/\D/g, ""),
  };
}
