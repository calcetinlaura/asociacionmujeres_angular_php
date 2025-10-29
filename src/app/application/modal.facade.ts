import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import {
  ModalItemByType,
  ModalStateByType,
} from 'src/app/core/models/modal-state.model';

@Injectable({ providedIn: 'root' })
export class ModalFacade {
  constructor(private readonly router: Router) {}

  // === Estado principal del modal actual ===
  private readonly modalSig = signal<ModalStateByType<keyof ModalItemByType>>({
    type: TypeList.None as any,
    action: TypeActionModal.None,
    item: null,
  });

  // === Historial (pila) de estados anteriores — ahora reactiva ===
  private readonly stackSig = signal<ModalStateByType<keyof ModalItemByType>[]>(
    []
  );

  // === Computed ===
  readonly typeSig = computed(() => this.modalSig().type);
  readonly actionSig = computed(() => this.modalSig().action);
  readonly itemSig = computed(() => this.modalSig().item);
  readonly isVisibleSig = computed(() => {
    const { action } = this.modalSig();
    return action !== null && action !== TypeActionModal.None;
  });

  // ✅ Nueva señal reactiva — sin bucles y visible desde el shell
  readonly canGoBackSig = computed(() => this.stackSig().length > 0);

  /** Método de compatibilidad */
  canGoBack(): boolean {
    return this.canGoBackSig();
  }

  // =====================================================
  // 🧭 MÉTODOS PRINCIPALES
  // =====================================================

  open<K extends TypeList>(
    typeOrAction: K | TypeActionModal,
    actionOrItem?: TypeActionModal | ModalItemByType[K] | null,
    maybeItem?: ModalItemByType[K] | null
  ): void {
    console.log('📨 [ModalFacade.open] args:', {
      typeOrAction,
      actionOrItem,
      maybeItem,
    });
    const current = this.modalSig();

    // 🔹 Solo apilamos si ya hay algo abierto
    if (
      current.action !== TypeActionModal.Create &&
      current.action !== TypeActionModal.None
    ) {
      this.stackSig.update((stack) => [...stack, current]);
    } else {
      this.stackSig.set([]);
    }

    let type: K;
    let action: TypeActionModal;
    let item: ModalItemByType[K] | null = null;

    if (typeof typeOrAction === 'number') {
      // Caso 1: open(action, item)
      type = current.type as K;
      action = typeOrAction as TypeActionModal;
      item = (actionOrItem ?? null) as ModalItemByType[K];
    } else {
      // Caso 2: open(type, action, item)
      type = typeOrAction as K;
      action = (actionOrItem as TypeActionModal) ?? TypeActionModal.Show;
      item = (maybeItem ?? null) as ModalItemByType[K];
    }

    console.log('✅ [ModalFacade.open] computed:', { type, action, item });
    this.modalSig.set({ type, action, item } as any);
    this.updateUrl(type, item);
  }

  /** Reemplaza el contenido del modal actual (sin apilar). */
  replace<K extends keyof ModalItemByType>(
    type: K,
    action: TypeActionModal,
    item: ModalItemByType[K]
  ): void {
    console.log('♻️ [ModalFacade.replace]', { type, action, item });
    this.modalSig.set({ type, action, item } as any);
    this.updateUrl(type, item);
  }

  /** Cierra la modal completamente y limpia la pila. */
  close(): void {
    console.log('🔴 [ModalFacade.close] called');
    const current = this.modalSig();
    this.stackSig.set([]);
    this.modalSig.set({
      ...current,
      action: TypeActionModal.None,
      item: null,
    });
    this.clearUrl();
  }

  /** Retrocede al modal anterior, si lo hay. */
  back(): void {
    const prevStack = this.stackSig();
    const prev = prevStack[prevStack.length - 1];
    console.log('⬅️ [ModalFacade.back]', { prev });

    if (prev) {
      this.stackSig.set(prevStack.slice(0, -1));
      this.modalSig.set(prev);
      this.updateUrl(prev.type, prev.item);
    } else {
      this.close();
    }
  }

  /** Limpia la pila de navegación sin cerrar el modal actual. */
  clearStack(): void {
    this.stackSig.set([]);
  }

  // =====================================================
  // 🔗 Sincronización con URL (opcional)
  // =====================================================

  private updateUrl<T extends keyof ModalItemByType>(
    type: T,
    item: ModalItemByType[T] | null
  ): void {
    try {
      const modalType =
        (TypeList as any)[type as unknown as keyof typeof TypeList] ?? type;

      const params: any = { modal: modalType };
      if (item && (item as any)?.id) {
        params.id = (item as any).id;
      }

      this.router.navigate([], {
        queryParams: params,
        queryParamsHandling: 'merge',
      });
    } catch (err) {
      console.warn('ModalFacade: No se pudo actualizar la URL', err);
    }
  }

  private clearUrl(): void {
    try {
      this.router.navigate([], {
        queryParams: { modal: null, id: null },
        queryParamsHandling: 'merge',
      });
    } catch (err) {
      console.warn('ModalFacade: No se pudo limpiar la URL', err);
    }
  }

  /** Reemplaza solo el item del modal actual (por ejemplo, tras edición en vivo). */
  replaceItem<K extends keyof ModalItemByType>(item: ModalItemByType[K]): void {
    const current = this.modalSig();
    this.modalSig.set({ ...current, item } as any);
    this.updateUrl(current.type, item);
  }
}
