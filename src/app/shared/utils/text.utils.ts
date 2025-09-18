/**
 * ¿Qué hace toSearchKey?
 * ----------------------
 * Convierte un texto a una versión "fácil de comparar" para buscar.
 * Piensa que queremos encontrar cosas aunque estén escritas distinto.
 *
 * Pasos que hace:
 * 1) Quita los espacios del principio y del final.
 * 2) Pone todas las letras en minúsculas.
 * 3) Quita los acentos y signos raros (ej.: "café" => "cafe").
 *
 * ¿Para qué sirve?
 * - Para que "CAFÉ", "cafe" y "   Café  " se consideren lo mismo al buscar.
 * - Así, si escribes "nino", también encuentra "niño".
 *
 * Ejemplos:
 * toSearchKey("  Café ")  -> "cafe"
 * toSearchKey("NiÑo")     -> "nino"
 * toSearchKey("  Hola  ") -> "hola"
 */

export function toSearchKey(value: unknown): string {
  if (value == null) return '';
  return (
    String(value)
      .normalize('NFKD') // descompone letras con acento: "á" -> "a" + mark
      // elimina marcas combinantes en varios rangos Unicode (más amplio que \u0300-\u036f)
      .replace(
        /[\u0300-\u036f\u1ab0-\u1aff\u1dc0-\u1dff\u20d0-\u20ff\ufe20-\ufe2f]/g,
        ''
      )
      .toLowerCase()
      .trim()
  );
}

export function includesNormalized(
  haystack: unknown,
  needle: unknown
): boolean {
  return toSearchKey(haystack).includes(toSearchKey(needle));
}
