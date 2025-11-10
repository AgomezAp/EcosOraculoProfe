export interface Datos {
    NIF: string;
    numero_pasapote: string; // ❌ ELIMINADO - se mantiene para compatibilidad pero se envía vacío
    pais: string; // ❌ ELIMINADO - se mantiene para compatibilidad pero se envía vacío
    nombre: string; // ✅ AHORA INCLUYE NOMBRE Y APELLIDO
    apellido: string; // ❌ ELIMINADO - se mantiene para compatibilidad pero se envía vacío
    direccion: string;
    calle: string; // ❌ ELIMINADO - se mantiene para compatibilidad pero se envía vacío
    codigo_postal: string;
    ciudad: string; // ❌ ELIMINADO - se mantiene para compatibilidad pero se envía vacío
    provincia: string; // ❌ ELIMINADO - se mantiene para compatibilidad pero se envía vacío
    comunidad_autonoma: string; // ❌ ELIMINADO - se mantiene para compatibilidad pero se envía vacío
    importe: string;
    email: string;
    telefono: string; // ✅ RESTAURADO
}

