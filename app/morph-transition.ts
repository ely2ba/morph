export type MorphTransitionKind = 'create' | 'update';

type TransitionOptions = {
  root: HTMLElement | null;
  live: HTMLElement | null;
  kind: MorphTransitionKind;
  apply: () => void;
  signal?: AbortSignal;
};

const pause = (milliseconds: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => {
      window.clearTimeout(timer);
      reject(signal?.reason ?? new DOMException('Aborted', 'AbortError'));
    };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
  });

const afterPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export function prefersReducedMorphMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function playMorphStatusPhases(
  phases: readonly string[],
  show: (label: string) => void,
  signal?: AbortSignal,
) {
  const dwell = prefersReducedMorphMotion() ? 150 : 140;
  for (let index = 0; index < phases.length; index += 1) {
    show(phases[index]);
    if (index < phases.length - 1) await pause(dwell, signal);
  }
}

function componentMap(root: {
  querySelectorAll<E extends Element = Element>(
    selectors: string,
  ): NodeListOf<E>;
}) {
  return new Map(
    Array.from(root.querySelectorAll<HTMLElement>('[data-component-id]')).map(
      (element) => [element.dataset.componentId ?? '', element],
    ),
  );
}

function sanitizeOutgoingLayer(layer: HTMLElement) {
  layer.classList.remove('morph-transition-live');
  layer.classList.add('morph-transition-outgoing');
  layer.setAttribute('aria-hidden', 'true');
  layer.inert = true;
  layer.removeAttribute('id');
  layer.querySelectorAll<HTMLElement>('[id]').forEach((element) => {
    element.removeAttribute('id');
  });
  layer.querySelectorAll<HTMLElement>('[for]').forEach((element) => {
    element.removeAttribute('for');
  });
}

function safeFinished(animation: Animation) {
  return animation.finished.catch(() => undefined);
}

const transitioningRoots = new WeakSet<HTMLElement>();

/**
 * Keeps a DOM snapshot of the outgoing native page over the live React tree,
 * then animates real component IDs and measured positions after React commits.
 */
