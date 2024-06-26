import './components/index.js';

import type { BaseSelection } from '@blocksuite/block-std';
import { WidgetElement } from '@blocksuite/block-std';
import { assertExists } from '@blocksuite/global/utils';
import {
  autoPlacement,
  autoUpdate,
  computePosition,
  type ComputePositionConfig,
  flip,
  offset,
  type Rect,
  shift,
  size,
} from '@floating-ui/dom';
import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { choose } from 'lit/directives/choose.js';

import type { AIError } from '../../../_common/components/index.js';
import { AIStarIconWithAnimation } from '../../../_common/icons/ai.js';
import { stopPropagation } from '../../../_common/utils/event.js';
import { getPageRootByElement } from '../../../_common/utils/query.js';
import { PageRootService } from '../../page/page-root-service.js';
import { AFFINE_FORMAT_BAR_WIDGET } from '../format-bar/format-bar.js';
import {
  AFFINE_VIEWPORT_OVERLAY_WIDGET,
  type AffineViewportOverlayWidget,
} from '../viewport-overlay/viewport-overlay.js';
import type { AIPanelDiscardModal } from './components/discard-modal.js';
import { toggleDiscardModal } from './components/discard-modal.js';
import type { AffineAIPanelState, AffineAIPanelWidgetConfig } from './type.js';

export const AFFINE_AI_PANEL_WIDGET = 'affine-ai-panel-widget';

@customElement(AFFINE_AI_PANEL_WIDGET)
export class AffineAIPanelWidget extends WidgetElement {
  static override styles = css`
    :host {
      display: flex;
      outline: none;
      border-radius: var(--8, 8px);
      border: 1px solid var(--affine-border-color);
      background: var(--affine-background-overlay-panel-color);

      /* light/toolbarShadow */
      box-shadow: var(
        --affine-toolbar-shadow,
        0px 6px 16px 0px rgba(0, 0, 0, 0.14)
      );

      position: absolute;
      width: max-content;
      height: auto;
      top: 0;
      left: 0;
      overflow-y: auto;
      scrollbar-width: none !important;
      z-index: var(--affine-z-index-popover);
    }

    .ai-panel-container {
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      width: 100%;
      height: fit-content;
      gap: 8px;
      padding: 8px 0;
    }

    .ai-panel-container:has(ai-panel-answer),
    .ai-panel-container:has(ai-panel-error) {
      padding: 12px 0;
    }

    :host([data-hidden]) {
      display: none;
    }
  `;

  ctx: unknown = null;

  @property({ attribute: false })
  config: AffineAIPanelWidgetConfig | null = null;

  @property()
  state: AffineAIPanelState = 'hidden';

  get viewportOverlayWidget() {
    const rootId = this.host.doc.root?.id;
    return rootId
      ? (this.host.view.getWidget(
          AFFINE_VIEWPORT_OVERLAY_WIDGET,
          rootId
        ) as AffineViewportOverlayWidget)
      : null;
  }

  private _stopAutoUpdate?: undefined | (() => void);

  private _discardModal: AIPanelDiscardModal | null = null;

  private _clearDiscardModal = () => {
    if (this._discardModal) {
      this._discardModal.remove();
      this._discardModal = null;
    }
  };

  private _discardCallback = () => {
    this.hide();
    this.config?.discardCallback?.();
  };

  private _cancelCallback = () => {
    this.focus();
  };

  private _clickOutside = () => {
    switch (this.state) {
      case 'hidden':
        return;
      case 'error':
      case 'finished':
        if (!this._answer) {
          this.hide();
        } else {
          this.discard();
        }
        break;
      default:
        this.discard();
    }
  };

  toggle = (reference: Element, input?: string) => {
    if (input) {
      this._inputText = input;
      this.generate();
    } else {
      // reset state
      this.hide();
      this.state = 'input';
    }

    this._autoUpdatePosition(reference);
  };

  hide = () => {
    this.state = 'hidden';
    this._resetAbortController();
    this._stopAutoUpdate?.();
    this._inputText = null;
    this._answer = null;
    this._stopAutoUpdate = undefined;
    this.config?.hideCallback?.();
    this.viewportOverlayWidget?.unlock();
  };

