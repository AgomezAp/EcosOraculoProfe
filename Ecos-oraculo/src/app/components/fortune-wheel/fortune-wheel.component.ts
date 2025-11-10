import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
export interface Prize {
  id: string;
  name: string;
  color: string;
  textColor?: string;
  icon?: string;
}

@Component({
  selector: 'app-fortune-wheel',
  imports: [CommonModule],
  standalone: true,
  templateUrl: './fortune-wheel.component.html',
  styleUrl: './fortune-wheel.component.css',
})
export class FortuneWheelComponent implements OnInit, OnDestroy {
  @Input() isVisible: boolean = false;
  @Input() prizes: Prize[] = [
    { id: '1', name: '3 Tiradas Gratis', color: '#4ecdc4', icon: '🎲' },
    { id: '2', name: '1 Consulta premium', color: '#45b7d1', icon: '🔮' },
    { id: '4', name: '¡Inténtalo otra vez!', color: '#ff7675', icon: '🔄' },
  ];

  @Output() onPrizeWon = new EventEmitter<Prize>();
  @Output() onWheelClosed = new EventEmitter<void>();

  @ViewChild('wheelElement') wheelElement!: ElementRef;

  // ✅ PROPIEDADES PARA LA RULETA
  segmentAngle: number = 0;
  currentRotation: number = 0;
  isSpinning: boolean = false;
  selectedPrize: Prize | null = null;
  wheelSpinning: boolean = false;

