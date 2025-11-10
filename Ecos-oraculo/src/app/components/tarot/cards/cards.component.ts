import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { TextPlugin } from 'gsap/TextPlugin';
import {
  Stripe,
  StripeElements,
  StripePaymentElement,
  loadStripe,
} from '@stripe/stripe-js';
import { CardService } from '../../../services/tarot/card.service';
import { ParticlesComponent } from '../../../shared/particles/particles.component';
import { RecolectaDatosComponent } from '../../recolecta-datos/recolecta-datos.component';
import { environment } from '../../../environments/environmets.prod';

gsap.registerPlugin(Draggable, MotionPathPlugin, TextPlugin);
interface Card {
  id: number;
  name: string;
  src: string;
  revealed: boolean;
  selected: boolean;
  descriptions?: string[]; // ✅ PLURAL y ARRAY
}
@Component({
  selector: 'app-cards',
  imports: [CommonModule, ParticlesComponent, RecolectaDatosComponent],
  templateUrl: './cards.component.html',
  styleUrl: './cards.component.css',
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      transition(':enter', [animate('1s ease-in', style({ opacity: 1 }))]),
    ]),
  ],
})
export class CardsComponent implements OnInit, AfterViewInit, OnDestroy {
  cards: Card[] = [];
  selectedCards: Card[] = [];
  showDataModal: boolean = false;
  userData: any = null;

  private theme: string = '';
  private isAnimating: boolean = false;
  private isInitialAnimationComplete: boolean = false;
  private cardElements: HTMLElement[] = [];
  private timeline: gsap.core.Timeline | null = null;

  // Datos para enviar

  // Stripe and Payment Modal Properties
  showPaymentModal: boolean = false;
  stripe: Stripe | null = null;
  elements: StripeElements | undefined;
  paymentElement: StripePaymentElement | undefined;
  clientSecret: string | null = null;
  isProcessingPayment: boolean = false;
  paymentError: string | null = null;
  // Stripe configuration
  /* pk_test_51ROf7V4GHJXfRNdQ8ABJKZ7NXz0H9IlQBIxcFTOa6qT55QpqRhI7NIj2VlMUibYoXEGFDXAdalMQmHRP8rp6mUW900RzRJRhlC 
    pk_live_51S419E5hUE7XrP4NUOjIhnHqmvG3gmEHxwXArkodb2aGD7aBMcBUjBR8QNOgdrRyidxckj2BCVnYMu9ZpkyJuwSS00ru89AmQL
  */
  private stripePublishableKey =
    'pk_live_51S419E5hUE7XrP4NUOjIhnHqmvG3gmEHxwXArkodb2aGD7aBMcBUjBR8QNOgdrRyidxckj2BCVnYMu9ZpkyJuwSS00ru89AmQL';
  private backendUrl = environment.apiUrl;