  discard = () => {
    if ((this.state === 'finished' || this.state === 'error') && !this.answer) {
      this._discardCallback();
      return;
    }
    if (this.state === 'input') {
      this.hide();
      return;
    }
    this._clearDiscardModal();
    this._discardModal = toggleDiscardModal(
      this._discardCallback,
      this._cancelCallback
    );
  };

  /**
   * You can evaluate this method multiple times to regenerate the answer.
   */
  generate = () => {
    assertExists(this.config);
    const text = this._inputText;
    assertExists(text);
    assertExists(this.config.generateAnswer);

    this._resetAbortController();

    // reset answer
    this._answer = null;

    const update = (answer: string) => {
      this._answer = answer;
      this.requestUpdate();
    };
    const finish = (type: 'success' | 'error' | 'aborted', err?: AIError) => {
      if (type === 'aborted') return;

      assertExists(this.config);
      if (type === 'error') {
        this.state = 'error';
        this.config.errorStateConfig.error = err;
      } else {
        this.state = 'finished';
        this.config.errorStateConfig.error = undefined;
      }

      this._resetAbortController();
    };

    this.scrollTop = 0; // reset scroll top
    this.state = 'generating';
    this.config.generateAnswer({
      input: text,
      update,
      finish,
      signal: this._abortController.signal,
    });
  };

  stopGenerating = () => {
    this._abortController.abort();
    this.state = 'finished';
    if (!this.answer) {
      this.hide();
    }
  };

  private _abortController = new AbortController();
  private _resetAbortController = () => {
    if (this.state === 'generating') {
      this._abortController.abort();
    }
    this._abortController = new AbortController();
  };

  private _inputText: string | null = null;
  get inputText() {
    return this._inputText;
  }

  private _selection?: BaseSelection[];

  private _answer: string | null = null;
  get answer() {
    return this._answer;
  }

  private _inputFinish = (text: string) => {
    this._inputText = text;
    this.generate();
  };

  private _calcPositionOptions(
    reference: Element
  ): Partial<ComputePositionConfig> {
    let rootBoundary: Rect | undefined;
    {
      const rootService = this.host.std.spec.getService('affine:page');
      if (rootService instanceof PageRootService) {
        rootBoundary = undefined;
      } else {
        const viewport = rootService.viewport;
        rootBoundary = {
          x: viewport.left,
          y: viewport.top,
          width: viewport.width,
          height: viewport.height - 100, // 100 for edgeless toolbar
        };
      }
    }

    const overflowOptions = {
      padding: 20,
      rootBoundary: rootBoundary,
    };

    const sizeMiddlewareInEdgeless = size({
      ...overflowOptions,
      apply: ({ elements, availableHeight }) => {
        elements.floating.style.maxHeight = `${availableHeight}px`;
      },
    });

    // block element in page editor
    if (getPageRootByElement(reference)) {
      return {
        placement: 'bottom-start',
        middleware: [shift(overflowOptions)],
      };
    }
    // block element in doc in edgeless editor
    else if (reference.closest('edgeless-block-portal-note')) {
      return {
        middleware: [
          shift(overflowOptions),
          autoPlacement({
            ...overflowOptions,
            allowedPlacements: ['top-start', 'bottom-start'],
          }),
          sizeMiddlewareInEdgeless,
        ],
      };
    }
    // edgeless element
    else {
      return {
        placement: 'right-start',
        middleware: [
          offset({ mainAxis: 16 }),
          flip({
            mainAxis: true,
            crossAxis: true,
            flipAlignment: true,
            ...overflowOptions,
          }),
          shift({
            crossAxis: true,
            ...overflowOptions,
          }),
          sizeMiddlewareInEdgeless,
        ],
      };
    }
  }

  private _autoUpdatePosition(reference: Element) {
    this._stopAutoUpdate?.();
    this._stopAutoUpdate = autoUpdate(reference, this, () => {
      computePosition(reference, this, this._calcPositionOptions(reference))
        .then(({ x, y }) => {
          this.style.left = `${x}px`;
          this.style.top = `${y}px`;
        })
        .catch(console.error);
    });
  }

