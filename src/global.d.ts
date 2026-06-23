export { };

import '/Users/jeffsandberg/Developer/SillyTavernExtensions/SillyTavern/public/global';

declare global {

  interface STContext {
    chat: ChatMessage[];
    messageFormatting(
      mes: string, chName: string | undefined, isSystem: boolean | undefined,
      isUser: boolean | undefined, messageId: number,
      sanitizerOverrides?: object, isReasoning?: boolean,
    ): string;
    printMessages(): Promise<void>;
    saveChat(): Promise<void>;
    eventSource: STEventSource;
    eventTypes: Record<string, string>;
    SlashCommandParser: { addCommandObject(command: unknown): void };
    SlashCommand: { fromProps(props: STSlashCommandProps): unknown };
    SlashCommandArgument: { fromProps(props: STSlashArgProps): unknown };
    SlashCommandNamedArgument: { fromProps(props: STSlashArgProps): unknown };
    ARGUMENT_TYPE: Record<string, string>;
    name1?: string;
    groupId?: string | null;
    groups?: STGroup[];
    characters?: Character[];
    getThumbnailUrl(type: "avatar", file: string, cachebuster?: boolean): string;
  }

  const toastr: {
    info(msg: string, title?: string, opts?: object): void;
    warning(msg: string, title?: string, opts?: object): void;
  }
}
