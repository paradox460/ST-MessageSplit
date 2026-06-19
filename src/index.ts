import './style.css';

function init(): void {
}

const ctx = SillyTavern.getContext();
ctx.eventSource.on(ctx.eventTypes.APP_READY, init);