  private _onKeyDown = (event: KeyboardEvent) => {
    event.stopPropagation();
    const { state } = this;
    if (
      (state !== 'generating' && state !== 'input') ||
      event.key !== 'Escape'
    ) {
      return;
    }

    if (state === 'generating') {
      this.stopGenerating();
    } else {
      this.hide();
    }
  };

  override connectedCallback() {
    super.connectedCallback();

    this.tabIndex = -1;
    this.disposables.addFromEvent(
      document,
      'pointerdown',
      this._onDocumentClick
    );
    this.disposables.add(
      this.blockElement.host.event.add('pointerDown', evtState =>
        this._onDocumentClick(
          evtState.get('pointerState').event as PointerEvent
        )
      )
    );
    this.disposables.add(
      this.blockElement.host.event.add('click', () => {
        return this.state !== 'hidden' ? true : false;
      })
    );
    this.disposables.addFromEvent(this, 'wheel', stopPropagation);
    this.disposables.addFromEvent(this, 'pointerdown', stopPropagation);
    this.disposables.addFromEvent(this, 'pointerup', stopPropagation);
    this.disposables.addFromEvent(this, 'keydown', this._onKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this._clearDiscardModal();
  }

  private _onDocumentClick = (e: MouseEvent) => {
    if (
      this.state !== 'hidden' &&
      e.target !== this._discardModal &&
      e.target !== this &&
      !this.contains(e.target as Node)
    ) {
      this._clickOutside();
      return true;
    }

    return false;
  };

  protected override willUpdate(changed: PropertyValues): void {
    const prevState = changed.get('state');
    if (prevState) {
      if (prevState === 'hidden') {
        this._selection = this.host.selection.value;
        requestAnimationFrame(() => {
          this.scrollIntoView({
            block: 'center',
          });
        });
      } else {
        // restore selection
        if (this._selection) {
          this.host.selection.set([...this._selection]);
          this.host.updateComplete
            .then(() => {
              if (this.state !== 'hidden') {
                this.focus();
              }
            })
            .catch(console.error);
          if (this.state === 'hidden') {
            this._selection = undefined;
          }
        }
      }

      // tell format bar to show or hide
      const rootBlockId = this.host.doc.root?.id;
      const formatBar = rootBlockId
        ? this.host.view.getWidget(AFFINE_FORMAT_BAR_WIDGET, rootBlockId)
        : null;

      if (formatBar) {
        formatBar.requestUpdate();
      }
    }

    if (this.state !== 'hidden') {
      this.viewportOverlayWidget?.lock();
    } else {
      this.viewportOverlayWidget?.unlock();
    }
  }

  override render() {
    if (this.state === 'hidden') {
      this.dataset.hidden = '';
      return nothing;
    } else {
      delete this.dataset.hidden;
    }

    if (!this.config) return nothing;
    const config = this.config;

    this.updateComplete
      .then(() => {
        this.focus();
      })
      .catch(console.error);

    const mainTemplate = choose(this.state, [
      [
        'input',
        () =>
          html`<ai-panel-input
            .onBlur=${() => this.discard()}
            .onFinish=${this._inputFinish}
          ></ai-panel-input>`,
      ],
      [
        'generating',
        () => html`
          ${this.answer
            ? html`
                <ai-panel-answer
                  .finish=${false}
                  .config=${config.finishStateConfig}
                >
                  ${this.answer &&
                  config.answerRenderer(this.answer, this.state)}
                </ai-panel-answer>
              `
            : nothing}
          <ai-panel-generating
            .icon=${config.generatingIcon ?? AIStarIconWithAnimation}
            .stopGenerating=${this.stopGenerating}
          ></ai-panel-generating>
        `,
      ],
      [
        'finished',
        () => html`
          <ai-panel-answer
            .config=${config.finishStateConfig}
            .copy=${config.copy}
          >
            ${this.answer && config.answerRenderer(this.answer, this.state)}
          </ai-panel-answer>
        `,
      ],
      [
        'error',
        () => html`
          <ai-panel-error
            .config=${config.errorStateConfig}
            .copy=${config.copy}
            .withAnswer=${!!this.answer}
            .host=${this.host}
          >
            ${this.answer && config.answerRenderer(this.answer, this.state)}
          </ai-panel-error>
        `,
      ],
    ]);

    return html`<div class="ai-panel-container">${mainTemplate}</div>`;
  }
}