  constructor(
    private cardService: CardService,
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    console.log('🔧 Inicializando componente de cartas...');
    console.log('🔗 Backend URL:', this.backendUrl);

    // ✅ CARGAR STRIPE
    try {
      this.stripe = await loadStripe(this.stripePublishableKey);
      console.log('✅ Stripe cargado correctamente');
    } catch (error) {
      console.error('❌ Error cargando Stripe:', error);
      this.paymentError = 'No se pudo cargar el sistema de pago.';
    }

    // ✅ CARGAR DATOS DEL USUARIO DESDE sessionStorage
    const savedUserData = sessionStorage.getItem('userData');
    if (savedUserData) {
      try {
        this.userData = JSON.parse(savedUserData);
        console.log('✅ Datos del usuario cargados:', this.userData);
      } catch (error) {
        console.error('❌ Error parseando userData:', error);
        this.userData = null;
      }
    }
    console.log('🎬 CardsComponent iniciado');

    // ✅ OBTENER TEMA DE 3 FUENTES (prioridad)
    this.route.params.subscribe((params) => {
      // 1. Desde la URL
      const urlTheme = params['tema'];
      // 2. Desde el servicio
      const serviceTheme = this.cardService.getTheme();
      // 3. Desde localStorage (fallback)
      const storageTheme = localStorage.getItem('tema');

      this.theme = urlTheme || serviceTheme || storageTheme || '';

      console.log('📍 Tema desde URL:', urlTheme);
      console.log('📍 Tema desde servicio:', serviceTheme);
      console.log('📍 Tema desde localStorage:', storageTheme);
      console.log('✅ Tema final usado:', this.theme);

      if (!this.theme) {
        console.error('❌ No se encontró tema. Redirigiendo...');
        alert('Por favor selecciona un tema primero');
        this.router.navigate(['/welcome']);
        return;
      }

      this.loadCards();
    });
    // Inicializar cartas
    this.initializeCards();
  }
  private loadCards(): void {
    console.log('🃏 Cargando cartas para tema:', this.theme);

    // ✅ OBTENER CARTAS DEL SERVICIO CON EL TEMA
    let cardsFromService = this.cardService.getSelectedCards();

    console.log('📦 Cartas desde servicio:', cardsFromService.length);

    // ✅ SI NO HAY CARTAS, OBTENERLAS POR TEMA
    if (!cardsFromService || cardsFromService.length === 0) {
      console.warn(
        '⚠️ No hay cartas en servicio, obteniendo por tema:',
        this.theme
      );
      cardsFromService = this.cardService.getCardsByTheme(this.theme);
      console.log('📦 Cartas obtenidas por tema:', cardsFromService.length);
    }

    // ✅ VALIDAR QUE LAS CARTAS TENGAN DESCRIPCIONES
    this.cards = cardsFromService
      .filter((card: any) => {
        const hasDescriptions =
          card.descriptions && card.descriptions.length > 0;
        if (!hasDescriptions) {
          console.error('❌ Carta sin descripciones:', card);
        }
        return hasDescriptions;
      })
      .map((card: any, index: number) => ({
        id: index,
        src: card.src,
        name: card.name,
        descriptions: Array.isArray(card.descriptions)
          ? card.descriptions
          : [card.descriptions],
        revealed: false,
        selected: false,
      }));

    console.log('✅ Cartas finales cargadas:', this.cards.length);

    if (this.cards.length === 0) {
      console.error('❌ No hay cartas disponibles');
      alert('No se pudieron cargar las cartas. Intenta de nuevo.');
      this.router.navigate(['/welcome']);
    }
  }
  ngOnDestroy(): void {
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error destruyendo payment element:', error);
      }
      this.paymentElement = undefined;
    }
  }

  // Dimensiones responsive de las cartas
  private getCardDimensions() {
    const viewportWidth = window.innerWidth;

    let cardWidth, cardHeight;

    if (viewportWidth <= 480) {
      cardWidth = Math.min(90, viewportWidth * 0.22);
      cardHeight = cardWidth * 1.55;
    } else if (viewportWidth <= 768) {
      cardWidth = Math.min(110, viewportWidth * 0.14);
      cardHeight = cardWidth * 1.55;
    } else if (viewportWidth <= 1366) {
      cardWidth = Math.min(140, viewportWidth * 0.1);
      cardHeight = cardWidth * 1.55;
    } else {
      cardWidth = Math.min(150, viewportWidth * 0.08);
      cardHeight = cardWidth * 1.55;
    }

    return { width: cardWidth, height: cardHeight };
  }

  private getSlotDimensions() {
    const cardDims = this.getCardDimensions();
    return {
      width: cardDims.width * 0.83,
      height: cardDims.height * 0.88,
    };
  }

  private getCardInSlotDimensions() {
    const viewportWidth = window.innerWidth;

    let width, height;

    if (viewportWidth <= 375) {
      // Móviles muy pequeños
      width = 90;
      height = 135;
    } else if (viewportWidth <= 480) {
      // Móviles pequeños
      width = 90;
      height = 150;
    } else if (viewportWidth <= 768) {
      // Tablets
      width = 90;
      height = 150;
    } else {
      // Desktop
      const slotDims = this.getSlotDimensions();
      width = slotDims.width * 1.13;
      height = slotDims.height * 1.13;
    }

    return { width, height };
  }

  volverAlInicio() {
    this.router.navigate(['/']);
  }

  private animateHeader(): void {
    const title = document.querySelector('.main-title');
    const subtitle = document.querySelector('.subtitle');
    const counter = document.querySelector('.card-counter');

    if (title) {
      gsap.from(title, {
        y: -50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
      });
    }

    if (subtitle) {
      gsap.from(subtitle, {
        y: -30,
        opacity: 0,
        duration: 1,
        delay: 0.2,
        ease: 'power3.out',
      });
    }

    if (counter) {
      gsap.from(counter, {
        scale: 0,
        opacity: 0,
        duration: 0.8,
        delay: 0.4,
        ease: 'back.out(1.7)',
      });
    }
  }

  initializeCards(): void {
    this.cardService.clearSelectedCards();
    this.selectedCards = [];
    const cardContainer = document.getElementById('cardContainer');
    if (cardContainer) {
      cardContainer.innerHTML = '';
    }
    this.cardElements = [];
    this.cards = this.cardService.getCardsByTheme(this.theme);
  }

  displayCards(): void {
    const cardContainer = document.getElementById('cardContainer');
    if (!cardContainer || this.cards.length === 0) return;

    const numberOfCards = Math.min(12, this.cards.length);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const centerX = viewportWidth / 2;
    const centerY = viewportHeight * 0.38;

    let radius;
    if (viewportWidth <= 480) {
      radius = Math.min(viewportWidth * 0.35, 140);
    } else if (viewportWidth <= 768) {
      radius = Math.min(viewportWidth * 0.32, 180);
    } else if (viewportWidth <= 1366) {
      radius = Math.min(viewportWidth * 0.18, 220);
    } else {
      radius = Math.min(viewportWidth * 0.15, 250);
    }

    const startAngle = -45;
    const angleStep = 90 / (numberOfCards - 1);
    const cardDims = this.getCardDimensions();

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.isInitialAnimationComplete = true;
        this.cardElements.forEach((card) => {
          card.style.pointerEvents = 'auto';
        });
      },
    });

    for (let i = 0; i < numberOfCards; i++) {
      const cardData = this.cards[i];
      if (!cardData || !cardData.src) continue;

      const card = this.createCard(cardData, i);
      cardContainer.appendChild(card);
      this.cardElements.push(card);

      const angle = startAngle + i * angleStep;
      const radian = angle * (Math.PI / 180);
      const finalX = centerX + radius * Math.sin(radian) - cardDims.width / 2;
      const finalY = centerY - radius * Math.cos(radian) - cardDims.height / 2;

      gsap.set(card, {
        left: centerX - cardDims.width / 2,
        top: -200,
        rotation: 0,
        scale: 0,
        opacity: 0,
      });

      this.timeline.to(
        card,
        {
          left: finalX,
          top: finalY,
          rotation: angle,
          scale: 1,
          opacity: 1,
          duration: 0.3,
          ease: 'back.out(1.2)',
          delay: i * 0.03,
        },
        `-=${i === 0 ? 0 : 0.25}`
      );

      card.style.zIndex = String(i + 10);
    }

    this.updateSlotSizes();
  }

  private updateSlotSizes(): void {
    const slotDims = this.getSlotDimensions();
    const slots = document.querySelectorAll('.card-slot');

    slots.forEach((slot: Element) => {
      const htmlSlot = slot as HTMLElement;
      htmlSlot.style.width = `${slotDims.width}px`;
      htmlSlot.style.height = `${slotDims.height}px`;
    });
  }

  private createCard(cardData: any, index: number): HTMLElement {
    const card = document.createElement('div');
    const cardDims = this.getCardDimensions();

    card.classList.add('card');
    card.style.position = 'absolute';
    card.style.width = `${cardDims.width}px`;
    card.style.height = `${cardDims.height}px`;
    card.style.borderRadius = '10px';
    card.style.backgroundImage = "url('/card-back.webp')";
    card.style.backgroundSize = 'cover';
    card.style.backgroundPosition = 'center';
    card.style.pointerEvents = 'none';

    card.dataset['src'] = cardData.src;
    card.dataset['name'] = cardData.name;
    card.dataset['descriptions'] = cardData.descriptions.join('.,');
    card.dataset['index'] = String(index);
    card.dataset['originalIndex'] = String(index);

    // ✅ AGREGAR EVENTOS DE HOVER AQUÍ (en el método que SÍ se usa)
    card.addEventListener('mouseenter', () => {
      if (
        !card.classList.contains('selected') &&
        this.isInitialAnimationComplete
      ) {
        gsap.to(card, {
          scale: 1.05,
          y: -10,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: true,
        });
      }
    });

    card.addEventListener('mouseleave', () => {
      if (
        !card.classList.contains('selected') &&
        this.isInitialAnimationComplete
      ) {
        gsap.to(card, {
          scale: 1,
          y: 0,
          duration: 0.3,
          ease: 'power2.out',
          overwrite: true,
        });
      }
    });

    card.addEventListener('click', () => this.selectCard(card));

    return card;
  }
  private selectCard(card: HTMLElement): void {
    if (
      this.selectedCards.length >= 3 ||
      card.classList.contains('selected') ||
      this.isAnimating
    ) {
      return;
    }

    this.isAnimating = true;
    card.classList.add('selected');

    const selectedIndex = this.selectedCards.length;
    const slot = document.getElementById(`slot-${selectedIndex}`);

    if (!slot) {
      this.isAnimating = false;
      return;
    }

    slot.classList.add('filled');

    const cardInSlotDims = this.getCardInSlotDimensions();
    const slotRect = slot.getBoundingClientRect();
    const containerRect = document
      .getElementById('cardContainer')
      ?.getBoundingClientRect();

    if (!containerRect) {
      this.isAnimating = false;
      return;
    }

    const targetX =
      slotRect.left +
      slotRect.width / 2 -
      containerRect.left -
      cardInSlotDims.width / 2;
    const targetY =
      slotRect.top +
      slotRect.height / 2 -
      containerRect.top -
      cardInSlotDims.height / 2 +
      10;

    const selectTimeline = gsap.timeline({
      onComplete: () => {
        this.isAnimating = false;
        this.checkCompletion();
      },
    });

    const currentWidth = parseFloat(card.style.width);
    const scaleRatio = cardInSlotDims.width / currentWidth;

    selectTimeline
      .to(card, {
        scale: 1.3,
        zIndex: 1000 + selectedIndex,
        duration: 0.3,
        ease: 'power2.out',
      })
      .to(card, {
        rotationY: 90,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => {
          card.style.backgroundImage = `url('${card.dataset['src']}')`;
        },
      })
      .to(card, {
        rotationY: 180,
        duration: 0.25,
        ease: 'power2.out',
      })
      .to(card, {
        left: targetX,
        top: targetY,
        scale: scaleRatio,
        rotation: 0,
        width: cardInSlotDims.width,
        height: cardInSlotDims.height,
        duration: 0.5,
        ease: 'power3.inOut',
      });

    this.addSlotGlow(slot);

    // ✅ CREAR OBJETO COMPLETO QUE CUMPLE CON LA INTERFACE Card
    const cardId = parseInt(card.dataset['originalIndex'] || '0');

    this.selectedCards.push({
      id: cardId,
      src: card.dataset['src'] || '',
      name: card.dataset['name'] || '',
      descriptions: card.dataset['descriptions']?.split('.,') || [],
      revealed: true,
      selected: true,
    });

    this.updateCounter();

    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  private addSlotGlow(slot: HTMLElement): void {
    const glow = document.createElement('div');
    glow.style.position = 'absolute';
    glow.style.width = '100%';
    glow.style.height = '100%';
    glow.style.top = '0';
    glow.style.left = '0';
    glow.style.borderRadius = '10px';
    glow.style.background =
      'radial-gradient(circle, rgba(255, 215, 0, 0.5), transparent)';
    glow.style.pointerEvents = 'none';
    slot.appendChild(glow);

    gsap.from(glow, {
      scale: 0,
      opacity: 0,
      duration: 0.5,
      ease: 'power2.out',
    });

    gsap.to(glow, {
      opacity: 0,
      duration: 0.5,
      delay: 1,
      onComplete: () => glow.remove(),
    });
  }

  private updateCounter(): void {
    const counter = document.querySelector('.counter');
    if (!counter) return;

    gsap.to(counter, {
      scale: 1.2,
      duration: 0.2,
      ease: 'power2.out',
      onComplete: () => {
        counter.textContent = `${this.selectedCards.length}/3`;
        gsap.to(counter, {
          scale: 1,
          duration: 0.2,
          ease: 'power2.out',
        });
      },
    });
  }

  private checkCompletion(): void {
    if (this.selectedCards.length === 3) {
      // Guardar las cartas seleccionadas
      this.cardService.setSelectedCards(this.selectedCards);

      // Mostrar modal de datos después de 1.5 segundos
      setTimeout(() => {
        this.showDataModal = true;
      }, 1500);
    }
  }

  // ========== MÉTODOS DE PAGO ==========

  async handlePaymentSubmit(): Promise<void> {
    if (!this.stripe || !this.elements || !this.paymentElement) {
      this.paymentError = 'El sistema de pago no está listo';
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
      this.paymentError = error.message || 'Error procesando el pago';
      this.isProcessingPayment = false;
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      console.log('✅ Pago exitoso!');

      // ✅ CAMBIAR ESTADO
      this.isProcessingPayment = false;

      // ✅ NAVEGAR CON ANIMACIÓN
      setTimeout(() => {
        this.fadeOutAndNavigate();
      }, 800); // Dar tiempo para que el usuario vea el éxito
    }
  }
  cancelPayment(): void {
    this.showPaymentModal = false;
    this.clientSecret = null;

    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error destruyendo payment element:', error);
      }
      this.paymentElement = undefined;
    }

    this.isProcessingPayment = false;
    this.paymentError = null;
  }

  private fadeOutAndNavigate(): void {
    const cardContainer = document.getElementById('cardContainer');
    const paymentModalOverlay = document.querySelector(
      '.payment-modal-overlay'
    ) as HTMLElement;

    // Fade out del modal de pago
    if (paymentModalOverlay) {
      paymentModalOverlay.style.opacity = '0';
      paymentModalOverlay.style.transition = 'opacity 0.5s ease-out';
    }

    // Destruir elemento de pago
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('Error al destruir elemento de pago:', error);
      } finally {
        this.paymentElement = undefined;
      }
    }

    // Fade out de las cartas y navegar
    if (cardContainer) {
      cardContainer.classList.add('fade-out');
      cardContainer.addEventListener(
        'animationend',
        () => {
          this.router.navigate(['/descripcion-cartas']);
        },
        { once: true }
      );
    } else {
      // Fallback si no encuentra el contenedor
      setTimeout(() => {
        this.router.navigate(['/descripcion-cartas']);
      }, 500);
    }
  }

  onUserDataSubmitted(userData: any): void {
    console.log('📥 Datos recibidos del formulario:', userData);
    console.log('📋 Campos disponibles:', Object.keys(userData));

    // ✅ VALIDAR CAMPOS OBLIGATORIOS
    const requiredFields = ['nombre', 'email', 'telefono']; // ❌ QUITADO 'apellido'
    const missingFields = requiredFields.filter(
      (field) => !userData[field] || !userData[field].toString().trim()
    );

    if (missingFields.length > 0) {
      console.error('❌ Faltan campos obligatorios:', missingFields);
      alert(`Completa estos campos: ${missingFields.join(', ')}`);
      this.showDataModal = true;
      return;
    }

    // ✅ GUARDAR DATOS
    this.userData = {
      ...userData,
      nombre: userData.nombre.toString().trim(),
      // apellido: userData.apellido.toString().trim(), // ❌ ELIMINADO
      email: userData.email.toString().trim(),
      telefono: userData.telefono.toString().trim(),
    };

    // ✅ GUARDAR EN sessionStorage
    try {
      sessionStorage.setItem('userData', JSON.stringify(this.userData));
      console.log('✅ Datos guardados en sessionStorage');
    } catch (error) {
      console.error('❌ Error guardando en sessionStorage:', error);
    }

    this.showDataModal = false;

    // ✅ ENVIAR AL BACKEND (opcional)
    this.http.post(`${this.backendUrl}api/recolecta`, userData).subscribe({
      next: (response) =>
        console.log('✅ Datos enviados al backend:', response),
      error: (error) => console.error('⚠️ Error enviando datos:', error),
    });

    // ✅ ABRIR MODAL DE PAGO
    setTimeout(() => {
      this.promptForPayment();
    }, 500);
  }

  async promptForPayment(): Promise<void> {
    console.log('💳 === INICIANDO PROCESO DE PAGO ===');

    this.showPaymentModal = true;
    this.paymentError = null;
    this.isProcessingPayment = true;

    // Destruir elemento anterior
    if (this.paymentElement) {
      try {
        this.paymentElement.destroy();
      } catch (error) {
        console.log('⚠️ Error destruyendo elemento anterior:', error);
      }
      this.paymentElement = undefined;
    }

    try {
      // ✅ CARGAR DATOS DESDE sessionStorage SI NO ESTÁN EN MEMORIA
      if (!this.userData) {
        console.log('🔍 Cargando userData desde sessionStorage...');
        const savedUserData = sessionStorage.getItem('userData');
        if (savedUserData) {
          this.userData = JSON.parse(savedUserData);
          console.log('✅ userData cargado:', this.userData);
        }
      }

      // ✅ VALIDAR QUE EXISTAN LOS DATOS
      if (!this.userData) {
        throw new Error('No se encontraron los datos del cliente');
      }

      // ✅ EXTRAER Y VALIDAR CAMPOS
      const nombre = this.userData.nombre?.toString().trim();
      // const apellido = this.userData.apellido?.toString().trim(); // ❌ ELIMINADO
      const email = this.userData.email?.toString().trim();
      const telefono = this.userData.telefono?.toString().trim();

      console.log('🔍 Campos validados:');
      console.log('  ✓ nombre:', nombre);
      console.log('  ✓ email:', email);
      console.log('  ✓ telefono:', telefono);

      if (!nombre || !email || !telefono) {
        throw new Error('Faltan campos obligatorios del cliente');
      }

      // ✅ CREAR customerInfo (SOLO 3 CAMPOS)
      const customerInfo = {
        name: nombre,
        email: email,
        phone: telefono,
      };

      console.log('👤 customerInfo creado:', customerInfo);

      // ✅ CREAR PAYLOAD
      const items = [{ id: 'tarot_reading_description', amount: 400 }];
      const requestBody = { items, customerInfo };

      console.log('📦 Payload completo:', JSON.stringify(requestBody, null, 2));
      console.log('📍 Enviando a:', `${this.backendUrl}create-payment-intent`);

      // ✅ HACER PETICIÓN
      const response = await this.http
        .post<{ clientSecret: string }>(
          `${this.backendUrl}create-payment-intent`,
          requestBody,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        )
        .toPromise();

      console.log('✅ Respuesta del servidor:', response);

      if (!response || !response.clientSecret) {
        throw new Error('No se recibió clientSecret del servidor');
      }

      this.clientSecret = response.clientSecret;
      console.log(
        '🔑 clientSecret obtenido:',
        this.clientSecret.substring(0, 20) + '...'
      );

      // ✅ CREAR STRIPE ELEMENTS
      if (!this.stripe) {
        throw new Error('Stripe no está inicializado');
      }

      this.elements = this.stripe.elements({
        clientSecret: this.clientSecret,
        appearance: { theme: 'stripe' },
      });

      this.paymentElement = this.elements.create('payment');
      console.log('✅ Payment element creado');

      // ✅ CAMBIAR ESTADO ANTES DE MONTAR
      this.isProcessingPayment = false;

      // ✅ MONTAR EL ELEMENTO
      setTimeout(() => {
        const container = document.getElementById('payment-element-container');
        console.log(
          '🎯 Buscando contenedor...',
          container ? 'ENCONTRADO ✅' : 'NO ENCONTRADO ❌'
        );

        if (container && this.paymentElement) {
          this.paymentElement.mount(container);
          console.log('✅ Payment element montado exitosamente');
        } else {
          console.error('❌ No se pudo montar el payment element');
          this.paymentError = 'No se pudo cargar el formulario de pago';
        }
      }, 150);
    } catch (error: any) {
      console.error('❌ === ERROR EN PROCESO DE PAGO ===');
      console.error('❌ Error completo:', error);
      console.error('❌ Status:', error.status);
      console.error('❌ Message:', error.message);
      console.error('❌ Error details:', error.error);

      this.paymentError =
        error.error?.error || error.message || 'Error al inicializar el pago';
      this.isProcessingPayment = false;
    }
  }

  onDataModalClosed(): void {
    this.showDataModal = false;
  }

  // ========== MÉTODOS AUXILIARES ==========

  private resetSelection(): void {
    if (this.isAnimating) return;

    this.selectedCards = [];
    this.updateCounter();

    const slots = document.querySelectorAll('.card-slot');
    slots.forEach((slot) => {
      slot.classList.remove('filled');
    });

    const selectedCards = document.querySelectorAll('.card.selected');
    selectedCards.forEach((card: Element) => {
      const htmlCard = card as HTMLElement;
      const originalIndex = parseInt(htmlCard.dataset['originalIndex'] || '0');

      htmlCard.classList.remove('selected');
      htmlCard.style.backgroundImage = "url('/card-back.webp')";

      this.returnCardToOriginalPosition(htmlCard, originalIndex);
    });

    this.isAnimating = false;
  }

  private returnCardToOriginalPosition(card: HTMLElement, index: number): void {
    const numberOfCards = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight * 0.38;
    const cardDims = this.getCardDimensions();

    let radius;
    if (viewportWidth <= 480) {
      radius = Math.min(viewportWidth * 0.35, 140);
    } else if (viewportWidth <= 768) {
      radius = Math.min(viewportWidth * 0.32, 180);
    } else if (viewportWidth <= 1366) {
      radius = Math.min(viewportWidth * 0.18, 220);
    } else {
      radius = Math.min(viewportWidth * 0.15, 250);
    }

    const startAngle = -45;
    const angleStep = 90 / (numberOfCards - 1);
    const angle = startAngle + index * angleStep;
    const radian = angle * (Math.PI / 180);
    const finalX = centerX + radius * Math.sin(radian) - cardDims.width / 2;
    const finalY = centerY - radius * Math.cos(radian) - cardDims.height / 2;

    gsap.to(card, {
      left: finalX,
      top: finalY,
      width: cardDims.width,
      height: cardDims.height,
      rotation: angle,
      rotationY: 0,
      scale: 1,
      zIndex: index + 10,
      duration: 0.6,
      ease: 'power3.inOut',
      onComplete: () => {
        card.style.pointerEvents = 'auto';
      },
    });
  }

  private handleResize = (): void => {
    this.updateSlotSizes();

    if (this.cardElements.length > 0 && !this.isAnimating) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const centerX = viewportWidth / 2;
      const centerY = viewportHeight * 0.38;
      const cardDims = this.getCardDimensions();

      let radius;
      if (viewportWidth <= 480) {
        radius = Math.min(viewportWidth * 0.35, 140);
      } else if (viewportWidth <= 768) {
        radius = Math.min(viewportWidth * 0.32, 180);
      } else if (viewportWidth <= 1366) {
        radius = Math.min(viewportWidth * 0.18, 220);
      } else {
        radius = Math.min(viewportWidth * 0.15, 250);
      }

      const startAngle = -45;
      const angleStep = 90 / (this.cardElements.length - 1);

      this.cardElements.forEach((card, i) => {
        if (!card.classList.contains('selected')) {
          const angle = startAngle + i * angleStep;
          const radian = angle * (Math.PI / 180);
          const finalX =
            centerX + radius * Math.sin(radian) - cardDims.width / 2;
          const finalY =
            centerY - radius * Math.cos(radian) - cardDims.height / 2;

          gsap.to(card, {
            left: finalX,
            top: finalY,
            width: cardDims.width,
            height: cardDims.height,
            rotation: angle,
            duration: 0.3,
            ease: 'power2.inOut',
          });
        }
      });

      const selectedCards = document.querySelectorAll('.card.selected');
      selectedCards.forEach((card: Element, index) => {
        const htmlCard = card as HTMLElement;
        const slot = document.getElementById(`slot-${index}`);
        if (slot) {
          const slotRect = slot.getBoundingClientRect();
          const containerRect = document
            .getElementById('cardContainer')
            ?.getBoundingClientRect();
          const cardInSlotDims = this.getCardInSlotDimensions();

          if (containerRect) {
            const targetX =
              slotRect.left +
              slotRect.width / 2 -
              containerRect.left -
              cardInSlotDims.width / 2;
            const targetY =
              slotRect.top +
              slotRect.height / 2 -
              containerRect.top -
              cardInSlotDims.height / 2 +
              10;

            gsap.to(htmlCard, {
              left: targetX,
              top: targetY,
              width: cardInSlotDims.width,
              height: cardInSlotDims.height,
              duration: 0.3,
            });
          }
        }
      });
    }
  };

  private setupHoverEffects(): void {
    this.cardElements.forEach((card) => {
      let hoverAnimation: gsap.core.Tween | null = null;

      card.addEventListener('mouseenter', () => {
        if (!card.classList.contains('selected') && !this.isAnimating) {
          if (hoverAnimation) {
            hoverAnimation.kill();
          }

          const originalZ = card.style.zIndex;
          card.dataset['originalZ'] = originalZ;

          hoverAnimation = gsap.to(card, {
            scale: 1.05,
            y: '-=10',
            zIndex: 500,
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      });

      card.addEventListener('mouseleave', () => {
        if (!card.classList.contains('selected') && !this.isAnimating) {
          if (hoverAnimation) {
            hoverAnimation.kill();
          }

          const originalZ = card.dataset['originalZ'] || '10';

          hoverAnimation = gsap.to(card, {
            scale: 1,
            y: '+=10',
            zIndex: parseInt(originalZ),
            duration: 0.3,
            ease: 'power2.out',
          });
        }
      });
    });
  }

  private setupTouchSupport(): void {
    if ('ontouchstart' in window) {
      this.cardElements.forEach((card) => {
        card.addEventListener('touchstart', (e) => {
          e.preventDefault();
          if (!card.classList.contains('selected') && !this.isAnimating) {
            gsap.to(card, {
              scale: 1.05,
              duration: 0.2,
            });
          }
        });

        card.addEventListener('touchend', (e) => {
          e.preventDefault();
          if (!card.classList.contains('selected') && !this.isAnimating) {
            gsap.to(card, {
              scale: 1,
              duration: 0.2,
            });
            this.selectCard(card);
          }
        });
      });
    }
  }

  ngAfterViewInit(): void {
    this.animateHeader();

    setTimeout(() => {
      this.displayCards();

      setTimeout(() => {
        this.setupHoverEffects();
        this.setupTouchSupport();
      }, 800);
    }, 400);

    window.addEventListener('resize', this.handleResize);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.resetSelection();
      }
    });
  }

  public initialize(): void {
    this.initializeCards();
    this.setupTouchSupport();
    document.body.classList.add('cards-page');
  }
}
