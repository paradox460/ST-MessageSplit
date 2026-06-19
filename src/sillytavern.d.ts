export {};

declare global {
  interface STChatMessage {
    name?: string;
    mes?: string;
    send_date?: number | string;
    is_user?: boolean;
    is_system?: boolean;
    force_avatar?: string;
    original_avatar?: string;
    swipes?: string[];
    swipe_id?: number;
    swipe_info?: unknown[];
    extra?: Record<string, unknown> & { token_count?: number };
  }

  interface STEventSource {
    on(event: string, handler: (...args: unknown[]) => void): void;
  }

  interface STSlashCommandProps {
    name: string;
    callback: (namedArgs: Record<string, string>, unnamedArgs: string | string[]) => unknown;
    returns?: string;
    aliases?: string[];
    namedArgumentList?: unknown[];
    unnamedArgumentList?: unknown[];
    helpString?: string;
    splitUnnamedArgument?: boolean;
    splitUnnamedArgumentCount?: number;
  }

  interface STSlashArgProps {
    name?: string;
    description: string;
    typeList?: string | string[];
    isRequired?: boolean;
    defaultValue?: string;
    enumList?: string[];
    acceptsMultiple?: boolean;
  }

  interface STFuseResult {
    item: string;
    refIndex: number;
    score?: number;
  }

  interface STFuse {
    search(pattern: string): STFuseResult[];
  }

  interface STFuseConstructor {
    new (list: string[], options?: object): STFuse;
  }

  interface STContext {
    chat: STChatMessage[];
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
  }

  const SillyTavern: {
    getContext(): STContext;
    libs: { Fuse: STFuseConstructor };
  };
  const toastr: {
    info(msg: string, title?: string, opts?: object): void;
    warning(msg: string, title?: string, opts?: object): void;
  };
}
