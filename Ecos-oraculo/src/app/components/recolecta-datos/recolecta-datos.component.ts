import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RecolectaService } from '../../services/recolecta.service';
import { Datos } from '../../interfaces/datos';

@Component({
  selector: 'app-recolecta-datos',
  imports: [CommonModule, FormsModule],
  templateUrl: './recolecta-datos.component.html',
  styleUrl: './recolecta-datos.component.css',
})
export class RecolectaDatosComponent {
  // ✅ Eventos de salida
  @Output() onDataSubmitted = new EventEmitter<any>();
  @Output() onModalClosed = new EventEmitter<void>();
  constructor(private recolecta: RecolectaService) {}
  // ✅ Propiedades de datos
  userData: any = {
    NIF: '',
    // numero_pasapote: '', // ❌ ELIMINADO
    // pais: '', // ❌ ELIMINADO
    nombre: '', // ✅ AHORA INCLUYE NOMBRE Y APELLIDO
    // apellido: '', // ❌ ELIMINADO - unificado con nombre
    direccion: '',
    // calle: '', // ❌ ELIMINADO
    codigo_postal: '',
    // ciudad: '', // ❌ ELIMINADO
    // provincia: '', // ❌ ELIMINADO
    // comunidad_autonoma: '', // ❌ ELIMINADO
    importe: 4.0,
    email: '',
    telefono: '', // ✅ RESTAURADO
  };
  aceptaTerminos = false;
  showTerminosError = false;
  datosVeridicos = false;
  showDatosVeridicosError = false;
  emailNotifications = false;
  // ✅ Control de formulario
  dataFormErrors: { [key: string]: string } = {};
  isValidatingData: boolean = false;
  attemptedDataSubmission: boolean = false;

  // ✅ Listas de opciones
  countries = [
    'España',
    'México',
    'Argentina',
    'Colombia',
    'Chile',
    'Perú',
    'Venezuela',
    'Ecuador',
    'Bolivia',
    'Paraguay',
    'Uruguay',
    'Costa Rica',
    'Panamá',
    'Nicaragua',
    'Honduras',
    'El Salvador',
    'Guatemala',
    'República Dominicana',
    'Cuba',
    'Puerto Rico',
    'Estados Unidos',
    'Canadá',
    'Brasil',
    'Francia',
    'Italia',
    'Alemania',
    'Reino Unido',
    'Portugal',
    'Otros',
  ];

  comunidadesAutonomas = [
    'Andalucía',
    'Aragón',
    'Asturias',
    'Baleares',
    'Canarias',
    'Cantabria',
    'Castilla-La Mancha',
    'Castilla y León',
    'Cataluña',
    'Comunidad Valenciana',
    'Extremadura',
    'Galicia',
    'Madrid',
    'Murcia',
    'Navarra',
    'País Vasco',
    'La Rioja',
  ];

  // ✅ Método para validar datos
  validateUserData(): boolean {
    this.dataFormErrors = {};
    let isValid = true;

    console.log('🔍 Validando userData:', this.userData); // DEBUG

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.userData.email || !this.userData.email.toString().trim()) {
      this.dataFormErrors['email'] = 'El email es obligatorio';
      isValid = false;
    } else if (!emailRegex.test(this.userData.email.toString().trim())) {
      this.dataFormErrors['email'] = 'Ingresa un email válido';
      isValid = false;
    }

    // Validar nombre (ahora incluye nombre y apellido)
    if (!this.userData.nombre || !this.userData.nombre.toString().trim()) {
      this.dataFormErrors['nombre'] = 'El nombre completo es obligatorio';
      isValid = false;
    } else if (this.userData.nombre.toString().trim().length < 3) {
      this.dataFormErrors['nombre'] =
        'El nombre completo debe tener al menos 3 caracteres';
      isValid = false;
    }

    // ❌ ELIMINADO - Validar apellido (unificado con nombre)

    // ❌ ELIMINADO - Validar país

    // ✅ Validar teléfono
    if (!this.userData.telefono || !this.userData.telefono.toString().trim()) {
      this.dataFormErrors['telefono'] = 'El teléfono es obligatorio';
      console.log('❌ Teléfono vacío o no existe');
      isValid = false;
    } else if (this.userData.telefono.toString().trim().length < 9) {
      this.dataFormErrors['telefono'] =
        'El teléfono debe tener al menos 9 dígitos';
      console.log(
        '❌ Teléfono muy corto:',
        this.userData.telefono.toString().trim().length
      );
      isValid = false;
    } else {
      console.log(
        '✅ Teléfono válido:',
        this.userData.telefono.toString().trim()
      );
    }

    // Validar dirección
    if (
      !this.userData.direccion ||
      !this.userData.direccion.toString().trim()
    ) {
      this.dataFormErrors['direccion'] = 'La dirección es obligatoria';
      isValid = false;
    }

    // Validar código postal
    if (
      !this.userData.codigo_postal ||
      !this.userData.codigo_postal.toString().trim()
    ) {
      this.dataFormErrors['codigo_postal'] = 'El código postal es obligatorio';
      isValid = false;
    }

    // ❌ ELIMINADO - Validar ciudad

    // Validar NIF
    const nif = this.userData.NIF ? this.userData.NIF.toString().trim() : '';