  // ✅ CONTROL DE ESTADO MEJORADO
  canSpinWheel: boolean = true;
  isProcessingClick: boolean = false; // ✅ NUEVO: Prevenir múltiples clics
  hasUsedDailyFreeSpIn: boolean = false;
  nextFreeSpinTime: Date | null = null;
  spinCooldownTimer: any;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.segmentAngle = 360 / this.prizes.length;
    this.checkSpinAvailability();
    this.startSpinCooldownTimer();
  }

  ngOnDestroy(): void {
    if (this.spinCooldownTimer) {
      clearInterval(this.spinCooldownTimer);
    }
  }
  get currentWheelSpins(): number {
    return this.getWheelSpinsCount();
  }
  // ✅ MÉTODO PRINCIPAL PARA VERIFICAR SI PUEDE MOSTRAR LA RULETA
  static canShowWheel(): boolean {
    const wheelSpins = parseInt(sessionStorage.getItem('wheelSpins') || '0');
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');
    const today = new Date().toDateString();

    console.log('🎰 Verificando disponibilidad:', {
      wheelSpins,
      lastSpinDate,
      today,
    });

    // Tiene tiradas extra para la ruleta
    if (wheelSpins > 0) {
      return true;
    }

    // Usuario nuevo (no ha girado nunca)
    if (!lastSpinDate) {
      return true;
    }

    // Ya usó su giro diario gratuito
    if (lastSpinDate === today) {
      return false;
    }

    // Nuevo día - puede usar giro gratuito
    return true;
  }

  // ✅ MÉTODO ESTÁTICO PARA VERIFICAR DESDE OTROS COMPONENTES
  static getSpinStatus(): string {
    const wheelSpins = parseInt(sessionStorage.getItem('wheelSpins') || '0');
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');
    const today = new Date().toDateString();

    if (wheelSpins > 0) {
      return `${wheelSpins} tiradas de ruleta disponibles`;
    }

    if (!lastSpinDate) {
      return 'Tirada gratuita disponible';
    }

    if (lastSpinDate !== today) {
      return 'Tirada diaria disponible';
    }

    return 'Sin tiradas disponibles hoy';
  }

  // ✅ VERIFICAR DISPONIBILIDAD DE TIRADAS
  checkSpinAvailability(): void {
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');
    const today = new Date().toDateString();
    const wheelSpins = this.getWheelSpinsCount();

    console.log('🔍 === VERIFICANDO DISPONIBILIDAD ===');
    console.log('Datos para verificación:', {
      lastSpinDate,
      today,
      wheelSpins,
      hasUsedDaily: this.hasUsedDailyFreeSpIn,
    });

    if (!lastSpinDate) {
      // Usuario nuevo - primera vez
      this.canSpinWheel = true;
      this.hasUsedDailyFreeSpIn = false;
      console.log('🆕 USUARIO NUEVO - Puede girar (primera vez)');
      return;
    }

    // Verificar si ya usó tirada diaria hoy
    if (lastSpinDate === today) {
      this.hasUsedDailyFreeSpIn = true;
      // Solo puede girar si tiene tiradas extra
      this.canSpinWheel = wheelSpins > 0;
      console.log('📅 YA USÓ TIRADA DIARIA HOY:', {
        puedeGirar: this.canSpinWheel,
        tirasExtra: wheelSpins,
      });
    } else {
      // Nuevo día - puede usar tirada gratuita
      this.hasUsedDailyFreeSpIn = false;
      this.canSpinWheel = true;
      console.log('🌅 NUEVO DÍA - Tirada diaria disponible');
    }

    console.log('✅ RESULTADO VERIFICACIÓN:', {
      canSpinWheel: this.canSpinWheel,
      hasUsedDailyFreeSpIn: this.hasUsedDailyFreeSpIn,
      wheelSpins: wheelSpins,
      status: this.canSpinWheel ? 'DISPONIBLE' : 'NO DISPONIBLE',
    });

    console.log('🔍 === FIN VERIFICACIÓN DISPONIBILIDAD ===');
  }

  async spinWheel() {
    console.log('🎰 === INICIO DE SPIN WHEEL ===');

    // ✅ VALIDACIONES ESTRICTAS
    if (this.isProcessingClick) {
      console.log('⚠️ Ya procesando un clic...');
      return;
    }

    if (!this.canSpinWheel || this.wheelSpinning || this.isSpinning) {
      console.log('❌ No se puede girar la ruleta ahora', {
        canSpinWheel: this.canSpinWheel,
        wheelSpinning: this.wheelSpinning,
        isSpinning: this.isSpinning,
      });
      return;
    }

    // ✅ BLOQUEAR INMEDIATAMENTE
    this.isProcessingClick = true;
    console.log('🔒 Bloqueando interfaz...');

    // ✅ MOSTRAR ESTADO ANTES DEL GIRO
    const wheelSpinsBefore = this.getWheelSpinsCount();
    const dreamConsultationsBefore = this.getDreamConsultationsCount();
    console.log('📊 Estado ANTES del giro:', {
      wheelSpins: wheelSpinsBefore,
      dreamConsultations: dreamConsultationsBefore,
      canSpinWheel: this.canSpinWheel,
      hasUsedDaily: this.hasUsedDailyFreeSpIn,
    });

    try {
      // ✅ ESTADOS DE BLOQUEO
      this.wheelSpinning = true;
      this.isSpinning = true;
      this.canSpinWheel = false;
      this.selectedPrize = null;
      this.cdr.markForCheck(); // ✅ Detectar cambios

      // ✅ USAR TIRADA INMEDIATAMENTE (ESTO DISMINUYE EL CONTADOR)
      this.handleSpinUsage();

      // ✅ VERIFICAR ESTADO DESPUÉS DEL USO
      const wheelSpinsAfter = this.getWheelSpinsCount();
      console.log('📊 Estado DESPUÉS del uso de tirada:', {
        antes: wheelSpinsBefore,
        después: wheelSpinsAfter,
        diferencia: wheelSpinsBefore - wheelSpinsAfter,
      });

      // ✅ DETERMINAR PREMIO GANADO
      const wonPrize = this.determineWonPrize();
      console.log('🎁 Premio determinado:', wonPrize);

      // ✅ ANIMACIÓN DE ROTACIÓN
      const minSpins = 6;
      const maxSpins = 10;
      const randomSpins = Math.random() * (maxSpins - minSpins) + minSpins;
      const finalRotation = randomSpins * 360;

      // Aplicar rotación gradual
      this.currentRotation += finalRotation;
      console.log('🔄 Rotación aplicada:', {
        randomSpins,
        finalRotation,
        currentRotation: this.currentRotation,
      });

      // ✅ ESPERAR ANIMACIÓN COMPLETA
      console.log('⏳ Esperando animación de 3 segundos...');
      await this.waitForAnimation(3000);

      // ✅ FINALIZAR ESTADOS DE ANIMACIÓN
      this.wheelSpinning = false;
      this.isSpinning = false;
      this.selectedPrize = wonPrize;
      this.cdr.markForCheck(); // ✅ Detectar cambios CRÍTICO

      console.log('🏆 Premio seleccionado final:', this.selectedPrize);

      // ✅ PROCESAR PREMIO (ESTO PUEDE AGREGAR MÁS TIRADAS/CONSULTAS)
      await this.processPrizeWon(wonPrize);

      // ✅ ESTADO DESPUÉS DE PROCESAR PREMIO
      const finalWheelSpins = this.getWheelSpinsCount();
      const finalDreamConsultations = this.getDreamConsultationsCount();
      console.log('📊 Estado FINAL después de procesar premio:', {
        wheelSpins: finalWheelSpins,
        dreamConsultations: finalDreamConsultations,
        premio: wonPrize.name,
      });

      // ✅ ACTUALIZAR DISPONIBILIDAD BASADA EN EL ESTADO FINAL
      this.updateSpinAvailabilityAfterPrize(wonPrize);

      // ✅ EMITIR EVENTO DEL PREMIO
      this.onPrizeWon.emit(wonPrize);
      
      this.cdr.markForCheck(); // ✅ Detectar cambios finales

      console.log('✅ Spin completado exitosamente');
    } catch (error) {
      console.error('❌ Error durante el spin:', error);

      // ✅ RESETEAR ESTADOS EN CASO DE ERROR
      this.wheelSpinning = false;
      this.isSpinning = false;
      this.selectedPrize = null;
      this.cdr.markForCheck(); // ✅ Detectar cambios en error

      // Restaurar disponibilidad
      this.checkSpinAvailability();
    } finally {
      // ✅ LIBERAR BLOQUEO DESPUÉS DE UN DELAY
      setTimeout(() => {
        this.isProcessingClick = false;
        console.log('🔓 Liberando bloqueo de interfaz');

        // ✅ VERIFICACIÓN FINAL DE DISPONIBILIDAD
        this.checkSpinAvailability();
        
        this.cdr.markForCheck(); // ✅ Detectar cambios al liberar

        console.log('📊 Estado FINAL FINAL:', {
          wheelSpins: this.getWheelSpinsCount(),
          dreamConsultations: this.getDreamConsultationsCount(),
          canSpinWheel: this.canSpinWheel,
          hasUsedDaily: this.hasUsedDailyFreeSpIn,
          isProcessingClick: this.isProcessingClick,
        });
      }, 1000);
    }

    console.log('🎰 === FIN DE SPIN WHEEL ===');
  }
  private updateSpinAvailabilityAfterPrize(wonPrize: Prize): void {
    console.log('🔄 === ACTUALIZANDO DISPONIBILIDAD POST-PREMIO ===');

    const wheelSpins = this.getWheelSpinsCount();
    const today = new Date().toDateString();
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');

    console.log('Estado para evaluar disponibilidad:', {
      prizeId: wonPrize.id,
      prizeName: wonPrize.name,
      wheelSpins: wheelSpins,
      hasUsedDaily: this.hasUsedDailyFreeSpIn,
      lastSpinDate,
      today,
    });

    // ✅ LÓGICA DE DISPONIBILIDAD
    if (wheelSpins > 0) {
      // Tiene tiradas extra disponibles
      this.canSpinWheel = true;
      console.log(
        '✅ PUEDE SEGUIR GIRANDO - Tiradas extra disponibles:',
        wheelSpins
      );
    } else if (!this.hasUsedDailyFreeSpIn) {
      // Verificar si puede usar tirada diaria (no debería llegar aquí tras usar una)
      this.canSpinWheel = lastSpinDate !== today;
      console.log('🎁 Verificando tirada diaria:', {
        canUse: this.canSpinWheel,
        lastSpinDate,
        today,
      });
    } else {
      // Ya usó su tirada diaria y no tiene extra
      this.canSpinWheel = false;
      console.log('❌ SIN TIRADAS - Diaria usada y sin extras');
    }

    console.log('✅ DISPONIBILIDAD FINAL:', {
      canSpinWheel: this.canSpinWheel,
      wheelSpins: wheelSpins,
      hasUsedDaily: this.hasUsedDailyFreeSpIn,
      reasoning: this.canSpinWheel ? 'Puede girar' : 'No puede girar',
    });

    console.log('🔄 === FIN ACTUALIZACIÓN DISPONIBILIDAD ===');
  }
  // ✅ FUNCIÓN AUXILIAR PARA ESPERAR
  private waitForAnimation(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, ms);
    });
  }

  private handleSpinUsage(): void {
    const wheelSpins = this.getWheelSpinsCount();
    const today = new Date().toDateString();
    const lastSpinDate = sessionStorage.getItem('lastWheelSpinDate');

    console.log('🎯 Manejando uso de tirada:', {
      wheelSpins,
      today,
      lastSpinDate,
      hasUsedDaily: this.hasUsedDailyFreeSpIn,
    });

    if (wheelSpins > 0) {
      // ✅ USAR TIRADA EXTRA DE RULETA
      const newCount = wheelSpins - 1;
      sessionStorage.setItem('wheelSpins', newCount.toString());
      console.log(
        `🎁 Usada tirada extra de ruleta. Antes: ${wheelSpins}, Ahora: ${newCount}`
      );

      // ✅ ACTUALIZAR INMEDIATAMENTE LA DISPONIBILIDAD
      this.checkSpinAvailability();
    } else {
      // ✅ USAR TIRADA DIARIA GRATUITA
      sessionStorage.setItem('lastWheelSpinDate', today);
      sessionStorage.setItem('lastWheelSpinTime', Date.now().toString());
      this.hasUsedDailyFreeSpIn = true;
      console.log('📅 Usada tirada diaria gratuita');
    }
  }

  // ✅ PROCESAR PREMIO GANADO (MEJORADO)
  private async processPrizeWon(prize: Prize): Promise<void> {
    console.log('🎁 Procesando premio:', prize);

    switch (prize.id) {
      case '1': // 3 Tiradas Gratis de Ruleta
        this.grantWheelSpins(3);
        break;
      case '2': // 1 Consulta Gratis de Sueños
        this.grantDreamConsultations(1);
        break;
      case '4': // Inténtalo otra vez
        this.grantRetryChance();
        break;
      default:
        console.warn('⚠️ Premio desconocido:', prize);
    }

    this.savePrizeToHistory(prize);
  }

  // ✅ OTORGAR TIRADAS DE RULETA (SEPARADO)
  private grantWheelSpins(count: number): void {
    console.log(`🎰 Otorgadas ${count} tiradas de ruleta`);
    const currentSpins = this.getWheelSpinsCount();
    sessionStorage.setItem('wheelSpins', (currentSpins + count).toString());
  }

  // ✅ OTORGAR CONSULTAS DE SUEÑOS (SEPARADO)
  private grantDreamConsultations(count: number): void {
    console.log(`🔮 Otorgadas ${count} consultas de sueños`);
    const currentConsultations = parseInt(
      sessionStorage.getItem('dreamConsultations') || '0'
    );
    sessionStorage.setItem(
      'dreamConsultations',
      (currentConsultations + count).toString()
    );

    // Desbloquear mensaje si había uno bloqueado
    const blockedMessageId = sessionStorage.getItem('blockedMessageId');
    const hasUserPaid =
      sessionStorage.getItem('hasUserPaidForDreams') === 'true';

    if (blockedMessageId && !hasUserPaid) {
      console.log('🔓 Desbloqueando mensaje con consulta gratis ganada');
      sessionStorage.removeItem('blockedMessageId');
    }
  }

  // ✅ OTORGAR OTRA OPORTUNIDAD (NUEVO)
  private grantRetryChance(): void {
    console.log('🔄 Otorgando otra oportunidad inmediata');
   
  }
  shouldShowContinueButton(prize: Prize | null): boolean {
    if (!prize) return false;

    // Premios que otorgan tiradas extra (no cerrar modal)
    const spinsGrantingPrizes = ['1', '4']; // Solo 3 tiradas e inténtalo otra vez
    return spinsGrantingPrizes.includes(prize.id);
  }
  shouldShowCloseButton(prize: Prize | null): boolean {
    if (!prize) return false;
    return prize.id === '2';
  }
  continueSpinning(): void {
    console.log('🔄 === CONTINUANDO SPINNING ===');
    console.log('Estado antes de continuar:', {
      selectedPrize: this.selectedPrize?.name,
      wheelSpins: this.getWheelSpinsCount(),
      canSpinWheel: this.canSpinWheel,
      isProcessingClick: this.isProcessingClick,
    });

    // ✅ RESETEAR ESTADO PARA PERMITIR OTRA TIRADA
    this.selectedPrize = null;
    this.isProcessingClick = false;
    this.wheelSpinning = false;
    this.isSpinning = false;

    // ✅ VERIFICAR DISPONIBILIDAD ACTUALIZADA
    this.checkSpinAvailability();
    
    this.cdr.markForCheck(); // ✅ Detectar cambios

    console.log('Estado después de continuar:', {
      canSpinWheel: this.canSpinWheel,
      wheelSpins: this.getWheelSpinsCount(),
      isProcessingClick: this.isProcessingClick,
    });

    console.log('🔄 === FIN CONTINUAR SPINNING ===');
  }

  // ✅ MÉTODOS AUXILIARES ACTUALIZADOS
  hasFreeSpinsAvailable(): boolean {
    return this.getWheelSpinsCount() > 0;
  }

  getWheelSpinsCount(): number {
    return parseInt(sessionStorage.getItem('wheelSpins') || '0');
  }

  getFreeSpinsCount(): number {
    // Mantener compatibilidad con template
    return this.getWheelSpinsCount();
  }

  getDreamConsultationsCount(): number {
    return parseInt(sessionStorage.getItem('dreamConsultations') || '0');
  }

  getTimeUntilNextSpin(): string {
    if (!this.nextFreeSpinTime) return '';

    const now = new Date().getTime();
    const timeLeft = this.nextFreeSpinTime.getTime() - now;

    if (timeLeft <= 0) return '';

    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  }

  // ✅ DETERMINAR PREMIO (SIN CAMBIOS)
  private determineWonPrize(): Prize {
    const random = Math.random();

    if (random < 0.2) {
      return this.prizes[0]; // 20% - 3 Tiradas Gratis
    } else if (random < 0.35) {
      return this.prizes[1]; // 15% - 1 Consulta Premium
    } else {
      return this.prizes[2]; // 65% - Inténtalo otra vez
    }
  }

  // ✅ GUARDAR PREMIO EN HISTORIAL
  private savePrizeToHistory(prize: Prize): void {
    const prizeHistory = JSON.parse(
      sessionStorage.getItem('prizeHistory') || '[]'
    );
    prizeHistory.push({
      prize: prize,
      timestamp: new Date().toISOString(),
      claimed: true,
    });
    sessionStorage.setItem('prizeHistory', JSON.stringify(prizeHistory));
  }

  // ✅ TIMER PARA COOLDOWN
  startSpinCooldownTimer(): void {
    if (this.spinCooldownTimer) {
      clearInterval(this.spinCooldownTimer);
    }

    if (this.nextFreeSpinTime && !this.canSpinWheel) {
      this.spinCooldownTimer = setInterval(() => {
        const now = new Date().getTime();
        const timeLeft = this.nextFreeSpinTime!.getTime() - now;

        if (timeLeft <= 0) {
          this.canSpinWheel = true;
          this.nextFreeSpinTime = null;
          clearInterval(this.spinCooldownTimer);
          this.cdr.markForCheck(); // ✅ Detectar cambios cuando termina cooldown
        }
      }, 1000);
    }
  }

  // ✅ CERRAR RULETA
  closeWheel() {
    this.onWheelClosed.emit();
    this.resetWheel();
    this.cdr.markForCheck(); // ✅ Detectar cambios al cerrar
  }

  // ✅ RESET WHEEL
  private resetWheel() {
    this.selectedPrize = null;
    this.wheelSpinning = false;
    this.isSpinning = false;
    this.isProcessingClick = false;
    this.cdr.markForCheck(); // ✅ Detectar cambios al resetear
  }

  // ✅ MÉTODO PARA CERRAR DESDE TEMPLATE
  onWheelClosedHandler() {
    this.closeWheel();
  }
}
