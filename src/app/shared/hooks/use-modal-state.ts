import { signal } from '@angular/core';
import { TypeActionModal } from 'src/app/core/models/general.model';
import {
  ModalItemByType,
  ModalStateByType,
} from 'src/app/core/models/modal-state.model';

/**
 * Hook reutilizable para manejar el estado del modal
 * con tipado estricto según el TypeList.
 */
export function useModalState<T extends keyof ModalItemByType>(initialType: T) {
  // Estado reactivo con el tipo inicial
  const stateSig = signal<ModalStateByType<T>>({
    type: initialType,
    action: TypeActionModal.Create,
    item: null as ModalItemByType[T],
  });

  /**
   * Abre el modal con un tipo y acción específicos.
   * - Si el tipo coincide con el inicial, se mantiene el tipado estricto.
   * - Si el tipo es distinto (por ejemplo, Invoices), sigue siendo compatible.
   */
  function open<K extends keyof ModalItemByType>(
    typeOrAction: K | TypeActionModal,
    actionOrItem?: TypeActionModal | ModalItemByType[K] | null,
    maybeItem?: ModalItemByType[K] | null
  ): void {
    // Soporta llamadas abreviadas: open(action, item)
    if (typeof typeOrAction === 'number') {
      const action = typeOrAction as TypeActionModal;
      const item = (actionOrItem ?? null) as ModalItemByType[T];
      stateSig.set({ type: initialType, action, item });
    } else {
      // Llamadas completas: open(TypeList.Invoices, action, item)
      const type = typeOrAction as K;
      const action = (actionOrItem as TypeActionModal) ?? TypeActionModal.Show;
      const item = (maybeItem ?? null) as ModalItemByType[T];
      stateSig.set({ type: type as unknown as T, action, item });
    }
  }

  /** Cierra el modal y restablece el estado inicial */
  function close(): void {
    stateSig.set({
      type: initialType,
      action: TypeActionModal.Create,
      item: null as ModalItemByType[T],
    });
  }

  return { stateSig, open, close };
}
