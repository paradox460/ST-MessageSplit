/**
 * Import members from a module by URL, bypassing webpack.
 * @param url URL to import from
 * @returns Promise of an object
 */
export async function importFromUrl( url: string) {
  try {
    const module = await import(/* webpackIgnore: true */ url);
    return module;
  } catch (error) {
    console.error(`Failed to import ${url}: ${error}`);
  }
}

export const { default_avatar } = await importFromUrl('/script.js') as { default_avatar: string };

export const { commonEnumProviders, enumIcons } = await importFromUrl(
  '/scripts/slash-commands/SlashCommandCommonEnumsProvider.js')

export const { SlashCommandEnumValue } = await importFromUrl(
  '/scripts/slash-commands/SlashCommandEnumValue.js')