export async function runMorphSurfaceTransition({
  root,
  live,
  kind,
  apply,
  signal,
}: TransitionOptions) {
  signal?.throwIfAborted();
  if (!root || !live) {
    apply();
    await afterPaint();
    return;
  }
  if (transitioningRoots.has(root)) {
    throw new DOMException(
      'Another interface transition is already in progress.',
      'InvalidStateError',
    );
  }
  transitioningRoots.add(root);

  const reduced = prefersReducedMorphMotion();
  const scrollLeft = window.scrollX;
  const scrollTop = window.scrollY;
  const rootRect = root.getBoundingClientRect();
  const shouldDiffComponents = kind === 'update' && !reduced;
  const currentComponents = shouldDiffComponents
    ? componentMap(live)
    : new Map<string, HTMLElement>();
  const oldComponents = new Map<string, {
    rect: DOMRect;
    text: string;
    clone: HTMLElement;
  }>(
    Array.from(currentComponents, ([id, element]) => [
      id,
      {
        rect: element.getBoundingClientRect(),
        text: element.textContent ?? '',
        clone: element.cloneNode(true) as HTMLElement,
      },
    ]),
  );
  const outgoing =
    kind === 'create' || reduced ? (live.cloneNode(true) as HTMLElement) : null;
  const removedLayer = document.createElement('div');
  removedLayer.className = 'morph-transition-removed-layer';
  const wasInert = live.inert;

  if (outgoing) {
    sanitizeOutgoingLayer(outgoing);
    root.style.minHeight = `${rootRect.height}px`;
    root.appendChild(outgoing);
    live.style.opacity = '0';
  }
  live.inert = true;

  const animations: Animation[] = [];
  try {
    signal?.throwIfAborted();
    apply();
    await afterPaint();
    if (window.scrollX !== scrollLeft || window.scrollY !== scrollTop)
      window.scrollTo(scrollLeft, scrollTop);

    const nextComponents = componentMap(live);
    const nextRects = new Map(
      Array.from(nextComponents, ([id, element]) => [
        id,
        element.getBoundingClientRect(),
      ]),
    );
    const layerDuration = reduced ? 190 : kind === 'create' ? 720 : 420;
    const layerEasing = 'cubic-bezier(.22,.72,.22,1)';

    if (outgoing) {
      const parsedOpacity = Number.parseFloat(
        getComputedStyle(outgoing).opacity,
      );
      const outgoingOpacity = Number.isFinite(parsedOpacity)
        ? parsedOpacity
        : 1;
      animations.push(
        outgoing.animate(
          reduced
            ? [{ opacity: outgoingOpacity }, { opacity: 0 }]
            : [
                { opacity: outgoingOpacity, transform: 'scale(1)' },
                { opacity: 0, transform: 'scale(.985)' },
              ],
          {
            duration: layerDuration,
            easing: layerEasing,
            fill: 'forwards',
          },
        ),
        live.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: reduced ? 190 : 560,
          easing: layerEasing,
          fill: 'forwards',
        }),
      );
    }

    if (!reduced && kind === 'create') {
      Array.from(nextComponents.values()).forEach((element, index) => {
        animations.push(
          element.animate(
            [
              { opacity: 0, transform: 'translateY(12px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            {
              delay: index * 45,
              duration: 280,
              easing: layerEasing,
              fill: 'both',
            },
          ),
        );
      });
    }

    if (!reduced && kind === 'update') {
      const componentChanges = Array.from(nextComponents, ([id, element]) => ({
        id,
        element,
        previous: oldComponents.get(id),
        nextRect: nextRects.get(id)!,
      }));

      componentChanges.forEach(({ element, previous, nextRect }, index) => {
        if (!previous) {
          animations.push(
            element.animate(
              [
                { opacity: 0, transform: 'translateY(10px)' },
                { opacity: 1, transform: 'translateY(0)' },
              ],
              {
                delay: Math.min(index, 4) * 35,
                duration: 360,
                easing: layerEasing,
                fill: 'both',
              },
            ),
          );
          return;
        }

        const deltaX = previous.rect.left - nextRect.left;
        const deltaY = previous.rect.top - nextRect.top;
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
          animations.push(
            element.animate(
              [
                { transform: `translate(${deltaX}px, ${deltaY}px)` },
                { transform: 'translate(0, 0)' },
              ],
              {
                duration: 560,
                easing: layerEasing,
                fill: 'both',
              },
            ),
          );
        }

        if (previous.text !== (element.textContent ?? '')) {
          element.dataset.morphChanged = 'true';
          animations.push(
            element.animate([{ opacity: 0.68 }, { opacity: 1 }], {
              duration: 480,
              easing: 'ease-out',
              fill: 'both',
            }),
          );
        }
      });

      Array.from(oldComponents).forEach(([id, previous]) => {
        if (nextComponents.has(id)) return;
        if (!removedLayer.isConnected) root.appendChild(removedLayer);
        const element = previous.clone;
        sanitizeOutgoingLayer(element);
        element.classList.remove('morph-transition-outgoing');
        element.classList.add('morph-transition-removed');
        Object.assign(element.style, {
          position: 'absolute',
          left: `${previous.rect.left - rootRect.left}px`,
          top: `${previous.rect.top - rootRect.top}px`,
          width: `${previous.rect.width}px`,
          height: `${previous.rect.height}px`,
          margin: '0',
          transformOrigin: 'center top',
        });
        removedLayer.appendChild(element);
        animations.push(
          element.animate(
            [
              { opacity: 1, transform: 'scaleY(1)' },
              { opacity: 0, transform: 'scaleY(.86)' },
            ],
            {
              duration: 360,
              easing: 'cubic-bezier(.4,0,.6,1)',
              fill: 'forwards',
            },
          ),
        );
      });
    }

    await Promise.all(animations.map(safeFinished));
  } finally {
    animations.forEach((animation) => animation.cancel());
    outgoing?.remove();
    removedLayer.remove();
    live.style.removeProperty('opacity');
    root.style.removeProperty('min-height');
    live.inert = wasInert;
    live
      .querySelectorAll<HTMLElement>('[data-morph-changed]')
      .forEach((element) => delete element.dataset.morphChanged);
    transitioningRoots.delete(root);
  }
}
