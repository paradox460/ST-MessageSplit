import { onSplitButtonClick, onMergeButtonClick } from './buttons';
import { registerCommands } from './commands';
import { clearActiveSession } from './session';

import './style.css';

function init(): void {
  if (document.querySelector('#message_template .mss_split_button')) return;

  const btn = document.createElement('div');
  btn.className = 'mes_button mss_split_button fa-solid fa-scissors interactable';
  btn.title = 'Split message';
  btn.setAttribute('data-i18n', '[title]Split message');

  const mesEdit = $('#message_template .mes_buttons .mes_edit');
  if (mesEdit.length) {
    mesEdit.before(btn);
  } else {
    $('#message_template .mes_buttons').append(btn);
  }

  const mergeBtn = document.createElement('div');
  mergeBtn.className = 'mes_button mss_merge_button fa-solid fa-arrows-up-to-line interactable';
  mergeBtn.title = 'Merge with previous message';
  mergeBtn.setAttribute('data-i18n', '[title]Merge with previous message');

  const mesEditForMerge = $('#message_template .mes_buttons .mes_edit');
  if (mesEditForMerge.length) {
    mesEditForMerge.before(mergeBtn);
  } else {
    $('#message_template .mes_buttons').append(mergeBtn);
  }

  $(document).on('click', '.mss_split_button', onSplitButtonClick);
  $(document).on('click', '.mss_merge_button', onMergeButtonClick);

  registerCommands();

  const ctx = SillyTavern.getContext();
  ctx.eventSource.on(ctx.eventTypes.CHAT_CHANGED, () => {
    clearActiveSession();
  });
}

const ctx = SillyTavern.getContext();
ctx.eventSource.on(ctx.eventTypes.APP_READY, init);
