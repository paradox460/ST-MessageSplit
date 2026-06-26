import { segmentParagraphs } from './segment';
import { applyParagraphSplit, mergeRange, parseIdRange } from './mutations';
import { getActiveSession } from './session';
import { commonEnumProviders, enumIcons, SlashCommandEnumValue } from './util';


export async function onMergeCommand(_named: Record<string, string>, unnamed: string | string[]): Promise<string> {
  const ctx = SillyTavern.getContext();
  const value = (Array.isArray(unnamed) ? unnamed.join('') : String(unnamed ?? '')).trim();

  let lo: number;
  let hi: number;
  if (!value) {
    // no id → merge the most recent message into its ancestor
    if (ctx.chat.length < 2) {
      toastr.warning('No previous message to merge into.');
      return '';
    }
    lo = ctx.chat.length - 2;
    hi = ctx.chat.length - 1;
  } else {
    const range = parseIdRange(value, 0, ctx.chat.length - 1);
    if (!range) {
      toastr.warning(`Invalid message id or range: "${value}".`);
      return '';
    }
    if (range.start === range.end) {
      // single message → merge it into the immediately previous one
      if (range.start <= 0) {
        toastr.warning('No previous message to merge into.');
        return '';
      }
      lo = range.start - 1;
      hi = range.start;
    } else {
      // range a-b → collapse a..b into a
      lo = range.start;
      hi = range.end;
    }
  }

  getActiveSession()?.cancel();

  await mergeRange(ctx, lo, hi);
  return '';
}

export async function onSplitCommand(named: Record<string, string>, unnamed: string | string[]): Promise<string> {
  const ctx = SillyTavern.getContext();
  const query = (Array.isArray(unnamed) ? unnamed.join(' ') : String(unnamed ?? '')).trim();
  const msgArg = (named.msg ?? '').toString().trim();
  const authorArg = (named.author ?? '').toString().trim();

  let messageId: number;
  if (msgArg) {
    messageId = Number(msgArg);
    if (!Number.isInteger(messageId) || messageId < 0 || messageId > ctx.chat.length - 1) {
      toastr.warning(`Invalid message id: "${msgArg}".`);
      return '';
    }
  } else {
    // no msg → split the most recent message
    messageId = ctx.chat.length - 1;
    if (messageId < 0) {
      toastr.warning('No message to split.');
      return '';
    }
  }

  if (!query) {
    toastr.warning('Provide text to match the split point: /split msg=[id] <text>.');
    return '';
  }

  const msg = ctx.chat[messageId];
  if (!msg || typeof msg.mes !== 'string') return '';

  const segments = segmentParagraphs(msg.mes);
  if (segments.length < 2) {
    toastr.warning('Message has no paragraph breaks to split on.');
    return '';
  }

  const { Fuse } = SillyTavern.libs;

  const paragraphFuse = new Fuse(segments);
  const results = paragraphFuse.search(query);
  if (results.length === 0) {
    toastr.warning(`No paragraph matches "${query}".`);
    return '';
  }

  const boundary = results[0].refIndex;
  if (boundary <= 0) {
    toastr.warning('Best-matching paragraph is the first; nothing to split before.');
    return '';
  }

  let author: string | null = null;

  if (authorArg) {
    // We add a psuedo character to the list to represent the user
    const searchableChars = ctx.characters.concat([{ name: ctx.name1, avatar: "__user__" }]);
    const authorFuse = new Fuse(searchableChars, {
      keys: ['name'],
    })
    const authorResults = authorFuse.search(authorArg);
    if (authorResults.length <= 0) {
      toastr.warning(`No character matches "${authorArg}", aborting.`)
      return ''
    }

    author = authorResults[0].item.avatar;
  }

  getActiveSession()?.cancel();

  await applyParagraphSplit(ctx, messageId, msg, segments, [boundary], [author]);
  return '';
}

export function registerCommands(): void {
  const ctx = SillyTavern.getContext();
  const { SlashCommandParser, SlashCommand, SlashCommandArgument, SlashCommandNamedArgument, ARGUMENT_TYPE } = ctx;

  SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'merge',
    callback: onMergeCommand,
    returns: 'nothing',
    unnamedArgumentList: [
      SlashCommandArgument.fromProps({
        description: 'message id (merge into previous) or range a-b (collapse a..b into a); omit to merge the last message into its ancestor',
        typeList: [ARGUMENT_TYPE.NUMBER, ARGUMENT_TYPE.RANGE],
        isRequired: false,
      }),
    ],
    helpString: '<div>Merge messages. <code>/merge</code> merges the last message into its ancestor; <code>/merge 5</code> merges message 5 into 4; <code>/merge 2-5</code> collapses messages 2 through 5 into message 2.</div>',
  }));

  SlashCommandParser.addCommandObject(SlashCommand.fromProps({
    name: 'split',
    callback: onSplitCommand,
    returns: 'nothing',
    namedArgumentList: [
      SlashCommandNamedArgument.fromProps({
        name: 'msg',
        description: 'message id to split; defaults to the previous (most recent) message',
        typeList: [ARGUMENT_TYPE.NUMBER],
        isRequired: false,
      }),
      SlashCommandNamedArgument.fromProps({
        name: 'author',
        description: 'Author to change new message to.',
        typeList: [ARGUMENT_TYPE.STRING],
        isRequired: false,
        enumProvider: groupMembersWithPersona(ctx)
      }),
    ],
    unnamedArgumentList: [
      SlashCommandArgument.fromProps({
        description: 'text to fuzzy-match the paragraph to split before',
        typeList: [ARGUMENT_TYPE.STRING],
        isRequired: true,
      }),
    ],
    helpString: '<div>Split a message before the paragraph best matching the text. <code>/split msg=3 the second part</code>; omit <code>msg</code> to split the most recent message.</div>',
  }));
}

function groupMembersWithPersona(ctx: STContext) {
  const groupMembers = [{ description: ctx.name1 }].concat(commonEnumProviders.groupMembers()()).map(({ description }) => (
    new SlashCommandEnumValue(description, null, 'enum', enumIcons.character)
  ));
  return () => groupMembers;
}
