export function* elementAndParents(element: HTMLElement | null | undefined) {
  let p: HTMLElement | null | undefined = element;
  while (p) {
    yield p;
    p = p.parentElement;
  }
}

export function* elementParents(element: HTMLElement | null | undefined) {
  if (!element?.parentElement) {
    return;
  }

  yield* elementAndParents(element.parentElement);
}

export function positionFixedElementRelativeToXY(
  element: HTMLElement,
  clientX: number,
  clientY: number,
  options: {
    memoModalFixElement?: HTMLElement | null;
    baseOffsetX?: number;
    baseOffsetY?: number;
    willTransform?: boolean;
  } = {}
) {
  let baseOffsetX = options.baseOffsetX ?? 0;
  let baseOffsetY = options.baseOffsetY ?? 0;
  let modalFixElement: HTMLElement | null | undefined =
    options.memoModalFixElement;

  // This is necessary because position: fixed ignores transforms...
  // The "correct" solution here is to recompute transforms that are -50%
  if (options.willTransform) {
    modalFixElement = undefined;
  } else if (options.memoModalFixElement === undefined) {
    modalFixElement = null;

    for (const parent of elementParents(element)) {
      const computedStyle = window.getComputedStyle(parent);
      if (computedStyle.transform !== "none") {
        modalFixElement = parent;
        break;
      }
    }
  }

  if (modalFixElement) {
    const rect = modalFixElement.getBoundingClientRect();
    baseOffsetX -= rect.left;
    baseOffsetY -= rect.top;
  }

  const rect = element.getBoundingClientRect();
  if (rect.width + clientX + baseOffsetX > window.innerWidth) {
    element.style.left = `${clientX - rect.width - baseOffsetX}px`;
  } else {
    element.style.left = `${clientX + baseOffsetX}px`;
  }

  if (rect.height + clientY + baseOffsetY > window.innerHeight) {
    element.style.top = `${clientY - rect.height - baseOffsetY}px`;
  } else {
    element.style.top = `${clientY + baseOffsetY}px`;
  }

  return {
    modalFixElement,
  };
}
