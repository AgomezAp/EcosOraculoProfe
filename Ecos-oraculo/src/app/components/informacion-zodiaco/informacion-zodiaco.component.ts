import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  Optional,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { InformacionZodiacoService } from '../../services/informacion-zodiaco.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient } from '@angular/common/http';
import {
  loadStripe,
  Stripe,
  StripeElements,
  StripePaymentElement,
} from '@stripe/stripe-js';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RecolectaDatosComponent } from '../recolecta-datos/recolecta-datos.component';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environmets.prod';
import {
  FortuneWheelComponent,
  Prize,
} from '../fortune-wheel/fortune-wheel.component';
interface ZodiacMessage {
  content: string;
  isUser: boolean;
  timestamp: Date;
  sender: string;
}

// ✅ Definir AstrologerData según tu servicio
interface AstrologerData {
  name: string;
  title: string;
  specialty: string;
  experience: string;
}
interface ZodiacRequest {
  zodiacData: AstrologerData;
  userMessage: string;
  conversationHistory?: Array<{
    role: 'user' | 'astrologer';
    message: string;
  }>;
}

interface ZodiacResponse {
  success: boolean;
  response?: string;
  error?: string;
  timestamp: string;
}

interface AstrologerInfo {
  success: boolean;
  astrologer: {
    name: string;
    title: string;
    specialty: string;
    description: string;
  };
  timestamp: string;
}
@Component({
  selector: 'app-informacion-zodiaco',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RecolectaDatosComponent,
    FortuneWheelComponent,
  ],
  templateUrl: './informacion-zodiaco.component.html',
  styleUrl: './informacion-zodiaco.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InformacionZodiacoComponent
  implements OnInit, OnDestroy, AfterViewChecked
{
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  // Variables principales del chat
  currentMessage: string = '';
  messages: any[] = [];
  isLoading = false;
  hasStartedConversation = false;

  // Variables de control de scroll
  private shouldAutoScroll = true;
  private lastMessageCount = 0;

  showDataModal: boolean = false;
  userData: any = null;

  // Variables para control de pagos
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  hasUserPaidForAstrology: boolean = false;
  firstQuestionAsked: boolean = false;
  //Configuración de la rueda de la fortuna
  showFortuneWheel: boolean = false;
  astralPrizes: Prize[] = [
    {
      id: '1',
      name: '3 tiradas de la ruleta astral',
      color: '#4ecdc4',
      icon: '🔮',
    },
    { id: '2', name: '1 Lectura Astral Premium', color: '#45b7d1', icon: '✨' },

    {
      id: '4',
      name: '¡Inténtalo de nuevo!',
      color: '#ff7675',
      icon: '🌙',
    },
  ];
  private wheelTimer: any;
  // NUEVA PROPIEDAD para controlar mensajes bloqueados
  blockedMessageId: string | null = null;
  /*   private stripePublishableKey =
    'pk_live_51S419E5hUE7XrP4NUOjIhnHqmvG3gmEHxwXArkodb2aGD7aBMcBUjBR8QNOgdrRyidxckj2BCVnYMu9ZpkyJuwSS00ru89AmQL';
     pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC
    */
  // Configuración de Stripe
  private stripePublishableKey =
    'pk_live_51S419E5hUE7XrP4NUOjIhnHqmvG3gmEHxwXArkodb2aGD7aBMcBUjBR8QNOgdrRyidxckj2BCVnYMu9ZpkyJuwSS00ru89AmQL';
  private backendUrl = environment.apiUrl;

  astrologerInfo = {
    name: 'Maestra Carla',
    title: 'Guardiana de las Estrellas',
    specialty: 'Especialista en Astrología y Signos Zodiacales',
  };

  // Frases de bienvenida aleatorias
  welcomeMessages = [
    'Bienvenido, alma cósmica. Las estrellas me han susurrado tu llegada... ¿Qué misterios del zodíaco deseas desentrañar hoy?',
    'Los planetas se alinean para recibirte. Soy Maestra Carla, intérprete de los designios astrales. ¿Sobre qué signo o aspecto celestial deseas consultar?',
    'El cosmos vibra con tu presencia... Las constelaciones danzan esperando tus preguntas. Permíteme guiarte por los senderos del zodíaco.',
    'Ah, veo que los astros te han dirigido hacia mí. Los secretos de los signos zodiacales aguardan ser revelados. ¿Qué te inquieta del firmamento?',
  ];

  constructor(
    private http: HttpClient,
    private zodiacoService: InformacionZodiacoService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() public dialogRef: MatDialogRef<InformacionZodiacoComponent>,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
    } catch (error) {
      console.error('Error loading Stripe.js:', error);
      this.paymentError =
        'No se pudo cargar el sistema de pago. Por favor, recarga la página.';
    }

    this.hasUserPaidForAstrology =
      sessionStorage.getItem('hasUserPaidForAstrology') === 'true';

    // ✅ NUEVO: Cargar datos del usuario desde sessionStorage
    console.log(
      '🔍 Cargando datos del usuario desde sessionStorage para astrología...'
    );
    const savedUserData = sessionStorage.getItem('userData');
    if (savedUserData) {
      try {
        this.userData = JSON.parse(savedUserData);
        console.log(
          '✅ Datos del usuario restaurados para astrología:',
          this.userData
        );
      } catch (error) {
        console.error('❌ Error al parsear datos del usuario:', error);
        this.userData = null;
      }
    } else {
      console.log(
        'ℹ️ No hay datos del usuario guardados en sessionStorage para astrología'
      );
      this.userData = null;
    }

    const savedMessages = sessionStorage.getItem('astrologyMessages');
    const savedFirstQuestion = sessionStorage.getItem(
      'firstAstrologyQuestionAsked'
    );
    const savedBlockedMessageId = sessionStorage.getItem(
      'blockedAstrologyMessageId'
    );

    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        this.messages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        this.firstQuestionAsked = savedFirstQuestion === 'true';
        this.blockedMessageId = savedBlockedMessageId || null;
        this.hasStartedConversation = true;
        console.log(
          '✅ Mensajes de astrología restaurados desde sessionStorage'
        );
      } catch (error) {
        console.error('Error al restaurar mensajes:', error);
        this.clearSessionData();
        this.startConversation();
      }
    } else {
      this.startConversation();
    }

    this.checkPaymentStatus();

    // ✅ AGREGAR: Mostrar ruleta si ya hay conversación iniciada
    if (this.hasStartedConversation && FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(2000);
    }
  }

  private checkPaymentStatus(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentIntent = urlParams.get('payment_intent');
    const paymentIntentClientSecret = urlParams.get(
      'payment_intent_client_secret'
    );

    if (paymentIntent && paymentIntentClientSecret && this.stripe) {
      this.stripe
        .retrievePaymentIntent(paymentIntentClientSecret)
        .then(({ paymentIntent }) => {
          if (paymentIntent) {
            switch (paymentIntent.status) {
              case 'succeeded':
                console.log('✅ Pago astral confirmado desde URL');
                this.hasUserPaidForAstrology = true;
                sessionStorage.setItem('hasUserPaidForAstrology', 'true');
                this.blockedMessageId = null;
                sessionStorage.removeItem('blockedAstrologyMessageId');

                window.history.replaceState(
                  {},
                  document.title,
                  window.location.pathname
                );

                const lastMessage = this.messages[this.messages.length - 1];
                if (
                  !lastMessage ||
                  !lastMessage.content.includes('¡Pago confirmado!')
                ) {
                  const confirmationMsg = {
                    isUser: false,
                    content:
                      '✨ ¡Pago confirmado! Ahora puedes consultar los astros ilimitadamente. Los misterios del zodíaco están a tu disposición.',
                    timestamp: new Date(),
                  };
                  this.messages.push(confirmationMsg);
                  this.saveMessagesToSession();
                }
                break;

              case 'processing':
                console.log('⏳ Pago astral en procesamiento');
                break;

              case 'requires_payment_method':
                console.log('❌ Pago astral falló');
                this.clearSessionData();
                break;
            }
          }
        })
        .catch((error) => {
          console.error('Error verificando el pago astral:', error);
        });
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll && this.messages.length > this.lastMessageCount) {
      this.scrollToBottom();
      this.lastMessageCount = this.messages.length;
    }
  }

  ngOnDestroy(): void {
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }
  }
  showWheelAfterDelay(delayMs: number = 3000): void {
    if (this.wheelTimer) {
      clearTimeout(this.wheelTimer);
    }

    console.log('⏰ Timer configurado para', delayMs, 'ms');

    this.wheelTimer = setTimeout(() => {
      console.log('🎰 Verificando si puede mostrar ruleta...');

      if (
        FortuneWheelComponent.canShowWheel() &&
        !this.showPaymentModal &&
        !this.showDataModal
      ) {
        console.log('✅ Mostrando ruleta astral - usuario puede girar');
        this.showFortuneWheel = true;
        this.cdr.markForCheck();
      } else {
        console.log('❌ No se puede mostrar ruleta astral en este momento');
      }
    }, delayMs);
  }
  onPrizeWon(prize: Prize): void {
    console.log('🎉 Premio astral ganado:', prize);

    // Mostrar mensaje del astrólogo sobre el premio
    const prizeMessage = {
      isUser: false,
      content: `🌟 ¡Las energías cósmicas te han bendecido! Has ganado: **${prize.name}** ${prize.icon}\n\nEste regalo del universo ha sido activado para ti. Los misterios del zodíaco se revelan ante ti con mayor claridad. ¡Que la fortuna astral te acompañe en tus próximas consultas!`,
      timestamp: new Date(),
      isPrizeAnnouncement: true,
    };

    this.messages.push(prizeMessage);
    this.shouldAutoScroll = true;
    this.saveMessagesToSession();

    // Procesar el premio
    this.processAstralPrize(prize);
  }
  onWheelClosed(): void {
    console.log('🎰 Cerrando ruleta astral');
    this.showFortuneWheel = false;
  }

  triggerFortuneWheel(): void {
    console.log('🎰 Intentando activar ruleta astral manualmente...');

    if (this.showPaymentModal || this.showDataModal) {
      console.log('❌ No se puede mostrar - hay otros modales abiertos');
      return;
    }

    if (FortuneWheelComponent.canShowWheel()) {
      console.log('✅ Activando ruleta astral manualmente');
      this.showFortuneWheel = true;
      this.cdr.markForCheck();
    } else {
      console.log(
        '❌ No se puede activar ruleta astral - sin tiradas disponibles'
      );
      alert(
        'No tienes tiradas disponibles. ' +
          FortuneWheelComponent.getSpinStatus()
      );
    }
  }
  getSpinStatus(): string {
    return FortuneWheelComponent.getSpinStatus();
  }
  private processAstralPrize(prize: Prize): void {
    switch (prize.id) {
      case '1': // 3 Consultas Gratis
        this.addFreeAstrologyConsultations(3);
        break;
      case '2': // 1 Lectura Premium - ACCESO COMPLETO
        console.log('✨ Premio Premium ganado - Acceso ilimitado concedido');
        this.hasUserPaidForAstrology = true;
        sessionStorage.setItem('hasUserPaidForAstrology', 'true');

        // Desbloquear cualquier mensaje bloqueado
        if (this.blockedMessageId) {
          this.blockedMessageId = null;
          sessionStorage.removeItem('blockedAstrologyMessageId');
          console.log('🔓 Mensaje desbloqueado con acceso premium astral');
        }

        // Agregar mensaje especial para este premio
        const premiumMessage = {
          isUser: false,
          content:
            '✨ **¡Has desbloqueado el acceso Premium completo!** ✨\n\nLas estrellas han conspirado a tu favor de manera extraordinaria. Ahora tienes acceso ilimitado a toda la sabiduría astral. Puedes consultar sobre signos zodiacales, compatibilidades, predicciones astrológicas y todos los misterios celestiales cuantas veces desees.\n\n🌟 *Los astros han abierto todas sus puertas cósmicas para ti* 🌟',
          timestamp: new Date(),
        };
        this.messages.push(premiumMessage);
        this.shouldAutoScroll = true;
        this.saveMessagesToSession();
        break;
      // ✅ ELIMINADO: case '3' - 2 Consultas Extra
      case '4': // Otra oportunidad
        console.log('🔄 Otra oportunidad astral concedida');
        break;
      default:
        console.warn('⚠️ Premio astral desconocido:', prize);
    }
  }
  private addFreeAstrologyConsultations(count: number): void {
    const current = parseInt(
      sessionStorage.getItem('freeAstrologyConsultations') || '0'
    );
    const newTotal = current + count;
    sessionStorage.setItem('freeAstrologyConsultations', newTotal.toString());
    console.log(`🎁 Agregadas ${count} consultas astrales. Total: ${newTotal}`);

    // Si había un mensaje bloqueado, desbloquearlo
    if (this.blockedMessageId && !this.hasUserPaidForAstrology) {
      this.blockedMessageId = null;
      sessionStorage.removeItem('blockedAstrologyMessageId');
      console.log('🔓 Mensaje astral desbloqueado con consulta gratuita');
    }
  }

  private hasFreeAstrologyConsultationsAvailable(): boolean {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeAstrologyConsultations') || '0'
    );
    return freeConsultations > 0;
  }

  private useFreeAstrologyConsultation(): void {
    const freeConsultations = parseInt(
      sessionStorage.getItem('freeAstrologyConsultations') || '0'
    );

    if (freeConsultations > 0) {
      const remaining = freeConsultations - 1;
      sessionStorage.setItem(
        'freeAstrologyConsultations',
        remaining.toString()
      );
      console.log(`🎁 Consulta astral gratis usada. Restantes: ${remaining}`);

      // Mostrar mensaje informativo
      const prizeMsg = {
        isUser: false,
        content: `✨ *Has usado una consulta astral gratis* ✨\n\nTe quedan **${remaining}** consultas astrales gratis disponibles.`,
        timestamp: new Date(),
      };
      this.messages.push(prizeMsg);
      this.shouldAutoScroll = true;
      this.saveMessagesToSession();
    }
  }

  onScroll(event: any): void {
    const element = event.target;
    const threshold = 50;
    const isNearBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight <
      threshold;
    this.shouldAutoScroll = isNearBottom;
  }

  autoResize(event: any): void {
    const textarea = event.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  startConversation(): void {
    if (this.messages.length === 0) {
      const randomWelcome =
        this.welcomeMessages[
          Math.floor(Math.random() * this.welcomeMessages.length)
        ];

      const welcomeMessage = {
        isUser: false,
        content: randomWelcome,
        timestamp: new Date(),
      };

      this.messages.push(welcomeMessage);
    }
    this.hasStartedConversation = true;

    // ✅ AGREGAR VERIFICACIÓN DE RULETA
    if (FortuneWheelComponent.canShowWheel()) {
      this.showWheelAfterDelay(3000);
    } else {
      console.log(
        '🚫 No se puede mostrar ruleta astral - sin tiradas disponibles'
      );
    }
  }

  sendMessage(): void {
    if (this.currentMessage?.trim() && !this.isLoading) {
      const userMessage = this.currentMessage.trim();

      // ✅ NUEVA LÓGICA: Verificar consultas gratuitas ANTES de verificar pago
      if (!this.hasUserPaidForAstrology && this.firstQuestionAsked) {
        // Verificar si tiene consultas astrales gratis disponibles
        if (this.hasFreeAstrologyConsultationsAvailable()) {
          console.log('🎁 Usando consulta astral gratis del premio');
          this.useFreeAstrologyConsultation();
          // Continuar con el mensaje sin bloquear
        } else {
          // Si no tiene consultas gratis, mostrar modal de datos
          console.log(
            '💳 No hay consultas astrales gratis - mostrando modal de datos'
          );

          // Cerrar otros modales primero
          this.showFortuneWheel = false;
          this.showPaymentModal = false;

          // Guardar el mensaje para procesarlo después del pago
          sessionStorage.setItem('pendingAstrologyMessage', userMessage);

          this.saveStateBeforePayment();

          // Mostrar modal de datos con timeout
          setTimeout(() => {
            this.showDataModal = true;
            this.cdr.markForCheck();
            console.log('📝 showDataModal establecido a:', this.showDataModal);
          }, 100);

          return; // Salir aquí para no procesar el mensaje aún
        }
      }

      this.shouldAutoScroll = true;

      // Procesar mensaje normalmente
      this.processUserMessage(userMessage);
    }
  }

  // ✅ NUEVO: Separar lógica de procesamiento de mensajes
  private processUserMessage(userMessage: string): void {
    const userMsg = {
      isUser: true,
      content: userMessage,
      timestamp: new Date(),
    };
    this.messages.push(userMsg);

    this.saveMessagesToSession();
    this.currentMessage = '';
    this.isLoading = true;

    this.generateAstrologyResponse(userMessage).subscribe({
      next: (response: any) => {
        this.isLoading = false;

        const messageId = Date.now().toString();
        const astrologerMsg = {
          isUser: false,
          content: response,
          timestamp: new Date(),
          id: messageId,
        };
        this.messages.push(astrologerMsg);

        this.shouldAutoScroll = true;

        // ✅ LÓGICA MODIFICADA: Solo bloquear si no tiene consultas gratis Y no ha pagado
        if (
          this.firstQuestionAsked &&
          !this.hasUserPaidForAstrology &&
          !this.hasFreeAstrologyConsultationsAvailable()
        ) {
          this.blockedMessageId = messageId;
          sessionStorage.setItem('blockedAstrologyMessageId', messageId);

          setTimeout(() => {
            console.log(
              '🔒 Mensaje astral bloqueado - mostrando modal de datos'
            );
            this.saveStateBeforePayment();

            // Cerrar otros modales
            this.showFortuneWheel = false;
            this.showPaymentModal = false;

            // Mostrar modal de datos
            setTimeout(() => {
              this.showDataModal = true;
              this.cdr.markForCheck();
            }, 100);
          }, 2000);
        } else if (!this.firstQuestionAsked) {
          this.firstQuestionAsked = true;
          sessionStorage.setItem('firstAstrologyQuestionAsked', 'true');
        }

        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        this.isLoading = false;
        console.error('Error al obtener respuesta astrológica:', error);

        const errorMsg = {
          isUser: false,
          content:
            '🌟 Disculpa, las energías cósmicas están temporalmente perturbadas. Por favor, intenta nuevamente en unos momentos.',
          timestamp: new Date(),
        };
        this.messages.push(errorMsg);
        this.saveMessagesToSession();
        this.cdr.markForCheck();
      },
    });
  }
  private generateAstrologyResponse(userMessage: string): Observable<string> {
    // Crear el historial de conversación para el contexto
    const conversationHistory = this.messages
      .filter((msg) => msg.content && msg.content.trim() !== '')
      .map((msg) => ({
        role: msg.isUser ? ('user' as const) : ('astrologer' as const),
        message: msg.content,
      }));

    // Datos del astrólogo
    const astrologerData: AstrologerData = {
      name: this.astrologerInfo.name,
      title: this.astrologerInfo.title,
      specialty: this.astrologerInfo.specialty,
      experience:
        'Siglos de experiencia interpretando los designios celestiales y la influencia de los astros',
    };

    // ✅ Crear la solicitud con 'zodiacData' en lugar de 'astrologerData'
    const request: ZodiacRequest = {
      zodiacData: astrologerData, // ✅ Cambiar aquí
      userMessage,
      conversationHistory,
    };

    // Llamar al servicio y transformar la respuesta
    return this.zodiacoService.chatWithAstrologer(request).pipe(
      map((response: ZodiacResponse) => {
        if (response.success && response.response) {
          return response.response;
        } else {
          throw new Error(response.error || 'Error desconocido del servicio');
        }
      }),
      catchError((error: any) => {
        console.error('Error en el servicio de astrología:', error);
        return of(
          '🌟 Las estrellas están temporalmente nubladas. Los astros me susurran que debo recargar mis energías cósmicas. Por favor, intenta nuevamente en unos momentos.'
        );
      })
    );
  }

  private saveStateBeforePayment(): void {
    console.log('💾 Guardando estado astral antes del pago...');
    this.saveMessagesToSession();
    sessionStorage.setItem(
      'firstAstrologyQuestionAsked',
      this.firstQuestionAsked.toString()
    );
    if (this.blockedMessageId) {
      sessionStorage.setItem(
        'blockedAstrologyMessageId',
        this.blockedMessageId
      );
    }
  }

  private saveMessagesToSession(): void {
    try {
      const messagesToSave = this.messages.map((msg) => ({
        ...msg,
        timestamp:
          msg.timestamp instanceof Date
            ? msg.timestamp.toISOString()
            : msg.timestamp,
      }));
      sessionStorage.setItem(
        'astrologyMessages',
        JSON.stringify(messagesToSave)
      );
    } catch (error) {
      console.error('Error guardando mensajes astrales:', error);
    }
  }

  private clearSessionData(): void {
    sessionStorage.removeItem('hasUserPaidForAstrology');
    sessionStorage.removeItem('astrologyMessages');
    sessionStorage.removeItem('firstAstrologyQuestionAsked');
    sessionStorage.removeItem('blockedAstrologyMessageId');
  }

  isMessageBlocked(message: any): boolean {
    return (
      message.id === this.blockedMessageId && !this.hasUserPaidForAstrology
    );
  }

  async promptForPayment(): Promise<void> {
    console.log('💳 EJECUTANDO promptForPayment() para astrología');

    this.showPaymentModal = true;
    this.cdr.markForCheck(); // ✅ OnPush Change Detection
    this.paymentError = null;
    this.isProcessingPayment = true;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error destruyendo elemento anterior:', error);
      }
      this.paymentElement = undefined;
    }

    try {
      const items = [{ id: 'astrology_consultation_unlimited', amount: 400 }];

      // ✅ CARGAR DATOS DESDE sessionStorage SI NO ESTÁN EN MEMORIA
      if (!this.userData) {
        console.log(
          '🔍 userData no está en memoria, cargando desde sessionStorage para astrología...'
        );
        const savedUserData = sessionStorage.getItem('userData');
        if (savedUserData) {
          try {
            this.userData = JSON.parse(savedUserData);
            console.log(
              '✅ Datos cargados desde sessionStorage para astrología:',
              this.userData
            );
          } catch (error) {
            console.error('❌ Error al parsear datos guardados:', error);
            this.userData = null;
          }
        }
      }

      // ✅ VALIDAR DATOS ANTES DE CREAR customerInfo
      console.log(
        '🔍 Validando userData completo para astrología:',
        this.userData
      );

      if (!this.userData) {
        console.error('❌ No hay userData disponible para astrología');
        this.paymentError =
          'No se encontraron los datos del cliente. Por favor, completa el formulario primero.';
        this.isProcessingPayment = false;
        this.showDataModal = true;
        this.cdr.markForCheck();
        return;
      }

      // ✅ VALIDAR CAMPOS INDIVIDUALES CON CONVERSIÓN A STRING
      const nombre = this.userData.nombre?.toString().trim();
      // const apellido = this.userData.apellido?.toString().trim(); // ❌ ELIMINADO
      const email = this.userData.email?.toString().trim();
      const telefono = this.userData.telefono?.toString().trim();

      console.log('🔍 Validando campos individuales para astrología:');
      console.log('  - nombre:', `"${nombre}"`, nombre ? '✅' : '❌');
      // console.log('  - apellido:', `"${apellido}"`, apellido ? '✅' : '❌'); // ❌ ELIMINADO
      console.log('  - email:', `"${email}"`, email ? '✅' : '❌');
      console.log('  - telefono:', `"${telefono}"`, telefono ? '✅' : '❌');

      if (!nombre || !email || !telefono) { // ❌ QUITADO !apellido
        console.error('❌ Faltan campos requeridos para el pago de astrología');
        const faltantes = [];
        if (!nombre) faltantes.push('nombre');
        // if (!apellido) faltantes.push('apellido'); // ❌ ELIMINADO
        if (!email) faltantes.push('email');
        if (!telefono) faltantes.push('teléfono');

        this.paymentError = `Faltan datos del cliente: ${faltantes.join(
          ', '
        )}. Por favor, completa el formulario primero.`;
        this.isProcessingPayment = false;
        this.showDataModal = true;
        this.cdr.markForCheck();
        return;
      }

      // ✅ CREAR customerInfo SOLO SI TODOS LOS CAMPOS ESTÁN PRESENTES
      const customerInfo = {
        name: nombre, // ❌ Ya no concatenamos con apellido
        email: email,
        phone: telefono,
      };

      console.log(
        '📤 Enviando request de payment intent para astrología con datos del cliente...'
      );
      console.log('👤 Datos del cliente enviados:', customerInfo);

      const requestBody = { items, customerInfo };

      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          requestBody
        )
        .toPromise();

      console.log('📥 Respuesta de payment intent:', response);

      if (!response || !response.clientSecret) {
        throw new Error(
          'Error al obtener la información de pago del servidor.'
        );
      }
      this.clientSecret = response.clientSecret;
      console.log('🔑 clientSecret obtenido:', this.clientSecret);

      console.log('🔍 Verificando this.stripe:', this.stripe);
      console.log('🔍 Verificando this.clientSecret:', this.clientSecret);

      if (this.stripe && this.clientSecret) {
        console.log('✅ Stripe y clientSecret disponibles, creando elements...');
        this.elements = this.stripe.elements({
          clientSecret: this.clientSecret,
          appearance: { theme: 'stripe' },
        });
        console.log('✅ Elements creado:', this.elements);
        
        this.paymentElement = this.elements.create('payment');
        console.log('✅ Payment element creado:', this.paymentElement);
        
        this.isProcessingPayment = false;
        this.cdr.markForCheck();
        console.log('⏸️ isProcessingPayment = false, esperando actualización del DOM...');

        setTimeout(() => {
          const paymentElementContainer = document.getElementById(
            'payment-element-container'
          );
          console.log('🎯 Contenedor encontrado:', paymentElementContainer);

          if (paymentElementContainer && this.paymentElement) {
            console.log('✅ Montando payment element astral...');
            this.paymentElement.mount(paymentElementContainer);
            console.log('🎉 Payment element montado exitosamente!');
          } else {
            console.error('❌ Contenedor del elemento de pago no encontrado.');
            console.error('❌ paymentElement:', this.paymentElement);
            this.paymentError = 'No se pudo mostrar el formulario de pago.';
            this.cdr.markForCheck();
          }
        }, 100);
      } else {
        console.error('❌ Stripe o clientSecret no disponibles:');
        console.error('   - this.stripe:', this.stripe);
        console.error('   - this.clientSecret:', this.clientSecret);
        throw new Error(
          'Stripe.js o la clave secreta del cliente no están disponibles.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error al preparar el pago astral:', error);
      console.error('❌ Detalles del error:', error.error || error);
      this.paymentError =
        error.message ||
        'Error al inicializar el pago. Por favor, inténtalo de nuevo.';
      this.isProcessingPayment = false;
      this.cdr.markForCheck();
    }
  }
  async handlePaymentSubmit(): Promise<void> {
    if (
      !this.stripe ||
      !this.elements ||
      !this.clientSecret ||
      !this.paymentElement
    ) {
      this.paymentError =
        'El sistema de pago no está inicializado correctamente.';
      this.isProcessingPayment = false;
      return;
    }

    this.isProcessingPayment = true;
    this.paymentError = null;

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      confirmParams: {
        return_url: window.location.origin + window.location.pathname,
      },
      redirect: 'if_required',
    });

    if (error) {
      this.paymentError =
        error.message || 'Ocurrió un error inesperado durante el pago.';
      this.isProcessingPayment = false;
    } else if (paymentIntent) {
      switch (paymentIntent.status) {
        case 'succeeded':
          console.log('¡Pago exitoso para consultas astrales!');
          this.hasUserPaidForAstrology = true;
          sessionStorage.setItem('hasUserPaidForAstrology', 'true');
          
          this.blockedMessageId = null;
          sessionStorage.removeItem('blockedAstrologyMessageId');

          const confirmationMsg = {
            isUser: false,
            content:
              '✨ ¡Pago confirmado! Ahora puedes consultar los astros ilimitadamente. Los misterios del zodíaco están a tu disposición.',
            timestamp: new Date(),
          };
          this.messages.push(confirmationMsg);
          this.saveMessagesToSession();

          // ✅ CERRAR MODAL INMEDIATAMENTE después de confirmar pago
          this.showPaymentModal = false;
          this.isProcessingPayment = false;
          this.paymentElement?.destroy();
          this.cdr.markForCheck(); // ← Forzar actualización UI para cerrar modal

          // ✅ DESPUÉS procesar mensaje pendiente (esto mostrará el indicador de carga normal)
          const pendingMessage = sessionStorage.getItem(
            'pendingAstrologyMessage'
          );
          if (pendingMessage) {
            console.log(
              '📝 Procesando mensaje astral pendiente:',
              pendingMessage
            );
            sessionStorage.removeItem('pendingAstrologyMessage');

            // Procesar después de que el modal se haya cerrado
            setTimeout(() => {
              this.processUserMessage(pendingMessage);
            }, 300);
          }

          this.shouldAutoScroll = true;
          break;
        case 'processing':
          this.paymentError =
            'El pago se está procesando. Te notificaremos cuando se complete.';
          break;
        case 'requires_payment_method':
          this.paymentError =
            'Pago fallido. Por favor, intenta con otro método de pago.';
          this.isProcessingPayment = false;
          break;
        case 'requires_action':
          this.paymentError =
            'Se requiere una acción adicional para completar el pago.';
          this.isProcessingPayment = false;
          break;
        default:
          this.paymentError = `Estado del pago: ${paymentIntent.status}. Inténtalo de nuevo.`;
          this.isProcessingPayment = false;
          break;
      }
    } else {
      this.paymentError = 'No se pudo determinar el estado del pago.';
      this.isProcessingPayment = false;
    }
  }

  cancelPayment(): void {
    this.showPaymentModal = false;
    this.clientSecret = null;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }

    this.isProcessingPayment = false;
    this.paymentError = null;
  }

  clearConversation(): void {
    this.shouldAutoScroll = true;
    this.lastMessageCount = 0;

    if (!this.hasUserPaidForAstrology) {
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
      this.clearSessionData();
    } else {
      sessionStorage.removeItem('astrologyMessages');
      sessionStorage.removeItem('firstAstrologyQuestionAsked');
      sessionStorage.removeItem('blockedAstrologyMessageId');
      this.firstQuestionAsked = false;
      this.blockedMessageId = null;
    }

    this.messages = [];
    this.hasStartedConversation = false;
    this.startConversation();
    this.cdr.markForCheck();
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        const element = this.scrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
  formatMessage(content: string): string {
    if (!content) return '';

    let formattedContent = content;

    // Convertir **texto** a <strong>texto</strong> para negrilla
    formattedContent = formattedContent.replace(
      /\*\*(.*?)\*\*/g,
      '<strong>$1</strong>'
    );

    // Convertir saltos de línea a <br> para mejor visualización
    formattedContent = formattedContent.replace(/\n/g, '<br>');

    // Opcional: También puedes manejar *texto* (una sola asterisco) como cursiva
    formattedContent = formattedContent.replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      '<em>$1</em>'
    );

    return formattedContent;
  }

  // Métodos específicos del zodíaco - implementa según tu lógica
  getZodiacSymbol(sign: string): string {
    // Implementar lógica para símbolos del zodíaco
    return '♈'; // Ejemplo
  }

  getZodiacElement(sign: string): string {
    // Implementar lógica para elementos
    return 'Fuego'; // Ejemplo
  }

  getZodiacModality(sign: string): string {
    // Implementar lógica para modalidades
    return 'Cardinal'; // Ejemplo
  }
  onUserDataSubmitted(userData: any): void {
    console.log('📥 Datos del usuario recibidos en astrología:', userData);
    console.log('📋 Campos disponibles:', Object.keys(userData));

    // ✅ VALIDAR CAMPOS CRÍTICOS ANTES DE PROCEDER
    const requiredFields = ['nombre', 'email', 'telefono']; // ❌ QUITADO 'apellido'
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || userData[field].toString().trim() === ''
    );

    if (missingFields.length > 0) {
      console.error(
        '❌ Faltan campos obligatorios para astrología:',
        missingFields
      );
      alert(
        `Para proceder con el pago, necesitas completar: ${missingFields.join(
          ', '
        )}`
      );
      this.showDataModal = true; // Mantener modal abierto
      this.cdr.markForCheck();
      return;
    }

    // ✅ LIMPIAR Y GUARDAR datos INMEDIATAMENTE en memoria Y sessionStorage
    this.userData = {
      ...userData,
      nombre: userData.nombre?.toString().trim(),
      // apellido: userData.apellido?.toString().trim(), // ❌ ELIMINADO
      email: userData.email?.toString().trim(),
      telefono: userData.telefono?.toString().trim(),
    };

    // ✅ GUARDAR EN sessionStorage INMEDIATAMENTE
    try {
      sessionStorage.setItem('userData', JSON.stringify(this.userData));
      console.log(
        '✅ Datos guardados en sessionStorage para astrología:',
        this.userData
      );

      // Verificar que se guardaron correctamente
      const verificacion = sessionStorage.getItem('userData');
      console.log(
        '🔍 Verificación - Datos en sessionStorage para astrología:',
        verificacion ? JSON.parse(verificacion) : 'No encontrados'
      );
    } catch (error) {
      console.error('❌ Error guardando en sessionStorage:', error);
    }

    this.showDataModal = false;
    this.cdr.markForCheck();

    // ✅ NUEVO: Enviar datos al backend como en otros componentes
    this.sendUserDataToBackend(userData);
  }
  private sendUserDataToBackend(userData: any): void {
    console.log('📤 Enviando datos al backend desde astrología...');

    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) => {
        console.log(
          '✅ Datos enviados correctamente al backend desde astrología:',
          response
        );

        // ✅ LLAMAR A promptForPayment QUE INICIALIZA STRIPE
        this.promptForPayment();
      },
      error: (error) => {
        console.error(
          '❌ Error enviando datos al backend desde astrología:',
          error
        );

        // ✅ AUN ASÍ ABRIR EL MODAL DE PAGO
        console.log('⚠️ Continuando con el pago a pesar del error del backend');
        this.promptForPayment();
      },
    });
  }
  onDataModalClosed(): void {
    this.showDataModal = false;
    this.cdr.markForCheck();
  }
}