    if (!nif) {
      this.dataFormErrors['NIF'] = 'Debes proporcionar tu NIF/NIE/DNI';
      isValid = false;
    }

    console.log('🔍 Resultado de validación:', {
      isValid,
      errores: this.dataFormErrors,
    });

    return isValid;
  }

  // ✅ Método para verificar errores
  hasError(field: string): boolean {
    return this.attemptedDataSubmission && !!this.dataFormErrors[field];
  }

  async submitUserData(): Promise<void> {
    console.log('🔍 Iniciando submitUserData...'); // DEBUG
    console.log('🔍 Estado actual de userData:', this.userData); // DEBUG EXTRA

    this.attemptedDataSubmission = true;

    // Validar formulario
    if (!this.validateUserData()) {
      console.log('❌ Validación fallida:', this.dataFormErrors); // DEBUG
      return;
    }

    // Validar términos y condiciones
    this.showTerminosError = false;
    this.showDatosVeridicosError = false;

    if (!this.aceptaTerminos) {
      this.showTerminosError = true;
      console.log('❌ Términos no aceptados'); // DEBUG
      return;
    }

    if (!this.datosVeridicos) {
      this.showDatosVeridicosError = true;
      console.log('❌ Datos verídicos no confirmados'); // DEBUG
      return;
    }

    this.isValidatingData = true;
    console.log('✅ Todas las validaciones pasaron, enviando datos...'); // DEBUG

    try {
      // ✅ LIMPIAR Y NORMALIZAR DATOS ANTES DE ENVIAR
      const datosToSend: Datos = {
        NIF: (this.userData.NIF || '').toString().trim(),
        numero_pasapote: '', // ❌ ELIMINADO - enviar vacío
        pais: '', // ❌ ELIMINADO - enviar vacío
        nombre: (this.userData.nombre || '').toString().trim(), // ✅ AHORA INCLUYE NOMBRE Y APELLIDO
        apellido: '', // ❌ ELIMINADO - enviar vacío
        direccion: (this.userData.direccion || '').toString().trim(),
        calle: '', // ❌ ELIMINADO - enviar vacío
        codigo_postal: (this.userData.codigo_postal || '').toString().trim(),
        ciudad: '', // ❌ ELIMINADO - enviar vacío
        provincia: '', // ❌ ELIMINADO - enviar vacío
        comunidad_autonoma: '', // ❌ ELIMINADO - enviar vacío
        importe: this.userData.importe || 4.0,
        email: (this.userData.email || '').toString().trim(),
        telefono: (this.userData.telefono || '').toString().trim(), // ✅ RESTAURADO
      };

      console.log('📤 Datos a enviar (limpios):', datosToSend); // DEBUG
      console.log('📞 Teléfono específico:', {
        original: this.userData.telefono,
        limpio: datosToSend.telefono,
        longitud: datosToSend.telefono.length,
      }); // DEBUG TELÉFONO

      // ✅ VALIDAR UNA VEZ MÁS LOS CAMPOS CRÍTICOS
      const camposCriticos = ['nombre', 'email', 'telefono', 'NIF', 'direccion', 'codigo_postal'];
      const faltantes = camposCriticos.filter(
        (campo) => !datosToSend[campo as keyof Datos]
      );

      if (faltantes.length > 0) {
        console.error(
          '❌ Faltan campos críticos después de la limpieza:',
          faltantes
        );
        this.dataFormErrors[
          'general'
        ] = `Faltan campos obligatorios: ${faltantes.join(', ')}`;
        this.isValidatingData = false;
        return;
      }

      // Guardar en sessionStorage
      sessionStorage.setItem('userData', JSON.stringify(datosToSend));
      console.log('💾 Datos guardados en sessionStorage');

      // Verificar que se guardaron correctamente
      const verificacion = sessionStorage.getItem('userData');
      const datosGuardados = verificacion ? JSON.parse(verificacion) : null;
      console.log('🔍 Verificación sessionStorage:', datosGuardados);
      console.log('📞 Teléfono en sessionStorage:', datosGuardados?.telefono);

      // Llamar al servicio
      this.recolecta.createProduct(datosToSend).subscribe({
        next: (response: Datos) => {
          console.log('✅ Respuesta del backend:', response); // DEBUG
          this.isValidatingData = false;
          this.onDataSubmitted.emit(datosToSend); // ✅ EMITIR datosToSend en lugar de response
        },
        error: (error: any) => {
          console.error('❌ Error del backend:', error); // DEBUG
          console.error('❌ Error completo:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url,
            error: error.error,
          });

          // ✅ AUN ASÍ EMITIR LOS DATOS PARA CONTINUAR CON EL PAGO
          console.log(
            '⚠️ Error del backend, pero continuando con los datos locales'
          );
          this.isValidatingData = false;
          this.onDataSubmitted.emit(datosToSend); // ✅ EMITIR datos locales
        },
      });
    } catch (error) {
      console.error('❌ Error inesperado:', error); // DEBUG
      this.dataFormErrors['general'] =
        'Error inesperado. Por favor, inténtalo de nuevo.';
      this.isValidatingData = false;
    }
  }
  cancelDataModal(): void {
    this.onModalClosed.emit();
  }
}
