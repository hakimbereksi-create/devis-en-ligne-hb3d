(function () {
  'use strict';

  function initChat() {
    var bar = document.querySelector('.hb3d-ai-bar');
    var input = document.getElementById('hb3d-ai-question');
    var status = document.getElementById('hb3d-ai-status');

    if (!bar || !input || !status) return;
    if (bar.dataset.chatReady) return;

    bar.dataset.chatReady = 'true';

    var localPreview =
  window.location.protocol === 'http:' &&
  (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  var endpoint = localPreview
    ? 'http://localhost:8080/chat/chat_api.php'
    : 'https://unamusable-nonacidic-wilfred.ngrok-free.dev/chat/chat_api.php';

    /*
     * Identifiant propre à cette page.
     * Aucune conversation conservée dans localStorage.
     */
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);

    var sessionId = Array.from(bytes, function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');

    var sending = false;

    var sendButton = document.createElement('button');
    sendButton.type = 'button';
    sendButton.className = 'hb3d-chat-send';
    sendButton.textContent = 'Envoyer';
    sendButton.setAttribute(
      'aria-controls',
      'hb3d-chat-conversation'
    );

    input.insertAdjacentElement('afterend', sendButton);

    var panel = document.createElement('section');
    panel.id = 'hb3d-chat-conversation';
    panel.className = 'hb3d-chat-conversation';
    panel.hidden = true;
    panel.setAttribute(
      'aria-label',
      'Conversation avec l’assistant HB3D'
    );

    var header = document.createElement('div');
    header.className = 'hb3d-chat-heading';

    var title = document.createElement('h2');
    title.className = 'hb3d-chat-title';

    var logo = document.createElement('img');
    logo.className = 'hb3d-chat-logo';
    logo.src = 'images/Logo Rond HB3D.png';
    logo.alt = '';
    logo.width = 24;
    logo.height = 24;

    var titleText = document.createElement('span');
    titleText.textContent = 'Assistant HB3D';

    title.append(logo, titleText);

    var closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.textContent = 'Réduire';
    closeButton.setAttribute(
      'aria-controls',
      'hb3d-chat-conversation'
    );

    header.append(title, closeButton);

    var messages = document.createElement('div');
    messages.className = 'hb3d-chat-messages';
    messages.setAttribute('role', 'log');
    messages.setAttribute('aria-live', 'polite');
    messages.setAttribute('aria-relevant', 'additions');
    messages.setAttribute('tabindex', '0');

    var notice = document.createElement('p');
    notice.className = 'hb3d-chat-notice';
    notice.textContent =
      'Assistant général HB3D · ' +
      'aucune modification automatique de votre demande.';

    panel.append(header, messages, notice);
    bar.insertAdjacentElement('afterend', panel);

    function addMessage(role, text) {
      var message = document.createElement('div');
      message.className = 'hb3d-chat-message ' + role;

      var label = document.createElement('strong');
      label.textContent = role === 'user'
        ? 'Vous'
        : role === 'error'
          ? 'Information'
          : 'Assistant HB3D';

      var content = document.createElement('p');
      content.textContent = text;

      message.append(label, content);
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    }

    /* Indicateur temporaire pendant l'attente de la réponse. */
var waitingMessage = null;

function showWaiting() {
  hideWaiting();

  waitingMessage = document.createElement('div');
  waitingMessage.className =
    'hb3d-chat-message bot hb3d-chat-waiting';

  /*
   * L'annonce accessible est assurée par le statut,
   * pour ne pas annoncer également les points décoratifs.
   */
  waitingMessage.setAttribute('aria-hidden', 'true');

  var label = document.createElement('strong');
  label.textContent = 'Assistant HB3D';

  var content = document.createElement('p');
  content.className = 'hb3d-chat-waiting-content';

  var dots = document.createElement('span');
  dots.className = 'hb3d-chat-waiting-dots';

  for (var i = 0; i < 3; i++) {
    dots.appendChild(document.createElement('span'));
  }

  var text = document.createElement('span');
  text.textContent = 'Prépare sa réponse…';

  content.append(dots, text);
  waitingMessage.append(label, content);
  messages.appendChild(waitingMessage);

  messages.scrollTop = messages.scrollHeight;
}

function hideWaiting() {
  if (!waitingMessage) return;

  waitingMessage.remove();
  waitingMessage = null;
}

    function openConversation() {
      panel.hidden = false;
      sendButton.setAttribute('aria-expanded', 'true');
    }

    closeButton.addEventListener('click', function () {
      panel.hidden = true;
      sendButton.setAttribute('aria-expanded', 'false');
      input.focus();
    });

    async function sendMessage() {
      if (sending) return;

      var text = input.value.trim();
      if (!text) {
        input.focus();
        return;
      }

      if (text.length > 1500) {
        status.textContent = 'Question limitée à 1 500 caractères.';
        return;
      }

      openConversation();
      addMessage('user', text);

      sending = true;
      input.value = '';
      input.disabled = true;
      sendButton.disabled = true;
      sendButton.textContent = '…';
      status.textContent = 'L’assistant prépare sa réponse…';
      panel.setAttribute('aria-busy', 'true');

      showWaiting();

      var controller = new AbortController();

      /*
       * Le PHP existant peut tenter plusieurs appels fournisseur.
       * L’annulation navigateur ne garantit pas l’arrêt du PHP.
       */
      var timeout = window.setTimeout(function () {
        controller.abort();
      }, 200000);

      try {
      var chatContext = null;

       if (typeof window.hb3dGetChatContext === 'function') {
       try {
       chatContext = window.hb3dGetChatContext();
       } catch (contextError) {
       console.warn(
        '[HB3D Chat] Contexte indisponible :',
        contextError
      );
    }
  }

  var response = await fetch(endpoint, {

          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
          message: text,
          sessionId: sessionId,
          context: chatContext
          }),
          signal: controller.signal
        });

        var data = await response.json();

        if (
          !response.ok ||
          !data ||
          data.ok !== true ||
          typeof data.reply !== 'string' ||
          !data.reply.trim()
        ) {
          throw new Error(
            data && typeof data.error === 'string'
              ? data.error
              : 'Réponse de l’assistant indisponible.'
          );
        }

        hideWaiting();
        addMessage('bot', data.reply);
        status.textContent = 'Assistant HB3D connecté';
      } catch (error) {
        hideWaiting();

        var message = error.name === 'AbortError'
          ? 'Le délai d’attente est dépassé. ' +
            'Le traitement peut encore être en cours côté serveur.'
          : 'La réponse n’a pas pu être obtenue. ' +
            'Vérifiez la connexion ou réessayez dans un instant.';

        addMessage('error', message);
        status.textContent = 'Assistant momentanément indisponible';

        console.error('[HB3D Chat]', error);

        /* Conserver la question pour une éventuelle nouvelle tentative. */
        input.value = text;
       } finally {
        hideWaiting();

        window.clearTimeout(timeout);
        sending = false;
        input.disabled = false;
        sendButton.disabled = false;
        sendButton.textContent = 'Envoyer';
        panel.setAttribute('aria-busy', 'false');

        if (!panel.hidden) input.focus();
      }
    }

    sendButton.addEventListener('click', sendMessage);

    input.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        sendMessage();
      }
    });

    input.disabled = false;
    input.maxLength = 1500;

    input.placeholder = 'Votre question à l’assistant HB3D';

    var label = document.querySelector(
      'label[for="hb3d-ai-question"]'
    );

    if (label) {
      label.textContent = 'Question à l’assistant HB3D';
    }

    sendButton.setAttribute('aria-expanded', 'false');

    status.textContent = 'Assistant prêt · connexion au premier message';
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChat);
  } else {
    initChat();
  }
}());