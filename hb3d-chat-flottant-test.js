(function () {
  'use strict';
  function install() {
    var bar = document.querySelector('.hb3d-ai-bar');
    var panel = document.getElementById('hb3d-chat-conversation');
    if (!bar || !panel || !bar.dataset.chatReady) return false;
    if (document.getElementById('hb3d-help-dialog')) return true;
    var style = document.createElement('style');
    style.textContent = `
      .stage.hb3d-help-layout {
        grid-template-rows: minmax(0,1fr) auto 30px 20px !important;
        min-height:0;
      }
      .hb3d-help-launcher {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  justify-self:end;
  align-self:center;
  gap:7px;

  box-sizing:border-box;
  min-height:30px;
  max-width:calc(100% - 20px);
  margin-right:10px;
  padding:4px 10px;

  border:1px solid #c7d5e5;
  border-radius:5px;
  background:#fff;
  color:#142548;

  font:inherit;
  font-size:11px;
  font-weight:600;
  line-height:1.3;

  cursor:pointer;
  touch-action:manipulation;
}

.hb3d-help-launcher .hb3d-help-launcher-icon {
  display:block;
  flex:0 0 24px;
  width:24px;
  height:18px;
  fill:none;
  stroke:currentColor;
  stroke-width:1.6;
}

.hb3d-help-launcher .hb3d-help-launcher-icon circle {
  fill:currentColor;
  stroke:none;
}

@media (hover:hover) {
  .hb3d-help-launcher:hover {
    border-color:#cf0055;
    color:#cf0055;
    background:#fff8fb;
  }
}

.hb3d-help-launcher:focus-visible {
  outline:2px solid #cf0055;
  outline-offset:2px;
}

.hb3d-help-launcher[aria-expanded="true"] {
  border-color:#cf0055;
  color:#cf0055;
}
      #hb3d-help-dialog {position:fixed;inset:auto 16px 48px auto;margin:0;
        width:min(390px,calc(100vw - 24px));height:min(460px,calc(100dvh - 80px));
        max-width:none;max-height:none;padding:0;border:1px solid #cad8e7;
        border-radius:12px;background:#fff;color:#142c48;
        box-shadow:0 12px 38px #102e4c35;z-index:2000;overflow:hidden;}
      #hb3d-help-dialog[open] {display:flex;flex-direction:column;}
      #hb3d-help-dialog:not([open]) {display:none;}
      #hb3d-help-dialog #hb3d-chat-conversation {
        display:flex!important;flex-direction:column;flex:1 1 0;
        width:100%;height:auto;min-height:0;max-height:none;margin:0;
        border:0;border-radius:0;overflow:hidden;}
      #hb3d-help-dialog .hb3d-chat-heading {flex:0 0 auto;padding:9px 12px;}
      #hb3d-help-dialog .hb3d-chat-messages {flex:1 1 0;height:auto;
        min-height:0;max-height:none;overflow-y:auto;padding:10px;}
      #hb3d-help-dialog .hb3d-chat-notice {flex:0 0 auto;padding:6px 10px;font-size:10px;}
      #hb3d-help-dialog .hb3d-ai-bar {display:flex;flex-direction:column;
        align-items:stretch;flex:0 0 auto;gap:5px;margin:0;padding:10px;
        min-height:0;border:0;border-top:1px solid #d8dfeb;border-radius:0;background:#f6f8fc;}
      #hb3d-help-dialog .hb3d-ai-identity {display:none;}
      #hb3d-help-dialog .hb3d-ai-field {display:flex;align-items:center;gap:6px;min-width:0;}
      #hb3d-help-dialog #hb3d-ai-question {flex:1;min-width:0;height:36px;padding:0 10px;}
      #hb3d-help-dialog .hb3d-ai-status {max-width:none;text-align:left;font-size:10px;}
      @media(max-width:760px) {
        #hb3d-help-dialog {right:12px;bottom:12px;height:min(430px,calc(100dvh - 24px));}
      }
    `;
    document.head.appendChild(style);
    var launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'hb3d-help-launcher';
    launcher.innerHTML = `
  <svg
    class="hb3d-help-launcher-icon"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 32 24"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      x="1.5"
      y="1.5"
      width="29"
      height="21"
      rx="4"
    />
    <circle cx="10" cy="12" r="1.6" />
    <circle cx="16" cy="12" r="1.6" />
    <circle cx="22" cy="12" r="1.6" />
  </svg>
  <span>Assistant HB3D</span>
`;
    launcher.setAttribute('aria-controls', 'hb3d-help-dialog');
    launcher.setAttribute('aria-expanded', 'false');
    var stage = bar.parentElement;
    stage.classList.add('hb3d-help-layout');
    bar.before(launcher);
    var dialog = document.createElement('dialog');
    dialog.id = 'hb3d-help-dialog';
    dialog.setAttribute('aria-label', 'Assistant HB3D');
    document.body.appendChild(dialog);
    dialog.append(panel, bar);
    panel.hidden = false;
    var close = panel.querySelector('.hb3d-chat-heading button');
    var input = bar.querySelector('#hb3d-ai-question');
    function dismiss() {
      dialog.close();
      launcher.setAttribute('aria-expanded', 'false');
      launcher.focus();
    }
    launcher.addEventListener('click', function () {
      if (dialog.open) { dismiss(); return; }
      dialog.show();
      launcher.setAttribute('aria-expanded', 'true');
      if (input && !input.disabled) input.focus();
    });
    if (close) {
      close.textContent = 'Fermer';
      close.setAttribute('aria-controls', 'hb3d-help-dialog');
      close.addEventListener('click', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        dismiss();
      }, true);
    }
    dialog.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
    });
    return true;
  }
  function start() {
    if (install()) return;
    var observer = new MutationObserver(function () {
      if (install()) observer.disconnect();
    });
    observer.observe(document.body, {childList:true, subtree:true});
    window.setTimeout(function () { observer.disconnect(); }, 10000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else start();
}());
