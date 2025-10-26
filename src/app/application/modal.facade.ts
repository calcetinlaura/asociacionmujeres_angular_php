import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TypeActionModal, TypeList } from 'src/app/core/models/general.model';
import {
  ModalItemByType,
  ModalStateByType,
} from 'src/app/core/models/modal-state.model';

/**
 * Facade global para manejar la navegación y estado de modales.
 * Usa Signals, tipado estricto por entidad y una pila para retroceder entre modales.
 */
@Injectable({ providedIn: 'root' })
export class ModalFacade {
  constructor(private readonly router: Router) {}

  // === Estado principal del modal actual ===
  private readonly modalSig = signal<ModalStateByType<keyof ModalItemByType>>({
    type: TypeList.Events,
    action: TypeActionModal.Create,
    item: null,
  });

  // === Historial (pila) de estados anteriores ===
  private readonly stack: ModalStateByType<keyof ModalItemByType>[] = [];

  // === Computed ===
  readonly isOpenSig = computed(
    () => this.modalSig().action !== TypeActionModal.Create
  );
  readonly typeSig = computed(() => this.modalSig().type);
  readonly actionSig = computed(() => this.modalSig().action);
  readonly itemSig = computed(() => this.modalSig().item);
  readonly isVisibleSig = computed(() => !!this.modalSig().item);

  /** Devuelve el estado completo actual */
  get state() {
    return this.modalSig();
  }

  /** Indica si hay historial disponible */
  canGoBack(): boolean {
    return this.stack.length > 0;
  }

  // =====================================================
  // 🧭 MÉTODOS PRINCIPALES
  // =====================================================

  /**
   * Abre una modal del tipo y acción especificados.
   * Soporta dos firmas:
   *   open(type, action, item)
   *   open(action, item)
   */
  open<K extends keyof ModalItemByType>(
    typeOrAction: K | TypeActionModal,
    actionOrItem?: TypeActionModal | ModalItemByType[K] | null,
    maybeItem?: ModalItemByType[K] | null
  ): void {
    const current = this.modalSig();

    // 🔹 Solo apilamos si ya hay algo abierto
    if (current.action !== TypeActionModal.Create) {
      this.stack.push(current);
    } else {
      this.stack.length = 0;
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

    this.modalSig.set({ type, action, item } as any);
    this.updateUrl(type, item);
  }

  /**
   * Reemplaza el contenido del modal actual (sin apilar).
   */
  replace<K extends keyof ModalItemByType>(
    type: K,
    action: TypeActionModal,
    item: ModalItemByType[K]
  ): void {
    this.modalSig.set({ type, action, item } as any);
    this.updateUrl(type, item);
  }

  /**
   * Cierra la modal completamente y limpia la pila.
   */
  close(): void {
    this.stack.length = 0;
    this.modalSig.set({
      type: TypeList.Events,
      action: TypeActionModal.Create,
      item: null,
    });
    this.clearUrl();
  }

  /**
   * Retrocede al modal anterior, si lo hay.
   */
  back(): void {
    const prev = this.stack.pop();
    if (prev) {
      this.modalSig.set(prev);
      this.updateUrl(prev.type, prev.item);
    } else {
      this.close();
    }
  }

  /**
   * Limpia la pila de navegación sin cerrar el modal actual.
   */
  clearStack(): void {
    this.stack.length = 0;
  }

  // =====================================================
  // 🔗 Sincronización con URL (opcional)
  // =====================================================

  /** Actualiza los parámetros de la URL para reflejar el modal actual. */
  private updateUrl<T extends keyof ModalItemByType>(
    type: T,
    item: ModalItemByType[T] | null
  ): void {
    try {
      // ✅ Conversión segura de tipo enum bidireccional
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

  /** Limpia los parámetros de la URL asociados al modal. */
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
